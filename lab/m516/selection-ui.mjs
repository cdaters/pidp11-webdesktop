// Actual optional UI script in three browser engines, with explicitly fake HTTP.
// This is not upstream-app authentication, history storage or model acceptance.
import {chromium, firefox, webkit, expect} from '@playwright/test';
import {readFileSync, writeFileSync} from 'node:fs';
const source = readFileSync('integrations/hacker-replicant/read-only-ui.js', 'utf8');
const results = [];
for (const [engineName, engine] of Object.entries({chromium, firefox, webkit})) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    await page.clock.install();
    let publications = 0;
    await page.route('https://selection-fixture.invalid/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({contentType:'text/html', body:`<!doctype html>
        <input id="tools-toggle"><input id="backend-toggle"><div id="toggle-label"></div>
        <div id="action-hint"></div><div class="hp-lights"></div>
        <span id="backend-label"></span><span class="toggle-hint"></span>
        <div class="hp-screen-inner"></div><input id="chat-input">`});
      if (path === '/api/readonly') return route.fulfill({json:{model:'labeled-fixture'}});
      if (path === '/api/selection') {
        const body = route.request().postDataJSON();
        if (body.revoke) return route.fulfill({json:{shared:false}});
        expect(body).toEqual({text:'Explicit fixture excerpt',consent:true});
        publications++;
        return route.fulfill({json:{shared:true,selectionId:String(publications).repeat(32)}});
      }
      throw Error('Unexpected fixture route: '+path);
    });
    await page.goto('https://selection-fixture.invalid/');
    await page.evaluate(() => {
      window.revocationEvents = 0;
      window.addEventListener('pidp11-revoke', () => window.revocationEvents++);
    });
    await page.addScriptTag({content:source});
    const input = page.getByLabel('Selected excerpt');
    const include = page.locator('#include-selection');
    await input.fill('Explicit fixture excerpt');
    await page.getByRole('button',{name:'Approve selected excerpt for 30 seconds'}).click();
    await expect(include).toHaveAttribute('data-selection-id','1'.repeat(32));
    await include.check();
    await page.getByRole('button',{name:'Revoke shared excerpt'}).click();
    await expect(include).not.toBeChecked();
    await expect(include).not.toHaveAttribute('data-selection-id');
    await expect(input).toHaveValue('');
    await expect.poll(()=>page.evaluate(()=>window.revocationEvents)).toBe(2);
    await input.fill('Explicit fixture excerpt');
    await page.getByRole('button',{name:'Approve selected excerpt for 30 seconds'}).click();
    await expect(include).toHaveAttribute('data-selection-id','2'.repeat(32));
    await include.check();
    await page.clock.fastForward(31000);
    await expect(include).not.toBeChecked();
    await expect(include).not.toHaveAttribute('data-selection-id');
    await expect.poll(()=>page.evaluate(()=>window.revocationEvents)).toBe(4);
    results.push({browser:engineName,fixture:true,actualOptionalUIScript:true,
      explicitRevokeClearsLocalReceipt:true,expiryClearsLocalReceipt:true,
      historyResetEventDispatched:true,upstreamHistoryStorageVerified:false,realModel:false});
  } finally {
    await browser.close();
  }
}
writeFileSync(process.argv[2],JSON.stringify(results,null,2)+'\n',{flag:'wx'});
