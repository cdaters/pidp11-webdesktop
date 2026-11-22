// Actual browser UI in simulation: no guest, model or terminal connection.
import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1100 },
  });
  await page.goto("http://127.0.0.1:5173/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  const win = page.locator('[data-window="companion"]');
  const title = win.locator(".window-title");
  const point = await title.boundingBox();
  await page.mouse.move(point.x + 60, point.y + 10);
  await page.mouse.down();
  await page.mouse.move(1030, 100, { steps: 12 });
  await page.mouse.up();
  await win
    .getByText("Source facts · no model required", { exact: true })
    .click();
  await win.getByLabel("Verified fact topic").selectOption("movb-register");
  await win.getByRole("button", { name: "Prepare fact question" }).click();
  await win.locator('form button[type="submit"]').click();
  await expect(win.getByRole("log")).toContainText("MOVB sign-extends");
  await win
    .getByText("Search historical references · offline", { exact: true })
    .click();
  await win.getByLabel("Reference search").fill("RSTS/E V9.0 login logout");
  await win
    .getByRole("button", { name: "Search references", exact: true })
    .click();
  await expect(win.locator("[data-search-results]")).toContainText(
    "RSTS/E V9.0",
  );
  await win
    .locator("[data-search-results] summary")
    .filter({ hasText: "rsts90-session" })
    .click();
  await win
    .getByRole("button", {
      name: "Resize AI Companion · optional",
      exact: true,
    })
    .focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowDown");
  const terminal = page.locator('[data-window="terminal0"]');
  if (await terminal.count()) {
    const title = await terminal.locator(".window-title").boundingBox();
    await page.mouse.move(title.x + 60, title.y + 10);
    await page.mouse.down();
    await page.mouse.move(210, 730, { steps: 12 });
    await page.mouse.up();
  }
  await page.screenshot({ path: "docs/screenshots/m593d-offline-desktop.png" });
} finally {
  await browser.close();
}
