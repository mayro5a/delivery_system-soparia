import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export function listCategories() {
  return prisma.category.findMany({ orderBy: { order: 'asc' } });
}

export async function createCategory(data: { name: string; description?: string | null; order?: number }) {
  const exists = await prisma.category.findUnique({ where: { name: data.name } });
  if (exists) {
    throw new AppError('Já existe uma categoria com esse nome.', 409);
  }
  return prisma.category.create({ data });
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string | null; order?: number },
) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError('Categoria não encontrada.', 404);
  }
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, include: { products: true } });
  if (!category) {
    throw new AppError('Categoria não encontrada.', 404);
  }
  if (category.products.length > 0) {
    throw new AppError('Não é possível excluir uma categoria que possui produtos cadastrados.', 400);
  }
  await prisma.category.delete({ where: { id } });
}
