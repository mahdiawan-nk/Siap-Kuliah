/**
 * SIAP-KULIAH — Automated Test Suite
 * Tests storage, auth, RBAC, QR generation, attendance, corrections, and sync
 */

import { StorageManager } from '../server/storage/StorageManager.js';
import { AuthService } from '../server/services/AuthService.js';
import { SessionService } from '../server/services/SessionService.js';
import { QrService } from '../server/services/QrService.js';
import { AttendanceService } from '../server/services/AttendanceService.js';
import { ReportService } from '../server/services/ReportService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   MENJALANKAN TEST SUITE SIAP-KULIAH');
  console.log('======================================================\n');

  // Test 1: Storage Initialization & Health
  console.log('--- 1. PENGUJIAN PENYIMPANAN & FALLBACK STORAGE ---');
  const storageManager = StorageManager.getInstance();
  await storageManager.initialize();
  const activeMode = storageManager.getMode();
  assert(activeMode === 'json' || activeMode === 'postgres', `Mode penyimpanan valid: ${activeMode}`);

  const storage = storageManager.getStorage();
  const health = await storage.checkHealth();
  assert(health.ok, 'Health check storage provider sukses', health.message);

  const counts = await storage.getAllCounts();
  assert(counts.users > 0, `Record pengguna terisi: ${counts.users} pengguna`);
  assert(counts.students > 0, `Record mahasiswa terisi: ${counts.students} mahasiswa`);
  assert(counts.lecturers > 0, `Record dosen terisi: ${counts.lecturers} dosen`);
  assert(counts.attendance_sessions > 0, `Record sesi kuliah terisi: ${counts.attendance_sessions} sesi`);

  // Test 2: Authentication with all roles
  console.log('\n--- 2. PENGUJIAN AUTENTIKASI SEMUA ROLE ---');
  const authService = AuthService.getInstance();

  // 2a. Admin Login
  const adminRes = await authService.login('admin', 'admin123');
  assert(adminRes.user.roles.includes('ADMINISTRATOR'), 'Login Administrator berhasil dengan role ADMINISTRATOR');

  // 2b. Kaprodi Login (NIDN or username)
  const kaprodiRes = await authService.login('kaprodi.ti', 'kaprodi123');
  assert(kaprodiRes.user.roles.includes('KAPRODI'), 'Login Kaprodi berhasil dengan role KAPRODI');

  // 2c. Dosen Login (NIDN 0420088502 or username dosen.budi)
  const dosenRes = await authService.login('0420088502', 'dosen123');
  assert(dosenRes.user.roles.includes('DOSEN'), 'Login Dosen via NIDN berhasil dengan role DOSEN');

  // 2d. Mahasiswa Login via NIM
  const mhsRes = await authService.login('220101001', 'mhs123');
  assert(mhsRes.user.roles.includes('MAHASISWA'), 'Login Mahasiswa via NIM berhasil dengan role MAHASISWA');

  // 2e. Invalid login should return generic error
  let rejected = false;
  try {
    await authService.login('unknown_user', 'wrong_pass');
  } catch (err: any) {
    rejected = true;
    assert(err.message.includes('tidak valid') || err.message.includes('tidak ditemukan'), 'Respons generik untuk login yang salah');
  }
  assert(rejected, 'Login akun tidak ada ditolak');

  // Test 3: Session Creation & SKS Calculation
  console.log('\n--- 3. PENGUJIAN SESI PERKULIAHAN & SKS ---');
  const sessionService = SessionService.getInstance();
  const priorMeeting14 = await storage.findOne<any>('attendance_sessions', s => s.classId === 'cls-web-a' && s.meetingNumber === 14);
  if (priorMeeting14) {
    await storage.delete('attendance_sessions', priorMeeting14.id);
  }
  const newSession = await sessionService.createSession({
    classId: 'cls-web-a',
    meetingNumber: 14,
    sessionDate: '2026-11-20',
    plannedStartAt: '2026-11-20T08:00:00.000Z',
    creditsSks: 3,
    lateToleranceMinutes: 15,
    qrIntervalSeconds: 10,
    topic: 'Pengujian Sistem dan Continuous Deployment',
  }, dosenRes.user);

  assert(newSession.status === 'SCHEDULED', 'Sesi baru berstatus SCHEDULED');
  assert(newSession.creditsSks === 3, 'SKS sesi adalah 3');
  assert(newSession.qrIntervalSeconds === 10, 'Interval QR tervalidasi 10 detik');

  // Test 4: Dynamic QR Code Generation & Cryptographic Verification
  console.log('\n--- 4. PENGUJIAN QR CODE DINAMIS & KRIPTOGRAFI ---');
  // Close any existing open session first to adhere to single active session constraint
  try {
    await sessionService.closeSession('sess-web-2', { topic: 'Selesai' }, dosenRes.user);
  } catch {}

  // Start the session
  const openedSession = await sessionService.startSession(newSession.id, dosenRes.user);
  assert(openedSession.status === 'OPEN', 'Status sesi berubah menjadi OPEN saat dimulai');

  const qrService = QrService.getInstance();
  const qrToken1 = await qrService.getOrGenerateActiveToken(newSession.id, true);
  assert(qrToken1.tokenPlain.startsWith('SIAP:'), 'Token QR memiliki format awalan SIAP:');
  assert(qrToken1.secondsRemaining > 0, `Countdown token aktif: ${qrToken1.secondsRemaining} detik`);

  // Verify token
  const verifyRes = await qrService.verifyToken(qrToken1.tokenPlain, newSession.id);
  assert(verifyRes.valid, 'Verifikasi kriptografi token QR aktif berhasil');

  // Verify rejection with mismatched session
  const verifyWrong = await qrService.verifyToken(qrToken1.tokenPlain, 'different-session-id');
  assert(!verifyWrong.valid, 'Token QR untuk sesi berbeda ditolak');

  // Verify rejection of bogus token
  const verifyBogus = await qrService.verifyToken('SIAP:sess:123:abc:fake_signature', newSession.id);
  assert(!verifyBogus.valid, 'Token QR dengan tanda tangan palsu ditolak');

  // Test 5: Attendance Recording & Idempotent Scan
  console.log('\n--- 5. PENGUJIAN SCAN ABSENSI & IDEMPOTENSI ---');
  const attendanceService = AttendanceService.getInstance();

  // Scan student 220101001
  const scanResult = await attendanceService.scanQr(newSession.id, qrToken1.tokenPlain, mhsRes.user);
  assert(scanResult.success, 'Scan absensi mahasiswa berhasil');
  assert(scanResult.status === 'HADIR', `Status presensi: ${scanResult.status}`);

  // Repeated scan (Idempotency)
  const repeatScan = await attendanceService.scanQr(newSession.id, qrToken1.tokenPlain, mhsRes.user);
  assert(repeatScan.success && repeatScan.status === 'HADIR', 'Scan kedua idempoten dan tidak menimbulkan duplikasi');

  // Test 6: Attendance Correction with Mandatory Reason
  console.log('\n--- 6. PENGUJIAN KOREKSI ABSENSI OLEH DOSEN ---');
  const records = await attendanceService.getSessionRecords(newSession.id, dosenRes.user);
  const studentRecord = records.find(r => r.nim === '220101001');
  assert(!!studentRecord, 'Record presensi mahasiswa ditemukan dalam sesi');

  // Correction without valid reason should fail
  let emptyReasonFailed = false;
  try {
    await attendanceService.correctRecord(studentRecord.recordId, 'IZIN', 'pendek', dosenRes.user);
  } catch {
    emptyReasonFailed = true;
  }
  assert(emptyReasonFailed, 'Koreksi dengan alasan kurang dari 10 karakter ditolak');

  // Valid correction
  const corrected = await attendanceService.correctRecord(
    studentRecord.recordId, 
    'IZIN', 
    'Mahasiswa menyerahkan surat izin dispensasi resmi kegiatan lomba', 
    dosenRes.user
  );
  assert(corrected.status === 'IZIN', 'Status berhasil dikoreksi menjadi IZIN');

  // Verify correction log exists
  const logs = await storage.find<any>('attendance_correction_logs', c => c.attendanceRecordId === studentRecord.recordId);
  assert(logs.length > 0, `Log koreksi tercatat dalam audit trail (${logs.length} entri)`);

  // Test 7: Session Closure & ALPA Reconciliation
  console.log('\n--- 7. PENGUJIAN PENUTUPAN SESI & REKONSILIASI ALPA ---');
  const closedSession = await sessionService.closeSession(newSession.id, {
    topic: 'Pengujian Sistem dan Continuous Deployment',
    realizationNotes: 'Materi pengujian telah selesai dibahas bersama mahasiswa.',
  }, dosenRes.user);
  assert(closedSession.status === 'CLOSED', 'Status sesi berhasil ditutup menjadi CLOSED');

  const finalRecords = await attendanceService.getSessionRecords(newSession.id, dosenRes.user);
  const alpaCount = finalRecords.filter(r => r.status === 'ALPA').length;
  assert(alpaCount > 0, `Mahasiswa yang tidak hadir direkonsiliasi otomatis menjadi ALPA (${alpaCount} mahasiswa)`);

  // Test 8: Reports & Analytics
  console.log('\n--- 8. PENGUJIAN LAPORAN & KALKULASI KEHADIRAN ---');
  const reportService = ReportService.getInstance();
  const attendanceReports = await reportService.getAttendanceReport({}, adminRes.user);
  assert(attendanceReports.length > 0, 'Laporan rekap kehadiran kelas berhasil dihasilkan');

  const lecturerReports = await reportService.getLecturerRealizationReport({}, adminRes.user);
  assert(lecturerReports.length > 0, 'Laporan realisasi jam mengajar dosen berhasil dihasilkan');

  const kaprodiOverview = await reportService.getKaprodiMonitoringOverview('prodi-ti');
  assert(kaprodiOverview.totalLecturers > 0, `Kaprodi monitoring overview berhasil (${kaprodiOverview.totalLecturers} dosen)`);

  // Test 9: Storage Sync Preview & Dry-Run
  console.log('\n--- 9. PENGUJIAN PREVIEW & SINKRONISASI DATA ---');
  const syncService = storageManager.getSyncService();
  const preview = await syncService.previewData();
  assert(preview.entityCounts.users.jsonCount > 0, 'Preview sinkronisasi berhasil menghitung record JSON');

  const dryRunResult = await syncService.executeSync('dry_run');
  assert(dryRunResult.success, 'Simulasi Dry Run sinkronisasi berhasil tanpa error');
  assert(dryRunResult.totalRecordsProcessed > 0, `Total record terverifikasi: ${dryRunResult.totalRecordsProcessed}`);

  // Summary
  console.log('\n======================================================');
  console.log(`   HASIL PENGUJIAN: ${passed} BERHASIL, ${failed} GAGAL`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
