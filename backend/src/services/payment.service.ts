import { Payment, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import {
  MpPaymentCreateRequest,
  MpPaymentResponse,
  mpCreatePayment,
  mpGetPayment,
  mpValidateWebhookSignature,
} from '../lib/mercadopago';
import { AppError } from '../utils/AppError';
import { CreatePaymentBody } from '../validations/payment.schema';
import { applyPaymentResultToOrder, getOrderForCustomer, money, toPublicPayment } from './order.service';

// ---------------------------------------------------------------------------
// Mapeamentos Mercado Pago <-> domínio
// ---------------------------------------------------------------------------

/** Converte o status do Mercado Pago para o status interno do pagamento. */
export function mapProviderStatus(status?: string | null): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELLED';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    // pending, in_process, in_mediation, authorized...
    default:
      return 'PENDING';
  }
}

function methodFromProviderType(paymentTypeId?: string | null): PaymentMethod {
  switch (paymentTypeId) {
    case 'credit_card':
      return 'CARTAO_CREDITO';
    case 'debit_card':
    case 'prepaid_card':
      return 'CARTAO_DEBITO';
    default:
      return 'PIX';
  }
}

/** Tipos de cartão que tratamos como débito (o Brick pode enviar camelCase ou snake_case). */
const DEBIT_BRICK_TYPES: ReadonlySet<string> = new Set(['debitCard', 'debit_card', 'prepaidCard', 'prepaid_card']);

/** Determina o meio de pagamento escolhido no Brick e valida os dados mínimos. */
function resolveMethod(input: CreatePaymentBody): PaymentMethod {
  const { selectedPaymentMethod, formData } = input;

  if (selectedPaymentMethod === 'bank_transfer') {
    if (formData.payment_method_id !== 'pix') {
      throw new AppError('Somente Pix é aceito como transferência bancária.', 400);
    }
    return 'PIX';
  }

  if (!formData.token) {
    throw new AppError('Dados do cartão inválidos. Preencha novamente o formulário de pagamento.', 400);
  }
  return DEBIT_BRICK_TYPES.has(selectedPaymentMethod) ? 'CARTAO_DEBITO' : 'CARTAO_CREDITO';
}

/** Formato de data exigido pelo MP: 2024-01-31T20:15:00.000-04:00 */
function toMercadoPagoDate(date: Date): string {
  const pad = (n: number, size = 2) => String(Math.abs(n)).padStart(size, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${offset}`
  );
}

/** Mensagens amigáveis para os principais status_detail de recusa do MP. */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
  cc_rejected_bad_filled_date: 'Data de validade do cartão inválida.',
  cc_rejected_bad_filled_other: 'Verifique os dados do cartão.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
  cc_rejected_blacklist: 'Não foi possível processar o pagamento com este cartão.',
  cc_rejected_call_for_authorize: 'Ligue para a operadora do cartão para autorizar o pagamento.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com a operadora.',
  cc_rejected_card_error: 'Não foi possível processar o pagamento com este cartão.',
  cc_rejected_duplicated_payment: 'Você já fez um pagamento com esse valor. Se precisar pagar de novo, use outro cartão.',
  cc_rejected_high_risk: 'Pagamento recusado. Tente outro meio de pagamento.',
  cc_rejected_insufficient_amount: 'Cartão sem limite suficiente.',
  cc_rejected_invalid_installments: 'O cartão não aceita esse número de parcelas.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente outro cartão.',
  cc_rejected_other_reason: 'O cartão não processou o pagamento. Tente outro cartão ou Pix.',
};

export function describeRejection(statusDetail?: string | null): string {
  return (statusDetail && REJECTION_MESSAGES[statusDetail]) || 'Pagamento recusado. Tente outro cartão ou pague com Pix.';
}

// ---------------------------------------------------------------------------
// Sincronização com o provedor
// ---------------------------------------------------------------------------

function providerDataToUpdate(mp: MpPaymentResponse): Prisma.PaymentUpdateInput {
  const tx = mp.point_of_interaction?.transaction_data;
  return {
    providerPaymentId: mp.id != null ? String(mp.id) : undefined,
    status: mapProviderStatus(mp.status),
    statusDetail: mp.status_detail ?? null,
    pixQrCode: tx?.qr_code ?? undefined,
    pixQrCodeBase64: tx?.qr_code_base64 ?? undefined,
    pixTicketUrl: tx?.ticket_url ?? undefined,
    expiresAt: mp.date_of_expiration ? new Date(mp.date_of_expiration) : undefined,
  };
}

/**
 * Persiste a resposta REAL do Mercado Pago no pagamento local e reflete o
 * resultado no pedido — tudo na mesma transação.
 */
async function applyProviderResponse(paymentId: string, mp: MpPaymentResponse): Promise<Payment> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: providerDataToUpdate(mp),
    });
    await applyPaymentResultToOrder(updated.orderId, updated.status, updated.method, tx);
    return updated;
  });
}

/** Evita consultar o MP a cada poll do navegador: no máximo uma consulta a cada 3s por pagamento. */
const lastSyncAt = new Map<string, number>();
const SYNC_THROTTLE_MS = 3000;

/** Reconsulta o Mercado Pago quando o pagamento ainda está pendente. */
export async function syncPaymentWithProvider(payment: Payment, force = false): Promise<Payment> {
  if (!payment.providerPaymentId) return payment;
  if (payment.status !== 'PENDING' && !force) return payment;

  const last = lastSyncAt.get(payment.id) ?? 0;
  if (!force && Date.now() - last < SYNC_THROTTLE_MS) return payment;
  lastSyncAt.set(payment.id, Date.now());

  const mp = await mpGetPayment(payment.providerPaymentId);
  if (!mp?.id) return payment;
  return applyProviderResponse(payment.id, mp);
}

/** Usado pela tela do pedido: atualiza os pagamentos pendentes antes de responder. */
export async function refreshPendingPaymentsForOrder(orderId: number): Promise<void> {
  const pending = await prisma.payment.findMany({
    where: { orderId, status: 'PENDING', providerPaymentId: { not: null } },
  });
  for (const payment of pending) {
    try {
      await syncPaymentWithProvider(payment);
    } catch (err) {
      // Falha temporária ao consultar o MP não deve derrubar a tela do cliente;
      // o webhook e o próximo poll cuidam da atualização.
      console.error('[payments] falha ao sincronizar pagamento', payment.id, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Criação de pagamento
// ---------------------------------------------------------------------------

export async function createPayment(input: CreatePaymentBody) {
  // 1) Idempotência: a mesma chave sempre devolve o mesmo pagamento.
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return toPublicPayment(await syncPaymentWithProvider(existing));
  }

  // 2) Pedido válido, do próprio cliente, ainda não pago.
  const order = await getOrderForCustomer(input.orderId, input.orderToken);
  if (order.orderStatus === 'CANCELADO') {
    throw new AppError('Este pedido foi cancelado.', 400);
  }
  if (order.paymentStatus === 'APPROVED') {
    throw new AppError('Este pedido já está pago.', 409);
  }

  const method = resolveMethod(input);

  // 3) Pix: reaproveita um QR Code pendente e ainda válido em vez de gerar outro.
  if (method === 'PIX') {
    const pendingPix = order.payments.find(
      (p) =>
        p.method === 'PIX' &&
        p.status === 'PENDING' &&
        p.providerPaymentId &&
        (!p.expiresAt || p.expiresAt.getTime() > Date.now()),
    );
    if (pendingPix) {
      return toPublicPayment(await syncPaymentWithProvider(pendingPix));
    }
  }

  // 4) Registra a tentativa localmente ANTES de chamar o provedor.
  let local: Payment;
  try {
    local = await prisma.payment.create({
      data: {
        orderId: order.id,
        idempotencyKey: input.idempotencyKey,
        method,
        status: 'PENDING',
        amount: money(order.total), // valor calculado no servidor, nunca o do navegador
        currency: 'BRL',
      },
    });
  } catch (err) {
    // Duas requisições simultâneas com a mesma chave: devolve a que venceu a corrida.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (winner) return toPublicPayment(await syncPaymentWithProvider(winner));
    }
    throw err;
  }

  // 5) Monta a requisição para o Mercado Pago.
  const { formData } = input;
  const orderNumber = `#${String(order.id).padStart(3, '0')}`;
  const body: MpPaymentCreateRequest = {
    transaction_amount: local.amount,
    description: `Pedido ${orderNumber} - Soparia da Lê`,
    external_reference: String(order.id),
    payment_method_id: formData.payment_method_id,
    payer: {
      email: formData.payer.email,
      first_name: formData.payer.first_name ?? undefined,
      last_name: formData.payer.last_name ?? undefined,
      identification: formData.payer.identification ?? undefined,
    },
    metadata: { order_id: order.id, local_payment_id: local.id },
    additional_info: {
      items: order.items.map((item) => ({
        id: item.productId ?? item.id,
        title: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    },
  };

  if (env.mercadoPago.webhookUrl) {
    body.notification_url = env.mercadoPago.webhookUrl;
  }

  if (method === 'PIX') {
    body.date_of_expiration = toMercadoPagoDate(
      new Date(Date.now() + env.mercadoPago.pixExpirationMinutes * 60 * 1000),
    );
  } else {
    body.token = formData.token ?? undefined;
    body.installments = formData.installments ?? 1;
    if (formData.issuer_id != null && formData.issuer_id !== '') {
      body.issuer_id = Number(formData.issuer_id);
    }
    body.statement_descriptor = env.mercadoPago.statementDescriptor;
  }

  // 6) Chama o provedor com a MESMA chave de idempotência (evita cobrança duplicada).
  let mp: MpPaymentResponse;
  try {
    mp = await mpCreatePayment(body, input.idempotencyKey);
  } catch (err) {
    // Sem resposta válida do provedor não guardamos a tentativa: o cliente pode
    // tentar de novo com a mesma chave e o MP garante que não haverá duplicidade.
    await prisma.payment.delete({ where: { id: local.id } }).catch(() => undefined);
    throw toFriendlyProviderError(err);
  }

  const saved = await applyProviderResponse(local.id, mp);
  return toPublicPayment(saved);
}

function toFriendlyProviderError(err: unknown): AppError {
  // Erros já tratados (ex.: MP_ACCESS_TOKEN ausente) seguem com a mensagem original.
  if (err instanceof AppError) return err;

  const anyErr = err as { status?: number; message?: string; cause?: unknown };
  console.error('[payments] erro do Mercado Pago:', anyErr?.message, anyErr?.cause ?? '');

  if (anyErr?.status === 401 || anyErr?.status === 403) {
    return new AppError('Pagamento online indisponível no momento. Fale conosco pelo WhatsApp.', 503);
  }
  if (anyErr?.status && anyErr.status >= 500) {
    return new AppError('O serviço de pagamento está instável. Tente novamente em instantes.', 502);
  }
  return new AppError(
    'Não foi possível processar o pagamento. Verifique os dados informados e tente novamente.',
    400,
  );
}

// ---------------------------------------------------------------------------
// Consulta pelo cliente
// ---------------------------------------------------------------------------

export async function getPaymentForCustomer(paymentId: string, orderToken: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || !orderToken || payment.order.accessToken !== orderToken) {
    throw new AppError('Pagamento não encontrado.', 404);
  }
  const { order: _order, ...plain } = payment;
  return toPublicPayment(await syncPaymentWithProvider(plain));
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * Sincroniza um pagamento a partir do ID do Mercado Pago. O payload da
 * notificação NUNCA é usado como fonte de verdade: sempre consultamos o MP.
 */
export async function syncPaymentByProviderId(providerPaymentId: string): Promise<Payment | null> {
  const mp = await mpGetPayment(providerPaymentId);
  if (!mp?.id) return null;

  let local = await prisma.payment.findUnique({ where: { providerPaymentId: String(mp.id) } });

  if (!local) {
    // Pagamento criado no MP mas não registrado localmente (ex.: falha após a
    // criação). Reconstrói a partir do external_reference (id do pedido).
    const orderId = Number(mp.external_reference);
    if (!Number.isInteger(orderId)) return null;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    local = await prisma.payment.create({
      data: {
        orderId: order.id,
        idempotencyKey: `mp:${mp.id}`,
        providerPaymentId: String(mp.id),
        method: methodFromProviderType(mp.payment_type_id),
        status: 'PENDING',
        amount: money(mp.transaction_amount ?? order.total),
        currency: mp.currency_id ?? 'BRL',
      },
    });
  }

  return applyProviderResponse(local.id, mp);
}

export interface WebhookRequest {
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value == null) return undefined;
  return String(value);
}

/**
 * Trata a notificação do Mercado Pago:
 *  1. valida a assinatura (quando MP_WEBHOOK_SECRET está configurado)
 *  2. identifica o pagamento
 *  3. consulta o status REAL no Mercado Pago
 *  4. atualiza pagamento e pedido no banco
 */
export async function handleWebhook(req: WebhookRequest): Promise<{ processed: boolean; paymentId?: string }> {
  const body = (req.body ?? {}) as { type?: string; action?: string; data?: { id?: unknown } };
  const dataId = firstString(req.query['data.id']) ?? firstString(body.data?.id);
  const type = firstString(req.query.type) ?? body.type ?? (body.action?.startsWith('payment') ? 'payment' : undefined);

  if (env.mercadoPago.webhookSecret) {
    try {
      mpValidateWebhookSignature({
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId,
        secret: env.mercadoPago.webhookSecret,
      });
    } catch (err) {
      console.warn('[webhook] assinatura inválida:', (err as Error).message);
      throw new AppError('Assinatura do webhook inválida.', 401);
    }
  }

  if (type !== 'payment' || !dataId) {
    return { processed: false };
  }

  const payment = await syncPaymentByProviderId(dataId);
  return { processed: Boolean(payment), paymentId: payment?.id };
}
