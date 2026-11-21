// Genuine disposable V7 through the detached service. No intercepted API/WS data.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { harness, root } from "./harness.mjs";
const base = "https://127.0.0.1:8445";
const token = readFileSync(`${root}/writer.token`, "utf8").trim();
const observer = readFileSync(`${root}/observer.token`, "utf8").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {
  source:
    "Genuine disposable UNIX V7; network-none original SIMH; Mac browsers through fixed local test forwarding",
  browsers: [],
};
const screen = (p) => p.locator(".guest-xterm .xterm-rows");
async function command(p, text) {
  await p.locator(".guest-xterm textarea").focus();
  await p.keyboard.type(text, { delay: 15 });
  await p.keyboard.press("Enter");
}
for (const personality of (
  process.env.M59_PERSONALITIES ?? "vt100,vt52,vt220,asr33"
).split(","))
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const name = `${personality}_${engineName}`;
    const marker = `M59_${name}`.toUpperCase();
    const browser = await engine.launch();
    try {
      for (const id of ["v7-dc0", "v7-dc2"]) await harness("detach", id);
      const context = await browser.newContext({ ignoreHTTPSErrors: true }); // Lab certificate only; deployment requires explicit trust.
      const login = await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token },
      });
      expect(login.status()).toBe(200);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page
        .getByRole("button", { name: "Open Guest terminal", exact: true })
        .click();
      await expect(page.locator(".guest-heading")).toContainText("DETACHED");
      await expect(page.locator("[data-connect]")).toBeDisabled();
      expect(
        (await harness("status")).lines.every((l) => l.state === "detached"),
      ).toBe(true);
      await harness("attach", "v7-dc0");
      await page.locator("[data-refresh]").click();
      await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
      await page
        .getByLabel("Guest terminal personality")
        .selectOption(personality);
      await page.locator("[data-connect]").click();
      await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
      await page.locator("[data-acquire]").click();
      await expect(page.locator("[data-release]")).toBeEnabled();
      await command(page, "");
      await expect
        .poll(async () => await screen(page).innerText(), { timeout: 15000 })
        .toMatch(/login:|\$\s*$/i);
      if ((await screen(page).innerText()).toLowerCase().includes("login:")) {
        await command(page, "dmr");
        await expect
          .poll(async () => await screen(page).innerText(), { timeout: 15000 })
          .toMatch(/\$\s*$/);
      }
      await command(page, `echo ${marker}`);
      await expect
        .poll(
          async () =>
            (
              (await screen(page).innerText()).match(new RegExp(marker, "g")) ??
              []
            ).length,
          { timeout: 15000 },
        )
        .toBeGreaterThanOrEqual(2);
      await command(page, "ls /");
      await expect(screen(page)).toContainText(
        personality === "asr33" ? "USR" : "usr",
      );
      if (personality !== "asr33") {
        await command(page, "/usr/games/hangman");
        await expect(screen(page)).toContainText("guess:");
        await command(page, "a");
        await expect
          .poll(
            async () =>
              ((await screen(page).innerText()).match(/guess:/g) ?? []).length,
          )
          .toBeGreaterThanOrEqual(2);
        await page.keyboard.press("Control+d");
        await expect
          .poll(async () => await screen(page).innerText())
          .toMatch(/\$\s*$/);
      }
      await page.locator("[data-disconnect]").click();
      await page.locator("[data-connect]").click();
      await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
      await expect(screen(page)).not.toContainText(marker);
      const conventional = await harness(
        "traditional",
        `echo CONVENTIONAL_${name}\r`,
      );
      expect(conventional).toContain(`CONVENTIONAL_${name}`);
      const operator = await harness("console", `echo OPERATOR_${name}\r`);
      expect(operator).toContain(`OPERATOR_${name}`);
      // Old choices cannot follow an operator-approved replacement attachment.
      await harness("detach", "v7-dc0");
      await expect(page.locator(".guest-heading")).toContainText(
        "DISCONNECTED",
      );
      await harness("attach", "v7-dc0");
      await page.locator("[data-connect]").click();
      await expect(page.locator(".guest-status")).toContainText("unavailable");
      await expect(page.locator("[data-acquire]")).toBeDisabled();
      await page.locator("[data-refresh]").click();
      await page.locator("[data-connect]").click();
      await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
      // Stopping the service leaves genuine guest and both conventional paths alive.
      await harness("bridge-stop");
      await expect(page.locator(".guest-heading")).toContainText(
        "DISCONNECTED",
      );
      expect(
        await harness("traditional", `echo WITHOUT_SERVICE_${name}\r`),
      ).toContain(`WITHOUT_SERVICE_${name}`);
      expect(
        await harness("console", `echo CONSOLE_WITHOUT_SERVICE_${name}\r`),
      ).toContain(`CONSOLE_WITHOUT_SERVICE_${name}`);
      const restarted = await harness("bridge-start");
      expect(restarted.lines.every((l) => l.state === "detached")).toBe(true);
      const stale = await context.request.get(base + "/api/v1/terminals");
      expect([401, 403]).toContain(stale.status());
      expect(errors).toEqual([]);
      results.browsers.push({
        name,
        personality,
        passed: true,
        detachedStartup: true,
        explicitAttachment: true,
        genuineCommands: true,
        historicalHangman: personality !== "asr33",
        fullscreenApplication: false,
        staleGenerationRejected: true,
        independentConsoleAndDC11: true,
        restartDetached: true,
        oldCookieRevoked: true,
      });
      writeFileSync(
        `${root}/browser-results-${process.env.M59_PERSONALITIES ?? "all"}.json`,
        JSON.stringify(results, null, 2) + "\n",
      );
      console.log(`${name}: M5.9 terminal and genuine guest passed`);
    } finally {
      await browser.close();
    }
  }
writeFileSync(
  `${root}/browser-results.json`,
  JSON.stringify(results, null, 2) + "\n",
);
