import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { IStorageProvider, EntityName } from './IStorageProvider.js';

const { Pool } = pg;

// Mapping of camelCase object properties to snake_case column names
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function mapRowToEntity<T = any>(row: any): T {
  if (!row) return row;
  const mapped: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = toCamelCase(key);
    // Convert Dates to ISO strings for consistency
    if (value instanceof Date) {
      mapped[camel] = value.toISOString();
    } else {
      mapped[camel] = value;
    }
  }
  return mapped as T;
}

function mapEntityToColumns(item: Record<string, any>): { cols: string[]; vals: any[]; placeholders: string[] } {
  const cols: string[] = [];
  const vals: any[] = [];
  const placeholders: string[] = [];

  let idx = 1;
  for (const [key, val] of Object.entries(item)) {
    if (val === undefined) continue;
    const colName = `"${toSnakeCase(key)}"`;
    cols.push(colName);
    vals.push(val);
    placeholders.push(`$${idx}`);
    idx++;
  }
  return { cols, vals, placeholders };
}

export class PostgresStorageProvider implements IStorageProvider {
  public readonly mode = 'postgres' as const;
  private pool: pg.Pool | null = null;
  private connectionString: string;
  private isInitialized = false;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
  }

  public getPool(): pg.Pool | null {
    return this.pool;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.pool) return;

    if (!this.connectionString) {
      throw new Error('DATABASE_URL belum dikonfigurasi.');
    }

    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      // Check if tables exist, if not, execute migration
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      if (!res.rows[0].exists) {
        console.log('[PostgresStorage] Tabel belum ada, menjalankan migrasi awal...');
        const migrationPath = path.resolve(process.cwd(), 'prisma/migrations/0_init/migration.sql');
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await client.query(sql);
          console.log('[PostgresStorage] Migrasi PostgreSQL berhasil dijalankan.');
        }
      }
      this.isInitialized = true;
    } finally {
      client.release();
    }
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      if (!this.pool) {
        await this.initialize();
      }
      const client = await this.pool!.connect();
      try {
        await client.query('SELECT 1');
        return { ok: true, message: 'Koneksi PostgreSQL aktif dan responsif', latencyMs: Date.now() - start };
      } finally {
        client.release();
      }
    } catch (err: any) {
      return { ok: false, message: `Koneksi PostgreSQL gagal: ${err.message}`, latencyMs: Date.now() - start };
    }
  }

  public async getAll<T = any>(entity: EntityName): Promise<T[]> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const res = await this.pool!.query(`SELECT * FROM ${tableName}`);
    return res.rows.map(r => mapRowToEntity<T>(r));
  }

  public async getById<T = any>(entity: EntityName, id: string): Promise<T | null> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const res = await this.pool!.query(`SELECT * FROM ${tableName} WHERE "id" = $1`, [id]);
    if (res.rows.length === 0) return null;
    return mapRowToEntity<T>(res.rows[0]);
  }

  public async find<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll<T>(entity);
    return all.filter(predicate);
  }

  public async findOne<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T | null> {
    const all = await this.getAll<T>(entity);
    return all.find(predicate) || null;
  }

  public async create<T = any>(entity: EntityName, item: Partial<T> & Record<string, any>): Promise<T> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const now = new Date().toISOString();
    const fullItem = {
      ...item,
      id: item.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: (item as any).createdAt || now,
      updatedAt: (item as any).updatedAt || now,
    };

    const { cols, vals, placeholders } = mapEntityToColumns(fullItem);
    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const res = await this.pool!.query(sql, vals);
    return mapRowToEntity<T>(res.rows[0]);
  }

  public async update<T = any>(entity: EntityName, id: string, patch: Partial<T> & Record<string, any>): Promise<T | null> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const now = new Date().toISOString();
    const patchWithUpdated = { ...patch, updatedAt: now };

    const updates: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(patchWithUpdated)) {
      if (key === 'id' || val === undefined) continue;
      updates.push(`"${toSnakeCase(key)}" = $${idx}`);
      vals.push(val);
      idx++;
    }

    if (updates.length === 0) {
      return this.getById<T>(entity, id);
    }

    vals.push(id);
    const sql = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE "id" = $${idx} RETURNING *`;
    const res = await this.pool!.query(sql, vals);
    if (res.rows.length === 0) return null;
    return mapRowToEntity<T>(res.rows[0]);
  }

  public async delete(entity: EntityName, id: string): Promise<boolean> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const res = await this.pool!.query(`DELETE FROM ${tableName} WHERE "id" = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async upsert<T extends { id?: string }>(entity: EntityName, item: T): Promise<T> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const now = new Date().toISOString();
    const fullItem = {
      ...item,
      id: item.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: (item as any).createdAt || now,
      updatedAt: (item as any).updatedAt || now,
    };

    const { cols, vals, placeholders } = mapEntityToColumns(fullItem);
    
    // Check if table has a simple primary key 'id'
    const updateClauses = cols
      .filter(c => c !== '"id"' && c !== '"created_at"')
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');

    const conflictClause = updateClauses.length > 0
      ? `ON CONFLICT ("id") DO UPDATE SET ${updateClauses}`
      : `ON CONFLICT ("id") DO NOTHING`;

    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ${conflictClause} RETURNING *`;
    const res = await this.pool!.query(sql, vals);
    return mapRowToEntity<T>(res.rows[0]);
  }

  public async transaction<R>(fn: (provider: IStorageProvider) => Promise<R>): Promise<R> {
    if (!this.pool) await this.initialize();
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const res = await fn(this);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async count(entity: EntityName): Promise<number> {
    if (!this.pool) await this.initialize();
    const tableName = `"${entity}"`;
    const res = await this.pool!.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return parseInt(res.rows[0].count, 10);
  }

  public async getAllCounts(): Promise<Record<EntityName, number>> {
    const entities: EntityName[] = [
      'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
      'study_programs', 'lecturers', 'students', 'academic_years', 'semesters',
      'courses', 'classes', 'class_enrollments', 'lecturer_assignments', 'rooms',
      'schedules', 'attendance_sessions', 'attendance_qr_tokens', 'attendance_records',
      'attendance_status_history', 'lecture_realizations', 'attendance_correction_logs',
      'course_evaluations', 'evaluation_follow_ups', 'audit_logs', 'system_settings',
      'attendance_correction_requests'
    ];
    const counts: Partial<Record<EntityName, number>> = {};
    for (const entity of entities) {
      try {
        counts[entity] = await this.count(entity);
      } catch {
        counts[entity] = 0;
      }
    }
    return counts as Record<EntityName, number>;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
    }
  }
}
