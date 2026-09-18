import { env } from '../config/env';
import { formatCurrency } from './currency';

export interface OrderItemForEmail {
  productName: string;
  variantName?: string | null;
  quantity: number;
  subtotal: number;
}

export interface OrderForEmail {
  id: number;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  items: OrderItemForEmail[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  street: string;
  addressNumber: string;
  neighborhood: string;
  complement?: string | null;
  city?: string | null;
  state?: string | null;
}

function orderNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

function trackingUrl(order: OrderForEmail): string {
  return `${env.appUrl}/pedido/${order.id}?token=${order.accessToken}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function itemsListHtml(items: OrderItemForEmail[]): string {
  return items
    .map((item) => {
      const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
      return `<tr>
        <td style="padding:4px 0;color:#211D1A;">${item.quantity}x ${label}</td>
        <td style="padding:4px 0;text-align:right;color:#211D1A;">${formatCurrency(item.subtotal)}</td>
      </tr>`;
    })
    .join('');
}

function itemsListText(items: OrderItemForEmail[]): string {
  return items
    .map((item) => {
      const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
      return `- ${item.quantity}x ${label} — ${formatCurrency(item.subtotal)}`;
    })
    .join('\n');
}

function addressLine(order: OrderForEmail): string {
  const parts = [`${order.street}, ${order.addressNumber}`, order.neighborhood];
  if (order.complement) parts.push(order.complement);
  if (order.city || order.state) parts.push([order.city, order.state].filter(Boolean).join(' - '));
  return parts.join(' — ');
}

/** E-mail base: mesmo cabeçalho/rodapé para as duas mensagens transacionais. */
function wrapHtml(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#211D1A;">
      <div style="background:#9E1B1B;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:18px;color:#F4C542;">🍲 Soparia da Lê</h1>
      </div>
      <div style="background:#FDF8EE;padding:24px;border-radius:0 0 12px 12px;">
        <h2 style="margin-top:0;font-size:20px;">${title}</h2>
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#5A301C;font-size:11px;margin-top:16px;">
        Soparia da Lê — este é um e-mail automático, não é preciso responder.
      </p>
    </div>
  `;
}

/** Enviado quando o pagamento do pedido é confirmado. */
export function buildOrderConfirmedEmail(order: OrderForEmail): { subject: string; html: string; text: string } {
  const number = orderNumber(order.id);
  const url = trackingUrl(order);

  const subject = `Pedido ${number} confirmado — Soparia da Lê`;

  const html = wrapHtml(
    'Pedido confirmado! ✅',
    `
      <p>Olá, ${firstName(order.customerName)}! Recebemos o pagamento do seu pedido ${number} e já vamos começar a preparar.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${itemsListHtml(order.items)}
        <tr><td colspan="2" style="border-top:1px dashed #cbb896;padding-top:8px;"></td></tr>
        <tr><td style="padding:2px 0;">Subtotal</td><td style="text-align:right;">${formatCurrency(order.subtotal)}</td></tr>
        <tr><td style="padding:2px 0;">Entrega</td><td style="text-align:right;">${formatCurrency(order.deliveryFee)}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${formatCurrency(order.total)}</td></tr>
      </table>
      <p><strong>Endereço de entrega:</strong><br>${addressLine(order)}</p>
      <p style="text-align:center;margin-top:20px;">
        <a href="${url}" style="display:inline-block;background:#4F7A3A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">
          Acompanhar meu pedido
        </a>
      </p>
    `,
  );

  const text = [
    `Pedido ${number} confirmado!`,
    '',
    `Olá, ${firstName(order.customerName)}! Recebemos o pagamento do seu pedido e já vamos começar a preparar.`,
    '',
    itemsListText(order.items),
    '',
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Entrega: ${formatCurrency(order.deliveryFee)}`,
    `Total: ${formatCurrency(order.total)}`,
    '',
    `Endereço de entrega: ${addressLine(order)}`,
    '',
    `Acompanhe seu pedido: ${url}`,
  ].join('\n');

  return { subject, html, text };
}

/** Enviado quando o pedido sai para entrega. */
export function buildOrderOutForDeliveryEmail(order: OrderForEmail): { subject: string; html: string; text: string } {
  const number = orderNumber(order.id);
  const url = trackingUrl(order);

  const subject = `Seu pedido ${number} saiu para entrega! — Soparia da Lê`;

  const html = wrapHtml(
    'Saiu para entrega! 🛵',
    `
      <p>Olá, ${firstName(order.customerName)}! Seu pedido ${number} já está a caminho.</p>
      <p><strong>Endereço de entrega:</strong><br>${addressLine(order)}</p>
      <p style="text-align:center;margin-top:20px;">
        <a href="${url}" style="display:inline-block;background:#4F7A3A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">
          Acompanhar meu pedido
        </a>
      </p>
    `,
  );

  const text = [
    `Seu pedido ${number} saiu para entrega!`,
    '',
    `Olá, ${firstName(order.customerName)}! Seu pedido já está a caminho.`,
    '',
    `Endereço de entrega: ${addressLine(order)}`,
    '',
    `Acompanhe seu pedido: ${url}`,
  ].join('\n');

  return { subject, html, text };
}
