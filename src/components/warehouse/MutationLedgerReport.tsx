import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { TransactionType } from '../../types';
import { TransactionBadge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { 
  BookOpen, Download, Search, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, 
  CheckCircle, Printer
} from 'lucide-react';
import { formatDate, formatNumber, getTransactionTypeBadge } from '../../utils/formatters';
import { exportMutationsToExcel } from '../../utils/exportHelpers';

export const MutationLedgerReport: React.FC = () => {
  const { mutations, items, requests } = useInventory();
  const { locations, users, currentUser } = useAuth();

  // Filters State
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const itemMap = new Map(items.map(i => [i.id, i]));
  const locMap = new Map(locations.map(l => [l.id, l]));

  // Filter mutations
  const filteredMutations = mutations.filter(m => {
    if (storeFilter !== 'ALL') {
      if (m.from_location_id !== storeFilter && m.to_location_id !== storeFilter) {
        return false;
      }
    }

    if (typeFilter !== 'ALL' && m.transaction_type !== typeFilter) {
      return false;
    }

    if (timeRange !== 'ALL') {
      const date = new Date(m.created_at).getTime();
      const now = Date.now();
      if (timeRange === 'TODAY') {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        if (date < todayStart) return false;
      } else if (timeRange === '7DAYS') {
        if (now - date > 86400000 * 7) return false;
      } else if (timeRange === '30DAYS') {
        if (now - date > 86400000 * 30) return false;
      }
    }

    if (searchTerm.trim()) {
      const item = itemMap.get(m.item_id);
      const search = searchTerm.toLowerCase();
      const matchSku = item?.sku.toLowerCase().includes(search);
      const matchName = item?.name.toLowerCase().includes(search);
      const matchRef = m.reference_code?.toLowerCase().includes(search);
      const matchNotes = m.notes?.toLowerCase().includes(search);
      if (!matchSku && !matchName && !matchRef && !matchNotes) return false;
    }

    return true;
  });

  // Calculate KPIs
  const totalInboundQty = filteredMutations
    .filter(m => m.transaction_type === 'PURCHASE_INBOUND')
    .reduce((sum, m) => sum + m.qty, 0);

  const totalDispatchQty = filteredMutations
    .filter(m => m.transaction_type === 'TRANSFER_DISPATCH')
    .reduce((sum, m) => sum + m.qty, 0);

  const totalDamageLossQty = filteredMutations
    .filter(m => m.transaction_type === 'DAMAGE_LOSS')
    .reduce((sum, m) => sum + m.qty, 0);

  const evaluatedRequests = requests.filter(r => r.status !== 'PENDING' && r.status !== 'REJECTED');
  const totalRequested = evaluatedRequests.reduce(
    (sum, r) => sum + r.items.reduce((iSum, item) => iSum + item.qty_requested, 0),
    0
  );
  const totalApproved = evaluatedRequests.reduce(
    (sum, r) => sum + r.items.reduce((iSum, item) => iSum + (item.qty_dispatched || item.qty_approved), 0),
    0
  );
  const fulfillmentRate = totalRequested > 0 ? ((totalApproved / totalRequested) * 100).toFixed(1) : '100.0';

  const handleExportExcel = () => {
    const storeLabel =
      storeFilter === 'ALL'
        ? 'Semua Lokasi / Cabang'
        : locMap.get(storeFilter)?.name || `Lokasi #${storeFilter}`;
    const typeLabel =
      typeFilter === 'ALL'
        ? 'Semua Tipe Transaksi'
        : getTransactionTypeBadge(typeFilter).label;
    const timeLabel =
      timeRange === 'ALL'
        ? 'Semua Waktu'
        : timeRange === 'TODAY'
        ? 'Hari Ini'
        : timeRange === '7DAYS'
        ? '7 Hari Terakhir'
        : '30 Hari Terakhir';

    exportMutationsToExcel(filteredMutations, items, locations, users, {
      storeFilterLabel: storeLabel,
      typeFilterLabel: typeLabel,
      timeRangeLabel: timeLabel,
      adminName: currentUser?.full_name || 'Admin Gudang Pusat',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header & Export Actions */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600" />
            <span>Buku Besar Mutasi</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {filteredMutations.length} catatan mutasi terverifikasi
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 active:scale-95 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title="Cetak PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (2 cols mobile, 4 cols desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Inbound"
          value={`${formatNumber(totalInboundQty)}`}
          subtitle="Dari Supplier"
          icon={ArrowDownRight}
          color="emerald"
        />

        <StatCard
          title="Dispatch"
          value={`${formatNumber(totalDispatchQty)}`}
          subtitle="Keluar ke Toko"
          icon={ArrowUpRight}
          color="indigo"
        />

        <StatCard
          title="Loss / Rusak"
          value={`${formatNumber(totalDamageLossQty)}`}
          subtitle="Selisih serah terima"
          icon={AlertTriangle}
          color="rose"
        />

        <StatCard
          title="Fulfillment"
          value={`${fulfillmentRate}%`}
          subtitle="Rasio pemenuhan"
          icon={CheckCircle}
          color="blue"
        />
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari SKU, nama barang, kode referensi, atau catatan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Semua Cabang</option>
            <option value={1}>Toko 1</option>
            <option value={2}>Toko 2</option>
            <option value={3}>Toko 3</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="PURCHASE_INBOUND">Inbound</option>
            <option value="TRANSFER_DISPATCH">Dispatch</option>
            <option value="TRANSFER_RECEIVE">Receive</option>
            <option value="DAMAGE_LOSS">Loss/Rusak</option>
          </select>

          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as any)}
            className="col-span-2 sm:col-span-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Semua Waktu</option>
            <option value="TODAY">Hari Ini</option>
            <option value="7DAYS">7 Hari Terakhir</option>
            <option value="30DAYS">30 Hari Terakhir</option>
          </select>
        </div>
      </div>

      {/* Mutation Cards Grid */}
      {filteredMutations.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tidak Ada Data Mutasi
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Log mutasi akan bertambah saat terjadi alur transaksi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMutations.map(m => {
            const item = itemMap.get(m.item_id);
            const fromLoc = m.from_location_id !== null && m.from_location_id !== undefined ? locMap.get(m.from_location_id)?.name : '-';
            const toLoc = m.to_location_id !== null && m.to_location_id !== undefined ? locMap.get(m.to_location_id)?.name : (m.transaction_type === 'DAMAGE_LOSS' ? 'AKUN LOSS' : '-');

            const isLoss = m.transaction_type === 'DAMAGE_LOSS';
            const isOut = m.transaction_type === 'TRANSFER_DISPATCH';

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    #{m.id} • {formatDate(m.created_at)}
                  </span>
                  <TransactionBadge type={m.transaction_type} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                      {item?.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item?.sku}
                    </span>
                  </div>

                  <div className={`text-right font-mono tabular-nums font-bold text-sm ${
                    isLoss ? 'text-rose-600 dark:text-rose-400' : isOut ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {m.qty} {item?.unit || 'PCS'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="truncate max-w-[200px]">
                    {fromLoc} &rarr; <strong>{toLoc}</strong>
                  </span>
                  {m.reference_code && (
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                      {m.reference_code}
                    </span>
                  )}
                </div>

                {m.notes && (
                  <p className="text-[10px] text-slate-400 italic">
                    "{m.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
