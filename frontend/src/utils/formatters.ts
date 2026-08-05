const CURRENCY_LOCALE = 'pt-BR';
const CURRENCY_CODE = 'BRL';

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
  }).format(num || 0);
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export function formatMonthYear(year: number, month: number): string {
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1));
}

export function formatShortMonth(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] ?? '';
}

export function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1)}%`;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}