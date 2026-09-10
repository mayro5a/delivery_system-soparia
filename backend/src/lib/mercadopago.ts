import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from 'mercadopago';
import type { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * Cliente do Mercado Pago — vive SOMENTE no backend.
 *
 * Toda comunicação com o gateway passa por aqui, o que facilita trocar o SDK e
 * simular o provedor nos testes (vi.mock deste módulo).
 */

let paymentClient: Payment | null = null;

function getPaymentClient(): Payment {
  if (!env.mercadoPago.accessToken) {
    throw new AppError(
      'Pagamento online indisponível: MP_ACCESS_TOKEN não configurado no servidor.',
      503,
    );
  }
  if (!paymentClient) {
    const config = new MercadoPagoConfig({
      accessToken: env.mercadoPago.accessToken,
      options: { timeout: 15000 },
    });
    paymentClient = new Payment(config);
  }
  return paymentClient;
}

export type MpPaymentResponse = PaymentResponse;
export type MpPaymentCreateRequest = PaymentCreateRequest;

/** Cria um pagamento no Mercado Pago usando a chave de idempotência informada. */
export async function mpCreatePayment(
  body: MpPaymentCreateRequest,
  idempotencyKey: string,
): Promise<MpPaymentResponse> {
  return getPaymentClient().create({ body, requestOptions: { idempotencyKey } });
}

/** Consulta o status REAL de um pagamento diretamente no Mercado Pago. */
export async function mpGetPayment(providerPaymentId: string | number): Promise<MpPaymentResponse> {
  return getPaymentClient().get({ id: providerPaymentId });
}

/**
 * Valida a assinatura (x-signature) de uma notificação de webhook.
 * Lança erro quando a assinatura é inválida.
 */
export function mpValidateWebhookSignature(params: {
  xSignature: string | string[] | undefined;
  xRequestId: string | string[] | undefined;
  dataId: string | string[] | undefined;
  secret: string;
}): void {
  WebhookSignatureValidator.validate({
    xSignature: params.xSignature,
    xRequestId: params.xRequestId,
    dataId: params.dataId,
    secret: params.secret,
    toleranceSeconds: 600,
  });
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(env.mercadoPago.accessToken && env.mercadoPago.publicKey);
}
