import { useMemo, useState } from 'react';
import { CreditCard, MessageCircle, QrCode, Truck } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { ProductCard } from '../components/product/ProductCard';
import { CategoryTabs } from '../components/product/CategoryTabs';
import { CartFloatingButton } from '../components/cart/CartFloatingButton';
import { CartDrawer } from '../components/cart/CartDrawer';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { WHATSAPP_CONTACT_URL } from '../utils/whatsapp';
import { getOpenStatus } from '../utils/hours';

export function Home() {
  const { products, categories, isLoading, error } = useCatalog();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { isOpen, label: openLabel } = useMemo(() => getOpenStatus(), []);

  const filteredProducts = useMemo(
    () => (activeCategory ? products.filter((p) => p.categoryId === activeCategory) : products),
    [products, activeCategory],
  );

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, typeof products>();
    for (const product of filteredProducts) {
      const list = groups.get(product.category.name) ?? [];
      list.push(product);
      groups.set(product.category.name, list);
    }
    return Array.from(groups.entries());
  }, [filteredProducts]);

  return (
    <div className="pb-24">
      {/* Banner principal */}
      <section className="relative overflow-hidden border-b-2 border-gold-500/60 bg-brand-600 px-4 pb-10 pt-10 text-cream-50 sm:pt-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #F5E6C8 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <div className="flex animate-rise-in items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-gold-500' : 'bg-cream-100/40'}`} aria-hidden="true" />
            <span className={isOpen ? 'text-gold-400' : 'text-cream-100/70'}>{openLabel}</span>
          </div>
          <h1
            className="mt-3 max-w-lg animate-rise-in font-display text-4xl font-bold leading-[1.08] text-cream-50 sm:text-5xl"
            style={{ animationDelay: '60ms' }}
          >
            Sopa de panela, feita hoje, entregue quentinha.
          </h1>
          <p className="mt-3 max-w-md animate-rise-in text-[15px] leading-relaxed text-cream-100/85" style={{ animationDelay: '120ms' }}>
            Escolha, personalize, pague com Pix ou cartão e receba em casa. Simples assim.
          </p>
          <a
            href="#cardapio"
            className="mt-6 inline-flex animate-rise-in items-center rounded-full border-2 border-gold-500 bg-gold-500 px-7 py-3.5 font-display text-lg font-bold text-broth-900 shadow-floating transition-colors hover:bg-gold-400"
            style={{ animationDelay: '180ms' }}
          >
            Ver cardápio de hoje
          </a>
        </div>
      </section>

      {/* Faixa de informações */}
      <section className="border-b border-broth-700/15 bg-cream-50 px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-broth-700">
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-brand-600" /> Entrega por bairro
          </span>
          <span className="flex items-center gap-1.5">
            <QrCode size={14} className="text-brand-600" /> Pix
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard size={14} className="text-brand-600" /> Crédito e débito
          </span>
          <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-basil-600 hover:underline">
            <MessageCircle size={14} /> (92) 99278-1331
          </a>
        </div>
      </section>

      <div id="cardapio" className="mx-auto max-w-4xl">
        {!isLoading && categories.length > 0 && (
          <CategoryTabs categories={categories} active={activeCategory} onSelect={setActiveCategory} />
        )}

        <div className="px-4 py-5">
          {error && <EmptyState title="Não foi possível carregar o cardápio." description={error} />}

          {isLoading && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && !error && filteredProducts.length === 0 && (
            <EmptyState title="Nenhum produto encontrado nesta categoria." />
          )}

          {!isLoading &&
            !error &&
            groupedByCategory.map(([categoryName, categoryProducts]) => (
              <section key={categoryName} className="mb-8">
                <h2 className="divider-ornament mb-4 font-display text-xl font-bold uppercase tracking-[0.18em] text-brand-600">
                  {categoryName}
                </h2>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {categoryProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>

      <CartFloatingButton onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
