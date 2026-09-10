export interface Category {
  id: string;
  name: string;
  description: string | null;
  order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  available: boolean;
  productId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  hasVariants: boolean;
  categoryId: string;
  category: Category;
  variants: ProductVariant[];
}

export interface DeliveryRegion {
  id: string;
  name: string;
  fee: number;
  available: boolean;
}

// ---- Pagamento ----

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
};

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Aguardando pagamento',
  APPROVED: 'Pago',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado',
};

export interface PixData {
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
}

export interface Payment {
  id: string;
  orderId: number;
  provider: string;
  providerPaymentId: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  statusDetail: string | null;
  amount: number;
  currency: string;
  pix: PixData | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfig {
  provider: string;
  publicKey: string;
  configured: boolean;
  pixExpirationMinutes: number;
}

// ---- Pedido ----

export type OrderStatus =
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'AGUARDANDO_PREPARO'
  | 'EM_PREPARO'
  | 'SAIU_PARA_ENTREGA'
  | 'CONCLUIDO'
  | 'CANCELADO';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  AGUARDANDO_PREPARO: 'Aguardando preparo',
  EM_PREPARO: 'Em preparo',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

/** Fluxo operacional após o pagamento (o admin avança um passo por vez). */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'AGUARDANDO_PREPARO',
  'EM_PREPARO',
  'SAIU_PARA_ENTREGA',
  'CONCLUIDO',
];

export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observation: string | null;
}

export interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  cep: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  complement: string | null;
  reference: string | null;
  city: string;
  state: string;
  deliveryRegionId: string;
  deliveryRegion: DeliveryRegion | null;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paidAt: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Pedido como o admin vê (inclui todas as tentativas de pagamento). */
export interface AdminOrder extends Order {
  payments: Payment[];
}

/** Pedido como o cliente vê (acompanhamento + link do WhatsApp quando pago). */
export interface CustomerOrder extends Order {
  latestPayment: Payment | null;
  whatsappMessage: string | null;
  whatsappUrl: string | null;
}

export interface CreateOrderResponse {
  order: CustomerOrder;
  accessToken: string;
}

export interface DashboardSummary {
  ordersToday: number;
  aguardandoPagamento: number;
  pagos: number;
  emPreparo: number;
  saiuParaEntrega: number;
  concluido: number;
  cancelado: number;
  revenueToday: number;
}

/** Item do carrinho no frontend — cada combinação produto+variação+observação é uma linha própria. */
export interface CartItem {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  observation: string;
  image: string | null;
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  details?: unknown;
}
