// Genuine diskless CPU/device phases through the existing Paper tape window.
// The fixed private filesystem trigger is a lab facility, never a browser API.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { acquireCampaign } from '../m515/campaign.mjs';

const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m520/rsx')) throw Error('M5.20 work directory required');
const release = acquireCampaign(root);
const base = 'https://127.0.0.1:8449';
const results = [];
async function phase() {
  if (existsSync(root + '/devices-request.json')) throw Error('Outstanding phase; do not replay');
  const id = randomUUID();
  writeFileSync(root + '/devices-request.tmp', JSON.stringify({ id, op: 'phase' }));
  renameSync(root + '/devices-request.tmp', root + '/devices-request.json');
  for (let attempt = 0; attempt < 400; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!existsSync(root + '/devices-response.json')) continue;
    const response = JSON.parse(readFileSync(root + '/devices-response.json', 'utf8'));
    if (response.id === id) return response.result;
  }
  throw Error('Phase timeout; inspect without replaying');
}
try {
  for (const [index, [name, engine]] of Object.entries({ chromium, firefox, webkit }).entries()) {
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
      const tape = page.locator('[data-window="paper"]');
      await tape.getByRole('button', { name: 'Observe device', exact: true }).click();
      await tape.locator('[data-inventory]').click();
      await tape.getByLabel('Live peripheral').selectOption('cpu-punch');
      await tape.locator('[data-follow]').click();
      await expect(tape.locator('[data-activity-status]')).toContainText('OBSERVING');
      const executed = await phase();
      expect(executed.phase).toBe(index + 1);
      const bytes = 4096 * (index + 1);
      await expect.poll(() => tape.locator('[data-activity-count]').innerText()).toContain(`${bytes} / ${bytes}`);
      await expect(tape.locator('[data-activity-count]')).toContainText(`reader ${bytes}/12288`);
      const complete = index === 2;
      await expect(tape.locator('[data-activity-status]')).toContainText(complete ? 'COMPLETED' : 'OBSERVING');
      if (!complete) await expect(tape.locator('[data-save]')).toBeDisabled();
      const pending = page.waitForEvent('download');
      await tape.locator(complete ? '[data-save]' : '[data-save-partial]').click();
      const download = await pending, chunks = [];
      for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
      const actual = Buffer.concat(chunks), expected = readFileSync(root + '/live-reader.bin').subarray(0, bytes);
      expect(actual).toEqual(expected);
      expect(actual).toEqual(readFileSync(root + '/live-punch.bin').subarray(0, bytes));
      if (complete) {
        await expect(tape.locator('[data-activity-count]')).toContainText('end-of-tape reported');
        const inputDownload = page.waitForEvent('download');
        await tape.locator('[data-reader]').click();
        const pieces = [];
        for await (const piece of (await (await inputDownload).createReadStream())) pieces.push(piece);
        expect(Buffer.concat(pieces)).toEqual(expected);
      }
      await page.screenshot({ path: `${root}/pc11-${name}.png` });
      results.push({ engine: name, phase: index + 1, bytes, sha256: createHash('sha256').update(actual).digest('hex'), completed: complete, readerToCPUToPunch: true, osDriver: false });
      await tape.locator('[data-stop]').click();
      expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
      writeFileSync(root + '/pc11-browsers.json', JSON.stringify(results, null, 2));
    } finally { await browser.close(); }
  }
  console.log(results);
} finally { release(); }
