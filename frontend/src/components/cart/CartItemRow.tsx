import { useState } from 'react';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useCartStore } from '../../store/cartStore';

export function CartItemRow({ item }: { item: CartItem }) {
  const { incrementItem, decrementItem, removeItem, updateObservation } = useCartStore();
  const [editingObservation, setEditingObservation] = useState(false);
  const [draft, setDraft] = useState(item.observation);

  function saveObservation() {
    updateObservation(item.key, draft);
    setEditingObservation(false);
  }

  return (
    <li className="flex flex-col gap-2 border-b border-broth-800/10 py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-broth-900">
            {item.productName}
            {item.variantName && <span className="text-broth-700"> ({item.variantName})</span>}
          </p>
          <p className="text-sm text-broth-700">{formatCurrency(item.unitPrice)} cada</p>
        </div>
        <button
          type="button"
          onClick={() => removeItem(item.key)}
          aria-label={`Remover ${item.productName}`}
          className="rounded-full p-2 text-broth-700 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {editingObservation ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={280}
            className="w-full rounded-lg border border-broth-800/20 px-2 py-1 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveObservation}
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.observation);
                setEditingObservation(false);
              }}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-broth-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingObservation(true)}
          className="flex items-center gap-1 self-start text-xs text-broth-700 hover:text-brand-600"
        >
          <Pencil size={12} />
          {item.observation ? `Obs: ${item.observation}` : 'Adicionar observação'}
        </button>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => decrementItem(item.key)}
            aria-label="Diminuir quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-broth-800/20 hover:bg-broth-800/5"
          >
            <Minus size={14} />
          </button>
          <span className="w-5 text-center font-semibold">{item.quantity}</span>
          <button
            type="button"
            onClick={() => incrementItem(item.key)}
            aria-label="Aumentar quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-broth-800/20 hover:bg-broth-800/5"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="font-bold text-broth-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
      </div>
    </li>
  );
}
