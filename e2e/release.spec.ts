import { expect, test } from '@playwright/test';

test('release smoke keeps desktop and iPhone layouts usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/screenshots/release-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/screenshots/release-iphone.png', fullPage: true });
});
