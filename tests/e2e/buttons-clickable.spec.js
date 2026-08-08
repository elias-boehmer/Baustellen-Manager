const { test, expect } = require('@playwright/test');
const { login, getInteractiveElements } = require('./helpers');

test('Alle sichtbaren Buttons sind klickbar und werden nicht von einem Overlay blockiert', async ({ page }) => {
  await login(page);
  await page.waitForTimeout(1000);

  const elements = await getInteractiveElements(page);
  const count = await elements.count();
  expect(count).toBeGreaterThan(0);

  const blocked = [];

  for (let i = 0; i < count; i++) {
    const el = elements.nth(i);
    if (!(await el.isVisible())) continue;

    const box = await el.boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue;

    const handle = await el.elementHandle();
    if (!handle) continue;

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const isCovered = await page.evaluate(({ x, y, el }) => {
      const topEl = document.elementFromPoint(x, y);
      if (!topEl) return true;
      return !(el === topEl || el.contains(topEl) || topEl.contains(el));
    }, { x: centerX, y: centerY, el: handle });

    if (isCovered) {
      const desc = await page.evaluate((el) => el.outerHTML.slice(0, 120), handle);
      blocked.push(desc);
    }
  }

  expect(blocked, `Diese Elemente sind sichtbar, aber durch ein anderes Element ueberdeckt und daher nicht klickbar:\n${blocked.join('\n')}`).toHaveLength(0);
});
