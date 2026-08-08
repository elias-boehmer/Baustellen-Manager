const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Grundfunktionen', () => {
  test('Login funktioniert ohne Fehlermeldung', async ({ page }) => {
    await login(page);
    const errorBanner = page.locator('#login-error:not(.hidden)');
    await expect(errorBanner).toHaveCount(0);
  });

  test('Nach Login ist Hauptinhalt sichtbar', async ({ page }) => {
    await login(page);
    const app = page.locator('#app');
    await expect(app).not.toHaveClass(/hidden/, { timeout: 10000 });
  });
});
