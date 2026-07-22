import { StorageService } from './StorageService.js';
import { generateId } from '../utils/idGenerator.js';
import { bus } from '../utils/eventBus.js';
import { getMonthRange } from '../utils/formatters.js';

const COLLECTION = 'transactions';

export const TransactionService = {
  getAll() {
    return StorageService.getAll(COLLECTION).sort((a, b) =>
      new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  getById(id) {
    return StorageService.getById(COLLECTION, id);
  },

  getByMonth(year, month) {
    const { start, end } = getMonthRange(year, month);
    return this.getAll().filter(t => t.date >= start && t.date <= end);
  },

  getByAccount(accountId) {
    return this.getAll().filter(t => t.accountId === accountId);
  },

  getByCategory(categoryId) {
    return this.getAll().filter(t => t.categoryId === categoryId);
  },

  getByType(type) {
    return this.getAll().filter(t => t.type === type);
  },

  getByDateRange(startDate, endDate) {
    return this.getAll().filter(t => t.date >= startDate && t.date <= endDate);
  },

  create(data) {
    const transaction = {
      id: generateId(),
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      type: data.type,
      date: data.date,
      accountId: data.accountId,
      categoryId: data.categoryId,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    StorageService.create(COLLECTION, transaction);
    bus.emit('transactions:change');
    return transaction;
  },

  update(id, data) {
    const updated = StorageService.update(COLLECTION, id, {
      ...data,
      amount: data.amount ? parseFloat(data.amount) : undefined,
    });
    if (updated) {
      bus.emit('transactions:change');
    }
    return updated;
  },

  remove(id) {
    const transaction = this.getById(id);
    const removed = StorageService.remove(COLLECTION, id);
    if (removed) {
      bus.emit('transactions:change');
    }
    return removed;
  },

  getMonthSummary(year, month) {
    const transactions = this.getByMonth(year, month);
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense, count: transactions.length };
  },

  getCategoryTotals(year, month, type) {
    const transactions = this.getByMonth(year, month).filter(t => t.type === type);
    const totals = {};
    transactions.forEach(t => {
      if (!totals[t.categoryId]) totals[t.categoryId] = 0;
      totals[t.categoryId] += t.amount;
    });
    return totals;
  },

  getDailyTotals(year, month) {
    const transactions = this.getByMonth(year, month);
    const { start, end } = getMonthRange(year, month);
    const days = {};
    const currentDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');

    while (currentDate <= endDate) {
      const dayStr = currentDate.toISOString().split('T')[0];
      days[dayStr] = { income: 0, expense: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    transactions.forEach(t => {
      if (days[t.date]) {
        days[t.date][t.type] += t.amount;
      }
    });

    return days;
  },

  getMonthlyTotals(year) {
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const summary = this.getMonthSummary(year, m);
      result.push({ month: m, ...summary });
    }
    return result;
  },

  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(t =>
      t.description.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  },

  getAccountBalance(accountId) {
    const account = StorageService.getById('accounts', accountId);
    if (!account) return 0;
    const txns = this.getByAccount(accountId);
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return account.initialBalance + inc - exp;
  }
};
