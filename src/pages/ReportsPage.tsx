import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { BarChart3, Download, Filter, RefreshCw, FileText, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'lecturer'>('attendance');
  const [attendanceReports, setAttendanceReports] = useState<any[]>([]);
  const [lecturerReports, setLecturerReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const [attData, lecData] = await Promise.all([
        apiFetch('/reports/attendance'),
        apiFetch('/reports/lecturer-realization'),
      ]);
      setAttendanceReports(attData);
      setLecturerReports(lecData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadCsv = (type: 'attendance' | 'lecturer') => {
    window.open(`/api/v1/reports/export-csv?type=${type}`, '_blank');
  };

  const filteredAttendance = selectedClassId === 'ALL'
    ? attendanceReports
    : attendanceReports.filter(c => c.classId === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan & Rekapitulasi Akademik
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Analisis kehadiran mahasiswa, ambang batas kepatuhan, serta realisasi jam mengajar dosen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadCsv(activeTab)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV (Excel)</span>
          </button>
          <button onClick={fetchReports} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'attendance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Rekap Kehadiran Mahasiswa
        </button>
        <button
          onClick={() => setActiveTab('lecturer')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'lecturer'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Realisasi Jam Mengajar Dosen
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <div className="space-y-6">
          {/* Class Filter */}
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">Filter Kelas:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Semua Kelas Mata Kuliah</option>
              {attendanceReports.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.courseName} ({c.classCode})
                </option>
              ))}
            </select>
          </div>

          {/* Class Cards */}
          {filteredAttendance.map((cls) => (
            <div key={cls.classId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {cls.courseCode} · Kelas {cls.classCode} · {cls.creditsSks} SKS
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{cls.courseName}</h3>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>
                    Sesi Terlaksana: <strong>{cls.totalClosedSessions}</strong> / {cls.totalCreatedSessions}
                  </span>
                  <span>·</span>
                  <span>
                    Rerata Hadir: <strong className="text-emerald-700 font-bold">{cls.averageAttendancePercentage}%</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">NIM</th>
                      <th className="py-2.5 px-4">Nama Mahasiswa</th>
                      <th className="py-2.5 px-4 font-mono text-center">Hadir</th>
                      <th className="py-2.5 px-4 font-mono text-center">Terlambat</th>
                      <th className="py-2.5 px-4 font-mono text-center">Izin</th>
                      <th className="py-2.5 px-4 font-mono text-center">Sakit</th>
                      <th className="py-2.5 px-4 font-mono text-center">Alpa</th>
                      <th className="py-2.5 px-4 font-mono text-right">% Kehadiran</th>
                      <th className="py-2.5 px-4 text-right">Kepatuhan Ambang (≥{cls.minAttendanceThreshold}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cls.studentRecaps.map((s: any) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono text-slate-700">{s.nim}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.fullName}</td>
                        <td className="py-2.5 px-4 font-mono text-center text-emerald-700 font-medium">{s.hadir}</td>
                        <td className="py-2.5 px-4 font-mono text-center text-amber-700">{s.terlambat}</td>
                        <td className="py-2.5 px-4 font-mono text-center text-blue-700">{s.izin}</td>
                        <td className="py-2.5 px-4 font-mono text-center text-purple-700">{s.sakit}</td>
                        <td className="py-2.5 px-4 font-mono text-center text-red-600 font-semibold">{s.alpa}</td>
                        <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{s.percentage}%</td>
                        <td className="py-2.5 px-4 text-right">
                          {s.meetsThreshold ? (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              MEMENUHI
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                              DI BAWAH AMBANG
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Rekapitulasi Jam Mengajar Dosen</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Nama Dosen</th>
                  <th className="py-3 px-4">NIDN</th>
                  <th className="py-3 px-4">Status Kepegawaian</th>
                  <th className="py-3 px-4 font-mono text-center">Kelas</th>
                  <th className="py-3 px-4 font-mono text-center">Sesi Selesai</th>
                  <th className="py-3 px-4 font-mono text-right">Jam Rencana</th>
                  <th className="py-3 px-4 font-mono text-right">Jam Realisasi</th>
                  <th className="py-3 px-4 font-mono text-right">Selisih</th>
                  <th className="py-3 px-4 font-mono text-right">% Realisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {lecturerReports.map((lec) => (
                  <tr key={lec.lecturerId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">{lec.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{lec.nidn}</td>
                    <td className="py-3 px-4 text-slate-600">{lec.employmentStatus}</td>
                    <td className="py-3 px-4 font-mono text-center">{lec.totalClassesTaught}</td>
                    <td className="py-3 px-4 font-mono text-center">{lec.totalClosedMeetings}</td>
                    <td className="py-3 px-4 font-mono text-right">{lec.plannedHours}</td>
                    <td className="py-3 px-4 font-mono text-right font-semibold text-slate-900">{lec.actualHours}</td>
                    <td className="py-3 px-4 font-mono text-right text-slate-600">
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
      )}
    </div>
  );
};
