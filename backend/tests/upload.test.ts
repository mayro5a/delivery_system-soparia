import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { signAuthToken } from '../src/utils/jwt';
import { PRODUCT_IMAGES_DIR } from '../src/middlewares/upload.middleware';

// PNG 1x1 transparente válido — usado para simular uma foto de verdade sem
// depender de nenhum arquivo de fixture no repositório.
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function authHeader() {
  const token = signAuthToken({ sub: 'admin-teste', email: 'admin@teste.com', role: 'ADMIN' });
  return `Bearer ${token}`;
}

describe('POST /api/admin/products/upload-image', () => {
  it('exige autenticação', async () => {
    const res = await request(app)
      .post('/api/admin/products/upload-image')
      .attach('image', Buffer.from(PNG_1X1_BASE64, 'base64'), 'foto.png');

    expect(res.status).toBe(401);
  });

  it('rejeita arquivo sem nenhuma imagem anexada', async () => {
    const res = await request(app).post('/api/admin/products/upload-image').set('Authorization', authHeader());

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/imagem/i);
  });

  it('rejeita arquivos que não são imagem (ex.: .txt)', async () => {
    const res = await request(app)
      .post('/api/admin/products/upload-image')
      .set('Authorization', authHeader())
      .attach('image', Buffer.from('isso aqui não é uma foto'), 'arquivo.txt');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/imagens/i);
  });

  it('salva a foto em disco e devolve uma URL pública em /uploads/products', async () => {
    const res = await request(app)
      .post('/api/admin/products/upload-image')
      .set('Authorization', authHeader())
      .attach('image', Buffer.from(PNG_1X1_BASE64, 'base64'), 'foto.png');

    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/\/uploads\/products\/[^/]+\.png$/);

    const filename = res.body.data.url.split('/uploads/products/')[1];
    const savedPath = path.join(PRODUCT_IMAGES_DIR, filename);
    expect(fs.existsSync(savedPath)).toBe(true);

    // Limpa o arquivo criado no disco para não deixar lixo entre execuções.
    fs.unlinkSync(savedPath);
  });
});
