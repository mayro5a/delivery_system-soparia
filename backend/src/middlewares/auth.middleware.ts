import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { AuthTokenPayload, verifyAuthToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/** Protege rotas administrativas exigindo um Bearer token JWT válido. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Não autorizado. Faça login novamente.', 401);
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    throw new AppError('Sessão expirada ou inválida. Faça login novamente.', 401);
  }
}
