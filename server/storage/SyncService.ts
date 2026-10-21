import { EntityName } from './IStorageProvider.js';
import { JsonStorageProvider } from './JsonStorageProvider.js';
import { PostgresStorageProvider } from './PostgresStorageProvider.js';

export type SyncStrategy = 'insert_only' | 'upsert' | 'dry_run';

export interface SyncEntityReport {
  entity: EntityName;
  sourceCount: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  conflicts: Array<{ id: string; reason: string }>;
  errors: string[];
}

export interface SyncSummaryResult {
  strategy: SyncStrategy;
  startedAt: string;
  completedAt: string;
  success: boolean;
  totalRecordsProcessed: number;
  totalImported: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  entityReports: SyncEntityReport[];
  verificationPassed: boolean;
  message: string;
}

export class SyncService {
  private jsonProvider: JsonStorageProvider;
  private postgresProvider: PostgresStorageProvider;

  // Strict dependency ordering for relational database import
  private readonly IMPORT_ORDER: EntityName[] = [
    'permissions',
    'roles',
    'users',
    'user_roles',
    'role_permissions',
    'study_programs',
    'academic_years',
    'semesters',
    'rooms',
    'system_settings',
    'lecturers',
    'students',
    'courses',
    'classes',
    'class_enrollments',
    'lecturer_assignments',
    'schedules',
    'attendance_sessions',
    'attendance_qr_tokens',
    'attendance_records',
    'attendance_status_history',
    'lecture_realizations',
    'attendance_correction_logs',
    'course_evaluations',
    'evaluation_follow_ups',
    'attendance_correction_requests',
    'audit_logs',
  ];

  constructor(jsonProvider: JsonStorageProvider, postgresProvider: PostgresStorageProvider) {
    this.jsonProvider = jsonProvider;
    this.postgresProvider = postgresProvider;
  }

  public async previewData(): Promise<{
    sourceMode: 'json';
    targetMode: 'postgres';
    targetConnected: boolean;
    entityCounts: Record<EntityName, { jsonCount: number; postgresCount: number }>;
    importOrder: EntityName[];
  }> {
    const health = await this.postgresProvider.checkHealth();
    const entityCounts: Partial<Record<EntityName, { jsonCount: number; postgresCount: number }>> = {};

    for (const entity of this.IMPORT_ORDER) {
      const jsonCount = await this.jsonProvider.count(entity);
      let postgresCount = 0;
      if (health.ok) {
        try {
          postgresCount = await this.postgresProvider.count(entity);
        } catch {
          postgresCount = 0;
        }
      }
      entityCounts[entity] = { jsonCount, postgresCount };
    }

    return {
      sourceMode: 'json',
      targetMode: 'postgres',
      targetConnected: health.ok,
      entityCounts: entityCounts as Record<EntityName, { jsonCount: number; postgresCount: number }>,
      importOrder: this.IMPORT_ORDER,
    };
  }

  public async executeSync(strategy: SyncStrategy = 'upsert'): Promise<SyncSummaryResult> {
    const startedAt = new Date().toISOString();
    const health = await this.postgresProvider.checkHealth();

    if (!health.ok && strategy !== 'dry_run') {
      return {
        strategy,
        startedAt,
        completedAt: new Date().toISOString(),
        success: false,
        totalRecordsProcessed: 0,
        totalImported: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalFailed: 0,
        entityReports: [],
        verificationPassed: false,
        message: `Koneksi PostgreSQL gagal: ${health.message}`,
      };
    }

    const entityReports: SyncEntityReport[] = [];
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalProcessed = 0;

    for (const entity of this.IMPORT_ORDER) {
      const sourceItems = await this.jsonProvider.getAll<any>(entity);
      const report: SyncEntityReport = {
        entity,
        sourceCount: sourceItems.length,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        conflicts: [],
        errors: [],
      };

      totalProcessed += sourceItems.length;

      for (const item of sourceItems) {
        if (!item) continue;
        const itemId = item.id ||
          (item.userId && item.roleId ? `${item.userId}_${item.roleId}` : null) ||
          (item.roleId && item.permissionId ? `${item.roleId}_${item.permissionId}` : null) ||
          (item.classId && item.studentId ? `${item.classId}_${item.studentId}` : null) ||
          (item.classId && item.lecturerId ? `${item.classId}_${item.lecturerId}` : null);

        if (strategy === 'dry_run') {
          // In dry run, validate integrity only
          if (!itemId) {
            report.failed++;
            report.errors.push(`Record pada ${entity} tidak memiliki ID yang valid.`);
          } else {
            report.imported++;
          }
          continue;
        }

        try {
          // Check if item already exists in target
          const existing = itemId ? await this.postgresProvider.getById(entity, itemId) : null;

          if (existing) {
            if (strategy === 'insert_only') {
              report.skipped++;
              report.conflicts.push({ id: itemId!, reason: 'Record sudah ada (Insert Only)' });
            } else if (strategy === 'upsert') {
              await this.postgresProvider.upsert(entity, item);
              report.updated++;
            }
          } else {
            await this.postgresProvider.upsert(entity, item);
            report.imported++;
          }
        } catch (err: any) {
          report.failed++;
          report.errors.push(`Gagal memproses ID ${itemId || 'unknown'} pada ${entity}: ${err.message}`);
        }
      }

      totalImported += report.imported;
      totalUpdated += report.updated;
      totalSkipped += report.skipped;
      totalFailed += report.failed;
      entityReports.push(report);
    }

    // Post-import verification
    let verificationPassed = true;
    if (strategy !== 'dry_run') {
      try {
        const userCount = await this.postgresProvider.count('users');
        const roleCount = await this.postgresProvider.count('roles');
        if (userCount === 0 || roleCount === 0) {
          verificationPassed = false;
        }
      } catch {
        verificationPassed = false;
      }
    }

    const completedAt = new Date().toISOString();
    const isSuccess = totalFailed === 0 && (strategy === 'dry_run' || verificationPassed);

    return {
      strategy,
      startedAt,
      completedAt,
      success: isSuccess,
      totalRecordsProcessed: totalProcessed,
      totalImported,
      totalUpdated,
      totalSkipped,
      totalFailed,
      entityReports,
      verificationPassed,
      message: isSuccess
        ? `Sinkronisasi berhasil diselesaikan (${strategy.toUpperCase()}). ${totalImported} baru, ${totalUpdated} diperbarui, ${totalSkipped} dilewati.`
        : `Sinkronisasi selesai dengan ${totalFailed} kesalahan. Periksa rincian laporan.`,
    };
  }
}
