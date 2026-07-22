import { TransactionService } from '../services/TransactionService.js';
import { AccountService } from '../services/AccountService.js';
import { CategoryService } from '../services/CategoryService.js';
import { BudgetService } from '../services/BudgetService.js';
import { formatCurrency, formatPercent, formatShortMonth } from '../utils/formatters.js';
import { bus } from '../utils/eventBus.js';

export class DashboardView {
  #container;
  #year;
  #month;

  constructor(container, year, month) {
    this.#container = container;
    this.#year = year;
    this.#month = month;
    this.render();
    bus.on('transactions:change', () => this.render());
    bus.on('accounts:change', () => this.render());
    bus.on('budgets:change', () => this.render());
  }

  setDate(year, month) {
    this.#year = year;
    this.#month = month;
    this.render();
  }

  render() {
    const summary = TransactionService.getMonthSummary(this.#year, this.#month);
    const totalBalance = AccountService.getTotalBalance();
    const prevSummary = this.#month === 1
      ? TransactionService.getMonthSummary(this.#year - 1, 12)
      : TransactionService.getMonthSummary(this.#year, this.#month - 1);
    const incomeChange = prevSummary.income > 0
      ? ((summary.income - prevSummary.income) / prevSummary.income * 100) : 0;
    const expenseChange = prevSummary.expense > 0
      ? ((summary.expense - prevSummary.expense) / prevSummary.expense * 100) : 0;
    const recentTransactions = TransactionService.getByMonth(this.#year, this.#month).slice(0, 5);
    const categoryTotals = TransactionService.getCategoryTotals(this.#year, this.#month, 'expense');
    const budgets = BudgetService.getByMonth(this.#year, this.#month);

    this.#container.innerHTML = `
      <div class="dashboard-grid">
        ${this.#summaryCard('Saldo Total', totalBalance, 'balance', '💰', null)}
        ${this.#summaryCard('Receitas', summary.income, 'income', '📈', incomeChange)}
        ${this.#summaryCard('Despesas', summary.expense, 'expense', '📉', expenseChange)}
        ${this.#summaryCard('Economia', summary.balance, summary.balance >= 0 ? 'income' : 'expense', '🏦', null)}
      </div>
      <div class="dashboard-charts">
        <div class="card">
          <h4 class="mb-4">Receitas vs Despesas</h4>
          ${this.#barChart()}
        </div>
        <div class="card">
          <h4 class="mb-4">Despesas por Categoria</h4>
          ${this.#categoryPie(categoryTotals)}
        </div>
      </div>
      <div class="dashboard-recent">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h4>Últimas Transações</h4>
            <a href="#transactions" class="btn btn--ghost btn--sm" data-route="transactions">Ver todas</a>
          </div>
          ${this.#recentTransactions(recentTransactions)}
        </div>
      </div>
      ${budgets.length > 0 ? `<div class="mt-6"><div class="card"><h4 class="mb-4">Orçamento do Mês</h4>${this.#budgetOverview(budgets)}</div></div>` : ''}
    `;
  }

  #summaryCard(label, value, type, icon, change) {
    const cls = type === 'income' ? 'positive' : type === 'expense' ? 'negative' : 'neutral';
    let changeHtml = '';
    if (change !== null && change !== undefined) {
      const dir = change >= 0 ? 'up' : 'down';
      changeHtml = `<span class="card__change card__change--${dir}">${change >= 0 ? '↑' : '↓'} ${formatPercent(Math.abs(change))} vs mês anterior</span>`;
    }
    return `<div class="card card--summary"><div class="card__icon card__icon--${type}">${icon}</div><span class="card__label">${label}</span><span class="card__value card__value--${cls}">${formatCurrency(value)}</span>${changeHtml}</div>`;
  }

  #barChart() {
    const data = TransactionService.getMonthlyTotals(this.#year);
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const bars = data.map(d => {
      const ih = (d.income / maxVal) * 100;
      const eh = (d.expense / maxVal) * 100;
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
        <div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:100%">
          <div style="flex:1;height:${ih}%;background:var(--color-success);border-radius:3px 3px 0 0;min-height:2px" title="Receitas: ${formatCurrency(d.income)}"></div>
          <div style="flex:1;height:${eh}%;background:var(--color-danger);border-radius:3px 3px 0 0;min-height:2px" title="Despesas: ${formatCurrency(d.expense)}"></div>
        </div>
        <span style="font-size:10px;color:var(--color-text-muted)">${formatShortMonth(d.month)}</span>
      </div>`;
    }).join('');
    return `<div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding:0 4px">${bars}</div>
      <div style="display:flex;gap:16px;margin-top:16px;justify-content:center;font-size:12px;color:var(--color-text-muted)">
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-success)"></span>Receitas</span>
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-danger)"></span>Despesas</span>
      </div>`;
  }

  #categoryPie(catTotals) {
    const entries = Object.entries(catTotals)
      .map(([id, amount]) => ({ id, amount, category: CategoryService.getById(id) }))
      .filter(e => e.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const total = entries.reduce((s, e) => s + e.amount, 0);
    if (!entries.length) return '<p class="text-muted text-center" style="padding:2rem">Sem despesas neste mês</p>';

    let acc = 0;
    const gradientParts = entries.map(e => {
      const pct = (e.amount / total) * 100;
      const start = acc;
      acc += pct;
      return `${e.category.color} ${start}% ${acc}%`;
    });
    const gradient = `conic-gradient(${gradientParts.join(', ')})`;

    const legend = entries.map(e => {
      const pct = (e.amount / total) * 100;
      return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
        <span style="width:10px;height:10px;border-radius:50%;background:${e.category.color};flex-shrink:0"></span>
        <span style="flex:1;color:var(--color-text-secondary)">${e.category.icon} ${e.category.name}</span>
        <span style="color:var(--color-text-primary);font-weight:500">${formatCurrency(e.amount)}</span>
        <span style="color:var(--color-text-muted)">${pct.toFixed(0)}%</span>
      </div>`;
    }).join('');

    return `<div style="display:flex;align-items:center;gap:24px">
      <div style="width:120px;height:120px;border-radius:50%;background:${gradient};flex-shrink:0;box-shadow:0 0 20px rgba(0,0,0,0.3)"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px">${legend}</div>
    </div>`;
  }

  #recentTransactions(transactions) {
    if (!transactions.length) return '<div class="table__empty"><div class="table__empty-icon">📭</div><div class="table__empty-text">Nenhuma transação</div><div class="table__empty-subtext">Adicione sua primeira transação</div></div>';
    const rows = transactions.map(t => {
      const cat = CategoryService.getById(t.categoryId);
      const sign = t.type === 'income' ? '+' : '-';
      const cls = t.type === 'income' ? 'income' : 'expense';
      return `<tr><td>${t.date.split('-').reverse().join('/')}</td><td>${t.description}</td><td>${cat ? `<span class="category-tag"><span class="category-tag__color" style="background:${cat.color}"></span>${cat.icon} ${cat.name}</span>` : '-'}</td><td class="table__amount table__amount--${cls}">${sign} ${formatCurrency(t.amount)}</td></tr>`;
    }).join('');
    return `<div class="table-container"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  #budgetOverview(budgets) {
    const items = budgets.map(b => {
      const cat = CategoryService.getById(b.categoryId);
      if (!cat) return '';
      const spent = TransactionService.getCategoryTotals(this.#year, this.#month, 'expense')[b.categoryId] || 0;
      const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
      const barCls = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'accent';
      return `<div class="budget-card">
        <div class="budget-card__header"><span class="budget-card__name">${cat.icon} ${cat.name}</span><span style="font-size:12px;color:var(--color-text-muted)">${pct.toFixed(0)}%</span></div>
        <div class="progress"><div class="progress__bar progress__bar--${barCls}" style="width:${pct}%"></div></div>
        <div class="budget-card__amounts"><span>Gasto: ${formatCurrency(spent)}</span><span>Limite: ${formatCurrency(b.amount)}</span></div>
      </div>`;
    }).filter(Boolean).join('');
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${items}</div>`;
  }
}
