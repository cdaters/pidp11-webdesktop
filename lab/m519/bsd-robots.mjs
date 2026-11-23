// Installed 2.11BSD robots(6), genuine curses application over the approved DZ11.
// Run only after the vi/pager campaign has exited. No transport interception.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { acquireCampaign } from '../m515/campaign.mjs';
const root = process.env.PIDP_BSD_WORK;
if (!root?.endsWith('/m519/bsd')) throw Error('Fresh M5.19 BSD working directory required');
const release = acquireCampaign(root);
const results = [];
try {
  for (const [name, engine] of Object.entries({chromium, firefox, webkit})) {
    const browser = await engine.launch();
    const frames = [];
    let page;
    try {
      const context = await browser.newContext({ignoreHTTPSErrors:true, viewport:{width:1440,height:1000}});
      const base = 'https://127.0.0.1:8446';
      expect((await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token:readFileSync(root+'/writer.token','utf8').trim()}})).status()).toBe(200);
      page = await context.newPage();
      page.on('websocket',socket=>socket.on('framereceived',frame=>{if(frames.length<3000)frames.push(String(frame.payload));}));
      await page.goto(base);
      await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
      await page.getByLabel('Guest terminal personality').selectOption('vt100');
      await page.locator('[data-connect]').click();await page.locator('[data-acquire]').click();
      await expect(page.locator('[data-release]')).toBeEnabled();
      const screen = page.locator('.guest-xterm .xterm-rows');
      const type = async (text, enter=true) => { await page.locator('.guest-xterm textarea').focus();await page.keyboard.type(text,{delay:15});if(enter)await page.keyboard.press('Enter'); };
      await type('');await expect.poll(()=>screen.innerText()).toMatch(/login:|#\s*$/);
      if((await screen.innerText()).includes('login:')){await type('root');await expect.poll(()=>screen.innerText()).toMatch(/#\s*$/);}
      await type('TERM=vt100; export TERM; /usr/games/robots');
      await expect(screen).toContainText('Directions:',{timeout:15000});
      let initialRedrawRequired = false;
      try { await expect(screen).toContainText('Score:', {timeout:5000}); }
      catch {
        // The first observed run omitted the board tail; retain that limitation.
        // ^L is the game's documented redraw, not a replay of launch/game input.
        initialRedrawRequired = true;
        await page.keyboard.press('Control+l');
        await expect(screen).toContainText('Score:', {timeout:10000});
      }
      await expect(screen).toContainText('@');
      const outputFrames = () => frames.filter(frame => JSON.parse(frame).type === 'output').length;
      const before = outputFrames();
      // A normal step is protected from immediate collision by robots; teleport
      // can kill the player and is not a deterministic continuation checkpoint.
      await type('h',false);
      await expect.poll(outputFrames).toBeGreaterThan(before);
      await page.keyboard.press('Control+l');await expect(screen).toContainText('Score:');
      await page.locator('.terminal-workstation > summary').click();
      await page.getByLabel('Terminal phosphor').selectOption('amber');
      await page.locator('[data-focus]').click();
      await page.screenshot({path:root+`/robots-${name}.png`});
      writeFileSync(root+`/robots-${name}-display.txt`,await screen.innerText());
      await type('q',false);
      await expect(screen).toContainText('Really quit');
      await type('y',false);
      await expect.poll(()=>screen.innerText(),{timeout:10000}).toMatch(/#\s*$/);
      // Genuine guest BEL: no browser-generated timer/fixture supplies output.
      const bellCount = async () => Number((await page.locator('[data-bell-count]').innerText()).split(' ')[0]);
      const beforeBEL = await bellCount();
      await type(`awk 'BEGIN {printf "%c",7;exit}'`);
      await expect.poll(bellCount).toBeGreaterThan(beforeBEL);
      await expect.poll(()=>screen.innerText()).toMatch(/#\s*$/);
      await page.locator('[data-disconnect]').click();await page.locator('[data-connect]').click();
      await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
      results.push({browser:name,guest:'2.11BSD #11',personality:'vt100',application:'/usr/games/robots',initialRedrawRequired,stepOrBlockedStepResponse:true,redraw:true,quitToShell:true,genuineBEL:true,reconnectReadOnly:true});
      writeFileSync(root+'/robots-results.json',JSON.stringify(results,null,2)+'\n');
      console.log(`${name}: genuine robots, redraw, quit and BEL passed`);
    } finally {
      writeFileSync(root+`/robots-${name}-frames.json`,JSON.stringify(frames));
      if(page)writeFileSync(root+`/robots-${name}-final.txt`,await page.locator('.guest-xterm .xterm-rows').innerText().catch(()=>''));
      await browser.close();
    }
  }
} finally { release(); }
