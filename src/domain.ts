export type Currency = 'RUB' | 'USD';
export type EntryType = 'income' | 'expense';

export type Account = {
  id: string;
  name: string;
  currency: Currency;
  openingBalanceMinor: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Category = {
  id: string;
  name: string;
  type: EntryType;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Transaction = {
  id: string;
  type: EntryType;
  amountMinor: number;
  currency: Currency;
  originalAmountMinor: number;
  exchangeRate: number;
  amountRubMinor: number;
  amountUsdMinor: number;
  accountId: string;
  categoryId: string;
  note: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Transfer = {
  id: string;
  amountMinor: number;
  currency: Currency;
  fromAccountId: string;
  toAccountId: string;
  note: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type BudgetPeriod = 'week' | 'month' | 'custom';

export type Budget = {
  id: string;
  name: string;
  categoryId?: string;
  amountMinor: number;
  currency: Currency;
  period: BudgetPeriod;
  startsAt: string;
  endsAt: string;
  warningPercent: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmountMinor: number;
  currency: Currency;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type GoalAllocation = {
  id: string;
  goalId: string;
  accountId: string;
  amountMinor: number;
  currency: Currency;
  allocatedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ExchangeRate = {
  id: string;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: number;
  source: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SyncQueueItem = {
  id: string;
  entity: 'account' | 'category' | 'transaction' | 'transfer' | 'budget' | 'goal' | 'goalAllocation' | 'exchangeRate';
  entityId: string;
  operation: 'upsert' | 'delete';
  payload: unknown;
  attempts: number;
  nextAttemptAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type AppData = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
  budgets: Budget[];
  goals: Goal[];
  goalAllocations: GoalAllocation[];
  exchangeRates: ExchangeRate[];
  syncQueue: SyncQueueItem[];
};

export const DEFAULT_DATA: AppData = { accounts: [], categories: [], transactions: [], transfers: [], budgets: [], goals: [], goalAllocations: [], exchangeRates: [], syncQueue: [] };

export const newId = (): string => crypto.randomUUID();

export function parseAmount(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Введите положительную сумму с максимум двумя знаками после запятой');
  const amount = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Сумма должна быть больше нуля');
  return amount;
}

export function formatAmount(minor: number, currency: Currency): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
}

export function validateTransactionInput(input: Pick<Transaction, 'type' | 'amountMinor' | 'accountId' | 'categoryId'>): void {
  if (!['income', 'expense'].includes(input.type)) throw new Error('Выберите тип операции');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Сумма должна быть больше нуля');
  if (!input.accountId) throw new Error('Выберите счёт');
  if (!input.categoryId) throw new Error('Выберите категорию');
}

export function validateTransferInput(input: Pick<Transfer, 'amountMinor' | 'fromAccountId' | 'toAccountId'>): void {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Сумма должна быть больше нуля');
  if (!input.fromAccountId || !input.toAccountId) throw new Error('Выберите оба счёта');
  if (input.fromAccountId === input.toAccountId) throw new Error('Счета перевода должны отличаться');
}

export function active<T extends { deletedAt?: string }>(items: T[]): T[] { return items.filter((item) => !item.deletedAt); }

export type AccountBalance = { accountId: string; rubMinor: number; usdMinor: number };

export function calculateAccountBalances(data: Pick<AppData, 'accounts' | 'transactions' | 'transfers'>): AccountBalance[] {
  const result = new Map(data.accounts.filter((account) => !account.deletedAt).map((account) => [account.id, {
    accountId: account.id,
    rubMinor: account.currency === 'RUB' ? account.openingBalanceMinor : 0,
    usdMinor: account.currency === 'USD' ? account.openingBalanceMinor : 0,
  }]));
  active(data.transactions).forEach((item) => {
    const balance = result.get(item.accountId); if (!balance) return;
    const sign = item.type === 'income' ? 1 : -1;
    if (item.currency === 'RUB') balance.rubMinor += sign * item.amountMinor;
    else balance.usdMinor += sign * item.amountMinor;
  });
  active(data.transfers).forEach((item) => {
    const from = result.get(item.fromAccountId); const to = result.get(item.toAccountId); if (!from || !to) return;
    const key = item.currency === 'RUB' ? 'rubMinor' : 'usdMinor';
    from[key] -= item.amountMinor; to[key] += item.amountMinor;
  });
  return [...result.values()];
}

export function budgetUsage(budget: Budget, transactions: Transaction[]): number {
  return active(transactions).filter((item) => item.type === 'expense' && item.currency === budget.currency && item.occurredAt >= budget.startsAt && item.occurredAt <= budget.endsAt && (!budget.categoryId || item.categoryId === budget.categoryId)).reduce((sum, item) => sum + item.amountMinor, 0);
}

export function goalProgress(goal: Goal, allocations: GoalAllocation[]): { allocatedMinor: number; remainingMinor: number; percent: number; dailyMinor: number; weeklyMinor: number; monthlyMinor: number } {
  const allocatedMinor = active(allocations).filter((item) => item.goalId === goal.id && item.currency === goal.currency).reduce((sum, item) => sum + item.amountMinor, 0);
  const remainingMinor = Math.max(0, goal.targetAmountMinor - allocatedMinor);
  const days = Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000));
  return { allocatedMinor, remainingMinor, percent: Math.min(100, Math.round((allocatedMinor / goal.targetAmountMinor) * 100)), dailyMinor: Math.ceil(remainingMinor / days), weeklyMinor: Math.ceil(remainingMinor / Math.max(1, Math.ceil(days / 7))), monthlyMinor: Math.ceil(remainingMinor / Math.max(1, Math.ceil(days / 30))) };
}
