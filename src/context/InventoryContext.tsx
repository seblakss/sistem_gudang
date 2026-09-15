import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Item, Inventory, TransferRequest, InventoryMutation, Notification } from '../types';
import { StorageRepository } from '../db/storageRepository';
import { SupabaseService } from '../services/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface InventoryContextType {
  items: Item[];
  inventories: Inventory[];
  requests: TransferRequest[];
  mutations: InventoryMutation[];
  notifications: Notification[];
  toasts: ToastMessage[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
  
  // Actions
  addNewItem: (data: Omit<Item, 'id' | 'created_at'>) => Promise<Item>;
  inboundStock: (itemId: number, qty: number, notes: string, userId: string, supplierName?: string) => Promise<void>;
  createRequest: (toLocationId: number, requestedByUserId: string, itemsData: Array<{ itemId: number; qtyRequested: number }>, notes?: string) => Promise<TransferRequest>;
  authorizeRequest: (requestId: number, adminUserId: string, decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT', options?: { approvedItems?: Array<{ itemId: number; qtyApproved: number }>; rejectionNotes?: string }) => Promise<void>;
  dispatchRequest: (requestId: number, adminUserId: string) => Promise<void>;
  receiveTransfer: (requestId: number, storeUserId: string, receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>) => Promise<void>;
  markNotificationRead: (id: string) => void;
  loadSampleDataPreset: () => Promise<void>;
  resetToClean: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [mutations, setMutations] = useState<InventoryMutation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    try {
      const [itms, invs, reqs, muts] = await Promise.all([
        SupabaseService.getItems(),
        SupabaseService.getInventories(),
        SupabaseService.getRequests(),
        SupabaseService.getMutations(),
      ]);

      setItems(itms);
      setInventories(invs);
      setRequests(reqs);
      setMutations(muts);
      setNotifications(StorageRepository.getNotifications());
    } catch (err) {
      console.warn('Fallback to local storage data:', err);
      setItems(StorageRepository.getItems());
      setInventories(StorageRepository.getInventories());
      setRequests(StorageRepository.getRequests());
      setMutations(StorageRepository.getMutations());
      setNotifications(StorageRepository.getNotifications());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and Realtime Subscription
  useEffect(() => {
    refreshData();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('schema-inventory-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items' },
          () => {
            refreshData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventories' },
          () => {
            refreshData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transfer_requests' },
          () => {
            refreshData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transfer_request_items' },
          () => {
            refreshData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_mutations' },
          () => {
            refreshData();
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [refreshData]);

  const showToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addNewItem = async (data: Omit<Item, 'id' | 'created_at'>): Promise<Item> => {
    try {
      const created = await SupabaseService.createItem(data);
      await refreshData();
      showToast('success', 'Master Barang Ditambahkan', `SKU ${created.sku} (${created.name}) berhasil disimpan.`);
      return created;
    } catch (err: any) {
      showToast('error', 'Gagal Menambah Barang', err.message);
      throw err;
    }
  };

  const inboundStock = async (itemId: number, qty: number, notes: string, userId: string, supplierName?: string): Promise<void> => {
    try {
      await SupabaseService.inboundStock(itemId, qty, notes, userId, supplierName);
      await refreshData();
      showToast('success', 'Stock Inbound Berhasil', `Berhasil menambah ${qty} unit ke Gudang Pusat.`);
    } catch (err: any) {
      showToast('error', 'Gagal Inbound Stok', err.message);
      throw err;
    }
  };

  const createRequest = async (
    toLocationId: number,
    requestedByUserId: string,
    itemsData: Array<{ itemId: number; qtyRequested: number }>,
    notes?: string
  ): Promise<TransferRequest> => {
    try {
      const newReq = await SupabaseService.createTransferRequest(toLocationId, requestedByUserId, itemsData, notes);
      await refreshData();
      showToast('success', 'Transfer Request Terkirim', `Dokumen ${newReq.request_number} berhasil diajukan.`);
      return newReq;
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Request', err.message);
      throw err;
    }
  };

  const authorizeRequest = async (
    requestId: number,
    adminUserId: string,
    decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT',
    options?: { approvedItems?: Array<{ itemId: number; qtyApproved: number }>; rejectionNotes?: string }
  ): Promise<void> => {
    try {
      await SupabaseService.authorizeTransferRequest(requestId, adminUserId, decision, options);
      await refreshData();
      if (decision === 'REJECT') {
        showToast('warning', 'Request Ditolak', `Permintaan #${requestId} telah ditolak.`);
      } else {
        showToast('success', 'Otorisasi Berhasil', `Stok berhasil direservasi.`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal Otorisasi Request', err.message);
      throw err;
    }
  };

  const dispatchRequest = async (requestId: number, adminUserId: string): Promise<void> => {
    try {
      await SupabaseService.dispatchTransferRequest(requestId, adminUserId);
      await refreshData();
      showToast('success', 'Barang Telah Di-Dispatch', `Surat Jalan (DO) diterbitkan.`);
    } catch (err: any) {
      showToast('error', 'Gagal Dispatch Barang', err.message);
      throw err;
    }
  };

  const receiveTransfer = async (
    requestId: number,
    storeUserId: string,
    receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>
  ): Promise<void> => {
    try {
      await SupabaseService.receiveTransferRequest(requestId, storeUserId, receivedItems);
      await refreshData();
      showToast('success', 'Serah Terima Selesai', `Stok toko berhasil diperbarui.`);
    } catch (err: any) {
      showToast('error', 'Gagal Mengonfirmasi Penerimaan', err.message);
      throw err;
    }
  };

  const markNotificationRead = (id: string) => {
    StorageRepository.markNotificationAsRead(id);
    refreshData();
  };

  const loadSampleDataPreset = async (): Promise<void> => {
    const res = await SupabaseService.seedSampleData();
    await refreshData();
    if (res.success) {
      showToast('info', 'Preset Sampel Dimuat', res.message);
    } else {
      showToast('warning', 'Info Sampel', res.message);
    }
  };

  const resetToClean = () => {
    StorageRepository.resetToInitial();
    refreshData();
    showToast('info', 'Data Direset', 'Semua data lokal telah direset ke kondisi awal.');
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        inventories,
        requests,
        mutations,
        notifications,
        toasts,
        isLoading,
        refreshData,
        showToast,
        removeToast,
        addNewItem,
        inboundStock,
        createRequest,
        authorizeRequest,
        dispatchRequest,
        receiveTransfer,
        markNotificationRead,
        loadSampleDataPreset,
        resetToClean,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};
