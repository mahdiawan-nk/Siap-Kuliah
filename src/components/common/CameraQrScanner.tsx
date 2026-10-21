import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { apiFetch } from '../../lib/api.js';

interface CameraQrScannerProps {
  onScanSuccess: (result: any) => void;
  onClose: () => void;
  suggestedSessionId?: string;
}

export const CameraQrScanner: React.FC<CameraQrScannerProps> = ({ onScanSuccess, onClose, suggestedSessionId }) => {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [manualSessionId, setManualSessionId] = useState<string>(suggestedSessionId || '');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Kamera tidak dapat diakses atau izin ditolak.');
      setActiveTab('manual');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.startsWith('SIAP:')) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleDetectedCode = async (rawCode: string) => {
    setIsScanning(false);
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const parts = rawCode.split(':');
      const sessionId = parts[1];

      const res = await apiFetch('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          token: rawCode,
        }),
      });

      setStatusMessage({ type: 'success', text: `Presensi berhasil dicatat! Status: ${res.status}` });
      setTimeout(() => {
        onScanSuccess(res);
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memproses QR code' });
      setIsScanning(true);
      requestAnimationFrame(tick);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSessionId || !manualToken) {
      setStatusMessage({ type: 'error', text: 'ID Sesi dan Token QR wajib diisi' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await apiFetch('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: manualSessionId,
          token: manualToken,
        }),
      });

      setStatusMessage({ type: 'success', text: `Presensi berhasil! Status: ${res.status}` });
      setTimeout(() => {
        onScanSuccess(res);
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Pemindai Presensi QR</h3>
            <p className="text-xs text-slate-500">Scan QR dinamis yang ditampilkan oleh dosen</p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-5 pt-2">
          <button
            onClick={() => {
              setActiveTab('camera');
              setIsScanning(true);
              startCamera();
            }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Kamera Langsung
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Simulasi / Input Manual
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {statusMessage && (
            <div
              className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div className="flex flex-col items-center">
              {hasCamera ? (
                <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Reticle targeting overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg" />
                    </div>
                  </div>

                  {isSubmitting && (
                    <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                      <span>Memverifikasi presensi ke server...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">Kamera Tidak Tersedia</p>
                  <p className="text-xs text-slate-500 mt-1">{cameraError || 'Gunakan tab input manual di atas untuk pengujian.'}</p>
                </div>
              )}
              <p className="text-xs text-slate-500 text-center mt-3">
                Arahkan lensa kamera ke layar proyektor atau layar dosen.
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ID Sesi Perkuliahan
                </label>
                <input
                  type="text"
                  value={manualSessionId}
                  onChange={(e) => setManualSessionId(e.target.value)}
                  placeholder="Contoh: sess-web-2"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  String Token QR (Aktif)
                </label>
                <textarea
                  rows={3}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Format: SIAP:sessionId:timestamp:nonce:signature"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip Pengujian: Token QR dapat disalin dari layar dosen saat sesi OPEN.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Presensi...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Kirim Presensi</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
