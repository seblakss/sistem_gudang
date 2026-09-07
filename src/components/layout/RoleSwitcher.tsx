import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Warehouse, Store, UserCheck } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, users, switchUser } = useAuth();

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
      <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <UserCheck className="w-3.5 h-3.5 text-brand-500" />
        <span className="hidden xl:inline">Role Switcher:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {users.map(u => {
          const isActive = currentUser?.id === u.id;
          const isWarehouse = u.role === 'ADMIN_GUDANG';

          return (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? isWarehouse
                    ? 'bg-brand-600 text-white shadow-sm font-semibold'
                    : 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
              }`}
              title={`${u.full_name} (${u.role})`}
            >
              {isWarehouse ? (
                <Warehouse className="w-3.5 h-3.5" />
              ) : (
                <Store className="w-3.5 h-3.5" />
              )}
              <span>{isWarehouse ? 'Admin Gudang' : u.username.replace('staf.', 'Toko ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
