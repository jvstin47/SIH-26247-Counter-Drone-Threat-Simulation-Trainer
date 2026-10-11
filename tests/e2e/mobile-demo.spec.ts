import { expect, test } from '@playwright/test';

test.describe('standalone mobile companion', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/mobile-demo/index.html');
    await expect(page.getByRole('heading', { name: 'Command overview' })).toBeVisible();
  });

  test('all mobile workspace tabs navigate and render content', async ({ page }) => {
    for (const tab of ['training', 'tracking', 'fusion', 'scenario', 'media', 'aar', 'history', 'analytics', 'unit', 'system', 'help']) {
      await page.locator(`#mobileNav [data-tab="${tab}"]`).click();
      await expect(page.locator('#view')).not.toBeEmpty();
    }
  });

  test('scenario generation, save, and synthetic degradation change the scenario', async ({ page }) => {
    await page.locator('#mobileNav [data-tab="scenario"]').click();
    await page.locator('[data-action="generate"]').click();
    await page.locator('[data-action="save-scenario"]').click();
    await expect(page.locator('#view')).toContainText('SAVED SCENARIOS');
    await page.locator('#mobileNav [data-tab="fusion"]').click();
    await page.locator('[data-action="degrade"]').click();
    await expect(page.locator('.toast')).toContainText('degraded');
  });

  test('training assessments persist into AAR, replay, history and backup export', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-action="start"]').first().click();
    await expect(page.locator('.training-grid')).toBeVisible();
    await page.waitForTimeout(350);
    for (let index = 0; index < 3; index++) {
      const rows = page.locator('[data-select]');
      if (await rows.count()) {
        await rows.first().click();
        await page.locator('[data-action="classify"][data-value="UNKNOWN"]').click();
        await page.locator('[data-action="decision"][data-value="MONITOR"]').click();
        await page.locator('[data-action="submit-answer"]').click();
      }
    }
    await page.locator('[data-action="finish"]').click();
    await expect(page.locator('#view')).toContainText('After-action review');
    await page.locator('[data-action="replay-toggle"]').click();
    await page.locator('[data-action="replay-step"][data-dir="1"]').click();
    await page.locator('#mobileNav [data-tab="history"]').click();
    await expect(page.locator('#view')).toContainText('SES-');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-backup"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('aid-c2s-phone-backup');
    expect(errors).toEqual([]);
  });
});
