import { useEffect, useState } from 'react';
import { fetchCategories, fetchDeliveryRegions, fetchProducts } from '../services/catalog';
import { getApiErrorMessage } from '../services/api';
import { Category, DeliveryRegion, Product } from '../types';

interface CatalogState {
  products: Product[];
  categories: Category[];
  deliveryRegions: DeliveryRegion[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/** Busca cardápio + categorias + regiões de entrega direto do banco (nada de mock). */
export function useCatalog(): CatalogState {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deliveryRegions, setDeliveryRegions] = useState<DeliveryRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.all([fetchProducts(), fetchCategories(), fetchDeliveryRegions()])
      .then(([productsData, categoriesData, regionsData]) => {
        if (!active) return;
        setProducts(productsData);
        setCategories(categoriesData);
        setDeliveryRegions(regionsData);
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

  return { products, categories, deliveryRegions, isLoading, error, reload: () => setReloadToken((t) => t + 1) };
}
