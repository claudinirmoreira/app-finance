import { StorageService } from './StorageService.js';
import { generateId } from '../utils/idGenerator.js';
import { bus } from '../utils/eventBus.js';

const COLLECTION = 'accounts';

const DEFAULT_ACCOUNTS = [
  { name: 'Conta Corrente', type: 'checking', initialBalance: 0, color: '#6c5ce7', icon: '🏦' },
  { name: 'Poupança', type: 'savings', initialBalance: 0, color: '#00b894', icon: '🐷' },
  { name: 'Carteira', type: 'wallet', initialBalance: 0, color: '#fdcb6e', icon: '👛' },
];

export const AccountService = {
  getAll() {
    return StorageService.getAll(COLLECTION);
  },

  getById(id) {
    return StorageService.getById(COLLECTION, id);
  },

  create(data) {
    const account = {
      id: generateId(),
      name: data.name,
      type: data.type || 'checking',
      initialBalance: parseFloat(data.initialBalance) || 0,
      color: data.color || '#6c5ce7',
      icon: data.icon || '🏦',
      createdAt: new Date().toISOString(),
    };
    StorageService.create(COLLECTION, account);
    bus.emit('accounts:change');
    return account;
  },

  update(id, data) {
    const updated = StorageService.update(COLLECTION, id, data);
    if (updated) bus.emit('accounts:change');
    return updated;
  },

  remove(id) {
    const removed = StorageService.remove(COLLECTION, id);
    if (removed) bus.emit('accounts:change');
    return removed;
  },

  getBalance(accountId) {
    const account = this.getById(accountId);
    if (!account) return 0;
    return account.initialBalance;
  },

  getTotalBalance() {
    return this.getAll().reduce((sum, acc) => sum + acc.initialBalance, 0);
  },

  initializeDefaults() {
    if (this.getAll().length === 0) {
      DEFAULT_ACCOUNTS.forEach(acc => this.create(acc));
    }
  }
};
