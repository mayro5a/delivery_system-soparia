import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Informe seu e-mail.' }).email('E-mail inválido.'),
    password: z.string({ required_error: 'Informe sua senha.' }).min(1, 'Informe sua senha.'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
