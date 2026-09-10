import { z } from 'zod';

/**
 * Payload enviado pelo Payment Brick (onSubmit) e repassado ao backend.
 *
 * IMPORTANTE: nunca recebemos número de cartão, validade ou CVV — o Brick
 * tokeniza o cartão diretamente com o Mercado Pago e só o `token` chega aqui.
 * O `transaction_amount` enviado pelo navegador é IGNORADO: o valor cobrado é
 * sempre o total do pedido recalculado no servidor.
 */
const payerSchema = z.object({
  email: z.string({ required_error: 'Informe o e-mail do pagador.' }).email('E-mail do pagador inválido.'),
  first_name: z.string().max(80).optional().nullable(),
  last_name: z.string().max(80).optional().nullable(),
  identification: z
    .object({
      type: z.string().max(20),
      number: z.string().max(30),
    })
    .optional()
    .nullable(),
});

const formDataSchema = z
  .object({
    token: z.string().max(200).optional().nullable(),
    issuer_id: z.union([z.string(), z.number()]).optional().nullable(),
    payment_method_id: z.string({ required_error: 'Meio de pagamento inválido.' }).min(1),
    installments: z.number().int().min(1).max(12).optional().nullable(),
    transaction_amount: z.number().optional().nullable(),
    payer: payerSchema,
  })
  .passthrough();

export const createPaymentBody = z.object({
  orderId: z.number({ required_error: 'Pedido inválido.' }).int().positive(),
  orderToken: z.string({ required_error: 'Token do pedido ausente.' }).min(1),
  /** UUID gerado no navegador por tentativa de pagamento. */
  idempotencyKey: z
    .string({ required_error: 'Chave de idempotência ausente.' })
    .min(16, 'Chave de idempotência inválida.')
    .max(80, 'Chave de idempotência inválida.'),
  selectedPaymentMethod: z.enum(['bank_transfer', 'creditCard', 'debitCard'], {
    required_error: 'Selecione Pix ou cartão.',
    invalid_type_error: 'Meio de pagamento não suportado.',
  }),
  formData: formDataSchema,
});

export type CreatePaymentBody = z.infer<typeof createPaymentBody>;

export const createPaymentSchema = z.object({
  body: createPaymentBody,
  params: z.object({}).optional(),
  query: z.object({}).passthrough().optional(),
});

export const getPaymentSchema = z.object({
  body: z.any().optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({ token: z.string().min(1, 'Token do pedido ausente.') }).passthrough(),
});
