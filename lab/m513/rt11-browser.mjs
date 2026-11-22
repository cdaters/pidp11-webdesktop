// Original RT-11FB multiterminal application, not a login shell or KMON route.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = process.env.PIDP_RT_WORK ?? ".research/m513/rt11",
  base = "https://127.0.0.1:8448";
const browser = await chromium.launch();
const frames = [];
let page;
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: readFileSync(root + "/writer.token", "utf8").trim() },
      })
    ).status(),
  ).toBe(200);
  page = await context.newPage();
  page.on("websocket", (socket) =>
    socket.on("framereceived", (frame) => {
      if (frames.length < 1000) frames.push(String(frame.payload));
    }),
  );
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.locator("[data-connect]").click();
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  await page.locator("[data-acquire]").click();
  await expect(page.locator("[data-release]")).toBeEnabled();
  // MTTEST is already waiting for its console line; advance only that known
  // prompt once, through private lab IPC. There is no browser monitor route.
  const consoleOutput = execFileSync(
    "python3",
    ["lab/m513/ipc.py", root, "console", "M513 CONSOLE LINE\r", "1"],
    { encoding: "utf8" },
  );
  writeFileSync(root + "/mttest-console-step.txt", consoleOutput);
  const screen = page.locator(".guest-xterm .xterm-rows");
  await expect
    .poll(() => screen.innerText(), { timeout: 15000 })
    .toContain("PLEASE TYPE A LINE");
  await page.locator(".guest-xterm textarea").focus();
  await page.keyboard.type("M513 BROWSER LINE");
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        ((await screen.innerText()).match(/M513 BROWSER LINE/g) || []).length,
      { timeout: 15000 },
    )
    .toBe(2);
  const text = await screen.innerText();
  writeFileSync(root + "/browser-transcript-private.txt", text);
  await page.screenshot({ path: process.env.PIDP_RT_SCREENSHOT ?? ".research/m513/rt11-mtty.png" });
  await page.locator("[data-release]").click();
  await page.locator("[data-disconnect]").click();
  await page.locator("[data-connect]").click();
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  writeFileSync(
    root + "/browser-result.json",
    JSON.stringify(
      {
        guest: "RT-11FB (S) V05.03",
        monitor: "locally generated M513FB",
        application: "original MTTEST",
        independentLoginShell: false,
        echoAndApplicationRetype: true,
        reconnectReadOnly: true,
        fullDiagnosticPass: false,
        pass: true,
      },
      null,
      2,
    ),
  );
} finally {
  if (page)
    writeFileSync(
      root + "/browser-last-screen.txt",
      await page
        .locator(".guest-xterm .xterm-rows")
        .innerText()
        .catch(() => "unavailable"),
    );
  writeFileSync(root + "/browser-frames-private.json", JSON.stringify(frames));
  await browser.close();
}
