import { test, expect, type Page } from "@playwright/test";

// Intercepted transport conformance fixtures, never evidence of genuine guest I/O.
async function fixture(page: Page) {
  await page.route('**/api/v1/session', r => r.fulfill({json:{capabilities:{'terminal.input':true},csrf:'fixture'}}));
  await page.route('**/api/v1/terminals', r => r.fulfill({json:[{id:'conformance',label:'Conformance fixture',connected:true}]}));
  const inputs: string[] = [];
  let output = (_text: string) => {};
  await page.routeWebSocket('**/api/v1/terminals/conformance/ws', ws => {
    output = text => ws.send(JSON.stringify({type:'output',data:btoa(text)}));
    ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:1}));
    ws.onMessage(data => {
      const frame = JSON.parse(String(data));
      if (frame.type === 'release') ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:2}));
      if (frame.type === 'acquire') ws.send(JSON.stringify({type:'state',connected:true,owner:true,epoch:1}));
      if (frame.type === 'input') inputs.push(atob(frame.data));
    });
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
  return { inputs, output: (text: string) => output(text), rows: page.locator('.guest-xterm .xterm-rows > div') };
}

test('workstation search, presentation persistence, keyboard gate and no restored connection', async ({page}) => {
  const f = await fixture(page);
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  f.output('FIRST\r\nneedle in text\r\nlast NEEDLE\r\n');
  await expect(f.rows.nth(1)).toHaveText('needle in text');
  await page.locator('.terminal-workstation > summary').click();
  await page.getByLabel('Find terminal text').fill('needle');
  await page.locator('[data-find-next]').click();
  await expect(page.locator('[data-workstation-status]')).toContainText('Match 1 of 2');
  await page.locator('[data-find-next]').click();
  await expect(page.locator('[data-workstation-status]')).toContainText('Match 2 of 2');
  await page.locator('[data-find-previous]').click();
  await expect(page.locator('[data-workstation-status]')).toContainText('Match 1 of 2');
  await expect(page.locator('[data-terminal-key="F1"]')).toBeDisabled();
  await page.locator('[data-acquire]').click();
  await expect(page.locator('[data-release]')).toBeEnabled();
  await page.locator('[data-terminal-key="LineFeed"]').click();
  await page.locator('[data-terminal-key="F1"]').click();
  await page.locator('.guest-xterm textarea').focus();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+Shift+c');
  await expect.poll(()=>f.inputs.join('')).toBe('\n\x1bOP\x03');
  await page.locator('[data-release]').click();
  await page.locator('.guest-xterm textarea').focus(); await page.keyboard.type('NO INPUT');
  expect(f.inputs.join('')).toBe('\n\x1bOP\x03');
  await page.getByLabel('Terminal phosphor').selectOption('amber');
  await page.getByLabel('Terminal cursor',{exact:true}).selectOption('bar');
  await page.getByLabel('Guest terminal text size').selectOption('20');
  await page.locator('[data-focus]').click();
  await expect(page.locator('.terminal-workstation')).not.toHaveAttribute('open');
  const screenBox = await page.locator('.guest-screen').boundingBox();
  const windowBox = await page.locator('.guest-terminal-app').boundingBox();
  expect(screenBox!.y).toBeGreaterThanOrEqual(windowBox!.y - 1);
  expect(screenBox!.y + screenBox!.height).toBeLessThanOrEqual(windowBox!.y + windowBox!.height + 1);
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('pidp11.terminal.display.v1')!));
  expect(Object.keys(saved).sort()).toEqual(['brightness','cursor','fontSize','glow','phosphor','scanlines']);
  await page.reload();
  await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
  await page.locator('.terminal-workstation > summary').click();
  await expect(page.getByLabel('Terminal phosphor')).toHaveValue('amber');
  await expect(page.getByLabel('Guest terminal text size')).toHaveValue('20');
  await expect(page.locator('[data-acquire]')).toBeDisabled();
  await expect(page.locator('[data-connect]')).toBeEnabled();
  await expect(page.locator('[data-terminal-mute]')).toBeChecked();
});

test('BEL is parser-driven, gesture-gated, muted globally and suppressed outside focus', async ({page}) => {
  // Deterministic audio-node fixture tests invocation, not sound heard by a person.
  await page.addInitScript(() => {
    const state = { contexts:0, starts:0, closes:0 };
    (window as unknown as { audioEvidence:typeof state }).audioEvidence = state;
    class AudioFixture {
      state = 'suspended'; currentTime = 0; destination = {};
      constructor(){state.contexts++;}
      async resume(){this.state='running';}
      async close(){state.closes++;this.state='closed';}
      createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}
      createOscillator(){return {type:'',frequency:{value:0},onended:null as null|(()=>void),connect(g:unknown){return g;},disconnect(){},start(){state.starts++;},stop(){this.onended?.();}};}
    }
    Object.defineProperty(window,'AudioContext',{value:AudioFixture});
  });
  const audio = () => page.evaluate(()=>(window as unknown as {audioEvidence:{contexts:number;starts:number;closes:number}}).audioEvidence);
  const f = await fixture(page);
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  f.output('\x07\x1b]0;title\x07READY');
  await expect(f.rows.nth(0)).toHaveText('READY');
  await expect(page.locator('[data-bell-count]')).toHaveText('1 BEL events');
  expect((await audio()).contexts).toBe(0);
  await page.locator('.terminal-workstation > summary').click();
  await page.locator('[data-enable-sound]').click();
  f.output('\x07');
  await expect.poll(async()=>(await audio()).starts).toBe(1);
  await page.locator('[data-global-mute]').check();
  await page.locator('.guest-xterm textarea').focus();
  f.output('\x07'); await expect(page.locator('[data-bell-count]')).toHaveText('3 BEL events');
  expect((await audio()).starts).toBe(1);
  await page.locator('[data-global-mute]').uncheck();
  await page.getByLabel('Find terminal text').focus();
  // Focus elsewhere in the same workstation is allowed; another desktop control is not.
  await page.getByRole('button',{name:'Open Guest terminal',exact:true}).focus();
  f.output('\x07'); await expect(page.locator('[data-bell-count]')).toHaveText('4 BEL events');
  expect((await audio()).starts).toBe(1);
  await page.locator('[data-terminal-mute]').check();
  await page.locator('.guest-xterm textarea').focus();
  await page.waitForTimeout(250); // Deliberately exceed the audio rate-limit window.
  f.output('\x07'); await expect(page.locator('[data-bell-count]')).toHaveText('5 BEL events');
  expect((await audio()).starts).toBe(1);
  await page.locator('[data-terminal-mute]').uncheck();
  await page.locator('.guest-xterm textarea').focus();
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
  await page.waitForTimeout(250);
  f.output('\x07'); await expect(page.locator('[data-bell-count]')).toHaveText('6 BEL events');
  expect((await audio()).starts).toBe(1);
  await page.evaluate(()=>Reflect.deleteProperty(document,'hidden'));
  f.output('\x07');await expect.poll(async()=>(await audio()).starts).toBe(2);
  await page.locator('[data-disconnect]').click();
  await page.locator('[data-connect]').click();
  await expect(page.locator('[data-bell-count]')).toHaveText('0 BEL events');
  expect(f.inputs).toEqual([]);
  await page.locator('[data-window="guest"]').getByRole('button',{name:'Close Real guest terminal',exact:true}).click();
  await expect.poll(async()=>(await audio()).closes).toBe(1);
});

test('VT100 identification, insert/delete, wrap, reset and VT220 DECID', async ({page}) => {
  const f = await fixture(page);
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  f.output('\x1b[c\x1bZREADY'); await expect(f.rows.nth(0)).toHaveText('READY'); expect(f.inputs).toEqual([]);
  await page.locator('[data-acquire]').click();await expect(page.locator('[data-release]')).toBeEnabled();
  f.output('\x1b[c\x1bZ\x1b[>c');
  await expect.poll(()=>f.inputs.join('')).toBe('\x1b[?1;0c\x1b[?1;0c');
  f.output('\x1b[2J\x1b[HABC\x1b[2G\x1b[@X\x1b[P');await expect(f.rows.nth(0)).toHaveText('AXC');
  f.output('\x1b[3;80HXZ');await expect(f.rows.nth(3)).toHaveText('Z');
  f.output('\x1bcRESET');await expect(f.rows.nth(0)).toHaveText('RESET');
  await page.locator('[data-disconnect]').click();await page.getByLabel('Guest terminal personality').selectOption('vt220');
  await page.locator('[data-connect]').click();await page.locator('[data-acquire]').click();await expect(page.locator('[data-release]')).toBeEnabled();
  f.output('\x1b');f.output('Z');await expect.poll(()=>f.inputs.at(-1)).toBe('\x1b[?62c');
});

test('reduced-motion appearance remains readable and audio failure does not stop output', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:class {constructor(){throw Error('Disabled audio');}}});});
  const f = await fixture(page);
  await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await page.locator('.terminal-workstation > summary').click();
  await page.locator('[data-scanlines]').check();await page.locator('[data-glow]').check();
  expect(await page.locator('.guest-xterm .xterm-rows').evaluate(e=>getComputedStyle(e).textShadow)).toBe('none');
  expect(await page.locator('.guest-xterm .xterm-screen').evaluate(e=>getComputedStyle(e,'::after').display)).toBe('none');
  await page.locator('[data-enable-sound]').click();await expect(page.locator('[data-workstation-status]')).toContainText('Audio unavailable');
  f.output('STILL WORKING\x07');await expect(f.rows.nth(0)).toHaveText('STILL WORKING');expect(f.inputs).toEqual([]);
});

test('real browser audio context accepts an explicit gesture and remains optional', async ({page}) => {
  const f = await fixture(page);
  await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await page.locator('.terminal-workstation > summary').click();
  await page.locator('[data-enable-sound]').click();
  await expect(page.locator('[data-workstation-status]')).toContainText('Bell enabled');
  f.output('\x07AUDIO PATH');await expect(f.rows.nth(0)).toHaveText('AUDIO PATH');
  await expect(page.locator('[data-bell-count]')).toHaveText('1 BEL events');
  await page.locator('[data-terminal-mute]').check();
  expect(f.inputs).toEqual([]);
});
