import { BudgetService } from '../services/BudgetService.js';
import { CategoryService } from '../services/CategoryService.js';
import { TransactionService } from '../services/TransactionService.js';
import { formatCurrency, formatPercent } from '../utils/formatters.js';
import { validateBudget } from '../utils/validators.js';
import { bus } from '../utils/eventBus.js';

export class BudgetsView {
  #container;
  #year;
  #month;

  constructor(container, year, month) {
    this.#container = container;
    this.#year = year;
    this.#month = month;
    this.render();
    bus.on('budgets:change', () => this.render());
    bus.on('transactions:change', () => this.render());
  }

  setDate(year, month) {
    this.#year = year;
    this.#month = month;
    this.render();
  }

  render() {
    const budgets = BudgetService.getByMonth(this.#year, this.#month);
    const catTotals = TransactionService.getCategoryTotals(this.#year, this.#month, 'expense');

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + (catTotals[b.categoryId] || 0), 0);

    const cardsHtml = budgets.map(b => {
      const cat = CategoryService.getById(b.categoryId);
      if (!cat) return '';
      const spent = catTotals[b.categoryId] || 0;
      const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
      const barCls = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'accent';
      const remaining = b.amount - spent;

      return `<div class="card">
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center gap-3">
            <span style="font-size:1.3rem">${cat.icon}</span>
            <span class="font-semibold">${cat.name}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn--icon btn--sm" data-action="edit" data-id="${b.id}" data-cat-id="${b.categoryId}" data-amount="${b.amount}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn--icon btn--sm" data-action="delete" data-id="${b.id}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="progress mb-2"><div class="progress__bar progress__bar--${barCls}" style="width:${pct}%"></div></div>
        <div class="flex justify-between" style="font-size:12px;color:var(--color-text-muted)">
          <span>Gasto: ${formatCurrency(spent)}</span>
          <span>Limite: ${formatCurrency(b.amount)}</span>
        </div>
        <div class="flex justify-between mt-2" style="font-size:12px">
          <span style="color:${remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
            ${remaining >= 0 ? `Restam ${formatCurrency(remaining)}` : `Estourou ${formatCurrency(Math.abs(remaining))}`}
          </span>
          <span style="color:var(--color-text-muted)">${formatPercent(pct)}</span>
        </div>
      </div>`;
    }).filter(Boolean).join('');

    this.#container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-4" style="font-size:13px;color:var(--color-text-muted)">
            <span>Orçado: <strong style="color:var(--color-text-primary)">${formatCurrency(totalBudget)}</strong></span>
            <span>Gasto: <strong style="color:${totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--color-text-primary)'}">${formatCurrency(totalSpent)}</strong></span>
            <span>Disponível: <strong style="color:${totalBudget - totalSpent >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatCurrency(totalBudget - totalSpent)}</strong></span>
          </div>
        </div>
        <button class="btn btn--primary" id="add-budget-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
          Novo Orçamento
        </button>
      </div>
      ${cardsHtml ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">${cardsHtml}</div>` : '<div class="table__empty"><div class="table__empty-icon">📊</div><div class="table__empty-text">Nenhum orçamento definido</div><div class="table__empty-subtext">Defina limites mensais por categoria</div></div>'}
    `;

    this.#container.querySelector('#add-budget-btn')?.addEventListener('click', () => {
      bus.emit('modal:open', { type: 'budget', data: null });
    });

    this.#container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        bus.emit('modal:open', { type: 'budget', data: { id: btn.dataset.id, categoryId: btn.dataset.catId, amount: btn.dataset.amount } });
      });
    });

    this.#container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este orçamento?')) {
          BudgetService.remove(btn.dataset.id);
          bus.emit('toast:show', { message: 'Orçamento excluído', type: 'success' });
        }
      });
    });
  }
}

export function renderBudgetForm(data = null) {
  const isEdit = !!data && !!data.id;
  const categories = CategoryService.getByType('expense');
  const now = new Date();

  return `
    <form id="budget-form" novalidate>
      <div class="form-group mb-4">
        <label class="form-group__label" for="budget-category">Categoria *</label>
        <select class="form-group__select" id="budget-category" name="categoryId" ${isEdit ? 'disabled' : ''} required>
          <option value="">Selecione...</option>
          ${categories.map(c => `<option value="${c.id}" ${data?.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row mb-4">
        <div class="form-group">
          <label class="form-group__label" for="budget-amount">Limite Mensal (R$) *</label>
          <input type="number" class="form-group__input" id="budget-amount" name="amount" step="0.01" min="0" placeholder="0,00" value="${data?.amount || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-group__label">Mês/Ano</label>
          <input type="text" class="form-group__input" value="${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}" disabled style="opacity:0.6">
        </div>
      </div>
      <input type="hidden" name="month" value="${now.getMonth() + 1}">
      <input type="hidden" name="year" value="${now.getFullYear()}">
      <div class="form-actions">
        <button type="button" class="btn btn--secondary" id="form-cancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  `;
}

export function initBudgetForm(data = null) {
  const form = document.getElementById('budget-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const obj = Object.fromEntries(formData.entries());
    const { valid, errors } = validateBudget(obj);
    if (!valid) {
      bus.emit('toast:show', { message: Object.values(errors)[0], type: 'error' });
      return;
    }
    if (data && data.id) {
      BudgetService.update(data.id, { amount: obj.amount });
      bus.emit('toast:show', { message: 'Orçamento atualizado!', type: 'success' });
    } else {
      BudgetService.create(obj);
      bus.emit('toast:show', { message: 'Orçamento criado!', type: 'success' });
    }
    bus.emit('modal:close');
  });

  document.getElementById('form-cancel')?.addEventListener('click', () => bus.emit('modal:close'));
}
