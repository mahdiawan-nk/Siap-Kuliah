import { StorageManager } from '../storage/StorageManager.js';
import { 
  Class, Course, Student, AttendanceSession, AttendanceRecord, 
  ClassEnrollment, Lecturer, LecturerAssignment, LectureRealization, AuthUserPayload 
} from '../types/entities.js';

export class ReportService {
  private static instance: ReportService;

  private constructor() {}

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  public async getAttendanceReport(filters: { classId?: string; studyProgramId?: string }, currentUser: AuthUserPayload) {
    const storage = StorageManager.getInstance().getStorage();
    const minPctSetting = await storage.findOne<any>('system_settings', s => s.settingKey === 'default_attendance_min_percentage');
    const minAttendancePct = minPctSetting ? parseFloat(minPctSetting.settingValue) : 75;

    let classes = await storage.getAll<Class>('classes');
    if (filters.classId) {
      classes = classes.filter(c => c.id === filters.classId);
    }
    if (filters.studyProgramId) {
      classes = classes.filter(c => c.studyProgramId === filters.studyProgramId);
    }

    const allCourses = await storage.getAll<Course>('courses');
    const allStudents = await storage.getAll<Student>('students');
    const allSessions = await storage.getAll<AttendanceSession>('attendance_sessions');
    const allRecords = await storage.getAll<AttendanceRecord>('attendance_records');
    const allEnrollments = await storage.getAll<ClassEnrollment>('class_enrollments');

    const reports = [];

    for (const cls of classes) {
      const course = allCourses.find(c => c.id === cls.courseId);
      const sessions = allSessions.filter(s => s.classId === cls.id && s.status !== 'CANCELLED');
      const closedSessions = sessions.filter(s => s.status === 'CLOSED');
      const totalSessionsCount = sessions.length;
      const closedSessionsCount = closedSessions.length;

      const enrollments = allEnrollments.filter(e => e.classId === cls.id);
      const studentRecaps = enrollments.map(e => {
        const student = allStudents.find(s => s.id === e.studentId);
        const myRecords = allRecords.filter(r => r.studentId === e.studentId && closedSessions.some(s => s.id === r.sessionId));

        const hadir = myRecords.filter(r => r.status === 'HADIR').length;
        const terlambat = myRecords.filter(r => r.status === 'TERLAMBAT').length;
        const izin = myRecords.filter(r => r.status === 'IZIN').length;
        const sakit = myRecords.filter(r => r.status === 'SAKIT').length;
        const alpa = myRecords.filter(r => r.status === 'ALPA').length;

        // Effective attendance weight: Hadir = 100%, Terlambat = 100% attendance credit (flagged), Izin/Sakit recorded separately
        const totalAttended = hadir + terlambat;
        const percentage = closedSessionsCount > 0 
          ? Math.round((totalAttended / closedSessionsCount) * 1000) / 10 
          : 100;

        return {
          studentId: e.studentId,
          nim: student?.nim || '-',
          fullName: student?.fullName || '-',
          hadir,
          terlambat,
          izin,
          sakit,
          alpa,
          totalAttended,
          percentage,
          meetsThreshold: percentage >= minAttendancePct,
        };
      });

      const avgClassPct = studentRecaps.length > 0
        ? Math.round((studentRecaps.reduce((acc, curr) => acc + curr.percentage, 0) / studentRecaps.length) * 10) / 10
        : 100;

      reports.push({
        classId: cls.id,
        classCode: cls.code,
        courseCode: course?.code || '',
        courseName: course?.name || '',
        creditsSks: course?.creditsSks || 3,
        totalPlannedSessions: 16,
        totalCreatedSessions: totalSessionsCount,
        totalClosedSessions: closedSessionsCount,
        minAttendanceThreshold: minAttendancePct,
        averageAttendancePercentage: avgClassPct,
        studentsCount: enrollments.length,
        studentRecaps,
      });
    }

    return reports;
  }

  public async getLecturerRealizationReport(filters: { studyProgramId?: string }, currentUser: AuthUserPayload) {
    const storage = StorageManager.getInstance().getStorage();
    const lecturers = await storage.getAll<Lecturer>('lecturers');
    const assignments = await storage.getAll<LecturerAssignment>('lecturer_assignments');
    const classes = await storage.getAll<Class>('classes');
    const courses = await storage.getAll<Course>('courses');
    const sessions = await storage.getAll<AttendanceSession>('attendance_sessions');
    const realizations = await storage.getAll<LectureRealization>('lecture_realizations');

    const result = [];

    for (const lec of lecturers) {
      if (filters.studyProgramId && lec.studyProgramId !== filters.studyProgramId) {
        continue;
      }

      const myAssignments = assignments.filter(a => a.lecturerId === lec.id);
      const classIds = myAssignments.map(a => a.classId);
      const myClasses = classes.filter(c => classIds.includes(c.id));
      const mySessions = sessions.filter(s => classIds.includes(s.classId) && s.status !== 'CANCELLED');
      const closedSessions = mySessions.filter(s => s.status === 'CLOSED');

      let plannedMinutes = 0;
      let actualMinutes = 0;

      for (const sess of closedSessions) {
        // Planned duration
        const plannedDuration = (new Date(sess.plannedEndAt).getTime() - new Date(sess.plannedStartAt).getTime()) / (1000 * 60);
        plannedMinutes += plannedDuration > 0 ? plannedDuration : (sess.creditsSks * 50);

        // Actual duration
        const real = realizations.find(r => r.sessionId === sess.id);
        if (real && real.actualStartAt && real.actualEndAt) {
          const actualDuration = (new Date(real.actualEndAt).getTime() - new Date(real.actualStartAt).getTime()) / (1000 * 60);
          actualMinutes += Math.max(0, actualDuration);
        } else if (sess.actualStartAt && sess.actualEndAt) {
          const actualDuration = (new Date(sess.actualEndAt).getTime() - new Date(sess.actualStartAt).getTime()) / (1000 * 60);
          actualMinutes += Math.max(0, actualDuration);
        } else {
          actualMinutes += plannedDuration;
        }
      }

      const plannedHours = Math.round((plannedMinutes / 60) * 10) / 10;
      const actualHours = Math.round((actualMinutes / 60) * 10) / 10;
      const differenceHours = Math.round((actualHours - plannedHours) * 10) / 10;
      const realizationPct = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 1000) / 10 : 100;

      result.push({
        lecturerId: lec.id,
        fullName: lec.fullName,
        nidn: lec.nidn || '-',
        nip: lec.nip || '-',
        employmentStatus: lec.employmentStatus,
        totalClassesTaught: myClasses.length,
        totalClosedMeetings: closedSessions.length,
        plannedHours,
        actualHours,
        differenceHours,
        realizationPercentage: realizationPct,
      });
    }

    return result;
  }

  public async getKaprodiMonitoringOverview(studyProgramId: string) {
    const storage = StorageManager.getInstance().getStorage();
    const lecturers = await storage.find<Lecturer>('lecturers', l => l.studyProgramId === studyProgramId);
    const students = await storage.find<Student>('students', s => s.studyProgramId === studyProgramId);
    const classes = await storage.find<Class>('classes', c => c.studyProgramId === studyProgramId);
    const courses = await storage.find<Course>('courses', c => c.studyProgramId === studyProgramId);
    
    const classIds = new Set(classes.map(c => c.id));
    const allSessions = await storage.getAll<AttendanceSession>('attendance_sessions');
    const prodiSessions = allSessions.filter(s => classIds.has(s.classId) && s.status !== 'CANCELLED');
    const closedSessions = prodiSessions.filter(s => s.status === 'CLOSED');
    const openSessions = prodiSessions.filter(s => s.status === 'OPEN');
    const scheduledSessions = prodiSessions.filter(s => s.status === 'SCHEDULED');

    // Total planned for semester is 16 meetings per class
    const totalPlannedTarget = classes.length * 16;
    const totalRealized = closedSessions.length;
    const realizationPercentage = totalPlannedTarget > 0 ? Math.round((totalRealized / totalPlannedTarget) * 1000) / 10 : 0;

    // Check attendance records for low attendance alerts
    const allRecords = await storage.getAll<AttendanceRecord>('attendance_records');
    const closedSessionIds = new Set(closedSessions.map(s => s.id));
    const prodiRecords = allRecords.filter(r => closedSessionIds.has(r.sessionId));

    const corrections = await storage.getAll<any>('attendance_correction_logs');

    return {
      totalLecturers: lecturers.length,
      totalStudents: students.length,
      totalCourses: courses.length,
      totalClasses: classes.length,
      totalPlannedTarget,
      totalRealized,
      realizationPercentage,
      activeOpenSessions: openSessions.length,
      unexecutedSessions: scheduledSessions.length,
      totalCorrectionsLogged: corrections.length,
    };
  }

  public generateCsvExport(data: any[], headers: { key: string; label: string }[]): string {
    const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => {
      return headers.map(h => {
        const val = row[h.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    return [headerRow, ...rows].join('\n');
  }
}
