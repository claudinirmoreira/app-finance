import apiClient from './client';
import type { BudgetRatio, MonthSummary, TransactionType } from '../types';

export interface AccountBalanceRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  initialBalance: number;
  income: number;
  expense: number;
  balance: number;
}

export interface DailyTotals {
  [date: string]: { income: number; expense: number };
}

export const reportApi = {
  async summary(year: number, month: number): Promise<MonthSummary> {
    const { data } = await apiClient.get<MonthSummary>('/reports/summary', { params: { year, month } });
    return data;
  },
  async categoryTotals(year: number, month: number, type?: TransactionType): Promise<Record<string, number>> {
    const { data } = await apiClient.get('/reports/category-totals', { params: { year, month, type } });
    return data;
  },
  async daily(year: number, month: number): Promise<DailyTotals> {
    const { data } = await apiClient.get<DailyTotals>('/reports/daily', { params: { year, month } });
    return data;
  },
  async monthlyTotals(year: number): Promise<Array<MonthSummary & { month: number }>> {
    const { data } = await apiClient.get('/reports/monthly', { params: { year } });
    return data;
  },
  async accountBalances(): Promise<AccountBalanceRow[]> {
    const { data } = await apiClient.get<AccountBalanceRow[]>('/reports/account-balances');
    return data;
  },
  async budgetRatios(year: number, month: number): Promise<BudgetRatio[]> {
    const { data } = await apiClient.get<BudgetRatio[]>('/reports/budget-ratios', { params: { year, month } });
    return data;
  },
};