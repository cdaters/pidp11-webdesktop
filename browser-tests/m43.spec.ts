import { test, expect } from "@playwright/test";
test("mechanical geometry, fixed colors and labels, zoom and common panel state", async ({page}) => {
 await page.goto('/');await page.getByRole('button',{name:'Open Front panel',exact:true}).click();
 const labels=await page.locator('.historic-switch-label').evaluateAll(es=>es.map(e=>({text:e.textContent,x:e.getAttribute('x'),y:e.getAttribute('y')})));
 const colors=await page.locator('.register-switch .mechanical-paddle').evaluateAll(es=>es.map(e=>e.getAttribute('data-color')));
 for(const [value,pose] of [['17777777','up'],['00000000','down']] as const) {
  await page.locator('#register-input').fill(value);await page.locator('#register-form button').click();
  await expect(page.locator(`.register-switch .mechanical-paddle[data-pose="${pose}"]`)).toHaveCount(22);
  expect(await page.locator('.register-switch .mechanical-paddle').evaluateAll(es=>es.map(e=>e.getAttribute('data-color')))).toEqual(colors);
 }
 await page.locator('#switch-21').focus();await page.keyboard.press('Enter');await expect(page.locator('#switch-21')).toHaveAttribute('aria-checked','true');
 await page.locator('#panel-zoom').selectOption('1200');expect(await page.locator('.front-panel').evaluate(e=>e.getBoundingClientRect().width)).toBe(1200);
 await page.locator('#panel-zoom').selectOption('fit');await page.locator('#panel-compact').click();
 await page.locator('#panel-mode').click();await expect(page.locator('#switch-21 .mechanical-paddle')).toHaveAttribute('data-pose','up');
 expect(await page.locator('.historic-switch-label').evaluateAll(es=>es.map(e=>({text:e.textContent,x:e.getAttribute('x'),y:e.getAttribute('y')})))).toEqual(labels);
 await page.locator('#panel-mode').click();
 await page.locator('#action-deposit').click();await expect(page.locator('#action-deposit .mechanical-paddle')).toHaveAttribute('data-pose','up');
 await expect(page.locator('#action-deposit .mechanical-paddle')).toHaveAttribute('data-pose','rest');
 await page.locator('.touch-controls summary').click();
 const touch=page.getByRole('switch',{name:'Touch switch register bit 0',exact:true});await touch.focus();await page.keyboard.press('Space');await expect(touch).toHaveAttribute('aria-checked','true');
 await page.locator('#action-lamp-test').click();await expect(page.locator('#action-lamp-test .mechanical-paddle')).toHaveAttribute('data-pose','up');
});
test("terminal key sequences are intact at encoder and do not contaminate mock commands; handoff discards partial line", async ({page}) => {
 await page.goto('/');const term=page.locator('[data-window="terminal-1"]');await expect(term.locator('.xterm')).toBeVisible();
 await term.locator('[data-keyboard]').click();await term.locator('textarea').focus();
 await page.keyboard.type('HE');await page.keyboard.press('ArrowUp');await page.keyboard.press('F1');await page.keyboard.type('LP');await page.keyboard.press('Enter');
 await expect(term.locator('.xterm-screen')).toContainText('Local terminal fixture');
 await expect(term.locator('.xterm-screen')).not.toContainText('Unknown fixture command');
 await page.keyboard.type('DIRECT');await term.locator('[data-keyboard]').click();await term.locator('[data-keyboard]').click();await term.locator('textarea').focus();await page.keyboard.type('ORY');await page.keyboard.press('Enter');
 await expect(term.locator('.xterm-screen')).toContainText('Unknown fixture command: ORY');
 await page.getByRole('button',{name:'Open Terminal',exact:true}).click();await page.getByRole('button',{name:'Arrange terminals',exact:true}).click();
 await expect(page.locator('[data-window="terminal-2"]')).toBeVisible();
 await expect(page.locator('[data-window="terminal-2"] [data-keyboard]')).toHaveText('Acquire keyboard');
});
