import {test,expect} from '@playwright/test';
// Intercepted UI/lifecycle fixture, not evidence of guest receipt or real modem state.
test('communications filters contradictory profiles, pins generation and expires observations',async({page})=>{
 const serial={simulator:'fixture-instance-1',guest:'UNIX V7',controller:'DC11',unit:0,line:3,guest_device:'/dev/tty03',application:'/bin/cu',peer:'<img src=x onerror=alert(1)>',framing:'ascii7-raw-socket'};
 let connections=0,statusRequests=0,respond=true;const inputs:string[]=[];
 await page.route('**/api/v1/session',r=>r.fulfill({json:{capabilities:{'terminal.observe':true},csrf:'fixture'}}));
 await page.route('**/api/v1/terminals',r=>r.fulfill({json:[
 {id:'wrong',label:'Contradictory line',serial:{...serial,line:2},generation:'old',connected:true,state:'attached'},
 {id:'legacy',label:'No generation',serial,connected:true,state:'attached'},
 {id:'cu',label:'Approved application',serial,generation:'generation-1',connected:true,state:'attached'},
 ]}));
 await page.routeWebSocket('**/api/v1/terminals/cu/generation/generation-1/ws',ws=>{
  connections++;
  const state=()=>ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:1,serial:{received:25,written:20,pending:0,capped:false,sample_unix_ms:1}}));state();
  ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='status'){statusRequests++;if(respond)state();}if(m.type==='input')inputs.push(m.data);});
 });
 await page.goto('/');await page.getByRole('button',{name:'Open Communications',exact:true}).click();
 await expect(page.getByLabel('Guest endpoint').locator('option')).toHaveCount(1);
 expect(connections).toBe(0);
 await page.locator('[data-connect]').click();await expect(page.locator('[data-serial-facts]')).toContainText('Observation · no input ownership');
 await expect(page.locator('[data-acquire]')).toBeDisabled();
 await expect(page.locator('[data-serial-facts]')).toContainText('25 bytes from guest socket');
 await expect(page.locator('[data-serial-facts] img')).toHaveCount(0);
 await page.locator('.guest-xterm textarea').focus();await page.keyboard.type('forbidden');expect(inputs).toEqual([]);
 await expect.poll(()=>statusRequests).toBeGreaterThan(0);
 respond=false;await expect(page.locator('[data-serial-facts]')).toContainText('Current transport state unknown',{timeout:5500});
 await page.locator('[data-disconnect]').click();await expect(page.locator('[data-serial-facts]')).toContainText('Disconnected · no input authority');
 expect(connections).toBe(1);await page.locator('[data-connect]').click();expect(connections).toBe(2);
});

test('delayed directory response cannot relabel an active serial generation', async ({page}) => {
  const serial = {simulator:'fixture-instance-1',guest:'UNIX V7',controller:'DC11',unit:0,line:3,guest_device:'/dev/tty03',application:'/bin/cu',peer:'original peer',framing:'ascii7-raw-socket'};
  let requests = 0;
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/api/v1/session', route => route.fulfill({json:{capabilities:{'terminal.observe':true},csrf:'fixture'}}));
  await page.route('**/api/v1/terminals', async route => {
    requests++;
    const row = {id:'cu',label:'Approved line',serial,generation:'original-generation',connected:true,state:'attached'};
    if (requests === 1) { await route.fulfill({json:[row]}); return; }
    await new Promise<void>(resolve => {
      finish = async () => {
        await route.fulfill({json:[{...row,generation:'replacement-generation',serial:{...serial,peer:'replacement peer'}}]});
        resolve();
      };
    });
  });
  await page.routeWebSocket('**/api/v1/terminals/cu/generation/original-generation/ws', socket => {
    socket.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:1}));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open Communications',exact:true}).click();
  await expect(page.locator('[data-connect]')).toBeEnabled();
  await page.locator('[data-refresh]').click();
  await expect.poll(() => !!finish).toBe(true);
  await page.locator('[data-connect]').click();
  await expect(page.locator('[data-serial-facts]')).toContainText('Observation');
  await finish!();
  await expect(page.getByLabel('Guest endpoint').locator('option:checked')).toHaveAttribute('data-generation','original-generation');
  await expect(page.locator('[data-serial-facts]')).toContainText('original peer');
  await expect(page.locator('[data-serial-facts]')).not.toContainText('replacement peer');
});
