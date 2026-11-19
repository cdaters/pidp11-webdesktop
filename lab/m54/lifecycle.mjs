// Mac-hosted, network-none M5.3 harness only, with a fresh disposable V7 disk.
// The private operator channel controls the lab simulator; the browser never does.
import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';

const root = process.env.PIDP54_WORK;
if (!root) throw Error('PIDP54_WORK must name the disposable lab work directory');
const ready = JSON.parse(readFileSync(`${root}/ready.json`, 'utf8'));
if (ready.environment !== 'isolated Mac-hosted Linux ARM64 lab') {
  throw Error('This acceptance script is restricted to the Mac-hosted lab');
}
const base = 'https://127.0.0.1:8445';
const token = readFileSync(`${root}/terminal.token`, 'utf8').trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const trace = [];
const result = { environment: ready.environment, pilotSHA256: ready.pilot_sha256, passed: false };
const execute = promisify(execFile);

async function waitForReleasedLine() {
  // Original TMXR validates a bind without SO_REUSEADDR. A server-initiated
  // disconnect can leave TIME_WAIT even after its listening socket is closed.
  // Inspect only this network-none container; never connect a readiness probe.
  const start = Date.now();
  console.log('Waiting for the detached lab line socket state to clear (up to 90 seconds).');
  while (Date.now() - start < 90000) {
    const { stdout } = await execute('docker', [
      '--context', 'orbstack', 'exec', 'pidp11-m53', 'cat', '/proc/net/tcp',
    ], { timeout: 5000, maxBuffer: 65536 });
    const sockets = stdout.trim().split('\n').slice(1).map(line => line.trim().split(/\s+/));
    const lineSockets = sockets.filter(fields => fields[1] === '0100007F:9CA4');
    if (lineSockets.length === 0) {
      result.socketReleaseWaitMilliseconds = Date.now() - start;
      return;
    }
    // A surviving listener or other unexpected state is a failed checkpoint.
    expect(lineSockets.every(fields => fields[3] === '06')).toBe(true);
    await sleep(2000);
  }
  throw Error('Old lab line socket state did not clear; leave the guest stopped for inspection');
}

// Verify the exact fixture certificate before the isolated browser context.
await new Promise((resolve, reject) => {
  const request = https.get(base, { ca: readFileSync(`${root}/terminal-cert.pem`) }, response => {
    response.resume();
    if (response.statusCode === 200) resolve(); else reject(Error('Lab HTTPS unavailable'));
  });
  request.on('error', reject);
  request.setTimeout(5000, () => request.destroy(Error('Lab TLS check timed out')));
});

async function operator(op, data = '') {
  if (existsSync(`${root}/request.json`)) throw Error('Another operator request is pending');
  const id = randomBytes(8).toString('hex');
  writeFileSync(`${root}/request.tmp`, JSON.stringify({ id, op, data, wait: 1 }), { mode: 0o600 });
  renameSync(`${root}/request.tmp`, `${root}/request.json`);
  for (let i = 0; i < 200; i++) {
    await sleep(100);
    if (!existsSync(`${root}/response.json`)) continue;
    const response = JSON.parse(readFileSync(`${root}/response.json`, 'utf8'));
    if (response.id !== id) continue;
    if (response.error) throw Error(response.error);
    trace.push({ op, data, output: response.output });
    return response.output;
  }
  throw Error('Lab operator timed out; retain disk/logs and inspect before continuing');
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const auth = await context.request.post(`${base}/api/v1/login`, {
    headers: { Origin: base }, data: { token },
  });
  expect(auth.status()).toBe(200);
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
  await expect(page.locator('[data-connect]')).toBeEnabled();
  await page.getByLabel('Guest endpoint').selectOption('unix7-dc0');
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await page.locator('[data-acquire]').click();
  await expect(page.locator('[data-release]')).toBeEnabled();

  // A deliberate local operator action, not a browser/emulator control API.
  expect(await operator('monitor')).toContain('sim>');
  expect(await operator('console', 'detach dci\r')).toContain('sim>');
  await expect(page.locator('.guest-status')).toContainText('Guest line disconnected');
  await expect(page.locator('[data-acquire]')).toBeDisabled();
  await waitForReleasedLine();
  const attach = await operator('console', 'attach dci line=0,127.0.0.1:40100;notelnet\r');
  expect(attach).toContain('sim>');
  expect(attach).not.toMatch(/Invalid|Non-existent|Error|Can't|Failed/i);
  const device = await operator('console', 'show dci\r');
  expect(device).toContain('40100');
  await operator('console', 'continue\r');

  // Give the actual original TMXR polling loop time to service a reconnect if
  // one were incorrectly scheduled. This is finite evidence, not a soak.
  for (let i = 0; i < 10; i++) {
    const response = await context.request.get(`${base}/api/v1/terminals`);
    expect(response.status()).toBe(200);
    const endpoints = await response.json();
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].connected).toBe(false);
    await sleep(200);
  }
  await expect(page.locator('[data-acquire]')).toBeDisabled();
  const marker = `M54_CONSOLE_${randomBytes(6).toString('hex')}`;
  const consoleOutput = await operator('console', `echo ${marker}\r`);
  expect(consoleOutput.replaceAll('\r', '').split('\n').some(line => line.trim() === marker)).toBe(true);
  result.originalConsoleContinued = true;
  result.listenerReplacedAtSamePort = true;
  result.oldBrowserRemainedDetached = true;

  // This operator explicitly verifies the same disposable guest, then starts a
  // NEW bridge. It demonstrates manual recovery, not automatic guest identity.
  await operator('bridge-stop');
  await operator('bridge-start');
  expect((await context.request.get(`${base}/api/v1/terminals`)).status()).toBe(403);
  await context.close();
  const fresh = await browser.newContext({ ignoreHTTPSErrors: true });
  expect((await fresh.request.post(`${base}/api/v1/login`, {
    headers: { Origin: base }, data: { token },
  })).status()).toBe(200);
  const newPage = await fresh.newPage();
  await newPage.goto(base);
  await newPage.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
  await expect(newPage.locator('[data-connect]')).toBeEnabled();
  await newPage.getByLabel('Guest endpoint').selectOption('unix7-dc0');
  await newPage.locator('[data-connect]').click();
  await expect(newPage.locator('.guest-heading')).toContainText('READ-ONLY');
  await expect(newPage.locator('[data-release]')).toBeDisabled();
  result.manualRecoveryRequiresFreshAuthentication = true;
  result.manualRecoveryStartsReadOnly = true;
  result.passed = true;
  await fresh.close();
  console.log('PASS: original SIMH listener replacement, retired attachment, independent console and explicit fresh recovery.');
} finally {
  await browser.close();
  writeFileSync(`${root}/lifecycle-acceptance.json`, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(`${root}/lifecycle-operator-private.json`, JSON.stringify(trace, null, 2) + '\n', { mode: 0o600 });
}
