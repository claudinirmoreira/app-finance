import { useState } from 'react';
import { useAsyncData, LoadingState, ErrorState } from '../hooks/useAsyncData';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { categoryApi } from '../api/categories';
import { transactionApi } from '../api/transactions';
import { getErrorMessage } from '../api/client';
import type { Category, CategoryInput, TransactionType } from '../types';

const ICONS = ['💰', '💻', '📈', '📥', '🍔', '🏠', '🚗', '🏥', '📚', '🎮', '👕', '📄', '📦', '✈️', '🎬', '🏋️', '🐕', '🎵', '🛒', '💊'];
const COLORS = ['#00b894', '#55efc4', '#74b9ff', '#a29bfe', '#e17055', '#d63031', '#fdcb6e', '#ff7675', '#6c5ce7', '#fd79a8', '#636e72', '#b2bec3'];

function CategoryForm({
  initial,
  defaultType,
  onSave,
  onCancel,
}: {
  initial: Category | null;
  defaultType: TransactionType;
  onSave: (input: CategoryInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? defaultType,
    color: initial?.color ?? '#636e72',
    icon: initial?.icon ?? '📁',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name: form.name, type: form.type, color: form.color, icon: form.icon });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="category-form" onSubmit={submit} noValidate>
      <div className="form-group mb-4">
        <label className="form-group__label">Tipo</label>
        <div className="flex gap-2">
          <button type="button" className={`btn btn--sm ${form.type === 'expense' ? 'btn--danger' : 'btn--secondary'}`} onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}>Despesa</button>
          <button type="button" className={`btn btn--sm ${form.type === 'income' ? 'btn--primary' : 'btn--secondary'}`} style={form.type === 'income' ? { background: 'var(--color-success)' } : undefined} onClick={() => setForm((f) => ({ ...f, type: 'income' }))}>Receita</button>
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label" htmlFor="cat-name">Nome *</label>
        <input type="text" className="form-group__input" id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Alimentação" required />
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label">Ícone</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {ICONS.map((i) => (
            <button
              type="button"
              key={i}
              className="btn btn--sm"
              style={{ fontSize: '1rem', width: 36, height: 36, background: form.icon === i ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)', border: form.icon === i ? '2px solid var(--color-accent)' : '2px solid transparent' }}
              onClick={() => setForm((f) => ({ ...f, icon: i }))}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group mb-4">
        <label className="form-group__label">Cor</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'white' : 'transparent'}`, cursor: 'pointer' }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{initial ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const state = useAsyncData(() => categoryApi.list(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const { ToastContainer, pushSuccess, pushError } = useToast();

  const reload = () => state.reload();
  const categories = (state.data ?? []).filter((c) => c.type === activeTab);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleSave = async (input: CategoryInput) => {
    if (editing) {
      await categoryApi.update(editing.id, input);
      pushSuccess('Categoria atualizada!');
    } else {
      await categoryApi.create(input);
      pushSuccess('Categoria criada!');
    }
    setModalOpen(false);
    await reload();
  };

  const handleDelete = async (c: Category) => {
    try {
      const txns = await transactionApi.list({ categoryId: c.id });
      if (txns.length > 0) {
        pushError('Não é possível excluir: existem transações vinculadas');
        return;
      }
      if (!window.confirm('Excluir esta categoria?')) return;
      await categoryApi.remove(c.id);
      pushSuccess('Categoria excluída');
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
        <div className="tabs" id="cat-tabs">
          <button className={`tab ${activeTab === 'expense' ? 'tab--active' : ''}`} onClick={() => setActiveTab('expense')}>Despesas</button>
          <button className={`tab ${activeTab === 'income' ? 'tab--active' : ''}`} onClick={() => setActiveTab('income')}>Receitas</button>
        </div>
        <button className="btn btn--primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>
          Nova Categoria
        </button>
      </div>

      {categories.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map((c) => (
            <div key={c.id} className="card" style={{ borderLeft: `3px solid ${c.color}` }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c._count?.transactions ?? 0} transação(ões)</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn btn--icon btn--sm" title="Editar" onClick={() => openEdit(c)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button className="btn btn--icon btn--sm" title="Excluir" onClick={() => handleDelete(c)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table__empty">
          <div className="table__empty-icon">📁</div>
          <div className="table__empty-text">Nenhuma categoria</div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModalOpen(false)}>
          <CategoryForm initial={editing} defaultType={activeTab} onSave={handleSave} onCancel={() => setModalOpen(false)} />
        </Modal>
      )}

      <ToastContainer />
    </>
  );
}