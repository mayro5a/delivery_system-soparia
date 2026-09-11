import { OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../utils/whatsappMessage';
import { canAdminTransition, statusRequiresPayment } from '../utils/orderStatus';
import { CreateOrderBody } from '../validations/order.schema';
import { FIXED_DELIVERY_FEE } from '../config/constants';

export const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Arredonda para 2 casas evitando lixo de ponto flutuante (ex.: 0.1 + 0.2). */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

interface ResolvedItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observation: string | null;
}

/**
 * Resolve os itens do pedido a partir do BANCO: preço, nome e disponibilidade
 * nunca são confiados ao que o frontend enviou.
 */
async function resolveItems(items: CreateOrderBody['items']): Promise<ResolvedItem[]> {
  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new AppError('Um dos produtos do pedido não foi encontrado. Atualize o cardápio.', 400);
    }
    if (!product.available) {
      throw new AppError(`Produto esgotado: ${product.name}.`, 400);
    }

    let unitPrice = product.price;
    let variantName: string | null = null;
    let variantId: string | null = null;

    if (product.hasVariants) {
      if (!item.variantId) {
        throw new AppError(`Selecione um sabor/variação para ${product.name}.`, 400);
      }
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new AppError(`Variação inválida para ${product.name}.`, 400);
      }
      if (!variant.available) {
        throw new AppError(`Sabor esgotado: ${product.name} - ${variant.name}.`, 400);
      }
      unitPrice = variant.price;
      variantName = variant.name;
      variantId = variant.id;
    }

    const quantity = Math.max(1, Math.trunc(item.quantity));

    resolved.push({
      productId: product.id,
      variantId,
      productName: product.name,
      variantName,
      quantity,
      unitPrice: money(unitPrice),
      subtotal: money(unitPrice * quantity),
      observation: item.observation?.trim() || null,
    });
  }

  return resolved;
}

/**
 * Cria o pedido com status AGUARDANDO_PAGAMENTO. O valor total é calculado
 * aqui (subtotal dos itens + taxa de entrega fixa) e é esse valor que será
 * cobrado no Mercado Pago.
 */
export async function createOrder(input: CreateOrderBody) {
  if (!input.items || input.items.length === 0) {
    throw new AppError('Adicione pelo menos um produto ao pedido.', 400);
  }

  const resolvedItems = await resolveItems(input.items);
  const subtotal = money(resolvedItems.reduce((sum, i) => sum + i.subtotal, 0));

  if (subtotal <= 0) {
    throw new AppError('O valor do pedido precisa ser maior que zero.', 400);
  }

  // A taxa de entrega é fixa para toda a cidade, sem restrição de bairro.
  const deliveryFee = money(FIXED_DELIVERY_FEE);
  const total = money(subtotal + deliveryFee);

  const order = await prisma.order.create({
    data: {
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      cep: input.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
      street: input.street.trim(),
      addressNumber: input.addressNumber.trim(),
      neighborhood: input.neighborhood.trim(),
      complement: input.complement?.trim() || null,
      reference: input.reference?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      subtotal,
      deliveryFee,
      total,
      paymentStatus: 'PENDING',
      orderStatus: 'AGUARDANDO_PAGAMENTO',
      items: {
        create: resolvedItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          observation: i.observation,
        })),
      },
    },
    include: orderInclude,
  });

  return order;
}

/** Converte o :id da rota (string) para o Int usado como chave primária do pedido. */
export function parseOrderId(id: string | number): number {
  const parsed = typeof id === 'number' ? id : Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Pedido não encontrado.', 404);
  }
  return parsed;
}

/** Visão pública do pedido (para o próprio cliente, autenticado pelo accessToken). */
export function toPublicOrder(order: OrderWithRelations) {
  const { accessToken: _token, payments, ...rest } = order;
  const latestPayment = payments[0] ?? null;

  const isPaid = order.paymentStatus === 'APPROVED';
  const whatsappMessage = isPaid
    ? buildWhatsAppMessage({
        number: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        cep: order.cep,
        street: order.street,
        addressNumber: order.addressNumber,
        neighborhood: order.neighborhood,
        complement: order.complement,
        reference: order.reference,
        city: order.city,
        state: order.state,
      })
    : null;

  return {
    ...rest,
    latestPayment: latestPayment ? toPublicPayment(latestPayment) : null,
    whatsappMessage,
    whatsappUrl: whatsappMessage ? buildWhatsAppUrl(whatsappMessage) : null,
  };
}

/** Dados do pagamento que podem ir para o navegador (sem chave de idempotência nem dados internos). */
export function toPublicPayment(payment: Prisma.PaymentGetPayload<object>) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    method: payment.method,
    status: payment.status,
    statusDetail: payment.statusDetail,
    amount: payment.amount,
    currency: payment.currency,
    pix:
      payment.method === 'PIX'
        ? {
            qrCode: payment.pixQrCode,
            qrCodeBase64: payment.pixQrCodeBase64,
            ticketUrl: payment.pixTicketUrl,
            expiresAt: payment.expiresAt,
          }
        : null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

/** Busca o pedido para o cliente, exigindo o token secreto emitido na criação. */
export async function getOrderForCustomer(id: string | number, accessToken: string) {
  const order = await prisma.order.findUnique({ where: { id: parseOrderId(id) }, include: orderInclude });
  if (!order || !accessToken || order.accessToken !== accessToken) {
    throw new AppError('Pedido não encontrado.', 404);
  }
  return order;
}

/**
 * Reflete o resultado de um pagamento no pedido. Chamado SOMENTE depois que o
 * status foi confirmado junto ao Mercado Pago (criação, consulta ou webhook).
 */
export async function applyPaymentResultToOrder(
  orderId: number,
  paymentStatus: PaymentStatus,
  method: PaymentMethod,
  tx: Prisma.TransactionClient = prisma,
) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new AppError('Pedido não encontrado.', 404);
  }

  const data: Prisma.OrderUpdateInput = { paymentMethod: method };

  switch (paymentStatus) {
    case 'APPROVED':
      data.paymentStatus = 'APPROVED';
      data.paidAt = order.paidAt ?? new Date();
      if (order.orderStatus === 'AGUARDANDO_PAGAMENTO') {
        data.orderStatus = 'PAGO';
      }
      break;
    case 'REFUNDED':
      data.paymentStatus = 'REFUNDED';
      if (order.orderStatus !== 'CONCLUIDO' && order.orderStatus !== 'CANCELADO') {
        data.orderStatus = 'CANCELADO';
      }
      break;
    case 'REJECTED':
    case 'CANCELLED':
    case 'PENDING':
      // Uma tentativa recusada/cancelada nunca "despaga" um pedido já aprovado.
      if (order.paymentStatus !== 'APPROVED' && order.paymentStatus !== 'REFUNDED') {
        data.paymentStatus = paymentStatus;
      }
      break;
  }

  return tx.order.update({ where: { id: orderId }, data, include: orderInclude });
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

export function listOrders() {
  return prisma.order.findMany({
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string | number) {
  const order = await prisma.order.findUnique({
    where: { id: parseOrderId(id) },
    include: orderInclude,
  });
  if (!order) {
    throw new AppError('Pedido não encontrado.', 404);
  }
  return order;
}

export async function updateOrderStatus(id: string | number, status: OrderStatus) {
  const orderId = parseOrderId(id);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new AppError('Pedido não encontrado.', 404);
  }

  if (order.orderStatus === status) {
    return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  }

  if (!canAdminTransition(order.orderStatus, status)) {
    throw new AppError(
      `Não é possível mudar o pedido de "${order.orderStatus}" para "${status}".`,
      400,
    );
  }

  if (statusRequiresPayment(status) && order.paymentStatus !== 'APPROVED') {
    throw new AppError('O pedido só pode ir para preparo depois que o pagamento for confirmado.', 400);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: status },
    include: orderInclude,
  });
}

export async function getDashboardSummary() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({
    where: { createdAt: { gte: startOfDay } },
  });

  const count = (...statuses: OrderStatus[]) =>
    todayOrders.filter((o) => statuses.includes(o.orderStatus)).length;

  return {
    ordersToday: todayOrders.length,
    aguardandoPagamento: count('AGUARDANDO_PAGAMENTO'),
    pagos: count('PAGO', 'AGUARDANDO_PREPARO'),
    emPreparo: count('EM_PREPARO'),
    saiuParaEntrega: count('SAIU_PARA_ENTREGA'),
    concluido: count('CONCLUIDO'),
    cancelado: count('CANCELADO'),
    // Faturamento considera apenas pedidos com pagamento confirmado e não cancelados.
    revenueToday: money(
      todayOrders
        .filter((o) => o.paymentStatus === 'APPROVED' && o.orderStatus !== 'CANCELADO')
        .reduce((sum, o) => sum + o.total, 0),
    ),
  };
}
