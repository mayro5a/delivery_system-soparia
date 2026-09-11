import { prisma } from '../src/lib/prisma';
import { createOrder } from '../src/services/order.service';
import { CreateOrderBody } from '../src/validations/order.schema';

/** Limpa todas as tabelas do banco de testes, na ordem correta (respeitando FKs). */
export async function resetDatabase() {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestCategory(name = 'Sopas') {
  return prisma.category.create({ data: { name, order: 1 } });
}

export async function createTestProduct(
  categoryId: string,
  overrides: Partial<{ name: string; price: number; available: boolean; hasVariants: boolean }> = {},
) {
  return prisma.product.create({
    data: {
      name: overrides.name ?? 'Sopa de Carne',
      price: overrides.price ?? 20,
      available: overrides.available ?? true,
      hasVariants: overrides.hasVariants ?? false,
      categoryId,
    },
  });
}

/** Endereço válido padrão para os testes de pedido. */
export function baseOrderInput(overrides: Partial<CreateOrderBody> = {}): CreateOrderBody {
  return {
    items: [],
    customerName: 'João da Silva',
    customerPhone: '(92) 99999-9999',
    cep: '69010-000',
    street: 'Rua Exemplo',
    addressNumber: '123',
    neighborhood: 'Centro',
    complement: 'Casa',
    reference: 'Próximo à praça',
    city: 'Manaus',
    state: 'AM',
    ...overrides,
  };
}

/** Cria categoria + produto e um pedido pronto para ser pago. */
export async function createPaidableOrder(opts: { price?: number; quantity?: number } = {}) {
  const category = await createTestCategory();
  const product = await createTestProduct(category.id, { price: opts.price ?? 20 });
  const order = await createOrder(
    baseOrderInput({
      items: [{ productId: product.id, quantity: opts.quantity ?? 2, observation: 'Sem cheiro-verde' }],
    }),
  );
  return { category, product, order };
}
