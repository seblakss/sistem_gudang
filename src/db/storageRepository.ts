import { 
  Location, User, Item, Inventory, TransferRequest, TransferRequestItem, 
  InventoryMutation, Notification 
} from '../types';
import { 
  INITIAL_LOCATIONS, INITIAL_USERS, INITIAL_ITEMS, 
  INITIAL_INVENTORIES, INITIAL_REQUESTS, INITIAL_MUTATIONS, 
  SAMPLE_DATA_PRESET 
} from './initialData';

const STORAGE_KEYS = {
  LOCATIONS: 'wms_locations',
  USERS: 'wms_users',
  ITEMS: 'wms_items',
  INVENTORIES: 'wms_inventories',
  REQUESTS: 'wms_requests',
  MUTATIONS: 'wms_mutations',
  NOTIFICATIONS: 'wms_notifications',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

export class StorageRepository {
  // --- LOCATIONS & USERS ---
  static getLocations(): Location[] {
    return getStorage<Location[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
  }

  static getUsers(): User[] {
    return getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  static authenticateUser(username: string, password?: string): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && (u.is_active !== false));
    if (!user) return null;
    if (password && user.password_hash && user.password_hash !== password) {
      return null;
    }
    return user;
  }

  static saveUser(userData: Omit<User, 'id' | 'created_at'>): User {
    const users = this.getUsers();
    const exists = users.some(u => u.username.toLowerCase() === userData.username.trim().toLowerCase());
    if (exists) {
      throw new Error(`Username "${userData.username}" sudah digunakan!`);
    }

    const newUser: User = {
      ...userData,
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      username: userData.username.trim().toLowerCase(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  static updateUser(userId: string, data: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) {
      throw new Error('Pengguna tidak ditemukan');
    }

    users[idx] = {
      ...users[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };

    setStorage(STORAGE_KEYS.USERS, users);
    return users[idx];
  }

  // --- ITEMS ---
  static getItems(): Item[] {
    return getStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
  }

  static saveItem(itemData: Omit<Item, 'id' | 'created_at'>): Item {
    const items = this.getItems();
    const existingIndex = items.findIndex(i => i.sku.toLowerCase() === itemData.sku.toLowerCase());
    
    if (existingIndex >= 0) {
      throw new Error(`SKU "${itemData.sku}" sudah terdaftar! Gunakan SKU yang berbeda.`);
    }

    const nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem: Item = {
      ...itemData,
      id: nextId,
      created_at: new Date().toISOString(),
    };

    items.push(newItem);
    setStorage(STORAGE_KEYS.ITEMS, items);

    // Otomatis inisialisasi saldo inventori 0 untuk semua lokasi (Gudang + 3 Toko)
    const locations = this.getLocations();
    const inventories = this.getInventories();
    
    locations.forEach(loc => {
      const exists = inventories.some(inv => inv.location_id === loc.id && inv.item_id === newItem.id);
      if (!exists) {
        const nextInvId = inventories.length > 0 ? Math.max(...inventories.map(inv => inv.id)) + 1 : 1;
        inventories.push({
          id: nextInvId,
          location_id: loc.id,
          item_id: newItem.id,
          stock_available: 0,
          stock_reserved: 0,
          stock_in_transit: 0,
          updated_at: new Date().toISOString(),
        });
      }
    });

    setStorage(STORAGE_KEYS.INVENTORIES, inventories);
    return newItem;
  }

  // --- INVENTORIES ---
  static getInventories(): Inventory[] {
    return getStorage<Inventory[]>(STORAGE_KEYS.INVENTORIES, INITIAL_INVENTORIES);
  }

  static getInventory(locationId: number, itemId: number): Inventory | undefined {
    const inventories = this.getInventories();
    return inventories.find(inv => inv.location_id === locationId && inv.item_id === itemId);
  }

  // Stock Inbound (Barang Masuk ke Gudang Pusat dari Vendor/Supplier)
  static addStockInbound(
    itemId: number, 
    qty: number, 
    notes: string, 
    userId: string,
    supplierName?: string
  ): { inventory: Inventory; mutation: InventoryMutation } {
    if (qty <= 0) throw new Error('Kuantiti barang masuk harus lebih besar dari 0');

    const inventories = this.getInventories();
    const warehouseId = 0; // Gudang Pusat
    
    let inv = inventories.find(i => i.location_id === warehouseId && i.item_id === itemId);
    if (!inv) {
      const nextId = inventories.length > 0 ? Math.max(...inventories.map(i => i.id)) + 1 : 1;
      inv = {
        id: nextId,
        location_id: warehouseId,
        item_id: itemId,
        stock_available: 0,
        stock_reserved: 0,
        stock_in_transit: 0,
        updated_at: new Date().toISOString(),
      };
      inventories.push(inv);
    }

    inv.stock_available += qty;
    inv.updated_at = new Date().toISOString();
    setStorage(STORAGE_KEYS.INVENTORIES, inventories);

    // Record Mutation Ledger (PURCHASE_INBOUND)
    const mutations = this.getMutations();
    const nextMutId = mutations.length > 0 ? Math.max(...mutations.map(m => m.id)) + 1 : 1;
    const mutation: InventoryMutation = {
      id: nextMutId,
      item_id: itemId,
      from_location_id: null,
      to_location_id: warehouseId,
      qty: qty,
      transaction_type: 'PURCHASE_INBOUND',
      notes: supplierName ? `Inbound dari ${supplierName}: ${notes}` : `Stock Inbound: ${notes}`,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    mutations.push(mutation);
    setStorage(STORAGE_KEYS.MUTATIONS, mutations);

    return { inventory: inv, mutation };
  }

  // --- TRANSFER REQUESTS (LIFECYCLE) ---
  static getRequests(): TransferRequest[] {
    return getStorage<TransferRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
  }

  static createTransferRequest(
    toLocationId: number,
    requestedByUserId: string,
    itemsData: Array<{ itemId: number; qtyRequested: number }>,
    requestNotes?: string
  ): TransferRequest {
    if (itemsData.length === 0) throw new Error('Pilih minimal 1 barang untuk diajukan');

    const requests = this.getRequests();
    const nextId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1;
    
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reqCountToday = requests.filter(r => r.created_at.startsWith(new Date().toISOString().slice(0, 10))).length + 1;
    const requestNumber = `TR-${todayStr}-${String(reqCountToday).padStart(3, '0')}`;

    const items: TransferRequestItem[] = itemsData.map((d, index) => ({
      id: nextId * 100 + (index + 1),
      transfer_request_id: nextId,
      item_id: d.itemId,
      qty_requested: d.qtyRequested,
      qty_approved: 0,
      qty_dispatched: 0,
      qty_received: 0,
    }));

    const newRequest: TransferRequest = {
      id: nextId,
      request_number: requestNumber,
      from_location_id: 0, // Central Hub
      to_location_id: toLocationId,
      requested_by: requestedByUserId,
      status: 'PENDING',
      request_notes: requestNotes,
      created_at: new Date().toISOString(),
      items: items,
    };

    requests.unshift(newRequest);
    setStorage(STORAGE_KEYS.REQUESTS, requests);

    // Create Notification for Admin Gudang
    this.addNotification({
      title: 'Permintaan Barang Baru',
      message: `Toko Cabang mengajukan request ${requestNumber} berisi ${itemsData.length} item.`,
      type: 'info',
      targetRole: 'ADMIN_GUDANG',
    });

    return newRequest;
  }

  // Otorisasi: Approve Penuh / Approve Parsial / Reject
  static authorizeRequest(
    requestId: number,
    adminUserId: string,
    decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT',
    options?: {
      approvedItems?: Array<{ itemId: number; qtyApproved: number }>;
      rejectionNotes?: string;
    }
  ): TransferRequest {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Transfer Request tidak ditemukan');
    if (req.status !== 'PENDING') throw new Error(`Request berstatus ${req.status} tidak dapat diotorisasi ulang`);

    const inventories = this.getInventories();
    const warehouseId = 0;

    if (decision === 'REJECT') {
      req.status = 'REJECTED';
      req.approved_by = adminUserId;
      req.rejection_notes = options?.rejectionNotes || 'Ditolak oleh admin gudang';
      setStorage(STORAGE_KEYS.REQUESTS, requests);

      this.addNotification({
        title: 'Request Ditolak',
        message: `Request ${req.request_number} ditolak: ${req.rejection_notes}`,
        type: 'warning',
        targetLocationId: req.to_location_id,
      });

      return req;
    }

    // Atomic Stock Check & Reservation
    let isPartial = false;

    for (const reqItem of req.items) {
      const inv = inventories.find(i => i.location_id === warehouseId && i.item_id === reqItem.item_id);
      const available = inv ? inv.stock_available : 0;

      let approvedQty = reqItem.qty_requested;

      if (decision === 'APPROVE_PARTIAL' && options?.approvedItems) {
        const customItem = options.approvedItems.find(ai => ai.itemId === reqItem.item_id);
        if (customItem !== undefined) {
          approvedQty = customItem.qtyApproved;
        }
      }

      if (approvedQty > available) {
        throw new Error(`Stok gudang tidak mencukupi untuk item ID ${reqItem.item_id}. Tersedia: ${available}, Diminta: ${approvedQty}`);
      }

      if (approvedQty < reqItem.qty_requested) {
        isPartial = true;
      }

      reqItem.qty_approved = approvedQty;

      // Atomic Reservation: Kurangi stock_available, tambah stock_reserved
      if (inv && approvedQty > 0) {
        inv.stock_available -= approvedQty;
        inv.stock_reserved += approvedQty;
        inv.updated_at = new Date().toISOString();
      }
    }

    req.status = isPartial || decision === 'APPROVE_PARTIAL' ? 'PARTIAL' : 'APPROVED';
    req.approved_by = adminUserId;
    if (options?.rejectionNotes) {
      req.rejection_notes = options.rejectionNotes;
    }

    setStorage(STORAGE_KEYS.INVENTORIES, inventories);
    setStorage(STORAGE_KEYS.REQUESTS, requests);

    this.addNotification({
      title: req.status === 'PARTIAL' ? 'Request Disetujui Parsial' : 'Request Disetujui',
      message: `Request ${req.request_number} telah disetujui dan stok telah direservasi untuk pengiriman.`,
      type: 'success',
      targetLocationId: req.to_location_id,
    });

    return req;
  }

  // Dispatch (Pengiriman & Cetak Surat Jalan DO)
  static dispatchRequest(requestId: number, adminUserId: string): TransferRequest {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Transfer Request tidak ditemukan');
    if (req.status !== 'APPROVED' && req.status !== 'PARTIAL') {
      throw new Error(`Request berstatus ${req.status} belum siap di-dispatch`);
    }

    const inventories = this.getInventories();
    const warehouseId = 0;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const doCountToday = requests.filter(r => r.do_number?.includes(todayStr)).length + 1;
    const doNumber = `DO-${todayStr}-${String(doCountToday).padStart(4, '0')}`;

    const mutations = this.getMutations();

    // Dispatch items: Move stock_reserved to stock_in_transit
    for (const reqItem of req.items) {
      reqItem.qty_dispatched = reqItem.qty_approved;

      if (reqItem.qty_dispatched > 0) {
        const invWarehouse = inventories.find(i => i.location_id === warehouseId && i.item_id === reqItem.item_id);
        if (invWarehouse) {
          invWarehouse.stock_reserved -= reqItem.qty_dispatched;
          invWarehouse.stock_in_transit += reqItem.qty_dispatched;
          invWarehouse.updated_at = new Date().toISOString();
        }

        // Record TRANSFER_DISPATCH in Ledger
        const nextMutId = mutations.length > 0 ? Math.max(...mutations.map(m => m.id)) + 1 : 1;
        mutations.push({
          id: nextMutId,
          item_id: reqItem.item_id,
          from_location_id: warehouseId,
          to_location_id: req.to_location_id,
          qty: reqItem.qty_dispatched,
          transaction_type: 'TRANSFER_DISPATCH',
          reference_id: req.id,
          reference_code: doNumber,
          notes: `Pengiriman ke Toko #${req.to_location_id} (Ref: ${req.request_number})`,
          created_by: adminUserId,
          created_at: new Date().toISOString(),
        });
      }
    }

    req.status = 'IN_TRANSIT';
    req.do_number = doNumber;
    req.dispatched_at = new Date().toISOString();

    setStorage(STORAGE_KEYS.INVENTORIES, inventories);
    setStorage(STORAGE_KEYS.MUTATIONS, mutations);
    setStorage(STORAGE_KEYS.REQUESTS, requests);

    this.addNotification({
      title: 'Barang Telah Dikirim (In-Transit)',
      message: `Surat Jalan ${doNumber} telah diterbitkan untuk ${req.request_number}. Silakan verifikasi fisik saat tiba.`,
      type: 'info',
      targetLocationId: req.to_location_id,
    });

    return req;
  }

  // Two-Way Handshake (Konfirmasi Penerimaan oleh Staf Toko)
  static receiveTransfer(
    requestId: number,
    storeUserId: string,
    receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>
  ): TransferRequest {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Transfer Request tidak ditemukan');
    if (req.status !== 'IN_TRANSIT') {
      throw new Error(`Request berstatus ${req.status} tidak dalam status pengiriman`);
    }

    const inventories = this.getInventories();
    const mutations = this.getMutations();
    const warehouseId = 0;
    const storeLocationId = req.to_location_id;

    let hasDiscrepancy = false;

    for (const reqItem of req.items) {
      const rec = receivedItems.find(i => i.itemId === reqItem.item_id);
      const qtyActual = rec ? rec.qtyReceived : reqItem.qty_dispatched;
      const reason = rec?.discrepancyReason || '';

      reqItem.qty_received = qtyActual;
      reqItem.discrepancy_reason = reason;

      const dispatchedQty = reqItem.qty_dispatched;
      const discrepancyQty = dispatchedQty - qtyActual;

      // 1. Potong In-Transit di Gudang Pusat
      const invWarehouse = inventories.find(i => i.location_id === warehouseId && i.item_id === reqItem.item_id);
      if (invWarehouse) {
        invWarehouse.stock_in_transit = Math.max(0, invWarehouse.stock_in_transit - dispatchedQty);
        invWarehouse.updated_at = new Date().toISOString();
      }

      // 2. Tambah Stock Available di Toko Cabang (sejumlah fisik aktual yang diterima)
      let invStore = inventories.find(i => i.location_id === storeLocationId && i.item_id === reqItem.item_id);
      if (!invStore) {
        const nextId = inventories.length > 0 ? Math.max(...inventories.map(i => i.id)) + 1 : 1;
        invStore = {
          id: nextId,
          location_id: storeLocationId,
          item_id: reqItem.item_id,
          stock_available: 0,
          stock_reserved: 0,
          stock_in_transit: 0,
          updated_at: new Date().toISOString(),
        };
        inventories.push(invStore);
      }

      invStore.stock_available += qtyActual;
      invStore.updated_at = new Date().toISOString();

      // 3. Record Ledger Mutasi (TRANSFER_RECEIVE)
      if (qtyActual > 0) {
        const nextMutId = mutations.length > 0 ? Math.max(...mutations.map(m => m.id)) + 1 : 1;
        mutations.push({
          id: nextMutId,
          item_id: reqItem.item_id,
          from_location_id: warehouseId,
          to_location_id: storeLocationId,
          qty: qtyActual,
          transaction_type: 'TRANSFER_RECEIVE',
          reference_id: req.id,
          reference_code: req.do_number,
          notes: `Diterima di Toko #${storeLocationId} (DO: ${req.do_number})`,
          created_by: storeUserId,
          created_at: new Date().toISOString(),
        });
      }

      // 4. If Discrepancy (DAMAGE_LOSS)
      if (discrepancyQty > 0) {
        hasDiscrepancy = true;
        const nextMutId = mutations.length > 0 ? Math.max(...mutations.map(m => m.id)) + 1 : 1;
        mutations.push({
          id: nextMutId,
          item_id: reqItem.item_id,
          from_location_id: warehouseId,
          to_location_id: null, // Kerugian / Rusak
          qty: discrepancyQty,
          transaction_type: 'DAMAGE_LOSS',
          reference_id: req.id,
          reference_code: req.do_number,
          notes: `Selisih/Kerusakan fisik saat pengiriman: ${reason || 'Tidak ada catatan'}`,
          created_by: storeUserId,
          created_at: new Date().toISOString(),
        });
      }
    }

    req.status = hasDiscrepancy ? 'DISCREPANCY' : 'COMPLETED';
    req.received_at = new Date().toISOString();

    setStorage(STORAGE_KEYS.INVENTORIES, inventories);
    setStorage(STORAGE_KEYS.MUTATIONS, mutations);
    setStorage(STORAGE_KEYS.REQUESTS, requests);

    // Notify Admin Gudang
    this.addNotification({
      title: hasDiscrepancy ? 'Serah Terima Selesai dengan Selisih (Discrepancy)' : 'Serah Terima Sukses (100% Cocok)',
      message: `Dokumen ${req.do_number} (${req.request_number}) telah dikonfirmasi oleh staf toko. Status: ${req.status}`,
      type: hasDiscrepancy ? 'warning' : 'success',
      targetRole: 'ADMIN_GUDANG',
    });

    return req;
  }

  // --- MUTATIONS LEDGER ---
  static getMutations(): InventoryMutation[] {
    return getStorage<InventoryMutation[]>(STORAGE_KEYS.MUTATIONS, INITIAL_MUTATIONS);
  }

  // --- NOTIFICATIONS ---
  static getNotifications(): Notification[] {
    return getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  static addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const list = this.getNotifications();
    const newNotif: Notification = {
      ...notif,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      read: false,
    };
    list.unshift(newNotif);
    // Keep last 50
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list.slice(0, 50));
  }

  static markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  // --- RESET & SAMPLE DATA PRESET ---
  static resetToInitial(): void {
    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORIES);
    localStorage.removeItem(STORAGE_KEYS.REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.MUTATIONS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  }

  static loadSampleData(): void {
    setStorage(STORAGE_KEYS.ITEMS, SAMPLE_DATA_PRESET.items);
    setStorage(STORAGE_KEYS.INVENTORIES, SAMPLE_DATA_PRESET.inventories);
  }
}
