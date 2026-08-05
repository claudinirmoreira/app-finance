import apiClient from './client';
import type { Transaction, TransactionInput, TransactionQuery } from '../types';

export const transactionApi = {
  async list(query: TransactionQuery = {}): Promise<Transaction[]> {
    const { data } = await apiClient.get<Transaction[]>('/transactions', { params: query });
    return data;
  },
  async get(id: string): Promise<Transaction> {
    const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
    return data;
  },
  async create(input: TransactionInput): Promise<Transaction> {
    const { data } = await apiClient.post<Transaction>('/transactions', input);
    return data;
  },
  async update(id: string, input: Partial<TransactionInput>): Promise<Transaction> {
    const { data } = await apiClient.put<Transaction>(`/transactions/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};