import { chromium, expect } from '@playwright/test';
import { APP_MILESTONE } from '../src/version.ts';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1500,height:1000}});
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'Open About',exact:true}).click();
  await expect(page.locator('[data-app-version]')).toHaveText(APP_MILESTONE);
  await expect(page.locator('.local-label')).toContainText(APP_MILESTONE);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images, img => img.decode())); });
  await page.screenshot({path:'docs/screenshots/m431-about.png'});
  console.log(await page.locator('[data-window="about"] .window-body').evaluate(el=>({height:el.clientHeight,contentHeight:el.scrollHeight})));
} finally { await browser.close(); }
