// A third genuine V7 observer measures delivered bytes without guest input.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const root = ".research/m512/v7",
  base = "https://127.0.0.1:8445";
const browser = await chromium.launch();
let bytes = 0,
  frames = 0;
const began = Date.now();
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: readFileSync(root + "/observer.token", "utf8").trim() },
      })
    ).status(),
  ).toBe(200);
  const page = await context.newPage();
  page.on("websocket", (socket) =>
    socket.on("framereceived", (frame) => {
      try {
        const message = JSON.parse(String(frame.payload));
        if (message.type === "output") {
          frames++;
          bytes += Buffer.from(message.data, "base64").length;
        }
      } catch {}
    }),
  );
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
  await page.locator("[data-connect]").click();
  await expect(page.locator("[data-acquire]")).toBeDisabled();
  await page.waitForTimeout(30000);
  await page.evaluate(() => {
    const until = performance.now() + 3000;
    while (performance.now() < until) {
      /* Simulate one stalled renderer, not a stalled guest. */
    }
  });
  await page.waitForTimeout(60000);
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  expect(bytes).toBeGreaterThan(0);
  writeFileSync(
    root + "/passive-throughput.json",
    JSON.stringify(
      {
        genuineGuest: true,
        inputBytes: 0,
        deliveredOutputBytes: bytes,
        outputFrames: frames,
        elapsedSeconds: (Date.now() - began) / 1000,
        rendererStallSeconds: 3,
        recoveredReadOnly: true,
        scope:
          "sampled workload throughput, not link capacity or backpressure saturation",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
