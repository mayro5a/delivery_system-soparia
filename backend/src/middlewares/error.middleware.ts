import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/** Middleware global de tratamento de erros — sempre responde no formato padrão da API. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return res.status(422).json({
      success: false,
      message: firstIssue?.message ?? 'Dados inválidos.',
      details: err.issues,
    });
  }

  // Erro inesperado: nunca expor stack trace para o cliente final.
  console.error('[ERRO NÃO TRATADO]', err);
  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor. Tente novamente em instantes.',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}
