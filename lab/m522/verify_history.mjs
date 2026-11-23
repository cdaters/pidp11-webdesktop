// Read-only genuine history downloads. No guest or monitor commands; independent
// spool files supply expected bytes, not the history response being tested.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.env.PIDP_EQUIPMENT_WORK;
const phase = process.env.M522_HISTORY_PHASE;
if (!root || !/\/m522\/(rsx|rt11)$/.test(root) || !['before-restart', 'after-recovery', 'rt11'].includes(phase)) throw Error('Reviewed work root and phase required');
const base = 'https://127.0.0.1:8449';
const results = [];
const files = phase === 'rt11'
  ? { 'rt11-print-1': 'lp1.out', 'rt11-tape-1': 'punch1.bin' }
  : { 'rsx-print-1': 'lp-first.out', 'rsx-tape-1': 'punch-first.bin', 'rsx-print-2': 'lp-second.out', 'rsx-tape-2': 'punch-second.bin', ...(phase === 'after-recovery' ? { 'rsx-interrupted': 'punch1.bin' } : {}) };
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
    const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
    expect(login.status()).toBe(200);
    const session = await login.json();
    const rows = await (await context.request.get(base + '/api/v1/equipment-history')).json();
    expect(rows.length).toBe(Object.keys(files).length);
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
    const page = await context.newPage();
    await page.goto(base);
    for (const kind of ['lp11', 'pc11-punch']) {
      const title = kind === 'lp11' ? 'Line printer' : 'Paper tape';
      await page.getByRole('button', { name: `Open ${title}`, exact: true }).click();
      const win = page.locator(`[data-window="${kind === 'lp11' ? 'printer' : 'paper'}"]`);
      await win.locator('.window-titlebar').dblclick();
      await win.getByRole('button', { name: 'Job history', exact: true }).click();
      await win.locator('[data-history-refresh]').click();
      for (const row of rows.filter(row => row.kind === kind)) {
        expect(files[row.job]).toBeTruthy();
        await win.getByLabel('Retained equipment job').selectOption(row.id);
        await win.locator('[data-history-view]').click();
        await expect(win.locator('[data-history-status]')).toContainText('checksum verified');
        const pending = page.waitForEvent('download');
        await win.locator('[data-history-save]').click();
        const download = await pending;
        const chunks = [];
        for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
        const actual = Buffer.concat(chunks);
        const expected = readFileSync(root + '/' + files[row.job]).subarray(row.start_offset, row.observed_bytes);
        expect(actual).toEqual(expected);
        expect(row.recovered).toBe(phase === 'after-recovery');
        expect(row.state).toBe(row.job === 'rsx-interrupted' ? 'expired' : 'completed');
        if (phase === 'after-recovery' || (phase === 'before-restart' && row.job.endsWith('-1'))) {
          const retired = await context.request.get(`${base}/api/v1/device-streams/${row.slot}/${row.generation}?after=0`);
          expect(retired.status()).toBe(404);
        }
        if (row.job === 'rsx-interrupted') await expect(win.locator('[data-history-save]')).toHaveText('Save retained incomplete bytes');
        results.push({ engine: name, job: row.job, id: row.id, session: row.generation, state: row.state, recovered: row.recovered, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex'), noKeyboardAcquired: true });
      }
      await page.screenshot({ path: `${root}/${phase}-${kind}-${name}.png` });
      await win.locator('.window-titlebar').dblclick();
    }
    expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
  } finally { await browser.close(); }
}
writeFileSync(`${root}/history-${phase}.json`, JSON.stringify(results, null, 2));
console.log(`${results.length} exact retained downloads verified`);
