// Genuine RT-11 console utilities observed by Chromium. Private lab IPC is owned
// independently of the browser application; no guest login shell is assumed.
import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
const root = process.env.PIDP_RT_WORK;
if (!root?.endsWith('/m522/rt11')) throw Error('Reviewed RT-11 work directory required');
const browser = await chromium.launch();
const results = [];
try {
  const base = 'https://127.0.0.1:8449';
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
  const login = await context.request.post(base + '/api/v1/login', { headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() } });
  expect(login.status()).toBe(200);
  const session = await login.json();
  const page = await context.newPage();
  await page.goto(base);
  async function request(prefix, payload) {
    if (existsSync(`${root}/${prefix}request.json`)) throw Error('Outstanding request; no replay');
    const key = prefix ? 'request_id' : 'id', id = randomUUID();
    writeFileSync(`${root}/${prefix}request.tmp`, JSON.stringify({ ...payload, [key]: id }));
    renameSync(`${root}/${prefix}request.tmp`, `${root}/${prefix}request.json`);
    for (let n = 0; n < 350; n++) {
      await page.waitForTimeout(100);
      const file = `${root}/${prefix}response.json`;
      if (existsSync(file)) {
        const result = JSON.parse(readFileSync(file, 'utf8'));
        if (result[key] === id) return result;
      }
    }
    throw Error('Uncertain response; preserve without replay');
  }
  const operator = line => request('supervisor-', { line });
  const console = data => request('', { op: 'console', data, wait: .3 });
  for (const kind of ['lp', 'punch']) {
    const job = kind === 'lp' ? 'rt11-print-1' : 'rt11-tape-1';
    const reader = JSON.parse(readFileSync(root + '/reader1.json', 'utf8'));
    await operator(`begin ${kind} ${job}${kind === 'punch' ? ' ' + reader.sha256 : ''}`);
    await page.getByRole('button', { name: `Open ${kind === 'lp' ? 'Line printer' : 'Paper tape'}`, exact: true }).click();
    const win = page.locator(`[data-window="${kind === 'lp' ? 'printer' : 'paper'}"]`);
    await win.locator('.window-titlebar').dblclick();
    await win.getByRole('button', { name: 'Observe device', exact: true }).click();
    await win.locator('[data-inventory]').click();
    await win.getByLabel('Live peripheral').selectOption(kind);
    await win.locator('[data-follow]').click();
    await expect(win.locator('[data-activity-count]')).toContainText('0 / 0');
    let expected;
    if (kind === 'lp') {
      await console('COPY/ASCII TT: LP:\r');
      const lines = Array.from({ length: 3 }, (_, n) => `M5.22 RT11 PRINTER RECORD ${n + 1} - ORIGINAL LP HANDLER`);
      for (const line of lines) await console(line + '\r');
      const returned = await console('\x1a');
      expect(returned.output).toContain('.');
      expected = Buffer.from('\f' + lines.map(line => line + '\n').join('') + '\n');
    } else {
      const read = await console('COPY/ASCII PC: T522.TXT\r');
      expect(read.output).not.toContain('?');
      const display = await console('TYPE T522.TXT\r');
      expect(display.output).toContain('M5.22 RT11 PAPER TAPE RECORD 3');
      const returned = await console('COPY/ASCII T522.TXT PC:\r');
      expect(returned.output).not.toContain('?');
      expected = Buffer.alloc(512);
      Buffer.from(Array.from({ length: 3 }, (_, n) => `M5.22 RT11 PAPER TAPE RECORD ${n + 1}\r\n`).join('')).copy(expected);
    }
    await expect(win.locator('[data-save]')).toBeDisabled();
    await operator(`returned ${kind} Original COPY returned to independently operated RT11 monitor`);
    const closed = await request('', { op: kind === 'lp' ? 'close-printer' : 'close-pc11', guest_safe: true });
    expect(closed.output).toContain('CSR:\t000200');
    expect(closed.output).toContain(`POS:\t${expected.length}`);
    const actual = readFileSync(root + (kind === 'lp' ? '/lp1.out' : '/punch1.bin'));
    expect(actual).toEqual(expected);
    if (kind === 'punch') {
      expect(closed.output).toContain('CSR:\t100000');
      await operator(`reader punch ${reader.bytes} eof`);
    }
    await operator(`drained ${kind} ${actual.length} Original device ready and decimal POS independently inspected`);
    await operator(`closed ${kind} Original idle device detached and host file flushed`);
    const sha256 = createHash('sha256').update(actual).digest('hex');
    await operator(`complete ${kind} ${sha256}`);
    await expect(win.locator('[data-save]')).toBeEnabled();
    const pending = page.waitForEvent('download');
    await win.locator('[data-save]').click();
    const chunks = [];
    for await (const chunk of (await (await pending).createReadStream())) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toEqual(actual);
    results.push({ job, bytes: actual.length, sha256, observedEmptyBeforeCommand: true, completionWithheldUntilSafeClose: true, exactBrowserDownload: true, guestCommandViaIndependentConsole: true });
    await page.screenshot({ path: `${root}/${job}-chromium.png` });
    await win.locator('.window-titlebar').dblclick();
  }
  expect((await context.request.post(base + '/api/v1/logout', { headers: { Origin: base, 'X-CSRF-Token': session.csrf } })).status()).toBe(204);
} finally {
  writeFileSync(root + '/browser-results.json', JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(results);
