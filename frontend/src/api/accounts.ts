import apiClient from './client';
import type { Account, AccountInput } from '../types';

export const accountApi = {
  async list(): Promise<Account[]> {
    const { data } = await apiClient.get<Account[]>('/accounts');
    return data;
  },
  async get(id: string): Promise<Account> {
    const { data } = await apiClient.get<Account>(`/accounts/${id}`);
    return data;
  },
  async create(input: AccountInput): Promise<Account> {
    const { data } = await apiClient.post<Account>('/accounts', input);
    return data;
  },
  async update(id: string, input: Partial<AccountInput>): Promise<Account> {
    const { data } = await apiClient.put<Account>(`/accounts/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/accounts/${id}`);
  },
  async summary(): Promise<{ totalBalance: number; income: number; expense: number; count: number }> {
    const { data } = await apiClient.get('/accounts/summary');
    return data;
  },
};