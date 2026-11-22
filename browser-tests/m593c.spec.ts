import { test, expect } from "@playwright/test";

test("Tutor calculations remain local, bounded and accessible without AI", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/v1/companion/**", route => { requests++; return route.abort(); });
  await page.goto("/");
  await page.getByRole("button", { name: "Open AI Companion", exact: true }).click();
  const win = page.locator('[data-window="companion"]');
  await win.getByRole("button", { name: "Maximize / restore AI Companion · optional", exact: true }).click();
  const question = win.getByLabel("Companion question");
  await question.fill("/calc 16 oct 177776");
  await win.locator('form button[type="submit"]').focus();
  await page.keyboard.press("Enter");
  await expect(win.getByRole("log")).toContainText("decimal 65534 = hex FFFE");
  await expect(win.locator("[data-status]")).toContainText("No model request");
  await question.fill("/calc 16 oct 178000");
  await win.locator('form button[type="submit"]').click();
  await expect(win.locator("[data-status]")).toContainText("Invalid digits");
  await question.fill("/calc 16 hex FFFE shr 1");
  await win.locator('form button[type="submit"]').click();
  await expect(win.getByRole("log")).toContainText("hex 7FFF");
  expect(requests).toBe(0);
});

test("Contradiction review and source passages coexist without certifying a reply", async ({ page }) => {
  await page.route("**/api/v1/session", route => route.fulfill({json:{csrf:"fixture"}}));
  await page.route("**/api/v1/companion", route => route.fulfill({json:{configured:true,destination:"http://127.0.0.1:19191",models:["fixture"],fixture:true}}));
  await page.route("**/api/v1/companion/chat", route => route.fulfill({json:{
    answer:"The PDP-11/70 uses 22-bit virtual addresses [ref:1170-addresses].",
    fixture:true,
    retrieval:{status:"selected-note",notes:[{id:"1170-addresses"}]},
    review:[{text:"The PDP-11/70 uses 22-bit virtual addresses",status:"contradicted",reference:"1170-addresses",supported_explanation:"The PDP-11/70 uses 16-bit virtual addresses."}],
  }}));
  await page.goto("/");
  await page.getByRole("button",{name:"Open AI Companion",exact:true}).click();
  await page.getByRole("button",{name:"Use configured provider",exact:true}).click();
  await expect(page.locator("[data-provider]")).toContainText("DETERMINISTIC");
  await page.getByLabel("Companion question").fill("Explain virtual addresses.");
  await page.getByRole("button",{name:"Send text to configured provider"}).click();
  const log=page.getByRole("log");
  await expect(log).toContainText("limited checks, not certification");
  await expect(log.getByText("Contradicts the supplied note:",{exact:true})).toBeVisible();
  await expect(log).toContainText("Narrow supported explanation: The PDP-11/70 uses 16-bit virtual addresses.");
  await log.getByText("[ref:1170-addresses] PDP-11/70 address spaces · pdp11",{exact:true}).click();
  await expect(log).toContainText("64 KiB per address space");
});
