const STORAGE_PREFIX = 'fp_';

export const StorageService = {
  getAll(collection) {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + collection);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAll(collection, data) {
    localStorage.setItem(STORAGE_PREFIX + collection, JSON.stringify(data));
  },

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id) || null;
  },

  create(collection, item) {
    const items = this.getAll(collection);
    items.push(item);
    this.saveAll(collection, items);
    return item;
  },

  update(collection, id, updates) {
    const items = this.getAll(collection);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveAll(collection, items);
    return items[index];
  },

  remove(collection, id) {
    const items = this.getAll(collection);
    const filtered = items.filter(item => item.id !== id);
    this.saveAll(collection, filtered);
    return filtered.length < items.length;
  },

  clear(collection) {
    localStorage.removeItem(STORAGE_PREFIX + collection);
  },

  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX)) {
        data[key.replace(STORAGE_PREFIX, '')] = JSON.parse(localStorage.getItem(key));
      }
    }
    return data;
  },

  importAll(data) {
    Object.entries(data).forEach(([collection, items]) => {
      this.saveAll(collection, items);
    });
  }
};
