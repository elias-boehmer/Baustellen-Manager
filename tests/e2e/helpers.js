async function login(page) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL / E2E_TEST_PASSWORD sind nicht gesetzt. Bitte als GitHub Secrets hinterlegen.');
  }

  await page.goto('/');

  const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();

  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const loginButton = page.locator('button:has-text("Anmelden"), button:has-text("Login"), button:has-text("Einloggen"), button[type="submit"]').first();
  await loginButton.click();

  await passwordInput.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

async function getInteractiveElements(page) {
  return page.locator('button, [role="button"], a.btn, .btn, input[type="submit"]');
}

module.exports = { login, getInteractiveElements };
