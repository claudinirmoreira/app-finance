import { useState } from 'react';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { transactionApi } from '../api/transactions';
import { categoryApi } from '../api/categories';
import { accountApi } from '../api/accounts';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate, getCurrentMonth, formatMonthYear } from '../utils/formatters';
import type { Account, Category, Transaction, TransactionInput, TransactionType } from '../types';

interface Filters {
  search: string;
  type: TransactionType | '';
  categoryId: string;
}

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

function TransactionForm({
  initial,
  categories,
  accounts,
  onSave,
  onCancel,
}: {
  initial: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onSave: (input: TransactionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<{
    description: string;
    amount: string;
    type: TransactionType;
    date: string;
    accountId: string;
    categoryId: string;
    notes: string;
  }>({
    description: initial?.description ?? '',
    amount: initial ? String(initial.amount) : '',
    type: initial?.type ?? 'expense',
    date: initial ? initial.date.split('T')[0] : new Date().toISOString().split('T')[0],
    accountId: initial?.accountId ?? '',
    categoryId: initial?.categoryId ?? '',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const visibleCategories = categories.filter((c) => c.type === form.type);

  const handleType = (type: TransactionType) => {
    setForm((f) => ({ ...f, type, categoryId: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        type: form.type,
        date: form.date,
        accountId: form.accountId,
        categoryId: form.categoryId,
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="transaction-form" onSubmit={submit} noValidate>
      <div className="form-group mb-4">
        <label className="form-group__label">Tipo</label>
        <div className="flex gap-2">
          <button type="button" className={`btn btn--sm ${form.type === 'expense' ? 'btn--danger' : 'btn--secondary'}`} onClick={() => handleType('expense')}>
            Despesa
          </button>
          <button type="button" className={`btn btn--sm ${form.type === 'income' ? 'btn--primary' : 'btn--secondary'}`} style={form.type === 'income' ? { background: 'var(--color-success)' } : undefined} onClick={() => handleType('income')}>
            Receita
          </button>
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label" htmlFor="tx-desc">Descrição *</label>
        <input type="text" className="form-group__input" id="tx-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" required />
      </div>
      <div className="form-row mb-4">
        <div className="form-group">
          <label className="form-group__label" htmlFor="tx-amount">Valor (R$) *</label>
          <input type="number" className="form-group__input" id="tx-amount" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0,00" required />
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="tx-date">Data *</label>
          <input type="date" className="form-group__input" id="tx-date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div className="form-row mb-4">
        <div className="form-group">
          <label className="form-group__label" htmlFor="tx-account">Conta *</label>
          <select className="form-group__select" id="tx-account" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} required>
            <option value="">Selecione...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="tx-category">Categoria *</label>
          <select className="form-group__select" id="tx-category" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
            <option value="">Selecione...</option>
            {visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label" htmlFor="tx-notes">Observações</label>
        <input type="text" className="form-group__input" id="tx-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{initial ? 'Salvar Alterações' : 'Adicionar'}</button>
      </div>
    </form>
  );
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<Filters>({ search: '', type: '', categoryId: '' });
  const [month, setMonth] = useState(getCurrentMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { ToastContainer, pushSuccess, pushError } = useToast();

  const txState = useAsyncData<Transaction[]>(
    () => transactionApi.list({ year: month.year, month: month.month, ...filters }),
    [month.year, month.month, filters.search, filters.type, filters.categoryId]
  );
  const categoriesState = useAsyncData<Category[]>(() => categoryApi.list(), []);
  const accountsState = useAsyncData<Account[]>(() => accountApi.list(), []);

  const reload = () => txState.reload();

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setModalOpen(true);
  };

  const handleSave = async (input: TransactionInput) => {
    if (editing) {
      await transactionApi.update(editing.id, input);
      pushSuccess('Transação atualizada!');
    } else {
      await transactionApi.create(input);
      pushSuccess('Transação adicionada!');
    }
    setModalOpen(false);
    await reload();
  };

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm('Excluir esta transação?')) return;
    try {
      await transactionApi.remove(tx.id);
      pushSuccess('Transação excluída');
      await reload();
    } catch (err) {
      pushError(getErrorMessage(err));
    }
  };

  if (txState.loading || categoriesState.loading || accountsState.loading) return <LoadingState />;
  if (txState.error) return <ErrorState message={txState.error} onRetry={txState.reload} />;

  const transactions = txState.data ?? [];

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3>Transações</h3>
        <div className="flex items-center gap-2">
          <MonthNav month={month} setMonth={setMonth} />
          <button className="btn btn--primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>
            Nova Transação
          </button>
        </div>
      </div>

      <div className="filter-bar mb-4">
        <div className="filter-bar__search">
          <svg className="filter-bar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="text"
            placeholder="Buscar transação..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          className="form-group__select"
          style={{ width: 'auto', minWidth: 120 }}
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as TransactionType | '' }))}
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select
          className="form-group__select"
          style={{ width: 'auto', minWidth: 160 }}
          value={filters.categoryId}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
        >
          <option value="">Todas categorias</option>
          {(categoriesState.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      {transactions.length ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const cat = categoriesState.data?.find((c) => c.id === t.categoryId);
                const acc = accountsState.data?.find((a) => a.id === t.accountId);
                const sign = t.type === 'income' ? '+' : '-';
                return (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>
                      <span className="font-semibold">{t.description}</span>
                      {t.notes && <br />}
                      {t.notes && <span className="text-muted" style={{ fontSize: 11 }}>{t.notes}</span>}
                    </td>
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
                    <td>{acc?.name ?? '-'}</td>
                    <td className={`table__amount table__amount--${t.type}`} style={{ textAlign: 'right' }}>{sign} {formatCurrency(t.amount)}</td>
                    <td><div className="table__actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn--icon btn--sm" title="Editar" onClick={() => openEdit(t)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn btn--icon btn--sm" title="Excluir" onClick={() => handleDelete(t)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table__empty">
          <div className="table__empty-icon">📭</div>
          <div className="table__empty-text">Nenhuma transação encontrada</div>
          <div className="table__empty-subtext">Clique em "Nova Transação" para começar</div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Transação' : 'Nova Transação'} onClose={() => setModalOpen(false)}>
          <TransactionForm
            accounts={accountsState.data ?? []}
            categories={categoriesState.data ?? []}
            initial={editing}
            onSave={handleSave}
            onCancel={() => setModalOpen(false)}
          />
        </Modal>
      )}

      <ToastContainer />
    </>
  );
}