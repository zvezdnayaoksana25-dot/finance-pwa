import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { financeRepositories } from '../src/infrastructure/repositories';

describe('App reference shell', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the dashboard and opens quick-add from the central action', async () => {
    await financeRepositories.db.delete();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ rates: { RUB: 90 } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(host.querySelector('h1')?.textContent).toBe('Обзор');

    const addButton = host.querySelector('button[aria-label="Добавить"]');
    expect(addButton).toBeTruthy();
    await act(async () => { (addButton as HTMLButtonElement).click(); });
    expect(host.textContent).toContain('Быстрый ввод');
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    root.unmount();
  });
});
