import { expect, test } from '@playwright/test';
test('opens the quick expense form', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible(); await page.getByRole('button', { name: 'Расход' }).click(); await expect(page.getByRole('dialog')).toContainText('Новый расход'); });
