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
      if (frame.type === 'acquire') ws.send(JSON.stringify({type:'state',connected:true,owner:true,epoch:1}));
      if (frame.type === 'input') inputs.push(atob(frame.data));
    });
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
  return { inputs, output: (text: string) => output(text), rows: page.locator('.guest-xterm .xterm-rows > div') };
}

test('VT100 cursor, margins, DEC graphics, reverse video, CR/LF, keypad and fixed geometry', async ({page}) => {
  const f = await fixture(page);
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  f.output('\x1b[2J\x1b[1;1HHEADER\x1b[2;4r\x1b[4;1HOLD\r\nNEW\x1b[r');
  await expect(f.rows.nth(0)).toHaveText('HEADER');
  await expect(f.rows.nth(2)).toHaveText('OLD');
  await expect(f.rows.nth(3)).toHaveText('NEW');
  f.output('\x1b[6;1H\x1b(0lqk\x1b(B\x1b[7mREV\x1b[0m');
  await expect(f.rows.nth(5)).toHaveText('┌─┐REV');
  const inverse = await f.rows.nth(5).locator('span').allTextContents();
  expect(inverse.join('')).toContain('REV');
  const colors = await f.rows.nth(5).locator('span').evaluateAll(nodes => nodes.map(n => ({text:n.textContent, fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor})));
  expect(colors.find(c => c.text?.includes('REV'))?.bg).not.toBe('rgba(0, 0, 0, 0)');
  f.output('\x1b[8;1HABC\rZ\nQ');
  await expect(f.rows.nth(7)).toHaveText('ZBC');
  await expect(f.rows.nth(8)).toHaveText(' Q');
  await page.locator('[data-acquire]').click();
  f.output('\x1b[?1'); f.output('h\x1b=');
  // Wait on a printable marker after the split mode commands, not an arbitrary delay.
  f.output('\x1b[10;1HMODES'); await expect(f.rows.nth(9)).toHaveText('MODES');
  await page.locator('.guest-xterm textarea').focus();
  for (const key of ['ArrowUp','F1','F4','Numpad1','Delete']) await page.keyboard.press(key);
  await expect.poll(()=>f.inputs.join('')).toBe('\x1bOA\x1bOP\x1bOS\x1bOq\x7f');
  await page.getByLabel('Guest terminal text size').selectOption('16');
  await expect(f.rows).toHaveCount(24);
  f.output('\x1b[24;80HX'); await expect(f.rows.nth(23)).toHaveText(' '.repeat(79)+'X');
  await page.locator('[data-disconnect]').click(); await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await expect(page.locator('.guest-xterm .xterm-rows')).not.toContainText('HEADER');
});

test('VT52 text parser, split position, edge behavior, ID ownership and fresh personality', async ({page}) => {
  const f = await fixture(page);
  await page.getByLabel('Guest terminal personality').selectOption('vt52');
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await expect(page.getByLabel('Guest terminal personality')).toBeDisabled();
  f.output('\x1bZ\x1bY'); f.output('%'); f.output('*VT52');
  await expect(f.rows.nth(5)).toHaveText(' '.repeat(10)+'VT52'); expect(f.inputs).toEqual([]);
  f.output('\x1bY oAB'); await expect(f.rows.nth(0)).toHaveText(' '.repeat(79)+'B');
  await page.locator('[data-acquire]').click(); await expect(page.locator('[data-release]')).toBeEnabled();
  f.output('\x1bZ\x1b=\x1bHREADY'); await expect(f.rows.nth(0)).toContainText('READY');
  await page.locator('.guest-xterm textarea').focus();
  for (const key of ['ArrowUp','F3','Numpad0','NumpadEnter','Delete']) await page.keyboard.press(key);
  await expect.poll(()=>f.inputs.join('')).toBe('\x1b/K\x1bA\x1bR\x1b?p\x1b?M\x7f');
  f.output('\x1bY');
  await page.locator('[data-disconnect]').click();
  await page.getByLabel('Guest terminal personality').selectOption('vt100');
  await page.locator('[data-connect]').click(); await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  f.output('\x1b[2J\x1b[HANSI'); await expect(f.rows.nth(0)).toHaveText('ANSI');
});

test('4010 fixture renders whole/split identically and erases without a connection', async ({page}) => {
  await page.goto('/'); await page.getByRole('button',{name:'Open 4010 graphics',exact:true}).click();
  await page.getByRole('button',{name:'Draw fixture',exact:true}).click();
  await expect(page.locator('.tek-display line')).toHaveCount(5);
  const full = await page.locator('.tek-display').innerHTML();
  await page.getByRole('button',{name:'Draw split bytes'}).click();
  expect(await page.locator('.tek-display').innerHTML()).toBe(full);
  await expect(page.locator('[data-tek-status]')).toContainText('fixture only');
  await page.getByRole('button',{name:'Erase display'}).click();
  await expect(page.locator('.tek-display line')).toHaveCount(0);
});
