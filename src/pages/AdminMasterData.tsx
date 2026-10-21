import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { BookOpen, Users, GraduationCap, School, Settings, RefreshCw, Search } from 'lucide-react';

export const AdminMasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'lecturers' | 'courses' | 'classes' | 'settings'>('students');
  const [data, setData] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'settings') {
        const s = await apiFetch('/academic/settings');
        setSettings(s);
      } else {
        const res = await apiFetch(`/academic/${activeTab}`);
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/academic/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      setSaveMessage('Pengaturan sistem berhasil diperbarui.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    }
  };

  const filteredData = data.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.nim && item.nim.toLowerCase().includes(q)) ||
      (item.nidn && item.nidn.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Master Akademik & Konfigurasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data mahasiswa, dosen, mata kuliah, kelas perkuliahan, dan kebijakan sistem.
          </p>
        </div>

        <button onClick={fetchData} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-200/70 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('students'); setSearch(''); }}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'students' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mahasiswa
        </button>
        <button
          onClick={() => { setActiveTab('lecturers'); setSearch(''); }}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'lecturers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dosen
        </button>
        <button
          onClick={() => { setActiveTab('courses'); setSearch(''); }}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'courses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mata Kuliah
        </button>
        <button
          onClick={() => { setActiveTab('classes'); setSearch(''); }}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'classes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kelas & Pengampu
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pengaturan Sistem
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">Pengaturan Kebijakan Akademik</h2>
          <p className="text-xs text-slate-500 mb-5">Konfigurasi ambang batas kehadiran, durasi SKS, dan parameter QR.</p>

          {saveMessage && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
              {saveMessage}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ambang Batas Minimum Kehadiran Mahasiswa (%)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={settings.default_attendance_min_percentage || '75'}
                onChange={(e) => setSettings({ ...settings, default_attendance_min_percentage: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standar kelayakan mengikuti Ujian Akhir Semester (Default 75%).</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Interval Rotasi QR Dinamis (Detik)
              </label>
              <select
                value={settings.default_qr_interval_seconds || '5'}
                onChange={(e) => setSettings({ ...settings, default_qr_interval_seconds: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              >
                <option value="5">5 detik (Rekomendasi Default)</option>
                <option value="10">10 detik</option>
                <option value="15">15 detik</option>
                <option value="30">30 detik</option>
                <option value="60">60 detik</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Toleransi Waktu Keterlambatan Default (Menit)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={settings.default_late_tolerance_minutes || '15'}
                onChange={(e) => setSettings({ ...settings, default_late_tolerance_minutes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Durasi Menit Perkuliahan per SKS
              </label>
              <input
                type="number"
                min={30}
                max={120}
                value={settings.sks_minutes_per_credit || '50'}
                onChange={(e) => setSettings({ ...settings, sks_minutes_per_credit: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standar Permendikbud: 50 menit tatap muka per SKS.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari entitas..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 w-56"
              />
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {filteredData.length} data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  {activeTab === 'students' && (
                    <>
                      <th className="py-2.5 px-4 font-mono">NIM</th>
                      <th className="py-2.5 px-4">Nama Lengkap</th>
                      <th className="py-2.5 px-4 font-mono">Angkatan</th>
                      <th className="py-2.5 px-4">Status Akademik</th>
                    </>
                  )}
                  {activeTab === 'lecturers' && (
                    <>
                      <th className="py-2.5 px-4">Nama Dosen</th>
                      <th className="py-2.5 px-4 font-mono">NIDN</th>
                      <th className="py-2.5 px-4 font-mono">NIP</th>
                      <th className="py-2.5 px-4">Status</th>
                    </>
                  )}
                  {activeTab === 'courses' && (
                    <>
                      <th className="py-2.5 px-4 font-mono">Kode MK</th>
                      <th className="py-2.5 px-4">Nama Mata Kuliah</th>
                      <th className="py-2.5 px-4 font-mono">Bobot SKS</th>
                    </>
                  )}
                  {activeTab === 'classes' && (
                    <>
                      <th className="py-2.5 px-4 font-mono">Kode Kelas</th>
                      <th className="py-2.5 px-4">Mata Kuliah</th>
                      <th className="py-2.5 px-4 font-mono">SKS</th>
                      <th className="py-2.5 px-4 font-mono">Mahasiswa Terdaftar</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    {activeTab === 'students' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-slate-800 font-medium">{item.nim}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.fullName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{item.cohortYear}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {item.academicStatus}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === 'lecturers' && (
                      <>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.fullName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.nidn || '-'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.nip || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-700">{item.employmentStatus}</td>
                      </>
                    )}
                    {activeTab === 'courses' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-slate-800 font-medium">{item.code}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.creditsSks} SKS</td>
                      </>
                    )}
                    {activeTab === 'classes' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-slate-800 font-medium">{item.code}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.courseName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.creditsSks} SKS</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.enrolledCount} mahasiswa</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
