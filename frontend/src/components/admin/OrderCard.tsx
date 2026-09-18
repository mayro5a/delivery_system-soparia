import { ArrowRight, Ban, Clock3, Mail, MapPin, Phone } from 'lucide-react';
import {
  AdminOrder,
  OrderStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Badge } from '../ui/Badge';

/** Próximo passo operacional que o admin pode dar a partir do status atual. */
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PAGO: { status: 'EM_PREPARO', label: 'Iniciar preparo' },
  AGUARDANDO_PREPARO: { status: 'EM_PREPARO', label: 'Iniciar preparo' },
  EM_PREPARO: { status: 'SAIU_PARA_ENTREGA', label: 'Saiu para entrega' },
  SAIU_PARA_ENTREGA: { status: 'CONCLUIDO', label: 'Concluir' },
};

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export function orderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

export function OrderCard({
  order,
  onChangeStatus,
}: {
  order: AdminOrder;
  onChangeStatus: (id: number, status: OrderStatus) => void;
}) {
  const next = NEXT_STEP[order.orderStatus];
  const canCancel = order.orderStatus !== 'CONCLUIDO' && order.orderStatus !== 'CANCELADO';
  const createdAt = new Date(order.createdAt);
  const time = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const phoneDigits = order.customerPhone.replace(/\D/g, '');

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl bg-cream-50 p-3.5 shadow-card">
      <header className="flex items-start justify-between gap-2">
        <div>
          <span className="font-display text-base font-bold text-broth-900">{orderNumber(order.id)}</span>
          <p className="flex items-center gap-1 text-[11px] text-broth-700">
            <Clock3 size={11} /> {date} às {time}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={PAYMENT_TONE[order.paymentStatus]}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
          <span className="text-[11px] font-medium text-broth-700">
            {order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] : 'Sem pagamento'}
          </span>
        </div>
      </header>

      <div>
        <p className="font-semibold text-broth-900">{order.customerName}</p>
        <a
          href={phoneDigits ? `https://wa.me/55${phoneDigits}` : undefined}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-broth-700 hover:text-basil-600"
        >
          <Phone size={12} /> {order.customerPhone}
        </a>
        <a href={`mailto:${order.customerEmail}`} className="flex items-center gap-1 text-xs text-broth-700 hover:text-basil-600">
          <Mail size={12} /> {order.customerEmail}
        </a>
      </div>

      <ul className="flex flex-col gap-1 rounded-xl bg-white/70 px-3 py-2 text-sm text-broth-900">
        {order.items.map((item) => (
          <li key={item.id}>
            <div className="flex justify-between gap-2">
              <span>
                <span className="font-bold text-brand-600">{item.quantity}x</span> {item.productName}
                {item.variantName && <span className="text-broth-700"> ({item.variantName})</span>}
              </span>
              <span className="shrink-0 text-xs text-broth-700">{formatCurrency(item.subtotal)}</span>
            </div>
            {item.observation && (
              <p className="ml-1 rounded-md bg-gold-500/20 px-2 py-0.5 text-xs font-medium text-broth-800">Obs: {item.observation}</p>
            )}
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-3 gap-1 text-xs text-broth-800">
        <div>
          <dt className="text-broth-700/70">Subtotal</dt>
          <dd className="font-semibold">{formatCurrency(order.subtotal)}</dd>
        </div>
        <div>
          <dt className="text-broth-700/70">Entrega</dt>
          <dd className="font-semibold">{formatCurrency(order.deliveryFee)}</dd>
        </div>
        <div>
          <dt className="text-broth-700/70">Total</dt>
          <dd className="font-display text-base font-bold text-broth-900">{formatCurrency(order.total)}</dd>
        </div>
      </dl>

      <address className="flex items-start gap-1.5 text-xs not-italic text-broth-800">
        <MapPin size={13} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          {order.street}, {order.addressNumber} — {order.neighborhood}
          {order.complement && <> · {order.complement}</>}
          {order.reference && (
            <>
              <br />
              Ref: {order.reference}
            </>
          )}
          <br />
          {order.city} - {order.state} · CEP {order.cep}
        </span>
      </address>

      {(next || canCancel) && (
        <footer className="flex gap-2 pt-1">
          {next && (
            <button
              type="button"
              onClick={() => onChangeStatus(order.id, next.status)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              {next.label} <ArrowRight size={14} />
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Cancelar o pedido ${orderNumber(order.id)}?`)) onChangeStatus(order.id, 'CANCELADO');
              }}
              className="flex items-center justify-center gap-1 rounded-lg border border-brand-500/40 px-2.5 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
              aria-label="Cancelar pedido"
              title="Cancelar pedido"
            >
              <Ban size={14} />
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
