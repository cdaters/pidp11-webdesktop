// Genuine partial retention after the independently operated guided supervisor
// quits. Test orchestration uses private IPC; browser application has no such API.
import { webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m522/rsx')) throw Error('Reviewed private work directory required');
const base = 'https://127.0.0.1:8449';
const browser = await webkit.launch();
const result = {};
function submit(prefix, payload) {
  if (existsSync(root + '/' + prefix + 'request.json')) throw Error('Outstanding private request; do not replay');
  const key = prefix ? 'request_id' : 'id';
  const id = randomUUID();
  writeFileSync(root + '/' + prefix + 'request.tmp', JSON.stringify({ ...payload, [key]: id }));
  renameSync(root + '/' + prefix + 'request.tmp', root + '/' + prefix + 'request.json');
  return id;
}
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
  const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
  expect(login.status()).toBe(200);
  const session = await login.json();
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: 'Open Paper tape', exact: true }).click();
  const win = page.locator('[data-window="paper"]');
  await win.getByRole('button', { name: 'Observe device', exact: true }).click();
  await win.locator('[data-inventory]').click();
  await win.getByLabel('Live peripheral').selectOption('punch');
  await win.locator('[data-follow]').click();
  await expect(win.locator('[data-activity-count]')).toContainText('0 / 0');
  submit('', { op: 'console', data: 'PIP PP:=PR:\r', wait: 0 });
  await expect.poll(async () => Number((await win.locator('[data-activity-count]').innerText()).split(' ')[0])).toBeGreaterThan(0);
  const began = Date.now();
  const stopID = submit('supervisor-', { line: 'quit' });
  await expect(win.locator('[data-activity-status]')).toContainText('DISCONNECTED', { timeout: 10000 });
  result.expiryAfterQuitMs = Date.now() - began;
  const reply = JSON.parse(readFileSync(root + '/supervisor-response.json', 'utf8'));
  expect(reply.request_id).toBe(stopID);
  expect(reply.exit_code).toBe(0);
  const history = await (await context.request.get(base + '/api/v1/equipment-history')).json();
  const partial = history.find(row => row.job === 'rsx-interrupted');
  expect(partial.state).toBe('expired');
  expect(partial.completed_bytes).toBe(0);
  await expect(win.locator('[data-save]')).toBeDisabled();
  const pending = page.waitForEvent('download');
  await win.locator('[data-save-partial]').click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())) chunks.push(chunk);
  const actual = Buffer.concat(chunks);
  expect(actual).toEqual(readFileSync(root + '/punch1.bin').subarray(partial.start_offset, partial.observed_bytes));
  Object.assign(result, { id: partial.id, generation: partial.generation, retainedBytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex'), supervisorExit: 0, simulatorSignalled: false, completedDownloadDisabled: true });
  await page.screenshot({ path: root + '/expired-webkit.png' });
  expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
} finally {
  writeFileSync(root + '/expired.json', JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(result);
