import Dexie, { Table } from 'dexie';
import { Account, Budget, Category, ExchangeRate, Goal, GoalAllocation, SyncQueueItem, Transaction, Transfer } from '../domain';

type Entity = { id: string; updatedAt: string; deletedAt?: string };

export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  transfers!: Table<Transfer, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  goalAllocations!: Table<GoalAllocation, string>;
  exchangeRates!: Table<ExchangeRate, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor(name = 'finance-pwa') {
    super(name);
    this.version(1).stores({
      accounts: 'id, updatedAt, deletedAt',
      categories: 'id, updatedAt, type, deletedAt',
      transactions: 'id, updatedAt, occurredAt, accountId, categoryId, deletedAt',
      transfers: 'id, updatedAt, occurredAt, fromAccountId, toAccountId, deletedAt',
      budgets: 'id, updatedAt, startsAt, endsAt, categoryId, deletedAt',
      goals: 'id, updatedAt, targetDate, deletedAt',
      goalAllocations: 'id, updatedAt, goalId, accountId, allocatedAt, deletedAt',
      exchangeRates: 'id, updatedAt, baseCurrency, quoteCurrency, fetchedAt, deletedAt',
      syncQueue: 'id, updatedAt, entity, entityId, nextAttemptAt, deletedAt',
    });
  }
}

export type Repository<T extends Entity> = {
  get(id: string): Promise<T | undefined>;
  list(includeDeleted?: boolean): Promise<T[]>;
  put(entity: T): Promise<string>;
  softDelete(id: string, deletedAt?: string): Promise<void>;
};

function repository<T extends Entity>(table: Table<T, string>): Repository<T> {
  return {
    get: (id) => table.get(id),
    list: async (includeDeleted = false) => {
      const items = await table.toArray();
      return includeDeleted ? items : items.filter((item) => !item.deletedAt);
    },
    put: (entity) => table.put(entity),
    softDelete: async (id, deletedAt = new Date().toISOString()) => {
      const current = await table.get(id);
      if (!current) throw new Error(`Entity ${id} was not found`);
      await table.put({ ...current, deletedAt, updatedAt: deletedAt });
    },
  };
}

export function createRepositories(db = new FinanceDatabase()) {
  return {
    db,
    accounts: repository(db.accounts),
    categories: repository(db.categories),
    transactions: repository(db.transactions),
    transfers: repository(db.transfers),
    budgets: repository(db.budgets),
    goals: repository(db.goals),
    goalAllocations: repository(db.goalAllocations),
    exchangeRates: repository(db.exchangeRates),
    syncQueue: repository(db.syncQueue),
  };
}

export type FinanceRepositories = ReturnType<typeof createRepositories>;

export const financeRepositories = createRepositories();
