import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  BarChart3,
  Users,
  CalendarCheck,
  AlertOctagon,
  Clock,
  Plus,
  RefreshCw,
  FileCheck2,
  CheckCircle,
  MessageSquare
} from 'lucide-react';

export const KaprodiDashboard: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [lecturerRealizations, setLecturerRealizations] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New evaluation form state
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [evalLecturerId, setEvalLecturerId] = useState('');
  const [evalClassId, setEvalClassId] = useState('');
  const [evalType, setEvalType] = useState('PERIODIK');
  const [evalFindings, setEvalFindings] = useState('');
  const [evalDeadline, setEvalDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ovData, realData, evalData, lecData, clsData] = await Promise.all([
        apiFetch('/reports/kaprodi-overview'),
        apiFetch('/reports/lecturer-realization'),
        apiFetch('/evaluations'),
        apiFetch('/academic/lecturers'),
        apiFetch('/academic/classes'),
      ]);
      setOverview(ovData);
      setLecturerRealizations(realData);
      setEvaluations(evalData);
      setLecturers(lecData);
      setClasses(clsData);

      if (lecData.length > 0 && !evalLecturerId) setEvalLecturerId(lecData[0].id);
      if (clsData.length > 0 && !evalClassId) setEvalClassId(clsData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalFindings.trim()) return;

    setIsSubmitting(true);
    try {
      await apiFetch('/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          lecturerId: evalLecturerId,
          classId: evalClassId,
          evaluationType: evalType,
          findings: evalFindings.trim(),
          followUpDeadline: evalDeadline ? new Date(evalDeadline).toISOString() : null,
        }),
      });
      setIsNewEvalModalOpen(false);
      setEvalFindings('');
      await fetchData();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveEval = async (evalId: string) => {
    try {
      await apiFetch(`/evaluations/${evalId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monitoring & Evaluasi Program Studi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            S1 Teknik Informatika · Pengawasan realisasi kurikulum, jam mengajar dosen, dan evaluasi berkala.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewEvalModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Evaluasi Prodi</span>
          </button>
          <button onClick={fetchData} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Realisasi Pertemuan</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {overview?.realizationPercentage ?? 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {overview?.totalRealized ?? 0} dari target {overview?.totalPlannedTarget ?? 0} pertemuan
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Sesi Terbuka (Belum Ditutup)</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {overview?.activeOpenSessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sesi aktif berjalan hari ini</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Koreksi Presensi Tercatat</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {overview?.totalCorrectionsLogged ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Seluruh audit trail terekam aman</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Dosen / Mahasiswa</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {overview?.totalLecturers ?? 0} <span className="text-sm font-sans font-normal text-slate-400">/ {overview?.totalStudents ?? 0}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Beban SKS aktif diampu</div>
        </div>
      </div>

      {/* Realisasi Jam Mengajar Dosen */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Realisasi Jam Mengajar Dosen (Berdasarkan SKS & Realisasi Sesi)</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">50 menit / SKS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Nama Dosen</th>
                <th className="py-3 px-4">NIDN / NIP</th>
                <th className="py-3 px-4">Kelas Diampu</th>
                <th className="py-3 px-4">Pertemuan Selesai</th>
                <th className="py-3 px-4 font-mono text-right">Rencana (Jam)</th>
                <th className="py-3 px-4 font-mono text-right">Realisasi (Jam)</th>
                <th className="py-3 px-4 font-mono text-right">Selisih</th>
                <th className="py-3 px-4 font-mono text-right">% Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lecturerRealizations.map((lec) => (
                <tr key={lec.lecturerId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">{lec.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{lec.nidn}</td>
                  <td className="py-3 px-4 font-mono">{lec.totalClassesTaught} kelas</td>
                  <td className="py-3 px-4 font-mono">{lec.totalClosedMeetings} sesi</td>
                  <td className="py-3 px-4 font-mono text-right text-slate-600">{lec.plannedHours}</td>
                  <td className="py-3 px-4 font-mono text-right font-semibold text-slate-900">{lec.actualHours}</td>
                  <td className={`py-3 px-4 font-mono text-right ${lec.differenceHours < 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {lec.differenceHours > 0 ? `+${lec.differenceHours}` : lec.differenceHours}
                  </td>
                  <td className="py-3 px-4 font-mono text-right font-bold text-emerald-600">
                    {lec.realizationPercentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluasi Perkuliahan & Temuan Tindak Lanjut */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Catatan Temuan & Evaluasi Akademik</h2>
          </div>
        </div>

        {evaluations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada catatan evaluasi. Klik "Buat Evaluasi Prodi" untuk memulai peninjauan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {evaluations.map((ev) => (
              <div key={ev.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{ev.lecturerName}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600 font-medium">{ev.courseName} ({ev.classCode})</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ev.evaluationType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      ev.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      STATUS: {ev.status}
                    </span>
                    {ev.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolveEval(ev.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Selesaikan Temuan
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                  <strong>Temuan Kaprodi:</strong> {ev.findings}
                  {ev.followUpDeadline && (
                    <div className="text-[11px] text-amber-700 font-mono mt-1">
                      Batas Tindak Lanjut: {new Date(ev.followUpDeadline).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Follow ups from lecturer */}
                {ev.followUps && ev.followUps.length > 0 && (
                  <div className="pl-4 border-l-2 border-emerald-400 space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Tanggapan / Tindak Lanjut Dosen:</span>
                    {ev.followUps.map((f: any) => (
                      <div key={f.id} className="text-xs text-slate-600 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        {f.response}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Diserahkan: {new Date(f.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Evaluation Modal */}
      {isNewEvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Buat Evaluasi Perkuliahan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Catatan temuan kaprodi akan langsung diteruskan ke dosen pengampu terkait untuk ditindaklanjuti.
            </p>

            <form onSubmit={handleCreateEvaluation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Dosen Pengampu</label>
                <select
                  value={evalLecturerId}
                  onChange={(e) => setEvalLecturerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.nidn || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Kelas Perkuliahan</label>
                <select
                  value={evalClassId}
                  onChange={(e) => setEvalClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} — Kelas {c.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Evaluasi</label>
                  <select
                    value={evalType}
                    onChange={(e) => setEvalType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="PERIODIK">Evaluasi Periodik</option>
                    <option value="JADWAL_TERLAMBAT">Keterlambatan Pelaksanaan</option>
                    <option value="KEHADIRAN_RENDAH">Tingkat Kehadiran Rendah</option>
                    <option value="MATERI_BELUM_SESUAI">Penyesuaian RPS / Materi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tenggat Tindak Lanjut</label>
                  <input
                    type="date"
                    value={evalDeadline}
                    onChange={(e) => setEvalDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan Temuan & Rekomendasi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={evalFindings}
                  onChange={(e) => setEvalFindings(e.target.value)}
                  placeholder="Deskripsikan temuan evaluasi, presensi mahasiswa, atau realisasi materi..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewEvalModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Evaluasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
