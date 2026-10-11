import { test, expect } from '@playwright/test';

test('command dashboard routes to the working scenario editor', async ({ page }) => {
  await page.goto('/#/command');
  await expect(page.getByRole('heading', { name: /clarity under/i })).toBeVisible();
  await page.getByRole('button', { name: 'Scenario Lab' }).click();
  await expect(page.getByRole('heading', { name: /compose a training scenario/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /generate new/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save scenario/i })).toBeVisible();
});

test('scenario authoring saves a reproducible configuration locally', async ({ page }) => {
  await page.goto('/#/scenario');
  await expect(page.getByRole('heading', { name: /compose a training scenario/i })).toBeVisible();
  await page.getByRole('button', { name: /generate new/i }).click();
  await page.getByRole('button', { name: /save scenario/i }).click();
  await expect(page.getByRole('status').or(page.locator('.scenario-notice')).first()).toContainText(/saved/i);
});

test('training session loads the 3D world and accepts track workflow actions', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/#/command');
  await page.getByRole('button', { name: /start sih demo/i }).click();
  await expect(page.locator('.training-head h1')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('canvas.world-canvas')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /^START$/i }).click();
  const firstTrack = page.locator('.track-row').first();
  await expect(firstTrack).toBeVisible({ timeout: 15000 });
  await firstTrack.click();
  await expect(page.getByRole('button', { name: /log classification/i })).toBeVisible();
  await page.getByRole('button', { name: /log classification/i }).click();
  await expect(page.getByRole('button', { name: /submit decision/i })).toBeEnabled();
  expect(runtimeErrors, `Browser runtime errors: ${runtimeErrors.join('; ')}`).toEqual([]);
});


test('system page connects to the optional local API and syncs/restores validated data', async ({ page }) => {
  await page.goto('/#/system');
  await expect(page.getByRole('heading', { name: /control the environment/i })).toBeVisible();
  await page.getByRole('button', { name: /test connection/i }).click();
  await expect(page.locator('.system-api-card')).toContainText('CONNECTED', { timeout: 8000 });
  await page.getByRole('button', { name: /sync browser.*api/i }).click();
  await expect(page.locator('.system-api-card')).toContainText(/Local records synchronized/, { timeout: 8000 });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /merge api.*browser/i }).click();
  await expect(page.locator('.system-api-card')).toContainText(/Merged .* sessions/, { timeout: 8000 });
});
