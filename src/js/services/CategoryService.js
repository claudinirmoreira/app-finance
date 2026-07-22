import { StorageService } from './StorageService.js';
import { generateId } from '../utils/idGenerator.js';
import { bus } from '../utils/eventBus.js';

const COLLECTION = 'categories';

const DEFAULT_CATEGORIES = [
  { name: 'Salário', type: 'income', color: '#00b894', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#55efc4', icon: '💻' },
  { name: 'Investimentos', type: 'income', color: '#74b9ff', icon: '📈' },
  { name: 'Outros Recebimentos', type: 'income', color: '#a29bfe', icon: '📥' },
  { name: 'Alimentação', type: 'expense', color: '#e17055', icon: '🍔' },
  { name: 'Moradia', type: 'expense', color: '#d63031', icon: '🏠' },
  { name: 'Transporte', type: 'expense', color: '#fdcb6e', icon: '🚗' },
  { name: 'Saúde', type: 'expense', color: '#ff7675', icon: '🏥' },
  { name: 'Educação', type: 'expense', color: '#a29bfe', icon: '📚' },
  { name: 'Lazer', type: 'expense', color: '#6c5ce7', icon: '🎮' },
  { name: 'Vestuário', type: 'expense', color: '#fd79a8', icon: '👕' },
  { name: 'Contas Fixas', type: 'expense', color: '#636e72', icon: '📄' },
  { name: 'Outros Gastos', type: 'expense', color: '#b2bec3', icon: '📦' },
];

export const CategoryService = {
  getAll() {
    return StorageService.getAll(COLLECTION);
  },

  getById(id) {
    return StorageService.getById(COLLECTION, id);
  },

  getByType(type) {
    return this.getAll().filter(c => c.type === type);
  },

  create(data) {
    const category = {
      id: generateId(),
      name: data.name,
      type: data.type,
      color: data.color || '#636e72',
      icon: data.icon || '📁',
      createdAt: new Date().toISOString(),
    };
    StorageService.create(COLLECTION, category);
    bus.emit('categories:change');
    return category;
  },

  update(id, data) {
    const updated = StorageService.update(COLLECTION, id, data);
    if (updated) bus.emit('categories:change');
    return updated;
  },

  remove(id) {
    const removed = StorageService.remove(COLLECTION, id);
    if (removed) bus.emit('categories:change');
    return removed;
  },

  initializeDefaults() {
    if (this.getAll().length === 0) {
      DEFAULT_CATEGORIES.forEach(cat => this.create(cat));
    }
  }
};
