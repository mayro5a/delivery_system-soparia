import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function required(name: string, devFallback?: string): string {
  const value = process.env[name] ?? (isProduction ? undefined : devFallback);
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /** URL pública do site (usada apenas para montar links). */
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET', 'dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  admin: {
    name: process.env.ADMIN_NAME ?? 'Administrador',
    email: process.env.ADMIN_EMAIL ?? 'admin@sopariadale.com',
    password: process.env.ADMIN_PASSWORD ?? 'soparia123',
  },
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? '5592992781331',
  /**
   * E-mail transacional (confirmação de pagamento e "saiu para entrega"), via
   * SMTP genérico — funciona com qualquer provedor (Gmail, Brevo, SendGrid,
   * Mailtrap para testes, etc.). Se SMTP_HOST ou SMTP_USER estiverem vazios, o
   * envio fica desligado (sem quebrar nada) e só é registrado um aviso no log.
   */
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    /** true para porta 465 (SSL direto); false (com STARTTLS) para 587/25. */
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    /** Remetente exibido nos e-mails (ex.: "Soparia da Lê <pedidos@sopariadale.com>"). */
    from: process.env.EMAIL_FROM ?? 'Soparia da Lê <pedidos@sopariadale.com>',
  },
  mercadoPago: {
    /** SOMENTE no backend. Nunca é enviado ao navegador. */
    accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    /** Chave pública: pode ser exposta ao frontend (usada pelo Payment Brick). */
    publicKey: process.env.MP_PUBLIC_KEY ?? '',
    /** Assinatura secreta do webhook (Suas integrações > Webhooks). Opcional em dev. */
    webhookSecret: process.env.MP_WEBHOOK_SECRET ?? '',
    /** URL pública do webhook (ex.: https://seu-dominio.com/api/payments/webhook). */
    webhookUrl: process.env.MP_WEBHOOK_URL ?? '',
    /** Minutos de validade do Pix gerado. */
    pixExpirationMinutes: Number(process.env.MP_PIX_EXPIRATION_MINUTES ?? 30),
    /** Texto que aparece na fatura do cartão. */
    statementDescriptor: process.env.MP_STATEMENT_DESCRIPTOR ?? 'SOPARIA DA LE',
  },
};
