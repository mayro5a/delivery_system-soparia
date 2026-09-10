import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/currency';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { CartItemRow } from './CartItemRow';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Seu carrinho">
      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title="Seu carrinho está vazio."
          description="Escolha uma deliciosa sopa para começar!"
          action={
            <Button variant="outline" onClick={onClose}>
              Ver cardápio
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul>
            {items.map((item) => (
              <CartItemRow key={item.key} item={item} />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-broth-800/10 pt-3 text-lg font-bold text-broth-900">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <p className="-mt-2 text-xs text-broth-700">A taxa de entrega é calculada na próxima etapa.</p>
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              onClose();
              navigate('/checkout');
            }}
          >
            Continuar para o checkout
          </Button>
        </div>
      )}
    </Modal>
  );
}
