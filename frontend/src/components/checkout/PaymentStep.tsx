import { useEffect, useRef, useState } from 'react';
import { initMercadoPago, Payment as PaymentBrick } from '@mercadopago/sdk-react';
import { AlertTriangle, CreditCard, Lock, MessageCircle, QrCode } from 'lucide-react';
import { CustomerOrder, Payment, PaymentConfig } from '../../types';
import {
  BrickFormData,
  BrickPaymentType,
  createPayment,
  fetchPaymentConfig,
  generateIdempotencyKey,
} from '../../services/payments';
import { getApiErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { WHATSAPP_CONTACT_URL } from '../../utils/whatsapp';
import { Spinner } from '../ui/Spinner';

let mercadoPagoInitialized = false;

/** Mensagens amigáveis para os principais motivos de recusa do cartão. */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
  cc_rejected_bad_filled_date: 'Data de validade do cartão inválida.',
  cc_rejected_bad_filled_other: 'Verifique os dados do cartão.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
  cc_rejected_call_for_authorize: 'Ligue para a operadora do cartão para autorizar o pagamento.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com a operadora.',
  cc_rejected_duplicated_payment: 'Você já fez um pagamento com esse valor. Use outro cartão ou Pix.',
  cc_rejected_high_risk: 'Pagamento recusado. Tente outro meio de pagamento.',
  cc_rejected_insufficient_amount: 'Cartão sem limite suficiente.',
  cc_rejected_invalid_installments: 'O cartão não aceita esse número de parcelas.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente outro cartão.',
};

function describeRejection(statusDetail: string | null): string {
  return (statusDetail && REJECTION_MESSAGES[statusDetail]) || 'Pagamento recusado. Tente outro cartão ou pague com Pix.';
}

/**
 * Etapa de pagamento: renderiza o Payment Brick do Mercado Pago (Pix, crédito
 * e débito). Os dados do cartão são tokenizados pelo Brick e NUNCA passam pelo
 * nosso servidor; enviamos ao backend apenas o token + dados do pagador.
 */
export function PaymentStep({
  order,
  orderToken,
  previousAttempt,
  onResult,
}: {
  order: CustomerOrder;
  orderToken: string;
  /** Tentativa anterior recusada/cancelada (para mostrar o aviso). */
  previousAttempt?: Payment | null;
  /** Chamado quando o backend registra um pagamento pendente ou aprovado. */
  onResult: (payment: Payment) => void;
}) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [brickReady, setBrickReady] = useState(false);
  const [error, setError] = useState<string | null>(
    previousAttempt && (previousAttempt.status === 'REJECTED' || previousAttempt.status === 'CANCELLED')
      ? previousAttempt.method === 'PIX'
        ? 'O Pix anterior expirou ou foi cancelado. Gere um novo pagamento abaixo.'
        : describeRejection(previousAttempt.statusDetail)
      : null,
  );
  // Uma chave por tentativa. Reutilizada em cliques repetidos da MESMA tentativa
  // (evita cobrança duplicada) e renovada só depois de uma recusa.
  const idempotencyKey = useRef(generateIdempotencyKey());

  useEffect(() => {
    let active = true;
    fetchPaymentConfig()
      .then((cfg) => {
        if (!active) return;
        if (!cfg.configured || !cfg.publicKey) {
          setConfigError('O pagamento online não está configurado neste ambiente.');
          return;
        }
        if (!mercadoPagoInitialized) {
          initMercadoPago(cfg.publicKey, { locale: 'pt-BR' });
          mercadoPagoInitialized = true;
        }
        setConfig(cfg);
      })
      .catch((err) => active && setConfigError(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit({
    selectedPaymentMethod,
    formData,
  }: {
    selectedPaymentMethod: string;
    formData: unknown;
  }) {
    setError(null);
    try {
      const payment = await createPayment({
        orderId: order.id,
        orderToken,
        idempotencyKey: idempotencyKey.current,
        selectedPaymentMethod: selectedPaymentMethod as BrickPaymentType,
        formData: formData as BrickFormData,
      });

      if (payment.status === 'REJECTED' || payment.status === 'CANCELLED') {
        idempotencyKey.current = generateIdempotencyKey();
        setError(describeRejection(payment.statusDetail));
        throw new Error('rejected');
      }

      onResult(payment);
    } catch (err) {
      if (err instanceof Error && err.message === 'rejected') throw err;
      idempotencyKey.current = generateIdempotencyKey();
      setError(getApiErrorMessage(err));
      throw err;
    }
  }

  if (configError) {
    return (
      <div className="rounded-2xl border border-gold-500/50 bg-gold-500/10 p-4 text-sm text-broth-800">
        <p className="flex items-start gap-2 font-semibold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold-600" /> {configError}
        </p>
        <p className="mt-2">Fale com a gente pelo WhatsApp para combinar o pagamento.</p>
        <a
          href={WHATSAPP_CONTACT_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-basil-500 px-4 py-2 font-semibold text-white hover:bg-basil-600"
        >
          <MessageCircle size={16} /> Chamar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-broth-900 px-4 py-3 text-cream-100">
        <span className="text-sm">Total a pagar</span>
        <span className="font-display text-2xl font-bold text-gold-500">{formatCurrency(order.total)}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-broth-700">
        <span className="flex items-center gap-1">
          <QrCode size={14} className="text-brand-600" /> Pix
        </span>
        <span className="flex items-center gap-1">
          <CreditCard size={14} className="text-brand-600" /> Crédito e débito
        </span>
        <span className="flex items-center gap-1">
          <Lock size={14} className="text-basil-500" /> Processado pelo Mercado Pago
        </span>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 rounded-xl border border-brand-500/30 bg-brand-50 px-3 py-2 text-sm text-brand-700" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl bg-cream-50 shadow-card">
        {!config && <Spinner label="Carregando formas de pagamento..." />}
        {config && !brickReady && <Spinner label="Preparando o pagamento seguro..." />}
        {config && (
          <div className={brickReady ? 'p-2 sm:p-3' : 'h-0 overflow-hidden'}>
            <PaymentBrick
              initialization={{ amount: order.total, payer: { email: order.customerEmail } }}
              customization={{
                paymentMethods: {
                  bankTransfer: 'all',
                  creditCard: 'all',
                  debitCard: 'all',
                  maxInstallments: 1,
                },
                visual: {
                  style: {
                    theme: 'default',
                    customVariables: {
                      baseColor: '#9E1B1B',
                      textPrimaryColor: '#211D1A',
                      textSecondaryColor: '#5A301C',
                      formBackgroundColor: '#fdf8ee',
                      inputBackgroundColor: '#ffffff',
                      borderRadiusMedium: '12px',
                      borderRadiusLarge: '16px',
                      successColor: '#4F7A3A',
                      errorColor: '#B52620',
                    },
                  },
                },
              }}
              onReady={() => setBrickReady(true)}
              onError={(err) => {
                console.error('[MercadoPago Brick]', err);
                setError('Não foi possível carregar o pagamento. Atualize a página e tente novamente.');
              }}
              onSubmit={handleSubmit}
              locale="pt-BR"
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-broth-700/70">
        Não armazenamos dados do seu cartão. O pagamento é confirmado automaticamente pelo Mercado Pago.
      </p>
    </div>
  );
}
