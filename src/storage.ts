import { AppData, DEFAULT_DATA } from './domain';
import { financeRepositories } from './infrastructure/repositories';

const LEGACY_KEY = 'finance-pwa:data:v1';

function legacyData(): AppData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY); if (!raw) return null;
    return { ...structuredClone(DEFAULT_DATA), ...(JSON.parse(raw) as Partial<AppData>) };
  } catch { return null; }
}

export async function loadData(): Promise<AppData> {
  const r = financeRepositories;
  const [accounts, categories, transactions, transfers, budgets, goals, goalAllocations, exchangeRates, syncQueue] = await Promise.all([
    r.accounts.list(true), r.categories.list(true), r.transactions.list(true), r.transfers.list(true), r.budgets.list(true), r.goals.list(true), r.goalAllocations.list(true), r.exchangeRates.list(true), r.syncQueue.list(true),
  ]);
  const current = { accounts, categories, transactions, transfers, budgets, goals, goalAllocations, exchangeRates, syncQueue };
  if (Object.values(current).some((items) => items.length)) return current;
  const migrated = legacyData();
  if (migrated) { await saveData(migrated); return migrated; }
  return structuredClone(DEFAULT_DATA);
}

export async function saveData(data: AppData): Promise<void> {
  const r = financeRepositories;
  await r.db.transaction('rw', r.db.tables, async () => {
    await Promise.all([
      r.db.accounts.bulkPut(data.accounts), r.db.categories.bulkPut(data.categories), r.db.transactions.bulkPut(data.transactions), r.db.transfers.bulkPut(data.transfers), r.db.budgets.bulkPut(data.budgets), r.db.goals.bulkPut(data.goals), r.db.goalAllocations.bulkPut(data.goalAllocations), r.db.exchangeRates.bulkPut(data.exchangeRates), r.db.syncQueue.bulkPut(data.syncQueue),
    ]);
  });
}
