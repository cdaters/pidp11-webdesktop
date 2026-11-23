// Read-only completed artifacts from four real RSX jobs. No guest commands.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m521-equipment/rsx')) throw Error('Reviewed RSX work directory required');
const base = 'https://127.0.0.1:8449', results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
    const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
    expect(login.status()).toBe(200); const session = await login.json();
    const page = await context.newPage(); await page.goto(base);
    const generations = new Set();
    for (const kind of ['lp', 'punch']) {
      const title = kind === 'lp' ? 'Line printer' : 'Paper tape';
      await page.getByRole('button', { name: `Open ${title}`, exact: true }).click();
      const win = page.locator(`[data-window="${kind === 'lp' ? 'printer' : 'paper'}"]`);
      await win.locator('.window-titlebar').dblclick();
      await win.getByRole('button', { name: 'Completed exports', exact: true }).click();
      await win.locator('[data-refresh-devices]').click();
      await expect(win.getByLabel('Observed device').locator('option')).toHaveCount(3);
      for (const job of [1, 2]) {
        const id = `${kind}${job}`;
        await win.getByLabel('Observed device').selectOption(id);
        await win.locator('[data-view-device]').click();
        await expect(win.locator('[data-device-status]')).toContainText('Completed');
        const pending = page.waitForEvent('download'); await win.locator('[data-download-device]').click();
        const download = await pending, chunks = [];
        for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
        const actual = Buffer.concat(chunks), expected = readFileSync(root + `/${id}.${kind === 'lp' ? 'out' : 'bin'}`);
        expect(actual).toEqual(expected);
        const identity = await win.locator('[data-device-identity]').innerText();
        const inventory = await context.request.get(base + '/api/v1/devices');
        const selected = (await inventory.json()).find(item => item.id === id);
        expect(generations.has(selected.generation)).toBe(false); generations.add(selected.generation);
        results.push({ engine: name, job: id, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex'), generation: selected.generation, keyboardAcquired: false });
        if (kind === 'lp') { await win.locator('.paper-viewport').focus(); await page.keyboard.press('End'); }
        await page.screenshot({ path: `${root}/${id}-completed-${name}.png` });
        expect(identity).toContain('rsx-v46-bl87');
      }
      await win.locator('.window-titlebar').dblclick();
    }
    expect(generations.size).toBe(4);
    expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
  } finally { await browser.close(); }
}
writeFileSync(root + '/completed-browsers.json', JSON.stringify(results, null, 2));
console.log(results);
