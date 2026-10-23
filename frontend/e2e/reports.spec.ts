import { test, expect } from '@playwright/test';
import { noErrors, settle, signIn, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
test.beforeEach(async ({ page }) => { await signIn(page); });

test('list shows time groups and plain counters', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/reports');
  await settle(page, 1200);
  await expect(page.getByRole('region', { name: 'Last 30 minutes' })).toBeVisible();
  await expect(page.getByText('Not verified', { exact: true }).first()).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Flash Hazards|AI Active|🚨/);
  noErrors(errors);
});

test('form opens from Home link, starts with no photo, and shows inline errors', async ({ page }) => {
  await page.goto('/reports?new=1');
  await settle(page, 800);
  const dialog = page.getByRole('dialog', { name: 'Report flooding' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img[alt="Your photo"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(dialog.getByText(/Say what you see/)).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('a report can be sent, confirmed, and then appears in the list', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/reports');
  await settle(page, 1000);
  await page.getByRole('button', { name: /Report flooding here/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Report flooding' });
  await dialog.getByLabel('What do you see?').fill('Water over the road near the school');
  await dialog.getByLabel('Where is it?').fill('Kampung Baru');
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByRole('dialog', { name: 'Report sent' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/not verified/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Water over the road near the school')).toBeVisible();
  noErrors(errors);
});

test('example photo fills the form and photo check reports honestly', async ({ page }) => {
  await page.goto('/reports?new=1');
  const dialog = page.getByRole('dialog', { name: 'Report flooding' });
  await dialog.getByText('No photo handy? Try an example').click();
  await dialog.getByRole('button', { name: /Drain overflow/ }).click();
  await expect(dialog.locator('img[alt="Your photo"]')).toBeVisible();
  await dialog.getByRole('button', { name: 'Check the photo' }).click();
  await expect(dialog.getByRole('status').filter({ hasText: /AI opinion|Photo check unavailable/ })).toBeVisible({ timeout: 50000 });
});

test('escape closes the sheet', async ({ page }) => {
  await page.goto('/reports?new=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('review desk approve moves a report to published', async ({ page }) => {
  await page.goto('/reports');
  await page.getByRole('button', { name: /Review desk/ }).click();
  const before = await page.getByRole('button', { name: /Approve/ }).count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Approve/ }).first().click();
  await expect(page.getByRole('button', { name: /Approve/ })).toHaveCount(before - 1);
});
