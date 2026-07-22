export class EventBus {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this.#listeners.get(event);
    if (listeners) listeners.delete(callback);
  }

  emit(event, data) {
    const listeners = this.#listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }
}

export const bus = new EventBus();
