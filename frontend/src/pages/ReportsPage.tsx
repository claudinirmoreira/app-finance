import { useMemo, useState } from 'react';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { reportApi, type AccountBalanceRow, type DailyTotals } from '../api/reports';
import { categoryApi } from '../api/categories';
import { formatCurrency, formatPercent, formatShortMonth, getCurrentMonth, formatMonthYear } from '../utils/formatters';
import type { Category, MonthSummary } from '../types';

function MonthNav({
  month,
  setMonth,
}: {
  month: ReturnType<typeof getCurrentMonth>;
  setMonth: (m: ReturnType<typeof getCurrentMonth>) => void;
}) {
  const shift = (delta: number) => {
    const date = new Date(month.year, month.month - 1 + delta);
    setMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };
  return (
    <div className="header__month-selector" style={{ gap: 'var(--space-2)' }}>
      <button className="btn btn--icon" onClick={() => shift(-1)} aria-label="Mês anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <span className="header__current-month" style={{ fontSize: 13 }}>{formatMonthYear(month.year, month.month)}</span>
      <button className="btn btn--icon" onClick={() => shift(1)} aria-label="Próximo mês">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { year, month: m } = month;

  const summaryState = useAsyncData<MonthSummary>(() => reportApi.summary(year, m), [year, m]);
  const incomeCat = useAsyncData<Record<string, number>>(() => reportApi.categoryTotals(year, m, 'income'), [year, m]);
  const expenseCat = useAsyncData<Record<string, number>>(() => reportApi.categoryTotals(year, m, 'expense'), [year, m]);
  const dailyState = useAsyncData<DailyTotals>(() => reportApi.daily(year, m), [year, m]);
  const monthlyState = useAsyncData<Array<MonthSummary & { month: number }>>(() => reportApi.monthlyTotals(year), [year]);
  const balancesState = useAsyncData<AccountBalanceRow[]>(() => reportApi.accountBalances(), []);
  const categoriesState = useAsyncData<Category[]>(() => categoryApi.list(), []);

  const loading = summaryState.loading || incomeCat.loading || expenseCat.loading || dailyState.loading || monthlyState.loading || balancesState.loading || categoriesState.loading;
  const error = summaryState.error;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={summaryState.reload} />;

  const summary = summaryState.data!;
  const savingsRate = summary.income > 0 ? (summary.balance / summary.income) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3>Relatórios</h3>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card card--summary">
          <span className="card__label">Total Receitas</span>
          <span className="card__value card__value--positive">{formatCurrency(summary.income)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{summary.count} transações</span>
        </div>
        <div className="card card--summary">
          <span className="card__label">Total Despesas</span>
          <span className="card__value card__value--negative">{formatCurrency(summary.expense)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{summary.count} transações</span>
        </div>
        <div className="card card--summary">
          <span className="card__label">Taxa de Economia</span>
          <span className={`card__value card__value--${summary.income > 0 ? (summary.balance >= 0 ? 'positive' : 'negative') : 'neutral'}`}>
            {summary.income > 0 ? formatPercent(savingsRate) : '0%'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>do total de receitas</span>
        </div>
      </div>

      <div className="dashboard-charts mt-6">
        <div className="card">
          <h4 className="mb-4">Fluxo Diário do Mês</h4>
          <DailyChart data={dailyState.data ?? {}} />
        </div>
        <div className="card">
          <h4 className="mb-4">Evolução Anual</h4>
          <YearlyChart data={monthlyState.data ?? []} currentMonth={m} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <h4 className="mb-4">Receitas por Categoria</h4>
          <CategoryList totals={incomeCat.data ?? {}} categories={categoriesState.data ?? []} />
        </div>
        <div className="card">
          <h4 className="mb-4">Despesas por Categoria</h4>
          <CategoryList totals={expenseCat.data ?? {}} categories={categoriesState.data ?? []} />
        </div>
      </div>

      <div className="card mt-6">
        <h4 className="mb-4">Saldo por Conta</h4>
        <AccountBalances rows={balancesState.data ?? []} />
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: DailyTotals }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className="text-muted text-center" style={{ padding: '2rem' }}>Sem dados</p>;
  const maxVal = Math.max(...entries.map(([, d]) => Math.max(d.income, d.expense)), 1);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
        {entries.map(([date, d]) => {
          const ih = (d.income / maxVal) * 100;
          const eh = (d.expense / maxVal) * 100;
          const day = parseInt(date.split('-')[2], 10);
          return (
            <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: '100%' }}>
                <div style={{ flex: 1, height: `${Math.max(ih, 1)}%`, background: 'var(--color-success)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`${date}: +${formatCurrency(d.income)}`} />
                <div style={{ flex: 1, height: `${Math.max(eh, 1)}%`, background: 'var(--color-danger)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`${date}: -${formatCurrency(d.expense)}`} />
              </div>
              {day % 5 === 1 ? <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{day}</span> : <span />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--color-success)' }} />Receitas</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--color-danger)' }} />Despesas</span>
      </div>
    </>
  );
}

function YearlyChart({ data, currentMonth }: { data: Array<MonthSummary & { month: number }>; currentMonth: number }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d) => {
        const ih = (d.income / maxVal) * 100;
        const eh = (d.expense / maxVal) * 100;
        return (
          <div key={d.month} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: d.month === currentMonth ? 1 : 0.6 }}>
            <span style={{ width: 28, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>{formatShortMonth(d.month)}</span>
            <div style={{ flex: 1, height: 16, display: 'flex', gap: 2 }}>
              <div className="income-bar" style={{ width: `${ih}%`, minWidth: d.income > 0 ? 2 : 0 }} title={`Receita: ${formatCurrency(d.income)}`} />
              <div className="expense-bar" style={{ width: `${eh}%`, minWidth: d.expense > 0 ? 2 : 0 }} title={`Despesa: ${formatCurrency(d.expense)}`} />
            </div>
            <span style={{ fontSize: 11, color: d.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', minWidth: 80, textAlign: 'right' }}>{formatCurrency(d.balance)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CategoryList({
  totals,
  categories,
}: {
  totals: Record<string, number>;
  categories: Category[];
}) {
  const entries = useMemo(
    () =>
      Object.entries(totals)
        .map(([id, amount]) => ({ id, amount, category: categories.find((c) => c.id === id) }))
        .filter((e) => e.category)
        .sort((a, b) => b.amount - a.amount),
    [totals, categories]
  );
  const total = entries.reduce((s, e) => s + e.amount, 0);
  if (!entries.length) return <p className="text-muted text-center" style={{ padding: '1.5rem' }}>Sem dados</p>;

  return (
    <div>
      {entries.map((e) => {
        const pct = total > 0 ? (e.amount / total) * 100 : 0;
        return (
          <div key={e.id} style={{ marginBottom: 12 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{e.category!.icon} {e.category!.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(e.amount)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="progress" style={{ flex: 1 }}><div className="progress__bar" style={{ width: `${pct}%`, background: e.category!.color }} /></div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 36, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountBalances({ rows }: { rows: AccountBalanceRow[] }) {
  if (!rows.length) return <p className="text-muted text-center">Nenhuma conta</p>;
  return (
    <div>
      {rows.map((a) => (
        <div key={a.id} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.3rem' }}>{a.icon}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Inicial: {formatCurrency(a.initialBalance)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: a.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrency(a.balance)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>+{formatCurrency(a.income)} / -{formatCurrency(a.expense)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}