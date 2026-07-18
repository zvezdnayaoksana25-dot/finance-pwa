import { describe, expect, it } from 'vitest';
import { active, budgetUsage, calculateAccountBalances, formatAmount, goalProgress, parseAmount, validateTransactionInput, validateTransferInput } from '../src/domain';

describe('money domain', () => {
  it('parses decimal amounts to minor units', () => { expect(parseAmount('1 234,56'.replace(' ', ''))).toBe(123456); expect(formatAmount(123456, 'RUB')).toContain('1 234,56'); });
  it('rejects zero, negative and malformed amounts', () => { for (const value of ['0', '-1', '1.234', 'abc']) expect(() => parseAmount(value)).toThrow(); });
  it('validates a transaction input', () => { expect(() => validateTransactionInput({ type: 'expense', amountMinor: 100, accountId: 'a', categoryId: 'c' })).not.toThrow(); expect(() => validateTransactionInput({ type: 'expense', amountMinor: 0, accountId: 'a', categoryId: 'c' })).toThrow(); });
  it('prevents transfers to the same account', () => { expect(() => validateTransferInput({ amountMinor: 100, fromAccountId: 'a', toAccountId: 'a' })).toThrow(); });
  it('filters soft-deleted records', () => { expect(active([{ id: '1' }, { id: '2', deletedAt: new Date().toISOString() }])).toHaveLength(1); });
  it('calculates account balances with opening balances and transfers', () => {
    const balances = calculateAccountBalances({
      accounts: [
        { id: 'a', name: 'Main', currency: 'RUB', openingBalanceMinor: 1000, createdAt: '', updatedAt: '' },
        { id: 'b', name: 'Savings', currency: 'RUB', openingBalanceMinor: 0, createdAt: '', updatedAt: '' },
      ],
      transactions: [{ id: 't', type: 'expense', amountMinor: 200, currency: 'RUB', originalAmountMinor: 200, exchangeRate: 1, amountRubMinor: 200, amountUsdMinor: 0, accountId: 'a', categoryId: 'c', note: '', occurredAt: '', createdAt: '', updatedAt: '' }],
      transfers: [{ id: 'tr', amountMinor: 300, currency: 'RUB', fromAccountId: 'a', toAccountId: 'b', note: '', occurredAt: '', createdAt: '', updatedAt: '' }],
    });
    expect(balances).toEqual([{ accountId: 'a', rubMinor: 500, usdMinor: 0 }, { accountId: 'b', rubMinor: 300, usdMinor: 0 }]);
  });
  it('calculates budget usage and goal progress', () => {
    const transaction = { id: 't', type: 'expense' as const, amountMinor: 250, currency: 'RUB' as const, originalAmountMinor: 250, exchangeRate: 1, amountRubMinor: 250, amountUsdMinor: 0, accountId: 'a', categoryId: 'food', note: '', occurredAt: '2026-07-10', createdAt: '', updatedAt: '' };
    const budget = { id: 'b', name: 'Food', amountMinor: 500, currency: 'RUB' as const, period: 'month' as const, startsAt: '2026-07-01', endsAt: '2026-07-31', warningPercent: 80, createdAt: '', updatedAt: '' };
    expect(budgetUsage(budget, [transaction])).toBe(250);
    const goal = { id: 'g', name: 'Reserve', targetAmountMinor: 1000, currency: 'RUB' as const, targetDate: '2099-01-01', createdAt: '', updatedAt: '' };
    expect(goalProgress(goal, [{ id: 'a', goalId: 'g', accountId: 'a', amountMinor: 250, currency: 'RUB', allocatedAt: '', createdAt: '', updatedAt: '' }])).toMatchObject({ allocatedMinor: 250, remainingMinor: 750, percent: 25 });
  });
});
