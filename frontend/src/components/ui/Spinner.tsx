import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-broth-700" role="status">
      <Loader2 size={32} className="animate-spin text-brand-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
