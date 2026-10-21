import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorageManager } from './server/storage/StorageManager.js';
import { errorHandler } from './server/middlewares/errorHandler.js';

// Route imports
import authRoutes from './server/routes/auth.js';
import sessionRoutes from './server/routes/attendanceSessions.js';
import attendanceRoutes from './server/routes/attendance.js';
import academicRoutes from './server/routes/academic.js';
import reportRoutes from './server/routes/reports.js';
import evaluationRoutes from './server/routes/evaluations.js';
import storageSyncRoutes from './server/routes/storageSync.js';
import docsRoutes from './server/routes/docs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize Storage Manager (Auto detects Postgres or activates JSON fallback)
  console.log('[SIAP-KULIAH] Menginisialisasi Storage Manager...');
  const storageManager = StorageManager.getInstance();
  await storageManager.initialize();
  console.log(`[SIAP-KULIAH] Mode penyimpanan aktif: ${storageManager.getMode().toUpperCase()}`);

  // Base Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // REST API Routes (/api/v1)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/attendance-sessions', sessionRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/academic', academicRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/evaluations', evaluationRoutes);
  app.use('/api/v1/storage', storageSyncRoutes);
  app.use('/api/v1/docs', docsRoutes);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    const stats = await storageManager.getStats();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      storage: stats,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  // Frontend Serving (Vite in dev, static files in prod)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic import of vite in dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  SIAP-KULIAH Server berjalan di http://0.0.0.0:${PORT}`);
    console.log(`  Mode Penyimpanan : ${storageManager.getMode().toUpperCase()}`);
    console.log(`  API Documentation : http://0.0.0.0:${PORT}/api/v1/docs`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[SIAP-KULIAH] Gagal menjalankan server:', err);
  process.exit(1);
});
