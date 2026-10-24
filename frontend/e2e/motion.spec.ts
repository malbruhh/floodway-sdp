// Motion: open, active and closed states animate; reduced motion switches it all off; animation never causes sideways scroll.
import { test, expect } from '@playwright/test';
import { noErrors, settle, signIn, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
test.beforeEach(async ({ page }) => { await signIn(page); });

const cls = (l: import('@playwright/test').Locator) => l.evaluate((e) => e.className as string);

test('sheet slides in, and slides out before it is removed', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/reports');
  await settle(page, 800);
  await page.getByRole('button', { name: /Report flooding here/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Report flooding' });
  await expect(dialog).toBeVisible();
  expect(await cls(dialog)).toContain('animate-sheet-in');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.keyboard.press('Escape');
  expect(await cls(dialog)).toContain('animate-sheet-out'); // still mounted, playing the exit
  await expect(dialog).toHaveCount(0, { timeout: 2000 });
  noErrors(errors);
});

test('area menu pops open and closed', async ({ page }) => {
  await page.goto('/home');
  await settle(page, 800);
  const btn = page.getByRole('button', { name: /Kampung Baru|Masjid|Sentul|Chow/ }).first();
  await btn.click();
  const list = page.getByRole('listbox', { name: 'Choose area' });
  await expect(list).toBeVisible();
  expect(await cls(list)).toContain('animate-pop-in');
  await btn.click();
  expect(await cls(list)).toContain('animate-pop-out');
  await expect(list).toHaveCount(0, { timeout: 2000 });
});

test('pressing a control scales it down (active state)', async ({ page }) => {
  await page.goto('/profile');
  await settle(page, 600);
  const btn = page.getByRole('button', { name: 'Add a contact' });
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const transform = await btn.evaluate((e) => getComputedStyle(e).transform);
  await page.mouse.up();
  expect(transform).not.toBe('none');
});

test('validation error shakes the field and rises in the message', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const input = page.getByLabel('Your name');
  expect(await cls(input)).toContain('animate-shake');
  expect(await cls(page.getByText('Enter your name.'))).toContain('animate-rise');
});

test('pages fade in on navigation, lists rise in', async ({ page }) => {
  await page.goto('/home');
  await settle(page, 600);
  await page.getByRole('link', { name: 'Report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  const card = page.locator('article').first();
  expect(await cls(card)).toContain('animate-rise');
});

test('live updates flash and pending buttons show a spinner', async ({ page }) => {
  await page.goto('/reports?new=1');
  const dialog = page.getByRole('dialog', { name: 'Report flooding' });
  await dialog.getByLabel('What do you see?').fill('Water over the road near the school');
  await page.route('**/api/v1/reports**', async (r) => { await new Promise((x) => setTimeout(x, 1200)); await r.continue(); });
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(dialog.locator('.animate-spin-soft')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Report sent' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('dialog', { name: 'Report sent' }).locator('.animate-check')).toBeVisible();
});

test('offline banner slides in and fades out', async ({ page, context }) => {
  await page.goto('/home');
  await settle(page, 800);
  await context.setOffline(true);
  const banner = page.getByRole('status').filter({ hasText: 'No connection.' });
  await expect(banner).toBeVisible();
  expect(await cls(banner)).toContain('animate-banner-in');
  await context.setOffline(false);
  await expect(banner).toHaveCount(0, { timeout: 2000 });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('animations collapse to ~0 ms', async ({ page }) => {
    await page.goto('/reports?new=1');
    const dialog = page.getByRole('dialog', { name: 'Report flooding' });
    await expect(dialog).toBeVisible();
    const ms = await dialog.evaluate((e) => parseFloat(getComputedStyle(e).animationDuration) * 1000);
    expect(ms).toBeLessThan(1);
  });
});
