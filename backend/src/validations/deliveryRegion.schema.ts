import { z } from 'zod';

const regionBody = z.object({
  name: z.string({ required_error: 'Informe o nome do bairro/região.' }).min(2, 'Nome muito curto.'),
  fee: z.number({ invalid_type_error: 'Taxa inválida.' }).nonnegative('Taxa não pode ser negativa.'),
  available: z.boolean().default(true),
});

export const createDeliveryRegionSchema = z.object({
  body: regionBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateDeliveryRegionSchema = z.object({
  body: regionBody.partial(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});
