// Genuine installed EDT on an independently booted/approved disposable RSX copy.
// Start after HELLO/HELP/PIP qualification, with that same line logged in and idle.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { acquireCampaign } from '../m515/campaign.mjs';
const root = process.env.PIDP_RSX_WORK;
if (!root?.endsWith('/m519/rsx')) throw Error('Fresh M5.19 RSX directory required');
const release = acquireCampaign(root);
const results = [];
try {
  for (const [index, [name, engine]] of Object.entries({chromium,firefox,webkit}).entries()) {
    const browser = await engine.launch();
    const frames = [];
    let page;
    try {
      const base = 'https://127.0.0.1:8449';
      const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
      expect((await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token:readFileSync(root+'/writer.token','utf8').trim()}})).status()).toBe(200);
      page = await context.newPage();
      page.on('websocket',s=>s.on('framereceived',f=>{if(frames.length<3000)frames.push(String(f.payload));}));
      await page.goto(base);await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
      await page.locator('[data-connect]').click();await page.locator('[data-acquire]').click();await expect(page.locator('[data-release]')).toBeEnabled();
      const screen = page.locator('.guest-xterm .xterm-rows');
      const type = async (text, enter=true) => {await page.locator('.guest-xterm textarea').focus();await page.keyboard.type(text,{delay:20});if(enter)await page.keyboard.press('Enter');};
      await type('');await expect.poll(()=>screen.innerText()).toMatch(/>\s*$/);
      await type('SET /VT100=TI:');await expect.poll(()=>screen.innerText()).toMatch(/>\s*$/);
      const file = `M519F${index}.TXT`;
      await type('EDT '+file);await expect(screen).toContainText('Input file does not exist');await expect.poll(()=>screen.innerText()).toMatch(/\*\s*$/);
      await type('CHANGE');await expect.poll(()=>screen.innerText()).toMatch(/^\[EOB\]\s*$/);
      await type('M519 EDT '+name);await type('SECOND LINE',false);await expect(screen).toContainText('SECOND LINE');
      await page.keyboard.press('ArrowLeft');await page.keyboard.type('X');await expect(screen).toContainText('SECOND LINXE');
      await page.locator('.terminal-workstation > summary').click();
      await page.locator('[data-terminal-key="F1"]').click();
      await page.getByText('DEC keypad and VT220 editing keys',{exact:true}).click();
      await page.locator('[data-terminal-key="Numpad7"]').click();
      await expect(screen).toContainText('Command:');
      await type('TYPE WHOLE',false);
      await page.locator('[data-terminal-key="NumpadEnter"]').click();
      await expect(screen).toContainText('Press return to continue');
      await page.keyboard.press('Enter');
      await expect(screen).not.toContainText('Press return to continue');
      await expect(screen).toContainText('SECOND LINXE');
      // CTRL/Z is the documented return from keypad to line mode.
      await page.locator('.guest-xterm textarea').focus();await page.keyboard.press('Control+z');
      await expect.poll(()=>screen.innerText()).toMatch(/\*\s*$/);
      await type('TYPE WHOLE');await expect(screen).toContainText('SECOND LINXE');
      await page.screenshot({path:root+`/edt-${name}.png`});
      await type('EXIT');await expect(screen).toContainText('lines');await expect.poll(()=>screen.innerText()).toMatch(/>\s*$/);
      await type('PIP TI:='+file);await expect(screen).toContainText('M519 EDT '+name);await expect(screen).toContainText('SECOND LINXE');await expect.poll(()=>screen.innerText()).toMatch(/>\s*$/);
      await page.locator('[data-disconnect]').click();await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
      results.push({browser:name,guest:'RSX-11M-PLUS V4.6 BL87',personality:'vt100',application:'EDT',screenInsert:true,arrowEdit:true,goldKeypadCommand:true,lineModeVerify:true,exitSaveAndRead:true,reconnectReadOnly:true});
      writeFileSync(root+'/edt-results.json',JSON.stringify(results,null,2)+'\n');
      console.log(`${name}: genuine EDT screen/keypad, save and readback passed`);
    } finally {
      writeFileSync(root+`/edt-${name}-frames.json`,JSON.stringify(frames));
      if(page)writeFileSync(root+`/edt-${name}-final.txt`,await page.locator('.guest-xterm .xterm-rows').innerText().catch(()=>''));
      await browser.close();
    }
  }
} finally {release();}
