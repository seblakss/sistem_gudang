import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/Badge';
import { NavigationTab } from '../layout/Sidebar';
import { 
  Warehouse, Package, Clock, Truck, 
  ShieldAlert, ArrowDownRight, ClipboardList, 
  Store, Boxes
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface WarehouseDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const WarehouseDashboard: React.FC<WarehouseDashboardProps> = ({ onNavigate }) => {
  const { items, inventories, requests } = useInventory();
  const { locations } = useAuth();

  const locMap = new Map(locations.map(l => [l.id, l]));

  // Gudang Pusat (Location 0) Totals
  const hubInventories = inventories.filter(inv => inv.location_id === 0);
  const totalAvailableStock = hubInventories.reduce((sum, inv) => sum + inv.stock_available, 0);
  const totalReservedStock = hubInventories.reduce((sum, inv) => sum + inv.stock_reserved, 0);
  const totalInTransitStock = hubInventories.reduce((sum, inv) => sum + inv.stock_in_transit, 0);

  // Requests Counts
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const readyDispatch = requests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIAL');
  const inTransitShipments = requests.filter(r => r.status === 'IN_TRANSIT');

  // Low stock items in Central Warehouse
  const lowStockItems = items.filter(item => {
    const inv = hubInventories.find(i => i.item_id === item.id);
    const available = inv ? inv.stock_available : 0;
    return available <= item.safety_stock;
  });

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Welcome Mobile Hero Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/40 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-wider border border-brand-400/30">
          <Warehouse className="w-3 h-3" />
          <span>Hub Master Gudang Pusat</span>
        </div>
        
        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
          Distribusi Stok Multi-Toko
        </h1>
        
        <p className="text-xs text-indigo-200/80 leading-relaxed">
          Sistem logistik <em>Two-Way Handshake</em> & reservasi stok anti-selisih ke 3 toko cabang.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => onNavigate('warehouse_approval_queue')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-white shadow-sm active:scale-95 transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Otorisasi ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => onNavigate('warehouse_master_items')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <span>Inbound Stok</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (2x2 on smartphone) */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          title="Stok Bebas"
          value={formatNumber(totalAvailableStock)}
          subtitle={`${items.length} SKU master`}
          icon={Package}
          color="emerald"
        />

        <StatCard
          title="Reserved"
          value={formatNumber(totalReservedStock)}
          subtitle="Terkunci kirim"
          icon={Boxes}
          color="indigo"
        />

        <StatCard
          title="In-Transit"
          value={formatNumber(totalInTransitStock)}
          subtitle={`${inTransitShipments.length} DO aktif`}
          icon={Truck}
          color="blue"
        />

        <StatCard
          title="Antrean TR"
          value={pendingRequests.length}
          subtitle={`${readyDispatch.length} siap kirim`}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Store Distribution Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Store className="w-4 h-4 text-brand-600" />
            <span>Stok di 3 Cabang Toko</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Spokes</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(storeId => {
            const storeLoc = locMap.get(storeId);
            const storeInvs = inventories.filter(inv => inv.location_id === storeId);
            const totalStock = storeInvs.reduce((sum, inv) => sum + inv.stock_available, 0);
            const storeInTransit = requests
              .filter(r => r.to_location_id === storeId && r.status === 'IN_TRANSIT')
              .reduce((sum, r) => sum + r.items.reduce((iSum, i) => iSum + i.qty_dispatched, 0), 0);

            return (
              <div
                key={storeId}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center space-y-1"
              >
                <span className="block text-[10px] font-bold text-slate-400">
                  {storeLoc?.name.split(' ')[0]} {storeId}
                </span>
                <span className="block text-base font-black text-slate-900 dark:text-white">
                  {formatNumber(totalStock)}
                </span>
                {storeInTransit > 0 && (
                  <span className="block text-[9px] font-bold text-blue-500">
                    +{storeInTransit} di jalan
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Stock Alert Section */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-200 dark:border-amber-900/60 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Stok Gudang Menipis ({lowStockItems.length} SKU)</span>
            </div>
            <button
              onClick={() => onNavigate('warehouse_master_items')}
              className="text-[10px] font-bold text-brand-600 dark:text-brand-400"
            >
              Inbound &rarr;
            </button>
          </div>

          <div className="space-y-1.5">
            {lowStockItems.slice(0, 3).map(item => {
              const inv = hubInventories.find(i => i.item_id === item.id);
              const available = inv ? inv.stock_available : 0;
              return (
                <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white/80 dark:bg-slate-900/60">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{item.name}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {available} / {item.safety_stock} {item.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transfer Requests */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-brand-600" />
            <span>Permintaan Terkini</span>
          </h3>
          <button
            onClick={() => onNavigate('warehouse_approval_queue')}
            className="text-[11px] font-bold text-brand-600 dark:text-brand-400"
          >
            Lihat Semua &rarr;
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Belum ada permintaan barang.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 4).map(req => {
              const toLoc = locMap.get(req.to_location_id);
              const totalQty = req.items.reduce((s, i) => s + i.qty_requested, 0);

              return (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {req.request_number}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {toLoc?.name} • {totalQty} Unit
                    </span>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
