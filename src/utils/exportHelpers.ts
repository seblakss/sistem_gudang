import XLSX from 'xlsx-js-style';
import { InventoryMutation, Item, Location, User, Inventory, TransferRequest } from '../types';
import { formatDate } from './formatters';

// Common Color Palettes & Styles
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const BORDER_TOTAL = {
  top: { style: 'thin', color: { rgb: '475569' } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: 'E2E8F0' } },
  right: { style: 'thin', color: { rgb: 'E2E8F0' } },
};

const STYLE_MAIN_HEADER = {
  font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E3A8A' } }, // Brand Navy
  alignment: { horizontal: 'center', vertical: 'center' },
};

const STYLE_TH = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '64748B' } },
    bottom: { style: 'thin', color: { rgb: '64748B' } },
    left: { style: 'thin', color: { rgb: '64748B' } },
    right: { style: 'thin', color: { rgb: '64748B' } },
  },
};

const STYLE_META_LABEL = {
  font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '334155' } },
  fill: { fgColor: { rgb: 'F1F5F9' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_META_VAL = {
  font: { name: 'Calibri', sz: 9, bold: false, color: { rgb: '0F172A' } },
  fill: { fgColor: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

interface CellOptions {
  bold?: boolean;
  color?: string;
  bgColor?: string;
  numFmt?: string;
}

function makeCell(
  val: string | number,
  align: 'left' | 'center' | 'right' = 'left',
  isOdd = false,
  opts?: CellOptions
) {
  const isNum = typeof val === 'number';
  const defaultBg = isOdd ? 'F8FAFC' : 'FFFFFF';
  return {
    t: isNum ? 'n' : 's',
    v: val,
    z: opts?.numFmt,
    s: {
      font: {
        name: 'Calibri',
        sz: 10,
        bold: opts?.bold || false,
        color: { rgb: opts?.color || '1E293B' },
      },
      fill: { fgColor: { rgb: opts?.bgColor || defaultBg } },
      alignment: {
        horizontal: align,
        vertical: 'center',
        wrapText: true,
      },
      border: BORDER_THIN,
    },
  };
}

function makeTotalCell(
  val: string | number,
  align: 'left' | 'center' | 'right' = 'right',
  numFmt?: string
) {
  const isNum = typeof val === 'number';
  return {
    t: isNum ? 'n' : 's',
    v: val,
    z: numFmt,
    s: {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      alignment: { horizontal: align, vertical: 'center' },
      border: BORDER_TOTAL,
    },
  };
}

// -------------------------------------------------------------
// 1. EXPORT BUKU BESAR MUTASI STOK
// -------------------------------------------------------------
export interface MutationExportMeta {
  storeFilterLabel?: string;
  typeFilterLabel?: string;
  timeRangeLabel?: string;
  adminName?: string;
}

export function exportMutationsToExcel(
  mutations: InventoryMutation[],
  items: Item[],
  locations: Location[],
  users: User[],
  meta?: MutationExportMeta,
  filename = 'Buku_Besar_Mutasi_Stok.xlsx'
) {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const locMap = new Map(locations.map(l => [l.id, l]));
  const userMap = new Map(users.map(u => [u.id, u]));

  const wb = XLSX.utils.book_new();
  const ws: any = {};

  const colHeaders = [
    'No.',
    'ID Mutasi',
    'Waktu Transaksi',
    'Tipe Transaksi',
    'SKU',
    'Nama Barang',
    'Kategori',
    'Kuantiti',
    'Satuan',
    'Dari Lokasi',
    'Ke Lokasi',
    'No. Referensi / DO',
    'Petugas / Operator',
    'Catatan / Keterangan',
  ];
  const lastColIdx = colHeaders.length - 1;

  // Row 0: Company Header Banner
  const r0Cell = 'A1';
  ws[r0Cell] = {
    t: 's',
    v: 'PT SISTEM DISTRIBUSI LOGISTIK - GUDANG PUSAT',
    s: STYLE_MAIN_HEADER,
  };

  // Row 1: Document Subtitle Banner
  const r1Cell = 'A2';
  ws[r1Cell] = {
    t: 's',
    v: 'LAPORAN RESMI BUKU BESAR MUTASI STOK INVENTORY',
    s: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2563EB' } }, // Royal Blue
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };

  // Fill in other banner cells for merges styling
  for (let c = 1; c <= lastColIdx; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    ws[`${colLetter}1`] = { t: 's', v: '', s: STYLE_MAIN_HEADER };
    ws[`${colLetter}2`] = {
      t: 's',
      v: '',
      s: {
        fill: { fgColor: { rgb: '2563EB' } },
        border: BORDER_THIN,
      },
    };
  }

  // Row 3-5: Metadata Box
  const nowStr = formatDate(new Date().toISOString());
  const metaRows = [
    [
      { label: 'Waktu Cetak / Export', val: nowStr },
      { label: 'Dicetak Oleh (Admin)', val: meta?.adminName || 'Admin Gudang Pusat' },
    ],
    [
      { label: 'Filter Lokasi / Toko', val: meta?.storeFilterLabel || 'Semua Toko' },
      { label: 'Filter Jenis Transaksi', val: meta?.typeFilterLabel || 'Semua Tipe' },
    ],
    [
      { label: 'Filter Rentang Waktu', val: meta?.timeRangeLabel || 'Semua Waktu' },
      { label: 'Total Catatan Mutasi', val: `${mutations.length} Baris Transaksi` },
    ],
  ];

  metaRows.forEach((pair, idx) => {
    const r = 3 + idx; // Rows 4, 5, 6 in 1-based indexing
    // Pair 1
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: pair[0].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: pair[0].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: '', s: STYLE_META_VAL };

    // Pair 2
    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: pair[1].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 's', v: pair[1].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 's', v: '', s: STYLE_META_VAL };
  });

  // Table starts at Row 7 (index 7, line 8)
  const headerRowIdx = 7;
  colHeaders.forEach((title, c) => {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    ws[addr] = { t: 's', v: title, s: STYLE_TH };
  });

  // Data Rows
  let totalQty = 0;
  let currRow = headerRowIdx + 1;

  mutations.forEach((m, idx) => {
    const item = itemMap.get(m.item_id);
    const fromLoc =
      m.from_location_id !== null && m.from_location_id !== undefined
        ? locMap.get(m.from_location_id)?.name
        : '-';
    const toLoc =
      m.to_location_id !== null && m.to_location_id !== undefined
        ? locMap.get(m.to_location_id)?.name
        : m.transaction_type === 'DAMAGE_LOSS'
        ? 'AKUN KERUGIAN (LOSS)'
        : '-';
    const creator = userMap.get(m.created_by)?.full_name || m.created_by;
    const isOdd = idx % 2 === 1;

    totalQty += m.qty;

    const rowData: [any, 'left' | 'center' | 'right', string?][] = [
      [idx + 1, 'center'],
      [m.id, 'center'],
      [formatDate(m.created_at), 'center'],
      [m.transaction_type, 'center'],
      [item?.sku || '-', 'center'],
      [item?.name || '-', 'left'],
      [item?.category || '-', 'left'],
      [m.qty, 'right', '#,##0'],
      [item?.unit || 'PCS', 'center'],
      [fromLoc || '-', 'left'],
      [toLoc || '-', 'left'],
      [m.reference_code || m.reference_id || '-', 'center'],
      [creator, 'left'],
      [m.notes || '-', 'left'],
    ];

    rowData.forEach(([val, align, numFmt], colIdx) => {
      const addr = XLSX.utils.encode_cell({ r: currRow, c: colIdx });
      ws[addr] = makeCell(val, align, isOdd, { numFmt });
    });

    currRow++;
  });

  // Summary / Total Row
  ws[XLSX.utils.encode_cell({ r: currRow, c: 0 })] = makeTotalCell('TOTAL KUANTITI MUTASI', 'left');
  for (let c = 1; c <= 6; c++) {
    ws[XLSX.utils.encode_cell({ r: currRow, c })] = makeTotalCell('', 'center');
  }
  // Qty column (col 7)
  ws[XLSX.utils.encode_cell({ r: currRow, c: 7 })] = makeTotalCell(totalQty, 'right', '#,##0');
  // Remaining cols
  for (let c = 8; c <= lastColIdx; c++) {
    ws[XLSX.utils.encode_cell({ r: currRow, c })] = makeTotalCell('', 'center');
  }

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }, // Subtitle
    // Meta merges
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
    // Total label merge
    { s: { r: currRow, c: 0 }, e: { r: currRow, c: 6 } },
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 10 }, // ID Mutasi
    { wch: 20 }, // Waktu
    { wch: 22 }, // Tipe
    { wch: 14 }, // SKU
    { wch: 32 }, // Nama Barang
    { wch: 16 }, // Kategori
    { wch: 12 }, // Qty
    { wch: 10 }, // Satuan
    { wch: 22 }, // Dari
    { wch: 22 }, // Ke
    { wch: 20 }, // No Ref
    { wch: 22 }, // Petugas
    { wch: 32 }, // Catatan
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 26 }, // Title
    { hpt: 20 }, // Subtitle
    { hpt: 8 },  // Space
    { hpt: 18 }, // Meta 1
    { hpt: 18 }, // Meta 2
    { hpt: 18 }, // Meta 3
    { hpt: 10 }, // Space
    { hpt: 24 }, // Header
  ];

  // Set boundary range & autofilter
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: currRow, c: lastColIdx },
  });
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: currRow - 1, c: lastColIdx },
    }),
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Buku Besar Mutasi');
  XLSX.writeFile(wb, filename);
}

// -------------------------------------------------------------
// 2. EXPORT MASTER SKU & STOK MULTI-LOKASI
// -------------------------------------------------------------
export function exportMasterItemsToExcel(
  items: Item[],
  inventories: Inventory[],
  locations: Location[],
  adminName = 'Admin Gudang Pusat',
  filename = 'Master_SKU_dan_Posisi_Stok.xlsx'
) {
  const wb = XLSX.utils.book_new();
  const ws: any = {};

  const colHeaders = [
    'No.',
    'Kode SKU',
    'Nama Barang',
    'Kategori',
    'Satuan',
    'Safety Stock',
    'Gudang Bebas',
    'Terkunci (Reserved)',
    'In-Transit (Kirim)',
    'Stok Toko 1',
    'Stok Toko 2',
    'Stok Toko 3',
    'Total Stok Sistem',
    'Harga Satuan (Rp)',
    'Nilai Aset Bebas (Rp)',
    'Status Stok Gudang',
  ];
  const lastColIdx = colHeaders.length - 1;

  // Row 0: Company Title
  ws['A1'] = {
    t: 's',
    v: 'PT SISTEM DISTRIBUSI LOGISTIK - GUDANG PUSAT',
    s: STYLE_MAIN_HEADER,
  };

  // Row 1: Subtitle
  ws['A2'] = {
    t: 's',
    v: 'LAPORAN MASTER DATA SKU & POSISI STOK MULTI-CABANG',
    s: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '059669' } }, // Emerald 600
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };

  for (let c = 1; c <= lastColIdx; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    ws[`${colLetter}1`] = { t: 's', v: '', s: STYLE_MAIN_HEADER };
    ws[`${colLetter}2`] = {
      t: 's',
      v: '',
      s: { fill: { fgColor: { rgb: '059669' } }, border: BORDER_THIN },
    };
  }

  // Helper to get inventory
  const getInv = (locationId: number, itemId: number) => {
    return (
      inventories.find(i => i.location_id === locationId && i.item_id === itemId) || {
        stock_available: 0,
        stock_reserved: 0,
        stock_in_transit: 0,
      }
    );
  };

  // Calculate totals for metadata
  let totalHubAvailable = 0;
  let totalHubReserved = 0;
  let totalInTransit = 0;
  let totalStore1 = 0;
  let totalStore2 = 0;
  let totalStore3 = 0;
  let totalGrandStock = 0;
  let totalValuation = 0;

  items.forEach(it => {
    const hub = getInv(0, it.id);
    const s1 = getInv(1, it.id);
    const s2 = getInv(2, it.id);
    const s3 = getInv(3, it.id);
    const totalAll =
      hub.stock_available +
      hub.stock_reserved +
      hub.stock_in_transit +
      s1.stock_available +
      s2.stock_available +
      s3.stock_available;

    totalHubAvailable += hub.stock_available;
    totalHubReserved += hub.stock_reserved;
    totalInTransit += hub.stock_in_transit;
    totalStore1 += s1.stock_available;
    totalStore2 += s2.stock_available;
    totalStore3 += s3.stock_available;
    totalGrandStock += totalAll;
    totalValuation += hub.stock_available * (it.price || 0);
  });

  const nowStr = formatDate(new Date().toISOString());
  const metaRows = [
    [
      { label: 'Waktu Cetak / Export', val: nowStr },
      { label: 'Dicetak Oleh (Admin)', val: adminName },
    ],
    [
      { label: 'Total Jenis SKU', val: `${items.length} SKU Master` },
      { label: 'Total Stok Gudang Pusat', val: `${totalHubAvailable} Unit Bebas` },
    ],
    [
      { label: 'Total Estimasi Valuasi Aset', val: `Rp ${totalValuation.toLocaleString('id-ID')}` },
      { label: 'Jumlah Cabang Retail', val: `${locations.filter(l => l.type === 'STORE').length} Toko Cabang` },
    ],
  ];

  metaRows.forEach((pair, idx) => {
    const r = 3 + idx;
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: pair[0].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: pair[0].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: '', s: STYLE_META_VAL };

    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: pair[1].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 's', v: pair[1].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 's', v: '', s: STYLE_META_VAL };
  });

  const headerRowIdx = 7;
  colHeaders.forEach((title, c) => {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    ws[addr] = { t: 's', v: title, s: STYLE_TH };
  });

  let currRow = headerRowIdx + 1;
  items.forEach((item, idx) => {
    const hub = getInv(0, item.id);
    const s1 = getInv(1, item.id);
    const s2 = getInv(2, item.id);
    const s3 = getInv(3, item.id);

    const totalStock =
      hub.stock_available +
      hub.stock_reserved +
      hub.stock_in_transit +
      s1.stock_available +
      s2.stock_available +
      s3.stock_available;

    const assetValue = hub.stock_available * (item.price || 0);
    const isLow = hub.stock_available <= item.safety_stock;
    const statusText = isLow ? 'MENIPIS (RESTOCK)' : 'AMAN';
    const isOdd = idx % 2 === 1;

    const rowData: [any, 'left' | 'center' | 'right', string?, CellOptions?][] = [
      [idx + 1, 'center'],
      [item.sku, 'center'],
      [item.name, 'left'],
      [item.category || 'Umum', 'left'],
      [item.unit || 'PCS', 'center'],
      [item.safety_stock || 0, 'right', '#,##0'],
      [hub.stock_available, 'right', '#,##0', isLow ? { color: 'DC2626', bold: true } : undefined],
      [hub.stock_reserved, 'right', '#,##0'],
      [hub.stock_in_transit, 'right', '#,##0'],
      [s1.stock_available, 'right', '#,##0'],
      [s2.stock_available, 'right', '#,##0'],
      [s3.stock_available, 'right', '#,##0'],
      [totalStock, 'right', '#,##0', { bold: true }],
      [item.price || 0, 'right', '"Rp"#,##0'],
      [assetValue, 'right', '"Rp"#,##0'],
      [statusText, 'center', undefined, { color: isLow ? 'DC2626' : '059669', bold: true }],
    ];

    rowData.forEach(([val, align, numFmt, opts], colIdx) => {
      const addr = XLSX.utils.encode_cell({ r: currRow, c: colIdx });
      ws[addr] = makeCell(val, align, isOdd, { ...opts, numFmt });
    });

    currRow++;
  });

  // Summary Row
  ws[XLSX.utils.encode_cell({ r: currRow, c: 0 })] = makeTotalCell('TOTAL KESELURUHAN', 'left');
  for (let c = 1; c <= 5; c++) {
    ws[XLSX.utils.encode_cell({ r: currRow, c })] = makeTotalCell('', 'center');
  }
  ws[XLSX.utils.encode_cell({ r: currRow, c: 6 })] = makeTotalCell(totalHubAvailable, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 7 })] = makeTotalCell(totalHubReserved, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 8 })] = makeTotalCell(totalInTransit, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 9 })] = makeTotalCell(totalStore1, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 10 })] = makeTotalCell(totalStore2, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 11 })] = makeTotalCell(totalStore3, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 12 })] = makeTotalCell(totalGrandStock, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 13 })] = makeTotalCell('', 'center');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 14 })] = makeTotalCell(totalValuation, 'right', '"Rp"#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 15 })] = makeTotalCell('', 'center');

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
    { s: { r: currRow, c: 0 }, e: { r: currRow, c: 5 } },
  ];

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // SKU
    { wch: 30 }, // Nama Barang
    { wch: 16 }, // Kategori
    { wch: 10 }, // Satuan
    { wch: 14 }, // Safety Stock
    { wch: 15 }, // Gudang Bebas
    { wch: 18 }, // Reserved
    { wch: 16 }, // In-Transit
    { wch: 14 }, // Toko 1
    { wch: 14 }, // Toko 2
    { wch: 14 }, // Toko 3
    { wch: 18 }, // Total Seluruh Stok
    { wch: 18 }, // Harga Satuan
    { wch: 22 }, // Nilai Aset
    { wch: 20 }, // Status Stok
  ];

  ws['!rows'] = [
    { hpt: 26 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 10 },
    { hpt: 24 },
  ];

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: currRow, c: lastColIdx },
  });
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: currRow - 1, c: lastColIdx },
    }),
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Master Stok Barang');
  XLSX.writeFile(wb, filename);
}

// -------------------------------------------------------------
// 3. EXPORT REKAP PERMINTAAN & DISPATCH TOKO
// -------------------------------------------------------------
export function exportTransferRequestsToExcel(
  requests: TransferRequest[],
  items: Item[],
  locations: Location[],
  users: User[],
  adminName = 'Admin Gudang Pusat',
  filename = 'Rekap_Permintaan_Transfer_Toko.xlsx'
) {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const locMap = new Map(locations.map(l => [l.id, l]));
  const userMap = new Map(users.map(u => [u.id, u]));

  const wb = XLSX.utils.book_new();
  const ws: any = {};

  const colHeaders = [
    'No.',
    'No. Request',
    'No. Surat Jalan (DO)',
    'Waktu Pengajuan',
    'Toko Tujuan',
    'Pemohon (Staf Toko)',
    'Status Otorisasi',
    'Kode SKU',
    'Nama Barang',
    'Qty Diajukan',
    'Qty Disetujui',
    'Qty Terkirim',
    'Qty Diterima',
    'Selisih (Discrepancy)',
    'Alasan Selisih',
    'Catatan Pengajuan',
  ];
  const lastColIdx = colHeaders.length - 1;

  ws['A1'] = {
    t: 's',
    v: 'PT SISTEM DISTRIBUSI LOGISTIK - GUDANG PUSAT',
    s: STYLE_MAIN_HEADER,
  };

  ws['A2'] = {
    t: 's',
    v: 'LAPORAN REKAPITULASI TRANSFER REQUEST & DISTRIBUSI CABANG',
    s: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } }, // Indigo 600
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };

  for (let c = 1; c <= lastColIdx; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    ws[`${colLetter}1`] = { t: 's', v: '', s: STYLE_MAIN_HEADER };
    ws[`${colLetter}2`] = {
      t: 's',
      v: '',
      s: { fill: { fgColor: { rgb: '4F46E5' } }, border: BORDER_THIN },
    };
  }

  const nowStr = formatDate(new Date().toISOString());
  const metaRows = [
    [
      { label: 'Waktu Cetak / Export', val: nowStr },
      { label: 'Dicetak Oleh (Admin)', val: adminName },
    ],
    [
      { label: 'Total Dokumen Request', val: `${requests.length} Permintaan` },
      { label: 'Status Selesai / Terkirim', val: `${requests.filter(r => r.status === 'COMPLETED' || r.status === 'DISCREPANCY').length} Selesai` },
    ],
  ];

  metaRows.forEach((pair, idx) => {
    const r = 3 + idx;
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: pair[0].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: pair[0].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: '', s: STYLE_META_VAL };

    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: pair[1].label, s: STYLE_META_LABEL };
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 's', v: pair[1].val, s: STYLE_META_VAL };
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 's', v: '', s: STYLE_META_VAL };
  });

  const headerRowIdx = 6;
  colHeaders.forEach((title, c) => {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    ws[addr] = { t: 's', v: title, s: STYLE_TH };
  });

  let currRow = headerRowIdx + 1;
  let counter = 1;
  let sumRequested = 0;
  let sumApproved = 0;
  let sumDispatched = 0;
  let sumReceived = 0;
  let sumDiscrepancy = 0;

  requests.forEach(req => {
    const toLoc = locMap.get(req.to_location_id)?.name || `Toko #${req.to_location_id}`;
    const requester = userMap.get(req.requested_by)?.full_name || req.requested_by;

    req.items.forEach(item => {
      const it = itemMap.get(item.item_id);
      const isOdd = counter % 2 === 0;

      const diff =
        req.status === 'COMPLETED' || req.status === 'DISCREPANCY'
          ? item.qty_dispatched - item.qty_received
          : 0;

      sumRequested += item.qty_requested || 0;
      sumApproved += item.qty_approved || 0;
      sumDispatched += item.qty_dispatched || 0;
      sumReceived += item.qty_received || 0;
      sumDiscrepancy += diff > 0 ? diff : 0;

      const rowData: [any, 'left' | 'center' | 'right', string?, CellOptions?][] = [
        [counter, 'center'],
        [req.request_number, 'center'],
        [req.do_number || '-', 'center'],
        [formatDate(req.created_at), 'center'],
        [toLoc, 'left'],
        [requester, 'left'],
        [req.status, 'center'],
        [it?.sku || '-', 'center'],
        [it?.name || '-', 'left'],
        [item.qty_requested, 'right', '#,##0'],
        [item.qty_approved, 'right', '#,##0'],
        [item.qty_dispatched, 'right', '#,##0'],
        [item.qty_received, 'right', '#,##0'],
        [diff > 0 ? diff : 0, 'right', '#,##0', diff > 0 ? { color: 'DC2626', bold: true } : undefined],
        [item.discrepancy_reason || '-', 'left'],
        [req.request_notes || '-', 'left'],
      ];

      rowData.forEach(([val, align, numFmt, opts], colIdx) => {
        const addr = XLSX.utils.encode_cell({ r: currRow, c: colIdx });
        ws[addr] = makeCell(val, align, isOdd, { ...opts, numFmt });
      });

      currRow++;
      counter++;
    });
  });

  // Summary Row
  ws[XLSX.utils.encode_cell({ r: currRow, c: 0 })] = makeTotalCell('TOTAL KUANTITI', 'left');
  for (let c = 1; c <= 8; c++) {
    ws[XLSX.utils.encode_cell({ r: currRow, c })] = makeTotalCell('', 'center');
  }
  ws[XLSX.utils.encode_cell({ r: currRow, c: 9 })] = makeTotalCell(sumRequested, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 10 })] = makeTotalCell(sumApproved, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 11 })] = makeTotalCell(sumDispatched, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 12 })] = makeTotalCell(sumReceived, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 13 })] = makeTotalCell(sumDiscrepancy, 'right', '#,##0');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 14 })] = makeTotalCell('', 'center');
  ws[XLSX.utils.encode_cell({ r: currRow, c: 15 })] = makeTotalCell('', 'center');

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
    { s: { r: currRow, c: 0 }, e: { r: currRow, c: 8 } },
  ];

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // No Request
    { wch: 18 }, // No DO
    { wch: 20 }, // Tanggal
    { wch: 20 }, // Toko Tujuan
    { wch: 20 }, // Pemohon
    { wch: 18 }, // Status
    { wch: 14 }, // SKU
    { wch: 30 }, // Nama Barang
    { wch: 14 }, // Qty Diajukan
    { wch: 14 }, // Qty Disetujui
    { wch: 14 }, // Qty Terkirim
    { wch: 14 }, // Qty Diterima
    { wch: 16 }, // Selisih
    { wch: 24 }, // Alasan Selisih
    { wch: 30 }, // Catatan
  ];

  ws['!rows'] = [
    { hpt: 26 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 10 },
    { hpt: 24 },
  ];

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: currRow, c: lastColIdx },
  });
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: currRow - 1, c: lastColIdx },
    }),
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Permintaan Toko');
  XLSX.writeFile(wb, filename);
}
