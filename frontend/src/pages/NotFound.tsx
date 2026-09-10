import { Link } from 'react-router-dom';
import { Soup } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Soup size={44} strokeWidth={1.5} className="text-brand-300" aria-hidden="true" />
      <h1 className="font-display text-2xl font-semibold text-broth-900">Página não encontrada</h1>
      <p className="text-sm text-broth-700">O endereço que você tentou acessar não existe.</p>
      <Link to="/">
        <Button>Voltar para o início</Button>
      </Link>
    </div>
  );
}
