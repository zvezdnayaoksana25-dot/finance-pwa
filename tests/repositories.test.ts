import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { FinanceDatabase, createRepositories } from '../src/infrastructure/repositories';

const now = new Date().toISOString();

describe('Dexie repositories', () => {
  let db: FinanceDatabase;
  afterEach(async () => { if (db) await db.delete(); });

  it('persists and reads every entity through its repository', async () => {
    db = new FinanceDatabase(`test-${crypto.randomUUID()}`);
    const repos = createRepositories(db);
    const entities = [
      repos.accounts.put({ id: 'a', name: 'Cash', currency: 'RUB', openingBalanceMinor: 0, createdAt: now, updatedAt: now }),
      repos.categories.put({ id: 'c', name: 'Food', type: 'expense', isSystem: false, createdAt: now, updatedAt: now }),
      repos.transactions.put({ id: 't', type: 'expense', amountMinor: 100, currency: 'RUB', originalAmountMinor: 100, exchangeRate: 1, amountRubMinor: 100, amountUsdMinor: 0, accountId: 'a', categoryId: 'c', note: '', occurredAt: now, createdAt: now, updatedAt: now }),
      repos.transfers.put({ id: 'tr', amountMinor: 100, currency: 'RUB', fromAccountId: 'a', toAccountId: 'b', note: '', occurredAt: now, createdAt: now, updatedAt: now }),
      repos.budgets.put({ id: 'b', name: 'Food', amountMinor: 1000, currency: 'RUB', period: 'month', startsAt: now, endsAt: now, warningPercent: 80, createdAt: now, updatedAt: now }),
      repos.goals.put({ id: 'g', name: 'Emergency fund', targetAmountMinor: 10000, currency: 'RUB', targetDate: now, createdAt: now, updatedAt: now }),
      repos.goalAllocations.put({ id: 'ga', goalId: 'g', accountId: 'a', amountMinor: 500, currency: 'RUB', allocatedAt: now, createdAt: now, updatedAt: now }),
      repos.exchangeRates.put({ id: 'r', baseCurrency: 'USD', quoteCurrency: 'RUB', rate: 90, source: 'test', fetchedAt: now, createdAt: now, updatedAt: now }),
      repos.syncQueue.put({ id: 'q', entity: 'transaction', entityId: 't', operation: 'upsert', payload: {}, attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now }),
    ];
    await Promise.all(entities);
    expect(await Promise.all([
      repos.accounts.get('a'), repos.categories.get('c'), repos.transactions.get('t'), repos.transfers.get('tr'),
      repos.budgets.get('b'), repos.goals.get('g'), repos.goalAllocations.get('ga'), repos.exchangeRates.get('r'), repos.syncQueue.get('q'),
    ])).toHaveLength(9);
  });

  it('soft-deletes records without removing their history', async () => {
    db = new FinanceDatabase(`test-${crypto.randomUUID()}`);
    const repos = createRepositories(db);
    await repos.goals.put({ id: 'g', name: 'Trip', targetAmountMinor: 100, currency: 'USD', targetDate: now, createdAt: now, updatedAt: now });
    await repos.goals.softDelete('g');
    expect(await repos.goals.list()).toHaveLength(0);
    expect((await repos.goals.list(true))[0].deletedAt).toBeTruthy();
  });
});
