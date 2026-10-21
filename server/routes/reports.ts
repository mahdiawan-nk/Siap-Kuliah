import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission, enforceScope } from '../middlewares/rbac.js';
import { ReportService } from '../services/ReportService.js';

const router = Router();
const reportService = ReportService.getInstance();

router.use(authenticate);

// GET /api/v1/reports/attendance
router.get('/attendance', requirePermission('reports.read_scope'), enforceScope, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      classId: req.query.classId as string,
      studyProgramId: (req.query.studyProgramId as string) || req.user?.studyProgramId,
    };
    const report = await reportService.getAttendanceReport(filters, req.user!);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/lecturer-realization
router.get('/lecturer-realization', requirePermission('reports.read_scope'), enforceScope, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      studyProgramId: (req.query.studyProgramId as string) || req.user?.studyProgramId,
    };
    const report = await reportService.getLecturerRealizationReport(filters, req.user!);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/kaprodi-overview
router.get('/kaprodi-overview', requirePermission('evaluations.read_scope'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studyProgramId = (req.query.studyProgramId as string) || req.user?.studyProgramId || 'prodi-ti';
    const overview = await reportService.getKaprodiMonitoringOverview(studyProgramId);
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/export-csv
router.get('/export-csv', requirePermission('reports.read_scope'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = req.query.type as string; // 'attendance' or 'lecturer'
    let csvData = '';
    let filename = `siap-kuliah-laporan-${Date.now()}.csv`;

    if (type === 'lecturer') {
      const data = await reportService.getLecturerRealizationReport({}, req.user!);
      csvData = reportService.generateCsvExport(data, [
        { key: 'fullName', label: 'Nama Dosen' },
        { key: 'nidn', label: 'NIDN' },
        { key: 'nip', label: 'NIP' },
        { key: 'employmentStatus', label: 'Status Kepegawaian' },
        { key: 'totalClosedMeetings', label: 'Pertemuan Selesai' },
        { key: 'plannedHours', label: 'Jam Rencana (Jam)' },
        { key: 'actualHours', label: 'Jam Realisasi (Jam)' },
        { key: 'differenceHours', label: 'Selisih (Jam)' },
        { key: 'realizationPercentage', label: 'Persentase Realisasi (%)' },
      ]);
      filename = `siap-kuliah-realisasi-dosen-${Date.now()}.csv`;
    } else {
      const classReports = await reportService.getAttendanceReport({}, req.user!);
      const flattenedStudents: any[] = [];
      for (const cr of classReports) {
        for (const s of cr.studentRecaps) {
          flattenedStudents.push({
            classCode: cr.classCode,
            courseName: cr.courseName,
            nim: s.nim,
            fullName: s.fullName,
            hadir: s.hadir,
            terlambat: s.terlambat,
            izin: s.izin,
            sakit: s.sakit,
            alpa: s.alpa,
            totalAttended: s.totalAttended,
            percentage: s.percentage,
            statusKelulusanPresensi: s.meetsThreshold ? 'MEMENUHI' : 'DI_BAWAH_AMBANG',
          });
        }
      }
      csvData = reportService.generateCsvExport(flattenedStudents, [
        { key: 'classCode', label: 'Kode Kelas' },
        { key: 'courseName', label: 'Mata Kuliah' },
        { key: 'nim', label: 'NIM' },
        { key: 'fullName', label: 'Nama Mahasiswa' },
        { key: 'hadir', label: 'Hadir' },
        { key: 'terlambat', label: 'Terlambat' },
        { key: 'izin', label: 'Izin' },
        { key: 'sakit', label: 'Sakit' },
        { key: 'alpa', label: 'Alpa' },
        { key: 'totalAttended', label: 'Total Kehadiran' },
        { key: 'percentage', label: 'Persentase Kehadiran (%)' },
        { key: 'statusKelulusanPresensi', label: 'Status Ambang Kehadiran' },
      ]);
      filename = `siap-kuliah-rekap-absensi-${Date.now()}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvData); // Add UTF-8 BOM for Excel compatibility
  } catch (err) {
    next(err);
  }
});

export default router;
