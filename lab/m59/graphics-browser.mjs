// Genuine V7 graph -> plot -Ttek -> dedicated guest tty. No intercepted transport.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { harness, root } from "./harness.mjs";
const base = "https://127.0.0.1:8445";
const results = [];
for (const [name, engine] of Object.entries({
  chromium,
  firefox,
  webkit,
}).filter(
  ([name]) =>
    !process.env.M59_GRAPHICS_ENGINE ||
    name === process.env.M59_GRAPHICS_ENGINE,
)) {
  const browser = await engine.launch();
  const frames = [];
  try {
    await harness("detach", "v7-dc0");
    await harness("attach", "v7-dc0");
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1000 },
    });
    expect(
      (
        await context.request.post(base + "/api/v1/login", {
          headers: { Origin: base },
          data: { token: readFileSync(`${root}/writer.token`, "utf8").trim() },
        })
      ).status(),
    ).toBe(200);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("websocket", (ws) =>
      ws.on("framereceived", (frame) => {
        if (frames.length < 2000) frames.push(frame.payload.toString());
      }),
    );
    await page.goto(base);
    await page
      .getByRole("button", { name: "Open Guest terminal", exact: true })
      .click();
    await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
    await page.locator("[data-connect]").click();
    await page.locator("[data-acquire]").click();
    await expect(page.locator("[data-release]")).toBeEnabled();
    await page.locator(".guest-xterm textarea").focus();
    await page.keyboard.press("Enter");
    const screen = page.locator(".guest-xterm .xterm-rows");
    await expect
      .poll(() => screen.innerText(), { timeout: 15000 })
      .toMatch(/login:|\$\s*$/);
    if ((await screen.innerText()).includes("login:")) {
      await page.keyboard.type("dmr");
      await page.keyboard.press("Enter");
      await expect.poll(() => screen.innerText()).toMatch(/\$\s*$/);
    }
    await page.locator("[data-disconnect]").click();
    await page.getByLabel("Guest terminal personality").selectOption("tek4010");
    await page.locator("[data-connect]").click();
    await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
    await harness(
      "console",
      "echo '0 0' > /tmp/m59.points; echo '1 1' >> /tmp/m59.points; echo '2 4' >> /tmp/m59.points; echo '3 2' >> /tmp/m59.points; echo '4 5' >> /tmp/m59.points\r",
    );
    const output = await harness(
      "console",
      "graph -g 1 -l 'V7 GRAPH' < /tmp/m59.points | plot -Ttek > /dev/tty00\r",
      3,
    );
    writeFileSync(`${root}/graphics-${name}-console.txt`, output);
    await expect
      .poll(() => page.locator(".guest-tek line").count(), { timeout: 15000 })
      .toBeGreaterThan(10);
    await expect(page.locator(".guest-tek")).toContainText("V7 GRAPH");
    await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
    expect(errors).toEqual([]);
    const lines = await page.locator(".guest-tek line").count();
    if (name === "chromium") {
      mkdirSync("docs/screenshots", { recursive: true });
      await page
        .locator('[data-window="guest"]')
        .getByRole("button", {
          name: "Maximize / restore Real guest terminal",
          exact: true,
        })
        .click();
      await page
        .locator('[data-window="guest"] .window-body')
        .evaluate((el) => {
          el.scrollTop = 0;
        });
      await page.screenshot({
        path:
          process.env.M59_GRAPHICS_SCREENSHOT ??
          "docs/screenshots/m59-v7-tek.png",
      });
    }
    results.push({
      browser: name,
      source:
        "Original UNIX V7 graph and tek programs on disposable PDP-11 media",
      lines,
      readOnlyBrowser: true,
      transportIntercepted: false,
      passed: true,
    });
    console.log(
      `${name}: genuine V7 graph/tek display passed (${lines} vectors)`,
    );
  } finally {
    writeFileSync(
      `${root}/graphics-${name}-frames.json`,
      JSON.stringify(frames),
    );
    await browser.close();
  }
}
writeFileSync(
  `${root}/graphics-results${process.env.M59_GRAPHICS_ENGINE ? "-" + process.env.M59_GRAPHICS_ENGINE : ""}.json`,
  JSON.stringify(results, null, 2) + "\n",
);
