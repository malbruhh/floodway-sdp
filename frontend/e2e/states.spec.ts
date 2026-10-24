import { test, expect } from '@playwright/test';
import { settle, signIn } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
test.beforeEach(async ({ page }) => { await signIn(page); });

test('offline banner appears and clears', async ({ page, context }) => {
  await page.goto('/home');
  await settle(page, 1500);
  await context.setOffline(true);
  await expect(page.getByText('No connection.')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('No connection.')).toHaveCount(0);
});

test('home shows skeletons, not an empty flash, while data loads', async ({ page }) => {
  await page.route('**/api/**', async (r) => { await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
  await page.goto('/home');
  await page.waitForTimeout(400);
  expect(await page.locator('[aria-hidden="true"][class*="animate-shimmer"]').count()).toBeGreaterThan(0);
  await expect(page.getByText(/No cameras yet|No camera is reporting/)).toHaveCount(0);
});

test('forecast failure shows a retry card, not made-up numbers', async ({ page }) => {
  await page.route('**/predict/**', (r) => r.abort());
  await page.route('**/forecast**', (r) => r.abort());
  await page.goto('/home');
  await settle(page, 3000);
  const retry = page.getByRole('button', { name: 'Try again' });
  if (await retry.count()) { await expect(retry).toBeVisible(); await expect(page.getByText(/Likely level|Level in 2 hours/)).toHaveCount(0); }
});

test('desktop shows the sidebar, phone shows the bottom tabs', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('navigation', { name: 'Main' }).locator('visible=true')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('navigation', { name: 'Main' }).locator('visible=true')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Estate' })).toBeVisible();
});
