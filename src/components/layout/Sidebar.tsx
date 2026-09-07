import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { 
  LayoutDashboard, Package, ClipboardList, Send, 
  BookOpen, PlusCircle, CheckSquare, 
  Warehouse, Store, AlertCircle
} from 'lucide-react';

export type NavigationTab = 
  // Warehouse Tabs
  | 'warehouse_dashboard'
  | 'warehouse_master_items'
  | 'warehouse_approval_queue'
  | 'warehouse_dispatch'
  | 'warehouse_mutation_ledger'
  | 'warehouse_user_management'
  // Store Tabs
  | 'store_dashboard'
  | 'store_create_request'
  | 'store_request_history'
  | 'store_receiving';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { isWarehouseAdmin, currentLocation } = useAuth();
  const { requests, inventories } = useInventory();

  // Badge counts
  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedForDispatchCount = requests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIAL').length;
  
  // Store badge counts
  const myLocationId = currentLocation?.id;
  const inTransitCount = requests.filter(
    r => r.to_location_id === myLocationId && r.status === 'IN_TRANSIT'
  ).length;

  const lowStockCount = inventories.filter(
    inv => inv.location_id === myLocationId && inv.stock_available <= 5
  ).length;

  const warehouseMenuItems = [
    {
      id: 'warehouse_dashboard' as NavigationTab,
      label: 'Dasbor Gudang',
      icon: LayoutDashboard,
    },
    {
      id: 'warehouse_master_items' as NavigationTab,
      label: 'Master Barang & Inbound',
      icon: Package,
    },
    {
      id: 'warehouse_approval_queue' as NavigationTab,
      label: 'Antrean Otorisasi',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'warehouse_dispatch' as NavigationTab,
      label: 'Pengiriman & Surat Jalan',
      icon: Send,
      badge: approvedForDispatchCount > 0 ? approvedForDispatchCount : undefined,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      id: 'warehouse_mutation_ledger' as NavigationTab,
      label: 'Buku Besar Mutasi',
      icon: BookOpen,
    },
    {
      id: 'warehouse_user_management' as NavigationTab,
      label: 'Kelola Akun Staf',
      icon: PlusCircle,
    },
  ];

  const storeMenuItems = [
    {
      id: 'store_dashboard' as NavigationTab,
      label: 'Dasbor Cabang',
      icon: LayoutDashboard,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'store_create_request' as NavigationTab,
      label: 'Ajukan Permintaan (TR)',
      icon: PlusCircle,
    },
    {
      id: 'store_request_history' as NavigationTab,
      label: 'Status & Riwayat Request',
      icon: ClipboardList,
    },
    {
      id: 'store_receiving' as NavigationTab,
      label: 'Penerimaan & Handshake',
      icon: CheckSquare,
      badge: inTransitCount > 0 ? inTransitCount : undefined,
      badgeColor: 'bg-blue-500 text-white animate-pulse',
    },
  ];

  const menuItems = isWarehouseAdmin ? warehouseMenuItems : storeMenuItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col justify-between p-4 overflow-y-auto`}
      >
        <div>
          {/* Active Area Banner */}
          <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isWarehouseAdmin ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                {isWarehouseAdmin ? <Warehouse className="w-4 h-4" /> : <Store className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isWarehouseAdmin ? 'Modul Pusat' : 'Modul Cabang'}
                </span>
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentLocation?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? isWarehouseAdmin
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                        : 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Info Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/40 dark:to-indigo-950/20 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
              <span>Two-Way Handshake</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              Stok in-transit dipotong dari gudang dan ditambahkan ke toko hanya saat serah terima diverifikasi.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
