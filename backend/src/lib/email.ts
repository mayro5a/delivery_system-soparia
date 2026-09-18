import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Cliente de e-mail transacional — vive SOMENTE no backend. Usado para avisar
 * o cliente por e-mail quando o pedido é confirmado (pago) e quando sai para
 * entrega. Funciona com qualquer provedor SMTP (ver README, seção "E-mail
 * transacional").
 *
 * Assim como o WhatsApp/Mercado Pago, uma falha aqui NUNCA deve travar o fluxo
 * do pedido: erro de configuração, de rede ou do provedor SMTP só é logado.
 */

let transporter: Transporter | null = null;

function isConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.password);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transporter;
}

/**
 * Envia um e-mail transacional. Nunca lança: qualquer falha (configuração,
 * rede, provedor) só é registrada no log, para não derrubar a confirmação do
 * pedido por causa disso.
 */
export async function sendEmail(params: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!isConfigured()) {
    console.warn('[email] SMTP não configurado (SMTP_HOST / SMTP_USER / SMTP_PASSWORD ausentes) — e-mail não enviado.', {
      subject: params.subject,
    });
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  } catch (err) {
    console.error('[email] Falha ao enviar e-mail:', err);
  }
}
