import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCheck,
  ArrowRight,
  ShieldAlert,
  Server,
  Layers,
  Download
} from 'lucide-react';

export const StorageSyncPage: React.FC = () => {
  const { storageStats, refreshStorageStats } = useAuth();
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [syncStrategy, setSyncStrategy] = useState<'insert_only' | 'upsert' | 'dry_run'>('upsert');
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [customDbUrl, setCustomDbUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);

  const fetchPreview = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/storage/preview');
      setPreview(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTestResult(null);
      const res = await apiFetch('/storage/test-connection', {
        method: 'POST',
        body: JSON.stringify({ databaseUrl: customDbUrl || undefined }),
      });
      setTestResult(res);
      await refreshStorageStats();
      await fetchPreview();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    }
  };

  const handleExecuteSync = async () => {
    const confirmText = syncStrategy === 'dry_run'
      ? 'Mulai simulasi validasi Dry Run sinkronisasi?'
      : `Mulai sinkronisasi data dari JSON Fallback Storage ke PostgreSQL dengan strategi "${syncStrategy.toUpperCase()}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      setIsSyncing(true);
      setSyncResult(null);
      const res = await apiFetch('/storage/sync', {
        method: 'POST',
        body: JSON.stringify({ strategy: syncStrategy }),
      });
      setSyncResult(res);
      await refreshStorageStats();
      await fetchPreview();
    } catch (err: any) {
      alert(`Sinkronisasi gagal: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchMode = async (targetMode: 'json' | 'postgres') => {
    if (!window.confirm(`Yakin ingin beralih mode aktif ke ${targetMode.toUpperCase()}?`)) return;

    try {
      setSwitchMessage(null);
      const res = await apiFetch('/storage/switch-mode', {
        method: 'POST',
        body: JSON.stringify({ mode: targetMode }),
      });
      setSwitchMessage(res.message);
      await refreshStorageStats();
    } catch (err: any) {
      setSwitchMessage(`Gagal beralih: ${err.message}`);
    }
  };

  const handleDownloadReport = () => {
    if (!syncResult) return;
    const blob = new Blob([JSON.stringify(syncResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siap-kuliah-sync-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeMode = storageStats?.mode || 'json';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pengaturan Sistem
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Penyimpanan dan Sinkronisasi Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola status penyimpanan Dual Storage (JSON Fallback & PostgreSQL) serta migrasi data aman tanpa kehilangan riwayat.
          </p>
        </div>

        <button onClick={fetchPreview} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {switchMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
          <span>{switchMessage}</span>
          <button onClick={() => setSwitchMessage(null)} className="text-blue-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* Mode Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mode Active Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Mode Penyimpanan Aktif</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-base font-bold font-mono px-2.5 py-1 rounded-lg ${
                activeMode === 'postgres'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                {activeMode === 'postgres' ? 'DATABASE (PostgreSQL)' : 'JSON FALLBACK STORAGE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {activeMode === 'postgres'
                ? 'Semua operasi CRUD, presensi, dan audit langsung tersimpan ke PostgreSQL.'
                : 'Aplikasi berjalan menggunakan file JSON terisolasi pada server. Data aman dan siap disinkronkan.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-3">
            {activeMode === 'json' ? (
              <button
                onClick={() => handleSwitchMode('postgres')}
                className="w-full py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Aktifkan Mode PostgreSQL
              </button>
            ) : (
              <button
                onClick={() => handleSwitchMode('json')}
                className="w-full py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
              >
                Kembali ke Mode JSON Fallback
              </button>
            )}
          </div>
        </div>

        {/* Database Connection Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Status Koneksi PostgreSQL</span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${preview?.targetConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
            <span className="text-sm font-bold text-slate-900">
              {preview?.targetConnected ? 'Terhubung & Siap' : 'Belum Terhubung'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 truncate bg-slate-50 p-2 rounded-lg border border-slate-100">
            {storageStats?.databaseUrlMasked || 'DATABASE_URL belum dikonfigurasi'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Host PostgreSQL internal kampus atau server Proxmox VM.
          </p>
        </div>

        {/* Storage Stats Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Sinkronisasi Terakhir</span>
          <div className="text-base font-bold font-mono text-slate-900 mt-2">
            {storageStats?.lastSyncAt ? new Date(storageStats.lastSyncAt).toLocaleString() : 'Belum pernah disinkronkan'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Lokasi JSON: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">./data/storage/*.json</code>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Penulisan file bersifat atomik dan aman dari konflik konkurensi.
          </p>
        </div>
      </div>

      {/* Test Connection Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Uji Koneksi Server PostgreSQL</h2>
        <p className="text-xs text-slate-500 mb-3">
          Verifikasi kesiapan database PostgreSQL sebelum menjalankan import atau mengalihkan mode utama.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={customDbUrl}
            onChange={(e) => setCustomDbUrl(e.target.value)}
            placeholder="Opsional: postgresql://user:password@localhost:5432/siap_kuliah_db"
            className="flex-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
          />
          <button
            onClick={handleTestConnection}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
          >
            Uji Koneksi Sekarang
          </button>
        </div>

        {testResult && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            <span className="font-medium">{testResult.message}</span>
            {testResult.latencyMs !== undefined && (
              <span className="font-mono text-[11px] ml-auto">({testResult.latencyMs}ms)</span>
            )}
          </div>
        )}
      </div>

      {/* Sync Strategy & Execution Control */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Alur Eksekusi Sinkronisasi (JSON → PostgreSQL)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih strategi resolusi konflik. Data diimpor berurutan sesuai dependensi relasi foreign key database.
            </p>
          </div>

          <button
            onClick={handleExecuteSync}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menjalankan Sinkronisasi...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Jalankan Sinkronisasi Sekarang</span>
              </>
            )}
          </button>
        </div>

        {/* Strategy Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            syncStrategy === 'upsert'
              ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                value="upsert"
                checked={syncStrategy === 'upsert'}
                onChange={() => setSyncStrategy('upsert')}
                className="text-emerald-600"
              />
              <span className="text-xs font-bold text-slate-900">Upsert (Rekomendasi)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-5">
              Masukkan record baru dan perbarui record yang sudah ada berdasarkan ID stabil.
            </p>
          </label>

          <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            syncStrategy === 'insert_only'
              ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                value="insert_only"
                checked={syncStrategy === 'insert_only'}
                onChange={() => setSyncStrategy('insert_only')}
                className="text-emerald-600"
              />
              <span className="text-xs font-bold text-slate-900">Insert Only</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-5">
              Hanya memasukkan data baru yang belum ada di database; lewati jika ID sudah ada.
            </p>
          </label>

          <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            syncStrategy === 'dry_run'
              ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                value="dry_run"
                checked={syncStrategy === 'dry_run'}
                onChange={() => setSyncStrategy('dry_run')}
                className="text-emerald-600"
              />
              <span className="text-xs font-bold text-slate-900">Dry Run (Simulasi)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-5">
              Validasi struktur data dan simulasi tanpa menulis perubahan apa pun ke PostgreSQL.
            </p>
          </label>
        </div>

        {/* Sync Result Summary */}
        {syncResult && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Hasil Eksekusi Sinkronisasi</span>
              </div>
              <button
                onClick={handleDownloadReport}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan JSON</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">{syncResult.message}</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Diproses</span>
                <span className="text-sm font-bold text-white">{syncResult.totalRecordsProcessed}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Data Baru (Imported)</span>
                <span className="text-sm font-bold text-emerald-400">{syncResult.totalImported}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Diperbarui (Updated)</span>
                <span className="text-sm font-bold text-blue-400">{syncResult.totalUpdated}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Dilewati (Skipped)</span>
                <span className="text-sm font-bold text-amber-400">{syncResult.totalSkipped}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Gagal / Error</span>
                <span className="text-sm font-bold text-red-400">{syncResult.totalFailed}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entity Record Count Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">
              Perbandingan Record per Entitas (JSON Fallback vs PostgreSQL)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">27 Model Relasional</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-4">Urutan Import Relasional</th>
                <th className="py-2.5 px-4 font-mono text-right">Jumlah di JSON Mode</th>
                <th className="py-2.5 px-4 font-mono text-right">Jumlah di PostgreSQL</th>
                <th className="py-2.5 px-4 text-right">Status Kesiapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {preview?.importOrder ? (
                preview.importOrder.map((entity: string, idx: number) => {
                  const counts = preview.entityCounts[entity] || { jsonCount: 0, postgresCount: 0 };
                  const isSynced = counts.jsonCount > 0 && counts.jsonCount === counts.postgresCount;

                  return (
                    <tr key={entity} className="hover:bg-slate-50/50">
                      <td className="py-2 px-4 text-slate-900 font-medium font-sans">
                        <span className="text-slate-400 text-[11px] mr-2 font-mono">{idx + 1}.</span>
                        {entity}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-800">{counts.jsonCount}</td>
                      <td className="py-2 px-4 text-right text-slate-800">{counts.postgresCount}</td>
                      <td className="py-2 px-4 text-right font-sans">
                        {isSynced ? (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            Identik
                          </span>
                        ) : counts.postgresCount === 0 ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                            Perlu Sinkron
                          </span>
                        ) : (
                          <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                            Tersedia
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 font-sans">
                    Memuat data perbandingan entitas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
