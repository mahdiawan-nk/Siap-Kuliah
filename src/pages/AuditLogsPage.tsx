import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { ShieldCheck, RefreshCw, Search } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/academic/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l =>
    (l.action && l.action.toLowerCase().includes(search.toLowerCase())) ||
    (l.entityType && l.entityType.toLowerCase().includes(search.toLowerCase())) ||
    (l.reason && l.reason.toLowerCase().includes(search.toLowerCase())) ||
    (l.actorUsername && l.actorUsername.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Trail & Log Aktivitas Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan menyeluruh untuk login, pembuatan sesi, scan presensi, koreksi kehadiran, dan migrasi.
          </p>
        </div>

        <button onClick={fetchLogs} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, aktor, atau alasan..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 w-64"
            />
          </div>
          <span className="text-xs font-mono text-slate-400">Total: {filtered.length} log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium font-mono">
              <tr>
                <th className="py-2.5 px-4">Waktu (UTC/WIB)</th>
                <th className="py-2.5 px-4">Aktor Pengguna</th>
                <th className="py-2.5 px-4">Aksi / Event</th>
                <th className="py-2.5 px-4">Entitas</th>
                <th className="py-2.5 px-4">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{log.actorUsername}</td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{log.action}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">{log.entityType}</td>
                  <td className="py-2.5 px-4 text-slate-700">{log.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
