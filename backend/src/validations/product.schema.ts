import { z } from 'zod';

const variantInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Informe o nome da variação.'),
  price: z.number({ invalid_type_error: 'Preço da variação inválido.' }).nonnegative(),
  available: z.boolean().default(true),
});

const productBody = z.object({
  name: z.string({ required_error: 'Informe o nome do produto.' }).min(2, 'Nome muito curto.'),
  description: z.string().optional().nullable(),
  price: z.number({ invalid_type_error: 'Preço inválido.' }).nonnegative('Preço não pode ser negativo.'),
  image: z.string().optional().nullable(),
  available: z.boolean().default(true),
  categoryId: z.string({ required_error: 'Selecione uma categoria.' }).min(1, 'Selecione uma categoria.'),
  hasVariants: z.boolean().default(false),
  variants: z.array(variantInput).optional().default([]),
});

export const createProductSchema = z.object({
  body: productBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateProductSchema = z.object({
  body: productBody.partial(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const updateAvailabilitySchema = z.object({
  body: z.object({ available: z.boolean() }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});
