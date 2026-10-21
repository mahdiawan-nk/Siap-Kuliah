# SIAP-KULIAH — Sistem Informasi Absensi Perkuliahan Mahasiswa

SIAP-KULIAH adalah aplikasi presensi perkuliahan berbasis web untuk perguruan tinggi dengan keamanan tingkat tinggi, RBAC granular di sisi server, QR Code dinamis (interval 5–60 detik ber-HMAC cryptographic token), rekonsiliasi otomatis kehadiran (HADIR, TERLAMBAT, IZIN, SAKIT, ALPA), koreksi absensi ber-audit trail, dan monitoring evaluasi Kaprodi.

Aplikasi dirancang dengan arsitektur **Dual Storage (PostgreSQL & JSON Fallback Storage)**, memastikan sistem langsung dapat beroperasi secara penuh baik dalam lingkungan tanpa database aktif (misal proses deployment awal / demo), maupun terhubung penuh ke PostgreSQL production di server Proxmox VE / Ubuntu Server 24.04 LTS.

---

## 1. STRUKTUR SOURCE CODE

```
├── .env.example                     # Contoh konfigurasi environment
├── metadata.json                    # Metadata aplikasi & permission kamera
├── index.html                       # Entry HTML dengan typography Plus Jakarta Sans
├── package.json                     # Konfigurasi dependensi Full-Stack
├── server.ts                        # Server Express & Vite dev middleware mount
├── prisma/
│   ├── schema.prisma                # Skema relational 27 model database Prisma
│   └── migrations/
│       └── 0_init/
│           └── migration.sql        # Skema DDL PostgreSQL (DDL, Check, Index, FK)
├── server/
│   ├── types/
│   │   └── entities.ts              # Interface TypeScript seluruh entitas & payload
│   ├── storage/
│   │   ├── IStorageProvider.ts      # Abstraksi antarmuka penyimpanan
│   │   ├── JsonStorageProvider.ts   # Implementasi JSON storage atomik & lock antrean
│   │   ├── PostgresStorageProvider.ts# Implementasi PostgreSQL pool & query mapper
│   │   ├── StorageManager.ts        # Singleton pengelola mode & auto-fallback
│   │   ├── SyncService.ts           # Service migrasi berurutan (Dry Run/Insert/Upsert)
│   │   └── defaultData.ts           # Data seed awal kampus (Dosen, Mhs, Jadwal, SKS)
│   ├── services/
│   │   ├── AuthService.ts           # Login multi-identifier (NIM/NIDN/NIP/User) & JWT
│   │   ├── SessionService.ts        # Siklus sesi perkuliahan, SKS & rekonsiliasi ALPA
│   │   ├── QrService.ts             # QR dinamis kriptografis HMAC 5-60 detik
│   │   ├── AttendanceService.ts     # Verifikasi scan presensi & koreksi dosen
│   │   └── ReportService.ts         # Analisis kehadiran, realisasi SKS & CSV
│   ├── middlewares/
│   │   ├── auth.ts                  # Verifikasi Bearer token & HttpOnly cookie
│   │   ├── rbac.ts                  # Validasi permission & scope program studi
│   │   ├── rateLimiter.ts           # Proteksi DDoS & brute force
│   │   └── errorHandler.ts          # Penanganan error seragam
│   └── routes/
│       ├── auth.ts                  # /api/v1/auth (login, logout, refresh, me)
│       ├── attendanceSessions.ts    # /api/v1/attendance-sessions (CRUD, start, close, qr)
│       ├── attendance.ts            # /api/v1/attendance (scan, my-history, corrections)
│       ├── academic.ts              # /api/v1/academic (master data & settings)
│       ├── reports.ts               # /api/v1/reports (kehadiran, realisasi, ekspor)
│       ├── evaluations.ts           # /api/v1/evaluations (temuan Kaprodi & respon)
│       ├── storageSync.ts           # /api/v1/storage (preview, sync, test, switch)
│       └── docs.ts                  # /api/v1/docs (OpenAPI 3.0 & Swagger UI)
├── src/
│   ├── main.tsx                     # Entrypoint React
│   ├── App.tsx                      # Router & layout orchestration
│   ├── context/
│   │   └── AuthContext.tsx          # Autentikasi & status storage provider
│   ├── components/
│   │   ├── common/
│   │   │   ├── CameraQrScanner.tsx  # Pemindai kamera jsQR & fallback simulasi
│   │   │   ├── ProjectorQrModal.tsx # Tampilan proyektor layar penuh & countdown
│   │   │   ├── CorrectionModal.tsx  # Modal koreksi absensi ber-alasan wajib
│   │   │   └── RealizationModal.tsx # Modal berita acara & penutupan sesi
│   │   └── layout/
│   │       └── AppLayout.tsx        # Top Bar contract & sidebar dinamis role
│   └── pages/
│       ├── LoginPage.tsx            # Form login dengan tombol uji cepat akun
│       ├── LecturerDashboard.tsx    # Dashboard dosen & pembuatan sesi SKS
│       ├── SessionDetailPage.tsx    # Roster kehadiran mahasiswa & koreksi
│       ├── StudentDashboard.tsx     # Dashboard mahasiswa & scan presensi
│       ├── KaprodiDashboard.tsx     # Monitoring prodi, realisasi dosen & evaluasi
│       ├── AdminMasterData.tsx      # Kelola data master & konfigurasi sistem
│       ├── StorageSyncPage.tsx      # Pengaturan Dual Storage & sinkronisasi
│       └── ReportsPage.tsx          # Laporan kehadiran & ekspor CSV Excel
├── test/
│   └── run-tests.ts                 # Test suite otomatis menyeluruh
└── data/storage/*.json              # File storage fallback (users, sessions, dll)
```

---

## 2. FITUR LENGKAP YANG TELAH SELESAI

1. **Autentikasi Multi-Identifier & Keamanan**:
   - Mahasiswa: Login menggunakan NIM (`220101001` dsb.).
   - Dosen: Login menggunakan NIDN (`0420088502`), NIP, atau username.
   - Kaprodi: Login menggunakan username (`kaprodi.ti`) atau NIDN resmi.
   - Administrator: Login menggunakan username (`admin`).
   - Password hashing menggunakan algoritma Bcrypt (10 round).
   - Rate limiting untuk endpoint login (15 request / 15 menit) dan scan QR (30 scan / menit).
   - JWT Access Token (1 hari) & Refresh Token (7 hari), serta dukungan HttpOnly cookie.

2. **RBAC & Data Scoping di Sisi Backend**:
   - 4 Role: `ADMINISTRATOR`, `KAPRODI`, `DOSEN`, `MAHASISWA`.
   - 16 Granular Permissions (`users.read`, `academic_data.manage`, `sessions.create`, `attendance.scan`, `attendance.correct_own_scope`, dll.).
   - Kaprodi dibatasi secara ketat hanya pada Program Studi binaannya.
   - Dosen hanya dapat membuka sesi dan mengoreksi kelas yang ditugaskan.
   - Mahasiswa hanya dapat melihat absensi dan scan pada kelas yang diambil.

3. **QR Code Dinamis (5–60 Detik) & Mode Proyektor**:
   - Token kriptografis ditandatangani HMAC-SHA256 dengan secret server.
   - Rotasi QR otomatis sesuai interval yang dipilih dosen (default 5 detik, opsi 5, 10, 15, 20, 30, 45, 60 detik).
   - Validasi toleransi latensi jaringan (grace period 4000ms).
   - Mode Proyektor Layar Penuh (`ProjectorQrModal`) dengan countdown bar dan live counter mahasiswa terpresensi.
   - QR Scanner kamera langsung di sisi mahasiswa (`CameraQrScanner`) berbasis web canvas `jsQR`, lengkap dengan opsi fallback token manual.

4. **Pencatatan & Status Kehadiran**:
   - Status presensi: `HADIR`, `TERLAMBAT`, `IZIN`, `SAKIT`, `ALPA`.
   - Otomatis `TERLAMBAT` jika scan melebihi `lateToleranceMinutes` dari waktu buka sesi.
   - Idempotensi: Scan ganda dari mahasiswa yang sama tidak menimbulkan duplikasi record.
   - Rekonsiliasi Otomatis: Saat sesi di-tutup (`CLOSED`), seluruh mahasiswa terdaftar yang belum presensi otomatis dicatat sebagai `ALPA`.

5. **Koreksi Absensi & Berita Acara (Audit Trail)**:
   - Dosen dapat mengoreksi status kehadiran mahasiswa dengan alasan wajib (minimal 10 karakter).
   - Pencatatan ganda ke tabel `attendance_correction_logs` dan `attendance_status_history`.
   - Riwayat koreksi tidak dapat dihapus dan dapat dipantau oleh Kaprodi & Admin.
   - Pengisian Berita Acara Perkuliahan (`LectureRealization`) mencakup jam mulai/selesai aktual, materi terlaksana, dan catatan kendala.

6. **Monitoring Kaprodi & Evaluasi**:
   - Persentase realisasi pertemuan terhadap target semester (16 pertemuan/kelas).
   - Realisasi jam mengajar dosen (perhitungan rencana berbasis SKS vs jam aktual).
   - Pencatatan evaluasi perkuliahan berkala, tenggat tindak lanjut, dan respon tertulis dosen.

7. **Laporan & Ekspor Data**:
   - Rekap persentase kehadiran per mata kuliah & kelas dengan ambang batas (default 75% dapat dikonfigurasi).
   - Ekspor laporan dalam format CSV ber-UTF-8 BOM yang kompatibel langsung dengan Microsoft Excel.

8. **Dual Storage Architecture (PostgreSQL & JSON Fallback Storage)**:
   - File JSON atomik pada `./data/storage/*.json` dengan queue locking untuk konkurensi.
   - Halaman **Pengaturan Sistem → Penyimpanan dan Sinkronisasi Data**:
     - Uji koneksi database PostgreSQL langsung dari UI.
     - Preview perbandingan record 27 entitas.
     - 3 Pilihan strategi sinkronisasi: `Upsert`, `Insert Only`, dan `Dry Run (Simulasi)`.
     - Pengalihan mode aman antara JSON dan PostgreSQL.

---

## 3. PANDUAN PENGUJIAN AKUN CEPAT (DEMO)

| Role | Identifier (NIM / NIDN / User) | Password | Catatan Akses |
|---|---|---|---|
| **Dosen** | `dosen.budi` atau `0420088502` | `dosen123` | Buka sesi, proyektor QR, koreksi, berita acara |
| **Mahasiswa** | `220101001` | `mhs123` | Scan kamera QR, lihat persentase, ajukan dispensasi |
| **Kaprodi** | `kaprodi.ti` | `kaprodi123` | Monitoring prodi TI, jam mengajar, form evaluasi |
| **Administrator**| `admin` | `admin123` | Master data, sinkronisasi PostgreSQL, audit trail |

---

## 4. CARA MENJALANKAN TEST SUITE

Jalankan pengujian unit, integrasi, RBAC, dan simulasi QR scan:

```bash
npm run test
```

Hasil test mencakup:
- Inisialisasi storage & health check.
- Autentikasi semua 4 role & generic rejection.
- Validasi rentang SKS dan perhitungan waktu rencana.
- Kriptografi token QR dinamis (HMAC signing, rejection of expired/tampered tokens).
- Presensi scan mahasiswa & idempotensi scan ganda.
- Koreksi status absensi ber-alasan wajib (penolakan jika alasan < 10 karakter).
- Rekonsiliasi otomatis mahasiswa Alpa saat sesi ditutup.
- Kalkulasi laporan kehadiran & jam mengajar.
- Preview & dry run sinkronisasi data JSON ke PostgreSQL.

---

## 5. PANDUAN DEPLOYMENT KE UBUNTU SERVER 24.04 LTS (PROXMOX VE)

### Langkah 1: Buat Virtual Machine di Proxmox VE
- CPU: Minimal 2 Core
- RAM: Minimal 2 GB (Rekomendasi 4 GB)
- Storage: 20–30 GB SSD
- OS: Ubuntu Server 24.04 LTS

### Langkah 2: Konfigurasi Jaringan & Firewall
```bash
# Atur IP Statis pada /etc/netplan/50-cloud-init.yaml jika diperlukan
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP Nginx
sudo ufw allow 443/tcp    # HTTPS Nginx
sudo ufw enable
```

### Langkah 3: Instalasi PostgreSQL 16
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Langkah 4: Buat Database & User Khusus Aplikasi
```bash
sudo -u postgres psql
```
Di dalam console PostgreSQL:
```sql
CREATE DATABASE siap_kuliah_db;
CREATE USER siap_user WITH ENCRYPTED PASSWORD 'GantiPasswordSangatKuat2026!';
GRANT ALL PRIVILEGES ON DATABASE siap_kuliah_db TO siap_user;
ALTER DATABASE siap_kuliah_db OWNER TO siap_user;
\q
```

### Langkah 5: Instalasi Node.js LTS (v20 atau v22)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v # Verifikasi v22.x
npm -v
```

### Langkah 6: Clone Repositori & Instal Dependensi
```bash
cd /var/www
sudo git clone <URL_REPO_ANDA> siap-kuliah
cd siap-kuliah
sudo chown -R $USER:$USER /var/www/siap-kuliah
npm install
```

### Langkah 7: Konfigurasi Environment (.env)
Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
nano .env
```
Isi variabel database:
```env
PORT=3000
NODE_ENV=production
STORAGE_MODE=postgres
DATABASE_URL="postgresql://siap_user:GantiPasswordSangatKuat2026!@localhost:5432/siap_kuliah_db?schema=public"
JWT_SECRET="kunci-rahasia-sangat-panjang-dan-acak-di-server-produksi-2026"
```

### Langkah 8: Jalankan Migrasi Database
```bash
# Jalankan migrasi skema SQL DDL ke PostgreSQL
psql "postgresql://siap_user:GantiPasswordSangatKuat2026!@localhost:5432/siap_kuliah_db" -f prisma/migrations/0_init/migration.sql
```

### Langkah 9: Build Frontend
```bash
npm run build
```

### Langkah 10: Buat Service systemd
Buat file service backend `/etc/systemd/system/siap-kuliah.service`:
```bash
sudo nano /etc/systemd/system/siap-kuliah.service
```
Isi file dengan:
```ini
[Unit]
Description=SIAP-KULIAH Attendance Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/siap-kuliah
ExecStart=/usr/bin/npx tsx server.ts
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=siap-kuliah
Environment=NODE_ENV=production
EnvironmentFile=/var/www/siap-kuliah/.env

[Install]
WantedBy=multi-user.target
```
Aktifkan dan jalankan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable siap-kuliah
sudo systemctl start siap-kuliah
sudo systemctl status siap-kuliah
```

### Langkah 11: Konfigurasi Nginx Reverse Proxy
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/siap-kuliah
```
Isi konfigurasi Nginx:
```nginx
server {
    listen 80;
    server_name presensi.kampus.ac.id; # Ganti dengan domain atau IP server Anda

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Aktifkan konfigurasi Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/siap-kuliah /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Langkah 12: Aktifkan HTTPS dengan Let's Encrypt (Certbot)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d presensi.kampus.ac.id
```

---

## 6. PROSEDUR BACKUP DAN RESTORE POSTGRESQL

### Backup Database (Otomatis / Manual)
```bash
# Backup lengkap terkompresi
pg_dump -U siap_user -h localhost siap_kuliah_db | gzip > siap_kuliah_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database
```bash
# Ekstrak dan pulihkan ke database
gunzip -c siap_kuliah_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U siap_user -h localhost siap_kuliah_db
```

### Cron Job Backup Harian
Tambahkan ke crontab (`crontab -e`):
```bash
0 2 * * * pg_dump -U siap_user -h localhost siap_kuliah_db | gzip > /var/backups/siap_kuliah_$(date +\%F).sql.gz
```
