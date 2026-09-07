import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { ToastContainer } from './components/common/Toast';
import { LoginPage } from './components/auth/LoginPage';

// Warehouse Views
import { WarehouseDashboard } from './components/warehouse/WarehouseDashboard';
import { MasterItemManagement } from './components/warehouse/MasterItemManagement';
import { RequestApprovalQueue } from './components/warehouse/RequestApprovalQueue';
import { DispatchManagement } from './components/warehouse/DispatchManagement';
import { MutationLedgerReport } from './components/warehouse/MutationLedgerReport';
import { UserManagement } from './components/warehouse/UserManagement';

// Store Views
import { StoreDashboard } from './components/store/StoreDashboard';
import { StoreRequestList } from './components/store/StoreRequestList';
import { CreateRequestModal } from './components/store/CreateRequestModal';

export const App: React.FC = () => {
  const { currentUser, isWarehouseAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('warehouse_dashboard');
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);

  // Sync default tab when user switches role
  useEffect(() => {
    if (isWarehouseAdmin) {
      if (!activeTab.startsWith('warehouse_')) {
        setActiveTab('warehouse_dashboard');
      }
    } else {
      if (!activeTab.startsWith('store_')) {
        setActiveTab('store_dashboard');
      }
    }
  }, [currentUser, isWarehouseAdmin]);

  const handleSelectTab = (tab: NavigationTab) => {
    if (tab === 'store_create_request') {
      setIsCreateRequestModalOpen(true);
    } else {
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Mobile-Optimized Top App Bar */}
      <Navbar />

      {/* Main Layout Container (Centered for Mobile Screen Focus) */}
      <div className="flex-1 flex max-w-2xl w-full mx-auto">
        {/* Desktop Sidebar (Only visible on large screens) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          mobileOpen={false}
          onCloseMobile={() => {}}
        />

        {/* Smartphone Content Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 min-w-0">
          {/* Warehouse Admin Views */}
          {isWarehouseAdmin && (
            <>
              {activeTab === 'warehouse_dashboard' && (
                <WarehouseDashboard onNavigate={handleSelectTab} />
              )}
              {activeTab === 'warehouse_master_items' && (
                <MasterItemManagement />
              )}
              {activeTab === 'warehouse_approval_queue' && (
                <RequestApprovalQueue />
              )}
              {activeTab === 'warehouse_dispatch' && (
                <DispatchManagement />
              )}
              {activeTab === 'warehouse_mutation_ledger' && (
                <MutationLedgerReport />
              )}
              {activeTab === 'warehouse_user_management' && (
                <UserManagement />
              )}
            </>
          )}

          {/* Store Staff Views */}
          {!isWarehouseAdmin && (
            <>
              {activeTab === 'store_dashboard' && (
                <StoreDashboard onNavigate={handleSelectTab} />
              )}
              {activeTab === 'store_request_history' && (
                <StoreRequestList />
              )}
              {activeTab === 'store_receiving' && (
                <StoreRequestList initialFilter="IN_TRANSIT" />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly for smartphone) */}
      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Global Create Request Modal for Store */}
      {!isWarehouseAdmin && (
        <CreateRequestModal
          isOpen={isCreateRequestModalOpen}
          onClose={() => setIsCreateRequestModalOpen(false)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default App;
