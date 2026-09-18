import { z } from 'zod';

const orderItemInput = z.object({
  productId: z.string({ required_error: 'Produto inválido.' }).min(1, 'Produto inválido.'),
  variantId: z.string().optional().nullable(),
  quantity: z
    .number({ required_error: 'Informe a quantidade.', invalid_type_error: 'Quantidade inválida.' })
    .int('Quantidade deve ser um número inteiro.')
    .min(1, 'A quantidade mínima de cada produto é 1.')
    .max(50, 'Quantidade máxima por item: 50.'),
  observation: z.string().max(280, 'Observação muito longa.').optional().nullable(),
});

const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} muito longo(a).`).optional().nullable();

const createOrderBody = z.object({
  items: z.array(orderItemInput).min(1, 'Adicione pelo menos um produto ao pedido.'),
  customerName: z.string({ required_error: 'Informe seu nome.' }).trim().min(2, 'Informe seu nome.').max(120),
  customerPhone: z
    .string({ required_error: 'Informe seu telefone.' })
    .trim()
    .min(10, 'Informe um telefone válido com DDD.')
    .max(20),
  customerEmail: z
    .string({ required_error: 'Informe seu e-mail.' })
    .trim()
    .email('Informe um e-mail válido.')
    .max(160),
  cep: z
    .string({ required_error: 'Informe o CEP.' })
    .trim()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido. Use o formato 69000-000.'),
  street: z.string({ required_error: 'Informe a rua.' }).trim().min(2, 'Informe a rua.').max(160),
  addressNumber: z.string({ required_error: 'Informe o número.' }).trim().min(1, 'Informe o número.').max(20),
  neighborhood: z.string({ required_error: 'Informe o bairro.' }).trim().min(1, 'Informe o bairro.').max(120),
  complement: optionalText(120, 'Complemento'),
  reference: optionalText(200, 'Referência'),
  city: z.string({ required_error: 'Informe a cidade.' }).trim().min(2, 'Informe a cidade.').max(120),
  state: z
    .string({ required_error: 'Informe o estado.' })
    .trim()
    .length(2, 'Use a sigla do estado (ex.: AM).')
    .transform((s) => s.toUpperCase()),
});

export type CreateOrderBody = z.infer<typeof createOrderBody>;

export const createOrderSchema = z.object({
  body: createOrderBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getOrderSchema = z.object({
  body: z.any().optional(),
  params: z.object({ id: z.string().regex(/^\d+$/, 'Pedido inválido.') }),
  query: z.object({ token: z.string().min(1, 'Token do pedido ausente.') }).passthrough(),
});

export const ORDER_STATUS_VALUES = [
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'AGUARDANDO_PREPARO',
  'EM_PREPARO',
  'SAIU_PARA_ENTREGA',
  'CONCLUIDO',
  'CANCELADO',
] as const;

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(ORDER_STATUS_VALUES, {
      required_error: 'Informe o novo status.',
      invalid_type_error: 'Status de pedido inválido.',
    }),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).passthrough().optional(),
});
