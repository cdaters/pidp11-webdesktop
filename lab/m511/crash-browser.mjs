// Kill only the owned companion in the network-none V7 laboratory. Verify that
// both conventional guest paths survive and recovery needs fresh approval.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = process.env.PIDP551_WORK;
if (!root || !root.endsWith("/v7-crash"))
  throw Error("Explicit fresh crash-lab directory required");
async function call(op, data = "") {
  const id = randomUUID();
  writeFileSync(
    root + "/request.tmp",
    JSON.stringify({ id, op, data, wait: 1 }),
  );
  renameSync(root + "/request.tmp", root + "/request.json");
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (existsSync(root + "/response.json")) {
      const response = JSON.parse(readFileSync(root + "/response.json"));
      if (response.id === id) return response.output;
    }
  }
  throw Error("Owned harness timeout; do not replay");
}
function inside(code) {
  return execFileSync(
    "docker",
    ["exec", "pidp11-m551", "python3", "-c", code],
    { encoding: "utf8" },
  );
}
const base = "https://127.0.0.1:8445",
  browser = await chromium.launch();
const result = {
  genuineGuest: "UNIX V7",
  fault: "SIGKILL of exact owned bridge PID",
};
try {
  await call("attach", "v7-dc0");
  const before = await call("status");
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const token = readFileSync(root + "/writer.token", "utf8").trim();
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token },
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
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  await page.locator("[data-acquire]").click();
  await expect(page.locator("[data-release]")).toBeEnabled();
  const pid = JSON.parse(readFileSync(root + "/ready.json")).bridge_pid;
  expect(Number.isInteger(pid) && pid > 1).toBe(true);
  inside(
    `import os,signal,pathlib\np=${pid}\nassert pathlib.Path('/proc/%d/exe'%p).resolve()==pathlib.Path('/fixtures/webdesktop-service')\nos.kill(p,signal.SIGKILL)`,
  );
  await expect(page.locator(".guest-heading")).toContainText("DISCONNECTED");
  expect(await call("console", "echo CRASH_OPERATOR_SURVIVES\r")).toContain(
    "CRASH_OPERATOR_SURVIVES",
  );
  expect(await call("traditional", "echo CRASH_SERIAL_SURVIVES\r")).toContain(
    "CRASH_SERIAL_SURVIVES",
  );
  result.bothConventionalPathsSurvive = true;
  // Reap the dead child through its owner before considering its stale socket.
  await call("bridge-stop");
  const recovery = inside(
    `import os,pathlib,socket,subprocess\nassert not pathlib.Path('/proc/${pid}').exists()\np=pathlib.Path('/tmp/m551-control/control.sock')\nassert p.is_socket()\ns=socket.socket(socket.AF_UNIX)\ntry:\n s.connect(str(p)); raise AssertionError('socket still live')\nexcept ConnectionRefusedError: pass\nfinally: s.close()\nr=subprocess.run(['/fixtures/webdesktop-service','serve','-config','/tmp/m551-config/config.json'],capture_output=True,timeout=4)\nassert r.returncode!=0, 'unexpected restart success'\nassert b'address already in use' in r.stderr, r.stderr\np.unlink()\nprint('Dead process and refused socket verified; ordinary restart refused; exact companion socket removed')`,
  );
  result.staleSocketRecovery = recovery.trim();
  const after = await call("bridge-start");
  expect(after.instance).not.toBe(before.instance);
  expect(after.lines.every((line) => line.state === "detached")).toBe(true);
  expect([401, 403]).toContain(
    (await context.request.get(base + "/api/v1/terminals")).status(),
  );
  await expect(page.locator(".guest-heading")).toContainText("DISCONNECTED");
  result.oldSessionRejected = true;
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token },
      })
    ).status(),
  ).toBe(200);
  await call("attach", "v7-dc0");
  await page.reload();
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
  await page.locator("[data-connect]").click();
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  await expect(page.locator("[data-release]")).toBeDisabled();
  result.explicitRecoveryReadOnly = true;
  expect(await call("shutdown")).toContain("Goodbye");
  result.guestSyncedAndExited = true;
  result.pass = true;
} finally {
  writeFileSync(
    root + "/crash-results.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  await browser.close();
}
