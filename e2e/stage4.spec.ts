import { expect, test } from '@playwright/test';

test('stage 4 currency and analytics smoke flow', async ({ page }) => {
  await page.goto('/');
  await page.locator('.seed-categories').click();
  await page.locator('.quick-account-add').click();
  await page.locator('input[name="name"]').fill('Stage 4 account');
  await page.locator('input[name="openingBalance"]').fill('1000');
  await page.locator('form button.primary').click();
  await page.locator('.nav-fab').click();
  await page.locator('input[name="amount"]').fill('25');
  await page.locator('select[name="accountId"]').selectOption({ index: 1 });
  await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
  await page.locator('.modal form button.primary').click();
  await expect(page.locator('.notice.success')).toContainText('Операция');
  await page.locator('.bottom-nav button').nth(2).click();
  await expect(page.locator('h1', { hasText: 'Статистика' })).toBeVisible();
  await expect(page.locator('.rate-card')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Экспорт CSV' })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/stage4-statistics.png', fullPage: true });
});
