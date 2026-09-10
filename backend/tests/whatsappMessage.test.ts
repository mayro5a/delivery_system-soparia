import { describe, expect, it } from 'vitest';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../src/utils/whatsappMessage';
import { formatCurrency } from '../src/utils/currency';

describe('whatsappMessage', () => {
  it('formata valores em Real', () => {
    expect(formatCurrency(72)).toContain('72,00');
  });

  it('monta a mensagem estruturada do pedido pago', () => {
    const message = buildWhatsAppMessage({
      number: 1,
      customerName: 'João',
      customerPhone: '(92) 99999-9999',
      items: [
        { productName: 'Canja', quantity: 2, unitPrice: 20, subtotal: 40, observation: 'Sem cheiro-verde' },
        { productName: 'Lasanha', quantity: 1, unitPrice: 15, subtotal: 15 },
      ],
      subtotal: 55,
      deliveryFee: 5,
      total: 60,
      paymentMethod: 'PIX',
      paymentStatus: 'APPROVED',
      cep: '69010-000',
      street: 'Rua Exemplo',
      addressNumber: '123',
      neighborhood: 'Bairro Exemplo',
      complement: 'Casa',
      reference: 'Próximo à praça',
      city: 'Manaus',
      state: 'AM',
    });

    expect(message).toContain('Olá! Gostaria de confirmar meu pedido na Soparia da Lê.');
    expect(message).toContain(`- 2x Canja — ${formatCurrency(40)}`);
    expect(message).toContain('Observação: Sem cheiro-verde');
    expect(message).toContain(`- 1x Lasanha — ${formatCurrency(15)}`);
    expect(message).toContain(`Subtotal: ${formatCurrency(55)}`);
    expect(message).toContain(`Taxa de entrega: ${formatCurrency(5)}`);
    expect(message).toContain(`Total: ${formatCurrency(60)}`);
    expect(message).toContain('Pagamento: Pix');
    expect(message).toContain('Status: Pagamento confirmado');
    expect(message).toContain('Nome: João');
    expect(message).toContain('Rua Exemplo, 123');
    expect(message).toContain('Complemento: Casa');
    expect(message).toContain('Referência: Próximo à praça');
    expect(message).toContain('Pagamento já confirmado pelo sistema.');
  });

  it('inclui o sabor/variação no nome do item', () => {
    const message = buildWhatsAppMessage({
      number: 12,
      customerName: 'Maria',
      customerPhone: '92988888888',
      items: [{ productName: 'Refrigerante', variantName: 'Guaraná', quantity: 1, unitPrice: 6, subtotal: 6 }],
      subtotal: 6,
      deliveryFee: 5,
      total: 11,
      paymentMethod: 'CARTAO_CREDITO',
      paymentStatus: 'APPROVED',
      street: 'Rua B',
      addressNumber: '2',
      neighborhood: 'Centro',
    });
    expect(message).toContain('Pedido #012');
    expect(message).toContain('1x Refrigerante (Guaraná)');
    expect(message).toContain('Pagamento: Cartão de crédito');
  });

  it('gera a URL do wa.me com o texto codificado', () => {
    const url = buildWhatsAppUrl('Olá mundo');
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(url).not.toContain(' ');
  });
});
