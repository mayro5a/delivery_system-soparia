import { useEffect, useState } from 'react';
import { fetchCategories, fetchProducts } from '../services/catalog';
import { getApiErrorMessage } from '../services/api';
import { Category, Product } from '../types';

interface CatalogState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/** Busca cardápio + categorias direto do banco (nada de mock). */
export function useCatalog(): CatalogState {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productsData, categoriesData]) => {
        if (!active) return;
        setProducts(productsData);
        setCategories(categoriesData);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { products, categories, isLoading, error, reload: () => setReloadToken((t) => t + 1) };
}
