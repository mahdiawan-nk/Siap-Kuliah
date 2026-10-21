import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { SessionRecordItem } from '../types/client.js';
import { CorrectionModal } from '../components/common/CorrectionModal.js';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  FileCheck,
  History
} from 'lucide-react';

interface SessionDetailPageProps {
  sessionId: string;
  onBack: () => void;
}

export const SessionDetailPage: React.FC<SessionDetailPageProps> = ({ sessionId, onBack }) => {
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<SessionRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<SessionRecordItem | null>(null);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      const [sessData, recData] = await Promise.all([
        apiFetch(`/attendance-sessions/${sessionId}`),
        apiFetch(`/attendance-sessions/${sessionId}/records`),
      ]);
      setSession(sessData);
      setRecords(recData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nim.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

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
        return <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">BELUM HADIR</span>;
    }
  };

  if (isLoading && !session) {
    return (
      <div className="p-12 flex justify-center items-center">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Perkuliahan</span>
        </button>
      </div>

      {/* Session Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{session?.courseCode}</span>
              <span>·</span>
              <span>Kelas {session?.classCode}</span>
              <span>·</span>
              <span className="font-semibold text-slate-800">Pertemuan #{session?.meetingNumber}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {session?.courseName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              <strong>Topik:</strong> {session?.topic}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {session?.sessionDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Rencana: {session?.creditsSks} SKS · Status: <strong>{session?.status}</strong>
            </span>
          </div>
        </div>

        {/* Realization notes if closed */}
        {session?.realization && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Berita Acara Realisasi Sesi</span>
            </div>
            <div className="text-slate-600">
              <strong>Catatan:</strong> {session.realization.realizationNotes || 'Tidak ada catatan khusus.'}
            </div>
          </div>
        )}
      </div>

      {/* Attendees Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm">Daftar Kehadiran Mahasiswa</h2>
            <span className="text-xs text-slate-400 font-mono">({filteredRecords.length} mahasiswa)</span>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NIM / Nama..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="IZIN">IZIN</option>
              <option value="SAKIT">SAKIT</option>
              <option value="ALPA">ALPA</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Status Presensi</th>
                <th className="py-3 px-4">Waktu Scan</th>
                <th className="py-3 px-4">Sumber Presensi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.map((item) => (
                <tr key={item.studentId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">{item.nim}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{item.fullName}</td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {item.source || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedRecordForCorrection(item)}
                      className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium transition-colors"
                    >
                      Koreksi Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Modal */}
      {selectedRecordForCorrection && (
        <CorrectionModal
          record={selectedRecordForCorrection}
          onClose={() => setSelectedRecordForCorrection(null)}
          onSuccess={() => {
            setSelectedRecordForCorrection(null);
            fetchSessionData();
          }}
        />
      )}
    </div>
  );
};
