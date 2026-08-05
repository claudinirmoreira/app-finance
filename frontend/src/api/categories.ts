import apiClient from './client';
import type { Category, CategoryInput, TransactionType } from '../types';

export const categoryApi = {
  async list(type?: TransactionType): Promise<Category[]> {
    const params = type ? { type } : undefined;
    const { data } = await apiClient.get<Category[]>('/categories', { params });
    return data;
  },
  async create(input: CategoryInput): Promise<Category> {
    const { data } = await apiClient.post<Category>('/categories', input);
    return data;
  },
  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const { data } = await apiClient.put<Category>(`/categories/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};