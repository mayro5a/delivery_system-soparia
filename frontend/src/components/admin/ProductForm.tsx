import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Category, Product } from '../../types';
import { ProductFormInput, ProductFormVariant } from '../../services/admin';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

export function ProductForm({
  product,
  categories,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  product: Product | null;
  categories: Category[];
  onCancel: () => void;
  onSubmit: (data: ProductFormInput) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [image, setImage] = useState(product?.image ?? '');
  const [available, setAvailable] = useState(product?.available ?? true);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? '');
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [variants, setVariants] = useState<ProductFormVariant[]>(
    product?.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, available: v.available })) ?? [],
  );
  const [formError, setFormError] = useState<string | null>(null);

  function addVariant() {
    setVariants((prev) => [...prev, { name: '', price: Number(price) || 0, available: true }]);
  }

  function updateVariant(index: number, patch: Partial<ProductFormVariant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const priceNumber = Number(price);
    if (!name.trim() || name.trim().length < 2) return setFormError('Informe o nome do produto.');
    if (!categoryId) return setFormError('Selecione uma categoria.');
    if (Number.isNaN(priceNumber) || priceNumber < 0) return setFormError('Informe um preço válido.');
    if (hasVariants && variants.length === 0) return setFormError('Adicione ao menos uma variação/sabor.');
    if (hasVariants && variants.some((v) => !v.name.trim())) return setFormError('Preencha o nome de todas as variações.');

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      price: priceNumber,
      image: image.trim() || null,
      available,
      categoryId,
      hasVariants,
      variants: hasVariants ? variants : [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-semibold text-broth-900">
          Nome
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-semibold text-broth-900">
          Descrição
        </label>
        <textarea
          id="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-semibold text-broth-900">
            Preço {hasVariants && <span className="font-normal text-broth-700">(base)</span>}
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-semibold text-broth-900">
            Categoria
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="image" className="mb-1 block text-sm font-semibold text-broth-900">
          URL da imagem <span className="font-normal text-broth-700">(opcional)</span>
        </label>
        <input
          id="image"
          value={image ?? ''}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-broth-800/5 px-3 py-2">
        <span className="text-sm font-semibold text-broth-900">Status: {available ? 'Disponível' : 'Esgotado'}</span>
        <Switch checked={available} onChange={setAvailable} label="Disponibilidade" />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-broth-800/5 px-3 py-2">
        <span className="text-sm font-semibold text-broth-900">Possui variações/sabores?</span>
        <Switch checked={hasVariants} onChange={setHasVariants} label="Possui variações" />
      </div>

      {hasVariants && (
        <div className="flex flex-col gap-2 rounded-xl border border-broth-800/15 p-3">
          <p className="text-sm font-semibold text-broth-900">Variações</p>
          {variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={variant.name}
                onChange={(e) => updateVariant(index, { name: e.target.value })}
                placeholder="Nome (ex: Coca-Cola)"
                className="flex-1 rounded-lg border border-broth-800/20 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min={0}
                value={variant.price}
                onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                className="w-24 rounded-lg border border-broth-800/20 px-2 py-1.5 text-sm"
              />
              <Switch checked={variant.available} onChange={(v) => updateVariant(index, { available: v })} label={`Disponibilidade de ${variant.name}`} />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                aria-label="Remover variação"
                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 self-start text-sm font-semibold text-brand-600 hover:underline"
          >
            <Plus size={14} /> Adicionar variação
          </button>
        </div>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
