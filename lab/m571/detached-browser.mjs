// Actual installed candidate in the isolated pidp11-m571 VM. No route mocks.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const token = execFileSync('orbctl', [
  'run', '-m', 'pidp11-m571', '-u', 'root',
  'cat', '/etc/pidp11-webdesktop/writer.token',
], { encoding: 'utf8' }).trim();

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    // Certificate bypass is confined to these disposable browser contexts.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const origin = 'https://127.0.0.1:18445';
    const login = await context.request.post(`${origin}/api/v1/login`, {
      headers: { Origin: origin },
      data: { token },
    });
    expect(login.status()).toBe(200);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
    await expect(page.locator('.guest-heading')).toContainText('DETACHED');
    await expect(page.locator('[data-connect]')).toBeDisabled();
    await page.locator('[data-refresh]').click();
    await expect(page.locator('.guest-status')).toContainText('No guest attached');
    expect(errors).toEqual([]);
    writeFileSync(`.research/m571/detached-${name}.json`, JSON.stringify({
      source: 'Installed candidate under systemd in isolated ARM64 Linux; no guest listener',
      browser: name,
      authenticated: true,
      detached: true,
      noAutomaticConnection: true,
      errors,
    }, null, 2) + '\n');
    console.log(`${name}: installed detached desktop authenticated without a guest.`);
  } finally {
    await browser.close();
  }
}
