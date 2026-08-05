import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { transactionApi } from '../api/transactions';
import { accountApi } from '../api/accounts';
import { categoryApi } from '../api/categories';
import { reportApi } from '../api/reports';
import {
  formatCurrency,
  formatMonthYear,
  formatShortMonth,
  formatDate,
  getCurrentMonth,
} from '../utils/formatters';
import type {
  Account,
  BudgetRatio,
  Category,
  MonthSummary,
  Transaction,
  TransactionType,
} from '../types';

interface CurrentMonth {
  year: number;
  month: number;
}

function buildCategoryTotals(
  transactions: Transaction[],
  type: TransactionType
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== type) continue;
    totals[t.categoryId] = (totals[t.categoryId] ?? 0) + t.amount;
  }
  return totals;
}

function SummaryCard({
  label,
  value,
  type,
  icon,
}: {
  label: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  icon: string;
}) {
  const cls = type === 'income' ? 'positive' : type === 'expense' ? 'negative' : 'neutral';
  return (
    <div className="card card--summary">
      <div className={`card__icon card__icon--${type}`}>{icon}</div>
      <span className="card__label">{label}</span>
      <span className={`card__value card__value--${cls}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function MonthNav({
  current,
  onChange,
}: {
  current: CurrentMonth;
  onChange: (m: CurrentMonth) => void;
}) {
  const shift = (delta: number) => {
    const date = new Date(current.year, current.month - 1 + delta);
    onChange({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };
  return (
    <div className="header__month-selector" style={{ gap: 'var(--space-2)' }}>
      <button className="btn btn--icon" onClick={() => shift(-1)} aria-label="Mês anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <span className="header__current-month" style={{ fontSize: '13px' }}>{formatMonthYear(current.year, current.month)}</span>
      <button className="btn btn--icon" onClick={() => shift(1)} aria-label="Próximo mês">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}

function BarChart({ data }: { data: Array<MonthSummary & { month: number }> }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '0 4px' }}>
        {data.map((d) => {
          const ih = (d.income / maxVal) * 100;
          const eh = (d.expense / maxVal) * 100;
          return (
            <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
                <div className="income-bar" style={{ flex: 1, height: `${ih}%`, minHeight: 2 }} title={`Receitas: ${formatCurrency(d.income)}`} />
                <div className="expense-bar" style={{ flex: 1, height: `${eh}%`, minHeight: 2 }} title={`Despesas: ${formatCurrency(d.expense)}`} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{formatShortMonth(d.month)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-success)' }} />Receitas</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-danger)' }} />Despesas</span>
      </div>
    </>
  );
}

function CategoryPie({
  totals,
  categories,
}: {
  totals: Record<string, number>;
  categories: Category[];
}) {
  const entries = Object.entries(totals)
    .map(([id, amount]) => ({ id, amount, category: categories.find((c) => c.id === id) }))
    .filter((e) => e.category)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const total = entries.reduce((s, e) => s + e.amount, 0);
  if (!entries.length) return <p className="text-muted text-center" style={{ padding: '2rem' }}>Sem despesas neste mês</p>;

  let acc = 0;
  const gradientParts = entries.map((e) => {
    const pct = (e.amount / total) * 100;
    const start = acc;
    acc += pct;
    return `${e.category!.color} ${start}% ${acc}%`;
  });
  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ width: 120, height: 120, borderRadius: '50%', background: gradient, flexShrink: 0, boxShadow: '0 0 20px rgba(0,0,0,0.3)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((e) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.category!.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{e.category!.icon} {e.category!.name}</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatCurrency(e.amount)}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{((e.amount / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentTransactions({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  if (!transactions.length)
    return (
      <div className="table__empty">
        <div className="table__empty-icon">📭</div>
        <div className="table__empty-text">Nenhuma transação</div>
        <div className="table__empty-subtext">Adicione sua primeira transação</div>
      </div>
    );
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style={{ textAlign: 'right' }}>Valor</th></tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const cat = categories.find((c) => c.id === t.categoryId);
            const sign = t.type === 'income' ? '+' : '-';
            return (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.description}</td>
                <td>
                  {cat ? (
                    <span className="category-tag">
                      <span className="category-tag__color" style={{ background: cat.color }} />
                      {cat.icon} {cat.name}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className={`table__amount table__amount--${t.type}`} style={{ textAlign: 'right' }}>
                  {sign} {formatCurrency(t.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BudgetCard({ budget }: { budget: BudgetRatio }) {
  const pct = budget.amount > 0 ? Math.min(budget.percentage, 100) : 0;
  const barCls = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'accent';
  return (
    <div className="budget-card">
      <div className="budget-card__header">
        <span className="budget-card__name">{budget.category?.icon} {budget.category?.name}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress">
        <div className={`progress__bar progress__bar--${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="budget-card__amounts">
        <span>Gasto: {formatCurrency(budget.spent)}</span>
        <span>Limite: {formatCurrency(budget.amount)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [current, setCurrent] = useState<CurrentMonth>(getCurrentMonth());
  const { year, month } = current;

  const txState = useAsyncData<Transaction[]>(() => transactionApi.list({ year, month }), [year, month]);
  const accountsState = useAsyncData<Account[]>(() => accountApi.list(), []);
  const categoriesState = useAsyncData<Category[]>(() => categoryApi.list(), []);
  const budgetsState = useAsyncData<BudgetRatio[]>(() => reportApi.budgetRatios(year, month), [year, month]);
  const monthlyState = useAsyncData<Array<MonthSummary & { month: number }>>(
    () => reportApi.monthlyTotals(year),
    [year]
  );

  const summaries = useMemo(() => {
    if (!txState.data || !accountsState.data) return null;
    let income = 0;
    let expense = 0;
    for (const t of txState.data) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    const totalBalance = accountsState.data.reduce((s, a) => s + (a.balance ?? 0), 0);
    return { income, expense, balance: income - expense, totalBalance };
  }, [txState.data, accountsState.data]);

  if (txState.loading || categoriesState.loading || accountsState.loading) return <LoadingState />;
  if (txState.error) return <ErrorState message={txState.error} onRetry={txState.reload} />;

  const recent = (txState.data ?? []).slice(0, 5);
  const expenseTotals = buildCategoryTotals(txState.data ?? [], 'expense');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3>Visão geral de {formatMonthYear(year, month)}</h3>
        <MonthNav current={current} onChange={setCurrent} />
      </div>

      <div className="dashboard-grid">
        {summaries && (
          <>
            <SummaryCard label="Saldo Total" value={summaries.totalBalance} type="balance" icon="💰" />
            <SummaryCard label="Receitas" value={summaries.income} type="income" icon="📈" />
            <SummaryCard label="Despesas" value={summaries.expense} type="expense" icon="📉" />
            <SummaryCard label="Economia" value={summaries.balance} type={summaries.balance >= 0 ? 'income' : 'expense'} icon="🏦" />
          </>
        )}
      </div>

      <div className="dashboard-charts">
        <div className="card">
          <h4 className="mb-4">Receitas vs Despesas ({year})</h4>
          <BarChart data={monthlyState.data ?? []} />
        </div>
        <div className="card">
          <h4 className="mb-4">Despesas por Categoria</h4>
          <CategoryPie totals={expenseTotals} categories={categoriesState.data ?? []} />
        </div>
      </div>

      <div className="dashboard-recent mt-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h4>Últimas Transações</h4>
            <Link to="/transactions" className="btn btn--ghost btn--sm">Ver todas</Link>
          </div>
          <RecentTransactions transactions={recent} categories={categoriesState.data ?? []} />
        </div>
      </div>

      {(budgetsState.data?.length ?? 0) > 0 && (
        <div className="mt-6">
          <div className="card">
            <h4 className="mb-4">Orçamento do Mês</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {budgetsState.data?.map((b) => <BudgetCard key={b.id} budget={b} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}