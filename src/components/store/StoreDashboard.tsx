import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { CreateRequestModal } from './CreateRequestModal';
import { ReceivingHandshakeModal } from './ReceivingHandshakeModal';
import { NavigationTab } from '../layout/Sidebar';
import { TransferRequest } from '../../types';
import { 
  Store, Package, Truck, Clock, 
  ShieldAlert, PlusCircle, CheckSquare, 
  Search
} from 'lucide-react';
import { formatNumber, formatRupiah } from '../../utils/formatters';

interface StoreDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onNavigate }) => {
  const { items, inventories, requests } = useInventory();
  const { currentLocation } = useAuth();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeReceivingReq, setActiveReceivingReq] = useState<TransferRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const myLocationId = currentLocation?.id;

  // Local inventory for this store
  const myInventories = inventories.filter(inv => inv.location_id === myLocationId);
  const totalLocalStock = myInventories.reduce((sum, inv) => sum + inv.stock_available, 0);

  // Requests for this store
  const storeRequests = requests.filter(r => r.to_location_id === myLocationId);
  const inTransitRequests = storeRequests.filter(r => r.status === 'IN_TRANSIT');
  const pendingRequests = storeRequests.filter(r => r.status === 'PENDING');

  // Low stock items in this store
  const lowStockItems = items.filter(item => {
    const inv = myInventories.find(i => i.item_id === item.id);
    const available = inv ? inv.stock_available : 0;
    return available <= item.safety_stock;
  });

  const filteredItems = items.filter(item => {
    return item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           item.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white shadow-lg border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
              <Store className="w-3 h-3" />
              <span>{currentLocation?.name} (Spoke)</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Stok & Permintaan Toko
            </h1>

            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
              Ajukan permintaan barang ke gudang pusat dan lakukan verifikasi serah terima fisik kurir.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1 lg:pt-0 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajukan Request (TR)</span>
            </button>

            <button
              onClick={() => onNavigate('store_request_history')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all"
            >
              <span>Riwayat ({storeRequests.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* In-Transit Urgent Alert Banner */}
      {inTransitRequests.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm sm:text-base">
                Ada {inTransitRequests.length} Pengiriman Sedang Di Jalan Menuju Toko Anda
              </h4>
              <p className="text-xs text-blue-100 mt-0.5 leading-relaxed font-mono">
                DO: {inTransitRequests.map(r => r.do_number).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setActiveReceivingReq(inTransitRequests[0])}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-sm active:scale-95 transition-all"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Verifikasi & Konfirmasi Serah Terima Fisik</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (2 cols mobile, 4 cols desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Stok Toko"
          value={formatNumber(totalLocalStock)}
          subtitle="Unit fisik di cabang"
          icon={Package}
          color="emerald"
        />

        <StatCard
          title="Stok Rendah"
          value={`${lowStockItems.length} SKU`}
          subtitle="Di bawah safety stock"
          icon={ShieldAlert}
          color="amber"
        />

        <StatCard
          title="Di Perjalanan"
          value={`${inTransitRequests.length} Kiriman`}
          subtitle="Menuju toko Anda"
          icon={Truck}
          color="blue"
        />

        <StatCard
          title="Pending TR"
          value={pendingRequests.length}
          subtitle="Menunggu gudang"
          icon={Clock}
          color="indigo"
        />
      </div>

      {/* Store Inventory Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Stok Etalase Toko ({filteredItems.length} SKU)</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Saldo fisik di cabang ini</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari SKU atau nama barang..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Tidak ditemukan barang yang sesuai kata kunci.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredItems.map(item => {
              const inv = myInventories.find(i => i.item_id === item.id);
              const available = inv ? inv.stock_available : 0;
              const isLow = available <= item.safety_stock;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                      <span className="bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">{item.sku}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {formatRupiah(item.price || 0)}
                      </span>
                      <span>•</span>
                      <span>Min: {item.safety_stock} {item.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="font-bold font-mono tabular-nums text-sm text-slate-900 dark:text-white block">
                        {formatNumber(available)} {item.unit}
                      </span>
                      {isLow ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                          Menipis
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          Aman
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all"
                      title="Request barang ini"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Receiving Handshake Modal */}
      {activeReceivingReq && (
        <ReceivingHandshakeModal
          isOpen={activeReceivingReq !== null}
          onClose={() => setActiveReceivingReq(null)}
          request={activeReceivingReq}
          items={items}
        />
      )}
    </div>
  );
};
