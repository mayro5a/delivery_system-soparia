import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { MpPaymentResponse } from '../src/lib/mercadopago';

// O provedor é simulado: nenhum teste fala com o Mercado Pago de verdade.
vi.mock('../src/lib/mercadopago', () => ({
  mpCreatePayment: vi.fn(),
  mpGetPayment: vi.fn(),
  mpValidateWebhookSignature: vi.fn(),
  isMercadoPagoConfigured: () => true,
}));

import { mpCreatePayment, mpGetPayment, mpValidateWebhookSignature } from '../src/lib/mercadopago';
import {
  createPayment,
  describeRejection,
  getPaymentForCustomer,
  handleWebhook,
  mapProviderStatus,
  syncPaymentByProviderId,
} from '../src/services/payment.service';
import { getOrderById } from '../src/services/order.service';
import { AppError } from '../src/utils/AppError';
import { prisma } from '../src/lib/prisma';
import { createPaidableOrder, resetDatabase } from './helpers';

const mockedCreate = vi.mocked(mpCreatePayment);
const mockedGet = vi.mocked(mpGetPayment);
const mockedValidate = vi.mocked(mpValidateWebhookSignature);

let nextProviderId = 1000;

function mpResponse(overrides: Partial<MpPaymentResponse> = {}): MpPaymentResponse {
  return {
    id: nextProviderId++,
    status: 'pending',
    status_detail: 'pending_waiting_transfer',
    transaction_amount: 45,
    currency_id: 'BRL',
    payment_type_id: 'bank_transfer',
    payment_method_id: 'pix',
    ...overrides,
  } as MpPaymentResponse;
}

function pixInput(orderId: number, orderToken: string, idempotencyKey = randomUUID()) {
  return {
    orderId,
    orderToken,
    idempotencyKey,
    selectedPaymentMethod: 'bank_transfer' as const,
    formData: {
      payment_method_id: 'pix',
      transaction_amount: 1, // valor manipulado pelo navegador: deve ser ignorado
      payer: { email: 'cliente@teste.com', identification: { type: 'CPF', number: '12345678909' } },
    },
  };
}

function cardInput(orderId: number, orderToken: string, idempotencyKey = randomUUID()) {
  return {
    orderId,
    orderToken,
    idempotencyKey,
    selectedPaymentMethod: 'creditCard' as const,
    formData: {
      token: 'tok_teste_123',
      issuer_id: '25',
      payment_method_id: 'visa',
      installments: 1,
      transaction_amount: 1,
      payer: { email: 'cliente@teste.com', identification: { type: 'CPF', number: '12345678909' } },
    },
  };
}

describe('payment.service - mapeamento de status', () => {
  it('converte os status do Mercado Pago para os status internos', () => {
    expect(mapProviderStatus('approved')).toBe('APPROVED');
    expect(mapProviderStatus('rejected')).toBe('REJECTED');
    expect(mapProviderStatus('cancelled')).toBe('CANCELLED');
    expect(mapProviderStatus('refunded')).toBe('REFUNDED');
    expect(mapProviderStatus('charged_back')).toBe('REFUNDED');
    expect(mapProviderStatus('pending')).toBe('PENDING');
    expect(mapProviderStatus('in_process')).toBe('PENDING');
    expect(mapProviderStatus(undefined)).toBe('PENDING');
  });

  it('descreve recusas de cartão em português', () => {
    expect(describeRejection('cc_rejected_insufficient_amount')).toMatch(/limite/i);
    expect(describeRejection('qualquer_outro')).toMatch(/recusado/i);
  });
});

describe('payment.service - criação de pagamento', () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.clearAllMocks();
    // Consultas ao MP (sincronização de pendentes) devolvem "ainda pendente" por padrão.
    mockedGet.mockImplementation(async (id) => mpResponse({ id: Number(id) }));
  });

  it('cria um pagamento Pix cobrando o total calculado no servidor (não o do navegador)', async () => {
    const { order } = await createPaidableOrder({ price: 20, fee: 5, quantity: 2 });
    mockedCreate.mockResolvedValueOnce(
      mpResponse({
        point_of_interaction: {
          transaction_data: { qr_code: '000201pix-copia-e-cola', qr_code_base64: 'QkFTRTY0', ticket_url: 'https://mp/ticket' },
        },
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );

    const payment = await createPayment(pixInput(order.id, order.accessToken));

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    const [body, idempotencyKey] = mockedCreate.mock.calls[0];
    expect(body.transaction_amount).toBe(45);
    expect(body.external_reference).toBe(String(order.id));
    expect(body.payment_method_id).toBe('pix');
    expect(body.date_of_expiration).toBeTruthy();
    expect(idempotencyKey).toBeTruthy();

    expect(payment.method).toBe('PIX');
    expect(payment.status).toBe('PENDING');
    expect(payment.amount).toBe(45);
    expect(payment.pix?.qrCode).toBe('000201pix-copia-e-cola');
    expect(payment.pix?.qrCodeBase64).toBe('QkFTRTY0');

    const refreshed = await getOrderById(order.id);
    expect(refreshed.paymentMethod).toBe('PIX');
    expect(refreshed.paymentStatus).toBe('PENDING');
    expect(refreshed.orderStatus).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('cartão aprovado marca o pedido como PAGO', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(
      mpResponse({ status: 'approved', status_detail: 'accredited', payment_type_id: 'credit_card', payment_method_id: 'visa' }),
    );

    const payment = await createPayment(cardInput(order.id, order.accessToken));

    const [body] = mockedCreate.mock.calls[0];
    expect(body.token).toBe('tok_teste_123');
    expect(body.issuer_id).toBe(25);
    expect(body.installments).toBe(1);

    expect(payment.method).toBe('CARTAO_CREDITO');
    expect(payment.status).toBe('APPROVED');

    const refreshed = await getOrderById(order.id);
    expect(refreshed.paymentStatus).toBe('APPROVED');
    expect(refreshed.orderStatus).toBe('PAGO');
    expect(refreshed.paidAt).toBeInstanceOf(Date);
  });

  it('cartão recusado registra REJECTED e mantém o pedido aguardando pagamento', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(
      mpResponse({ status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', payment_type_id: 'credit_card' }),
    );

    const payment = await createPayment(cardInput(order.id, order.accessToken));
    expect(payment.status).toBe('REJECTED');
    expect(payment.statusDetail).toBe('cc_rejected_insufficient_amount');

    const refreshed = await getOrderById(order.id);
    expect(refreshed.paymentStatus).toBe('REJECTED');
    expect(refreshed.orderStatus).toBe('AGUARDANDO_PAGAMENTO');

    // O cliente pode tentar de novo com outra chave.
    mockedCreate.mockResolvedValueOnce(mpResponse({ status: 'approved', payment_type_id: 'credit_card' }));
    const retry = await createPayment(cardInput(order.id, order.accessToken));
    expect(retry.status).toBe('APPROVED');
    expect((await getOrderById(order.id)).orderStatus).toBe('PAGO');
  });

  it('pagamento pendente (em análise) fica PENDING até confirmação', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(
      mpResponse({ status: 'in_process', status_detail: 'pending_review_manual', payment_type_id: 'credit_card' }),
    );

    const payment = await createPayment(cardInput(order.id, order.accessToken));
    expect(payment.status).toBe('PENDING');
    expect((await getOrderById(order.id)).orderStatus).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('idempotência: a mesma chave não cria um segundo pagamento nem chama o provedor de novo', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse());
    const key = randomUUID();

    const first = await createPayment(pixInput(order.id, order.accessToken, key));
    const second = await createPayment(pixInput(order.id, order.accessToken, key));

    expect(second.id).toBe(first.id);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count()).toBe(1);
  });

  it('reaproveita um Pix pendente ainda válido em vez de gerar outro QR Code', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(
      mpResponse({ date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
    );

    const first = await createPayment(pixInput(order.id, order.accessToken));
    const second = await createPayment(pixInput(order.id, order.accessToken, randomUUID()));

    expect(second.id).toBe(first.id);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it('recusa pagamento com token do pedido inválido', async () => {
    const { order } = await createPaidableOrder();
    await expect(createPayment(pixInput(order.id, 'token-invalido'))).rejects.toThrow(/não encontrado/i);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('não permite pagar duas vezes um pedido já aprovado', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse({ status: 'approved', payment_type_id: 'credit_card' }));
    await createPayment(cardInput(order.id, order.accessToken));

    await expect(createPayment(pixInput(order.id, order.accessToken))).rejects.toThrow(/já está pago/i);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it('exige token do cartão para pagamentos com cartão', async () => {
    const { order } = await createPaidableOrder();
    const input = cardInput(order.id, order.accessToken);
    input.formData.token = '';

    await expect(createPayment(input)).rejects.toThrow(AppError);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('erro do provedor não deixa pagamento fantasma no banco', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockRejectedValueOnce(Object.assign(new Error('bad request'), { status: 400 }));

    await expect(createPayment(pixInput(order.id, order.accessToken))).rejects.toThrow(AppError);
    expect(await prisma.payment.count()).toBe(0);
  });
});

describe('payment.service - atualização e webhook', () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.clearAllMocks();
  });

  it('consulta pelo cliente reconsulta o MP e atualiza o pagamento pendente para PAGO', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse({ id: 5001 }));
    const payment = await createPayment(pixInput(order.id, order.accessToken));

    mockedGet.mockResolvedValueOnce(mpResponse({ id: 5001, status: 'approved', status_detail: 'accredited' }));
    const refreshed = await getPaymentForCustomer(payment.id, order.accessToken);

    expect(mockedGet).toHaveBeenCalledWith('5001');
    expect(refreshed.status).toBe('APPROVED');
    expect((await getOrderById(order.id)).orderStatus).toBe('PAGO');
  });

  it('consulta pelo cliente exige o token do pedido', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse());
    const payment = await createPayment(pixInput(order.id, order.accessToken));

    await expect(getPaymentForCustomer(payment.id, 'errado')).rejects.toThrow(/não encontrado/i);
  });

  it('webhook consulta o MP (não confia no payload) e marca o pedido como pago', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse({ id: 7001 }));
    await createPayment(pixInput(order.id, order.accessToken));

    mockedGet.mockResolvedValueOnce(mpResponse({ id: 7001, status: 'approved', status_detail: 'accredited' }));

    const result = await handleWebhook({
      query: { 'data.id': '7001', type: 'payment' },
      // Payload mentiroso: diz "rejected", mas a fonte de verdade é a consulta ao MP.
      body: { action: 'payment.updated', type: 'payment', data: { id: '7001', status: 'rejected' } },
      headers: {},
    });

    expect(result.processed).toBe(true);
    expect(mockedGet).toHaveBeenCalledWith('7001');

    const refreshed = await getOrderById(order.id);
    expect(refreshed.paymentStatus).toBe('APPROVED');
    expect(refreshed.orderStatus).toBe('PAGO');
    expect(refreshed.payments[0].status).toBe('APPROVED');
  });

  it('webhook ignora notificações que não são de pagamento', async () => {
    const result = await handleWebhook({ query: { type: 'merchant_order', 'data.id': '1' }, body: {}, headers: {} });
    expect(result.processed).toBe(false);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('webhook lê o id do corpo quando não vem na query', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse({ id: 7002 }));
    await createPayment(pixInput(order.id, order.accessToken));
    mockedGet.mockResolvedValueOnce(mpResponse({ id: 7002, status: 'cancelled' }));

    const result = await handleWebhook({ query: {}, body: { action: 'payment.updated', data: { id: 7002 } }, headers: {} });

    expect(result.processed).toBe(true);
    const refreshed = await getOrderById(order.id);
    expect(refreshed.payments[0].status).toBe('CANCELLED');
    expect(refreshed.paymentStatus).toBe('CANCELLED');
    expect(refreshed.orderStatus).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('webhook rejeita assinatura inválida quando o segredo está configurado', async () => {
    const { env } = await import('../src/config/env');
    const original = env.mercadoPago.webhookSecret;
    env.mercadoPago.webhookSecret = 'segredo';
    mockedValidate.mockImplementationOnce(() => {
      throw new Error('assinatura inválida');
    });

    try {
      await expect(
        handleWebhook({ query: { 'data.id': '1', type: 'payment' }, body: {}, headers: { 'x-signature': 'ts=1,v1=abc' } }),
      ).rejects.toMatchObject({ statusCode: 401 });
      expect(mockedGet).not.toHaveBeenCalled();
    } finally {
      env.mercadoPago.webhookSecret = original;
    }
  });

  it('webhook reconstrói um pagamento conhecido pelo MP mas ausente no banco', async () => {
    const { order } = await createPaidableOrder();
    mockedGet.mockResolvedValueOnce(
      mpResponse({ id: 9001, status: 'approved', external_reference: String(order.id), payment_type_id: 'credit_card' }),
    );

    const payment = await syncPaymentByProviderId('9001');

    expect(payment?.providerPaymentId).toBe('9001');
    expect(payment?.method).toBe('CARTAO_CREDITO');
    expect(payment?.status).toBe('APPROVED');
    expect((await getOrderById(order.id)).orderStatus).toBe('PAGO');
  });

  it('webhook de estorno reflete REFUNDED no pagamento e cancela o pedido', async () => {
    const { order } = await createPaidableOrder();
    mockedCreate.mockResolvedValueOnce(mpResponse({ id: 7003, status: 'approved', payment_type_id: 'credit_card' }));
    await createPayment(cardInput(order.id, order.accessToken));
    expect((await getOrderById(order.id)).orderStatus).toBe('PAGO');

    mockedGet.mockResolvedValueOnce(mpResponse({ id: 7003, status: 'refunded' }));
    await handleWebhook({ query: { 'data.id': '7003', type: 'payment' }, body: {}, headers: {} });

    const refreshed = await getOrderById(order.id);
    expect(refreshed.paymentStatus).toBe('REFUNDED');
    expect(refreshed.orderStatus).toBe('CANCELADO');
  });
});
