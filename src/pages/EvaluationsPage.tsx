import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ClipboardList, MessageSquare, Check, RefreshCw, Send, AlertCircle } from 'lucide-react';

export const EvaluationsPage: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingEvalId, setRespondingEvalId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvals = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/evaluations');
      setEvaluations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvals();
  }, []);

  const handleSendResponse = async (evalId: string) => {
    if (!responseText.trim()) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/evaluations/${evalId}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({ response: responseText.trim() }),
      });
      setRespondingEvalId(null);
      setResponseText('');
      await fetchEvals();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (evalId: string) => {
    try {
      await apiFetch(`/evaluations/${evalId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      await fetchEvals();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Evaluasi Perkuliahan & Tindak Lanjut
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Komunikasi tertulis resmi antara Kaprodi dan Dosen Pengampu terkait mutu dan realisasi perkuliahan.
          </p>
        </div>

        <button onClick={fetchEvals} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {evaluations.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            Belum ada catatan evaluasi perkuliahan.
          </div>
        ) : (
          evaluations.map((ev) => (
            <div key={ev.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{ev.lecturerName}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-xs text-slate-600 font-medium">{ev.courseName} ({ev.classCode})</span>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {ev.evaluationType}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                    ev.status === 'RESOLVED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {ev.status}
                  </span>

                  {(activeRole === 'KAPRODI' || activeRole === 'ADMINISTRATOR') && ev.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolve(ev.id)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                    >
                      Tandai Selesai
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-800 border border-slate-100">
                <div className="font-semibold text-slate-700 mb-0.5">Catatan Temuan Kaprodi:</div>
                <div>{ev.findings}</div>
                {ev.followUpDeadline && (
                  <div className="text-[11px] text-amber-700 font-mono mt-1.5">
                    Batas Tindak Lanjut: {new Date(ev.followUpDeadline).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Follow ups */}
              {ev.followUps && ev.followUps.length > 0 && (
                <div className="space-y-2 pt-1 pl-4 border-l-2 border-emerald-400">
                  <span className="text-[11px] font-semibold text-slate-500">Tanggapan Dosen Pengampu:</span>
                  {ev.followUps.map((f: any) => (
                    <div key={f.id} className="text-xs text-slate-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                      <div>{f.response}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        Diserahkan pada: {new Date(f.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lecturer response action */}
              {activeRole === 'DOSEN' && ev.status !== 'RESOLVED' && (
                <div className="pt-2">
                  {respondingEvalId === ev.id ? (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <textarea
                        rows={2}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Tuliskan tanggapan atau tindakan perbaikan Anda..."
                        className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setRespondingEvalId(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSendResponse(ev.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Tanggapan</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingEvalId(ev.id)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>Berikan Tanggapan / Tindak Lanjut</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
