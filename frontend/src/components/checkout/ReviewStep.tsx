import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/currency';
import { CartItemRow } from '../cart/CartItemRow';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export function ReviewStep({ onNext }: { onNext: () => void }) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={40} />}
        title="Seu carrinho está vazio."
        description="Escolha uma deliciosa sopa para começar!"
        action={
          <Button variant="outline" onClick={() => navigate('/')}>
            Ver cardápio
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-bold text-broth-900">Revise seu pedido</h2>
      <ul className="rounded-2xl bg-white px-4 shadow-card">
        {items.map((item) => (
          <CartItemRow key={item.key} item={item} />
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-lg font-bold text-broth-900 shadow-card">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={() => navigate('/')}>
          Adicionar mais itens
        </Button>
        <Button fullWidth onClick={onNext}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
