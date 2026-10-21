import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { CameraQrScanner } from '../components/common/CameraQrScanner.js';
import {
  QrCode,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Send,
  RefreshCw,
  FileText
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<any | null>(null);

  // Appeal state
  const [appealRecordId, setAppealRecordId] = useState<string | null>(null);
  const [appealStatus, setAppealStatus] = useState<'HADIR' | 'IZIN' | 'SAKIT'>('HADIR');
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealMessage, setAppealMessage] = useState<string | null>(null);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      const [histData, repData, schData] = await Promise.all([
        apiFetch('/attendance/my-history'),
        apiFetch('/reports/attendance'),
        apiFetch('/academic/schedules'),
      ]);
      setHistory(histData);
      setReports(repData);
      setSchedules(schData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealRecordId || !appealReason) return;

    try {
      await apiFetch(`/attendance/records/${appealRecordId}/appeal`, {
        method: 'POST',
        body: JSON.stringify({
          requestedStatus: appealStatus,
          reason: appealReason,
        }),
      });
      setAppealMessage('Permohonan koreksi presensi berhasil dikirim ke Dosen Pengampu.');
      setAppealRecordId(null);
      setAppealReason('');
      await fetchStudentData();
    } catch (err: any) {
      setAppealMessage(`Gagal: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HADIR':
        return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">HADIR</span>;
      case 'TERLAMBAT':
        return <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">TERLAMBAT</span>;
      case 'IZIN':
        return <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">IZIN</span>;
      case 'SAKIT':
        return <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">SAKIT</span>;
      case 'ALPA':
        return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">ALPA</span>;
      default:
        return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Presensi & Portal Akademik Mahasiswa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Scan QR code yang ditampilkan dosen untuk mencatat kehadiran secara instan.
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-2 self-start sm:self-auto transition-transform active:scale-95"
        >
          <QrCode className="w-4 h-4" />
          <span>Buka Pemindai QR Presensi</span>
        </button>
      </div>

      {/* Scan Feedback Banner */}
      {scanFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-sm">Presensi Terverifikasi Server</div>
              <div>Topik: {scanFeedback.sessionTopic} (Pertemuan #{scanFeedback.meetingNumber})</div>
              <div className="font-mono text-emerald-700 mt-0.5">
                Status: <strong>{scanFeedback.status}</strong> · {new Date(scanFeedback.recordedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button onClick={() => setScanFeedback(null)} className="text-emerald-700 font-bold">×</button>
        </div>
      )}

      {appealMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
          <span>{appealMessage}</span>
          <button onClick={() => setAppealMessage(null)} className="text-blue-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* Course Attendance Percentage Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Persentase Kehadiran per Mata Kuliah</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((cr) => {
            // Find current student recap in this class
            const myRecap = cr.studentRecaps?.[0] || { percentage: 100, meetsThreshold: true, totalAttended: 0, hadir: 0, terlambat: 0, alpa: 0 };
            const pct = myRecap.percentage;
            const isWarning = pct < cr.minAttendanceThreshold;

            return (
              <div key={cr.classId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-slate-400">
                      {cr.courseCode} · Kelas {cr.classCode}
                    </span>
                    <h3 className="font-semibold text-slate-900 text-sm mt-0.5">{cr.courseName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900">{pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    Hadir: <strong>{myRecap.hadir}</strong> · Terlambat: <strong>{myRecap.terlambat}</strong> · Alpa: <strong>{myRecap.alpa}</strong>
                  </span>
                  {isWarning ? (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      &lt; {cr.minAttendanceThreshold}%
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium font-mono text-[11px]">Memenuhi Syarat UAS</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Riwayat Presensi Pribadi</h2>
          <button onClick={fetchStudentData} className="p-1.5 text-slate-400 hover:text-slate-600">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada catatan presensi. Scan QR saat perkuliahan berlangsung untuk mulai mencatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Mata Kuliah</th>
                  <th className="py-3 px-4">Pertemuan</th>
                  <th className="py-3 px-4">Topik</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu Scan</th>
                  <th className="py-3 px-4 text-right">Permohonan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.recordId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{item.sessionDate}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.courseName} ({item.classCode})
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">#{item.meetingNumber}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{item.topic}</td>
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status !== 'HADIR' && (
                        <button
                          onClick={() => setAppealRecordId(item.recordId)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium"
                        >
                          Ajukan Koreksi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      {appealRecordId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Pengajuan Koreksi Presensi</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ajukan permohonan dispensasi atau bukti kehadiran kepada dosen pengampu.
            </p>

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status yang Diajukan</label>
                <select
                  value={appealStatus}
                  onChange={(e) => setAppealStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                >
                  <option value="HADIR">HADIR (Hadir di kelas tetapi terkendala jaringan)</option>
                  <option value="IZIN">IZIN (Dispensasi kegiatan resmi kampus)</option>
                  <option value="SAKIT">SAKIT (Surat keterangan dokter)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alasan & Penjelasan Rinci <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Jelaskan alasan permohonan koreksi secara lengkap..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAppealRecordId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <CameraQrScanner
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(result) => {
            setIsScannerOpen(false);
            setScanFeedback(result);
            fetchStudentData();
          }}
        />
      )}
    </div>
  );
};
