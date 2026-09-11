import { api } from './api';
import { AdminOrder, Category, DashboardSummary, OrderStatus, Product } from '../types';

// ---- Dashboard ----
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get('/admin/dashboard');
  return data.data;
}

// ---- Pedidos ----
export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const { data } = await api.get('/admin/orders');
  return data.data;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<AdminOrder> {
  const { data } = await api.patch(`/admin/orders/${id}/status`, { status });
  return data.data;
}

// ---- Produtos ----
export interface ProductFormVariant {
  id?: string;
  name: string;
  price: number;
  available: boolean;
}

export interface ProductFormInput {
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  available: boolean;
  categoryId: string;
  hasVariants: boolean;
  variants: ProductFormVariant[];
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const { data } = await api.get('/admin/products');
  return data.data;
}

/** Envia a foto escolhida pelo admin (galeria/arquivos do dispositivo) e devolve a URL salva no servidor. */
export async function uploadProductImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/admin/products/upload-image', formData);
  return data.data;
}

export async function createProduct(payload: ProductFormInput): Promise<Product> {
  const { data } = await api.post('/admin/products', payload);
  return data.data;
}

export async function updateProduct(id: string, payload: Partial<ProductFormInput>): Promise<Product> {
  const { data } = await api.put(`/admin/products/${id}`, payload);
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

export async function updateProductAvailability(id: string, available: boolean): Promise<Product> {
  const { data } = await api.patch(`/admin/products/${id}/availability`, { available });
  return data.data;
}

// ---- Categorias ----
export async function createCategory(payload: { name: string; description?: string | null }): Promise<Category> {
  const { data } = await api.post('/admin/categories', payload);
  return data.data;
}
