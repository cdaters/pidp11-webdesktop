// One genuine RSX PIP job. No intercepted routes or host-written printer bytes.
import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { acquireCampaign } from '../m515/campaign.mjs';

const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m520/rsx')) throw Error('Fresh M5.20 RSX work directory required');
const release = acquireCampaign(root);
const browser = await chromium.launch();
const base = 'https://127.0.0.1:8449';
let page, screen;
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1100 } });
  expect((await context.request.post(base + '/api/v1/login', {
    headers: { Origin: base }, data: { token: readFileSync(root + '/writer.token', 'utf8').trim() },
  })).status()).toBe(200);
  page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: 'Open Guest terminal', exact: true }).click();
  const terminal = page.locator('[data-window="guest"]');
  await terminal.getByLabel('Guest endpoint').selectOption('rsx-dz0');
  await terminal.locator('[data-connect]').click();
  await terminal.locator('[data-acquire]').click();
  await expect(terminal.locator('[data-release]')).toBeEnabled();
  screen = terminal.locator('.xterm-rows');
  const command = async (value) => {
    await terminal.locator('.guest-xterm textarea').focus();
    await page.keyboard.type(value, { delay: 10 });
    await page.keyboard.press('Enter');
  };
  const prompt = () => expect.poll(() => screen.innerText(), { timeout: 10000 }).toMatch(/>\s*$/);
  await command('');
  await prompt();
  await command('HELLO SYSTEM');
  await expect.poll(() => screen.innerText()).toMatch(/Password:|Logged on/i);
  if (/Password:/.test(await screen.innerText())) await command('SYSTEM');
  await prompt();
  await command('SET /VT100=TI:');
  await prompt();

  await page.getByRole('button', { name: 'Open Line printer', exact: true }).click();
  const printer = page.locator('[data-window="printer"]');
  await printer.getByRole('button', { name: 'Observe device', exact: true }).click();
  await printer.locator('[data-inventory]').click();
  await printer.getByLabel('Live peripheral').selectOption('rsx-lp11');
  await printer.locator('[data-follow]').click();
  await expect(printer.locator('[data-activity-status]')).toContainText('OBSERVING');

  // One reviewed ASCII line at a time; Return is a separate real keyboard event.
  // The host retains this input as evidence, but never writes the device spool.
  const lines = Array.from({ length: 160 }, (_, index) =>
    `M5.20 RSX LP11 ROW ${String(index + 1).padStart(3, '0')} - PIP THROUGH THE ORIGINAL LPDRV DRIVER`);
  writeFileSync(root + '/printer-input-lines.json', JSON.stringify(lines, null, 2));
  await command('PIP M520LP.TXT=TI:');
  await page.waitForTimeout(300);
  expect(await screen.innerText()).not.toMatch(/PIP --|MCR --/);
  await terminal.locator('.guest-paste > summary').click();
  for (const line of lines) {
    await terminal.getByLabel('Reviewed guest paste').fill(line);
    await terminal.locator('[data-paste]').click();
    await terminal.locator('.guest-xterm textarea').focus();
    await page.keyboard.press('Enter');
    await expect(screen).toContainText(line);
    expect(await screen.innerText()).not.toMatch(/MCR --|PIP --/);
  }
  await terminal.locator('.guest-xterm textarea').focus();
  await page.keyboard.press('Control+z');
  await prompt();
  await command('PIP M520LP.TXT/LI');
  await expect(screen).toContainText('M520LP.TXT;1');
  await prompt();
  await command('PIP LP:=M520LP.TXT');
  await prompt();
  expect(await screen.innerText()).not.toMatch(/PIP --|MCR --/);
  await expect.poll(() => printer.locator('[data-activity-count]').innerText(), { timeout: 10000 }).toMatch(/[1-9][0-9]{3,} \/ [1-9]/);
  await expect(printer.locator('[data-save]')).toBeDisabled();
  await page.getByRole('button', { name: 'Restore Line printer', exact: true }).click();
  await printer.locator('[data-stop]').click();
  await page.getByRole('button', { name: 'Restore Real guest terminal', exact: true }).click();
  await terminal.locator('[data-release]').click();
  writeFileSync(root + '/print-browser-private.txt', await screen.innerText());
  writeFileSync(root + '/print-browser-result.json', JSON.stringify({
    guest: 'RSX-11M-PLUS V4.6 BL87', engine: 'chromium', program: 'PIP M2101 (ANSI)',
    commands: ['PIP M520LP.TXT=TI:', 'PIP M520LP.TXT/LI', 'PIP LP:=M520LP.TXT'],
    inputLines: lines.length, liveStatus: await printer.locator('[data-activity-status]').innerText(),
    counts: await printer.locator('[data-activity-count]').innerText(), completionNotInferredFromIdle: true,
  }, null, 2));
  await page.screenshot({ path: root + '/printer-live.png' });
  await terminal.locator('[data-logout]').click();
  console.log('Genuine RSX PIP print reached the browser; producer completion still pending.');
} catch (error) {
  if (screen) writeFileSync(root + '/print-failure-private.txt', await screen.innerText());
  if (page) await page.screenshot({ path: root + '/print-failure.png' });
  throw error;
} finally {
  await browser.close();
  release();
}
