import bcrypt from 'bcryptjs';
import { StorageManager } from '../storage/StorageManager.js';
import { User, Student, Lecturer, Role, Permission, AuthUserPayload } from '../types/entities.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/crypto.js';

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: AuthUserPayload;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(identifierRaw: string, passwordRaw: string, clientIp = '127.0.0.1'): Promise<LoginResult> {
    const storage = StorageManager.getInstance().getStorage();
    const identifier = (identifierRaw || '').trim();
    const password = (passwordRaw || '').trim();

    if (!identifier || !password) {
      throw new Error('Identifier dan kata sandi wajib diisi.');
    }

    // 1. Try finding student by NIM
    let targetUser: User | null = null;
    let studentProfile: Student | null = null;
    let lecturerProfile: Lecturer | null = null;

    const student = await storage.findOne<Student>('students', s => s.nim.toLowerCase() === identifier.toLowerCase());
    if (student) {
      studentProfile = student;
      targetUser = await storage.getById<User>('users', student.userId);
    }

    // 2. Try finding lecturer by NIDN or NIP
    if (!targetUser) {
      const lecturer = await storage.findOne<Lecturer>('lecturers', l => 
        Boolean((l.nidn && l.nidn.toLowerCase() === identifier.toLowerCase()) ||
        (l.nip && l.nip.toLowerCase() === identifier.toLowerCase()))
      );
      if (lecturer) {
        lecturerProfile = lecturer;
        targetUser = await storage.getById<User>('users', lecturer.userId);
      }
    }

    // 3. Try finding user directly by username (Administrator or fallback)
    if (!targetUser) {
      targetUser = await storage.findOne<User>('users', u => u.username.toLowerCase() === identifier.toLowerCase());
      if (targetUser) {
        // Check if this user also has a student or lecturer profile
        studentProfile = await storage.findOne<Student>('students', s => s.userId === targetUser!.id);
        lecturerProfile = await storage.findOne<Lecturer>('lecturers', l => l.userId === targetUser!.id);
      }
    }

    // Generic error to prevent account enumeration
    if (!targetUser) {
      throw new Error('Kredensial tidak valid atau akun tidak ditemukan.');
    }

    if (targetUser.status !== 'ACTIVE') {
      throw new Error('Akun Anda tidak aktif atau ditangguhkan. Hubungi Administrator.');
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, targetUser.passwordHash);
    if (!passwordMatch) {
      throw new Error('Kredensial tidak valid atau akun tidak ditemukan.');
    }

    // Update lastLoginAt
    const now = new Date().toISOString();
    await storage.update<User>('users', targetUser.id, { lastLoginAt: now });

    // Fetch user roles & permissions
    const userRoleMappings = await storage.find<any>('user_roles', ur => ur.userId === targetUser!.id);
    const roleIds = userRoleMappings.map((ur: any) => ur.roleId);
    const allRoles = await storage.getAll<Role>('roles');
    const roles = allRoles.filter(r => roleIds.includes(r.id)).map(r => r.code);

    const rolePermMappings = await storage.find<any>('role_permissions', rp => roleIds.includes(rp.roleId));
    const permIds = [...new Set(rolePermMappings.map((rp: any) => rp.permissionId))];
    const allPerms = await storage.getAll<Permission>('permissions');
    const permissions = allPerms.filter(p => permIds.includes(p.id)).map(p => p.code);

    const fullName = studentProfile?.fullName || lecturerProfile?.fullName || (targetUser.username === 'admin' ? 'Administrator Kampus' : targetUser.username);
    const studyProgramId = studentProfile?.studyProgramId || lecturerProfile?.studyProgramId;

    const payload: AuthUserPayload = {
      userId: targetUser.id,
      username: targetUser.username,
      fullName,
      roles,
      permissions,
      studentId: studentProfile?.id,
      lecturerId: lecturerProfile?.id,
      studyProgramId,
    };

    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: targetUser.id });

    // Record audit log
    await storage.create('audit_logs', {
      actorUserId: targetUser.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: targetUser.id,
      reason: `Login berhasil dari ${clientIp}`,
      beforeData: null,
      afterData: JSON.stringify({ username: targetUser.username, roles }),
      requestId: `req-${Date.now()}`
    });

    return { token, refreshToken, user: payload };
  }

  public async refresh(refreshToken: string): Promise<{ token: string; user: AuthUserPayload }> {
    const verified = verifyRefreshToken(refreshToken);
    if (!verified) {
      throw new Error('Refresh token tidak valid atau telah kedaluwarsa.');
    }

    const storage = StorageManager.getInstance().getStorage();
    const user = await storage.getById<User>('users', verified.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new Error('Pengguna tidak valid.');
    }

    const studentProfile = await storage.findOne<Student>('students', s => s.userId === user.id);
    const lecturerProfile = await storage.findOne<Lecturer>('lecturers', l => l.userId === user.id);

    const userRoleMappings = await storage.find<any>('user_roles', ur => ur.userId === user.id);
    const roleIds = userRoleMappings.map((ur: any) => ur.roleId);
    const allRoles = await storage.getAll<Role>('roles');
    const roles = allRoles.filter(r => roleIds.includes(r.id)).map(r => r.code);

    const rolePermMappings = await storage.find<any>('role_permissions', rp => roleIds.includes(rp.roleId));
    const permIds = [...new Set(rolePermMappings.map((rp: any) => rp.permissionId))];
    const allPerms = await storage.getAll<Permission>('permissions');
    const permissions = allPerms.filter(p => permIds.includes(p.id)).map(p => p.code);

    const fullName = studentProfile?.fullName || lecturerProfile?.fullName || user.username;
    const studyProgramId = studentProfile?.studyProgramId || lecturerProfile?.studyProgramId;

    const payload: AuthUserPayload = {
      userId: user.id,
      username: user.username,
      fullName,
      roles,
      permissions,
      studentId: studentProfile?.id,
      lecturerId: lecturerProfile?.id,
      studyProgramId,
    };

    const token = signAccessToken(payload);
    return { token, user: payload };
  }
}
