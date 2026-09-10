import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Banco de testes isolado (PostgreSQL): nunca usa o banco de desenvolvimento.
 * Usa TEST_DATABASE_URL ou, se ausente, deriva de DATABASE_URL trocando o nome
 * do banco por "<nome>_test".
 */
function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error('Defina TEST_DATABASE_URL (ou DATABASE_URL) para rodar os testes.');
  }
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/$/, '')}_test`;
  return url.toString();
}

process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
// Credenciais fictícias: o módulo do Mercado Pago é simulado nos testes.
process.env.MP_ACCESS_TOKEN = 'TEST-fake-access-token';
process.env.MP_PUBLIC_KEY = 'TEST-fake-public-key';
process.env.MP_WEBHOOK_SECRET = '';

// Garante que o schema esteja aplicado no banco de testes antes de rodar os testes.
execSync('npx prisma db push --skip-generate --accept-data-loss', {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'ignore',
});
