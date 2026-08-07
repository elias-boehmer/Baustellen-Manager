async function gotoWithPagesRetry(page, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const is404 = bodyText.includes("There isn't a GitHub Pages site here");
    if (!is404) return;
    console.log(`Pages-404 erkannt (Versuch ${attempt}/${maxAttempts}), warte 5s und lade neu ...`);
    await page.waitForTimeout(5000);
  }
  throw new Error('GitHub Pages liefert nach mehreren Versuchen weiterhin eine 404-Seite.');
}

async function login(page) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL / E2E_TEST_PASSWORD sind nicht gesetzt. Bitte als GitHub Secrets hinterlegen.');
  }

  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', (msg) => consoleMessages.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => pageErrors.push(`[pageerror] ${err.message}\n${err.stack || ''}`));
  page.on('requestfailed', (req) => consoleMessages.push(`[requestfailed] ${req.url()} - ${req.failure()?.errorText}`));

  await gotoWithPagesRetry(page);
  await page.waitForLoadState('networkidle').catch(() => {});

  const emailInput = page.locator('#login-email');
  const passwordInput = page.locator('#login-password');
  const loginButton = page.locator('#btn-auth-submit');

  try {
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  } catch (err) {
    const html = await page.content();
    console.log('=== DIAGNOSE: #login-email nicht sichtbar ===');
    console.log('--- Browser console/network ---');
    console.log(consoleMessages.slice(-40).join('\n') || '(keine console-Ausgaben)');
    console.log('--- Page errors (JS-Exceptions im Browser) ---');
    console.log(pageErrors.join('\n') || '(keine JS-Fehler erfasst)');
    console.log('--- Aktueller Seitenausschnitt (erste 3000 Zeichen von <body>) ---');
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    console.log((bodyMatch ? bodyMatch[1] : html).slice(0, 3000));
    console.log('=== ENDE DIAGNOSE ===');
    throw err;
  }

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await loginButton.click();

  await page.locator('#login-screen').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
}

async function getInteractiveElements(page) {
  return page.locator('button, [role="button"], a.btn, .btn, input[type="submit"]');
}

module.exports = { login, getInteractiveElements };
