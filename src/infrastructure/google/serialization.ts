import { AppData, SyncQueueItem, newId } from '../../domain';
export type CloudRow = [string, string, string, string];
export function serializeQueueItem(item: SyncQueueItem): CloudRow { return [item.entityId, item.updatedAt, item.deletedAt ?? '', JSON.stringify(item.payload)]; }
export function parseCloudRow(row: unknown[]): { id: string; updatedAt: string; deletedAt?: string; payload: unknown } | null { if (typeof row[0] !== 'string' || typeof row[1] !== 'string' || typeof row[3] !== 'string') return null; try { return { id: row[0], updatedAt: row[1], ...(row[2] ? { deletedAt: String(row[2]) } : {}), payload: JSON.parse(row[3]) }; } catch { return null; } }
export function lastWriteWins<T extends { id: string; updatedAt: string }>(local: T | undefined, remote: T): T { return !local || remote.updatedAt > local.updatedAt ? remote : local; }
export function queueForData(data: AppData): SyncQueueItem[] { return data.syncQueue.filter((item) => new Date(item.nextAttemptAt).getTime() <= Date.now()); }

const ENTITY_KEYS: Array<[keyof AppData, SyncQueueItem['entity']]> = [['accounts', 'account'], ['categories', 'category'], ['transactions', 'transaction'], ['transfers', 'transfer'], ['budgets', 'budget'], ['goals', 'goal'], ['goalAllocations', 'goalAllocation'], ['exchangeRates', 'exchangeRate']];

export function enqueueChanges(previous: AppData, next: AppData): AppData {
  const now = new Date().toISOString();
  const additions: SyncQueueItem[] = [];
  ENTITY_KEYS.forEach(([key, entity]) => {
    const oldById = new Map((previous[key] as Array<{ id: string }>).map((item) => [item.id, item]));
    (next[key] as Array<{ id: string; updatedAt: string; deletedAt?: string }>).forEach((item) => {
      const old = oldById.get(item.id);
      if (JSON.stringify(old) === JSON.stringify(item)) return;
      additions.push({ id: newId(), entity, entityId: item.id, operation: item.deletedAt ? 'delete' : 'upsert', payload: item, attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now });
    });
  });
  const all = [...previous.syncQueue, ...additions];
  const latest = new Map<string, SyncQueueItem>();
  all.forEach((item) => latest.set(`${item.entity}:${item.entityId}`, item));
  return { ...next, syncQueue: [...latest.values()] };
}

export function markQueueRetry(data: AppData, now = new Date()): AppData {
  const updated = data.syncQueue.map((item) => { const attempts = item.attempts + 1; const delay = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 10)); return { ...item, attempts, nextAttemptAt: new Date(now.getTime() + delay).toISOString(), updatedAt: now.toISOString() }; });
  return { ...data, syncQueue: updated };
}
