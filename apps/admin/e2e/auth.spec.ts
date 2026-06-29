import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('navigates to login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login|\/$/);
  });

  test('shows login form elements', async ({ page }) => {
    await page.goto('/(auth)/login');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows validation error for empty submission', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/(auth)/login');
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('navigates to register page', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByText('Create one').click();
    await expect(page).toHaveURL(/register/);
  });

  test('navigates to forgot password page', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe('Register Flow', () => {
  test('shows step 1 form', async ({ page }) => {
    await page.goto('/(auth)/register');
    await expect(page.getByText('Organization')).toBeVisible();
    await expect(page.getByLabel('Organization Name')).toBeVisible();
  });

  test('navigates through multi-step form', async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.getByLabel('Organization Name').fill('Test Farm');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Your Account')).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
  });

  test('navigates back to step 1', async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.getByLabel('Organization Name').fill('Test Farm');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Organization')).toBeVisible();
  });
});

test.describe('Forgot Password Flow', () => {
  test('shows email input', async ({ page }) => {
    await page.goto('/(auth)/forgot-password');
    await expect(page.getByText('Forgot Password?')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('shows success state after submission', async ({ page }) => {
    await page.goto('/(auth)/forgot-password');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByText('Check Your Email')).toBeVisible();
  });
});
