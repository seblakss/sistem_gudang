import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Sun, Moon, LogOut, Package2, 
  Warehouse, Store, AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const Navbar: React.FC = () => {
  const { currentUser, currentLocation, isWarehouseAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        
        {/* Left: Brand & Active Branch Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-glow shrink-0">
            <Package2 className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                Nexus<span className="text-brand-600 dark:text-brand-400">WMS</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                isWarehouseAdmin 
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              }`}>
                {isWarehouseAdmin ? 'Gudang Pusat' : currentLocation?.name.replace(' (Cabang Barat)', '').replace(' (Cabang Selatan)', '').replace(' (Cabang Timur)', '')}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
              {isWarehouseAdmin ? (
                <Warehouse className="w-3 h-3 text-brand-500 shrink-0" />
              ) : (
                <Store className="w-3 h-3 text-emerald-500 shrink-0" />
              )}
              <span className="truncate">{currentUser?.full_name}</span>
            </div>
          </div>
        </div>

        {/* Right Actions: Theme Toggle & Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
            title="Ganti Mode Tampilan"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Secure Logout Button */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 transition-all active:scale-95"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[11px]">Keluar</span>
          </button>
        </div>

      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Konfirmasi Keluar"
        subtitle="Anda akan mengakhiri sesi aktif di perangkat ini"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Anda sedang login sebagai <strong>{currentUser?.full_name}</strong> ({currentLocation?.name}). Untuk berganti akun atau cabang lain, silakan keluar terlebih dahulu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:scale-95"
            >
              Batal
            </button>

            <button
              onClick={handleConfirmLogout}
              className="py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-500/20 active:scale-95"
            >
              Ya, Keluar
            </button>
          </div>
        </div>
      </Modal>
    </header>
  );
};
