import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api.js';
import { AttendanceSessionItem } from '../../types/client.js';
import { Maximize2, Minimize2, X, RefreshCw, Users, Clock } from 'lucide-react';

interface ProjectorQrModalProps {
  session: AttendanceSessionItem;
  onClose: () => void;
  onAttendanceUpdate?: () => void;
}

export const ProjectorQrModal: React.FC<ProjectorQrModalProps> = ({ session, onClose, onAttendanceUpdate }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(session.qrIntervalSeconds || 5);
  const [totalInterval, setTotalInterval] = useState<number>(session.qrIntervalSeconds || 5);
  const [attendeeCount, setAttendeeCount] = useState<number>(session.stats?.hadir || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLatestQr = async (force = false) => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/attendance-sessions/${session.id}/qr?force=${force}`);
      setQrDataUrl(res.qrDataUrl);
      setSecondsRemaining(res.secondsRemaining);
      setTotalInterval(res.intervalSeconds);
    } catch (err) {
      console.error('Error fetching QR:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendeeStats = async () => {
    try {
      const records = await apiFetch(`/attendance-sessions/${session.id}/records`);
      const attended = records.filter((r: any) => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
      setAttendeeCount(attended);
      if (onAttendanceUpdate) onAttendanceUpdate();
    } catch {}
  };

  useEffect(() => {
    fetchLatestQr(true);
    fetchAttendeeStats();

    // Attendee count polling
    const attendeeInterval = setInterval(fetchAttendeeStats, 3000);
    return () => clearInterval(attendeeInterval);
  }, [session.id]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchLatestQr(false);
          return totalInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [totalInterval]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const progressPct = Math.max(0, Math.min(100, (secondsRemaining / totalInterval) * 100));

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-white select-none animate-in fade-in duration-200"
    >
      {/* Top Header bar */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            Mode Proyektor Kuliah · Pertemuan #{session.meetingNumber}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
            {session.courseName} ({session.classCode})
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 truncate max-w-xl">
            Materi: {session.topic}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLatestQr(true)}
            disabled={isLoading}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Perbarui QR Manual"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
            title="Tutup Mode Proyektor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center QR Display */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative p-6 sm:p-8 bg-white rounded-3xl shadow-2xl flex flex-col items-center border-4 border-slate-700">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code Dinamis Absensi"
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain"
            />
          ) : (
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}

          {/* Dynamic interval countdown bar */}
          <div className="w-full mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full mt-3 text-slate-700 text-xs sm:text-sm font-medium">
            <span className="flex items-center gap-1.5 font-mono tabular-nums">
              <Clock className="w-4 h-4 text-slate-500" />
              Rotasi dalam {secondsRemaining} detik
            </span>
            <span className="text-slate-500">
              Interval {totalInterval}s
            </span>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-400 max-w-md text-center">
          Arahkan pemindai kamera pada aplikasi SIAP-KULIAH mahasiswa Anda ke QR Code di atas. QR diperbarui berkala secara otomatis.
        </p>
      </div>

      {/* Bottom status strip */}
      <div className="w-full max-w-5xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Total Mahasiswa Terpresensi</span>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              {attendeeCount} <span className="text-xs text-slate-400 font-sans font-normal">mahasiswa</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Kredensial Server Terverifikasi</span>
          <span>·</span>
          <span>HMAC-SHA256 Signed</span>
        </div>
      </div>
    </div>
  );
};
