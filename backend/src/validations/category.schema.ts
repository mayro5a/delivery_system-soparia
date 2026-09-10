import { z } from 'zod';

const categoryBody = z.object({
  name: z.string({ required_error: 'Informe o nome da categoria.' }).min(2, 'Nome muito curto.'),
  description: z.string().optional().nullable(),
  order: z.number().optional(),
});

export const createCategorySchema = z.object({
  body: categoryBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateCategorySchema = z.object({
  body: categoryBody.partial(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});
