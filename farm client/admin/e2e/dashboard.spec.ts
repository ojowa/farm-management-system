import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('shows dashboard content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('shows stats cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[class*="stats"]').first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('sidebar has all main links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Farms' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crops' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Livestock' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Poultry' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Finance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('navigates to farms page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Farms' }).click();
    await expect(page).toHaveURL(/farms/);
    await expect(page.getByText('Farms')).toBeVisible();
  });

  test('navigates to crops page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Crops' }).click();
    await expect(page).toHaveURL(/crops/);
    await expect(page.getByText('Crops')).toBeVisible();
  });

  test('navigates to settings page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/settings/);
    await expect(page.getByText('Settings')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('sidebar collapses on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    // Sidebar should be hidden or collapsed on mobile
    await expect(page.locator('[class*="sidebar"]')).not.toBeVisible();
  });

  test('menu button appears on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });
});
