import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { NavigationTab } from './Sidebar';
import { 
  LayoutDashboard, Package, ClipboardList, Send, 
  BookOpen, CheckSquare, PlusCircle, Users
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { isWarehouseAdmin, currentLocation } = useAuth();
  const { requests, inventories } = useInventory();

  // Badge counts
  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedForDispatchCount = requests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIAL').length;
  
  const myLocationId = currentLocation?.id;
  const inTransitCount = requests.filter(
    r => r.to_location_id === myLocationId && r.status === 'IN_TRANSIT'
  ).length;

  const lowStockCount = inventories.filter(
    inv => inv.location_id === myLocationId && inv.stock_available <= 5
  ).length;

  const warehouseTabs = [
    {
      id: 'warehouse_dashboard' as NavigationTab,
      label: 'Beranda',
      icon: LayoutDashboard,
    },
    {
      id: 'warehouse_master_items' as NavigationTab,
      label: 'Stok SKU',
      icon: Package,
    },
    {
      id: 'warehouse_approval_queue' as NavigationTab,
      label: 'Otorisasi',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'warehouse_dispatch' as NavigationTab,
      label: 'Dispatch',
      icon: Send,
      badge: approvedForDispatchCount > 0 ? approvedForDispatchCount : undefined,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      id: 'warehouse_mutation_ledger' as NavigationTab,
      label: 'Mutasi',
      icon: BookOpen,
    },
    {
      id: 'warehouse_user_management' as NavigationTab,
      label: 'User',
      icon: Users,
    },
  ];

  const storeTabs = [
    {
      id: 'store_dashboard' as NavigationTab,
      label: 'Beranda',
      icon: LayoutDashboard,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'store_create_request' as NavigationTab,
      label: 'Buat TR',
      icon: PlusCircle,
    },
    {
      id: 'store_request_history' as NavigationTab,
      label: 'Riwayat',
      icon: ClipboardList,
    },
    {
      id: 'store_receiving' as NavigationTab,
      label: 'Terima',
      icon: CheckSquare,
      badge: inTransitCount > 0 ? inTransitCount : undefined,
      badgeColor: 'bg-blue-500 text-white animate-pulse',
    },
  ];

  const tabs = isWarehouseAdmin ? warehouseTabs : storeTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? isWarehouseAdmin
                    ? 'text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span className={`absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
              {isActive && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isWarehouseAdmin ? 'bg-brand-600 dark:bg-brand-400' : 'bg-emerald-600 dark:bg-emerald-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
