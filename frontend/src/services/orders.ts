import { api } from './api';
import { CreateOrderResponse, CustomerOrder } from '../types';

export interface CreateOrderPayload {
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    observation?: string | null;
  }[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cep: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  complement?: string | null;
  reference?: string | null;
  city: string;
  state: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await api.post('/orders', payload);
  return data.data;
}

export async function fetchCustomerOrder(orderId: number | string, token: string): Promise<CustomerOrder> {
  const { data } = await api.get(`/orders/${orderId}`, { params: { token } });
  return data.data;
}

// ---- Token de acompanhamento ----
// Guardado no navegador do cliente para que ele consiga reabrir a tela do
// pedido (ex.: voltar do app do banco depois de pagar o Pix).

const ORDER_TOKENS_KEY = 'soparia:order_tokens';

function readTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ORDER_TOKENS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function rememberOrderToken(orderId: number, token: string) {
  try {
    const tokens = readTokens();
    tokens[String(orderId)] = token;
    localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // armazenamento indisponível (modo privado, etc.) — o token continua na URL
  }
}

export function getRememberedOrderToken(orderId: number | string): string | null {
  return readTokens()[String(orderId)] ?? null;
}
