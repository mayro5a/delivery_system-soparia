import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `config/env.ts` lê o process.env uma vez, no import do módulo — por isso
 * cada teste que muda variáveis de ambiente precisa de vi.resetModules() e
 * reimportar o módulo dinamicamente para pegar o valor novo.
 */
describe('email.sendEmail', () => {
  const originalEnv = { ...process.env };
  let sendMailMock: ReturnType<typeof vi.fn>;
  let createTransportMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-id' });
    createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
    vi.doMock('nodemailer', () => ({
      default: { createTransport: createTransportMock },
      createTransport: createTransportMock,
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.doUnmock('nodemailer');
  });

  it('não tenta enviar quando o SMTP não está configurado', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    const { sendEmail } = await import('../src/lib/email');
    await sendEmail({ to: 'cliente@teste.com', subject: 'Teste', html: '<p>oi</p>', text: 'oi' });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('envia pelo transporte SMTP configurado', async () => {
    process.env.SMTP_HOST = 'smtp.teste.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'usuario';
    process.env.SMTP_PASSWORD = 'senha';
    process.env.EMAIL_FROM = 'Soparia da Lê <pedidos@sopariadale.com>';

    const { sendEmail } = await import('../src/lib/email');
    await sendEmail({ to: 'cliente@teste.com', subject: 'Pedido confirmado', html: '<p>oi</p>', text: 'oi' });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.teste.com', port: 587, auth: { user: 'usuario', pass: 'senha' } }),
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Soparia da Lê <pedidos@sopariadale.com>',
        to: 'cliente@teste.com',
        subject: 'Pedido confirmado',
      }),
    );
  });

  it('não lança quando o provedor SMTP falha', async () => {
    process.env.SMTP_HOST = 'smtp.teste.com';
    process.env.SMTP_USER = 'usuario';
    process.env.SMTP_PASSWORD = 'senha';
    sendMailMock.mockRejectedValue(new Error('smtp indisponível'));

    const { sendEmail } = await import('../src/lib/email');
    await expect(
      sendEmail({ to: 'cliente@teste.com', subject: 'Teste', html: '<p>oi</p>', text: 'oi' }),
    ).resolves.toBeUndefined();
  });
});
