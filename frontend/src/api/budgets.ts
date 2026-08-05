import apiClient from './client';
import type { Budget, BudgetInput } from '../types';

export const budgetApi = {
  async list(year?: number, month?: number): Promise<Budget[]> {
    const { data } = await apiClient.get<Budget[]>('/budgets', { params: { year, month } });
    return data;
  },
  async create(input: BudgetInput): Promise<Budget> {
    const { data } = await apiClient.post<Budget>('/budgets', input);
    return data;
  },
  async update(id: string, input: Partial<BudgetInput>): Promise<Budget> {
    const { data } = await apiClient.put<Budget>(`/budgets/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`);
  },
};