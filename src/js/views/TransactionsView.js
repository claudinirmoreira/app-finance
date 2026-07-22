import { TransactionService } from '../services/TransactionService.js';
import { AccountService } from '../services/AccountService.js';
import { CategoryService } from '../services/CategoryService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { validateTransaction } from '../utils/validators.js';
import { bus } from '../utils/eventBus.js';

export class TransactionsView {
  #container;
  #year;
  #month;
  #filter = { search: '', type: '', categoryId: '' };

  constructor(container, year, month) {
    this.#container = container;
    this.#year = year;
    this.#month = month;
    this.render();
    bus.on('transactions:change', () => this.render());
  }

  setDate(year, month) {
    this.#year = year;
    this.#month = month;
    this.render();
  }

  render() {
    let transactions = TransactionService.getByMonth(this.#year, this.#month);

    if (this.#filter.search) {
      const q = this.#filter.search.toLowerCase();
      transactions = transactions.filter(t => t.description.toLowerCase().includes(q));
    }
    if (this.#filter.type) {
      transactions = transactions.filter(t => t.type === this.#filter.type);
    }
    if (this.#filter.categoryId) {
      transactions = transactions.filter(t => t.categoryId === this.#filter.categoryId);
    }

    const allCategories = CategoryService.getAll();

    this.#container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-bar__search">
          <svg class="filter-bar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Buscar transação..." id="tx-search" value="${this.#filter.search}">
        </div>
        <select class="form-group__select" id="tx-type-filter" style="width:auto;min-width:120px">
          <option value="">Todos os tipos</option>
          <option value="income" ${this.#filter.type === 'income' ? 'selected' : ''}>Receitas</option>
          <option value="expense" ${this.#filter.type === 'expense' ? 'selected' : ''}>Despesas</option>
        </select>
        <select class="form-group__select" id="tx-cat-filter" style="width:auto;min-width:160px">
          <option value="">Todas categorias</option>
          ${allCategories.map(c => `<option value="${c.id}" ${this.#filter.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="table-container">
        ${transactions.length ? this.#renderTable(transactions) : this.#renderEmpty()}
      </div>
    `;

    this.#bindFilters();
  }

  #renderTable(transactions) {
    const rows = transactions.map(t => {
      const cat = CategoryService.getById(t.categoryId);
      const acc = AccountService.getById(t.accountId);
      const sign = t.type === 'income' ? '+' : '-';
      const cls = t.type === 'income' ? 'income' : 'expense';
      return `<tr>
        <td>${formatDate(t.date)}</td>
        <td><span class="font-semibold">${t.description}</span>${t.notes ? `<br><span class="text-muted" style="font-size:11px">${t.notes}</span>` : ''}</td>
        <td>${cat ? `<span class="category-tag"><span class="category-tag__color" style="background:${cat.color}"></span>${cat.icon} ${cat.name}</span>` : '-'}</td>
        <td>${acc ? acc.name : '-'}</td>
        <td class="table__amount table__amount--${cls}" style="text-align:right">${sign} ${formatCurrency(t.amount)}</td>
        <td><div class="table__actions" style="justify-content:flex-end">
          <button class="btn btn--icon btn--sm" data-action="edit" data-id="${t.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn--icon btn--sm" data-action="delete" data-id="${t.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div></td>
      </tr>`;
    }).join('');

    return `<table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th style="text-align:right">Valor</th><th style="text-align:right">Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  #renderEmpty() {
    return `<div class="table__empty"><div class="table__empty-icon">📭</div><div class="table__empty-text">Nenhuma transação encontrada</div><div class="table__empty-subtext">Clique em "Nova Transação" para começar</div></div>`;
  }

  #bindFilters() {
    const searchEl = this.#container.querySelector('#tx-search');
    const typeEl = this.#container.querySelector('#tx-type-filter');
    const catEl = this.#container.querySelector('#tx-cat-filter');

    let timeout;
    searchEl?.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.#filter.search = e.target.value;
        this.render();
      }, 300);
    });

    typeEl?.addEventListener('change', (e) => {
      this.#filter.type = e.target.value;
      this.render();
    });

    catEl?.addEventListener('change', (e) => {
      this.#filter.categoryId = e.target.value;
      this.render();
    });

    this.#container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tx = TransactionService.getById(btn.dataset.id);
        if (tx) bus.emit('modal:open', { type: 'editTransaction', data: tx });
      });
    });

    this.#container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir esta transação?')) {
          TransactionService.remove(btn.dataset.id);
          bus.emit('toast:show', { message: 'Transação excluída', type: 'success' });
        }
      });
    });
  }
}

export function renderTransactionForm(data = null) {
  const isEdit = !!data;
  const accounts = AccountService.getAll();
  const categories = CategoryService.getAll();

  return `
    <form id="transaction-form" novalidate>
      <div class="form-group mb-4">
        <label class="form-group__label">Tipo</label>
        <div class="flex gap-2">
          <button type="button" class="btn btn--sm ${!data || data.type === 'expense' ? 'btn--danger' : 'btn--secondary'}" data-type-btn="expense">Despesa</button>
          <button type="button" class="btn btn--sm ${data && data.type === 'income' ? 'btn--primary' : 'btn--secondary'}" data-type-btn="income" style="background:${data?.type === 'income' ? 'var(--color-success)' : ''}">Receita</button>
        </div>
        <input type="hidden" name="type" id="tx-type-input" value="${data?.type || 'expense'}">
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label" for="tx-desc">Descrição *</label>
        <input type="text" class="form-group__input" id="tx-desc" name="description" placeholder="Ex: Supermercado" value="${data?.description || ''}" required>
      </div>
      <div class="form-row mb-4">
        <div class="form-group">
          <label class="form-group__label" for="tx-amount">Valor (R$) *</label>
          <input type="number" class="form-group__input" id="tx-amount" name="amount" step="0.01" min="0" placeholder="0,00" value="${data?.amount || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-group__label" for="tx-date">Data *</label>
          <input type="date" class="form-group__input" id="tx-date" name="date" value="${data?.date || new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>
      <div class="form-row mb-4">
        <div class="form-group">
          <label class="form-group__label" for="tx-account">Conta *</label>
          <select class="form-group__select" id="tx-account" name="accountId" required>
            <option value="">Selecione...</option>
            ${accounts.map(a => `<option value="${a.id}" ${data?.accountId === a.id ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-group__label" for="tx-category">Categoria *</label>
          <select class="form-group__select" id="tx-category" name="categoryId" required>
            <option value="">Selecione...</option>
            ${categories.map(c => `<option value="${c.id}" data-type="${c.type}" ${data?.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label" for="tx-notes">Observações</label>
        <input type="text" class="form-group__input" id="tx-notes" name="notes" placeholder="Opcional" value="${data?.notes || ''}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn--secondary" id="form-cancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">${isEdit ? 'Salvar Alterações' : 'Adicionar'}</button>
      </div>
    </form>
  `;
}

export function initTransactionForm(data = null) {
  const form = document.getElementById('transaction-form');
  const typeBtns = form.querySelectorAll('[data-type-btn]');
  const typeInput = form.getElementById('tx-type-input');
  const catSelect = form.getElementById('tx-category');

  function filterCategories(type) {
    catSelect.querySelectorAll('option[data-type]').forEach(opt => {
      opt.style.display = opt.dataset.type === type ? '' : 'none';
    });
    if (catSelect.selectedOptions[0]?.dataset.type !== type) {
      catSelect.value = '';
    }
  }

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.typeBtn;
      typeInput.value = type;
      typeBtns.forEach(b => {
        b.className = `btn btn--sm ${b.dataset.typeBtn === type ? (type === 'income' ? 'btn--primary' : 'btn--danger') : 'btn--secondary'}`;
        if (b.dataset.typeBtn === 'income' && type === 'income') b.style.background = 'var(--color-success)';
        else b.style.background = '';
      });
      filterCategories(type);
    });
  });

  filterCategories(typeInput.value);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const obj = Object.fromEntries(formData.entries());
    const { valid, errors } = validateTransaction(obj);
    if (!valid) {
      const firstError = Object.values(errors)[0];
      bus.emit('toast:show', { message: firstError, type: 'error' });
      return;
    }
    if (data) {
      TransactionService.update(data.id, obj);
      bus.emit('toast:show', { message: 'Transação atualizada!', type: 'success' });
    } else {
      TransactionService.create(obj);
      bus.emit('toast:show', { message: 'Transação adicionada!', type: 'success' });
    }
    bus.emit('modal:close');
  });

  document.getElementById('form-cancel')?.addEventListener('click', () => bus.emit('modal:close'));
}
