async function login(page) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL / E2E_TEST_PASSWORD sind nicht gesetzt. Bitte als GitHub Secrets hinterlegen.');
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});

  const emailInput = page.locator('#login-email');
  const passwordInput = page.locator('#login-password');
  const loginButton = page.locator('#btn-auth-submit');

  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await loginButton.click();

  // Nach erfolgreichem Login verschwindet #login-screen bzw. #app wird sichtbar.
  await page.locator('#login-screen').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
}

async function getInteractiveElements(page) {
  return page.locator('button, [role="button"], a.btn, .btn, input[type="submit"]');
}

module.exports = { login, getInteractiveElements };
