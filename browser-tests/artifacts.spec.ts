import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// A dedicated loopback test port avoids interfering with an existing local service.
const embeddedURL = process.env.PIDP11_TEST_BACKEND ?? "http://127.0.0.1:8080/";
for (const [label, url] of [
  ["embedded Go", embeddedURL],
  ["self-contained file", pathToFileURL(resolve("dist/prototype.html")).href],
]) {
  test(`${label}: terminal renders under strict CSP and panel remains interactive`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.goto(url);
    await expect(page.locator(".xterm-rows")).toContainText(
      "LOCAL TERMINAL FIXTURE",
    );
    await page
      .getByRole("button", { name: "Open Front panel", exact: true })
      .click();
    await page.locator("#switch-0").focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#switch-0")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page
      .getByRole("button", { name: "Restore DZ0 · DEC terminal", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Acquire keyboard", exact: true })
      .click();
    await page.locator("textarea.xterm-helper-textarea").focus();
    await page.keyboard.type("ANSI");
    await page.keyboard.press("Enter");
    await expect(page.locator(".xterm-rows")).toContainText("ANSI");
    await page.getByRole("button", { name: "Open Line printer", exact: true }).click();
    const printer = page.locator('[data-window="printer"]');
    await printer.locator('[data-sample]').click();
    await printer.locator('[data-print]').click();
    await expect(printer.locator('.printer-paper')).toContainText("HELLO, WORLD");
    await expect(printer.locator('.paper-position')).toContainText("Page 1");
    expect(errors).toEqual([]);
  });
}

test('fullscreen API enters and exits the selected window',async({page})=>{
 await page.goto(embeddedURL);
 await page.getByRole('button',{name:'Open Front panel',exact:true}).click();
 await page.getByRole('button',{name:'Fullscreen PDP-11/70 · front panel',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.getAttribute('data-window'))).toBe('panel');
 await page.evaluate(()=>document.exitFullscreen());
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
});
