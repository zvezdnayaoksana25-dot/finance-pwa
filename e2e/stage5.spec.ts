import { expect, test } from '@playwright/test';

test('stage 5 exposes install metadata, onboarding and offline local-first flow', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();

  await page.getByRole('button', { name: 'Старт' }).click();
  await expect(page.getByRole('heading', { name: 'Настройте Финансы за минуту' })).toBeVisible();
  await page.getByRole('button', { name: 'Создать первый счёт' }).click();
  await page.getByRole('button', { name: 'Добавить счёт' }).first().click();
  await page.getByRole('textbox', { name: 'Название счёта' }).fill('Офлайн счёт');
  await page.getByRole('button', { name: 'Создать счёт' }).click();
  await page.getByRole('button', { name: 'Добавить категории', exact: true }).click();

  await page.getByRole('button', { name: 'Переключить тему' }).click();
  await expect(page.locator('.app')).not.toHaveClass(/dark/);

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Расход' }).first().click();
  await page.getByRole('textbox', { name: 'Сумма' }).fill('10');
  await page.locator('select[name="accountId"]').selectOption({ label: 'Офлайн счёт' });
  await page.locator('select[name="categoryId"]').selectOption({ label: 'Продукты' });
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Операция сохранена');
  await context.setOffline(false);
});
