import { StorageService } from './StorageService.js';
import { generateId } from '../utils/idGenerator.js';
import { bus } from '../utils/eventBus.js';

const COLLECTION = 'budgets';

export const BudgetService = {
  getAll() {
    return StorageService.getAll(COLLECTION);
  },

  getById(id) {
    return StorageService.getById(COLLECTION, id);
  },

  getByMonth(year, month) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return this.getAll().filter(b => b.monthKey === key);
  },

  getByCategoryAndMonth(categoryId, year, month) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return this.getAll().find(b => b.categoryId === categoryId && b.monthKey === key) || null;
  },

  create(data) {
    const month = data.month || new Date().getMonth() + 1;
    const year = data.year || new Date().getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const existing = this.getByCategoryAndMonth(data.categoryId, year, month);
    if (existing) {
      return this.update(existing.id, { amount: data.amount });
    }

    const budget = {
      id: generateId(),
      categoryId: data.categoryId,
      amount: parseFloat(data.amount),
      monthKey,
      year,
      month,
      createdAt: new Date().toISOString(),
    };
    StorageService.create(COLLECTION, budget);
    bus.emit('budgets:change');
    return budget;
  },

  update(id, data) {
    const updated = StorageService.update(COLLECTION, id, data);
    if (updated) bus.emit('budgets:change');
    return updated;
  },

  remove(id) {
    const removed = StorageService.remove(COLLECTION, id);
    if (removed) bus.emit('budgets:change');
    return removed;
  },

  getBudgetVsSpent(year, month, getCategorySpent) {
    const budgets = this.getByMonth(year, month);
    return budgets.map(budget => {
      const spent = getCategorySpent(budget.categoryId);
      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    });
  }
};
