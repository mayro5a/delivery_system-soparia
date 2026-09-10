import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

const productInclude = {
  category: true,
  variants: { orderBy: { name: 'asc' as const } },
};

/** Lista pública: usada pelo cardápio do cliente. Sempre reflete o banco em tempo real. */
export function listPublicProducts() {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
  });
}

export function listAdminProducts() {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }
  return product;
}

interface VariantInput {
  id?: string;
  name: string;
  price: number;
  available: boolean;
}

interface ProductInput {
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  available: boolean;
  categoryId: string;
  hasVariants: boolean;
  variants: VariantInput[];
}

export async function createProduct(data: ProductInput) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    throw new AppError('Categoria inválida.', 400);
  }

  return prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image,
      available: data.available,
      hasVariants: data.hasVariants,
      categoryId: data.categoryId,
      variants: data.hasVariants
        ? { create: data.variants.map((v) => ({ name: v.name, price: v.price, available: v.available })) }
        : undefined,
    },
    include: productInclude,
  });
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) {
    throw new AppError('Produto não encontrado.', 404);
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError('Categoria inválida.', 400);
    }
  }

  // Sincroniza variações: atualiza existentes, cria novas, remove as que sumiram do payload.
  if (data.variants) {
    const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id as string);
    await prisma.productVariant.deleteMany({
      where: { productId: id, id: { notIn: incomingIds.length > 0 ? incomingIds : ['__none__'] } },
    });

    for (const variant of data.variants) {
      if (variant.id) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { name: variant.name, price: variant.price, available: variant.available },
        });
      } else {
        await prisma.productVariant.create({
          data: { name: variant.name, price: variant.price, available: variant.available, productId: id },
        });
      }
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image,
      available: data.available,
      hasVariants: data.hasVariants,
      categoryId: data.categoryId,
    },
    include: productInclude,
  });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }
  await prisma.product.delete({ where: { id } });
}

export async function updateAvailability(id: string, available: boolean) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }
  return prisma.product.update({ where: { id }, data: { available }, include: productInclude });
}
