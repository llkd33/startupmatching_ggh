import { test, expect } from '@playwright/test';

test.describe('Main Page Health Check', () => {
  test('should load main page with content and without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3003');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Check for the main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('창업 성공을 위한');

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'tests/e2e/screenshots/main-page.png' });

    // Check if there were any console errors
    expect(consoleErrors).toHaveLength(0);
  });
});