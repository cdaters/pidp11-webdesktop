// Replace the owned disposable simulator at the same endpoint while retaining an
// old browser. Actual bridge shutdown precedes the guest-safe sync/quit sequence.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
const oldRoot = process.env.PIDP551_WORK,
  newRoot = process.env.M511_REPLACEMENT,
  packageRoot = process.env.PIDP551_PACKAGE;
if (!oldRoot || !newRoot || !packageRoot)
  throw Error("Explicit disposable directories required");
async function call(root, op, data = "") {
  const id = randomUUID();
  writeFileSync(
    root + "/request.tmp",
    JSON.stringify({ id, op, data, wait: 1 }),
  );
  renameSync(root + "/request.tmp", root + "/request.json");
  for (let i = 0; i < 400; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (existsSync(root + "/response.json")) {
      const v = JSON.parse(readFileSync(root + "/response.json"));
      if (v.id === id) return v.output;
    }
  }
  throw Error("Private harness timeout; do not replay");
}
const base = "https://127.0.0.1:8445",
  browser = await chromium.launch(),
  result = { sameEndpoint: true, genuineSimulators: true };
let replacement;
try {
  await call(oldRoot, "detach", "v7-dc0");
  await call(oldRoot, "attach", "v7-dc0");
  const before = await call(oldRoot, "status");
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const oldToken = readFileSync(oldRoot + "/writer.token", "utf8").trim();
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: oldToken },
      })
    ).status(),
  ).toBe(200);
  const page = await context.newPage();
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
  await page.locator("[data-connect]").click();
  await page.locator("[data-acquire]").click();
  await expect(page.locator("[data-release]")).toBeEnabled();
  const screen = page.locator(".guest-xterm .xterm-rows");
  async function type(text) {
    await page.locator(".guest-xterm textarea").focus();
    await page.keyboard.type(text);
    await page.keyboard.press("Enter");
  }
  await type("");
  await expect.poll(() => screen.innerText()).toMatch(/login:|\$\s*$/);
  if ((await screen.innerText()).includes("login:")) await type("dmr");
  await type("stty -echo");
  await type("echo DRIVER_ECHO_DISABLED");
  await expect
    .poll(
      async () =>
        ((await screen.innerText()).match(/DRIVER_ECHO_DISABLED/g) || [])
          .length,
    )
    .toBe(1);
  await type("stty echo");
  await type("echo DRIVER_ECHO_RESTORED");
  await expect
    .poll(
      async () =>
        ((await screen.innerText()).match(/DRIVER_ECHO_RESTORED/g) || [])
          .length,
    )
    .toBe(2);
  result.guestLineEchoChanges = true;
  await call(oldRoot, "bridge-stop");
  await expect(page.locator(".guest-heading")).toContainText("DISCONNECTED");
  expect(
    await call(oldRoot, "traditional", "echo GUEST_SURVIVES_BRIDGE_STOP\r"),
  ).toContain("GUEST_SURVIVES_BRIDGE_STOP");
  const shutdown = await call(oldRoot, "shutdown");
  expect(shutdown).toContain("Goodbye");
  result.guestSafeExit = true;
  for (let i = 0; i < 50; i++) {
    try {
      execFileSync("docker", ["inspect", "pidp11-m551"], { stdio: "ignore" });
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
    if (i === 49) throw Error("Old container still exists");
  }
  writeFileSync(newRoot + "/service-options.json", "{}");
  const output = await import("node:fs");
  const log = output.openSync(newRoot + "/launch.log", "a");
  replacement = spawn("sh", ["lab/m591/run.sh"], {
    env: {
      ...process.env,
      PIDP551_WORK: newRoot,
      PIDP551_PACKAGE: packageRoot,
    },
    stdio: ["ignore", log, log],
  });
  for (let i = 0; i < 300 && !existsSync(newRoot + "/ready.json"); i++) {
    if (replacement.exitCode !== null) throw Error("Replacement failed");
    await new Promise((r) => setTimeout(r, 100));
  }
  expect(existsSync(newRoot + "/ready.json")).toBe(true);
  const after = await call(newRoot, "status");
  expect(after.instance).not.toBe(before.instance);
  expect(after.lines.every((l) => l.state === "detached")).toBe(true);
  await expect(page.locator(".guest-heading")).toContainText("DISCONNECTED");
  await expect(page.locator("[data-release]")).toBeDisabled();
  expect([401, 403]).toContain(
    (await context.request.get(base + "/api/v1/terminals")).status(),
  );
  result.oldSessionRejected = true;
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: oldToken },
      })
    ).status(),
  ).toBe(401);
  result.oldTokenRejected = true;
  const token = readFileSync(newRoot + "/writer.token", "utf8").trim();
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token },
      })
    ).status(),
  ).toBe(200);
  await call(newRoot, "attach", "v7-dc0");
  await page.reload();
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
  await page.locator("[data-connect]").click();
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  await expect(page.locator("[data-release]")).toBeDisabled();
  result.freshAttachmentStartsReadOnly = true;
  expect(await call(newRoot, "console", "echo NEW_GUEST_CONSOLE\r")).toContain(
    "NEW_GUEST_CONSOLE",
  );
  result.newGuestIndependent = true;
  expect(await call(newRoot, "shutdown")).toContain("Goodbye");
  result.pass = true;
} finally {
  writeFileSync(
    ".research/m511/restart-results.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  await browser.close();
}
