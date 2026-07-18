import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: 'e2e', webServer: { command: 'npm run preview -- --host 127.0.0.1', port: 4173, timeout: 120_000, reuseExistingServer: true }, use: { baseURL: 'http://127.0.0.1:4173' } });
