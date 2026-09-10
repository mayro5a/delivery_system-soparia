import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getCategoryIcon } from '../../utils/categoryIcon';
import { AddToCartModal } from './AddToCartModal';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayPrice = product.hasVariants
    ? Math.min(...product.variants.map((v) => v.price), product.price)
    : product.price;
  const PlaceholderIcon = getCategoryIcon(product.category.name);

  return (
    <>
      <article
        className={`group relative flex animate-rise-in flex-col overflow-hidden rounded-xl bg-cream-50 shadow-vintage transition-transform duration-200 ease-snap ${
          product.available ? 'hover:-translate-y-0.5' : 'opacity-90'
        }`}
        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      >
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-cream-200 to-cream-300">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ease-snap ${
                product.available ? 'group-hover:scale-105' : 'grayscale'
              }`}
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-broth-500/40 bg-cream-50/70">
              <PlaceholderIcon size={30} strokeWidth={1.5} className="text-broth-500" aria-hidden="true" />
            </span>
          )}
          {!product.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-broth-900/60 backdrop-blur-[1px]">
              <span className="stamp -rotate-6 px-4 py-2 text-sm shadow-floating">Esgotado</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="font-display text-[16px] font-bold leading-snug text-broth-900">{product.name}</h3>
          {product.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-broth-700/90">{product.description}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="leading-tight">
              {product.hasVariants && <span className="block text-[11px] font-medium text-broth-700/70">a partir de</span>}
              <span className="font-display text-lg font-bold text-brand-600">{formatCurrency(displayPrice)}</span>
            </span>
            <button
              type="button"
              disabled={!product.available}
              onClick={() => setModalOpen(true)}
              aria-label={product.available ? `Adicionar ${product.name} ao carrinho` : `${product.name} esgotado`}
              className="flex shrink-0 items-center justify-center rounded-full border-2 border-gold-500 bg-brand-600 p-2.5 text-cream-50 transition-[background-color,transform] duration-150 ease-snap hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:border-broth-700/15 disabled:bg-broth-700/10 disabled:text-broth-700/40"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </article>

      {modalOpen && <AddToCartModal product={product} onClose={() => setModalOpen(false)} />}
    </>
  );
}
