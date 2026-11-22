// Fresh V7 presentation captures; actual guest bytes, no intercepted routes.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { harness, root } from "../m59/harness.mjs";
const base = "https://127.0.0.1:8445";
const results = [];
for (const personality of ["vt52", "asr33"]) {
  await harness("detach", "v7-dc2");
  await harness("attach", "v7-dc2");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1600, height: 1100 },
    });
    const login = await context.request.post(base + "/api/v1/login", {
      headers: { Origin: base },
      data: { token: readFileSync(root + "/writer.token", "utf8").trim() },
    });
    expect(login.status()).toBe(200);
    const page = await context.newPage();
    await page.goto(base);
    await page
      .getByRole("button", { name: "Open Guest terminal", exact: true })
      .click();
    const win = page.locator('[data-window="guest"]');
    await win.getByLabel("Guest endpoint").selectOption("v7-dc2");
    await win
      .getByLabel("Guest terminal personality")
      .selectOption(personality);
    await win.getByLabel("Guest terminal text size").selectOption("16");
    await win.locator("[data-connect]").click();
    await win.locator("[data-acquire]").click();
    await expect(win.locator("[data-release]")).toBeEnabled();
    const screen = win.locator(".xterm-rows");
    async function command(text) {
      await win.locator(".guest-xterm textarea").focus();
      await page.keyboard.type(text);
      await page.keyboard.press("Enter");
    }
    await command("");
    await expect
      .poll(() => screen.innerText(), { timeout: 15000 })
      .toMatch(/LOGIN:|login:|\$\s*$/);
    if (/login:/i.test(await screen.innerText())) {
      await command("dmr");
      await expect.poll(() => screen.innerText()).toMatch(/\$\s*$/);
    }
    await command("echo UNIX VERSION 7; pwd; ls /");
    await expect(screen).toContainText("UNIX VERSION 7");
    await expect(screen).toContainText(personality === "asr33" ? "USR" : "usr");
    await win.locator("[data-release]").click();
    await win.getByRole("button", { name: /Maximize \/ restore/ }).click();
    await page.screenshot({
      path: `docs/screenshots/m510/v7-${personality}.png`,
    });
    await win.locator("[data-disconnect]").click();
    results.push({
      personality,
      guest: "UNIX V7",
      browser: "Chromium",
      genuineGuest: true,
      readOnlyAtCapture: true,
    });
  } finally {
    await browser.close();
    writeFileSync(
      root + "/terminal-captures.json",
      JSON.stringify(results, null, 2),
    );
  }
}
