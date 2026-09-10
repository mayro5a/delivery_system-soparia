import { Check } from 'lucide-react';

const STEPS = ['Carrinho', 'Entrega', 'Pagamento'];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex max-w-md items-center justify-between px-2 py-4" aria-label="Etapas do pedido">
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold transition-all duration-300 ${
                isDone
                  ? 'bg-broth-700 text-cream-100'
                  : isActive
                    ? 'scale-110 bg-brand-600 text-cream-50 shadow-floating ring-2 ring-gold-500 ring-offset-2 ring-offset-cream-100'
                    : 'bg-broth-700/10 text-broth-700'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span key={isDone ? 'done' : isActive ? 'active' : 'pending'} className="flex animate-pop items-center justify-center">
                {isDone ? <Check size={16} /> : step}
              </span>
            </div>
            <span className={`text-xs font-semibold transition-colors duration-300 ${isActive ? 'text-broth-900' : 'text-broth-700/70'}`}>
              {label}
            </span>
            {step !== 3 && (
              <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-broth-700/15">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full bg-broth-700 transition-all duration-500 ease-out ${
                    isDone ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
