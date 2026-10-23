import { test, expect } from '@playwright/test';
import { noErrors, settle, watchErrors } from './helpers';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('empty form shows inline errors and stays on the page', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await settle(page, 500);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  await expect(page.getByText('Enter your email.')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  noErrors(errors);
});

test('bad email is explained', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Aina');
  await page.getByLabel('Email').fill('aina@');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(/does not look right/)).toBeVisible();
});

test('own name signs in and shows on Me', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByLabel('Your name').fill('Aina Rahman');
  await page.getByLabel('Email').fill('aina@example.com');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.getByRole('link', { name: 'Me', exact: true }).click();
  await expect(page.getByText('Aina Rahman').first()).toBeVisible();
  noErrors(errors);
});

test('demo user goes straight to Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue as demo user/ }).click();
  await expect(page).toHaveURL(/\/home/);
});
