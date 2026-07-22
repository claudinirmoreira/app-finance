import { CategoryService } from '../services/CategoryService.js';
import { TransactionService } from '../services/TransactionService.js';
import { validateCategory } from '../utils/validators.js';
import { bus } from '../utils/eventBus.js';

export class CategoriesView {
  #container;
  #activeTab = 'expense';

  constructor(container) {
    this.#container = container;
    this.render();
    bus.on('categories:change', () => this.render());
  }

  render() {
    const categories = CategoryService.getByType(this.#activeTab);

    const categoriesHtml = categories.map(c => {
      const txCount = TransactionService.getByCategory(c.id).length;
      return `<div class="card" style="border-left:3px solid ${c.color}">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span style="font-size:1.5rem">${c.icon}</span>
            <div>
              <div class="font-semibold">${c.name}</div>
              <div style="font-size:11px;color:var(--color-text-muted)">${txCount} transação(ões)</div>
            </div>
          </div>
          <div class="flex gap-1">
            <button class="btn btn--icon btn--sm" data-action="edit" data-id="${c.id}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn--icon btn--sm" data-action="delete" data-id="${c.id}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    this.#container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div class="tabs" id="cat-tabs">
          <button class="tab ${this.#activeTab === 'expense' ? 'tab--active' : ''}" data-tab="expense">Despesas</button>
          <button class="tab ${this.#activeTab === 'income' ? 'tab--active' : ''}" data-tab="income">Receitas</button>
        </div>
        <button class="btn btn--primary" id="add-category-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
          Nova Categoria
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${categoriesHtml || '<div class="table__empty"><div class="table__empty-icon">📁</div><div class="table__empty-text">Nenhuma categoria</div></div>'}
      </div>
    `;

    this.#container.querySelector('#cat-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        this.#activeTab = tab.dataset.tab;
        this.render();
      }
    });

    this.#container.querySelector('#add-category-btn')?.addEventListener('click', () => {
      bus.emit('modal:open', { type: 'category', data: { type: this.#activeTab } });
    });

    this.#container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = CategoryService.getById(btn.dataset.id);
        if (cat) bus.emit('modal:open', { type: 'category', data: cat });
      });
    });

    this.#container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const txns = TransactionService.getByCategory(btn.dataset.id);
        if (txns.length > 0) {
          bus.emit('toast:show', { message: 'Não é possível excluir: existem transações vinculadas', type: 'error' });
          return;
        }
        if (confirm('Excluir esta categoria?')) {
          CategoryService.remove(btn.dataset.id);
          bus.emit('toast:show', { message: 'Categoria excluída', type: 'success' });
        }
      });
    });
  }
}

export function renderCategoryForm(data = null) {
  const isEdit = !!data && !!data.id;
  const icons = ['💰', '💻', '📈', '📥', '🍔', '🏠', '🚗', '🏥', '📚', '🎮', '👕', '📄', '📦', '✈️', '🎬', '🏋️', '🐕', '🎵', '🛒', '💊'];
  const colors = ['#00b894', '#55efc4', '#74b9ff', '#a29bfe', '#e17055', '#d63031', '#fdcb6e', '#ff7675', '#6c5ce7', '#fd79a8', '#636e72', '#b2bec3'];

  return `
    <form id="category-form" novalidate>
      <div class="form-group mb-4">
        <label class="form-group__label">Tipo</label>
        <div class="flex gap-2">
          <button type="button" class="btn btn--sm ${(data?.type || 'expense') === 'expense' ? 'btn--danger' : 'btn--secondary'}" data-ctype-btn="expense">Despesa</button>
          <button type="button" class="btn btn--sm ${data?.type === 'income' ? 'btn--primary' : 'btn--secondary'}" data-ctype-btn="income" style="${data?.type === 'income' ? 'background:var(--color-success)' : ''}">Receita</button>
        </div>
        <input type="hidden" name="type" id="cat-type-input" value="${data?.type || 'expense'}">
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label" for="cat-name">Nome *</label>
        <input type="text" class="form-group__input" id="cat-name" name="name" placeholder="Ex: Alimentação" value="${data?.name || ''}" required>
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label">Ícone</label>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${icons.map(i => `<button type="button" class="btn btn--sm" style="font-size:1rem;width:36px;height:36px;${data?.icon === i ? 'background:var(--color-accent-light);border:2px solid var(--color-accent)' : 'background:var(--color-bg-tertiary)'}" data-cat-icon="${i}">${i}</button>`).join('')}
        </div>
        <input type="hidden" name="icon" id="cat-icon-input" value="${data?.icon || '📁'}">
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label">Cor</label>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${colors.map(c => `<button type="button" style="width:28px;height:28px;border-radius:50%;background:${c};border:3px solid ${data?.color === c ? 'white' : 'transparent'};cursor:pointer" data-cat-color="${c}"></button>`).join('')}
        </div>
        <input type="hidden" name="color" id="cat-color-input" value="${data?.color || '#636e72'}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn--secondary" id="form-cancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  `;
}

export function initCategoryForm(data = null) {
  const form = document.getElementById('category-form');
  const iconInput = form.querySelector('#cat-icon-input');
  const colorInput = form.querySelector('#cat-color-input');
  const typeInput = form.querySelector('#cat-type-input');

  form.querySelectorAll('[data-ctype-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      typeInput.value = btn.dataset.ctypeBtn;
      const type = btn.dataset.ctypeBtn;
      form.querySelectorAll('[data-ctype-btn]').forEach(b => {
        b.className = `btn btn--sm ${b.dataset.ctypeBtn === type ? (type === 'income' ? 'btn--primary' : 'btn--danger') : 'btn--secondary'}`;
        if (b.dataset.ctypeBtn === 'income' && type === 'income') b.style.background = 'var(--color-success)';
        else b.style.background = '';
      });
    });
  });

  form.querySelectorAll('[data-cat-icon]').forEach(btn => {
    btn.addEventListener('click', () => {
      iconInput.value = btn.dataset.catIcon;
      form.querySelectorAll('[data-cat-icon]').forEach(b => { b.style.background = 'var(--color-bg-tertiary)'; b.style.border = '2px solid transparent'; });
      btn.style.background = 'var(--color-accent-light)';
      btn.style.border = '2px solid var(--color-accent)';
    });
  });

  form.querySelectorAll('[data-cat-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      colorInput.value = btn.dataset.catColor;
      form.querySelectorAll('[data-cat-color]').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'white';
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const obj = Object.fromEntries(formData.entries());
    const { valid, errors } = validateCategory(obj);
    if (!valid) {
      bus.emit('toast:show', { message: Object.values(errors)[0], type: 'error' });
      return;
    }
    if (data && data.id) {
      CategoryService.update(data.id, obj);
      bus.emit('toast:show', { message: 'Categoria atualizada!', type: 'success' });
    } else {
      CategoryService.create(obj);
      bus.emit('toast:show', { message: 'Categoria criada!', type: 'success' });
    }
    bus.emit('modal:close');
  });

  document.getElementById('form-cancel')?.addEventListener('click', () => bus.emit('modal:close'));
}
