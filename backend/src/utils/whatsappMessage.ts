import { env } from '../config/env';
import { formatCurrency } from './currency';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  APPROVED: 'Pagamento confirmado',
  REJECTED: 'Pagamento recusado',
  CANCELLED: 'Pagamento cancelado',
  REFUNDED: 'Pagamento estornado',
};

export interface OrderItemForMessage {
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observation?: string | null;
}

export interface OrderForMessage {
  number: number;
  customerName: string;
  customerPhone: string;
  items: OrderItemForMessage[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  cep?: string | null;
  street: string;
  addressNumber: string;
  neighborhood: string;
  complement?: string | null;
  reference?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Monta a mensagem estruturada enviada ao WhatsApp da Soparia da Lê DEPOIS que o
 * pagamento foi confirmado pelo backend. O WhatsApp é canal de comunicação, não
 * de pagamento — por isso a mensagem deixa claro que o pedido já está pago.
 */
export function buildWhatsAppMessage(order: OrderForMessage): string {
  const lines: string[] = [];
  const orderNumber = `#${String(order.number).padStart(3, '0')}`;

  lines.push('Olá! Gostaria de confirmar meu pedido na Soparia da Lê.');
  lines.push('');
  lines.push(`Pedido ${orderNumber}:`);

  for (const item of order.items) {
    const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
    lines.push(`- ${item.quantity}x ${label} — ${formatCurrency(item.subtotal)}`);
    if (item.observation) {
      lines.push(`  Observação: ${item.observation}`);
    }
  }

  lines.push('');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  lines.push(`Taxa de entrega: ${formatCurrency(order.deliveryFee)}`);
  lines.push(`Total: ${formatCurrency(order.total)}`);
  lines.push('');

  const paymentLabel = order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod : '—';
  lines.push(`Pagamento: ${paymentLabel}`);
  lines.push(`Status: ${PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}`);
  lines.push('');

  lines.push(`Nome: ${order.customerName}`);
  lines.push(`Telefone: ${order.customerPhone}`);
  lines.push('');

  lines.push('Endereço:');
  lines.push(`${order.street}, ${order.addressNumber}`);
  lines.push(order.neighborhood);
  if (order.complement) lines.push(`Complemento: ${order.complement}`);
  if (order.reference) lines.push(`Referência: ${order.reference}`);
  if (order.city || order.state) {
    lines.push([order.city, order.state].filter(Boolean).join(' - '));
  }
  if (order.cep) lines.push(`CEP: ${order.cep}`);
  lines.push('');

  if (order.paymentStatus === 'APPROVED') {
    lines.push('Pagamento já confirmado pelo sistema.');
  }

  return lines.join('\n');
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${env.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
