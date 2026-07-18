import { describe, expect, it } from 'vitest';
import { lastWriteWins, parseCloudRow, serializeQueueItem } from '../src/infrastructure/google/serialization';
import { SHEET_NAMES } from '../src/infrastructure/google/sheets';
import { enqueueChanges, markQueueRetry } from '../src/infrastructure/google/serialization';
import { mergeRows } from '../src/infrastructure/google/sync';
import { DEFAULT_DATA } from '../src/domain';
describe('Google sync contract', () => {
  it('serializes UUID rows and imports them', () => { const item = { id: 'q', entity: 'transaction' as const, entityId: 'tx-1', operation: 'upsert' as const, payload: { amountMinor: 100 }, attempts: 0, nextAttemptAt: '', createdAt: '', updatedAt: '2026-07-18T10:00:00.000Z' }; expect(parseCloudRow(serializeQueueItem(item))).toMatchObject({ id: 'tx-1', payload: { amountMinor: 100 } }); });
  it('keeps the newest version and preserves soft deletes', () => { const old = { id: 'a', updatedAt: '2026-07-18T09:00:00.000Z', name: 'old' }; const newer = { id: 'a', updatedAt: '2026-07-18T10:00:00.000Z', name: 'new', deletedAt: '2026-07-18T10:00:00.000Z' }; expect(lastWriteWins(old, newer)).toEqual(newer); });
  it('defines the complete human-readable spreadsheet schema', () => { expect(SHEET_NAMES).toHaveLength(10); expect(SHEET_NAMES).toContain('Сводка'); });
  it('merges a newer remote entity and keeps remote soft deletes', () => { const local = [{ id: 'a', updatedAt: '2026-07-18T10:00:00.000Z', name: 'local' }]; const remote = [['uuid', 'updatedAt', 'deletedAt', 'payload'], ['a', '2026-07-18T11:00:00.000Z', '2026-07-18T11:00:00.000Z', JSON.stringify({ id: 'a', updatedAt: '2026-07-18T11:00:00.000Z', name: 'remote', deletedAt: '2026-07-18T11:00:00.000Z' })]]; expect(mergeRows(local, remote)[0]).toMatchObject({ name: 'remote', deletedAt: '2026-07-18T11:00:00.000Z' }); });
  it('queues changed entities and schedules exponential retry', () => { const next = { ...DEFAULT_DATA, accounts: [{ id: 'a', name: 'Cash', currency: 'RUB' as const, openingBalanceMinor: 0, createdAt: '2026-07-18T10:00:00.000Z', updatedAt: '2026-07-18T10:00:00.000Z' }] }; const queued = enqueueChanges(DEFAULT_DATA, next); expect(queued.syncQueue).toHaveLength(1); const retried = markQueueRetry(queued, new Date('2026-07-18T10:00:00.000Z')); expect(retried.syncQueue[0].attempts).toBe(1); expect(retried.syncQueue[0].nextAttemptAt).toBe('2026-07-18T10:00:02.000Z'); });
});
