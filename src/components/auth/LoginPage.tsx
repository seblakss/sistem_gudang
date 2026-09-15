import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Package2, ShieldCheck, Lock, User as UserIcon, 
  Key, AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(username.trim(), password.trim());
      if (!res.success) {
        setError(res.message || 'Username atau kata sandi salah / akun dinonaktifkan.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Brand Logo */}
      <div className="relative pt-6 sm:pt-10 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 border border-brand-400/30 items-center justify-center text-white shadow-lg mb-3">
          <Package2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Nexus<span className="text-brand-400">WMS</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Sistem Manajemen Pergudangan & Distribusi Stok Multi-Toko
        </p>
      </div>

      {/* Main Login Box */}
      <div className="relative w-full max-w-md mx-auto my-auto space-y-4 py-4">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Masuk ke Portal Operasional
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan akun terdaftar untuk mengakses modul gudang atau toko
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username Pengguna
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin.gudang atau staf.toko1"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all placeholder-slate-500"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all placeholder-slate-500"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 active:scale-[0.98] shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        </div>

        {/* Quick Fill Helper for Demo / Testing */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
            Akses Cepat Pengujian:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin.gudang', 'admin123')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/70 text-left transition-all active:scale-95"
            >
              <span className="text-[10px] font-bold text-brand-400 block">Admin Pusat</span>
              <span className="text-[11px] text-slate-300 font-mono">admin.gudang</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('staf.toko1', 'toko123')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/70 text-left transition-all active:scale-95"
            >
              <span className="text-[10px] font-bold text-emerald-400 block">Staf Toko 1</span>
              <span className="text-[11px] text-slate-300 font-mono">staf.toko1</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative pb-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Multi-Tenant RBAC & PostgreSQL Protected</span>
      </div>

    </div>
  );
};
