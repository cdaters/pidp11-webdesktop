// Genuine, disposable RSX-11M-PLUS DZ11. Public distribution guest account;
// service credentials stay in private files. No monitor route or interceptions.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const root = process.env.PIDP_RSX_WORK;
if (!root) throw Error("Fresh private RSX evidence directory required");
const base = "https://127.0.0.1:8449";
const browser = await chromium.launch();
let screen;
try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: readFileSync(root + "/writer.token", "utf8").trim() },
      })
    ).status(),
  ).toBe(200);
  const page = await context.newPage();
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  const win = page.locator('[data-window="guest"]');
  await win.getByLabel("Guest endpoint").selectOption("rsx-dz0");
  await win.getByLabel("Guest terminal personality").selectOption("vt100");
  await win.locator("[data-connect]").click();
  await win.locator("[data-acquire]").click();
  await expect(win.locator("[data-release]")).toBeEnabled();
  screen = win.locator(".xterm-rows");
  async function command(text) {
    await win.locator(".guest-xterm textarea").focus();
    await page.keyboard.type(text);
    await page.keyboard.press("Enter");
  }
  await command("");
  await expect
    .poll(() => screen.innerText(), { timeout: 10000 })
    .toContain(">");
  if (process.env.PIDP_RSX_LOGGED !== "1") {
    await command("HELLO SYSTEM");
    await expect
      .poll(() => screen.innerText(), { timeout: 10000 })
      .toMatch(/Password:|Logged on/i);
    if (/Password:/.test(await screen.innerText())) await command("SYSTEM");
    await expect
      .poll(() => screen.innerText(), { timeout: 10000 })
      .toMatch(/Last batch login/);
  }
  await expect
    .poll(async () => (await screen.innerText()).trim(), { timeout: 10000 })
    .toMatch(/>$/);
  await command("HELP");
  await expect
    .poll(() => screen.innerText(), { timeout: 10000 })
    .toContain("HELP");
  await expect
    .poll(async () => (await screen.innerText()).trim(), { timeout: 10000 })
    .toMatch(/>$/);
  await command("PIP /LI");
  await expect
    .poll(() => screen.innerText(), { timeout: 10000 })
    .toMatch(/Directory|Total of/);
  await win.locator("[data-release]").click();
  await win.getByRole("button", { name: /Maximize \/ restore/ }).click();
  await page.screenshot({ path: ".research/m512/rsx.png" });
  writeFileSync(
    root + "/browser-transcript-private.txt",
    await screen.innerText(),
  );
  await win.locator("[data-disconnect]").click();
  writeFileSync(
    root + "/browser-result.json",
    JSON.stringify(
      {
        guest: "RSX-11M-PLUS V4.6 BL87",
        browser: "Chromium",
        line: "DZ11",
        browserGuestVerified: true,
        fullscreenVerified: false,
        commands: ["HELLO", "HELP", "PIP /LI"],
        readOnlyAtCapture: true,
      },
      null,
      2,
    ),
  );
  console.log("RSX genuine browser terminal passed");
} catch (error) {
  if (screen)
    writeFileSync(
      root + "/browser-failure-private.txt",
      await screen.innerText(),
    );
  throw error;
} finally {
  await browser.close();
}
