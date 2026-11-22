// Genuine V7 text + graph, live CPU-device streams; no model provider.
// Browser traffic is real. No route interception or fabricated guest screen.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { harness, root } from "../m59/harness.mjs";
let phase = 0;
const completed = process.env.M592_COMPLETED === "1";
async function devices(op) {
  const id = String(Date.now());
  writeFileSync(root + "/devices-request.tmp", JSON.stringify({ id, op }));
  renameSync(root + "/devices-request.tmp", root + "/devices-request.json");
  for (let i = 0; i < 1200; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (existsSync(root + "/devices-response.json")) {
      const result = JSON.parse(
        readFileSync(root + "/devices-response.json", "utf8"),
      );
      if (result.id === id) return result;
    }
  }
  throw Error("Owned device producer timed out; inspect without replaying");
}
const base = "https://127.0.0.1:8445",
  results = [];
for (const [name, engine] of Object.entries({
  chromium,
  firefox,
  webkit,
}).filter(
  ([name]) =>
    !process.env.M592_DEMO_ENGINE || name === process.env.M592_DEMO_ENGINE,
)) {
  const browser = await engine.launch();
  try {
    for (const id of ["v7-dc0", "v7-dc2"]) {
      await harness("detach", id);
      await harness("attach", id);
    }
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1280 },
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
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    // Close the initial simulated windows so the evidence shows only named sources.
    for (const id of ["panel", "terminal-1"]) {
      const w = page.locator(`[data-window="${id}"]`);
      if (await w.count())
        await w.getByRole("button", { name: /^Close / }).click();
    }
    async function guest(id, line) {
      await page
        .getByRole("button", { name: "Open Guest terminal", exact: true })
        .click();
      const win = page.locator(`[data-window="${id}"]`);
      await win.getByLabel("Guest endpoint").selectOption(line);
      await win.locator("[data-connect]").click();
      await win.locator("[data-acquire]").click();
      await expect(win.locator("[data-release]")).toBeEnabled();
      await win.locator(".guest-xterm textarea").focus();
      await page.keyboard.press("Enter");
      const screen = win.locator(".guest-xterm .xterm-rows");
      await expect
        .poll(() => screen.innerText(), { timeout: 15000 })
        .toMatch(/login:|\$\s*$/);
      if ((await screen.innerText()).includes("login:")) {
        await page.keyboard.type("dmr");
        await page.keyboard.press("Enter");
        await expect.poll(() => screen.innerText()).toMatch(/\$\s*$/);
      }
      return win;
    }
    const text = await guest("guest", "v7-dc2");
    await text.locator(".guest-xterm textarea").focus();
    await page.keyboard.type("echo GENUINE UNIX V7; pwd; ls /");
    await page.keyboard.press("Enter");
    await expect(text.locator(".xterm-rows")).toContainText("GENUINE UNIX V7");
    await text.locator("[data-release]").click();
    const tek = await guest("guest-2", "v7-dc0");
    await tek.locator("[data-disconnect]").click();
    await tek.getByLabel("Guest terminal personality").selectOption("tek4010");
    await tek.locator("[data-connect]").click();
    await harness(
      "console",
      "echo '0 0' > /tmp/m592.points; echo '1 1' >> /tmp/m592.points; echo '2 4' >> /tmp/m592.points; echo '3 2' >> /tmp/m592.points; echo '4 5' >> /tmp/m592.points\r",
    );
    const output = await harness(
      "console",
      "graph -g 1 -l 'V7 GRAPH' < /tmp/m592.points | plot -Ttek > /dev/tty00\r",
      3,
    );
    writeFileSync(root + "/demo-" + name + "-console.txt", output);
    await expect
      .poll(() => tek.locator(".guest-tek line").count(), { timeout: 15000 })
      .toBeGreaterThan(10);
    await expect(tek.locator(".guest-tek")).toContainText("V7 GRAPH");
    await expect(tek.locator(".guest-heading")).toContainText("READ-ONLY");
    await page
      .getByRole("button", { name: "Open Guest devices", exact: true })
      .click();
    const printer = page.locator('[data-window="device-observer"]');
    async function observe(win, id) {
      await win
        .getByRole("button", { name: "Live activity", exact: true })
        .click();
      await win
        .getByRole("button", { name: "Refresh devices", exact: true })
        .click();
      await win.getByLabel("Live peripheral", { exact: true }).selectOption(id);
      await win
        .getByRole("button", {
          name: "Observe selected generation",
          exact: true,
        })
        .click();
      await expect(win.locator("[data-activity-status]")).toContainText(
        completed ? "COMPLETED" : "OBSERVING",
      );
    }
    await observe(printer, "live-lp11");
    await printer
      .getByRole("button", { name: "Open another observer" })
      .click();
    const punch = page.locator('[data-window="device-observer-2"]');
    await observe(punch, "live-punch");
    const phaseResult = completed
      ? {
          result: JSON.parse(
            readFileSync(root + "/devices-results.json", "utf8"),
          )[2],
        }
      : process.env.M592_REUSE_FIRST === "1" && phase === 0
        ? {
            result: JSON.parse(
              readFileSync(root + "/devices-results.json", "utf8"),
            )[0],
          }
        : await devices("phase");
    phase = completed ? 3 : phase + 1;
    await expect
      .poll(() => printer.locator("[data-activity-count]").innerText(), {
        timeout: 10000,
      })
      .not.toMatch(/^0 \/ 0/);
    await expect
      .poll(() => punch.locator("[data-activity-count]").innerText(), {
        timeout: 10000,
      })
      .toContain(`reported reader ${phase * 4096}/12288`);
    await expect(printer.locator(".paper-rows")).toContainText(
      "ORIGINAL PDP-11 CPU OUTPUT",
    );
    if (phase < 3) {
      await expect(printer.locator("[data-activity-status]")).toContainText(
        "OBSERVING",
      );
      await expect(printer.locator("[data-save]")).toBeDisabled();
    } else {
      async function verifyDownload(win, button, filename) {
        await page
          .getByRole("button", {
            name: "Restore " + (await win.getAttribute("aria-label")),
            exact: true,
          })
          .click();
        console.log(name + ": downloading " + filename);
        const pending = page.waitForEvent("download");
        await win.locator(button).click();
        const file = await pending,
          chunks = [];
        for await (const chunk of await file.createReadStream())
          chunks.push(chunk);
        expect(Buffer.concat(chunks)).toEqual(
          readFileSync(root + "/" + filename),
        );
      }
      await expect(printer.locator("[data-save]")).toBeEnabled();
      await expect(punch.locator("[data-save]")).toBeEnabled();
      await expect(punch.locator("[data-activity-count]")).toContainText(
        "end-of-tape reported",
      );
      await verifyDownload(printer, "[data-save]", "live-lp11.out");
      await verifyDownload(punch, "[data-save]", "live-punch.bin");
      await verifyDownload(punch, "[data-reader]", "live-reader.bin");
    }
    await page
      .getByRole("button", { name: "Arrange equipment", exact: true })
      .click();
    await expect(page.locator(".desktop-window:visible")).toHaveCount(4);
    await expect(page.locator("#toast")).not.toHaveClass(/visible/, {
      timeout: 7000,
    });
    await page.screenshot({ path: "docs/screenshots/m510/desktop.png" });
    if (!completed)
      for (const [window, filename] of [
        [text, "unix-v7"],
        [tek, "v7-tek"],
        [printer, "lp11-live"],
        [punch, "pc11-live"],
      ]) {
        await window
          .getByRole("button", { name: /Maximize \/ restore/ })
          .click();
        await page.screenshot({
          path: `docs/screenshots/m510/${filename}.png`,
        });
        await window
          .getByRole("button", { name: /Maximize \/ restore/ })
          .click();
      }
    // Finish only the already-started producer, checking both remaining phases.
    while (phase < 3) {
      await devices("phase");
      phase++;
    }
    await expect(printer.locator("[data-activity-status]")).toContainText(
      "COMPLETED",
    );
    await expect(punch.locator("[data-activity-count]")).toContainText(
      "end-of-tape reported",
    );
    for (const [window, filename, button] of [
      [printer, "live-lp11.out", "[data-save]"],
      [punch, "live-punch.bin", "[data-save]"],
      [punch, "live-reader.bin", "[data-reader]"],
    ]) {
      await window.getByRole("button", { name: /Maximize \/ restore/ }).click();
      const download = page.waitForEvent("download");
      await window.locator(button).click();
      const file = await download,
        chunks = [];
      for await (const chunk of await file.createReadStream())
        chunks.push(chunk);
      expect(Buffer.concat(chunks)).toEqual(
        readFileSync(root + "/" + filename),
      );
      await window.getByRole("button", { name: /Maximize \/ restore/ }).click();
    }
    if (!completed) {
      const finish = await devices("finish");
      writeFileSync(root + "/device-finish.json", JSON.stringify(finish));
    }
    expect(errors).toEqual([]);
    results.push({
      browser: name,
      genuineV7Text: true,
      genuineV7TekVectors: await tek.locator(".guest-tek line").count(),
      liveDevicePhase: phase,
      deviceResult: phaseResult,
      completedDownloadsVerified: phase === 3,
      providerFixture: false,
      realModel: false,
      windows: 4,
    });
    console.log(name + ": genuine equipment workflow passed");
  } finally {
    await browser.close();
    writeFileSync(
      root +
        `/equipment-results${completed ? "-completed" : ""}${process.env.M592_DEMO_ENGINE ? "-" + process.env.M592_DEMO_ENGINE : ""}.json`,
      JSON.stringify(results, null, 2),
    );
  }
}
