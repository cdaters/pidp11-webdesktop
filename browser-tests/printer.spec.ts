import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { shortPrinterSample } from "../src/printer.ts";

async function openPrinter(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Open Line printer',exact:true}).click();
  return page.locator('[data-window="printer"]');
}
test('continuous paper, fixed pitch, keyboard controls and byte-exact spool download', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const app=await openPrinter(page);
  await expect(app.locator('.paper-position')).toContainText('LP0 ready');
  await expect(app.locator('.paper-ink').filter({hasText:/\S/})).toHaveCount(0);
  await app.locator('[data-sample]').focus();await page.keyboard.press('Enter');
  await app.locator('[data-print]').focus();await page.keyboard.press('Enter');await expect(app.locator('[data-print]')).toBeFocused();
  await expect(app.locator('.printer-paper')).toContainText('HELLO, WORLD');
  const metrics=await app.locator('.paper-line').evaluateAll(rows=>rows.slice(0,4).map(r=>({
    height:r.getBoundingClientRect().height, ink:getComputedStyle(r.querySelector('.paper-ink')!).backgroundColor,
    whitespace:getComputedStyle(r.querySelector('.paper-ink')!).whiteSpace,
    hole:getComputedStyle(r,'::before').content,
  })));
  expect(metrics.every(r=>r.height===18&&r.whitespace==='pre')).toBeTruthy();
  expect(metrics[0]!.ink).not.toBe(metrics[1]!.ink);expect(metrics[0]!.ink).toBe(metrics[2]!.ink);
  expect(metrics[0]!.hole).toBe('""');expect(metrics[1]!.hole).toBe('none');
  const download=page.waitForEvent('download');await app.locator('[data-spool]').click();
  expect(await readFile((await (await download).path())!, 'utf8')).toBe(`--- HELLO.MAC listing ---\n${shortPrinterSample}`);
  await app.getByLabel('Paper columns').selectOption('132');
  expect(await app.locator('.paper-viewport').evaluate(e=>e.scrollWidth>e.clientWidth)).toBeTruthy();
  await app.locator('.paper-viewport').focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>app.locator('.paper-viewport').evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await app.locator('[data-clear]').click();await expect(app.locator('.paper-position')).toContainText('LP0 ready');
  expect(errors).toEqual([]);
});

test('new output follows only at the end; reading position and page perforations survive refresh/resize',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const app=await openPrinter(page), view=app.locator('.paper-viewport');
  await app.getByLabel('Sample listing').selectOption('diagnostic');
  await app.locator('[data-sample]').click();await app.locator('[data-print]').click();
  expect(await view.evaluate(e=>e.scrollTop)).toBe(0);
  await view.evaluate(e=>{e.scrollTop=66*18-90;});
  await expect(app.locator('.perforation')).toHaveCount(1);
  const top=await view.evaluate(e=>e.scrollTop);
  await app.locator('[data-sample]').click();await app.locator('[data-print]').click();
  expect(await view.evaluate(e=>e.scrollTop)).toBe(top);
  await expect(app.locator('.paper-position')).not.toContainText('following');
  await app.locator('[data-bottom]').click();
  await expect.poll(()=>view.evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop)).toBeLessThan(2);
  await app.locator('[data-sample]').click();await app.locator('[data-print]').click();
  await expect.poll(()=>view.evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop)).toBeLessThan(2);
  await app.locator('[data-top]').click();await expect.poll(()=>view.evaluate(e=>e.scrollTop)).toBe(0);
  await page.getByRole('button',{name:'Maximize / restore Line printer',exact:true}).click();
  expect(await view.evaluate(e=>e.clientHeight)).toBeGreaterThan(500);
  await expect(app.locator('.paper-ink').first()).toContainText('MEMORY.MAC');
});

test('long and form-feed-heavy output is bounded, escaped, and navigable',async({page})=>{
  await openPrinter(page);
  await page.evaluate(async()=>{
    const modulePath='/src/printer.ts';
    const {PaperViewer}=await import(/* @vite-ignore */ modulePath);
    const host=document.createElement('div'); host.id='paper-fixture';host.className='paper-viewport';
    host.style.cssText='position:fixed;inset:50px;width:700px;height:400px;z-index:99999';
    const status=document.createElement('span');status.id='fixture-status';document.body.append(host,status);
    const viewer=new PaperViewer(host,status);
    viewer.update('<script>bad()</script>\tCOLUMN\n'+'X'.repeat(16000)+'\f'.repeat(16000)+'END');
    (window as any).paperFixture=viewer;
  });
  const host=page.locator('#paper-fixture');
  await expect(host).toContainText('<script>bad()</script>');await expect(host.locator('script')).toHaveCount(0);
  expect(await host.locator('.paper-line').count()).toBeLessThan(40);
  expect(await host.evaluate(e=>e.scrollHeight)).toBeLessThanOrEqual(8000000);
  await host.evaluate(e=>{e.scrollTop=e.scrollHeight;});
  await expect(page.locator('#fixture-status')).toContainText('/ 16001');
  await expect(host).toContainText("END");
  // The final printed line stays visible, even with a compressed scrollbar.
  await page.evaluate(()=>{const v=(window as any).paperFixture;v.dispose();});
});
