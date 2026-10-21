import {
  User, Role, Permission, UserRole, RolePermission, StudyProgram,
  Lecturer, Student, AcademicYear, Semester, Course, Class,
  ClassEnrollment, LecturerAssignment, Room, Schedule,
  AttendanceSession, AttendanceQrToken, AttendanceRecord,
  AttendanceStatusHistory, LectureRealization, AttendanceCorrectionLog,
  CourseEvaluation, EvaluationFollowUp, AuditLog, SystemSetting,
  AttendanceCorrectionRequest
} from '../types/entities.js';

export type EntityName =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'user_roles'
  | 'role_permissions'
  | 'study_programs'
  | 'lecturers'
  | 'students'
  | 'academic_years'
  | 'semesters'
  | 'courses'
  | 'classes'
  | 'class_enrollments'
  | 'lecturer_assignments'
  | 'rooms'
  | 'schedules'
  | 'attendance_sessions'
  | 'attendance_qr_tokens'
  | 'attendance_records'
  | 'attendance_status_history'
  | 'lecture_realizations'
  | 'attendance_correction_logs'
  | 'course_evaluations'
  | 'evaluation_follow_ups'
  | 'audit_logs'
  | 'system_settings'
  | 'attendance_correction_requests';

export interface StorageStats {
  mode: 'json' | 'postgres';
  connected: boolean;
  counts: Record<EntityName, number>;
  lastSyncAt?: string | null;
  storagePath?: string;
  databaseUrlMasked?: string;
}

export interface IStorageProvider {
  readonly mode: 'json' | 'postgres';
  initialize(): Promise<void>;
  checkHealth(): Promise<{ ok: boolean; message: string; latencyMs?: number }>;

  // Generic Entity Access
  getAll<T = any>(entity: EntityName): Promise<T[]>;
  getById<T = any>(entity: EntityName, id: string): Promise<T | null>;
  find<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T[]>;
  findOne<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T | null>;
  create<T = any>(entity: EntityName, item: Partial<T> & Record<string, any>): Promise<T>;
  update<T = any>(entity: EntityName, id: string, patch: Partial<T> & Record<string, any>): Promise<T | null>;
  delete(entity: EntityName, id: string): Promise<boolean>;
  upsert<T extends { id?: string }>(entity: EntityName, item: T): Promise<T>;

  // Atomic batch write / transaction
  transaction<R>(fn: (provider: IStorageProvider) => Promise<R>): Promise<R>;

  // Count
  count(entity: EntityName): Promise<number>;
  getAllCounts(): Promise<Record<EntityName, number>>;
}
