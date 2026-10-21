import { IStorageProvider, EntityName, StorageStats } from './IStorageProvider.js';
import { JsonStorageProvider } from './JsonStorageProvider.js';
import { PostgresStorageProvider } from './PostgresStorageProvider.js';
import { SyncService } from './SyncService.js';

export class StorageManager {
  private static instance: StorageManager;
  private currentMode: 'json' | 'postgres' = 'json';
  private jsonProvider: JsonStorageProvider;
  private postgresProvider: PostgresStorageProvider;
  private syncService: SyncService;
  private lastSyncAt: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.jsonProvider = new JsonStorageProvider();
    this.postgresProvider = new PostgresStorageProvider();
    this.syncService = new SyncService(this.jsonProvider, this.postgresProvider);
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Always initialize JSON provider first so fallback is ready
    await this.jsonProvider.initialize();

    const configMode = (process.env.STORAGE_MODE || 'auto').toLowerCase();

    if (configMode === 'postgres') {
      try {
        console.log('[StorageManager] Mode diset ke PostgreSQL. Mencoba inisialisasi...');
        await this.postgresProvider.initialize();
        this.currentMode = 'postgres';
        console.log('[StorageManager] PostgreSQL Storage Provider aktif.');
      } catch (err: any) {
        console.warn(`[StorageManager] Gagal menghubungkan ke PostgreSQL: ${err.message}. Fallback ke mode JSON.`);
        this.currentMode = 'json';
      }
    } else if (configMode === 'json') {
      this.currentMode = 'json';
      console.log('[StorageManager] Mode manual diset ke JSON Fallback Storage.');
    } else {
      // 'auto' mode: test postgres, fallback to json if unreachable
      try {
        const testConn = await this.postgresProvider.checkHealth();
        if (testConn.ok) {
          await this.postgresProvider.initialize();
          this.currentMode = 'postgres';
          console.log('[StorageManager] Auto-detect: PostgreSQL terdeteksi dan aktif.');
        } else {
          this.currentMode = 'json';
          console.log(`[StorageManager] Auto-detect: PostgreSQL tidak tersedia (${testConn.message}). Menggunakan JSON Fallback Storage.`);
        }
      } catch (err: any) {
        this.currentMode = 'json';
        console.log(`[StorageManager] Auto-detect: PostgreSQL gagal (${err.message}). Menggunakan JSON Fallback Storage.`);
      }
    }

    this.isInitialized = true;
  }

  public getStorage(): IStorageProvider {
    return this.currentMode === 'postgres' ? this.postgresProvider : this.jsonProvider;
  }

  public getJsonProvider(): JsonStorageProvider {
    return this.jsonProvider;
  }

  public getPostgresProvider(): PostgresStorageProvider {
    return this.postgresProvider;
  }

  public getSyncService(): SyncService {
    return this.syncService;
  }

  public getMode(): 'json' | 'postgres' {
    return this.currentMode;
  }

  public setLastSyncAt(ts: string): void {
    this.lastSyncAt = ts;
  }

  public async setMode(newMode: 'json' | 'postgres'): Promise<{ success: boolean; message: string }> {
    if (newMode === this.currentMode) {
      return { success: true, message: `Sudah berada di mode ${newMode.toUpperCase()}` };
    }

    if (newMode === 'postgres') {
      const health = await this.postgresProvider.checkHealth();
      if (!health.ok) {
        return { success: false, message: `Tidak dapat beralih ke PostgreSQL: ${health.message}` };
      }
      this.currentMode = 'postgres';
      return { success: true, message: 'Berhasil beralih ke mode PostgreSQL' };
    } else {
      this.currentMode = 'json';
      return { success: true, message: 'Berhasil beralih ke mode JSON Fallback Storage' };
    }
  }

  public async getStats(): Promise<StorageStats> {
    const activeProvider = this.getStorage();
    const health = await activeProvider.checkHealth();
    const counts = await activeProvider.getAllCounts();

    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl
      ? dbUrl.replace(/:([^:@]+)@/, ':****@')
      : 'Belum dikonfigurasi';

    return {
      mode: this.currentMode,
      connected: health.ok,
      counts,
      lastSyncAt: this.lastSyncAt,
      storagePath: this.jsonProvider.getDataDir(),
      databaseUrlMasked: maskedUrl,
    };
  }

  public async testPostgresConnection(customUrl?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    if (customUrl) {
      const tempProvider = new PostgresStorageProvider(customUrl);
      const res = await tempProvider.checkHealth();
      await tempProvider.close();
      return res;
    }
    return this.postgresProvider.checkHealth();
  }
}
