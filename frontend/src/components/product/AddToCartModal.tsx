import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useCartStore } from '../../store/cartStore';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function AddToCartModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const availableVariants = product.variants.filter((v) => v.available);
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const addItem = useCartStore((s) => s.addItem);
  const { showToast } = useToast();

  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const unitPrice = product.hasVariants ? selectedVariant?.price ?? product.price : product.price;
  const canSubmit = !product.hasVariants || !!variantId;

  function handleAdd() {
    if (!canSubmit) return;
    addItem({
      productId: product.id,
      variantId: product.hasVariants ? variantId : null,
      productName: product.name,
      variantName: product.hasVariants ? selectedVariant?.name ?? null : null,
      unitPrice,
      quantity,
      observation,
      image: product.image,
    });
    const label = product.hasVariants ? `${product.name} (${selectedVariant?.name})` : product.name;
    showToast(`${label} adicionada ao carrinho`);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={product.name}>
      <div className="flex flex-col gap-4">
        {product.description && <p className="text-sm text-broth-700">{product.description}</p>}

        {product.hasVariants && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-broth-900">Escolha o sabor</legend>
            {availableVariants.length === 0 ? (
              <p className="text-sm text-red-600">Nenhuma variação disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableVariants.map((variant) => (
                  <label
                    key={variant.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                      variantId === variant.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-broth-800/15 text-broth-800'
                    }`}
                  >
                    <span>{variant.name}</span>
                    <input
                      type="radio"
                      name="variant"
                      className="sr-only"
                      checked={variantId === variant.id}
                      onChange={() => setVariantId(variant.id)}
                    />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <div>
          <label htmlFor="observation" className="mb-1 block text-sm font-semibold text-broth-900">
            Observação <span className="font-normal text-broth-700">(opcional)</span>
          </label>
          <textarea
            id="observation"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Ex: Sem cheiro-verde, sem cebola..."
            maxLength={280}
            rows={2}
            className="w-full rounded-xl border border-broth-800/20 px-3 py-2 text-sm focus:border-brand-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-broth-900">Quantidade</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-broth-800/20 text-broth-800 hover:bg-broth-800/5"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar quantidade"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-broth-800/20 text-broth-800 hover:bg-broth-800/5"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <Button onClick={handleAdd} disabled={!canSubmit} size="lg" fullWidth>
          Adicionar • {formatCurrency(unitPrice * quantity)}
        </Button>
      </div>
    </Modal>
  );
}
