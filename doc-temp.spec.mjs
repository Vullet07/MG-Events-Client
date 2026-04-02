import { test } from '@playwright/test';

test('smoke', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/login');
  await page.screenshot({ path: 'C:/Users/Vasko_TUF/Desktop/Word/DocAssets/test-smoke.png', fullPage: true });
});
