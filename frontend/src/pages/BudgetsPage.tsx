import { useState } from 'react';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { budgetApi } from '../api/budgets';
import { categoryApi } from '../api/categories';
import { reportApi } from '../api/reports';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatPercent, getCurrentMonth, formatMonthYear } from '../utils/formatters';
import type { Budget, BudgetInput, Category } from '../types';

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

function BudgetForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial: Budget | null;
  categories: Category[];
  onSave: (input: BudgetInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    categoryId: initial?.categoryId ?? '',
    amount: initial ? String(initial.amount) : '',
  });
  const [saving, setSaving] = useState(false);
  const now = new Date();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        categoryId: form.categoryId,
        amount: parseFloat(form.amount) || 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="budget-form" onSubmit={submit} noValidate>
      <div className="form-group mb-4">
        <label className="form-group__label" htmlFor="budget-category">Categoria *</label>
        <select className="form-group__select" id="budget-category" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
          <option value="">Selecione...</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="form-row mb-4">
        <div className="form-group">
          <label className="form-group__label" htmlFor="budget-amount">Limite Mensal (R$) *</label>
          <input type="number" className="form-group__input" id="budget-amount" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0,00" required />
        </div>
        <div className="form-group">
          <label className="form-group__label">Mês/Ano</label>
          <input type="text" className="form-group__input" value={`${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`} disabled style={{ opacity: 0.6 }} />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{initial ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  );
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const { ToastContainer, pushSuccess, pushError } = useToast();

  const ratiosState = useAsyncData(
    () => reportApi.budgetRatios(month.year, month.month),
    [month.year, month.month]
  );
  const categoriesState = useAsyncData(() => categoryApi.list('expense'), []);
  const reload = () => ratiosState.reload();

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (b: Budget) => {
    setEditing(b);
    setModalOpen(true);
  };

  const handleSave = async (input: BudgetInput) => {
    if (editing) {
      await budgetApi.update(editing.id, { amount: input.amount });
      pushSuccess('Orçamento atualizado!');
    } else {
      await budgetApi.create(input);
      pushSuccess('Orçamento criado!');
    }
    setModalOpen(false);
    await reload();
  };

  const handleDelete = async (b: Budget) => {
    if (!window.confirm('Excluir este orçamento?')) return;
    try {
      await budgetApi.remove(b.id);
      pushSuccess('Orçamento excluído');
      await reload();
    } catch (err) {
      pushError(getErrorMessage(err));
    }
  };

  if (ratiosState.loading || categoriesState.loading) return <LoadingState />;
  if (ratiosState.error) return <ErrorState message={ratiosState.error} onRetry={ratiosState.reload} />;

  const budgets = ratiosState.data ?? [];
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          <span>Orçado: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totalBudget)}</strong></span>
          <span>Gasto: <strong style={{ color: totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{formatCurrency(totalSpent)}</strong></span>
          <span>Disponível: <strong style={{ color: totalBudget - totalSpent >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrency(totalBudget - totalSpent)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <MonthNav month={month} setMonth={setMonth} />
          <button className="btn btn--primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>
            Novo Orçamento
          </button>
        </div>
      </div>

      {budgets.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.min(b.percentage, 100) : 0;
            const barCls = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'accent';
            const remaining = b.remaining;
            return (
              <div key={b.id} className="card">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.3rem' }}>{b.category?.icon}</span>
                    <span className="font-semibold">{b.category?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn--icon btn--sm" title="Editar" onClick={() => openEdit(b)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="btn btn--icon btn--sm" title="Excluir" onClick={() => handleDelete(b)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>
                <div className="progress mb-2"><div className={`progress__bar progress__bar--${barCls}`} style={{ width: `${pct}%` }} /></div>
                <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span>Gasto: {formatCurrency(b.spent)}</span>
                  <span>Limite: {formatCurrency(b.amount)}</span>
                </div>
                <div className="flex justify-between mt-2" style={{ fontSize: 12 }}>
                  <span style={{ color: remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {remaining >= 0 ? `Restam ${formatCurrency(remaining)}` : `Estourou ${formatCurrency(Math.abs(remaining))}`}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatPercent(pct)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table__empty">
          <div className="table__empty-icon">📊</div>
          <div className="table__empty-text">Nenhum orçamento definido</div>
          <div className="table__empty-subtext">Defina limites mensais por categoria</div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Orçamento' : 'Novo Orçamento'} onClose={() => setModalOpen(false)}>
          <BudgetForm
            initial={editing}
            categories={categoriesState.data ?? []}
            onSave={handleSave}
            onCancel={() => setModalOpen(false)}
          />
        </Modal>
      )}

      <ToastContainer />
    </>
  );
}