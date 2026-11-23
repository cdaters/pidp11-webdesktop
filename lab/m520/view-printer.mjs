// Observe the existing real job. Never reruns PIP or acquires a keyboard.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m520/rsx')) throw Error('M5.20 work directory required');
const completed = process.env.M520_COMPLETED === '1';
const base = 'https://127.0.0.1:8449';
const results = [];
const expected = readFileSync(root + '/guest-printer.out');
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
    await page.getByRole('button', { name: 'Open Line printer', exact: true }).click();
    const printer = page.locator('[data-window="printer"]');
    await printer.getByRole('button', { name: 'Observe device', exact: true }).click();
    await printer.locator('[data-inventory]').click();
    await printer.getByLabel('Live peripheral').selectOption('rsx-lp11');
    await printer.locator('[data-follow]').click();
    await expect.poll(() => printer.locator('[data-activity-count]').innerText()).toContain(`${expected.length} / ${expected.length}`);
    await expect(printer.locator('[data-activity-status]')).toContainText(completed ? 'COMPLETED' : 'OBSERVING');
    if (!completed) await expect(printer.locator('[data-save]')).toBeDisabled();
    const button = printer.locator(completed ? '[data-save]' : '[data-save-partial]');
    await expect(button).toBeEnabled();
    const pending = page.waitForEvent('download');
    await button.click();
    const download = await pending;
    const pieces = [];
    for await (const piece of (await download.createReadStream())) pieces.push(piece);
    const actual = Buffer.concat(pieces);
    expect(actual).toEqual(expected);
    expect(download.suggestedFilename()).toContain(completed ? 'completed' : 'incomplete');
    await page.screenshot({ path: `${root}/printer-${completed ? 'completed' : 'partial'}-${name}.png` });
    results.push({ engine: name, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex'), completed, genuineLP11: true, keyboardAcquired: false });
    await printer.locator('[data-stop]').click();
    expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
  } finally { await browser.close(); }
}
writeFileSync(`${root}/printer-${completed ? 'completed' : 'partial'}-browsers.json`, JSON.stringify(results, null, 2));
console.log(results);
