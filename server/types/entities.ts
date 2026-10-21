/**
 * SIAP-KULIAH — TypeScript Entity Definitions
 * Matching all 26+ database tables and relations
 */

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type RoleCode = 'ADMINISTRATOR' | 'KAPRODI' | 'DOSEN' | 'MAHASISWA';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface StudyProgram {
  id: string;
  code: string;
  name: string;
  headLecturerId?: string | null;
}

export type EmploymentStatus = 'TETAP' | 'KONTRAK' | 'LUAR_BIASA';

export interface Lecturer {
  id: string;
  userId: string;
  nidn: string | null;
  nip: string | null;
  fullName: string;
  studyProgramId: string;
  employmentStatus: EmploymentStatus;
}

export type AcademicStatus = 'AKTIF' | 'CUTI' | 'LULUS' | 'NON_AKTIF';

export interface Student {
  id: string;
  userId: string;
  nim: string;
  fullName: string;
  studyProgramId: string;
  cohortYear: number;
  academicStatus: AcademicStatus;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type SemesterTerm = 'GANJIL' | 'GENAP' | 'PENDEK';

export interface Semester {
  id: string;
  academicYearId: string;
  term: SemesterTerm;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  creditsSks: number;
  studyProgramId: string;
}

export interface Class {
  id: string;
  code: string;
  courseId: string;
  semesterId: string;
  studyProgramId: string;
}

export type EnrollmentStatus = 'ENROLLED' | 'DROPPED' | 'AUDIT';

export interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
  enrollmentStatus: EnrollmentStatus;
}

export type LecturerAssignmentType = 'PRIMARY' | 'TEAM_TEACHING' | 'ASISTEN';

export interface LecturerAssignment {
  id: string;
  classId: string;
  lecturerId: string;
  assignmentType: LecturerAssignmentType;
}

export interface Room {
  id: string;
  code: string;
  name: string;
}

export interface Schedule {
  id: string;
  classId: string;
  lecturerAssignmentId: string;
  roomId: string;
  dayOfWeek: number; // 1 = Senin, ..., 7 = Minggu
  plannedStartTime: string; // HH:mm
  plannedEndTime: string;   // HH:mm
}

export type SessionStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'CANCELLED';

export interface AttendanceSession {
  id: string;
  classId: string;
  lecturerAssignmentId: string;
  scheduleId?: string | null;
  meetingNumber: number;
  sessionDate: string; // YYYY-MM-DD
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  attendanceOpenAt?: string | null;
  attendanceCloseAt?: string | null;
  lateToleranceMinutes: number;
  creditsSks: number;
  qrIntervalSeconds: number; // 5 - 60
  status: SessionStatus;
  topic: string;
  cancellationReason?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceQrToken {
  id: string;
  sessionId: string;
  tokenHash: string;
  tokenPlain?: string; // only returned in ephemeral live QR feed
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
}

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA';
export type AttendanceSource = 'QR_SCAN' | 'MANUAL_ENTRY' | 'SYSTEM_RECONCILE' | 'CORRECTION';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt?: string | null;
  recordedAt: string;
  source: AttendanceSource;
  updatedAt: string;
}

export interface AttendanceStatusHistory {
  id: string;
  attendanceRecordId: string;
  oldStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface LectureRealization {
  id: string;
  sessionId: string;
  actualStartAt: string;
  actualEndAt: string;
  topic: string;
  realizationNotes?: string | null;
  submittedBy: string;
  submittedAt: string;
}

export interface AttendanceCorrectionLog {
  id: string;
  attendanceRecordId: string;
  oldStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export type EvaluationType = 'JADWAL_TERLAMBAT' | 'KEHADIRAN_RENDAH' | 'MATERI_BELUM_SESUAI' | 'PERIODIK';
export type EvaluationStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface CourseEvaluation {
  id: string;
  studyProgramId: string;
  lecturerId: string;
  classId: string;
  sessionId?: string | null;
  evaluatorId: string;
  evaluationType: EvaluationType;
  findings: string;
  followUpDeadline?: string | null;
  status: EvaluationStatus;
  createdAt: string;
}

export interface EvaluationFollowUp {
  id: string;
  evaluationId: string;
  response: string;
  submittedBy: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  beforeData?: string | null;
  afterData?: string | null;
  requestId?: string | null;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  attendanceRecordId: string;
  studentUserId: string;
  requestedStatus: 'HADIR' | 'IZIN' | 'SAKIT';
  reason: string;
  attachmentUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
}

// Auth payload
export interface AuthUserPayload {
  userId: string;
  username: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
  studentId?: string;
  lecturerId?: string;
  studyProgramId?: string;
}
