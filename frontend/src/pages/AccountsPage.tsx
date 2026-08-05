import { useState } from 'react';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { accountApi } from '../api/accounts';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import type { Account, AccountInput, AccountType } from '../types';

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  credit: 'Cartão de Crédito',
  investment: 'Investimento',
};

const ICONS = ['🏦', '🐷', '👛', '💳', '📈', '💵', '🪙', '💎'];
const COLORS = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#fd79a8', '#636e72', '#a29bfe'];

function AccountForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Account | null;
  onSave: (input: AccountInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? ('checking' as AccountType),
    initialBalance: initial ? String(initial.initialBalance) : '',
    color: initial?.color ?? '#6c5ce7',
    icon: initial?.icon ?? '🏦',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        type: form.type,
        initialBalance: parseFloat(form.initialBalance) || 0,
        color: form.color,
        icon: form.icon,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="account-form" onSubmit={submit} noValidate>
      <div className="form-group mb-4">
        <label className="form-group__label">Ícone</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {ICONS.map((i) => (
            <button
              type="button"
              key={i}
              className="btn btn--sm"
              style={{
                fontSize: '1.2rem',
                width: 40,
                height: 40,
                background: form.icon === i ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                border: form.icon === i ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
              onClick={() => setForm((f) => ({ ...f, icon: i }))}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label" htmlFor="acc-name">Nome *</label>
        <input type="text" className="form-group__input" id="acc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank" required />
      </div>
      <div className="form-row mb-4">
        <div className="form-group">
          <label className="form-group__label" htmlFor="acc-type">Tipo</label>
          <select className="form-group__select" id="acc-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}>
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="wallet">Carteira</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="investment">Investimento</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="acc-balance">Saldo Inicial (R$)</label>
          <input type="number" className="form-group__input" id="acc-balance" step="0.01" value={form.initialBalance} onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))} placeholder="0,00" />
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label">Cor</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c,
                border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                cursor: 'pointer',
              }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{initial ? 'Salvar' : 'Criar Conta'}</button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const state = useAsyncData(() => accountApi.list(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const { ToastContainer, pushSuccess, pushError } = useToast();

  const reload = () => state.reload();
  const totalBalance = (state.data ?? []).reduce((s, a) => s + (a.balance ?? 0), 0);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleSave = async (input: AccountInput) => {
    if (editing) {
      await accountApi.update(editing.id, input);
      pushSuccess('Conta atualizada!');
    } else {
      await accountApi.create(input);
      pushSuccess('Conta criada!');
    }
    setModalOpen(false);
    await reload();
  };

  const handleDelete = async (a: Account) => {
    if (!window.confirm('Excluir esta conta? Transações vinculadas serão removidas.')) return;
    try {
      await accountApi.remove(a.id);
      pushSuccess('Conta excluída');
      await reload();
    } catch (err) {
      pushError(getErrorMessage(err));
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Saldo Total</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatCurrency(totalBalance)}
          </div>
        </div>
        <button className="btn btn--primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>
          Nova Conta
        </button>
      </div>

      {(state.data?.length ?? 0) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {(state.data ?? []).map((a) => {
            const balance = a.balance ?? 0;
            return (
              <div key={a.id} className="card" style={{ borderLeft: `3px solid ${a.color}` }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.5rem' }}>{a.icon}</span>
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{TYPE_LABELS[a.type]}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn--icon btn--sm" title="Editar" onClick={() => openEdit(a)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="btn btn--icon btn--sm" title="Excluir" onClick={() => handleDelete(a)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Inicial</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{formatCurrency(a.initialBalance)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Atual</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrency(balance)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table__empty">
          <div className="table__empty-icon">🏦</div>
          <div className="table__empty-text">Nenhuma conta cadastrada</div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Conta' : 'Nova Conta'} onClose={() => setModalOpen(false)}>
          <AccountForm initial={editing} onSave={handleSave} onCancel={() => setModalOpen(false)} />
        </Modal>
      )}

      <ToastContainer />
    </>
  );
}