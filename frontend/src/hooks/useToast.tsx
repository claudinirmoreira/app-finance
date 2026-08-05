import { useState, type ReactElement } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const ICONS: Record<ToastItem['type'], string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const push = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => remove(id), 3500);
  };

  const pushSuccess = (message: string) => push(message, 'success');
  const pushError = (message: string) => push(message, 'error');

  const ToastContainer = (): ReactElement => (
    <div id="toast-container" className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} style={{ opacity: 1, transform: 'none' }}>
          <span className="toast__icon">{ICONS[t.type]}</span>
          <span className="toast__message">{t.message}</span>
          <button className="toast__close" aria-label="Fechar" onClick={() => remove(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  return { push, pushSuccess, pushError, ToastContainer };
}