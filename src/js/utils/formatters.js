const CURRENCY_LOCALE = 'pt-BR';
const CURRENCY_CODE = 'BRL';

export function formatCurrency(value) {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
  }).format(value);
}

export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatMonthYear(year, month) {
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortMonth(month) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}

export function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  return parseFloat(
    value.replace(/[^\d,-]/g, '').replace(',', '.')
  ) || 0;
}

export function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}
