// Supervised laboratory failure injection. Only this Mac harness can signal the
// exact optional supervisor. No browser endpoint controls a process or simulator.
import { webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m521-equipment/rsx')) throw Error('Reviewed lab required');
const base = 'https://127.0.0.1:8449', browser = await webkit.launch();
const result = { originalGuestSignalled: false };
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
  const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
  expect(login.status()).toBe(200); const session = await login.json();
  const old = JSON.parse(readFileSync(root + '/punch1-complete.json', 'utf8'));
  expect((await context.request.get(base + `/api/v1/device-streams/punch1/${old.generation}?after=0`)).status()).toBe(404);
  result.oldGenerationRejected = true;
  const page = await context.newPage(); await page.goto(base);
  await page.getByRole('button', { name: 'Open Paper tape', exact: true }).click();
  const win = page.locator('[data-window="paper"]');
  await win.getByRole('button', { name: 'Observe device', exact: true }).click();
  await win.locator('[data-inventory]').click(); await win.getByLabel('Live peripheral').selectOption('punch1'); await win.locator('[data-follow]').click();
  await expect(win.locator('[data-equipment-session]')).toContainText('rsx-tape-interruption');
  await expect(win.locator('[data-activity-count]')).toContainText('0 / 0');
  if (existsSync(root + '/request.json')) throw Error('Outstanding guest request');
  writeFileSync(root + '/request.tmp', JSON.stringify({ id: randomUUID(), op: 'console', data: 'PIP PP:=PR:\r', wait: 0 })); renameSync(root + '/request.tmp', root + '/request.json');
  await expect.poll(() => win.locator('[data-activity-count]').innerText()).toMatch(/^[1-9]\d* \/ /);
  const killedAt = Date.now();
  execFileSync('docker', ['--context', 'orbstack', 'exec', 'pidp11-m521-rsx', 'python3', '-c', "from pathlib import Path;import os,signal;pid=int(Path('/work/supervisor.pid').read_text());assert os.readlink(f'/proc/{pid}/exe')=='/work/runtime/equipment-supervisor';os.kill(pid,signal.SIGKILL)"]);
  await expect(win.locator('[data-activity-status]')).toContainText('DISCONNECTED', { timeout: 10000 });
  result.expiredAfterKillMs = Date.now() - killedAt;
  await expect(win.locator('[data-save]')).toBeDisabled();
  const pending = page.waitForEvent('download'); await win.locator('[data-save-partial]').click();
  const download = await pending, chunks = [];
  for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
  const actual = Buffer.concat(chunks); expect(actual.length).toBeGreaterThan(0);
  expect(actual).toEqual(readFileSync(root + '/punch1.bin').subarray(0, actual.length));
  result.retainedBytes = actual.length; result.partialSHA256 = createHash('sha256').update(actual).digest('hex');
  result.completedDownloadDisabled = true;
  await win.getByRole('button', { name: 'Completed exports', exact: true }).click(); await win.locator('[data-refresh-devices]').click();
  await win.getByLabel('Observed device').selectOption('punch1'); await win.locator('[data-view-device]').click();
  const saved = page.waitForEvent('download'); await win.locator('[data-download-device]').click();
  const parts = []; for await (const part of (await (await saved).createReadStream())) parts.push(part);
  expect(Buffer.concat(parts)).toEqual(readFileSync(root + '/punch1-completed.bin'));
  result.oldCompletedArtifactUnchanged = true;
  await page.screenshot({ path: root + '/crash-retained-webkit.png' });
  expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
} finally { writeFileSync(root + '/crash-browser.json', JSON.stringify(result, null, 2)); await browser.close(); }
console.log(result);
