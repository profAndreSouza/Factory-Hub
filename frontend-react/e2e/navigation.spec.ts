import { expect, test } from '@playwright/test';

test('opens the portal and navigates to the industrial automation module', async ({ page }) => {
  await page.route('**/api/**', route => {
    const body = new URL(route.request().url()).pathname.endsWith('/health')
      ? { services: [] }
      : [];
    return route.fulfill({ status: 200, json: body });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Factory Hub/ })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: /Automa/ }).click();
  await expect(page).toHaveURL(/\/automacao$/);
  await expect(page.getByRole('heading', { name: /Industrial/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Teoria/ })).toBeVisible();
});
