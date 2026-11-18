// Genuine guest acceptance for M5.3 lab or Pi. No intercepted responses or output fixtures.
// Requires a private operator harness file channel and fixed loopback SSH/lab forwarding.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import https from 'node:https';

const root = process.env.PIDP53_WORK;
if (!root) throw Error('PIDP53_WORK must name the private evidence/harness directory');
const base = 'https://127.0.0.1:8445';
const token = readFileSync(`${root}/terminal.token`, 'utf8').trim();
const reader = readFileSync(`${root}/observer.token`, 'utf8').trim();
const ready = JSON.parse(readFileSync(`${root}/ready.json`, 'utf8'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = { environment: ready.environment, pilotSHA256: ready.pilot_sha256, browsers: [], independence: [], restart: null };
const save = () => writeFileSync(`${root}/browser-acceptance.json`, JSON.stringify(results, null, 2) + '\n', { mode: 0o600 });

// Validate TLS with the specifically provisioned certificate before using isolated
// browser contexts. No trust-store changes or personal-browser exceptions are made.
await new Promise((resolve, reject) => {
  const request = https.get(base, { ca: readFileSync(`${root}/terminal-cert.pem`) }, response => {
    response.resume();
    if (response.statusCode === 200) resolve(); else reject(Error('TLS endpoint unavailable'));
  });
  request.on('error', reject);
  request.setTimeout(5000, () => request.destroy(Error('TLS check timed out')));
});

async function harness(op, data = '') {
  if (existsSync(`${root}/request.json`)) throw Error('Another operator request is pending');
  const id = randomBytes(6).toString('hex');
  writeFileSync(`${root}/request.tmp`, JSON.stringify({ id, op, data, wait: 1 }), { mode: 0o600 });
  renameSync(`${root}/request.tmp`, `${root}/request.json`);
  for (let i = 0; i < 200; i++) {
    await sleep(100);
    if (existsSync(`${root}/response.json`)) {
      const response = JSON.parse(readFileSync(`${root}/response.json`, 'utf8'));
      if (response.id === id) {
        if (response.error) throw Error(response.error);
        return response.output;
      }
    }
  }
  throw Error('Independent operator harness timed out; retain evidence and inspect guest');
}

async function client(browser, key = token) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1500, height: 1000 } });
  const response = await context.request.post(`${base}/api/v1/login`, { headers: { Origin: base }, data: { token: key } });
  expect(response.status()).toBe(200);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
  await expect(page.locator('[data-connect]')).toBeEnabled();
  await page.getByLabel('Guest endpoint').selectOption('unix7-dc0');
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  return { context, page, errors };
}
const screen = page => page.locator('.guest-xterm .xterm-rows');
async function command(page, text) {
  await page.locator('.guest-xterm textarea').focus();
  await page.keyboard.type(text, { delay: 20 });
  await page.keyboard.press('Enter');
}
async function own(page) {
  await page.locator('[data-acquire]').click();
  await expect(page.locator('[data-release]')).toBeEnabled();
}
async function login(page) {
  await command(page, '');
  await sleep(900);
  if ((await screen(page).innerText()).includes('login:')) {
    await command(page, 'dmr');
    await expect(screen(page)).toContainText('$', { timeout: 15000 });
  }
}
async function challenge(page, prefix) {
  const marker = `${prefix}_${randomBytes(4).toString('hex')}`;
  await command(page, `echo ${marker}`);
  // Require a separate guest output line, not just local terminal input echo.
  await expect.poll(async () => (await screen(page).innerText()).split('\n').some(line => line.trim() === marker), { timeout: 20000 }).toBe(true);
  return marker;
}
function checkConsole(output, marker) {
  expect(output.replaceAll('\r', '').split('\n').some(line => line.trim() === marker)).toBe(true);
  expect(output).toContain('$');
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const owner = await client(browser), contender = await client(browser), observer = await client(browser, reader);
    await expect(observer.page.locator('[data-acquire]')).toBeDisabled();
    await own(owner.page);
    await contender.page.locator('[data-acquire]').click();
    await expect(contender.page.locator('.guest-status')).toContainText('Keyboard unavailable');
    await expect(contender.page.locator('[data-release]')).toBeDisabled();
    await login(owner.page);
    await command(owner.page, 'ls /');
    for (const directory of ['bin', 'etc', 'usr']) await expect(screen(owner.page)).toContainText(directory, { timeout: 20000 });
    const marker = await challenge(owner.page, `M53_${name}`);
    await expect(screen(contender.page)).toContainText(marker);
    await expect(screen(observer.page)).toContainText(marker);
    await owner.page.getByLabel('Backspace encoding').selectOption('35');
    await owner.page.locator('.guest-xterm textarea').focus();
    await owner.page.keyboard.type('echo ERASE_OKX');
    await owner.page.keyboard.press('Backspace');
    await owner.page.keyboard.press('Enter');
    await expect.poll(async () => /\nERASE_OK\n/.test(await screen(owner.page).innerText()), { timeout: 20000 }).toBe(true);
    const transcript = await screen(owner.page).innerText();
    await owner.page.screenshot({ path: `${root}/browser-${name}.png` });
    await owner.context.close();
    await sleep(400);
    const consoleMarker = `CONSOLE_AFTER_CLOSE_${name}`;
    const consoleOutput = await harness('console', `echo ${consoleMarker}\r`);
    checkConsole(consoleOutput, consoleMarker);
    results.independence.push({ browser: name, operator: consoleOutput });
    await own(contender.page);
    await challenge(contender.page, `AFTER_CLOSE_${name}`);
    await contender.page.locator('[data-release]').click();
    await contender.page.locator('[data-disconnect]').click();
    await contender.page.locator('[data-connect]').click();
    await expect(contender.page.locator('.guest-heading')).toContainText('READ-ONLY');
    await expect(screen(contender.page)).not.toContainText(marker);
    await own(contender.page);
    await challenge(contender.page, `RECONNECTED_${name}`);
    await contender.page.reload();
    await contender.page.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
    await expect(contender.page.locator('[data-release]')).toBeDisabled();
    expect([...owner.errors, ...contender.errors, ...observer.errors]).toEqual([]);
    results.browsers.push({ name, passed: true, transcript, viewers: 3, reconnectReadOnly: true, refreshDisconnected: true, eraseMapping: true });
    save();
    console.log(`${name}: genuine M5.3 guest commands and console independence passed`);
  } finally { await browser.close(); }
}

const browser = await chromium.launch();
try {
  const first = await client(browser);
  await own(first.page);
  await harness('bridge-stop');
  await expect(first.page.locator('.guest-heading')).toContainText('DISCONNECTED');
  const marker = 'CONSOLE_WITHOUT_BRIDGE_M53';
  const independent = await harness('console', `echo ${marker}\r`);
  checkConsole(independent, marker);
  await harness('bridge-start');
  const second = await client(browser);
  await own(second.page);
  await login(second.page);
  await challenge(second.page, 'BRIDGE_RETURNED_M53');
  await second.page.locator('[data-release]').click();
  await second.page.locator('[data-disconnect]').click();
  results.restart = { passed: true, operator: independent };
  save();
} finally { await browser.close(); }
console.log('PASS: M5.3 genuine guest, three engines, observers, ownership, reconnect and independent console through bridge restart.');
