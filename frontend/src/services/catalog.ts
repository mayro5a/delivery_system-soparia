import { api } from './api';
import { Category, Product } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get('/products');
  return data.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/categories');
  return data.data;
}
