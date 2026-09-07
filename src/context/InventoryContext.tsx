import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Item, Inventory, TransferRequest, InventoryMutation, Notification } from '../types';
import { StorageRepository } from '../db/storageRepository';

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
  refreshData: () => void;
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
  
  // Actions
  addNewItem: (data: Omit<Item, 'id' | 'created_at'>) => Item;
  inboundStock: (itemId: number, qty: number, notes: string, userId: string, supplierName?: string) => void;
  createRequest: (toLocationId: number, requestedByUserId: string, itemsData: Array<{ itemId: number; qtyRequested: number }>, notes?: string) => TransferRequest;
  authorizeRequest: (requestId: number, adminUserId: string, decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT', options?: { approvedItems?: Array<{ itemId: number; qtyApproved: number }>; rejectionNotes?: string }) => void;
  dispatchRequest: (requestId: number, adminUserId: string) => void;
  receiveTransfer: (requestId: number, storeUserId: string, receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>) => void;
  markNotificationRead: (id: string) => void;
  loadSampleDataPreset: () => void;
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

  const refreshData = useCallback(() => {
    setItems(StorageRepository.getItems());
    setInventories(StorageRepository.getInventories());
    setRequests(StorageRepository.getRequests());
    setMutations(StorageRepository.getMutations());
    setNotifications(StorageRepository.getNotifications());
  }, []);

  useEffect(() => {
    refreshData();
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

  const addNewItem = (data: Omit<Item, 'id' | 'created_at'>) => {
    try {
      const created = StorageRepository.saveItem(data);
      refreshData();
      showToast('success', 'Master Barang Ditambahkan', `SKU ${created.sku} (${created.name}) berhasil disimpan.`);
      return created;
    } catch (err: any) {
      showToast('error', 'Gagal Menambah Barang', err.message);
      throw err;
    }
  };

  const inboundStock = (itemId: number, qty: number, notes: string, userId: string, supplierName?: string) => {
    try {
      StorageRepository.addStockInbound(itemId, qty, notes, userId, supplierName);
      refreshData();
      showToast('success', 'Stock Inbound Berhasil', `Berhasil menambah ${qty} unit ke Gudang Pusat.`);
    } catch (err: any) {
      showToast('error', 'Gagal Inbound Stok', err.message);
      throw err;
    }
  };

  const createRequest = (toLocationId: number, requestedByUserId: string, itemsData: Array<{ itemId: number; qtyRequested: number }>, notes?: string) => {
    try {
      const newReq = StorageRepository.createTransferRequest(toLocationId, requestedByUserId, itemsData, notes);
      refreshData();
      showToast('success', 'Transfer Request Terkirim', `Dokumen ${newReq.request_number} berhasil diajukan.`);
      return newReq;
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Request', err.message);
      throw err;
    }
  };

  const authorizeRequest = (
    requestId: number,
    adminUserId: string,
    decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT',
    options?: { approvedItems?: Array<{ itemId: number; qtyApproved: number }>; rejectionNotes?: string }
  ) => {
    try {
      const res = StorageRepository.authorizeRequest(requestId, adminUserId, decision, options);
      refreshData();
      if (decision === 'REJECT') {
        showToast('warning', 'Request Ditolak', `Permintaan ${res.request_number} telah ditolak.`);
      } else {
        showToast('success', 'Otorisasi Berhasil', `Stok berhasil direservasi untuk dokumen ${res.request_number}.`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal Otorisasi Request', err.message);
      throw err;
    }
  };

  const dispatchRequest = (requestId: number, adminUserId: string) => {
    try {
      const res = StorageRepository.dispatchRequest(requestId, adminUserId);
      refreshData();
      showToast('success', 'Barang Telah Di-Dispatch', `Surat Jalan ${res.do_number} diterbitkan.`);
    } catch (err: any) {
      showToast('error', 'Gagal Dispatch Barang', err.message);
      throw err;
    }
  };

  const receiveTransfer = (
    requestId: number,
    storeUserId: string,
    receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>
  ) => {
    try {
      const res = StorageRepository.receiveTransfer(requestId, storeUserId, receivedItems);
      refreshData();
      if (res.status === 'DISCREPANCY') {
        showToast('warning', 'Penerimaan dengan Selisih (Discrepancy)', `Dokumen ${res.request_number} selesai. Selisih telah dialokasikan ke loss ledger.`);
      } else {
        showToast('success', 'Serah Terima Selesai (100% Cocok)', `Stok toko berhasil bertambah dari dokumen ${res.request_number}.`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal Mengonfirmasi Penerimaan', err.message);
      throw err;
    }
  };

  const markNotificationRead = (id: string) => {
    StorageRepository.markNotificationAsRead(id);
    refreshData();
  };

  const loadSampleDataPreset = () => {
    StorageRepository.loadSampleData();
    refreshData();
    showToast('info', 'Preset Sampel Dimuat', 'Data katalog dan saldo stok sampel siap digunakan.');
  };

  const resetToClean = () => {
    StorageRepository.resetToInitial();
    refreshData();
    showToast('info', 'Data Direset', 'Semua data telah direset ke kondisi awal.');
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
