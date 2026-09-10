import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock3, DollarSign, PackageCheck, Truck, Wallet } from 'lucide-react';
import { fetchDashboardSummary } from '../../services/admin';
import { getApiErrorMessage } from '../../services/api';
import { DashboardSummary } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { StatCard } from '../../components/admin/StatCard';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';

export function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <EmptyState title="Não foi possível carregar o dashboard." description={error} />;
  if (!summary) return <Spinner label="Carregando dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-broth-900">Dashboard</h1>
        <p className="text-sm text-broth-700">Resumo dos pedidos de hoje</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Pedidos de hoje" value={summary.ordersToday} icon={<PackageCheck size={20} />} tone="brand" />
        <StatCard label="Aguardando pagamento" value={summary.aguardandoPagamento} icon={<Wallet size={20} />} />
        <StatCard label="Pagos / a preparar" value={summary.pagos} icon={<Clock3 size={20} />} />
        <StatCard label="Em preparo" value={summary.emPreparo} icon={<ChefHat size={20} />} />
        <StatCard label="Saiu para entrega" value={summary.saiuParaEntrega} icon={<Truck size={20} />} />
      </div>

      <div className="rounded-2xl bg-broth-900 p-6 text-cream-100 shadow-card">
        <p className="flex items-center gap-2 text-sm font-medium text-cream-200/80">
          <DollarSign size={18} className="text-gold-500" /> Faturamento de hoje (pagamentos confirmados)
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-gold-500">{formatCurrency(summary.revenueToday)}</p>
        <p className="mt-1 text-xs text-cream-200/60">
          {summary.concluido} concluído(s) · {summary.cancelado} cancelado(s)
        </p>
      </div>

      <Link to="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">
        Ir para o painel de pedidos →
      </Link>
    </div>
  );
}
