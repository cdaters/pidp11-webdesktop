// Genuine PIP action through separately owned private lab console IPC. The web
// application only observes output; it has no filesystem/monitor command route.
import { chromium, firefox, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
const job = Number(process.env.M521_JOB);
if (!root?.endsWith('/m521-equipment/rsx') || ![1, 2].includes(job)) throw Error('Fresh reviewed lab job required');
const base = 'https://127.0.0.1:8449';
const browser = await (job === 2 ? firefox : chromium).launch();
const result = { job, observedBeforeCommand: false, liveBeforeGuestReturned: false, samples: [], liveWhileHostGrowing: false };
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
  const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
  expect(login.status()).toBe(200); const session = await login.json();
  const page = await context.newPage(); await page.goto(base);
  await page.getByRole('button', { name: 'Open Paper tape', exact: true }).click();
  const tape = page.locator('[data-window="paper"]');
  await tape.getByRole('button', { name: 'Observe device', exact: true }).click();
  await tape.locator('[data-inventory]').click();
  await tape.getByLabel('Live peripheral').selectOption(`punch${job}`);
  await tape.locator('[data-follow]').click();
  await expect(tape.locator('[data-activity-status]')).toContainText('OBSERVING');
  await expect(tape.locator('[data-activity-count]')).toContainText('0 / 0');
  result.observedBeforeCommand = true;
  const before = readFileSync(root + '/console-private.txt', 'utf8').length;
  if (existsSync(root + '/request.json')) throw Error('Outstanding console request');
  const id = randomUUID();
  writeFileSync(root + '/request.tmp', JSON.stringify({ id, op: 'console', data: 'PIP PP:=PR:\r', wait: 0 }));
  renameSync(root + '/request.tmp', root + '/request.json');
  const began = Date.now(); let returned = false, previous = 0;
  while (Date.now() - began < 90000) {
    await page.waitForTimeout(200);
    const consoleOutput = readFileSync(root + '/console-private.txt', 'utf8').slice(before);
    returned = /\n>/.test(consoleOutput);
    const counts = await tape.locator('[data-activity-count]').innerText();
    const match = counts.match(/^(\d+) \/ (\d+)/);
    if (!match) throw Error('Missing genuine observer offsets');
    const bytes = Number(match[1]); expect(bytes).toBeGreaterThanOrEqual(previous); previous = bytes;
    if (bytes > 0 && !returned) result.liveBeforeGuestReturned = true;
    const hostBytes = statSync(root + `/punch${job}.bin`).size;
    const commandEchoed = consoleOutput.includes('PIP PP:=PR:');
    if (bytes > 0 && !returned && commandEchoed && result.samples.some(sample => sample.bytes > 0 && sample.hostBytes < hostBytes)) result.liveWhileHostGrowing = true;
    result.samples.push({ elapsedMs: Date.now() - began, bytes, hostBytes, commandEchoed, guestReturned: returned });
    await expect(tape.locator('[data-save]')).toBeDisabled();
    if (returned) break;
  }
  expect(returned).toBe(true);
  result.guestReturned = true;
  result.partialHostBytes = previous;
  if (previous) {
    const pending = page.waitForEvent('download'); await tape.locator('[data-save-partial]').click();
    const download = await pending, chunks = [];
    for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    expect(bytes).toEqual(readFileSync(root + `/punch${job}.bin`).subarray(0, previous));
    result.partialSHA256 = createHash('sha256').update(bytes).digest('hex');
  }
  await page.screenshot({ path: `${root}/punch${job}-live.png` });
  await tape.locator('[data-stop]').click();
  expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
  expect(result.liveBeforeGuestReturned).toBe(true);
  if (job === 2) expect(result.liveWhileHostGrowing).toBe(true);
} finally {
  writeFileSync(`${root}/punch${job}-live.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(result);
