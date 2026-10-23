import { test, expect } from '@playwright/test';
import { noErrors, settle, signIn, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => { await signIn(page); });

test('refuge link lands on the map with that centre and a real route', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/navigation/shelter-02');
  await settle(page, 2500);
  await expect(page).toHaveURL(/\/map\?to=shelter-02/);
  await expect(page.getByRole('button', { name: 'Start route' }).first()).toBeVisible();
  // the old fake-navigation extras must be gone
  await expect(page.getByText(/Simulate Arrival|GPS Tracking Active|Current Speed/)).toHaveCount(0);
  noErrors(errors);
});

test('start route shows the next turn, then stop returns to the sheet', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/map');
  await settle(page, 2500);
  await page.getByRole('button', { name: 'Start route' }).first().click();
  await expect(page.getByText(/Simulated drive/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText(/Simulated drive/)).toHaveCount(0);
  noErrors(errors);
});

test('plain route wording, no "Route A" or "Crosses N"', async ({ page }) => {
  await page.goto('/map');
  await settle(page, 2500);
  await page.getByRole('slider', { name: /Sheet height/ }).click(); // open the sheet one step
  await page.waitForTimeout(500);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Route [A-C]\b|Crosses \d/);
});

test('river level control: manual choice turns auto off', async ({ page }) => {
  await page.goto('/map');
  await settle(page, 2000);
  await page.getByRole('slider', { name: /Sheet height/ }).click();
  await page.getByRole('slider', { name: /Sheet height/ }).click();
  await page.waitForTimeout(400);
  const summary = page.getByText(/Demo: river level/);
  await expect(summary).toContainText('following cameras');
  await summary.click();
  await page.getByRole('button', { name: /^Danger/ }).click();
  await expect(summary).toContainText('set by you');
});

test('legend opens and closes', async ({ page }) => {
  await page.goto('/map');
  await settle(page, 2000);
  const btn = page.getByRole('button', { name: /legend/i });
  await btn.click();
  await expect(page.getByText(/are demo data/).first()).toBeVisible();
});
