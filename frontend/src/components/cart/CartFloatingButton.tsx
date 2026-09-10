import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/currency';

export function CartFloatingButton({ onClick }: { onClick: () => void }) {
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const subtotal = useCartStore((s) => s.subtotal());

  if (totalQuantity === 0) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <button
        type="button"
        onClick={onClick}
        className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl bg-broth-900 px-5 py-4 text-cream-100 shadow-floating transition-colors hover:bg-broth-800"
      >
        <span key={totalQuantity} className="flex animate-pop items-center gap-2 font-semibold">
          <ShoppingCart size={20} className="text-brand-400" />
          {totalQuantity} {totalQuantity === 1 ? 'item' : 'itens'} · {formatCurrency(subtotal)}
        </span>
        <span className="font-display font-semibold">Ver carrinho</span>
      </button>
    </div>
  );
}
