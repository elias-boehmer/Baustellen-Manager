const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Grundfunktionen', () => {
  test('Login funktioniert ohne Fehlermeldung', async ({ page }) => {
    await login(page);
    const errorText = page.locator('text=/falsch|error|fehler beim anmelden/i');
    await expect(errorText).toHaveCount(0);
  });

  test('Nach Login ist Hauptinhalt sichtbar', async ({ page }) => {
    await login(page);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(20);
  });
});
