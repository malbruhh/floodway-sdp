import { test, expect } from '@playwright/test';
import { noErrors, settle, signIn, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
test.beforeEach(async ({ page }) => { await signIn(page); });

test('Cameras page has plain wording and no camera ids or jargon', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/live');
  await settle(page, 2500);
  await expect(page.getByRole('heading', { name: 'Cameras', exact: true })).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/CAM-\d|% of bank|Reference lines|Human review|AI output and history|\bWaterline\b/);
  noErrors(errors);
});

test('home camera tile opens that camera', async ({ page }) => {
  await page.goto('/home');
  await settle(page, 2500);
  await page.getByRole('link', { name: /Open the .* camera full screen/ }).click();
  await expect(page).toHaveURL(/\/live\?camera=/);
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
});

test('level lines switch toggles and developer panel is folded', async ({ page }) => {
  await page.goto('/live');
  await settle(page, 2500);
  const sw = page.getByRole('button', { name: 'Show level lines' });
  await expect(sw).toHaveAttribute('aria-pressed', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-pressed', 'false');
  const dev = page.getByRole('button', { name: /For developers/ });
  await expect(dev).toHaveAttribute('aria-expanded', 'false');
  await dev.click();
  await expect(page.getByText(/water_ratio|"level"/).first()).toBeVisible();
});

test('JPS tab explains what JPS is and how it differs', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/live');
  await settle(page, 1500);
  await page.getByRole('button', { name: 'JPS photos' }).click();
  await expect(page.getByText(/Jabatan Pengairan dan Saliran/)).toBeVisible();
  await expect(page.getByText(/the rest are photos only/)).toBeVisible();
  await page.waitForTimeout(2500);
  noErrors(errors);
});

test('add camera wizard: opens, validates, closes', async ({ page }) => {
  await page.goto('/live');
  await settle(page, 2000);
  await page.getByRole('button', { name: 'Add my camera' }).locator('visible=true').first().click();
  const dlg = page.getByRole('dialog', { name: 'Add my camera' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText('Live video link')).toBeVisible();
  await expect(dlg.getByText(/RTSP|HLS|Snapshot URL|Latitude/)).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Next' }).click();
  await expect(dlg.getByText('Give the camera a name.')).toBeVisible();
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await expect(dlg).toHaveCount(0);
});

test('blocked-notification note can be dismissed', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Notification', { value: class { static permission = 'denied'; static requestPermission = async () => 'denied'; }, configurable: true });
  });
  await page.goto('/live');
  await settle(page, 2500);
  const note = page.getByText(/Phone alerts are blocked/);
  await expect(note).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(note).toHaveCount(0);
});
