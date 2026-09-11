import { api } from './api';
import { Payment, PaymentConfig } from '../types';

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await api.get('/payments/config');
  return data.data;
}

/**
 * Tipos mínimos do que o Payment Brick devolve no onSubmit.
 *
 * A tipagem do SDK declara camelCase (`creditCard`), mas o Brick carregado do
 * CDN envia snake_case (`credit_card`) em tempo de execução — o backend aceita
 * as duas grafias, então repassamos o valor como veio.
 */
export type BrickPaymentType =
  | 'bank_transfer'
  | 'creditCard'
  | 'credit_card'
  | 'debitCard'
  | 'debit_card'
  | 'prepaidCard'
  | 'prepaid_card';

export interface BrickFormData {
  token?: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments?: number;
  transaction_amount?: number;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
  };
}

export interface CreatePaymentPayload {
  orderId: number;
  orderToken: string;
  /** UUID único por tentativa: evita cobrança duplicada em cliques repetidos. */
  idempotencyKey: string;
  selectedPaymentMethod: BrickPaymentType;
  formData: BrickFormData;
}

export async function createPayment(payload: CreatePaymentPayload): Promise<Payment> {
  const { data } = await api.post('/payments', payload);
  return data.data;
}

export async function fetchPayment(paymentId: string, orderToken: string): Promise<Payment> {
  const { data } = await api.get(`/payments/${paymentId}`, { params: { token: orderToken } });
  return data.data;
}

/** Gera a chave de idempotência (UUID v4) no navegador. */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores antigos.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
