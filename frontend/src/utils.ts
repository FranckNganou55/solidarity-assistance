import { Lang } from './i18n';

export function formatMoney(amount?: number | null, currency = 'FCFA', lang: Lang = 'fr') {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} ${currency}`;
}

export function formatDate(value?: string | null, lang: Lang = 'fr') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null, lang: Lang = 'fr') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function matchesPersonSearch(query: string, name?: string, identifier?: string, id?: number) {
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const text = normalized(query);
  if (!text) return true;
  if (normalized(name ?? '').includes(text) || String(id ?? '').includes(text)) return true;
  const digits = query.replace(/\D/g, '');
  return digits.length > 0 && (identifier ?? '').replace(/\D/g, '').includes(digits);
}

export const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  OPEN: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  PENDING: 'warning',
  VALIDATED: 'success',
  REJECTED: 'danger',
  INVALIDATED: 'danger',
  APPROVED: 'success',
};
