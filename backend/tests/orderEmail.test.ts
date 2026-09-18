import { describe, expect, it } from 'vitest';
import { buildOrderConfirmedEmail, buildOrderOutForDeliveryEmail, OrderForEmail } from '../src/utils/orderEmail';

function sampleOrder(overrides: Partial<OrderForEmail> = {}): OrderForEmail {
  return {
    id: 7,
    accessToken: 'token-abc-123',
    customerName: 'Maria Souza',
    customerEmail: 'maria@teste.com',
    items: [
      { productName: 'Canja', quantity: 2, subtotal: 40 },
      { productName: 'Refrigerante', variantName: 'Guaraná', quantity: 1, subtotal: 6 },
    ],
    subtotal: 46,
    deliveryFee: 2,
    total: 48,
    street: 'Rua Exemplo',
    addressNumber: '123',
    neighborhood: 'Centro',
    complement: 'Casa',
    city: 'Manaus',
    state: 'AM',
    ...overrides,
  };
}

describe('orderEmail.buildOrderConfirmedEmail', () => {
  it('monta assunto, link de acompanhamento e itens do pedido', () => {
    const order = sampleOrder();
    const email = buildOrderConfirmedEmail(order);

    expect(email.subject).toBe('Pedido #007 confirmado — Soparia da Lê');
    expect(email.html).toContain('http://localhost:5173/pedido/7?token=token-abc-123');
    expect(email.text).toContain('http://localhost:5173/pedido/7?token=token-abc-123');
    expect(email.html).toContain('Maria');
    expect(email.text).toContain('Canja');
    expect(email.text).toContain('Guaraná');
    expect(email.text).toContain('R$');
  });
});

describe('orderEmail.buildOrderOutForDeliveryEmail', () => {
  it('monta assunto e endereço de entrega', () => {
    const order = sampleOrder();
    const email = buildOrderOutForDeliveryEmail(order);

    expect(email.subject).toBe('Seu pedido #007 saiu para entrega! — Soparia da Lê');
    expect(email.text).toContain('Rua Exemplo, 123');
    expect(email.text).toContain('Centro');
    expect(email.html).toContain('http://localhost:5173/pedido/7?token=token-abc-123');
  });
});
