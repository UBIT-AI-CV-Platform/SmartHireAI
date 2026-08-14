import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000';

test('landing page loads', async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveTitle(/SmartHire/);
});

test('unauthenticated /candidate redirects to /auth', async ({ page }) => {
  await page.goto(`${URL}/candidate`);
  await expect(page).toHaveURL(/\/auth/);
});

test('unauthenticated /recruiter redirects to /auth', async ({ page }) => {
  await page.goto(`${URL}/recruiter`);
  await expect(page).toHaveURL(/\/auth/);
});

test('auth page has login tab and google button', async ({ page }) => {
  await page.goto(`${URL}/auth`);
  await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible();
  await expect(page.getByText('Continue with Google')).toBeVisible();
});

test('landing page hero heading visible', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole('heading', { name: /Smart Recruitment/ })).toBeVisible();
});

test('signup form shows candidate and recruiter role options', async ({ page }) => {
  await page.goto(`${URL}/auth`);
  await page.getByRole('button', { name: 'Sign Up' }).first().click();
  await expect(page.getByText('CANDIDATE')).toBeVisible();
  await expect(page.getByText(/RECRUITER/i)).toBeVisible();
});
