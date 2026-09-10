import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchAdminOrders, updateOrderStatus } from '../../services/admin';
import { getApiErrorMessage } from '../../services/api';
import { AdminOrder, OrderStatus, ORDER_STATUS_LABELS } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderCard, orderNumber } from '../../components/admin/OrderCard';

const REFRESH_INTERVAL_MS = 15000;

interface Column {
  key: string;
  title: string;
  statuses: OrderStatus[];
  accent: string;
}

const COLUMNS: Column[] = [
  { key: 'aguardando', title: 'Aguardando pagamento', statuses: ['AGUARDANDO_PAGAMENTO'], accent: 'border-gold-500' },
  { key: 'pagos', title: 'Pagos / Aguardando preparo', statuses: ['PAGO', 'AGUARDANDO_PREPARO'], accent: 'border-basil-500' },
  { key: 'preparo', title: 'Em preparo', statuses: ['EM_PREPARO'], accent: 'border-brand-500' },
  { key: 'entrega', title: 'Saiu para entrega', statuses: ['SAIU_PARA_ENTREGA'], accent: 'border-broth-500' },
  { key: 'concluidos', title: 'Concluídos', statuses: ['CONCLUIDO'], accent: 'border-broth-900/30' },
  { key: 'cancelados', title: 'Cancelados', statuses: ['CANCELADO'], accent: 'border-broth-900/15' },
];

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await fetchAdminOrders();
      setOrders(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      if (!silent) setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Novos pedidos e confirmações de pagamento (webhook) aparecem sem precisar recarregar.
    const timer = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function handleChangeStatus(id: number, status: OrderStatus) {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, orderStatus: status } : o)));
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast(`Pedido ${orderNumber(id)} → ${ORDER_STATUS_LABELS[status]}`);
    } catch (err) {
      setOrders(previous);
      showToast(getApiErrorMessage(err), 'error');
    }
  }

  if (isLoading) return <Spinner label="Carregando pedidos..." />;
  if (error && orders.length === 0) return <EmptyState title="Não foi possível carregar os pedidos." description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-broth-900">Pedidos</h1>
          <p className="text-sm text-broth-700">Pedidos pagos entram automaticamente na coluna de preparo.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-full border border-broth-700/20 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-broth-800 hover:bg-white"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}` : 'Atualizar'}
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Nenhum pedido ainda." description="Os pedidos feitos pelo site aparecerão aqui automaticamente." />
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((o) => column.statuses.includes(o.orderStatus));
            return (
              <section key={column.key} className={`w-[19rem] shrink-0 rounded-2xl border-t-4 bg-broth-700/5 p-3 ${column.accent}`}>
                <h2 className="mb-3 flex items-center justify-between font-display text-sm font-bold uppercase tracking-wide text-broth-800">
                  {column.title}
                  <span className="rounded-full bg-cream-50 px-2 py-0.5 font-sans text-xs">{columnOrders.length}</span>
                </h2>
                <div className="flex flex-col gap-3">
                  {columnOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onChangeStatus={handleChangeStatus} />
                  ))}
                  {columnOrders.length === 0 && <p className="py-4 text-center text-xs text-broth-700/60">Nenhum pedido</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
