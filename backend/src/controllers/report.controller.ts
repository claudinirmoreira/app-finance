import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

function dateRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export const reportController = {
  async summary(year: number, month: number) {
    const { start, end } = dateRange(year, month);
    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
    });

    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      const value = tx.amount.toNumber();
      if (tx.type === 'income') income += value;
      else expense += value;
    }
    return { income, expense, balance: income - expense, count: transactions.length };
  },

  async categoryTotals(year: number, month: number, type?: string) {
    const { start, end } = dateRange(year, month);
    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(type ? { type: type as 'income' } : {}),
      },
      select: { categoryId: true, type: true, amount: true },
    });

    const totals: Record<string, number> = {};
    for (const tx of transactions) {
      totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + tx.amount.toNumber();
    }
    return totals;
  },

  async daily(year: number, month: number) {
    const { start, end } = dateRange(year, month);
    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, type: true, amount: true },
    });

    const daily: Record<string, { income: number; expense: number }> = {};
    for (const tx of transactions) {
      const day = tx.date.toISOString().split('T')[0];
      daily[day] = daily[day] ?? { income: 0, expense: 0 };
      const value = tx.amount.toNumber();
      if (tx.type === 'income') daily[day].income += value;
      else daily[day].expense += value;
    }
    return daily;
  },

  async monthlyTotals(year: number) {
    const result = [];
    for (let m = 1; m <= 12; m++) {
      result.push({ month: m, ...(await this.summary(year, m)) });
    }
    return result;
  },

  async accountBalances() {
    const accounts = await prisma.account.findMany({
      include: { transactions: { select: { type: true, amount: true } } },
    });

    return accounts.map((acc) => {
      let balance = acc.initialBalance.toNumber();
      let income = 0;
      let expense = 0;
      for (const tx of acc.transactions) {
        const value = tx.amount.toNumber();
        if (tx.type === 'income') {
          income += value;
          balance += value;
        } else {
          expense += value;
          balance -= value;
        }
      }
      return {
        id: acc.id,
        name: acc.name,
        icon: acc.icon,
        color: acc.color,
        initialBalance: acc.initialBalance.toNumber(),
        income,
        expense,
        balance,
      };
    });
  },

  async budgetRatios(year: number, month: number) {
    const [budgets, catTotals] = await Promise.all([
      prisma.budget.findMany({
        where: { year, month },
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      }),
      this.categoryTotals(year, month, 'expense'),
    ]);

    return budgets.map((budget) => {
      const spent = catTotals[budget.categoryId] ?? 0;
      const amount = budget.amount.toNumber();
      return {
        ...budget,
        amount,
        spent,
        remaining: amount - spent,
        percentage: amount > 0 ? (spent / amount) * 100 : 0,
      };
    });
  },
};