-- SIAP-KULIAH: Database Initialization Migration
-- Dialect: PostgreSQL

-- 1. users
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3) WITH TIME ZONE,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. roles
CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- 3. permissions
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "description" TEXT
);

-- 4. user_roles
CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    PRIMARY KEY ("user_id", "role_id"),
    CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

-- 5. role_permissions
CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    PRIMARY KEY ("role_id", "permission_id"),
    CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

-- 6. study_programs
CREATE TABLE IF NOT EXISTS "study_programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "head_lecturer_id" TEXT
);

-- 7. lecturers
CREATE TABLE IF NOT EXISTS "lecturers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL UNIQUE,
    "nidn" TEXT UNIQUE,
    "nip" TEXT UNIQUE,
    "full_name" TEXT NOT NULL,
    "study_program_id" TEXT NOT NULL,
    "employment_status" TEXT NOT NULL DEFAULT 'TETAP',
    CONSTRAINT "fk_lecturers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_lecturers_study_program" FOREIGN KEY ("study_program_id") REFERENCES "study_programs"("id")
);

-- 8. students
CREATE TABLE IF NOT EXISTS "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL UNIQUE,
    "nim" TEXT NOT NULL UNIQUE,
    "full_name" TEXT NOT NULL,
    "study_program_id" TEXT NOT NULL,
    "cohort_year" INTEGER NOT NULL,
    "academic_status" TEXT NOT NULL DEFAULT 'AKTIF',
    CONSTRAINT "fk_students_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_students_study_program" FOREIGN KEY ("study_program_id") REFERENCES "study_programs"("id")
);

-- 9. academic_years
CREATE TABLE IF NOT EXISTS "academic_years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "end_date" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false
);

-- 10. semesters
CREATE TABLE IF NOT EXISTS "semesters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academic_year_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "end_date" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "fk_semesters_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE
);

-- 11. courses
CREATE TABLE IF NOT EXISTS "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "credits_sks" INTEGER NOT NULL CHECK ("credits_sks" > 0 AND "credits_sks" <= 12),
    "study_program_id" TEXT NOT NULL,
    CONSTRAINT "fk_courses_study_program" FOREIGN KEY ("study_program_id") REFERENCES "study_programs"("id")
);

-- 12. classes
CREATE TABLE IF NOT EXISTS "classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "study_program_id" TEXT NOT NULL,
    CONSTRAINT "uq_class_code_course_semester" UNIQUE ("code", "course_id", "semester_id"),
    CONSTRAINT "fk_classes_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id"),
    CONSTRAINT "fk_classes_semester" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id"),
    CONSTRAINT "fk_classes_study_program" FOREIGN KEY ("study_program_id") REFERENCES "study_programs"("id")
);

-- 13. class_enrollments
CREATE TABLE IF NOT EXISTS "class_enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "enrollment_status" TEXT NOT NULL DEFAULT 'ENROLLED',
    CONSTRAINT "uq_class_student" UNIQUE ("class_id", "student_id"),
    CONSTRAINT "fk_enrollment_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_enrollment_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
);

-- 14. lecturer_assignments
CREATE TABLE IF NOT EXISTS "lecturer_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "class_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'PRIMARY',
    CONSTRAINT "uq_assignment_class_lecturer" UNIQUE ("class_id", "lecturer_id"),
    CONSTRAINT "fk_assignment_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_assignment_lecturer" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id") ON DELETE CASCADE
);

-- 15. rooms
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL
);

-- 16. schedules
CREATE TABLE IF NOT EXISTS "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "class_id" TEXT NOT NULL,
    "lecturer_assignment_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL CHECK ("day_of_week" BETWEEN 1 AND 7),
    "planned_start_time" TEXT NOT NULL,
    "planned_end_time" TEXT NOT NULL,
    CONSTRAINT "fk_schedules_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_schedules_assignment" FOREIGN KEY ("lecturer_assignment_id") REFERENCES "lecturer_assignments"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_schedules_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
);

-- 17. attendance_sessions
CREATE TABLE IF NOT EXISTS "attendance_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "class_id" TEXT NOT NULL,
    "lecturer_assignment_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "meeting_number" INTEGER NOT NULL CHECK ("meeting_number" > 0 AND "meeting_number" <= 32),
    "session_date" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "planned_start_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "planned_end_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "actual_start_at" TIMESTAMP(3) WITH TIME ZONE,
    "actual_end_at" TIMESTAMP(3) WITH TIME ZONE,
    "attendance_open_at" TIMESTAMP(3) WITH TIME ZONE,
    "attendance_close_at" TIMESTAMP(3) WITH TIME ZONE,
    "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 15,
    "credits_sks" INTEGER NOT NULL,
    "qr_interval_seconds" INTEGER NOT NULL DEFAULT 5 CHECK ("qr_interval_seconds" BETWEEN 5 AND 60),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "topic" TEXT NOT NULL,
    "cancellation_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_sessions_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id"),
    CONSTRAINT "fk_sessions_assignment" FOREIGN KEY ("lecturer_assignment_id") REFERENCES "lecturer_assignments"("id"),
    CONSTRAINT "fk_sessions_schedule" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id"),
    CONSTRAINT "fk_sessions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "idx_sessions_class_date" ON "attendance_sessions"("class_id", "session_date");
CREATE INDEX IF NOT EXISTS "idx_sessions_status" ON "attendance_sessions"("status");

-- 18. attendance_qr_tokens
CREATE TABLE IF NOT EXISTS "attendance_qr_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "expires_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "revoked_at" TIMESTAMP(3) WITH TIME ZONE,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_qr_tokens_session" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_qr_tokens_session_expiry" ON "attendance_qr_tokens"("session_id", "expires_at");

-- 19. attendance_records
CREATE TABLE IF NOT EXISTS "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ALPA',
    "scanned_at" TIMESTAMP(3) WITH TIME ZONE,
    "recorded_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'QR_SCAN',
    "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_attendance_session_student" UNIQUE ("session_id", "student_id"),
    CONSTRAINT "fk_attendance_session" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_attendance_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_attendance_session_status" ON "attendance_records"("session_id", "status");
CREATE INDEX IF NOT EXISTS "idx_attendance_student" ON "attendance_records"("student_id");

-- 20. attendance_status_history
CREATE TABLE IF NOT EXISTS "attendance_status_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendance_record_id" TEXT NOT NULL,
    "old_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_history_record" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_history_changer" FOREIGN KEY ("changed_by") REFERENCES "users"("id")
);

-- 21. lecture_realizations
CREATE TABLE IF NOT EXISTS "lecture_realizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL UNIQUE,
    "actual_start_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "actual_end_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "topic" TEXT NOT NULL,
    "realization_notes" TEXT,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_realization_session" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_realization_submitter" FOREIGN KEY ("submitted_by") REFERENCES "users"("id")
);

-- 22. attendance_correction_logs
CREATE TABLE IF NOT EXISTS "attendance_correction_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendance_record_id" TEXT NOT NULL,
    "old_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_correction_record" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_correction_changer" FOREIGN KEY ("changed_by") REFERENCES "users"("id")
);

-- 23. course_evaluations
CREATE TABLE IF NOT EXISTS "course_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "study_program_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "session_id" TEXT,
    "evaluator_id" TEXT NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "follow_up_deadline" TIMESTAMP(3) WITH TIME ZONE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_eval_program" FOREIGN KEY ("study_program_id") REFERENCES "study_programs"("id"),
    CONSTRAINT "fk_eval_lecturer" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id"),
    CONSTRAINT "fk_eval_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id"),
    CONSTRAINT "fk_eval_session" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id"),
    CONSTRAINT "fk_eval_evaluator" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id")
);

-- 24. evaluation_follow_ups
CREATE TABLE IF NOT EXISTS "evaluation_follow_ups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluation_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    CONSTRAINT "fk_followup_eval" FOREIGN KEY ("evaluation_id") REFERENCES "course_evaluations"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_followup_submitter" FOREIGN KEY ("submitted_by") REFERENCES "users"("id")
);

-- 25. audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "reason" TEXT,
    "before_data" TEXT,
    "after_data" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_audit_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_created" ON "audit_logs"("created_at");

-- 26. system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setting_key" TEXT NOT NULL UNIQUE,
    "setting_value" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_settings_updater" FOREIGN KEY ("updated_by") REFERENCES "users"("id")
);

-- 27. attendance_correction_requests
CREATE TABLE IF NOT EXISTS "attendance_correction_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendance_record_id" TEXT NOT NULL,
    "student_user_id" TEXT NOT NULL,
    "requested_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3) WITH TIME ZONE,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_req_record" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_req_student" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_req_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
);
