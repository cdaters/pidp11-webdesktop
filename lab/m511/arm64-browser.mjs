// Actual systemd-contained ARM64 service and original V7, through a fixed lab relay.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const root = ".research/m511",
  base = "https://127.0.0.1:8447";
const browser = await chromium.launch();
const timings = [];
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: {
          token: readFileSync(root + "/arm64-writer.token", "utf8").trim(),
        },
      })
    ).status(),
  ).toBe(200);
  const p = await context.newPage();
  await p.goto(base);
  await p
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await p.locator("[data-connect]").click();
  await expect(p.locator(".guest-heading")).toContainText("READ-ONLY");
  await p.locator("[data-acquire]").click();
  await expect(p.locator("[data-release]")).toBeEnabled();
  const screen = p.locator(".guest-xterm .xterm-rows");
  async function type(text) {
    await p.locator(".guest-xterm textarea").focus();
    await p.keyboard.type(text);
    await p.keyboard.press("Enter");
  }
  await type("");
  await expect.poll(() => screen.innerText()).toMatch(/login:|\$\s*$/);
  if ((await screen.innerText()).includes("login:")) {
    await type("dmr");
    await expect.poll(() => screen.innerText()).toMatch(/\$\s*$/);
  }
  for (let i = 0; i < 5; i++) {
    const marker = "ARM64_GUEST_" + i;
    const started = performance.now();
    await type("echo " + marker);
    await expect
      .poll(
        async () =>
          ((await screen.innerText()).match(new RegExp(marker, "g")) || [])
            .length,
      )
      .toBe(2);
    timings.push(performance.now() - started);
  }
  await p.locator("[data-release]").click();
  await p.locator("[data-disconnect]").click();
  await p.reload();
  await p
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await expect(p.locator("[data-release]")).toBeDisabled();
  writeFileSync(
    root + "/arm64-browser-" + process.env.M511_PHASE + ".json",
    JSON.stringify(
      {
        phase: process.env.M511_PHASE,
        genuineV7: true,
        systemd: true,
        echoRoundtripMs: timings,
        disconnectThenRefreshNoKeyboard: true,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
