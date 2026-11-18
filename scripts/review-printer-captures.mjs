// Actual local application captures; no Pi, guest session or copied listing.
import { chromium, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1500,height:1050},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
const path=name=>`docs/screenshots/m432-printer-${name}.png`;
try {
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Open Line printer',exact:true}).click();
 const app=page.locator('[data-window="printer"]'),view=app.locator('.paper-viewport');
 await expect(app.locator('.paper-line').first()).toBeVisible();
 await app.screenshot({path:path('empty')});
 await app.locator('[data-sample]').click();await app.locator('[data-print]').click();
 await expect(app.locator('.printer-paper')).toContainText('HELLO, WORLD');
 await app.screenshot({path:path('short')});
 await app.locator('[data-clear]').click();
 await app.getByLabel('Sample listing').selectOption('diagnostic');
 await app.locator('[data-sample]').click();await app.locator('[data-print]').click();
 await expect(app.locator('.printer-paper')).toContainText('MEMORY.MAC');
 await app.screenshot({path:path('dense')});
 await view.evaluate(e=>{e.scrollTop=18*55;});
 await expect(app.locator('.perforation')).toHaveCount(1);
 await app.screenshot({path:path('pages')});
 await app.locator('[data-top]').click();
 await page.getByRole('button',{name:'Maximize / restore Line printer',exact:true}).click();
 await page.screenshot({path:path('maximized')});
 await app.getByLabel('Paper columns').selectOption('132');
 await app.screenshot({path:path('132-columns')});
 await page.getByRole('button',{name:'Maximize / restore Line printer',exact:true}).click();
 // Use the real keyboard resize handle, not altered screenshot CSS.
 const resize=page.getByRole('button',{name:'Resize Line printer',exact:true});
 await resize.focus();
 for(let i=0;i<8;i++)await page.keyboard.press('Shift+ArrowLeft');
 for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowUp');
 await app.getByLabel('Paper columns').selectOption('80');
 await app.screenshot({path:path('compact')});
 const compare=await browser.newPage({viewport:{width:1500,height:860}});
 const encoded=name=>readFileSync(path(name)).toString('base64');
 await compare.setContent(`<style>body{margin:24px;background:#eeeade;color:#263430;font:16px Arial}.pair{display:flex;align-items:flex-start;gap:22px}section{width:715px}h2{font-size:18px}img{width:100%;height:auto}</style><h1>LP0 · original and continuous-form presentation</h1><div class="pair"><section><h2>Before · checkpoint/m4.3.1</h2><img src="data:image/png;base64,${encoded('before')}"></section><section><h2>After · same browser-only spool lifecycle</h2><img src="data:image/png;base64,${encoded('short')}"></section></div>`);
 await compare.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await compare.screenshot({path:path('before-after'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Printer captures saved: empty, short, dense, pages, maximized, 132 columns, compact, before/after. No console errors.');
} finally {await browser.close();}
