// Original RT-11FB multiterminal application, not a login shell or KMON route.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = ".research/m513/rt11",
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

  const screen = page.locator(".guest-xterm .xterm-rows");
  await page.locator(".guest-xterm textarea").focus();
  await expect
    .poll(
      () => readFileSync(root + "/console-private.txt", "utf8").slice(-600),
      { timeout: 30000 },
    )
    .toContain("CONTROL CHARACTERS WILL NOT BE ECHOED");
  await page.keyboard.type("m513 lower-case AST 0123456789");
  await expect
    .poll(() => screen.innerText(), { timeout: 15000 })
    .toContain("m513 lower-case AST 0123456789");
  const first = execFileSync(
    "python3",
    ["lab/m513/ipc.py", root, "console", "\x03\x03", "1"],
    { encoding: "utf8" },
  );
  expect(first).toContain("AST TEST 2");
  const offset = readFileSync(root + "/console-private.txt", "utf8").length;
  await page.keyboard.type("abc");
  await page.keyboard.press("Enter");
  await expect
    .poll(
      () => readFileSync(root + "/console-private.txt", "utf8").slice(offset),
      { timeout: 15000 },
    )
    .toContain("INPUT AVAILABLE ON");
  await expect
    .poll(
      () => readFileSync(root + "/console-private.txt", "utf8").slice(offset),
      { timeout: 15000 },
    )
    .toContain("INPUT AVAILABLE OFF");
  const done = execFileSync(
    "python3",
    ["lab/m513/ipc.py", root, "console", "\x03\x03", "1"],
    { encoding: "utf8" },
  );
  expect(done).toContain("BYE");
  writeFileSync(
    root + "/ast-result.json",
    JSON.stringify(
      {
        lowercaseEcho: true,
        asynchronousInputFlag: true,
        consoleTermination: true,
        pass: true,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
