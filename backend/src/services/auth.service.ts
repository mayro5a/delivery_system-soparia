import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { comparePassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
