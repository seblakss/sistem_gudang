import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { StorageRepository } from '../db/storageRepository';
import { User, Location } from '../types';

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
          p_admin_id: adminId,
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
          p_admin_id: adminId,
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
}
