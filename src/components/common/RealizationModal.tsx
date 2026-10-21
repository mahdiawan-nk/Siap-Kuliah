import React, { useState } from 'react';
import { apiFetch } from '../../lib/api.js';
import { AttendanceSessionItem } from '../../types/client.js';
import { X, Check, RefreshCw, FileText } from 'lucide-react';

interface RealizationModalProps {
  session: AttendanceSessionItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const RealizationModal: React.FC<RealizationModalProps> = ({ session, onClose, onSuccess }) => {
  const [topic, setTopic] = useState<string>(session.topic);
  const [notes, setNotes] = useState<string>('');
  const [actualStart, setActualStart] = useState<string>(
    session.actualStartAt ? new Date(session.actualStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '08:00'
  );
  const [actualEnd, setActualEnd] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Materi topik perkuliahan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const today = session.sessionDate || new Date().toISOString().split('T')[0];
      const startIso = `${today}T${actualStart}:00.000Z`;
      const endIso = `${today}T${actualEnd}:00.000Z`;

      await apiFetch(`/attendance-sessions/${session.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          realizationNotes: notes.trim(),
          actualStartAt: startIso,
          actualEndAt: endIso,
        }),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan realisasi perkuliahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Tutup Sesi & Berita Acara Perkuliahan</h3>
              <p className="text-xs text-slate-500">
                {session.courseName} · Pertemuan #{session.meetingNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
            <strong>Perhatian:</strong> Menutup sesi akan secara otomatis merekonsiliasi seluruh mahasiswa terdaftar yang belum melakukan presensi menjadi berstatus <strong>ALPA</strong>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jam Mulai Aktual (WIB)</label>
              <input
                type="time"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jam Selesai Aktual (WIB)</label>
              <input
                type="time"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Topik / Materi Terlaksana <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Pembahasan Transaksi ACID & Normalisasi Skema Database"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Realisasi & Kendala Kelas</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan pelaksanaan, kehadiran, kendala sarana, keaktifan mahasiswa, dll."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menutup Sesi...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tutup Sesi & Simpan Berita Acara</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
