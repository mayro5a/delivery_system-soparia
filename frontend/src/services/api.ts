import axios from 'axios';

export const ADMIN_TOKEN_KEY = 'soparia:admin_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extrai uma mensagem de erro amigável (em português) de qualquer erro de request. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (error.code === 'ERR_NETWORK') {
      return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
