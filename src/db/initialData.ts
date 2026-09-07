import { Location, User, Item, Inventory, TransferRequest, InventoryMutation } from '../types';

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 0,
    name: 'Gudang Pusat (Hub Master)',
    type: 'WAREHOUSE',
    address: 'Kawasan Industri Terpadu Blok A1, Cikarang',
    created_at: new Date().toISOString(),
  },
  {
    id: 1,
    name: 'Toko 1 (Cabang Barat)',
    type: 'STORE',
    address: 'Jl. Boulevard Raya Barat No. 45, Jakarta Barat',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Toko 2 (Cabang Selatan)',
    type: 'STORE',
    address: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Toko 3 (Cabang Timur)',
    type: 'STORE',
    address: 'Jl. Pemuda No. 88, Jakarta Timur',
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-01',
    username: 'admin.gudang',
    full_name: 'Budi Santoso (Admin Gudang Pusat)',
    role: 'ADMIN_GUDANG',
    location_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-toko1-01',
    username: 'staf.toko1',
    full_name: 'Rian Pratama (Staf Toko 1)',
    role: 'ORANG_TOKO',
    location_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-toko2-01',
    username: 'staf.toko2',
    full_name: 'Siti Rahma (Staf Toko 2)',
    role: 'ORANG_TOKO',
    location_id: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-toko3-01',
    username: 'staf.toko3',
    full_name: 'Doni Wijaya (Staf Toko 3)',
    role: 'ORANG_TOKO',
    location_id: 3,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_ITEMS: Item[] = [];
export const INITIAL_INVENTORIES: Inventory[] = [];
export const INITIAL_REQUESTS: TransferRequest[] = [];
export const INITIAL_MUTATIONS: InventoryMutation[] = [];

// Data Sampel Opsional (Dapat diaktifkan kapan saja via tombol di UI)
export const SAMPLE_DATA_PRESET = {
  items: [
    { id: 1, sku: 'SKU-ELK-001', name: 'Wireless Barcode Scanner 2D', category: 'Elektronik', unit: 'PCS', price: 450000, safety_stock: 10, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 2, sku: 'SKU-ELK-002', name: 'Thermal Receipt Printer 80mm', category: 'Elektronik', unit: 'UNIT', price: 750000, safety_stock: 5, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 3, sku: 'SKU-LOG-003', name: 'Kertas Thermal Roll 80x80 (Isi 10)', category: 'Perlengkapan Kasir', unit: 'PACK', price: 65000, safety_stock: 25, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 4, sku: 'SKU-PRM-004', name: 'Minyak Goreng Premium 2L', category: 'Sembako', unit: 'POUCH', price: 34000, safety_stock: 50, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 5, sku: 'SKU-PRM-005', name: 'Beras Pandan Wangi 5kg', category: 'Sembako', unit: 'SAK', price: 74500, safety_stock: 30, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 6, sku: 'SKU-BVR-006', name: 'Kopi Arabika Premium 250g', category: 'Minuman', unit: 'BUNGKUS', price: 48000, safety_stock: 20, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  ],
  inventories: [
    // Gudang Pusat (Location 0)
    { id: 1, location_id: 0, item_id: 1, stock_available: 45, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 2, location_id: 0, item_id: 2, stock_available: 20, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 3, location_id: 0, item_id: 3, stock_available: 120, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 4, location_id: 0, item_id: 4, stock_available: 300, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 5, location_id: 0, item_id: 5, stock_available: 150, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 6, location_id: 0, item_id: 6, stock_available: 80, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    // Toko 1 (Location 1)
    { id: 7, location_id: 1, item_id: 1, stock_available: 4, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 8, location_id: 1, item_id: 4, stock_available: 12, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    // Toko 2 (Location 2)
    { id: 9, location_id: 2, item_id: 3, stock_available: 8, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    { id: 10, location_id: 2, item_id: 5, stock_available: 5, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
    // Toko 3 (Location 3)
    { id: 11, location_id: 3, item_id: 6, stock_available: 6, stock_reserved: 0, stock_in_transit: 0, updated_at: new Date().toISOString() },
  ]
};
