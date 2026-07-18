import { AppData } from '../../domain';
import { findOrCreateSpreadsheet, readSheetRows, SHEET_NAMES, writeSheetRows } from './sheets';
import { lastWriteWins, parseCloudRow } from './serialization';

type EntityKey = keyof Pick<AppData, 'transactions' | 'transfers' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'goalAllocations' | 'exchangeRates'>;
const DATA_SHEETS: Array<[EntityKey, (typeof SHEET_NAMES)[number]]> = [['transactions', 'Операции'], ['transfers', 'Переводы'], ['accounts', 'Счета'], ['categories', 'Категории'], ['budgets', 'Бюджеты'], ['goals', 'Цели'], ['goalAllocations', 'Распределения целей'], ['exchangeRates', 'Курсы валют']];
const headers = ['uuid', 'updatedAt', 'deletedAt', 'payload'];

export function mergeRows<T extends { id: string; updatedAt: string }>(local: T[], remoteRows: unknown[][]): T[] {
  const merged = new Map(local.map((item) => [item.id, item]));
  remoteRows.slice(1).forEach((row) => { const parsed = parseCloudRow(row); if (!parsed || !parsed.payload || typeof parsed.payload !== 'object') return; const remote = parsed.payload as T; if (remote.id !== parsed.id || typeof remote.updatedAt !== 'string') return; merged.set(remote.id, lastWriteWins(merged.get(remote.id), remote)); });
  return [...merged.values()];
}

export async function syncDataWithGoogle(token: string, data: AppData): Promise<{ data: AppData; spreadsheetId: string }> {
  const spreadsheet = await findOrCreateSpreadsheet(token);
  const merged = { ...data };
  for (const [key, sheet] of DATA_SHEETS) {
    const remoteRows = await readSheetRows(token, spreadsheet.spreadsheetId, sheet);
    const localRows = data[key] as Array<{ id: string; updatedAt: string; deletedAt?: string }>;
    const mergedRows = mergeRows(localRows, remoteRows);
    merged[key] = mergedRows as never;
    await writeSheetRows(token, spreadsheet.spreadsheetId, sheet, [headers, ...mergedRows.map((item) => [item.id, item.updatedAt, item.deletedAt ?? '', JSON.stringify(item)])]);
  }
  return { data: merged, spreadsheetId: spreadsheet.spreadsheetId };
}

export async function syncLocalDataToGoogle(token: string, data: AppData): Promise<{ spreadsheetId: string }> {
  const result = await syncDataWithGoogle(token, data);
  return { spreadsheetId: result.spreadsheetId };
}
