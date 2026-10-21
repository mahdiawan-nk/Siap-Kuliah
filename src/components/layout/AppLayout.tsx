import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { RoleCode } from '../../types/client.js';
import {
  QrCode,
  Calendar,
  BookOpen,
  BarChart3,
  Database,
  ShieldCheck,
  LogOut,
  UserCheck,
  GraduationCap,
  ClipboardList,
  AlertCircle,
  Menu,
  X,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activePage, onNavigate }) => {
  const { user, activeRole, logout, setActiveRole, storageStats } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleNameMap: Record<RoleCode, string> = {
    ADMINISTRATOR: 'Administrator',
    KAPRODI: 'Ketua Prodi',
    DOSEN: 'Dosen Pengampu',
    MAHASISWA: 'Mahasiswa',
  };

  // Define navigation items based on active role
  const getNavItems = () => {
    switch (activeRole) {
      case 'MAHASISWA':
        return [
          { id: 'student-dashboard', label: 'Presensi & Jadwal Saya', icon: QrCode },
          { id: 'student-history', label: 'Riwayat Kehadiran', icon: Calendar },
        ];
      case 'DOSEN':
        return [
          { id: 'lecturer-dashboard', label: 'Dashboard Perkuliahan', icon: Calendar },
          { id: 'lecturer-reports', label: 'Rekap Presensi Mahasiswa', icon: BarChart3 },
          { id: 'evaluations', label: 'Evaluasi & Tindak Lanjut', icon: ClipboardList },
        ];
      case 'KAPRODI':
        return [
          { id: 'kaprodi-dashboard', label: 'Monitoring Program Studi', icon: BarChart3 },
          { id: 'evaluations', label: 'Evaluasi Perkuliahan', icon: ClipboardList },
          { id: 'lecturer-reports', label: 'Laporan Rekap Prodi', icon: FileCheck2 },
        ];
      case 'ADMINISTRATOR':
      default:
        return [
          { id: 'admin-master', label: 'Data Master Akademik', icon: BookOpen },
          { id: 'storage-sync', label: 'Penyimpanan & Sinkronisasi', icon: Database },
          { id: 'lecturer-reports', label: 'Laporan Kehadiran Kampus', icon: BarChart3 },
          { id: 'evaluations', label: 'Monitoring Evaluasi', icon: ClipboardList },
          { id: 'audit-logs', label: 'Audit Trail Aktivitas', icon: ShieldCheck },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Contract: Zone 1 (Brand), Zone 2 (Context), Zone 3 (Profile/Action) */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark with quiet kicker */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              SIAP-KULIAH
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
              Semester Genap 2025/2026
            </span>
          </div>
        </div>

        {/* Zone 2: Storage Mode & System Health Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
          {storageStats?.mode === 'postgres' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>POSTGRESQL MODE · Terhubung</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
              <Database className="w-3.5 h-3.5 text-amber-700" />
              <span>JSON FALLBACK MODE · Siap Sync</span>
            </div>
          )}
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 transition-colors"
          >
            <span>OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Zone 3: Active role, User Profile & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {user?.roles && user.roles.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
              {user.roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                    activeRole === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {roleNameMap[r]}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 pl-2 sm:border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.fullName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {user?.username} · {activeRole ? roleNameMap[activeRole] : ''}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Keluar dari Sistem"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (260px) */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-3">
                Navigasi Utama
              </span>
              <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick role switcher for mobile / small desktop */}
            {user?.roles && user.roles.length > 1 && (
              <div className="pt-4 border-t border-slate-100 sm:hidden">
                <span className="text-[11px] font-semibold text-slate-400 uppercase px-3">Ganti Peran</span>
                <div className="mt-2 space-y-1">
                  {user.roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => setActiveRole(r)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg ${
                        activeRole === r ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {roleNameMap[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom institution info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 text-[11px]">
            <div className="font-semibold text-slate-800">Universitas Teknologi Nusantara</div>
            <div className="text-slate-400 mt-0.5">Sistem Absensi Terpadu</div>
          </div>
        </aside>

        {/* Mobile menu drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <span className="font-bold text-slate-900">Menu SIAP-KULIAH</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-left ${
                          isActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="w-full py-2 px-3 text-red-600 text-sm font-medium flex items-center gap-2 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
