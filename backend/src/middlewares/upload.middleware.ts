import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';

/**
 * Pasta onde as imagens enviadas pelo admin ficam salvas, sempre relativa ao
 * diretório de trabalho do processo (backend/), então funciona igual em dev
 * (tsx) e em produção (node dist/server.js).
 */
export const PRODUCT_IMAGES_DIR = path.join(process.cwd(), 'uploads', 'products');
fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCT_IMAGES_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname);
    // Nome aleatório: evita colisões e não expõe o nome original do arquivo do admin.
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new AppError('Envie apenas imagens (JPEG, PNG, WEBP ou GIF).', 400));
      return;
    }
    cb(null, true);
  },
}).single('image');

/** Recebe um arquivo de imagem (campo "image") e converte erros do multer em AppError. */
export function uploadProductImage(req: Request, _res: Response, next: NextFunction) {
  upload(req, _res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Imagem muito grande. O tamanho máximo é 5MB.', 400));
      }
      return next(new AppError('Não foi possível enviar a imagem.', 400));
    }
    if (err) return next(err);
    next();
  });
}
