import React, { useState } from 'react';
import { apiFetch } from '../../lib/api.js';
import { AttendanceStatus, SessionRecordItem } from '../../types/client.js';
import { X, AlertTriangle, Check, RefreshCw } from 'lucide-react';

interface CorrectionModalProps {
  record: SessionRecordItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({ record, onClose, onSuccess }) => {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(
    record.status === 'BELUM_PRESENSI' ? 'HADIR' : (record.status as AttendanceStatus)
  );
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record.recordId) {
      setError('Record presensi belum terbentuk atau sesi belum pernah dibuka.');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setError('Alasan perubahan status wajib diisi minimal 10 karakter secara bermakna.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/attendance/records/${record.recordId}/corrections`, {
        method: 'POST',
        body: JSON.stringify({
          newStatus,
          reason: reason.trim(),
        }),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan koreksi presensi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: AttendanceStatus[] = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Koreksi Status Presensi</h3>
            <p className="text-xs text-slate-500">
              {record.fullName} ({record.nim})
            </p>
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
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Status Saat Ini</label>
            <div className="text-sm font-semibold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
              {record.status}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ubah Menjadi Status Baru <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setNewStatus(st)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                    newStatus === st
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alasan Koreksi Resmi <span className="text-red-500">* (Wajib & Diaudit)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Surat dokter rawat inap diserahkan mahasiswa, telah diverifikasi."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Catatan: Seluruh koreksi tercatat permanen di audit trail dan dapat dipantau oleh Kaprodi & Administrator.
            </p>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
