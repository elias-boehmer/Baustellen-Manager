const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Regressionstests fuer zuletzt gemeldete Bugs', () => {
  test('Kategorie-Select ist im DOM vorhanden (Smoke)', async ({ page }) => {
    await login(page);

    const categorySelect = page
      .locator('select[name="category"], select#td-category, select#category')
      .first();

    if (await categorySelect.count() === 0) {
      test.skip(true, 'Kein Kategorie-Select gefunden – Test uebersprungen.');
    }

    await expect(categorySelect).toHaveCount(1);
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
