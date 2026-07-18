import { Account, Currency, Transaction, active } from '../domain';

export type AnalyticsPeriod = 'month' | 'year' | 'all';
export type Analytics = { incomeMinor: number; expenseMinor: number; netMinor: number; byCategory: Array<{ categoryId: string; totalMinor: number }>; byAccount: Array<{ accountId: string; totalMinor: number }>; byDay: Array<{ date: string; totalMinor: number }>; largest: Transaction[] };

function inPeriod(date: string, period: AnalyticsPeriod, now: Date): boolean {
  const value = new Date(date);
  if (period === 'all') return true;
  if (period === 'year') return value.getFullYear() === now.getFullYear();
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
}

export function calculateAnalytics(transactions: Transaction[], period: AnalyticsPeriod = 'month', now = new Date()): Analytics {
  const selected = active(transactions).filter((item) => inPeriod(item.occurredAt, period, now));
  const incomeMinor = selected.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountRubMinor, 0);
  const expenseMinor = selected.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountRubMinor, 0);
  const group = (key: 'categoryId' | 'accountId') => [...selected.filter((item) => item.type === 'expense').reduce((map, item) => map.set(item[key], (map.get(item[key]) ?? 0) + item.amountRubMinor), new Map<string, number>())].map(([id, totalMinor]) => key === 'categoryId' ? { categoryId: id, totalMinor } : { accountId: id, totalMinor }).sort((a, b) => b.totalMinor - a.totalMinor);
  const byDay = [...selected.filter((item) => item.type === 'expense').reduce((map, item) => { const day = item.occurredAt.slice(0, 10); map.set(day, (map.get(day) ?? 0) + item.amountRubMinor); return map; }, new Map<string, number>())].map(([date, totalMinor]) => ({ date, totalMinor })).sort((a, b) => a.date.localeCompare(b.date));
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, byCategory: group('categoryId') as Array<{ categoryId: string; totalMinor: number }>, byAccount: group('accountId') as Array<{ accountId: string; totalMinor: number }>, byDay, largest: [...selected].sort((a, b) => b.amountRubMinor - a.amountRubMinor).slice(0, 5) };
}

export function currencyTotals(transactions: Transaction[], currency: Currency): { incomeMinor: number; expenseMinor: number } {
  const selected = active(transactions).filter((item) => item.currency === currency);
  return { incomeMinor: selected.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0), expenseMinor: selected.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0) };
}

export function exportTransactionsCsv(transactions: Transaction[]): string {
  const rows = [['uuid', 'type', 'amount', 'currency', 'amountRub', 'amountUsd', 'accountId', 'categoryId', 'occurredAt', 'note'], ...active(transactions).map((item) => [item.id, item.type, (item.originalAmountMinor / 100).toFixed(2), item.currency, (item.amountRubMinor / 100).toFixed(2), (item.amountUsdMinor / 100).toFixed(2), item.accountId, item.categoryId, item.occurredAt, item.note])];
  return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

export function accountName(accounts: Account[], id: string): string { return accounts.find((item) => item.id === id)?.name ?? 'Счёт'; }
