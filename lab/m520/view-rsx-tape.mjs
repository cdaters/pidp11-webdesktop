// Verify the completed RSX paper-tape export. Never reruns PIP or acquires a keyboard.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m520/rsx-pc11')) throw Error('M5.20 work directory required');
const completed = true;
const base = 'https://127.0.0.1:8449';
const results = [];
const expected = readFileSync(root + '/guest-punch.bin');
for (const [name, engine] of Object.entries(completed ? { chromium, firefox, webkit } : { chromium })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
    const login = await context.request.post(base + '/api/v1/login', {
      headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() },
    });
    expect(login.status()).toBe(200);
    const session = await login.json();
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('button', { name: 'Open Paper tape', exact: true }).click();
    const printer = page.locator('[data-window="paper"]');
    await printer.getByRole('button', { name: 'Completed exports', exact: true }).click();
    await printer.locator('[data-refresh-devices]').click();
    await printer.getByLabel('Observed device').selectOption('rsx-pc11');
    await printer.locator('[data-view-device]').click();
    await expect(printer.locator('[data-device-status]')).toContainText('Completed');
    const button = printer.locator('[data-download-device]');
    await expect(button).toBeEnabled();
    const pending = page.waitForEvent('download');
    await button.click();
    const download = await pending;
    const pieces = [];
    for await (const piece of (await download.createReadStream())) pieces.push(piece);
    const actual = Buffer.concat(pieces);
    expect(actual).toEqual(expected);
    expect(download.suggestedFilename()).toContain(completed ? 'completed' : 'incomplete');
    await page.screenshot({ path: `${root}/paper-tape-completed-${name}.png` });
    results.push({ engine: name, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex'), completed, genuineRSXPC11: true, keyboardAcquired: false });
    expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
  } finally { await browser.close(); }
}
writeFileSync(`${root}/paper-tape-completed-browsers.json`, JSON.stringify(results, null, 2));
console.log(results);
