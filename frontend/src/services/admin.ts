import { api } from './api';
import { AdminOrder, Category, DashboardSummary, DeliveryRegion, OrderStatus, Product } from '../types';

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

// ---- Regiões de entrega ----
export async function fetchAdminDeliveryRegions(): Promise<DeliveryRegion[]> {
  const { data } = await api.get('/admin/delivery-regions');
  return data.data;
}

export async function createDeliveryRegion(payload: {
  name: string;
  fee: number;
  available: boolean;
}): Promise<DeliveryRegion> {
  const { data } = await api.post('/admin/delivery-regions', payload);
  return data.data;
}

export async function updateDeliveryRegion(
  id: string,
  payload: Partial<{ name: string; fee: number; available: boolean }>,
): Promise<DeliveryRegion> {
  const { data } = await api.put(`/admin/delivery-regions/${id}`, payload);
  return data.data;
}

export async function deleteDeliveryRegion(id: string): Promise<void> {
  await api.delete(`/admin/delivery-regions/${id}`);
}
