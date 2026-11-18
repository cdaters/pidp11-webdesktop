// Local review captures only. The original checkpoint and photographs remain untouched.
import { chromium, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

const baseSource = execFileSync('git', ['show', 'checkpoint/m4.3:src/paddles.ts'], {encoding: 'utf8'});
const baseline = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(baseSource)).toString('base64')}`);
const css = readFileSync('src/panel.css', 'utf8');
const photo = readFileSync('docs/references/bottom-switches.png').toString('base64');
const output = 'docs/screenshots';
mkdirSync(output, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1500, height: 1000}, deviceScaleFactor: 1});
const comp = await browser.newPage({viewport: {width: 1320, height: 1060}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const capture = name => page.screenshot({path: `${output}/m431-${name}.png`});
// Separate IDs are essential: an SVG fragment reference can resolve to the first
// matching document ID, which would otherwise make AFTER use BEFORE's paths.
function svgView(svg, box, id, className = 'bank') {
 return svg.replace('viewBox="0 0 1200 688"', `viewBox="${box}"`)
  .replace('class="front-panel"', `class="front-panel ${className}"`)
  .replace(/id="([^"]+)"/g, `id="${id}-$1"`)
  .replace(/href="#/g, `href="#${id}-`)
  .replace(/url\(#/g, `url(#${id}-`)
  .replace(/href="(\/[^\"]+)"/g, 'href="http://127.0.0.1:5173$1"');
}
const bank = (svg, id) => svgView(svg, '68 438 790 183', id);
const style = `<style>${css}body{margin:24px;background:#eeeade;font:15px Arial;color:#31342e}h2{font-size:16px;margin:14px 0 7px}img,.bank{display:block;width:1226px;height:284px}.bank{background:#bdb9a7}.pair{display:flex;gap:24px}.details{display:flex;gap:30px}.detail{width:204px;height:930px}.functions{width:1180px;height:646px}</style>`;
const photograph = `<img alt="Unchanged primary PDP-11 switch photograph" src="data:image/png;base64,${photo}">`;
async function register(value, pose) {
 await page.locator('#register-input').fill(value);
 await page.locator('#register-form button').click();
 if (pose) await expect(page.locator(`.register-switch [data-pose="${pose}"]`)).toHaveCount(22);
 return page.locator('.front-panel').evaluate(el => el.outerHTML);
}
async function comparison(name, html, width, height) {
 await comp.setViewportSize({width, height});
 await comp.setContent(style + html);
 await comp.evaluate(() => document.fonts.ready);
 await comp.screenshot({path: `${output}/m431-${name}.png`, fullPage: true});
}
try {
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button', {name: 'Open Front panel', exact: true}).click();
 // SVG <image> decoding is asynchronous even when Vite inlines the asset.
 await page.locator('.front-panel image').evaluate(async element => {
  const image = new Image(); image.src = element.getAttribute('href'); await image.decode();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
 });
 const down = await register('0', 'down');
 const up = await register('17777777', 'up');
 const matched = await register('107');
 const before = matched.replace(/<defs>[\s\S]*?<\/defs>/, baseline.paddleDefinitions());
 await page.getByRole('button',{name:'Full panel',exact:true}).click();
 await expect(page.locator('#toast')).not.toHaveClass(/visible/,{timeout:6000});
 await page.waitForTimeout(250);
 await capture('full-panel');
 await page.getByRole('button',{name:'Compact',exact:true}).click();
 await page.waitForTimeout(250);
 await capture('compact-panel');
 await page.getByRole('button',{name:'Arrange terminals',exact:true}).click();
 await expect(page.locator('[data-window="terminal-1"] .xterm-rows')).toContainText('LOCAL TERMINAL FIXTURE');
 // FitAddon and the terminal renderer settle after the workspace resize.
 await page.waitForTimeout(250);
 await capture('desktop');
 await page.getByRole('button',{name:'Open Disk drives',exact:true}).click();
 await page.locator('[data-mount="RL0"]').click();
 await expect(page.locator('[data-eject="RL0"]')).toBeEnabled();
 await capture('devices');
 // Capture the live app before rendering copied SVGs in a second page.
 await comparison('switch-side-by-side', `<div class="pair"><section><h2>Primary photograph · unchanged</h2>${photograph}</section><section><h2>Refined application SVG · bits 6, 2, 1, 0 raised</h2>${bank(matched,'after')}</section></div>`, 2540, 380);
 await comparison('before-after-switches', `<h2>Primary photograph · unchanged · bits 6, 2, 1, 0 raised</h2>${photograph}<h2>BEFORE · checkpoint/m4.3 shared paddle geometry</h2>${bank(before,'before')}<h2>AFTER · same state, labels and pigments · rounded surfaces and smaller gaps</h2>${bank(matched,'after')}`,1320,1060);
 await comparison('switch-comparison', `<h2>Primary photograph · unchanged · bits 6, 2, 1, 0 raised</h2>${photograph}<h2>Application SVG · same bit pattern</h2>${bank(matched,'matched')}<h2>All DOWN · fixed red/plum pigment groups</h2>${bank(down,'down')}<h2>All UP · distinct cap, side faces and lower edge</h2>${bank(up,'up')}`,1320,1400);
 await comparison('paddle-details', `<h2>Actual SVG · DOWN red / DOWN plum / UP plum</h2><div class="details">${svgView(down,'88.5 445 34 155','red','detail')}${svgView(down,'122.738095 445 34 155','plum','detail')}${svgView(up,'122.738095 445 34 155','raised','detail')}</div>`,1000,680);
 await comparison('function-paddles', `<h2>Actual SVG · cream lamp test and seven function paddles · existing rest/latch states</h2>${svgView(matched,'838 445 285 156','functions','functions')}`,1230,740);
 if(errors.length) throw Error(errors.join('\n'));
 console.log('Captured photo/state/baseline comparisons, close-ups, full/compact panel, desktop and device application. No page errors.');
} finally { await browser.close(); }
