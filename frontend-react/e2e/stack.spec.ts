import { expect, test } from '@playwright/test';

test.skip(!process.env.E2E_BASE_URL, 'Runs against the Docker Compose integration stack in CI.');

test('browser reads machine data through the Java API and displays dashboard telemetry', async ({ page }) => {
  await page.goto('/');
  const machinesResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/maquinas');
    return { status: response.status, machines: await response.json() };
  });

  expect(machinesResponse.status).toBe(200);
  expect(machinesResponse.machines).toHaveLength(3);
  expect(machinesResponse.machines[0]).toHaveProperty('id');
  const healthResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/health');
    return { status: response.status, health: await response.json() };
  });
  expect(healthResponse.status).toBe(200);
  expect(healthResponse.health.services).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'Flask AI', status: 'UP', source: 'LIVE' }),
  ]));

  await page.getByRole('navigation').getByRole('link', { name: /Smart N1 Dashboard/ }).click();
  await expect(page.getByRole('heading', { name: /Leituras brutas/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Consolidados/ })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});
