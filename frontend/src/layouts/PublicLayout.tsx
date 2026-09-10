import { Outlet, Link, useLocation } from 'react-router-dom';
import { Clock, CreditCard, MapPin, MessageCircle, Soup } from 'lucide-react';
import { WHATSAPP_CONTACT_URL } from '../utils/whatsapp';

export function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      {/* Faixa dourada fina no topo, como a borda do cardápio impresso. */}
      <div className="h-1 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b-2 border-gold-500/70 bg-brand-600 text-cream-50 shadow-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold-500 bg-brand-700">
              <Soup size={20} strokeWidth={2} className="text-gold-500" aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-bold tracking-wide">Soparia da Lê</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">Sopas artesanais</span>
            </span>
          </Link>
          <a
            href={WHATSAPP_CONTACT_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-basil-500 px-3.5 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-basil-600"
            aria-label="Falar no WhatsApp"
          >
            <MessageCircle size={17} strokeWidth={2.25} />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {isHome && (
        <footer className="border-t-4 border-gold-500 bg-broth-900 px-4 py-10 text-cream-100">
          <div className="mx-auto grid max-w-4xl gap-6 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Clock size={18} className="mt-0.5 shrink-0 text-gold-500" />
              <div>
                <p className="font-display font-semibold">Horário</p>
                <p className="mt-0.5 text-cream-200/70">Todos os dias, 18h às 23h</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-gold-500" />
              <div>
                <p className="font-display font-semibold">Entrega</p>
                <p className="mt-0.5 text-cream-200/70">Taxa calculada pelo bairro no checkout</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CreditCard size={18} className="mt-0.5 shrink-0 text-gold-500" />
              <div>
                <p className="font-display font-semibold">Pagamento</p>
                <p className="mt-0.5 text-cream-200/70">Pix ou cartão, direto pelo site</p>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-cream-200/50">
            <p>© {new Date().getFullYear()} Soparia da Lê. Feito com carinho.</p>
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cream-100">
              <MessageCircle size={12} /> (92) 99278-1331
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
