// Genuine V7 text + graph, completed CPU-device spool, labeled provider fixture.
// Browser traffic is real. No route interception or fabricated guest screen.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { harness, root } from "../m59/harness.mjs";
const base = "https://127.0.0.1:8445",
  results = [];
for (const [name, engine] of Object.entries({
  chromium,
  firefox,
  webkit,
}).filter(
  ([name]) =>
    !process.env.M591_DEMO_ENGINE || name === process.env.M591_DEMO_ENGINE,
)) {
  const browser = await engine.launch();
  try {
    for (const id of ["v7-dc0", "v7-dc2"]) {
      await harness("detach", id);
      await harness("attach", id);
    }
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1400 },
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
      "echo '0 0' > /tmp/m591.points; echo '1 1' >> /tmp/m591.points; echo '2 4' >> /tmp/m591.points; echo '3 2' >> /tmp/m591.points; echo '4 5' >> /tmp/m591.points\r",
    );
    const output = await harness(
      "console",
      "graph -g 1 -l 'V7 GRAPH' < /tmp/m591.points | plot -Ttek > /dev/tty00\r",
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
    const devices = page.locator('[data-window="device-observer"]');
    await devices.getByRole("button", { name: "Refresh observations" }).click();
    await devices
      .getByLabel("Observed device", { exact: true })
      .selectOption("lp11");
    await devices
      .getByRole("button", { name: "View selected generation" })
      .click();
    await expect(devices.locator("[data-device-status]")).toContainText(
      "checksum verified",
    );
    await expect(devices.locator(".paper-rows")).toContainText(
      "PDP-11 LP11 CPU DEVICE TEST",
    );
    const download = page.waitForEvent("download");
    await devices
      .getByRole("button", { name: "Save exact device bytes" })
      .click();
    const file = await download;
    const chunks = [];
    for await (const chunk of await file.createReadStream()) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toEqual(readFileSync(root + "/lp11.out"));
    await page
      .getByRole("button", { name: "Open AI Companion", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use configured provider", exact: true })
      .click();
    await expect(page.locator("[data-provider]")).toContainText(
      "DETERMINISTIC PROVIDER FIXTURE",
    );
    await page.getByLabel("Companion question").fill("What is octal?");
    await page
      .getByRole("button", { name: "Send text to configured provider" })
      .click();
    await expect(page.getByRole("log")).toContainText(
      "DETERMINISTIC HTTP FIXTURE",
    );
    // Use normal window controls to arrange a reproducible equipment-room view.
    async function place(id, x, y, width, height) {
      const win = page.locator(`[data-window="${id}"]`);
      await win.locator(".window-title").click();
      let box = await win.boundingBox();
      const grip = await win.locator(".resize-grip").boundingBox();
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        grip.x + grip.width / 2 + width - box.width,
        grip.y + grip.height / 2 + height - box.height,
        { steps: 5 },
      );
      await page.mouse.up();
      box = await win.boundingBox();
      const title = await win.locator(".window-title").boundingBox();
      await page.mouse.move(title.x + 20, title.y + 10);
      await page.mouse.down();
      await page.mouse.move(
        title.x + 20 + x - box.x,
        title.y + 10 + y - box.y,
        { steps: 5 },
      );
      await page.mouse.up();
    }
    await place("companion", 980, 720, 850, 610);
    await place("device-observer", 110, 720, 850, 610);
    await place("guest-2", 980, 80, 850, 620);
    await place("guest", 110, 80, 850, 620);
    if (name === "chromium")
      await page.screenshot({
        path: "docs/screenshots/m591-equipment-room.png",
      });
    expect(errors).toEqual([]);
    results.push({
      browser: name,
      genuineV7Text: true,
      genuineV7TekVectors: await tek.locator(".guest-tek line").count(),
      completedLP11BytesVerified: true,
      providerFixture: true,
      realModel: false,
      windows: 4,
    });
    console.log(name + ": genuine equipment workflow passed");
  } finally {
    await browser.close();
    writeFileSync(
      root +
        `/demo-results${process.env.M591_DEMO_ENGINE ? "-" + process.env.M591_DEMO_ENGINE : ""}.json`,
      JSON.stringify(results, null, 2),
    );
  }
}
