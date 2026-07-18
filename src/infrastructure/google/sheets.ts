export const SHEET_NAMES = ['Операции', 'Переводы', 'Счета', 'Категории', 'Бюджеты', 'Цели', 'Распределения целей', 'Курсы валют', 'Настройки', 'Сводка'] as const;
export type SheetName = typeof SHEET_NAMES[number];
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
export class GoogleApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

async function request<T>(url: string, token: string, init: RequestInit = {}, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } });
    if (response.ok) return response.status === 204 ? undefined as T : await response.json() as T;
    if (![401, 429, 500, 502, 503, 504].includes(response.status) || attempt >= retries) { let message = response.statusText; try { const body = await response.json() as { error?: { message?: string } }; message = body.error?.message ?? message; } catch { /* empty body */ } throw new GoogleApiError(response.status, `Google API (${response.status}): ${message}`); }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
  }
}
export type Spreadsheet = { spreadsheetId: string; properties: { title: string }; sheets?: Array<{ properties: { title: string } }> };
export async function findOrCreateSpreadsheet(token: string, title = 'Finance PWA'): Promise<Spreadsheet> {
  const found = await request<{ files?: Array<{ id: string; name: string }> }>(`${DRIVE_API}?q=${encodeURIComponent(`name='${title.replaceAll("'", "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`)}&spaces=drive&fields=files(id,name)`, token);
  if (found.files?.[0]) return request<Spreadsheet>(`${API}/${found.files[0].id}`, token);
  const created = await request<Spreadsheet>(API, token, { method: 'POST', body: JSON.stringify({ properties: { title } }) });
  const defaultSheetId = 0;
  await request(`${API}/${created.spreadsheetId}:batchUpdate`, token, { method: 'POST', body: JSON.stringify({ requests: [{ updateSheetProperties: { properties: { sheetId: defaultSheetId, title: SHEET_NAMES[0] }, fields: 'title' } }, ...SHEET_NAMES.slice(1).map((sheetTitle) => ({ addSheet: { properties: { title: sheetTitle } } }))] }) });
  return request<Spreadsheet>(`${API}/${created.spreadsheetId}`, token);
}
export async function writeSheetRows(token: string, spreadsheetId: string, sheet: SheetName, rows: unknown[][]): Promise<void> { await request(`${API}/${spreadsheetId}/values/${encodeURIComponent(`${sheet}!A1`)}?valueInputOption=RAW`, token, { method: 'PUT', body: JSON.stringify({ range: `${sheet}!A1`, majorDimension: 'ROWS', values: rows }) }); }
export async function readSheetRows(token: string, spreadsheetId: string, sheet: SheetName): Promise<unknown[][]> { const result = await request<{ values?: unknown[][] }>(`${API}/${spreadsheetId}/values/${encodeURIComponent(`${sheet}!A:Z`)}`, token); return result.values ?? []; }
