import { z } from 'zod';

export const deliveryFormSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  customerPhone: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'Informe um telefone válido com DDD.'),
  cep: z.string().refine((v) => v.replace(/\D/g, '').length === 8, 'Informe um CEP válido.'),
  street: z.string().trim().min(2, 'Informe a rua.').max(160),
  addressNumber: z.string().trim().min(1, 'Informe o número.').max(20),
  neighborhood: z.string().trim().min(1, 'Informe o bairro.').max(120),
  complement: z.string().trim().max(120, 'Complemento muito longo.').optional(),
  reference: z.string().trim().max(200, 'Referência muito longa.').optional(),
  city: z.string().trim().min(2, 'Informe a cidade.').max(120),
  state: z
    .string()
    .trim()
    .length(2, 'Use a sigla do estado (ex.: AM).')
    .transform((s) => s.toUpperCase()),
});

export type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;
