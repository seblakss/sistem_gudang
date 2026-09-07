import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { 
  Users, UserPlus, KeyRound, 
  Store, Warehouse, CheckCircle2, XCircle, 
  Search, Lock, Edit2
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { users, locations, currentUser, createUser, updateUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State New User
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'ORANG_TOKO' as UserRole,
    location_id: 1,
  });

  // Form State Edit User
  const [editUserData, setEditUserData] = useState({
    full_name: '',
    role: 'ORANG_TOKO' as UserRole,
    location_id: 1,
    is_active: true,
  });

  // Form State Reset Password
  const [newPassword, setNewPassword] = useState('');

  const locMap = new Map(locations.map(l => [l.id, l]));

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return u.username.toLowerCase().includes(search) || 
           u.full_name.toLowerCase().includes(search);
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newUserData.username || !newUserData.password || !newUserData.full_name) {
      alert('Semua field wajib diisi');
      return;
    }

    try {
      await createUser({
        username: newUserData.username.trim().toLowerCase(),
        password_hash: newUserData.password,
        full_name: newUserData.full_name.trim(),
        role: newUserData.role,
        location_id: Number(newUserData.location_id),
      });

      setIsAddModalOpen(false);
      setNewUserData({
        username: '',
        password: '',
        full_name: '',
        role: 'ORANG_TOKO',
        location_id: 1,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setEditUserData({
      full_name: u.full_name,
      role: u.role,
      location_id: u.location_id,
      is_active: u.is_active !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await updateUser(selectedUser.id, {
        full_name: editUserData.full_name.trim(),
        role: editUserData.role,
        location_id: Number(editUserData.location_id),
        is_active: editUserData.is_active,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openPasswordModal = (u: User) => {
    setSelectedUser(u);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      await updateUser(selectedUser.id, {
        password_hash: newPassword,
      });
      alert(`Kata sandi untuk @${selectedUser.username} berhasil diubah.`);
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleUserStatus = async (u: User) => {
    const nextStatus = u.is_active === false ? true : false;
    const confirmMsg = nextStatus 
      ? `Aktifkan kembali akun @${u.username}?`
      : `Nonaktifkan akun @${u.username}? Akun tidak dapat login sampai diaktifkan kembali.`;

    if (confirm(confirmMsg)) {
      await updateUser(u.id, { is_active: nextStatus });
    }
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <span>Manajemen Pengguna & Akun</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Kelola akun staf toko, penugasan cabang, dan reset kata sandi
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Akun Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Cari username atau nama staf..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* User Cards List */}
      <div className="space-y-3">
        {filteredUsers.map(u => {
          const loc = locMap.get(u.location_id);
          const isWarehouse = u.role === 'ADMIN_GUDANG';
          const isActive = u.is_active !== false;

          return (
            <div
              key={u.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-100/60 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl text-white font-bold text-xs ${
                    isWarehouse ? 'bg-brand-600 shadow-glow' : 'bg-emerald-600 shadow-glow-emerald'
                  }`}>
                    {isWarehouse ? <Warehouse className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {u.full_name}
                      </span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      @{u.username} • {isWarehouse ? 'Admin Gudang Pusat' : 'Staf Toko Cabang'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Assignment Banner */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Penugasan Cabang:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {loc?.name}
                </span>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => openPasswordModal(u)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>

                <button
                  onClick={() => openEditModal(u)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah</span>
                </button>

                <button
                  onClick={() => toggleUserStatus(u)}
                  className={`p-1.5 rounded-xl text-xs font-bold border active:scale-95 ${
                    isActive
                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                      : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                  }`}
                  title={isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                >
                  {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add User */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Daftarkan Pengguna Baru"
        subtitle="Buat kredensial akun untuk staf cabang atau admin gudang"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Username Akun (Login)
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: staf.toko4"
              value={newUserData.username}
              onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              required
              placeholder="Minimal 6 karakter..."
              value={newUserData.password}
              onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rian Pratama (Staf Toko 1)"
              value={newUserData.full_name}
              onChange={e => setNewUserData({ ...newUserData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Peran (Role)
              </label>
              <select
                value={newUserData.role}
                onChange={e => {
                  const role = e.target.value as UserRole;
                  setNewUserData({
                    ...newUserData,
                    role,
                    location_id: role === 'ADMIN_GUDANG' ? 0 : 1,
                  });
                }}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ORANG_TOKO">Staf Toko Cabang</option>
                <option value="ADMIN_GUDANG">Admin Gudang Pusat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Penugasan Cabang
              </label>
              <select
                value={newUserData.location_id}
                onChange={e => setNewUserData({ ...newUserData, location_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md active:scale-95 transition-all"
            >
              Daftarkan Akun
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit User */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Ubah Akun @${selectedUser?.username}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditUser} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={editUserData.full_name}
              onChange={e => setEditUserData({ ...editUserData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Peran (Role)
              </label>
              <select
                value={editUserData.role}
                onChange={e => setEditUserData({ ...editUserData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ORANG_TOKO">Staf Toko Cabang</option>
                <option value="ADMIN_GUDANG">Admin Gudang Pusat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Penugasan Cabang
              </label>
              <select
                value={editUserData.location_id}
                onChange={e => setEditUserData({ ...editUserData, location_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reset Password */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Reset Kata Sandi @${selectedUser?.username}`}
        subtitle="Atur ulang password untuk akun pengguna ini"
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi baru..."
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md active:scale-95"
            >
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
