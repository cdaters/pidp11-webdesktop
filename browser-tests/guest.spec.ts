import {test,expect} from '@playwright/test';
// Renderer/transport fixture only. Genuine guest acceptance is lab/m50/browser.mjs.
test('guest adapter preserves split sequences, explicit ownership, safe paste and fresh reconnect',async({page})=>{
 await page.route('**/api/v1/session',r=>r.fulfill({json:{capabilities:{'terminal.observe':true,'terminal.input':true},csrf:'fixture'}}));
 await page.route('**/api/v1/terminals',r=>r.fulfill({json:[{id:'fixture',label:'Transport fixture · not a guest'}]}));
 const inputs:string[]=[];let connections=0,owned=false;
 await page.routeWebSocket('**/api/v1/terminals/fixture/ws',ws=>{
  connections++;owned=false;ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:connections}));
  ws.onMessage(data=>{const m=JSON.parse(String(data));if(m.type==='acquire'){owned=true;ws.send(JSON.stringify({type:'state',connected:true,owner:true,epoch:connections}));for(const text of ['\x1b[2','J\x1b[H','FIXTURE READY'])ws.send(JSON.stringify({type:'output',data:btoa(text)}));}if(m.type==='input')inputs.push(atob(m.data));if(m.type==='release'){owned=false;ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:connections+1}));}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
 await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
 await page.locator('.guest-xterm textarea').focus();await page.keyboard.type('ignored');expect(inputs).toEqual([]);
 await page.locator('[data-acquire]').click();await expect(page.locator('.guest-xterm .xterm-rows')).toContainText('FIXTURE READY');
 await page.locator('.guest-xterm textarea').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Backspace');
 await expect.poll(()=>inputs.join('')).toBe('\x1b[A\x7f');
 await page.locator('.guest-xterm textarea').evaluate(el=>{
    const data=new DataTransfer();data.setData('text/plain','unexpected\ncommand');
    el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  });
  await expect(page.locator('.guest-status')).toContainText('without Return');
  expect(inputs.join('')).toBe('\x1b[A\x7f');
  await page.locator('.guest-paste').evaluate(e=>(e as HTMLDetailsElement).open=true);
 await page.getByLabel('Reviewed guest paste').fill('ls /');await page.locator('[data-paste]').click();
 await expect.poll(()=>inputs.join('')).toBe('\x1b[A\x7fls /');
 await page.locator('[data-release]').click();await expect(page.locator('[data-acquire]')).toBeEnabled();
 await page.locator('[data-disconnect]').click();await page.locator('[data-connect]').click();
 await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');expect(connections).toBe(2);expect(owned).toBe(false);
 await expect(page.locator('.guest-xterm .xterm-rows')).not.toContainText('FIXTURE READY');
 await expect(page.locator('#panel-source')).toContainText('SIMULATED');
});
