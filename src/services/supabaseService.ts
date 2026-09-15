import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { StorageRepository } from '../db/storageRepository';
import { User, Location, Item, Inventory, TransferRequest, InventoryMutation } from '../types';
import { SAMPLE_DATA_PRESET } from '../db/initialData';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN_UUID = 'a0000000-0000-0000-0000-000000000001';
const DEFAULT_STORE_UUID = 'a0000000-0000-0000-0000-000000000002';

function resolveUuid(userId?: string, fallback = DEFAULT_ADMIN_UUID): string {
  if (userId && UUID_REGEX.test(userId)) return userId;
  return fallback;
}

export class SupabaseService {
  // --- AUTHENTICATION ---
  static async authenticateUser(username: string, password?: string): Promise<{ success: boolean; user?: User; location?: Location; message?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('rpc_authenticate_user', {
          p_username: username,
          p_password_hash: password || '',
        });

        if (error) throw error;
        if (!data.success) {
          return { success: false, message: data.message || 'Login gagal' };
        }

        return {
          success: true,
          user: data.user,
          location: data.location,
        };
      } catch (err: any) {
        console.warn('Supabase auth fallback to local repository:', err.message);
      }
    }

    // Local repository fallback
    const user = StorageRepository.authenticateUser(username, password);
    if (!user) {
      return { success: false, message: 'Username atau kata sandi tidak cocok.' };
    }

    const locations = StorageRepository.getLocations();
    const location = locations.find(l => l.id === user.location_id);

    return {
      success: true,
      user,
      location,
    };
  }

  // --- USER MANAGEMENT (ADMIN GUDANG) ---
  static async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) return data as User[];
      } catch (err) {
        console.warn('Supabase getUsers fallback to local:', err);
      }
    }
    return StorageRepository.getUsers();
  }

  static async createUser(
    adminId: string,
    userData: { username: string; password_hash: string; full_name: string; role: 'ADMIN_GUDANG' | 'ORANG_TOKO'; location_id: number }
  ): Promise<User> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('rpc_create_user', {
          p_admin_id: resolveUuid(adminId),
          p_username: userData.username,
          p_password_hash: userData.password_hash,
          p_full_name: userData.full_name,
          p_role: userData.role,
          p_location_id: userData.location_id,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message);
      } catch (err: any) {
        console.warn('Supabase createUser fallback to local:', err.message);
      }
    }

    return StorageRepository.saveUser(userData);
  }

  static async updateUser(
    adminId: string,
    targetUserId: string,
    updateData: { full_name?: string; role?: 'ADMIN_GUDANG' | 'ORANG_TOKO'; location_id?: number; is_active?: boolean; password_hash?: string }
  ): Promise<User> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('rpc_manage_user', {
          p_admin_id: resolveUuid(adminId),
          p_target_user_id: targetUserId,
          p_full_name: updateData.full_name || null,
          p_role: updateData.role || null,
          p_location_id: updateData.location_id ?? null,
          p_is_active: updateData.is_active ?? null,
          p_new_password_hash: updateData.password_hash || null,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message);
      } catch (err: any) {
        console.warn('Supabase manageUser fallback to local:', err.message);
      }
    }

    return StorageRepository.updateUser(targetUserId, updateData);
  }

  // --- MASTER ITEMS & SKU ---
  static async getItems(): Promise<Item[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          // Sync local storage as cache/fallback
          return data as Item[];
        }
      } catch (err) {
        console.warn('Supabase getItems fallback to local:', err);
      }
    }
    return StorageRepository.getItems();
  }

  static async createItem(itemData: Omit<Item, 'id' | 'created_at'>): Promise<Item> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert({
            sku: itemData.sku.trim().toUpperCase(),
            name: itemData.name.trim(),
            category: itemData.category || 'Umum',
            unit: itemData.unit || 'PCS',
            price: Number(itemData.price) || 0,
            safety_stock: Number(itemData.safety_stock) || 0,
          })
          .select()
          .single();

        if (error) throw error;

        // Inisialisasi saldo inventori 0 untuk semua lokasi (Hub & Cabang)
        const { data: locations } = await supabase.from('locations').select('id');
        if (locations && locations.length > 0) {
          const invRows = locations.map(loc => ({
            location_id: loc.id,
            item_id: data.id,
            stock_available: 0,
            stock_reserved: 0,
            stock_in_transit: 0,
          }));
          await supabase.from('inventories').upsert(invRows, { onConflict: 'location_id,item_id' });
        }

        const createdItem = data as Item;
        try {
          // Keep local storage synchronized
          StorageRepository.saveItem(itemData);
        } catch {
          // SKU may already be in local storage, safe to ignore
        }
        return createdItem;
      } catch (err: any) {
        console.warn('Supabase createItem error:', err.message);
        throw err;
      }
    }
    return StorageRepository.saveItem(itemData);
  }

  // --- INVENTORIES (SALDO STOK PER LOKASI) ---
  static async getInventories(): Promise<Inventory[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('inventories')
          .select('*');

        if (!error && data) return data as Inventory[];
      } catch (err) {
        console.warn('Supabase getInventories fallback to local:', err);
      }
    }
    return StorageRepository.getInventories();
  }

  // --- INBOUND STOCK (BARANG MASUK KE GUDANG PUSAT) ---
  static async inboundStock(itemId: number, qty: number, notes: string, userId: string, supplierName?: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = resolveUuid(userId, DEFAULT_ADMIN_UUID);
        const { data, error } = await supabase.rpc('rpc_add_stock_inbound', {
          p_item_id: itemId,
          p_qty: qty,
          p_notes: notes,
          p_user_id: validUserId,
          p_supplier_name: supplierName || null,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message || 'Gagal inbound stok');
        return;
      } catch (err: any) {
        console.warn('Supabase inboundStock error, falling back:', err.message);
      }
    }
    StorageRepository.addStockInbound(itemId, qty, notes, userId, supplierName);
  }

  // --- TRANSFER REQUESTS (PERMINTAAN TRANSFER TOKO) ---
  static async getRequests(): Promise<TransferRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('transfer_requests')
          .select('*, items:transfer_request_items(*, item:items(*))')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((r: any) => ({
            ...r,
            items: r.items || [],
          })) as TransferRequest[];
        }
      } catch (err) {
        console.warn('Supabase getRequests fallback to local:', err);
      }
    }
    return StorageRepository.getRequests();
  }

  static async createTransferRequest(
    toLocationId: number,
    requestedByUserId: string,
    itemsData: Array<{ itemId: number; qtyRequested: number }>,
    notes?: string
  ): Promise<TransferRequest> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = resolveUuid(requestedByUserId, DEFAULT_STORE_UUID);
        const payloadItems = itemsData.map(i => ({
          item_id: i.itemId,
          qty_requested: i.qtyRequested,
        }));

        const { data, error } = await supabase.rpc('rpc_create_transfer_request', {
          p_to_location_id: toLocationId,
          p_requested_by: validUserId,
          p_items: payloadItems,
          p_request_notes: notes || null,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message || 'Gagal membuat permintaan');

        // Ambil data transfer request yang baru dibuat
        const reqList = await this.getRequests();
        const created = reqList.find(r => r.id === data.request_id);
        if (created) return created;
      } catch (err: any) {
        console.warn('Supabase createTransferRequest error, falling back:', err.message);
      }
    }
    return StorageRepository.createTransferRequest(toLocationId, requestedByUserId, itemsData, notes);
  }

  static async authorizeTransferRequest(
    requestId: number,
    adminUserId: string,
    decision: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT',
    options?: { approvedItems?: Array<{ itemId: number; qtyApproved: number }>; rejectionNotes?: string }
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = resolveUuid(adminUserId, DEFAULT_ADMIN_UUID);
        const approvedPayload = options?.approvedItems?.map(i => ({
          item_id: i.itemId,
          qty_approved: i.qtyApproved,
        })) || [];

        const { data, error } = await supabase.rpc('rpc_authorize_transfer_request', {
          p_request_id: requestId,
          p_admin_id: validUserId,
          p_decision: decision,
          p_approved_items: approvedPayload,
          p_notes: options?.rejectionNotes || null,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message || 'Gagal otorisasi transfer');
        return;
      } catch (err: any) {
        console.warn('Supabase authorizeTransferRequest error, falling back:', err.message);
      }
    }
    StorageRepository.authorizeRequest(requestId, adminUserId, decision, options);
  }

  static async dispatchTransferRequest(requestId: number, adminUserId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = resolveUuid(adminUserId, DEFAULT_ADMIN_UUID);
        const { data, error } = await supabase.rpc('rpc_dispatch_transfer_request', {
          p_request_id: requestId,
          p_admin_id: validUserId,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message || 'Gagal dispatch pengiriman');
        return;
      } catch (err: any) {
        console.warn('Supabase dispatchTransferRequest error, falling back:', err.message);
      }
    }
    StorageRepository.dispatchRequest(requestId, adminUserId);
  }

  static async receiveTransferRequest(
    requestId: number,
    storeUserId: string,
    receivedItems: Array<{ itemId: number; qtyReceived: number; discrepancyReason?: string }>
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = resolveUuid(storeUserId, DEFAULT_STORE_UUID);
        const receivedPayload = receivedItems.map(i => ({
          item_id: i.itemId,
          qty_received: i.qtyReceived,
          discrepancy_reason: i.discrepancyReason || null,
        }));

        const { data, error } = await supabase.rpc('rpc_receive_transfer_request', {
          p_request_id: requestId,
          p_store_user_id: validUserId,
          p_received_items: receivedPayload,
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.message || 'Gagal konfirmasi serah terima');
        return;
      } catch (err: any) {
        console.warn('Supabase receiveTransferRequest error, falling back:', err.message);
      }
    }
    StorageRepository.receiveTransfer(requestId, storeUserId, receivedItems);
  }

  // --- INVENTORY MUTATIONS (BUKU BESAR MUTASI) ---
  static async getMutations(): Promise<InventoryMutation[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('inventory_mutations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) return data as InventoryMutation[];
      } catch (err) {
        console.warn('Supabase getMutations fallback to local:', err);
      }
    }
    return StorageRepository.getMutations();
  }

  // --- SEED SAMPLE DATA KE SUPABASE ---
  static async seedSampleData(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured || !supabase) {
      StorageRepository.loadSampleData();
      return { success: true, message: 'Sample data dimuat ke local storage' };
    }

    try {
      // 1. Cek apakah items sudah ada
      const { data: existingItems } = await supabase.from('items').select('id');
      if (existingItems && existingItems.length > 0) {
        return { success: true, message: 'Database sudah memiliki data barang.' };
      }

      // 2. Insert items
      const { data: createdItems, error: itmErr } = await supabase
        .from('items')
        .insert(
          SAMPLE_DATA_PRESET.items.map(i => ({
            sku: i.sku,
            name: i.name,
            category: i.category,
            unit: i.unit,
            price: i.price,
            safety_stock: i.safety_stock,
          }))
        )
        .select();

      if (itmErr) throw itmErr;

      // Map SKU ke item_id baru
      const skuToIdMap = new Map((createdItems || []).map((ci: any) => [ci.sku, ci.id]));

      // 3. Insert saldo inventori
      const invPayload = SAMPLE_DATA_PRESET.inventories.map(inv => {
        const sampleItem = SAMPLE_DATA_PRESET.items.find(si => si.id === inv.item_id);
        const actualItemId = sampleItem ? (skuToIdMap.get(sampleItem.sku) || inv.item_id) : inv.item_id;
        return {
          location_id: inv.location_id,
          item_id: actualItemId,
          stock_available: inv.stock_available,
          stock_reserved: inv.stock_reserved,
          stock_in_transit: inv.stock_in_transit,
        };
      });

      const { error: invErr } = await supabase
        .from('inventories')
        .upsert(invPayload, { onConflict: 'location_id,item_id' });

      if (invErr) throw invErr;

      return { success: true, message: `Berhasil memuat ${createdItems?.length || 0} SKU sampel ke Supabase.` };
    } catch (err: any) {
      console.error('Error seeding sample data to Supabase:', err);
      StorageRepository.loadSampleData();
      return { success: false, message: 'Gagal seed ke Supabase: ' + err.message };
    }
  }
}
