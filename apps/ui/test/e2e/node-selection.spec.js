import { test, expect } from '@playwright/test';

/**
 * Reproduces the runtime error reported when selecting a node on the battlefield.
 *
 * This test intentionally fails today because clicking a node triggers
 * `canExecuteAttack` inside the UI, and the import currently resolves to a
 * non-function at runtime in the browser build. Once the bug is fixed, this test
 * should pass without logging any console errors.
 */
test('selecting an owned node and attempting an attack should not throw errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();

  const attackerNode = page.locator('.board-node--active-owner').first();
  await attackerNode.waitFor({ state: 'visible' });
  await attackerNode.click();

  const defenderNode = page.locator('.board-node:not(.board-node--active-owner)').first();
  await defenderNode.waitFor({ state: 'visible' });
  await defenderNode.click();

  // Allow a moment for any async handlers to run before asserting.
  await page.waitForTimeout(250);

  await expect.poll(() => errors.slice(), { timeout: 500 }).toEqual([]);
});
