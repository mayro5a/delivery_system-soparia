import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPaymentResultToOrder,
  createOrder,
  getOrderForCustomer,
  toPublicOrder,
  updateOrderStatus,
} from '../src/services/order.service';
import { createOrderSchema } from '../src/validations/order.schema';
import { AppError } from '../src/utils/AppError';
import { FIXED_DELIVERY_FEE } from '../src/config/constants';
import { prisma } from '../src/lib/prisma';
import { baseOrderInput, createPaidableOrder, createTestCategory, createTestProduct, resetDatabase } from './helpers';
import { sendEmail } from '../src/lib/email';

// O envio de e-mail é testado isoladamente (email.test.ts); aqui só
// verificamos QUANDO ele é disparado, não a chamada real ao provedor SMTP.
vi.mock('../src/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockedSendEmail = vi.mocked(sendEmail);

describe('order.service - criação do pedido', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('calcula subtotal, taxa de entrega fixa e total a partir do banco', async () => {
    const { order } = await createPaidableOrder({ price: 20, quantity: 2 });

    expect(order.subtotal).toBe(40);
    expect(order.deliveryFee).toBe(FIXED_DELIVERY_FEE);
    expect(order.total).toBe(40 + FIXED_DELIVERY_FEE);
    expect(order.items[0].observation).toBe('Sem cheiro-verde');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.orderStatus).toBe('AGUARDANDO_PAGAMENTO');
    expect(order.accessToken).toBeTruthy();
  });

  it('aplica a taxa de entrega fixa independentemente do bairro digitado', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { price: 20 });

    const orderA = await createOrder(
      baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], neighborhood: 'Centro' }),
    );
    const orderB = await createOrder(
      baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }], neighborhood: 'Bairro qualquer que não está cadastrado em lugar nenhum' }),
    );

    expect(orderA.deliveryFee).toBe(FIXED_DELIVERY_FEE);
    expect(orderA.total).toBe(20 + FIXED_DELIVERY_FEE);
    expect(orderB.deliveryFee).toBe(FIXED_DELIVERY_FEE);
    expect(orderB.total).toBe(20 + FIXED_DELIVERY_FEE);
  });

  it('ignora o preço enviado pelo frontend e usa o preço do banco', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { price: 20 });

    const order = await createOrder(
      baseOrderInput({
        // @ts-expect-error - simula um frontend malicioso tentando enviar um preço próprio
        items: [{ productId: soup.id, quantity: 1, unitPrice: 1, subtotal: 1 }],
      }),
    );

    expect(order.subtotal).toBe(20);
    expect(order.total).toBe(20 + FIXED_DELIVERY_FEE);
  });

  it('rejeita pedido com produto esgotado', async () => {
    const category = await createTestCategory();
    const soup = await createTestProduct(category.id, { name: 'Canja', available: false });

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soup.id, quantity: 1 }] })),
    ).rejects.toThrow(/esgotado/i);
  });

  it('rejeita variação esgotada e exige variação para produtos com sabores', async () => {
    const category = await createTestCategory('Refrigerantes');
    const soda = await createTestProduct(category.id, { name: 'Refrigerante', price: 6, hasVariants: true });
    const guarana = await prisma.productVariant.create({
      data: { name: 'Guaraná', price: 6, available: false, productId: soda.id },
    });

    await expect(
      createOrder(baseOrderInput({ items: [{ productId: soda.id, quantity: 1 }] })),
    ).rejects.toThrow(AppError);

    await expect(
      createOrder(
        baseOrderInput({
          items: [{ productId: soda.id, variantId: guarana.id, quantity: 1 }],
        }),
      ),
    ).rejects.toThrow(/esgotado/i);
  });

  it('não permite pedido sem produtos', async () => {
    await expect(createOrder(baseOrderInput({ items: [] }))).rejects.toThrow(AppError);
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
    mockedSendEmail.mockClear();
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

  it('envia o e-mail de confirmação só na primeira aprovação do pagamento', async () => {
    const { order } = await createPaidableOrder();

    await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail.mock.calls[0][0]).toMatchObject({
      to: order.customerEmail,
      subject: expect.stringContaining('confirmado'),
    });

    // Uma segunda confirmação do MESMO pagamento (webhook + poll do navegador,
    // por exemplo) não deve gerar um segundo e-mail.
    await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
  });

  it('não envia e-mail de confirmação quando o pagamento não é aprovado', async () => {
    const { order } = await createPaidableOrder();

    await applyPaymentResultToOrder(order.id, 'REJECTED', 'PIX');
    await applyPaymentResultToOrder(order.id, 'PENDING', 'PIX');

    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('envia o e-mail de "saiu para entrega" quando o pedido muda para essa etapa', async () => {
    const { order } = await createPaidableOrder();
    await applyPaymentResultToOrder(order.id, 'APPROVED', 'PIX');
    mockedSendEmail.mockClear();

    await updateOrderStatus(order.id, 'EM_PREPARO');
    expect(mockedSendEmail).not.toHaveBeenCalled();

    await updateOrderStatus(order.id, 'SAIU_PARA_ENTREGA');
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail.mock.calls[0][0]).toMatchObject({
      to: order.customerEmail,
      subject: expect.stringContaining('saiu para entrega'),
    });
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
