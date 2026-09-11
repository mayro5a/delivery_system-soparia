import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { CustomerOrder, PAYMENT_METHOD_LABELS, Payment } from '../types';
import { fetchCustomerOrder, getRememberedOrderToken } from '../services/orders';
import { getApiErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { StepIndicator } from '../components/checkout/StepIndicator';
import { PaymentStep } from '../components/checkout/PaymentStep';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';

const POLL_INTERVAL_MS = 4000;

function orderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

/**
 * Página do pedido (/pedido/:id?token=...):
 *  - sem pagamento (ou tentativa recusada): mostra o Payment Brick
 *  - Pix pendente: QR Code + copia e cola, atualizando automaticamente
 *  - cartão em análise: aguarda a confirmação
 *  - pago: confirmação + botão para enviar o pedido no WhatsApp
 */
export function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? (id ? getRememberedOrderToken(id) : null);

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!id || !token) return;
      if (!silent) setRefreshing(true);
      try {
        const data = await fetchCustomerOrder(id, token);
        setOrder(data);
        setError(null);
      } catch (err) {
        if (!silent || !order) setError(getApiErrorMessage(err));
      } finally {
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const latest = order?.latestPayment ?? null;
  const isPaid = order?.paymentStatus === 'APPROVED';
  const isCancelled = order?.orderStatus === 'CANCELADO';
  const isWaiting = !isPaid && !isCancelled && latest?.status === 'PENDING';
  const needsPayment = !isPaid && !isCancelled && !isWaiting;

  // Enquanto houver pagamento pendente, consulta o backend (que confirma com o Mercado Pago).
  useEffect(() => {
    if (!isWaiting) return;
    const timer = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isWaiting, load]);

  if (!id || !token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="Não encontramos este pedido."
          description="O link de acompanhamento é inválido ou expirou."
          action={
            <Link to="/">
              <Button variant="outline">Voltar ao cardápio</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="Não foi possível carregar o pedido."
          description={error}
          action={
            <Button variant="outline" onClick={() => load()}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Spinner label="Carregando seu pedido..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:py-6">
      {!isPaid && !isCancelled && <StepIndicator current={3} />}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-broth-700/70">Pedido {orderNumber(order.id)}</p>
          <h1 className="font-display text-2xl font-bold text-broth-900">
            {isPaid ? 'Pedido confirmado!' : isCancelled ? 'Pedido cancelado' : isWaiting ? 'Aguardando pagamento' : 'Pagamento'}
          </h1>
        </div>
        {isWaiting && (
          <button
            type="button"
            onClick={() => load()}
            className="flex items-center gap-1 rounded-full border border-broth-700/20 px-3 py-1.5 text-xs font-semibold text-broth-800 hover:bg-broth-700/5"
            aria-label="Atualizar status"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        )}
      </div>

      {isPaid && <PaidPanel order={order} />}
      {isCancelled && <CancelledPanel />}
      {isWaiting && latest && (latest.method === 'PIX' ? <PixPanel payment={latest} /> : <AnalyzingPanel payment={latest} />)}
      {needsPayment && (
        <PaymentStep order={order} orderToken={token} previousAttempt={latest} onResult={() => load()} />
      )}

      <OrderSummary order={order} defaultOpen={isPaid} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PaidPanel({ order }: { order: CustomerOrder }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-cream-50 p-6 text-center shadow-vintage">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-basil-500/15">
        <CheckCircle2 size={40} className="text-basil-500" />
      </span>
      <span className="rounded-full bg-basil-500 px-4 py-1 font-display text-sm font-bold uppercase tracking-widest text-white">Pago</span>
      <p className="text-sm text-broth-800">
        Recebemos seu pagamento
        {order.paymentMethod ? ` via ${PAYMENT_METHOD_LABELS[order.paymentMethod]}` : ''}. Agora é só enviar o pedido no
        WhatsApp para a Soparia começar o preparo.
      </p>
      {order.whatsappUrl && (
        <a
          href={order.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-basil-500 px-6 py-3.5 font-display text-lg font-semibold text-white shadow-floating transition-colors hover:bg-basil-600"
        >
          <MessageCircle size={20} /> Enviar pedido no WhatsApp
        </a>
      )}
      <p className="text-xs text-broth-700/70">A mensagem já vai pronta com os itens, o endereço e a confirmação do pagamento.</p>
      <Link to="/" className="mt-1 text-sm font-semibold text-brand-600 hover:underline">
        Voltar ao cardápio
      </Link>
    </section>
  );
}

function CancelledPanel() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-cream-50 p-6 text-center shadow-card">
      <XCircle size={40} className="text-brand-600" />
      <p className="text-sm text-broth-800">Este pedido foi cancelado. Se tiver dúvidas, fale com a gente no WhatsApp.</p>
      <Link to="/">
        <Button variant="outline">Fazer um novo pedido</Button>
      </Link>
    </section>
  );
}

function AnalyzingPanel({ payment }: { payment: Payment }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-cream-50 p-6 text-center shadow-card">
      <Clock3 size={40} className="animate-pulse-soft text-gold-600" />
      <span className="rounded-full bg-gold-500/20 px-4 py-1 font-display text-sm font-bold uppercase tracking-widest text-broth-800">
        Aguardando pagamento
      </span>
      <p className="text-sm text-broth-800">
        Seu pagamento no {PAYMENT_METHOD_LABELS[payment.method].toLowerCase()} está em análise pela operadora. Esta página
        atualiza sozinha assim que for confirmado.
      </p>
    </section>
  );
}

function PixPanel({ payment }: { payment: Payment }) {
  const { showToast } = useToast();
  const [remaining, setRemaining] = useState<string | null>(null);
  const code = payment.pix?.qrCode ?? '';
  const codeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const expiresAt = payment.pix?.expiresAt ? new Date(payment.pix.expiresAt).getTime() : null;
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [payment.pix?.expiresAt]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Código Pix copiado!');
    } catch {
      codeRef.current?.select();
      document.execCommand('copy');
      showToast('Código Pix copiado!');
    }
  }

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl bg-cream-50 p-5 text-center shadow-vintage">
      <span className="inline-flex items-center gap-2 rounded-full bg-gold-500/20 px-4 py-1 font-display text-sm font-bold uppercase tracking-widest text-broth-800">
        <span className="h-2 w-2 animate-pulse-soft rounded-full bg-gold-600" /> Aguardando pagamento
      </span>

      <p className="font-display text-3xl font-bold text-brand-600">{formatCurrency(payment.amount)}</p>

      {payment.pix?.qrCodeBase64 ? (
        <img
          src={`data:image/png;base64,${payment.pix.qrCodeBase64}`}
          alt="QR Code do Pix"
          className="h-56 w-56 rounded-xl border-4 border-double border-broth-700/40 bg-white p-2"
        />
      ) : (
        <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-broth-700/30 text-xs text-broth-700">
          QR Code indisponível — use o código abaixo.
        </div>
      )}

      <ol className="text-left text-sm text-broth-800">
        <li>1. Abra o app do seu banco e escolha pagar com Pix.</li>
        <li>2. Escaneie o QR Code ou cole o código copia e cola.</li>
        <li>3. Confirme o pagamento — esta página atualiza sozinha.</li>
      </ol>

      <div className="w-full">
        <label htmlFor="pix-code" className="mb-1 block text-left text-xs font-semibold text-broth-800">
          Pix copia e cola
        </label>
        <textarea
          id="pix-code"
          ref={codeRef}
          readOnly
          value={code}
          rows={3}
          className="w-full rounded-xl border border-broth-700/25 bg-white px-3 py-2 font-mono text-[11px] leading-snug text-broth-900"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" fullWidth onClick={copyCode} className="mt-2">
          <Copy size={18} /> Copiar código Pix
        </Button>
      </div>

      {remaining && (
        <p className="flex items-center gap-1.5 text-xs text-broth-700">
          <Clock3 size={14} /> O código expira em <span className="font-mono font-semibold">{remaining}</span>
        </p>
      )}
      {payment.pix?.ticketUrl && (
        <a href={payment.pix.ticketUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
          Abrir no Mercado Pago <ExternalLink size={12} />
        </a>
      )}
    </section>
  );
}

function OrderSummary({ order, defaultOpen }: { order: CustomerOrder; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const createdAt = useMemo(() => new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), [order.createdAt]);

  return (
    <section className="mt-4 rounded-2xl bg-cream-50 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-display font-semibold text-broth-900">Resumo do pedido</span>
        <span className="flex items-center gap-2 text-sm font-bold text-broth-900">
          {formatCurrency(order.total)}
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-dashed border-broth-700/30 px-4 py-3 text-sm">
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <div>
                  <p className="font-medium text-broth-900">
                    {item.quantity}x {item.productName}
                    {item.variantName && <span className="text-broth-700"> ({item.variantName})</span>}
                  </p>
                  {item.observation && <p className="text-xs text-broth-700">Obs: {item.observation}</p>}
                </div>
                <span className="shrink-0 font-semibold">{formatCurrency(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-broth-700/30 pt-2 text-broth-800">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Entrega</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-display text-base font-bold text-broth-900">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 border-t border-dashed border-broth-700/30 pt-2 text-broth-800">
            <p className="font-semibold text-broth-900">{order.customerName}</p>
            <p>{order.customerPhone}</p>
            <p className="mt-1">
              {order.street}, {order.addressNumber} — {order.neighborhood}
            </p>
            {order.complement && <p>{order.complement}</p>}
            {order.reference && <p>Ref: {order.reference}</p>}
            <p>
              {order.city} - {order.state} · CEP {order.cep}
            </p>
            <p className="mt-1 text-xs text-broth-700/70">Feito em {createdAt}</p>
          </div>
          {order.paymentStatus === 'REJECTED' && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-brand-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> A última tentativa de pagamento foi recusada.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
