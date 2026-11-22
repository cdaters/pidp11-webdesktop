// Fresh published/current preview, no guest, model or intercepted API response.
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const [base, resultPath] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:517[56]$/.test(base) || !resultPath) {
  throw Error('Explicit owned preview URL and private result path required');
}
const browser = await chromium.launch();
const errors = [];
const destinations = new Set();
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => destinations.add(new URL(request.url()).origin));
  await page.goto(base);
  const terminal = page.locator('[data-window="terminal-1"]');
  await page.getByRole('button', {name:'Restore DZ0 · DEC terminal', exact:true}).click();
  await terminal.getByRole('button', {name:'Acquire keyboard'}).click();
  await terminal.locator('textarea.xterm-helper-textarea').focus();
  await page.keyboard.type('HELP');
  await page.keyboard.press('Enter');
  await expect(terminal.locator('.xterm-screen')).toContainText('Local terminal fixture');
  await page.getByRole('button', {name:'Open Line printer', exact:true}).click();
  await page.getByRole('button', {name:'Add sample job'}).click();
  await page.getByRole('button', {name:'Print queue', exact:true}).click();
  await expect(page.locator('.printer-paper')).toContainText('HELLO, WORLD');
  await page.getByRole('button', {name:'Open AI Companion', exact:true}).click();
  const companion = page.locator('[data-window="companion"]');
  await companion.getByLabel('Companion question').fill('/calc 16 oct 177776');
  await companion.locator('form button[type="submit"]').click();
  await expect(companion.getByRole('log')).toContainText('decimal 65534 = hex FFFE');
  await expect(companion.locator('[data-status]')).toContainText('No model request');
  expect(errors).toEqual([]);
  expect([...destinations]).toEqual([base]);
  writeFileSync(resultPath, JSON.stringify({browser:'Chromium',terminalHELP:true,
    terminalExplicitlyFixture:true,samplePrinter:true,exactOfflineCalculation:true,
    outsideOriginRequests:false,pageErrors:errors,genuineGuest:false,realModel:false},null,2)+'\n');
} finally {
  await browser.close();
}
