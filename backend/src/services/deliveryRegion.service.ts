import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export function listPublicDeliveryRegions() {
  return prisma.deliveryRegion.findMany({ where: { available: true }, orderBy: { name: 'asc' } });
}

export function listAdminDeliveryRegions() {
  return prisma.deliveryRegion.findMany({ orderBy: { name: 'asc' } });
}

export async function createDeliveryRegion(data: { name: string; fee: number; available: boolean }) {
  const exists = await prisma.deliveryRegion.findUnique({ where: { name: data.name } });
  if (exists) {
    throw new AppError('Já existe uma região com esse nome.', 409);
  }
  return prisma.deliveryRegion.create({ data });
}

export async function updateDeliveryRegion(
  id: string,
  data: { name?: string; fee?: number; available?: boolean },
) {
  const region = await prisma.deliveryRegion.findUnique({ where: { id } });
  if (!region) {
    throw new AppError('Região de entrega não encontrada.', 404);
  }
  return prisma.deliveryRegion.update({ where: { id }, data });
}

export async function deleteDeliveryRegion(id: string) {
  const region = await prisma.deliveryRegion.findUnique({ where: { id } });
  if (!region) {
    throw new AppError('Região de entrega não encontrada.', 404);
  }
  await prisma.deliveryRegion.delete({ where: { id } });
}
