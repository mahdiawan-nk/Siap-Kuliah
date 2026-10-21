import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, Database, QrCode } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, storageStats } = useAuth();
  const [identifier, setIdentifier] = useState('dosen.budi');
  const [password, setPassword] = useState('dosen123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali kredensial Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-6 sm:p-10 font-sans text-slate-100">
      {/* Top institution bar */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            SK
          </div>
          <div>
            <div className="font-bold tracking-tight text-white leading-tight">SIAP-KULIAH</div>
            <div className="text-[11px] text-slate-400">Sistem Presensi Perkuliahan Mahasiswa</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Mode: {storageStats?.mode ? storageStats.mode.toUpperCase() : 'AUTO'}
          </span>
          <span>·</span>
          <span>PostgreSQL & JSON Fallback</span>
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Masuk ke Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gunakan NIM (Mahasiswa), NIDN/NIP (Dosen), atau nama pengguna terdaftar.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                NIM / NIDN / NIP / Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: 220101001 atau dosen.budi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 mt-2"
            >
              {isLoading ? (
                <span>Memverifikasi Kredensial...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-400 block mb-2.5">
              Akun Demonstrasi Cepat (Pilih untuk Mengisi Otomatis):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('dosen.budi', 'dosen123')}
                className="p-2 text-left rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-slate-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Dosen Pengampu</div>
                <div className="text-[10px] text-slate-500 font-mono">dosen.budi / dosen123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('220101001', 'mhs123')}
                className="p-2 text-left rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-slate-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Mahasiswa</div>
                <div className="text-[10px] text-slate-500 font-mono">220101001 / mhs123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('kaprodi.ti', 'kaprodi123')}
                className="p-2 text-left rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-slate-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Ketua Prodi (Kaprodi)</div>
                <div className="text-[10px] text-slate-500 font-mono">kaprodi.ti / kaprodi123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-2 text-left rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-slate-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Administrator</div>
                <div className="text-[10px] text-slate-500 font-mono">admin / admin123</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 SIAP-KULIAH · Universitas Teknologi Nusantara</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Argon2/Bcrypt & RBAC Terlindungi
          </span>
          <span>·</span>
          <span>Deployable di Proxmox VE / Ubuntu Server 24.04</span>
        </div>
      </div>
    </div>
  );
};
