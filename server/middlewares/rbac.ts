import { Request, Response, NextFunction } from 'express';
import { RoleCode } from '../types/entities.js';

export function requirePermission(permissionCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    // Administrator bypass
    if (req.user.roles.includes('ADMINISTRATOR')) {
      next();
      return;
    }

    if (!req.user.permissions.includes(permissionCode)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak: Anda tidak memiliki hak akses '${permissionCode}'.`,
      });
      return;
    }

    next();
  };
}

export function requireRole(...allowedRoles: RoleCode[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole && !req.user.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak: Role yang diizinkan: ${allowedRoles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}

export function enforceScope(req: Request, res: Response, next: NextFunction): void {
  // If user is Kaprodi, enforce that requested studyProgramId matches their scope
  if (req.user && req.user.roles.includes('KAPRODI') && !req.user.roles.includes('ADMINISTRATOR')) {
    const requestedProdi = (req.query.studyProgramId as string) || (req.body.studyProgramId as string);
    if (requestedProdi && req.user.studyProgramId && requestedProdi !== req.user.studyProgramId) {
      res.status(403).json({
        success: false,
        message: 'Akses ditolak: Anda hanya dapat mengakses data program studi yang Anda pimpin.',
      });
      return;
    }
  }
  next();
}
