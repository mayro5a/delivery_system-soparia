import { Request, Response } from 'express';
import { env } from '../config/env';
import { isMercadoPagoConfigured } from '../lib/mercadopago';
import * as paymentService from '../services/payment.service';

/** Dados públicos necessários para o frontend inicializar o Payment Brick. */
export async function config(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      provider: 'MERCADO_PAGO',
      // A chave PÚBLICA pode ir ao navegador; o Access Token nunca sai do servidor.
      publicKey: env.mercadoPago.publicKey,
      configured: isMercadoPagoConfigured(),
      pixExpirationMinutes: env.mercadoPago.pixExpirationMinutes,
    },
  });
}

export async function create(req: Request, res: Response) {
  const payment = await paymentService.createPayment(req.body);
  res.status(201).json({ success: true, data: payment });
}

export async function getOne(req: Request, res: Response) {
  const payment = await paymentService.getPaymentForCustomer(req.params.id, String(req.query.token ?? ''));
  res.json({ success: true, data: payment });
}

/**
 * POST /api/payments/webhook — notificações do Mercado Pago.
 * Responde 200 mesmo para eventos ignorados (o MP reenvia enquanto não recebe 2xx).
 */
export async function webhook(req: Request, res: Response) {
  const result = await paymentService.handleWebhook({
    query: req.query as Record<string, unknown>,
    body: req.body,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });
  res.status(200).json({ received: true, ...result });
}
