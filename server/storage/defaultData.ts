import bcrypt from 'bcryptjs';

// Pre-computed bcrypt hashes for fast deterministic initialization
// admin123, kaprodi123, dosen123, mhs123
export const HASHED_PASSWORDS = {
  admin: bcrypt.hashSync('admin123', 10),
  kaprodi: bcrypt.hashSync('kaprodi123', 10),
  dosen: bcrypt.hashSync('dosen123', 10),
  mhs: bcrypt.hashSync('mhs123', 10),
};

export function getDefaultSeedData() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const permissions = [
    { id: 'perm-1', code: 'users.read', description: 'Melihat data pengguna' },
    { id: 'perm-2', code: 'users.manage', description: 'Mengelola pengguna' },
    { id: 'perm-3', code: 'roles.manage', description: 'Mengelola role dan permission' },
    { id: 'perm-4', code: 'academic_data.read', description: 'Melihat data akademik' },
    { id: 'perm-5', code: 'academic_data.manage', description: 'Mengelola data akademik' },
    { id: 'perm-6', code: 'schedules.read', description: 'Melihat jadwal kuliah' },
    { id: 'perm-7', code: 'sessions.create', description: 'Membuat sesi perkuliahan' },
    { id: 'perm-8', code: 'sessions.manage_own', description: 'Mengelola sesi milik sendiri' },
    { id: 'perm-9', code: 'attendance.scan', description: 'Melakukan scan QR absensi' },
    { id: 'perm-10', code: 'attendance.read_own', description: 'Melihat riwayat absensi pribadi' },
    { id: 'perm-11', code: 'attendance.read_scope', description: 'Melihat data absensi sesuai prodi/kelas' },
    { id: 'perm-12', code: 'attendance.correct_own_scope', description: 'Koreksi status absensi kelas sendiri' },
    { id: 'perm-13', code: 'reports.read_scope', description: 'Melihat laporan sesuai lingkup prodi/kelas' },
    { id: 'perm-14', code: 'evaluations.create', description: 'Membuat evaluasi perkuliahan' },
    { id: 'perm-15', code: 'evaluations.read_scope', description: 'Melihat evaluasi lingkup prodi' },
    { id: 'perm-16', code: 'audit.read', description: 'Melihat audit trail aktivitas' },
  ];

  const roles = [
    { id: 'role-admin', code: 'ADMINISTRATOR', name: 'Administrator Sistem', description: 'Akses penuh konfigurasi dan data master' },
    { id: 'role-kaprodi', code: 'KAPRODI', name: 'Ketua Program Studi', description: 'Monitoring, evaluasi, dan rekap prodi' },
    { id: 'role-dosen', code: 'DOSEN', name: 'Dosen Pengampu', description: 'Pembuatan sesi, QR dinamis, dan koreksi absensi' },
    { id: 'role-mhs', code: 'MAHASISWA', name: 'Mahasiswa', description: 'Scan QR dan melihat histori kehadiran pribadi' },
  ];

  const rolePermissions = [
    // Admin has all
    ...permissions.map(p => ({ roleId: 'role-admin', permissionId: p.id })),
    // Kaprodi
    { roleId: 'role-kaprodi', permissionId: 'perm-1' },
    { roleId: 'role-kaprodi', permissionId: 'perm-4' },
    { roleId: 'role-kaprodi', permissionId: 'perm-6' },
    { roleId: 'role-kaprodi', permissionId: 'perm-11' },
    { roleId: 'role-kaprodi', permissionId: 'perm-13' },
    { roleId: 'role-kaprodi', permissionId: 'perm-14' },
    { roleId: 'role-kaprodi', permissionId: 'perm-15' },
    { roleId: 'role-kaprodi', permissionId: 'perm-16' },
    // Dosen
    { roleId: 'role-dosen', permissionId: 'perm-4' },
    { roleId: 'role-dosen', permissionId: 'perm-6' },
    { roleId: 'role-dosen', permissionId: 'perm-7' },
    { roleId: 'role-dosen', permissionId: 'perm-8' },
    { roleId: 'role-dosen', permissionId: 'perm-11' },
    { roleId: 'role-dosen', permissionId: 'perm-12' },
    { roleId: 'role-dosen', permissionId: 'perm-13' },
    // Mahasiswa
    { roleId: 'role-mhs', permissionId: 'perm-6' },
    { roleId: 'role-mhs', permissionId: 'perm-9' },
    { roleId: 'role-mhs', permissionId: 'perm-10' },
  ];

  const users = [
    { id: 'u-admin', username: 'admin', passwordHash: HASHED_PASSWORDS.admin, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-kaprodi', username: 'kaprodi.ti', passwordHash: HASHED_PASSWORDS.kaprodi, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-dosen-budi', username: 'dosen.budi', passwordHash: HASHED_PASSWORDS.dosen, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-dosen-siti', username: 'dosen.siti', passwordHash: HASHED_PASSWORDS.dosen, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-mhs-1', username: '220101001', passwordHash: HASHED_PASSWORDS.mhs, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-mhs-2', username: '220101002', passwordHash: HASHED_PASSWORDS.mhs, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-mhs-3', username: '220101003', passwordHash: HASHED_PASSWORDS.mhs, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'u-mhs-4', username: '220101004', passwordHash: HASHED_PASSWORDS.mhs, status: 'ACTIVE', lastLoginAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
  ];

  const userRoles = [
    { userId: 'u-admin', roleId: 'role-admin' },
    { userId: 'u-kaprodi', roleId: 'role-kaprodi' },
    { userId: 'u-kaprodi', roleId: 'role-dosen' },
    { userId: 'u-dosen-budi', roleId: 'role-dosen' },
    { userId: 'u-dosen-siti', roleId: 'role-dosen' },
    { userId: 'u-mhs-1', roleId: 'role-mhs' },
    { userId: 'u-mhs-2', roleId: 'role-mhs' },
    { userId: 'u-mhs-3', roleId: 'role-mhs' },
    { userId: 'u-mhs-4', roleId: 'role-mhs' },
  ];

  const studyPrograms = [
    { id: 'prodi-ti', code: 'TIF', name: 'S1 Teknik Informatika', headLecturerId: 'lec-kaprodi' },
    { id: 'prodi-si', code: 'SIK', name: 'S1 Sistem Informasi', headLecturerId: null },
  ];

  const lecturers = [
    { id: 'lec-kaprodi', userId: 'u-kaprodi', nidn: '0415068001', nip: '198006152005011001', fullName: 'Dr. Eng. Ahmad Zaki, S.T., M.Kom.', studyProgramId: 'prodi-ti', employmentStatus: 'TETAP' },
    { id: 'lec-budi', userId: 'u-dosen-budi', nidn: '0420088502', nip: '198508202010121003', fullName: 'Dr. Budi Rahardjo, S.Kom., M.T.', studyProgramId: 'prodi-ti', employmentStatus: 'TETAP' },
    { id: 'lec-siti', userId: 'u-dosen-siti', nidn: '0411039003', nip: '199003112015042002', fullName: 'Siti Aminah, S.T., M.Cs.', studyProgramId: 'prodi-ti', employmentStatus: 'TETAP' },
  ];

  const students = [
    { id: 'stud-1', userId: 'u-mhs-1', nim: '220101001', fullName: 'Ahmad Fauzi', studyProgramId: 'prodi-ti', cohortYear: 2022, academicStatus: 'AKTIF' },
    { id: 'stud-2', userId: 'u-mhs-2', nim: '220101002', fullName: 'Dewi Lestari', studyProgramId: 'prodi-ti', cohortYear: 2022, academicStatus: 'AKTIF' },
    { id: 'stud-3', userId: 'u-mhs-3', nim: '220101003', fullName: 'Bambang Pamungkas', studyProgramId: 'prodi-ti', cohortYear: 2022, academicStatus: 'AKTIF' },
    { id: 'stud-4', userId: 'u-mhs-4', nim: '220101004', fullName: 'Rizky Pratama', studyProgramId: 'prodi-ti', cohortYear: 2022, academicStatus: 'AKTIF' },
  ];

  const academicYears = [
    { id: 'ay-2025', name: '2025/2026', startDate: '2025-09-01T00:00:00.000Z', endDate: '2026-08-31T23:59:59.000Z', isActive: true },
  ];

  const semesters = [
    { id: 'sem-2025-1', academicYearId: 'ay-2025', term: 'GANJIL', startDate: '2025-09-01T00:00:00.000Z', endDate: '2026-01-31T23:59:59.000Z', isActive: false },
    { id: 'sem-2025-2', academicYearId: 'ay-2025', term: 'GENAP', startDate: '2026-02-01T00:00:00.000Z', endDate: '2026-06-30T23:59:59.000Z', isActive: true },
  ];

  const courses = [
    { id: 'crs-web', code: 'TIF-301', name: 'Pemrograman Web Lanjut', creditsSks: 3, studyProgramId: 'prodi-ti' },
    { id: 'crs-db', code: 'TIF-302', name: 'Basis Data Terdistribusi', creditsSks: 3, studyProgramId: 'prodi-ti' },
    { id: 'crs-rpl', code: 'TIF-303', name: 'Rekayasa Perangkat Lunak', creditsSks: 3, studyProgramId: 'prodi-ti' },
  ];

  const classes = [
    { id: 'cls-web-a', code: 'TIF-3A', courseId: 'crs-web', semesterId: 'sem-2025-2', studyProgramId: 'prodi-ti' },
    { id: 'cls-db-b', code: 'TIF-3B', courseId: 'crs-db', semesterId: 'sem-2025-2', studyProgramId: 'prodi-ti' },
  ];

  const classEnrollments = [
    { id: 'enr-1', classId: 'cls-web-a', studentId: 'stud-1', enrollmentStatus: 'ENROLLED' },
    { id: 'enr-2', classId: 'cls-web-a', studentId: 'stud-2', enrollmentStatus: 'ENROLLED' },
    { id: 'enr-3', classId: 'cls-web-a', studentId: 'stud-3', enrollmentStatus: 'ENROLLED' },
    { id: 'enr-4', classId: 'cls-web-a', studentId: 'stud-4', enrollmentStatus: 'ENROLLED' },
    { id: 'enr-5', classId: 'cls-db-b', studentId: 'stud-1', enrollmentStatus: 'ENROLLED' },
    { id: 'enr-6', classId: 'cls-db-b', studentId: 'stud-2', enrollmentStatus: 'ENROLLED' },
  ];

  const lecturerAssignments = [
    { id: 'asg-web-budi', classId: 'cls-web-a', lecturerId: 'lec-budi', assignmentType: 'PRIMARY' },
    { id: 'asg-db-siti', classId: 'cls-db-b', lecturerId: 'lec-siti', assignmentType: 'PRIMARY' },
  ];

  const rooms = [
    { id: 'room-lab1', code: 'LAB-KOM-1', name: 'Laboratorium Komputer 1 (Gedung D Lantai 2)' },
    { id: 'room-301', code: 'R-301', name: 'Ruang Kuliah 301 (Gedung C Lantai 3)' },
  ];

  const schedules = [
    { id: 'sch-web', classId: 'cls-web-a', lecturerAssignmentId: 'asg-web-budi', roomId: 'room-lab1', dayOfWeek: 2, plannedStartTime: '08:00', plannedEndTime: '10:30' },
    { id: 'sch-db', classId: 'cls-db-b', lecturerAssignmentId: 'asg-db-siti', roomId: 'room-301', dayOfWeek: 3, plannedStartTime: '13:00', plannedEndTime: '15:30' },
  ];

  // Attendance sessions:
  // Session 1: CLOSED (Pertemuan 1 Web Lanjut)
  // Session 2: OPEN (Pertemuan 2 Web Lanjut - today!)
  // Session 3: SCHEDULED (Pertemuan 3 Web Lanjut)
  const attendanceSessions = [
    {
      id: 'sess-web-1',
      classId: 'cls-web-a',
      lecturerAssignmentId: 'asg-web-budi',
      scheduleId: 'sch-web',
      meetingNumber: 1,
      sessionDate: '2026-10-14',
      plannedStartAt: '2026-10-14T08:00:00.000Z',
      plannedEndAt: '2026-10-14T10:30:00.000Z',
      actualStartAt: '2026-10-14T08:05:00.000Z',
      actualEndAt: '2026-10-14T10:30:00.000Z',
      attendanceOpenAt: '2026-10-14T08:10:00.000Z',
      attendanceCloseAt: '2026-10-14T08:45:00.000Z',
      lateToleranceMinutes: 15,
      creditsSks: 3,
      qrIntervalSeconds: 5,
      status: 'CLOSED',
      topic: 'Pengantar Arsitektur Modern Full-Stack & REST API',
      cancellationReason: null,
      createdBy: 'u-dosen-budi',
      createdAt: '2026-10-14T07:50:00.000Z',
      updatedAt: '2026-10-14T10:35:00.000Z'
    },
    {
      id: 'sess-web-2',
      classId: 'cls-web-a',
      lecturerAssignmentId: 'asg-web-budi',
      scheduleId: 'sch-web',
      meetingNumber: 2,
      sessionDate: todayStr,
      plannedStartAt: `${todayStr}T08:00:00.000Z`,
      plannedEndAt: `${todayStr}T10:30:00.000Z`,
      actualStartAt: `${todayStr}T08:00:00.000Z`,
      actualEndAt: null,
      attendanceOpenAt: `${todayStr}T08:05:00.000Z`,
      attendanceCloseAt: `${todayStr}T09:30:00.000Z`,
      lateToleranceMinutes: 15,
      creditsSks: 3,
      qrIntervalSeconds: 5,
      status: 'OPEN',
      topic: 'Implementasi PostgreSQL ORM, Validasi Skema, & Transaksi',
      cancellationReason: null,
      createdBy: 'u-dosen-budi',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'sess-web-3',
      classId: 'cls-web-a',
      lecturerAssignmentId: 'asg-web-budi',
      scheduleId: 'sch-web',
      meetingNumber: 3,
      sessionDate: '2026-10-28',
      plannedStartAt: '2026-10-28T08:00:00.000Z',
      plannedEndAt: '2026-10-28T10:30:00.000Z',
      actualStartAt: null,
      actualEndAt: null,
      attendanceOpenAt: null,
      attendanceCloseAt: null,
      lateToleranceMinutes: 15,
      creditsSks: 3,
      qrIntervalSeconds: 5,
      status: 'SCHEDULED',
      topic: 'Autentikasi Aman, JWT Bearer Token, dan RBAC Middleware',
      cancellationReason: null,
      createdBy: 'u-dosen-budi',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  const lectureRealizations = [
    {
      id: 'real-web-1',
      sessionId: 'sess-web-1',
      actualStartAt: '2026-10-14T08:05:00.000Z',
      actualEndAt: '2026-10-14T10:30:00.000Z',
      topic: 'Pengantar Arsitektur Modern Full-Stack & REST API',
      realizationNotes: 'Materi pengantar disampaikan lancar. Diskusi arsitektur microservices dan monolitik modular.',
      submittedBy: 'u-dosen-budi',
      submittedAt: '2026-10-14T10:35:00.000Z'
    }
  ];

  const attendanceRecords = [
    // Session 1 records
    { id: 'rec-1', sessionId: 'sess-web-1', studentId: 'stud-1', status: 'HADIR', scannedAt: '2026-10-14T08:12:00.000Z', recordedAt: '2026-10-14T08:12:00.000Z', source: 'QR_SCAN', updatedAt: '2026-10-14T08:12:00.000Z' },
    { id: 'rec-2', sessionId: 'sess-web-1', studentId: 'stud-2', status: 'TERLAMBAT', scannedAt: '2026-10-14T08:28:00.000Z', recordedAt: '2026-10-14T08:28:00.000Z', source: 'QR_SCAN', updatedAt: '2026-10-14T08:28:00.000Z' },
    { id: 'rec-3', sessionId: 'sess-web-1', studentId: 'stud-3', status: 'IZIN', scannedAt: null, recordedAt: '2026-10-14T08:15:00.000Z', source: 'MANUAL_ENTRY', updatedAt: '2026-10-14T08:15:00.000Z' },
    { id: 'rec-4', sessionId: 'sess-web-1', studentId: 'stud-4', status: 'ALPA', scannedAt: null, recordedAt: '2026-10-14T08:45:00.000Z', source: 'SYSTEM_RECONCILE', updatedAt: '2026-10-14T08:45:00.000Z' },
    // Session 2 initial record (Dewi already scanned, others not yet)
    { id: 'rec-5', sessionId: 'sess-web-2', studentId: 'stud-2', status: 'HADIR', scannedAt: `${todayStr}T08:08:10.000Z`, recordedAt: `${todayStr}T08:08:10.000Z`, source: 'QR_SCAN', updatedAt: `${todayStr}T08:08:10.000Z` },
  ];

  const attendanceCorrectionLogs = [
    {
      id: 'corr-1',
      attendanceRecordId: 'rec-3',
      oldStatus: 'ALPA',
      newStatus: 'IZIN',
      reason: 'Surat izin resmi dispensasi delegasi lomba karya tulis ilmiah tingkat nasional terverifikasi',
      changedBy: 'u-dosen-budi',
      changedAt: '2026-10-14T09:00:00.000Z'
    }
  ];

  const attendanceStatusHistory = [
    {
      id: 'hist-1',
      attendanceRecordId: 'rec-3',
      oldStatus: 'ALPA',
      newStatus: 'IZIN',
      reason: 'Surat izin dispensasi delegasi lomba karya tulis',
      changedBy: 'u-dosen-budi',
      changedAt: '2026-10-14T09:00:00.000Z'
    }
  ];

  const courseEvaluations = [
    {
      id: 'eval-1',
      studyProgramId: 'prodi-ti',
      lecturerId: 'lec-budi',
      classId: 'cls-web-a',
      sessionId: 'sess-web-1',
      evaluatorId: 'u-kaprodi',
      evaluationType: 'PERIODIK',
      findings: 'Realisasi pertemuan minggu ke-1 berjalan baik dan tepat waktu. Seluruh bahan ajar telah dibagikan di portal.',
      followUpDeadline: '2026-10-30T23:59:59.000Z',
      status: 'OPEN',
      createdAt: '2026-10-15T09:00:00.000Z'
    }
  ];

  const evaluationFollowUps = [
    {
      id: 'fup-1',
      evaluationId: 'eval-1',
      response: 'Terima kasih atas masukannya. RPS dan repositori starter code praktikum telah diunggah ke repositori kampus.',
      submittedBy: 'u-dosen-budi',
      submittedAt: '2026-10-16T10:00:00.000Z',
      status: 'SUBMITTED'
    }
  ];

  const auditLogs = [
    {
      id: 'audit-1',
      actorUserId: 'u-admin',
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'SYSTEM',
      entityId: 'SYSTEM',
      reason: 'Inisialisasi sistem perdana SIAP-KULIAH',
      beforeData: null,
      afterData: JSON.stringify({ mode: 'json_fallback', status: 'ready' }),
      requestId: 'boot-001',
      createdAt: now.toISOString()
    }
  ];

  const systemSettings = [
    { id: 'set-1', settingKey: 'default_attendance_min_percentage', settingValue: '75', updatedBy: 'u-admin', updatedAt: now.toISOString() },
    { id: 'set-2', settingKey: 'default_qr_interval_seconds', settingValue: '5', updatedBy: 'u-admin', updatedAt: now.toISOString() },
    { id: 'set-3', settingKey: 'default_late_tolerance_minutes', settingValue: '15', updatedBy: 'u-admin', updatedAt: now.toISOString() },
    { id: 'set-4', settingKey: 'sks_minutes_per_credit', settingValue: '50', updatedBy: 'u-admin', updatedAt: now.toISOString() },
    { id: 'set-5', settingKey: 'institution_name', settingValue: 'Universitas Teknologi Nusantara', updatedBy: 'u-admin', updatedAt: now.toISOString() },
  ];

  const attendanceCorrectionRequests = [
    {
      id: 'req-1',
      attendanceRecordId: 'rec-4',
      studentUserId: 'u-mhs-4',
      requestedStatus: 'SAKIT',
      reason: 'Surat keterangan dokter rawat jalan terlampir karena demam tinggi pada tanggal 14 Oktober',
      attachmentUrl: '/uploads/surat-dokter-rizky.pdf',
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: '2026-10-14T12:30:00.000Z'
    }
  ];

  return {
    permissions,
    roles,
    role_permissions: rolePermissions,
    users,
    user_roles: userRoles,
    study_programs: studyPrograms,
    lecturers,
    students,
    academic_years: academicYears,
    semesters,
    courses,
    classes,
    class_enrollments: classEnrollments,
    lecturer_assignments: lecturerAssignments,
    rooms,
    schedules,
    attendance_sessions: attendanceSessions,
    attendance_qr_tokens: [] as any[],
    attendance_records: attendanceRecords,
    attendance_status_history: attendanceStatusHistory,
    lecture_realizations: lectureRealizations,
    attendance_correction_logs: attendanceCorrectionLogs,
    course_evaluations: courseEvaluations,
    evaluation_follow_ups: evaluationFollowUps,
    audit_logs: auditLogs,
    system_settings: systemSettings,
    attendance_correction_requests: attendanceCorrectionRequests
  };
}
