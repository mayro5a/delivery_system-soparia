import { api } from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}
