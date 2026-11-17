import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
try {
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Open Front panel',exact:true}).click();
 await page.locator('#register-input').fill('107');await page.locator('#register-form button').click();
 const svg=await page.locator('.front-panel').evaluate(el=>el.outerHTML);
 const css=readFileSync('src/panel.css','utf8');
 const photo=readFileSync('docs/references/bottom-switches.png').toString('base64');
 // Actual application SVG, cropped by its viewBox; photograph unaltered.
 const bank=(markup)=>markup.replace('viewBox="0 0 1200 688"','viewBox="68 438 790 183"').replace('class="front-panel"','class="front-panel bank"');
 await page.getByRole('button',{name:'Full panel',exact:true}).click();
 await page.screenshot({path:'docs/screenshots/m43-full-panel.png'});
 const comp=await browser.newPage({viewport:{width:1320,height:1500},deviceScaleFactor:1});
 const down=svg.replace(/data-pose="up" href="#p-(red|purple)-up"/g,'data-pose="down" href="#p-$1-down"');
 const up=svg.replace(/data-pose="down" href="#p-(red|purple)-down"/g,'data-pose="up" href="#p-$1-up"');
 await comp.setContent(`<style>${css}body{margin:24px;background:#eeeade;font:15px Arial;color:#31342e}img,.bank{display:block;width:1226px;height:284px}.bank{background:#bdb9a7}h2{margin:14px 0 5px;font-size:16px}.details{display:flex;gap:20px}.detail{width:200px;height:280px}</style><h2>Primary reference · supplied photograph · bits 6, 2, 1, 0 raised</h2><img src="data:image/png;base64,${photo}"><h2>Application SVG · same bit pattern · comparable switch pitch</h2>${bank(svg)}<h2>All DOWN · same fixed pigments and label strip</h2>${bank(down)}<h2>All UP · distinct surfaces, no translated paddle shape</h2>${bank(up)}`);
 await comp.screenshot({path:'docs/screenshots/m43-switch-comparison.png',fullPage:true});
 await comp.setViewportSize({width:2540,height:380});
 await comp.setContent(`<style>${css}body{margin:20px;background:#eeeade;font:15px Arial;color:#31342e}.pair{display:flex;gap:24px}img,.bank{display:block;width:1226px;height:284px}h2{font-size:16px}</style><div class="pair"><section><h2>Supplied primary photograph · unchanged</h2><img src="data:image/png;base64,${photo}"></section><section><h2>Actual application SVG · matching bits 6, 2, 1, 0 raised</h2>${bank(svg)}</section></div>`);
 await comp.screenshot({path:'docs/screenshots/m43-switch-side-by-side.png',fullPage:true});
 await comp.setViewportSize({width:1320,height:760});
 await comp.setContent(`<style>${css}body{margin:24px;background:#eeeade;font:15px Arial}.details{display:flex;gap:32px}.detail{width:250px;height:600px}h2{font-size:16px}</style><h2>Application SVG close-ups · DOWN red / DOWN purple / UP purple / function switches</h2><div class="details">${[down.replace('viewBox="0 0 1200 688"','viewBox="84 445 43 153"'),down.replace('viewBox="0 0 1200 688"','viewBox="118 445 43 153"'),up.replace('viewBox="0 0 1200 688"','viewBox="118 445 43 153"'),svg.replace('viewBox="0 0 1200 688"','viewBox="840 445 280 153"')].map(s=>s.replace('class="front-panel"','class="front-panel detail"')).join('')}</div>`);
 await comp.screenshot({path:'docs/screenshots/m43-paddle-details.png'});await comp.close();
}finally{await browser.close()}
