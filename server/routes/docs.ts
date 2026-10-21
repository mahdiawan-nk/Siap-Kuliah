import { Router, Request, Response } from 'express';

const router = Router();

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SIAP-KULIAH REST API',
    version: '1.0.0',
    description: 'Dokumentasi REST API Sistem Informasi Absensi Perkuliahan Mahasiswa berbasis QR Code Dinamis dan PostgreSQL.',
    contact: {
      name: 'Tim Pengembang SIAP-KULIAH',
      email: 'admin@siapkuliah.ac.id',
    },
  },
  servers: [
    { url: '/api/v1', description: 'Server API Utama' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Autentikasi Pengguna (Login)',
        description: 'Login menggunakan NIM (Mahasiswa), NIDN/NIP (Dosen), atau username (Kaprodi/Admin).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  identifier: { type: 'string', example: 'dosen.budi' },
                  password: { type: 'string', example: 'dosen123' },
                },
                required: ['identifier', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login Berhasil, mengembalikan JWT Bearer token & profil pengguna' },
          '401': { description: 'Kredensial tidak valid' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Cek Profil Pengguna Terotentikasi',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Informasi pengguna, roles, dan permissions' },
        },
      },
    },
    '/attendance-sessions': {
      get: {
        summary: 'Daftar Sesi Perkuliahan Sesuai Scope RBAC',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'classId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SCHEDULED', 'OPEN', 'PAUSED', 'CLOSED', 'CANCELLED'] } },
        ],
        responses: { '200': { description: 'Daftar sesi' } },
      },
      post: {
        summary: 'Buat Sesi Perkuliahan Baru',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Sesi berhasil dibuat' } },
      },
    },
    '/attendance-sessions/{id}/start': {
      post: {
        summary: 'Buka Sesi Presensi & Terbitkan QR Dinamis Perdana',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Sesi OPEN' } },
      },
    },
    '/attendance-sessions/{id}/close': {
      post: {
        summary: 'Tutup Sesi Presensi & Rekonsiliasi Otomatis Mahasiswa Alpa',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Sesi CLOSED' } },
      },
    },
    '/attendance-sessions/{id}/qr': {
      get: {
        summary: 'Polling / Stream Token QR Dinamis Aktif (5-60 Detik)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Token QR kriptografis terbaru beserta detik tersisa dan QR Data URL' } },
      },
    },
    '/attendance/scan': {
      post: {
        summary: 'Scan QR Presensi oleh Mahasiswa',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  token: { type: 'string' },
                },
                required: ['sessionId', 'token'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Presensi berhasil dicatat (HADIR / TERLAMBAT)' },
          '400': { description: 'Token tidak valid / sesi ditutup / mahasiswa tidak terdaftar' },
        },
      },
    },
    '/attendance-records/{id}/corrections': {
      post: {
        summary: 'Koreksi Status Presensi oleh Dosen dengan Alasan Wajib',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newStatus: { type: 'string', enum: ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA'] },
                  reason: { type: 'string', minLength: 10, example: 'Mahasiswa membawa surat dispensasi resmi' },
                },
                required: ['newStatus', 'reason'],
              },
            },
          },
        },
        responses: { '200': { description: 'Presensi berhasil dikoreksi' } },
      },
    },
    '/storage/stats': {
      get: {
        summary: 'Status Penyimpanan (JSON vs PostgreSQL) & Jumlah Record',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Statistik database & fallback' } },
      },
    },
    '/storage/sync': {
      post: {
        summary: 'Eksekusi Sinkronisasi Data JSON ke PostgreSQL',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  strategy: { type: 'string', enum: ['insert_only', 'upsert', 'dry_run'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Hasil laporan eksekusi sinkronisasi' } },
      },
    },
  },
};

// GET /api/v1/docs/openapi.json
router.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// GET /api/v1/docs (Interactive Swagger UI via CDN)
router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SIAP-KULIAH — Dokumentasi REST API (OpenAPI)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; font-family: sans-serif; }
    .top-banner { background: #0f172a; color: white; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
    .top-banner h1 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .top-banner a { color: #94a3b8; text-decoration: none; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="top-banner">
    <h1>SIAP-KULIAH API Documentation (OpenAPI 3.0)</h1>
    <a href="/">← Kembali ke Aplikasi</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
});

export default router;
