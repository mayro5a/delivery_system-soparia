import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const app = express();

app.use(
  cors({
    origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => res.json({ success: true, message: 'API da Soparia da Lê no ar.' }));

// Fotos de produtos enviadas pelo admin (ver middlewares/upload.middleware.ts).
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);
