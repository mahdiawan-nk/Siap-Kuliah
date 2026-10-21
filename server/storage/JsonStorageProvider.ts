import fs from 'fs';
import path from 'path';
import { IStorageProvider, EntityName } from './IStorageProvider.js';
import { getDefaultSeedData } from './defaultData.js';

export class JsonStorageProvider implements IStorageProvider {
  public readonly mode = 'json' as const;
  private readonly dataDir: string;
  private writeQueues: Map<string, Promise<any>> = new Map();
  private isInitialized = false;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(process.cwd(), 'data/storage');
  }

  private getFilePath(entity: EntityName): string {
    return path.join(this.dataDir, `${entity}.json`);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const seed = getDefaultSeedData();
    const entities = Object.keys(seed) as EntityName[];

    for (const entity of entities) {
      const filePath = this.getFilePath(entity);
      if (!fs.existsSync(filePath)) {
        const initialData = (seed as any)[entity] || [];
        await this.writeAtomic(filePath, initialData);
      }
    }

    this.isInitialized = true;
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      if (!fs.existsSync(this.dataDir)) {
        return { ok: false, message: `Direktori data tidak ditemukan: ${this.dataDir}`, latencyMs: Date.now() - start };
      }
      // Test read permission
      const usersPath = this.getFilePath('users');
      if (fs.existsSync(usersPath)) {
        await fs.promises.readFile(usersPath, 'utf8');
      }
      return { ok: true, message: 'JSON Fallback Storage aktif dan sehat', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { ok: false, message: `Error akses JSON: ${err.message}`, latencyMs: Date.now() - start };
    }
  }

  private async readEntity<T = any>(entity: EntityName): Promise<T[]> {
    await this.initialize();
    const filePath = this.getFilePath(entity);
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(filePath, 'utf8');
      if (!raw || !raw.trim()) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.error(`Gagal membaca file JSON untuk ${entity}:`, err);
      return [];
    }
  }

  private async writeAtomic<T = any>(filePath: string, data: T[]): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Sequentialize write for each file
    const previousTask = this.writeQueues.get(filePath) || Promise.resolve();
    const currentTask = (async () => {
      await previousTask;
      const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(tmpPath, jsonContent, 'utf8');
      await fs.promises.rename(tmpPath, filePath);
    })();

    this.writeQueues.set(filePath, currentTask.catch(() => {}));
    await currentTask;
  }

  public async getAll<T = any>(entity: EntityName): Promise<T[]> {
    return this.readEntity<T>(entity);
  }

  public async getById<T = any>(entity: EntityName, id: string): Promise<T | null> {
    const items = await this.readEntity<any>(entity);
    const found = items.find((item: any) => item.id === id);
    return found || null;
  }

  public async find<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.readEntity<T>(entity);
    return items.filter(predicate);
  }

  public async findOne<T = any>(entity: EntityName, predicate: (item: T) => boolean): Promise<T | null> {
    const items = await this.readEntity<T>(entity);
    const found = items.find(predicate);
    return found || null;
  }

  public async create<T = any>(entity: EntityName, item: Partial<T> & Record<string, any>): Promise<T> {
    const items = await this.readEntity<any>(entity);
    const now = new Date().toISOString();
    const fullItem = {
      ...item,
      id: item.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: (item as any).createdAt || now,
      updatedAt: (item as any).updatedAt || now,
    };
    items.push(fullItem);
    await this.writeAtomic(this.getFilePath(entity), items);
    return fullItem as T;
  }

  public async update<T = any>(entity: EntityName, id: string, patch: Partial<T> & Record<string, any>): Promise<T | null> {
    const items = await this.readEntity<any>(entity);
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return null;

    const updated = {
      ...items[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updated;
    await this.writeAtomic(this.getFilePath(entity), items);
    return updated as T;
  }

  public async delete(entity: EntityName, id: string): Promise<boolean> {
    const items = await this.readEntity<any>(entity);
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    await this.writeAtomic(this.getFilePath(entity), items);
    return true;
  }

  public async upsert<T extends { id?: string }>(entity: EntityName, item: T): Promise<T> {
    const items = await this.readEntity<any>(entity);
    const index = item.id ? items.findIndex((i: any) => i.id === item.id) : -1;
    const now = new Date().toISOString();

    if (index !== -1) {
      const updated = {
        ...items[index],
        ...item,
        updatedAt: now,
      };
      items[index] = updated;
      await this.writeAtomic(this.getFilePath(entity), items);
      return updated as T;
    } else {
      const fullItem = {
        ...item,
        id: item.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: (item as any).createdAt || now,
        updatedAt: (item as any).updatedAt || now,
      };
      items.push(fullItem);
      await this.writeAtomic(this.getFilePath(entity), items);
      return fullItem as T;
    }
  }

  public async transaction<R>(fn: (provider: IStorageProvider) => Promise<R>): Promise<R> {
    // In JSON mode, run function sequentially with this provider
    return fn(this);
  }

  public async count(entity: EntityName): Promise<number> {
    const items = await this.readEntity<any>(entity);
    return items.length;
  }

  public async getAllCounts(): Promise<Record<EntityName, number>> {
    const seed = getDefaultSeedData();
    const entities = Object.keys(seed) as EntityName[];
    const counts: Partial<Record<EntityName, number>> = {};
    for (const entity of entities) {
      counts[entity] = await this.count(entity);
    }
    return counts as Record<EntityName, number>;
  }

  public getDataDir(): string {
    return this.dataDir;
  }
}
