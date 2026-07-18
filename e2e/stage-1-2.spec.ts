import { expect, test } from '@playwright/test';

test('creates an account and expense, calculates balance, and restores after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Добавить счёт', exact: true }).click();
  await page.getByRole('textbox', { name: 'Название счёта' }).fill('Основной');
  await page.getByRole('textbox', { name: 'Начальный баланс' }).fill('1000');
  await page.getByRole('button', { name: 'Создать счёт' }).click();
  await page.getByRole('button', { name: 'Добавить категории', exact: true }).click();
  await page.getByRole('button', { name: '− Расход' }).click();
  await page.getByRole('textbox', { name: 'Сумма' }).fill('250');
  await page.locator('select[name="accountId"]').selectOption({ label: 'Основной' });
  await page.locator('select[name="categoryId"]').selectOption({ label: 'Продукты' });
  await page.getByRole('textbox', { name: 'Комментарий' }).fill('Обед');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Операция сохранена');
  await expect(page.getByText('Обед · Основной')).toBeVisible();
  await expect(page.getByText('750,00 ₽', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.account').filter({ hasText: 'Основной' })).toBeVisible();
  await expect(page.getByText('Обед · Основной')).toBeVisible();
});
