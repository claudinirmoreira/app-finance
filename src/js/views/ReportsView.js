import { TransactionService } from '../services/TransactionService.js';
import { CategoryService } from '../services/CategoryService.js';
import { AccountService } from '../services/AccountService.js';
import { BudgetService } from '../services/BudgetService.js';
import { formatCurrency, formatPercent, formatShortMonth } from '../utils/formatters.js';
import { bus } from '../utils/eventBus.js';

export class ReportsView {
  #container;
  #year;
  #month;

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
    const summary = TransactionService.getMonthSummary(this.#year, this.#month);
    const prevSummary = this.#month === 1
      ? TransactionService.getMonthSummary(this.#year - 1, 12)
      : TransactionService.getMonthSummary(this.#year, this.#month - 1);

    const incomeByCategory = TransactionService.getCategoryTotals(this.#year, this.#month, 'income');
    const expenseByCategory = TransactionService.getCategoryTotals(this.#year, this.#month, 'expense');
    const dailyData = TransactionService.getDailyTotals(this.#year, this.#month);
    const monthlyData = TransactionService.getMonthlyTotals(this.#year);
    const accounts = AccountService.getAll();

    this.#container.innerHTML = `
      <div class="dashboard-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="card card--summary">
          <span class="card__label">Total Receitas</span>
          <span class="card__value card__value--positive">${formatCurrency(summary.income)}</span>
          <span style="font-size:12px;color:var(--color-text-muted)">${summary.count} transações</span>
        </div>
        <div class="card card--summary">
          <span class="card__label">Total Despesas</span>
          <span class="card__value card__value--negative">${formatCurrency(summary.expense)}</span>
          <span style="font-size:12px;color:var(--color-text-muted)">${summary.count} transações</span>
        </div>
        <div class="card card--summary">
          <span class="card__label">Taxa de Economia</span>
          <span class="card__value card__value--${summary.income > 0 ? (summary.balance >= 0 ? 'positive' : 'negative') : 'neutral'}">${summary.income > 0 ? formatPercent((summary.balance / summary.income) * 100) : '0%'}</span>
          <span style="font-size:12px;color:var(--color-text-muted)">do total de receitas</span>
        </div>
      </div>

      <div class="dashboard-charts mt-6">
        <div class="card">
          <h4 class="mb-4">Fluxo Diário do Mês</h4>
          ${this.#dailyChart(dailyData)}
        </div>
        <div class="card">
          <h4 class="mb-4">Evolução Anual</h4>
          ${this.#yearlyChart(monthlyData)}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
        <div class="card">
          <h4 class="mb-4">Receitas por Categoria</h4>
          ${this.#categoryList(incomeByCategory, 'income')}
        </div>
        <div class="card">
          <h4 class="mb-4">Despesas por Categoria</h4>
          ${this.#categoryList(expenseByCategory, 'expense')}
        </div>
      </div>

      <div class="card mt-6">
        <h4 class="mb-4">Saldo por Conta</h4>
        ${this.#accountBalances(accounts)}
      </div>
    `;
  }

  #dailyChart(dailyData) {
    const entries = Object.entries(dailyData);
    if (!entries.length) return '<p class="text-muted text-center" style="padding:2rem">Sem dados</p>';

    const maxVal = Math.max(...entries.map(([, d]) => Math.max(d.income, d.expense)), 1);
    const bars = entries.slice(0, 31).map(([date, d]) => {
      const ih = (d.income / maxVal) * 100;
      const eh = (d.expense / maxVal) * 100;
      const day = date.split('-')[2];
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end">
        <div style="width:100%;display:flex;gap:1px;align-items:flex-end;height:100%">
          <div style="flex:1;height:${Math.max(ih, 1)}%;background:var(--color-success);border-radius:2px 2px 0 0;opacity:0.8" title="${date}: +${formatCurrency(d.income)}"></div>
          <div style="flex:1;height:${Math.max(eh, 1)}%;background:var(--color-danger);border-radius:2px 2px 0 0;opacity:0.8" title="${date}: -${formatCurrency(d.expense)}"></div>
        </div>
        ${parseInt(day) % 5 === 1 || parseInt(day) === 1 ? `<span style="font-size:9px;color:var(--color-text-muted)">${day}</span>` : '<span></span>'}
      </div>`;
    }).join('');

    return `<div style="display:flex;align-items:flex-end;gap:2px;height:140px">${bars}</div>
      <div style="display:flex;gap:16px;margin-top:12px;justify-content:center;font-size:11px;color:var(--color-text-muted)">
        <span style="display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:2px;background:var(--color-success)"></span>Receitas</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:2px;background:var(--color-danger)"></span>Despesas</span>
      </div>`;
  }

  #yearlyChart(monthlyData) {
    const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);
    const rows = monthlyData.map(d => {
      const ih = (d.income / maxVal) * 100;
      const eh = (d.expense / maxVal) * 100;
      const isCurrent = d.month === this.#month;
      return `<div style="display:flex;align-items:center;gap:8px;${isCurrent ? 'opacity:1' : 'opacity:0.6'}">
        <span style="width:28px;font-size:11px;color:var(--color-text-muted);text-align:right">${formatShortMonth(d.month)}</span>
        <div style="flex:1;height:16px;display:flex;gap:2px">
          <div style="width:${ih}%;background:var(--color-success);border-radius:3px;min-width:${d.income > 0 ? 2 : 0}px" title="Receita: ${formatCurrency(d.income)}"></div>
          <div style="width:${eh}%;background:var(--color-danger);border-radius:3px;min-width:${d.expense > 0 ? 2 : 0}px" title="Despesa: ${formatCurrency(d.expense)}"></div>
        </div>
        <span style="font-size:11px;color:${d.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};min-width:80px;text-align:right">${formatCurrency(d.balance)}</span>
      </div>`;
    }).join('');
    return `<div style="display:flex;flex-direction:column;gap:6px">${rows}</div>`;
  }

  #categoryList(catTotals, type) {
    const entries = Object.entries(catTotals)
      .map(([id, amount]) => ({ id, amount, category: CategoryService.getById(id) }))
      .filter(e => e.category)
      .sort((a, b) => b.amount - a.amount);

    const total = entries.reduce((s, e) => s + e.amount, 0);
    if (!entries.length) return '<p class="text-muted text-center" style="padding:1.5rem">Sem dados</p>';

    const color = type === 'income' ? 'var(--color-success)' : 'var(--color-danger)';
    const rows = entries.map(e => {
      const pct = total > 0 ? (e.amount / total) * 100 : 0;
      return `<div style="margin-bottom:12px">
        <div class="flex justify-between items-center" style="margin-bottom:4px">
          <span style="font-size:13px">${e.category.icon} ${e.category.name}</span>
          <span style="font-size:13px;font-weight:600">${formatCurrency(e.amount)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress" style="flex:1"><div class="progress__bar" style="width:${pct}%;background:${e.category.color}"></div></div>
          <span style="font-size:11px;color:var(--color-text-muted);min-width:36px;text-align:right">${pct.toFixed(0)}%</span>
        </div>
      </div>`;
    }).join('');

    return `<div>${rows}</div>`;
  }

  #accountBalances(accounts) {
    if (!accounts.length) return '<p class="text-muted text-center">Nenhuma conta</p>';
    const rows = accounts.map(a => {
      const txns = TransactionService.getByAccount(a.id);
      const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const balance = a.initialBalance + inc - exp;
      return `<div class="flex justify-between items-center" style="padding:12px 0;border-bottom:1px solid var(--color-surface-border)">
        <div class="flex items-center gap-3">
          <span style="font-size:1.3rem">${a.icon}</span>
          <div>
            <div style="font-weight:500">${a.name}</div>
            <div style="font-size:11px;color:var(--color-text-muted)">Inicial: ${formatCurrency(a.initialBalance)}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;color:${balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatCurrency(balance)}</div>
          <div style="font-size:11px;color:var(--color-text-muted)">+${formatCurrency(inc)} / -${formatCurrency(exp)}</div>
        </div>
      </div>`;
    }).join('');

    return `<div>${rows}</div>`;
  }
}
