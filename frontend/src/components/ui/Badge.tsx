import { ReactNode } from 'react';

type Tone = 'success' | 'danger' | 'neutral' | 'warning' | 'info';

const toneClasses: Record<Tone, string> = {
  success: 'bg-basil-400/15 text-basil-600',
  danger: 'bg-red-100 text-red-800',
  neutral: 'bg-broth-800/10 text-broth-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
