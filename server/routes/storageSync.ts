import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { StorageManager } from '../storage/StorageManager.js';

const router = Router();
const storageManager = StorageManager.getInstance();

// Storage management is restricted strictly to ADMINISTRATOR
router.use(authenticate);
router.use(requireRole('ADMINISTRATOR'));

// GET /api/v1/storage/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await storageManager.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/storage/test-connection
router.post('/test-connection', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { databaseUrl } = req.body;
    const testResult = await storageManager.testPostgresConnection(databaseUrl);
    res.json({
      success: testResult.ok,
      message: testResult.message,
      latencyMs: testResult.latencyMs,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// GET /api/v1/storage/preview
router.get('/preview', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const syncService = storageManager.getSyncService();
    const preview = await syncService.previewData();
    res.json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/storage/sync
router.post('/sync', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { strategy = 'upsert' } = req.body;
    if (!['insert_only', 'upsert', 'dry_run'].includes(strategy)) {
      res.status(400).json({ success: false, message: 'Strategi sinkronisasi tidak valid. Gunakan: insert_only, upsert, atau dry_run.' });
      return;
    }

    const syncService = storageManager.getSyncService();
    const result = await syncService.executeSync(strategy);

    if (result.success && strategy !== 'dry_run') {
      storageManager.setLastSyncAt(result.completedAt);
    }

    res.json({
      success: result.success,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// POST /api/v1/storage/switch-mode
router.post('/switch-mode', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { mode } = req.body;
    if (mode !== 'json' && mode !== 'postgres') {
      res.status(400).json({ success: false, message: 'Mode harus bernilai "json" atau "postgres".' });
      return;
    }

    const result = await storageManager.setMode(mode);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json({
      success: true,
      message: result.message,
      activeMode: storageManager.getMode(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
