const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Regressionstests fuer zuletzt gemeldete Bugs', () => {
  test('Kategorie auswaehlen erzeugt keine Fehlermeldung', async ({ page }) => {
    await login(page);

    const categoryTrigger = page.locator('text=/kategorie/i').first();
    if (await categoryTrigger.count() === 0) {
      test.skip(true, 'Kein Kategorie-Element gefunden – Test uebersprungen.');
    }

    await categoryTrigger.click();

    // explizit auf den urspruenglichen Firestore-Fehler pruefen
    const permissionError = page.locator('text=/Missing or insufficient permissions/i');
    await expect(permissionError).toHaveCount(0);
  });

  test('Klick auf Todo-Titel unter "Aktuell" oeffnet Bearbeiten-Ansicht', async ({ page }) => {
    await login(page);

    const aktuellTab = page.locator('text=/^Aktuell$/i').first();
    if (await aktuellTab.count() > 0) {
      await aktuellTab.click();
    }

    const todoTitle = page.locator('[data-action], .todo-title, .task-title').first();
    if (await todoTitle.count() === 0) {
      test.skip(true, 'Kein Todo-Titel gefunden – Test uebersprungen (evtl. keine Testdaten angelegt).');
    }

    await todoTitle.click();

    const modal = page.locator('.modal, [role="dialog"], .edit-panel');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });
});
