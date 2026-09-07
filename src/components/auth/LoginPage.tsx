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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-brand-500 selection:text-white">
      
      {/* Top Brand Logo */}
      <div className="pt-6 sm:pt-14 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center text-white shadow-glow mb-3">
          <Package2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Nexus<span className="text-brand-400">WMS</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Sistem Manajemen Gudang & Distribusi Multi-Toko
        </p>
      </div>

      {/* Main Login Box */}
      <div className="w-full max-w-md mx-auto my-auto space-y-4">
        <div className="bg-slate-900/95 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-white">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gunakan kredensial yang telah didaftarkan oleh Admin Gudang
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/50 border border-rose-900/80 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Username Pengguna
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin.gudang atau staf.toko1"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-3 rounded-2xl border border-slate-700 bg-slate-800 text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all placeholder-slate-500"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-3 rounded-2xl border border-slate-700 bg-slate-800 text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all placeholder-slate-500"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        </div>

        {/* Informational Credential Reference Note */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold text-slate-300 block">Kredensial Bawaan Database Supabase:</span>
          <p className="font-mono text-[10px] text-slate-400">
            • Admin Gudang: <span className="text-brand-400 font-bold">admin.gudang</span> / pass: <span className="text-slate-300">admin123</span>
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            • Staf Cabang: <span className="text-emerald-400 font-bold">staf.toko1</span>, <span className="text-emerald-400 font-bold">staf.toko2</span>, <span className="text-emerald-400 font-bold">staf.toko3</span> / pass: <span className="text-slate-300">toko123</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-4 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Multi-Tenant RBAC & Supabase PostgreSQL Protected</span>
      </div>

    </div>
  );
};
