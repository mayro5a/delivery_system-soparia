import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  fetchAdminProducts,
  ProductFormInput,
  updateProduct,
} from '../../services/admin';
import { fetchCategories } from '../../services/catalog';
import { getApiErrorMessage } from '../../services/api';
import { Category, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProductForm } from '../../components/admin/ProductForm';

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  function load() {
    setIsLoading(true);
    Promise.all([fetchAdminProducts(), fetchCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleSubmit(data: ProductFormInput) {
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        showToast('Produto atualizado com sucesso.');
      } else {
        await createProduct(data);
        showToast('Produto criado com sucesso.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Excluir "${product.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteProduct(product.id);
      showToast('Produto excluído.');
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  }

  if (isLoading) return <Spinner label="Carregando cardápio..." />;
  if (error) return <EmptyState title="Não foi possível carregar o cardápio." description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-broth-900">Cardápio</h1>
          <p className="text-sm text-broth-700">Crie, edite e remova produtos do cardápio</p>
        </div>
        <Button onClick={openCreate} className="hidden sm:inline-flex">
          <Plus size={18} /> Novo produto
        </Button>
      </div>
      <Button onClick={openCreate} className="sm:hidden">
        <Plus size={18} /> Novo produto
      </Button>

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto cadastrado ainda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-broth-900">{product.name}</p>
                  <p className="text-xs text-broth-700">{product.category.name}</p>
                </div>
                {product.available ? <Badge tone="success">Disponível</Badge> : <Badge tone="danger">Esgotado</Badge>}
              </div>
              <p className="font-bold text-brand-600">
                {product.hasVariants ? 'a partir de ' : ''}
                {formatCurrency(product.hasVariants ? Math.min(...product.variants.map((v) => v.price), product.price) : product.price)}
              </p>
              {product.hasVariants && (
                <p className="text-xs text-broth-700">{product.variants.length} variação(ões) cadastrada(s)</p>
              )}
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-broth-800/10 px-2 py-2 text-sm font-semibold text-broth-800 hover:bg-broth-800/20"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  aria-label={`Excluir ${product.name}`}
                  className="rounded-lg border border-red-200 px-2 py-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Editar produto' : 'Novo produto'}>
        <ProductForm
          product={editingProduct}
          categories={categories}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
}
