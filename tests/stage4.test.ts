import { describe, expect, it, vi } from 'vitest';
import { calculateAnalytics, exportTransactionsCsv } from '../src/domain/analytics';
import { convertMinor, fetchUsdRubRate, latestUsdRubRate, reciprocalRate } from '../src/infrastructure/currency/api';

const tx = (id: string, type: 'income' | 'expense', amountRubMinor: number, occurredAt: string, categoryId = 'food') => ({ id, type, amountMinor: amountRubMinor, currency: 'RUB' as const, originalAmountMinor: amountRubMinor, exchangeRate: 1, amountRubMinor, amountUsdMinor: 0, accountId: 'main', categoryId, note: '', occurredAt, createdAt: occurredAt, updatedAt: occurredAt });

describe('stage 4 currency adapter', () => {
  it('parses provider response and rejects HTTP errors', async () => {
    const provider = vi.fn(async () => ({ rate: 91.25, source: 'test' }));
    expect((await fetchUsdRubRate(provider)).rate).toBe(91.25);
    await expect(fetchUsdRubRate(async () => { throw new Error('timeout'); })).rejects.toThrow('timeout');
  });
  it('converts both directions and uses reciprocal cached rates', () => {
    expect(convertMinor(10000, 'USD', 'RUB', 90)).toBe(900000);
    expect(convertMinor(900000, 'RUB', 'USD', 90)).toBe(10000);
    expect(reciprocalRate({ id: 'x', baseCurrency: 'USD', quoteCurrency: 'RUB', rate: 90, source: 'test', fetchedAt: '', createdAt: '', updatedAt: '' }, 'RUB', 'USD')).toBeCloseTo(1 / 90);
  });
  it('selects the latest cached rate for fallback', () => {
    expect(latestUsdRubRate([{ id: 'old', baseCurrency: 'USD', quoteCurrency: 'RUB', rate: 80, source: 'test', fetchedAt: '2026-01-01', createdAt: '', updatedAt: '' }, { id: 'new', baseCurrency: 'USD', quoteCurrency: 'RUB', rate: 90, source: 'test', fetchedAt: '2026-07-01', createdAt: '', updatedAt: '' }])?.rate).toBe(90);
  });
});

describe('stage 4 analytics and exports', () => {
  it('calculates real category, account, period and largest-operation totals', () => {
    const data = [tx('1', 'expense', 2500, '2026-07-10', 'food'), tx('2', 'expense', 1000, '2026-06-10', 'transport'), tx('3', 'income', 10000, '2026-07-11')];
    const result = calculateAnalytics(data, 'month', new Date('2026-07-20'));
    expect(result).toMatchObject({ incomeMinor: 10000, expenseMinor: 2500, netMinor: 7500 });
    expect(result.byCategory[0]).toEqual({ categoryId: 'food', totalMinor: 2500 });
    expect(result.byAccount[0]).toEqual({ accountId: 'main', totalMinor: 2500 });
    expect(result.largest[0].id).toBe('3');
  });
  it('exports UUID and historical currency fields as CSV', () => {
    const csv = exportTransactionsCsv([tx('uuid-1', 'expense', 2500, '2026-07-10')]);
    expect(csv).toContain('"uuid","type","amount","currency","amountRub","amountUsd"');
    expect(csv).toContain('uuid-1');
  });
});
