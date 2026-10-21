import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { AttendanceSessionItem } from '../types/client.js';
import { ProjectorQrModal } from '../components/common/ProjectorQrModal.js';
import { RealizationModal } from '../components/common/RealizationModal.js';
import {
  Plus,
  Play,
  CheckCircle,
  XCircle,
  QrCode,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface LecturerDashboardProps {
  onSelectSession: (sessionId: string) => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<AttendanceSessionItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectorSession, setSelectedProjectorSession] = useState<AttendanceSessionItem | null>(null);
  const [selectedRealizationSession, setSelectedRealizationSession] = useState<AttendanceSessionItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New session form state
  const [formClassId, setFormClassId] = useState('');
  const [formMeetingNumber, setFormMeetingNumber] = useState(1);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formCreditsSks, setFormCreditsSks] = useState(3);
  const [formQrInterval, setFormQrInterval] = useState(5);
  const [formTolerance, setFormTolerance] = useState(15);
  const [formTopic, setFormTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sessionsData, classesData, schedulesData] = await Promise.all([
        apiFetch('/attendance-sessions'),
        apiFetch('/academic/classes'),
        apiFetch('/academic/schedules'),
      ]);
      setSessions(sessionsData);
      setClasses(classesData);
      setSchedules(schedulesData);
      if (classesData.length > 0 && !formClassId) {
        setFormClassId(classesData[0].id);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartSession = async (sessionId: string) => {
    try {
      setActionError(null);
      await apiFetch(`/attendance-sessions/${sessionId}/start`, { method: 'POST' });
      await fetchData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    const reason = window.prompt('Masukkan alasan pembatalan sesi perkuliahan:');
    if (!reason) return;
    try {
      setActionError(null);
      await apiFetch(`/attendance-sessions/${sessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await fetchData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim()) {
      setActionError('Topik materi perkuliahan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const plannedStartAt = `${formDate}T${formStartTime}:00.000Z`;
      await apiFetch('/attendance-sessions', {
        method: 'POST',
        body: JSON.stringify({
          classId: formClassId,
          meetingNumber: Number(formMeetingNumber),
          sessionDate: formDate,
          plannedStartAt,
          creditsSks: Number(formCreditsSks),
          lateToleranceMinutes: Number(formTolerance),
          qrIntervalSeconds: Number(formQrInterval),
          topic: formTopic.trim(),
        }),
      });

      setIsCreateModalOpen(false);
      setFormTopic('');
      await fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">SESI AKTIF (OPEN)</span>;
      case 'CLOSED':
        return <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">SELESAI (CLOSED)</span>;
      case 'CANCELLED':
        return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">DIBATALKAN</span>;
      default:
        return <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">TERJADWAL</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Perkuliahan & Presensi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola sesi pertemuan, luncurkan QR dinamis proyektor, dan tinjau berita acara kehadiran.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Kuliah Baru</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 font-bold ml-2">×</button>
        </div>
      )}

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Kelas yang Diampu</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{classes.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Sesi Berlangsung (OPEN)</span>
          <div className="text-xl font-bold text-emerald-600 font-mono mt-1">
            {sessions.filter(s => s.status === 'OPEN').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Pertemuan Terlaksana</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {sessions.filter(s => s.status === 'CLOSED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Total Jadwal Mingguan</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{schedules.length}</div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Daftar Sesi Perkuliahan</h2>
          <button
            onClick={fetchData}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada sesi perkuliahan. Klik tombol "Buat Sesi Kuliah Baru" untuk memulai.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {sess.courseName} ({sess.classCode})
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-600 font-mono">
                      Pertemuan #{sess.meetingNumber}
                    </span>
                    {getStatusBadge(sess.status)}
                  </div>

                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Materi:</span> {sess.topic}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {sess.sessionDate}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {sess.creditsSks} SKS ({sess.qrIntervalSeconds}s QR)
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Hadir: {sess.stats?.hadir || 0} / {sess.stats?.totalEnrolled || 0}
                    </span>
                  </div>
                </div>

                {/* Session Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {sess.status === 'OPEN' && (
                    <button
                      onClick={() => setSelectedProjectorSession(sess)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mode Proyektor QR</span>
                    </button>
                  )}

                  {sess.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStartSession(sess.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Buka Presensi</span>
                    </button>
                  )}

                  {sess.status === 'OPEN' && (
                    <button
                      onClick={() => setSelectedRealizationSession(sess)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Tutup & Berita Acara</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectSession(sess.id)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Daftar Hadir & Koreksi</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {sess.status !== 'CLOSED' && sess.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelSession(sess.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Batalkan Sesi"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Buat Sesi Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Buat Sesi Perkuliahan Baru</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pilih Kelas Mata Kuliah <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} — Kelas {c.code} ({c.creditsSks} SKS)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor Pertemuan (1-32)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={formMeetingNumber}
                    onChange={(e) => setFormMeetingNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bobot SKS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formCreditsSks}
                    onChange={(e) => setFormCreditsSks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jam Mulai Rencana (WIB)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Interval QR Dinamis (5-60s)
                  </label>
                  <select
                    value={formQrInterval}
                    onChange={(e) => setFormQrInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                  >
                    <option value={5}>5 detik (Rekomendasi Default)</option>
                    <option value={10}>10 detik</option>
                    <option value={15}>15 detik</option>
                    <option value={20}>20 detik</option>
                    <option value={30}>30 detik</option>
                    <option value={45}>45 detik</option>
                    <option value={60}>60 detik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Toleransi Terlambat (Menit)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formTolerance}
                    onChange={(e) => setFormTolerance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Topik / Materi Kuliah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Contoh: Arsitektur REST API & RBAC Security Middleware"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Memproses...' : 'Buat Sesi Kuliah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projector Modal */}
      {selectedProjectorSession && (
        <ProjectorQrModal
          session={selectedProjectorSession}
          onClose={() => setSelectedProjectorSession(null)}
          onAttendanceUpdate={fetchData}
        />
      )}

      {/* Realization Modal */}
      {selectedRealizationSession && (
        <RealizationModal
          session={selectedRealizationSession}
          onClose={() => setSelectedRealizationSession(null)}
          onSuccess={() => {
            setSelectedRealizationSession(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
