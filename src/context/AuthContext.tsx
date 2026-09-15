import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Location, UserRole } from '../types';
import { StorageRepository } from '../db/storageRepository';
import { SupabaseService } from '../services/supabaseService';

interface AuthContextType {
  currentUser: User | null;
  currentLocation: Location | null;
  users: User[];
  locations: Location[];
  isWarehouseAdmin: boolean;
  isStoreStaff: boolean;
  switchUser: (userId: string) => void;
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  createUser: (userData: { username: string; password_hash: string; full_name: string; role: UserRole; location_id: number }) => Promise<User>;
  updateUser: (userId: string, data: Partial<User>) => Promise<User>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => StorageRepository.getUsers());
  const [locations] = useState<Location[]>(() => StorageRepository.getLocations());
  
  // ponytail: active session stored in localStorage as JSON. Ceiling: client-side session without JWT refresh token expiry. Upgrade path: use Supabase Auth session with refresh tokens if moving to strict JWT auth.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('wms_active_user');
      if (savedUser) {
        const parsed: User = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.is_active !== false) {
          return parsed;
        }
      }
      const savedUserId = localStorage.getItem('wms_active_user_id');
      if (savedUserId) {
        const uList = StorageRepository.getUsers();
        const found = uList.find(u => u.id === savedUserId && u.is_active !== false);
        if (found) return found;
      }
    } catch {
      // ignore JSON parse error
    }
    return null;
  });

  const refreshUsers = useCallback(async () => {
    const list = await SupabaseService.getUsers();
    setUsers(list);
    setCurrentUser(prev => {
      if (!prev) return null;
      const fresh = list.find(u => u.id === prev.id || u.username.toLowerCase() === prev.username.toLowerCase());
      if (fresh) {
        if (fresh.is_active === false) return null;
        return { ...prev, ...fresh };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wms_active_user', JSON.stringify(currentUser));
      localStorage.setItem('wms_active_user_id', currentUser.id);
    } else {
      localStorage.removeItem('wms_active_user');
      localStorage.removeItem('wms_active_user_id');
    }
  }, [currentUser]);

  const currentLocation = locations.find(l => l.id === currentUser?.location_id) || null;
  const isWarehouseAdmin = currentUser?.role === 'ADMIN_GUDANG';
  const isStoreStaff = currentUser?.role === 'ORANG_TOKO';

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const login = async (username: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    const res = await SupabaseService.authenticateUser(username, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      return { success: true };
    }
    return { success: false, message: res.message || 'Login gagal' };
  };

  const logout = () => {
    localStorage.removeItem('wms_active_user');
    localStorage.removeItem('wms_active_user_id');
    setCurrentUser(null);
  };

  const createUser = async (userData: { username: string; password_hash: string; full_name: string; role: UserRole; location_id: number }) => {
    if (!currentUser) throw new Error('Harus login sebagai admin');
    const created = await SupabaseService.createUser(currentUser.id, userData);
    await refreshUsers();
    return created;
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    if (!currentUser) throw new Error('Harus login sebagai admin');
    const updated = await SupabaseService.updateUser(currentUser.id, userId, data);
    await refreshUsers();
    if (currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentLocation,
        users,
        locations,
        isWarehouseAdmin,
        isStoreStaff,
        switchUser,
        login,
        logout,
        createUser,
        updateUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
