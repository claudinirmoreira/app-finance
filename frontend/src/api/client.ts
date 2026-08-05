import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError } from '../types';

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiError>;
    return axiosErr.response?.data?.message ?? 'Erro de conexão com o servidor';
  }
  return err instanceof Error ? err.message : 'Erro inesperado';
}

export default apiClient;