import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Fluxo operacional do pedido:
 *
 * AGUARDANDO_PAGAMENTO → PAGO → AGUARDANDO_PREPARO → EM_PREPARO → SAIU_PARA_ENTREGA → CONCLUIDO
 *
 * "PAGO" é definido automaticamente pelo sistema quando o Mercado Pago confirma o
 * pagamento; o administrador só avança a partir daí. CANCELADO pode ser aplicado a
 * qualquer pedido ainda não concluído.
 */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'AGUARDANDO_PREPARO',
  'EM_PREPARO',
  'SAIU_PARA_ENTREGA',
  'CONCLUIDO',
];

/** Transições que o ADMINISTRADOR pode fazer manualmente pelo painel. */
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AGUARDANDO_PAGAMENTO: ['CANCELADO'],
  PAGO: ['AGUARDANDO_PREPARO', 'EM_PREPARO', 'CANCELADO'],
  AGUARDANDO_PREPARO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['SAIU_PARA_ENTREGA', 'CANCELADO'],
  SAIU_PARA_ENTREGA: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

/** Status que exigem pagamento confirmado (Regra 4: só prepara depois de pago). */
const REQUIRES_PAYMENT: OrderStatus[] = ['AGUARDANDO_PREPARO', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO'];

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusRequiresPayment(status: OrderStatus): boolean {
  return REQUIRES_PAYMENT.includes(status);
}

export function isPaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === 'APPROVED';
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  AGUARDANDO_PREPARO: 'Aguardando preparo',
  EM_PREPARO: 'Em preparo',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};
