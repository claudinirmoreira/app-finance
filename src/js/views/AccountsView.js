import { AccountService } from '../services/AccountService.js';
import { TransactionService } from '../services/TransactionService.js';
import { formatCurrency } from '../utils/formatters.js';
import { validateAccount } from '../utils/validators.js';
import { bus } from '../utils/eventBus.js';

export class AccountsView {
  #container;

  constructor(container) {
    this.#container = container;
    this.render();
    bus.on('accounts:change', () => this.render());
    bus.on('transactions:change', () => this.render());
  }

  render() {
    const accounts = AccountService.getAll();
    const totalBalance = accounts.reduce((sum, a) => {
      const txns = TransactionService.getByAccount(a.id);
      const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return sum + a.initialBalance + inc - exp;
    }, 0);

    const accountsHtml = accounts.map(a => {
      const txns = TransactionService.getByAccount(a.id);
      const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const current = a.initialBalance + inc - exp;
      const typeLabels = { checking: 'Conta Corrente', savings: 'Poupança', wallet: 'Carteira', credit: 'Cartão de Crédito', investment: 'Investimento' };

      return `<div class="card" style="border-left:3px solid ${a.color}">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <span style="font-size:1.5rem">${a.icon}</span>
            <div>
              <div class="font-semibold">${a.name}</div>
              <div style="font-size:11px;color:var(--color-text-muted)">${typeLabels[a.type] || a.type}</div>
            </div>
          </div>
          <div class="flex gap-1">
            <button class="btn btn--icon btn--sm" data-action="edit" data-id="${a.id}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn--icon btn--sm" data-action="delete" data-id="${a.id}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em">Saldo Inicial</div>
            <div style="font-size:14px;font-weight:500;margin-top:2px">${formatCurrency(a.initialBalance)}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em">Saldo Atual</div>
            <div style="font-size:16px;font-weight:700;margin-top:2px;color:${current >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatCurrency(current)}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    this.#container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div>
          <div style="font-size:13px;color:var(--color-text-muted)">Saldo Total</div>
          <div style="font-size:28px;font-weight:700;color:${totalBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatCurrency(totalBalance)}</div>
        </div>
        <button class="btn btn--primary" id="add-account-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
          Nova Conta
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
        ${accountsHtml || '<div class="table__empty"><div class="table__empty-icon">🏦</div><div class="table__empty-text">Nenhuma conta cadastrada</div></div>'}
      </div>
    `;

    this.#container.querySelector('#add-account-btn')?.addEventListener('click', () => {
      bus.emit('modal:open', { type: 'account', data: null });
    });

    this.#container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const account = AccountService.getById(btn.dataset.id);
        if (account) bus.emit('modal:open', { type: 'account', data: account });
      });
    });

    this.#container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir esta conta? Transações vinculadas não serão removidas.')) {
          AccountService.remove(btn.dataset.id);
          bus.emit('toast:show', { message: 'Conta excluída', type: 'success' });
        }
      });
    });
  }
}

export function renderAccountForm(data = null) {
  const isEdit = !!data;
  const icons = ['🏦', '🐷', '👛', '💳', '📈', '💵', '🪙', '💎'];
  const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#fd79a8', '#636e72', '#a29bfe'];

  return `
    <form id="account-form" novalidate>
      <div class="form-group mb-4">
        <label class="form-group__label">Ícone</label>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${icons.map(i => `<button type="button" class="btn btn--sm" style="font-size:1.2rem;width:40px;height:40px;${data?.icon === i || (!data && i === '🏦') ? 'background:var(--color-accent-light);border:2px solid var(--color-accent)' : 'background:var(--color-bg-tertiary)'}" data-icon-btn="${i}">${i}</button>`).join('')}
        </div>
        <input type="hidden" name="icon" id="acc-icon-input" value="${data?.icon || '🏦'}">
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label" for="acc-name">Nome *</label>
        <input type="text" class="form-group__input" id="acc-name" name="name" placeholder="Ex: Nubank" value="${data?.name || ''}" required>
      </div>
      <div class="form-row mb-4">
        <div class="form-group">
          <label class="form-group__label" for="acc-type">Tipo</label>
          <select class="form-group__select" id="acc-type" name="type">
            <option value="checking" ${data?.type === 'checking' ? 'selected' : ''}>Conta Corrente</option>
            <option value="savings" ${data?.type === 'savings' ? 'selected' : ''}>Poupança</option>
            <option value="wallet" ${data?.type === 'wallet' ? 'selected' : ''}>Carteira</option>
            <option value="credit" ${data?.type === 'credit' ? 'selected' : ''}>Cartão de Crédito</option>
            <option value="investment" ${data?.type === 'investment' ? 'selected' : ''}>Investimento</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-group__label" for="acc-balance">Saldo Inicial (R$)</label>
          <input type="number" class="form-group__input" id="acc-balance" name="initialBalance" step="0.01" placeholder="0,00" value="${data?.initialBalance ?? 0}">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-group__label">Cor</label>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${colors.map(c => `<button type="button" style="width:32px;height:32px;border-radius:50%;background:${c};border:3px solid ${data?.color === c || (!data && c === '#6c5ce7') ? 'white' : 'transparent'};cursor:pointer" data-color-btn="${c}"></button>`).join('')}
        </div>
        <input type="hidden" name="color" id="acc-color-input" value="${data?.color || '#6c5ce7'}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn--secondary" id="form-cancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">${isEdit ? 'Salvar' : 'Criar Conta'}</button>
      </div>
    </form>
  `;
}

export function initAccountForm(data = null) {
  const form = document.getElementById('account-form');
  const iconInput = form.querySelector('#acc-icon-input');
  const colorInput = form.querySelector('#acc-color-input');

  form.querySelectorAll('[data-icon-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      iconInput.value = btn.dataset.iconBtn;
      form.querySelectorAll('[data-icon-btn]').forEach(b => {
        b.style.background = 'var(--color-bg-tertiary)';
        b.style.border = '2px solid transparent';
      });
      btn.style.background = 'var(--color-accent-light)';
      btn.style.border = '2px solid var(--color-accent)';
    });
  });

  form.querySelectorAll('[data-color-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      colorInput.value = btn.dataset.colorBtn;
      form.querySelectorAll('[data-color-btn]').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'white';
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const obj = Object.fromEntries(formData.entries());
    obj.initialBalance = parseFloat(obj.initialBalance) || 0;
    const { valid, errors } = validateAccount(obj);
    if (!valid) {
      bus.emit('toast:show', { message: Object.values(errors)[0], type: 'error' });
      return;
    }
    if (data) {
      AccountService.update(data.id, obj);
      bus.emit('toast:show', { message: 'Conta atualizada!', type: 'success' });
    } else {
      AccountService.create(obj);
      bus.emit('toast:show', { message: 'Conta criada!', type: 'success' });
    }
    bus.emit('modal:close');
  });

  document.getElementById('form-cancel')?.addEventListener('click', () => bus.emit('modal:close'));
}
