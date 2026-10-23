import { test, expect } from '@playwright/test';
import { noErrors, settle, signIn, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('shows the signed-in name and no jargon; Advanced is folded', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/profile');
    await settle(page, 800);
    await expect(page.getByRole('heading', { name: 'Demo User' })).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Citizen Responder|LifeLine|Luqman/);
    await expect(page.getByLabel('Operator token')).toBeHidden();
    await page.getByText('Advanced', { exact: true }).click();
    await expect(page.getByLabel('Operator token')).toBeVisible();
    noErrors(errors);
  });

  test('add family contact: validation, then success and persistence', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Add a contact' }).click();
    await page.getByRole('button', { name: 'Save contact' }).click();
    await expect(page.getByText(/Enter a name/)).toBeVisible();
    await expect(page.getByText(/8 to 15 digits/)).toBeVisible();
    await page.getByLabel('Name', { exact: true }).fill('Uncle Hadi');
    await page.getByLabel('Phone number').fill('+60 17-555 1234');
    await page.getByRole('button', { name: 'Save contact' }).click();
    await expect(page.getByText('Uncle Hadi added.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Uncle Hadi')).toBeVisible();
    await expect(page.getByText(/· example/)).toHaveCount(0); // real contact replaced the examples
  });

  test('remove a contact', async ({ page }) => {
    await page.goto('/profile');
    await settle(page, 500);
    await page.getByRole('button', { name: /^Remove / }).first().click();
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(1);
  });

  test('sign out returns to the welcome page and sticks after reload', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/home');
    await expect(page).toHaveURL(/\/$/);
  });
});
