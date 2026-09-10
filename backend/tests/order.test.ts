import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyPaymentResultToOrder,
  createOrder,
  getOrderForCustomer,
  toPublicOrder,
  updateOrderStatus,
} from '../src/services/order.service';
import { createOrderSchema } from '../src/validations/order.schema';
import { AppError } from '../src/utils/AppError';
import { prisma } from '../src/lib/prisma';
import {
  baseOrderInput,
  createPaidableOrder,
  createTestCategory,
  createTestProduct,
  createTestRegion,
  resetDatabase,
} from './helpers';

describe('order.service - criação do pedido', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('calcula subtotal, taxa de entrega e total a partir do banco', async () => {
    const { order } = await createPaidableOrder({ price: 20, fee: 5, quantity: 2 });

    expect(order.subtotal).toBe(40);
    expect(order.deliveryFee).toBe(5);
    expect(order.total).toBe(45);
    expect(order.items[0].observation).toBe('Sem cheiro-verde');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.orderStatus).toBe('AGUARDANDO_PAGAMENTO');
    expect(order.accessToken).toBeTruthy();
  });

  it('calcula a taxa de entrega de acordo com a região escolhida', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { price: 20 });
    const cheap = await createTestRegion({ name: 'Centro', fee: 5 });
    const far = await createTestRegion({ name: 'Cidade Nova', fee: 12 });

    const orderA = await createOrder(
      baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], deliveryRegionId: cheap.id }),
    );
    const orderB = await createOrder(
      baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], deliveryRegionId: far.id }),
    );

    expect(orderA.deliveryFee).toBe(5);
    expect(orderA.total).toBe(25);
    expect(orderB.deliveryFee).toBe(12);
    expect(orderB.total).toBe(32);
  });

  it('ignora o preço enviado pelo frontend e usa o preço do banco', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { price: 20 });
    const region = await createTestRegion();

    const order = await createOrder(
      baseOrderInput({
        // @ts-expect-error - simula um frontend malicioso tentando enviar um preço próprio
        items: [{ productId: soup.id, quantity: 1, unitPrice: 1, subtotal: 1 }],
        deliveryRegionId: region.id,
      }),
    );

    expect(order.subtotal).toBe(20);
    expect(order.total).toBe(25);
  });

  it('rejeita pedido com produto esgotado', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { name: 'Canja', available: false });
    const region = await createTestRegion();

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], deliveryRegionId: region.id })),
    ).rejects.toThrow(/esgotado/i);
  });

  it('rejeita variação esgotada e exige variação para produtos com sabores', async () => {
    const category = await createTestCategory('Refrigerantes');
    const soda = await createTestProduct(category.id, { name: 'Refrigerante', price: 6, hasVariants: true });
    const guarana = await prisma.productVariant.create({
      data: { name: 'Guaraná', price: 6, available: false, productId: soda.id },
    });
    const region = await createTestRegion();

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soda.id, quantity: 1 }], deliveryRegionId: region.id })),
    ).rejects.toThrow(AppError);

    await expect(
      createOrder(
        baseOrderInput({
          items: [{ productId: soda.id, variantId: guarana.id, quantity: 1 }],
          deliveryRegionId: region.id,
        }),
      ),
    ).rejects.toThrow(/esgotado/i);
  });

  it('rejeita região de entrega inválida ou inativa', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id);
    const inactive = await createTestRegion({ name: 'Longe', fee: 30, available: false });

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], deliveryRegionId: inactive.id })),
    ).rejects.toThrow(/região/i);

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], deliveryRegionId: 'nao-existe' })),
    ).rejects.toThrow(/região/i);
  });

  it('não permite pedido sem produtos', async () => {
    const region = await createTestRegion();
    await expect(createOrder(baseOrderInput({ items: [], deliveryRegionId: region.id }))).rejects.toThrow(AppError);
  });

  it('valida os campos obrigatórios do endereço (Zod)', () => {
    const result = createOrderSchema.safeParse({
      body: {
        items: [{ productId: 'abc', quantity: 1 }],
        customerName: 'A',
        customerPhone: '123',
        cep: '123',
        street: '',
        addressNumber: '',
        neighborhood: '',
        city: '',
        state: 'Amazonas',
        deliveryRegionId: '',
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toEqual(
        expect.arrayContaining([
          'body.customerName',
          'body.customerPhone',
          'body.cep',
          'body.street',
          'body.addressNumber',
          'body.neighborhood',
          'body.city',
          'body.state',
          'body.deliveryRegionId',
        ]),
      );
    }
  });

  it('só devolve o pedido ao cliente com o token de acesso correto', async () => {
    const { order } = await createPaidableOrder();

    const found = await getOrderForCustomer(order.id, order.accessToken);
    expect(found.id).toBe(order.id);

    await expect(getOrderForCustomer(order.id, 'token-errado')).rejects.toThrow(/não encontrado/i);
    await expect(getOrderForCustomer(order.id, '')).rejects.toThrow(/não encontrado/i);
  });

  it('não expõe o token de acesso nem gera WhatsApp enquanto não estiver pago', async () => {
    const { order } = await createPaidableOrder();
    const publicView = toPublicOrder(order);

    expect((publicView as Record<string, unknown>).accessToken).toBeUndefined();
    expect(publicView.whatsappUrl).toBeNull();
    expect(publicView.whatsappMessage).toBeNull();
  });
});

describe('order.service - status do pedido', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('marca o pedido como PAGO quando o pagamento é aprovado', async () => {
    const { order } = await createPaidableOrder();

    const updated = await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');

    expect(updated.paymentStatus).toBe('APPROVED');
    expect(updated.orderStatus).toBe('PAGO');
    expect(updated.paymentMethod).toBe('PIX');
    expect(updated.paidAt).toBeInstanceOf(Date);

    const publicView = toPublicOrder(updated);
    expect(publicView.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(publicView.whatsappMessage).toContain('Pagamento já confirmado pelo sistema.');
  });

  it('uma tentativa recusada não "despaga" um pedido já aprovado', async () => {
    const { order } = await createPaidableOrder();
    await applyPaymentResultToOrder(order.id, 'APPROVED', 'CARTAO_CREDITO');

    const updated = await applyPaymentResultToOrder(order.id, 'REJECTED', 'CARTAO_CREDITO');
    expect(updated.paymentStatus).toBe('APPROVED');
    expect(updated.orderStatus).toBe('PAGO');
  });

  it('não deixa o pedido ir para preparo sem pagamento confirmado', async () => {
    const { order } = await createPaidableOrder();

    await expect(updateOrderStatus(order.id, 'EM_PREPARO')).rejects.toThrow(AppError);
    await expect(updateOrderStatus(order.id, 'AGUARDANDO_PREPARO')).rejects.toThrow(AppError);
  });

  it('não permite ao administrador marcar PAGO manualmente', async () => {
    const { order } = await createPaidableOrder();
    await expect(updateOrderStatus(order.id, 'PAGO')).rejects.toThrow(AppError);
  });

  it('segue o fluxo PAGO → AGUARDANDO_PREPARO → EM_PREPARO → SAIU_PARA_ENTREGA → CONCLUIDO', async () => {
    const { order } = await createPaidableOrder();
    await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');

    let current = await updateOrderStatus(order.id, 'AGUARDANDO_PREPARO');
    expect(current.orderStatus).toBe('AGUARDANDO_PREPARO');
    current = await updateOrderStatus(order.id, 'EM_PREPARO');
    expect(current.orderStatus).toBe('EM_PREPARO');
    current = await updateOrderStatus(order.id, 'SAIU_PARA_ENTREGA');
    expect(current.orderStatus).toBe('SAIU_PARA_ENTREGA');
    current = await updateOrderStatus(order.id, 'CONCLUIDO');
    expect(current.orderStatus).toBe('CONCLUIDO');

    // Pedido concluído não volta nem é cancelado.
    await expect(updateOrderStatus(order.id, 'EM_PREPARO')).rejects.toThrow(AppError);
    await expect(updateOrderStatus(order.id, 'CANCELADO')).rejects.toThrow(AppError);
  });

  it('permite cancelar um pedido aguardando pagamento', async () => {
    const { order } = await createPaidableOrder();
    const cancelled = await updateOrderStatus(order.id, 'CANCELADO');
    expect(cancelled.orderStatus).toBe('CANCELADO');
  });

  it('estorno cancela o pedido que ainda não foi concluído', async () => {
    const { order } = await createPaidableOrder();
    await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');

    const refunded = await applyPaymentResultToOrder(order.id, 'REFUNDED', 'PIX');
    expect(refunded.paymentStatus).toBe('REFUNDED');
    expect(refunded.orderStatus).toBe('CANCELADO');
  });
});
