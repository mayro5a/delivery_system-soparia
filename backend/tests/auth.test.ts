import { beforeEach, describe, expect, it } from 'vitest';
import { login } from '../src/services/auth.service';
import { hashPassword } from '../src/utils/password';
import { prisma } from '../src/lib/prisma';
import { resetDatabase } from './helpers';

describe('auth.service - login administrativo (RF06)', () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma.user.create({
      data: {
        name: 'Admin Teste',
        email: 'admin@teste.com',
        password: await hashPassword('senha-correta'),
      },
    });
  });

  it('autentica com credenciais corretas e retorna um token JWT', async () => {
    const result = await login('admin@teste.com', 'senha-correta');
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('admin@teste.com');
  });

  it('rejeita senha incorreta', async () => {
    await expect(login('admin@teste.com', 'senha-errada')).rejects.toThrow();
  });

  it('rejeita e-mail inexistente', async () => {
    await expect(login('naoexiste@teste.com', 'qualquer')).rejects.toThrow();
  });
});
