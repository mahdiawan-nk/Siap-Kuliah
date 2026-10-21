import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[SIAP-KULIAH ERROR]', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
