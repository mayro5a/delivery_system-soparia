import { useEffect, useState } from 'react';
import { fetchAdminProducts, updateProductAvailability } from '../../services/admin';
import { getApiErrorMessage } from '../../services/api';
import { Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Switch } from '../../components/ui/Switch';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

export function AdminAvailability() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAdminProducts()
      .then(setProducts)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggle(product: Product) {
    const nextAvailable = !product.available;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: nextAvailable } : p)));
    try {
      await updateProductAvailability(product.id, nextAvailable);
      showToast(`${product.name} marcado como ${nextAvailable ? 'disponível' : 'esgotado'}.`);
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: !nextAvailable } : p)));
      showToast(getApiErrorMessage(err), 'error');
    }
  }

  if (isLoading) return <Spinner label="Carregando produtos..." />;
  if (error) return <EmptyState title="Não foi possível carregar os produtos." description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-broth-900">Disponibilidade</h1>
        <p className="text-sm text-broth-700">Marque rapidamente o que está esgotado — a mudança aparece na hora para o cliente.</p>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto cadastrado." />
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="font-medium text-broth-900">{product.name}</p>
                <p className="text-xs text-broth-700">{product.category.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {product.available ? (
                  <Badge tone="success">Disponível</Badge>
                ) : (
                  <Badge tone="danger">Esgotado</Badge>
                )}
                <Switch checked={product.available} onChange={() => toggle(product)} label={`Disponibilidade de ${product.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
