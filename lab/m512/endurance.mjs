// Genuine V7 endurance; the simulator and independent supervisor already run.
// This harness never supplies implicit attachment approval or restarts a guest.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = process.env.PIDP551_WORK;
if (!root || !root.endsWith("/m512/v7"))
  throw Error("Explicit M5.12 V7 lab required");
const duration = Number(process.env.M512_SOAK_SECONDS || 1800);
if (duration < 1800 || duration > 3600)
  throw Error("Bounded 30–60 minute run required");
const browser = await chromium.launch(),
  base = "https://127.0.0.1:8445";
const results = {
  guest: "UNIX V7",
  host: "Mac-hosted ARM64 Linux, network-none Docker",
  containerMemoryMaxBytes: 100663296,
  scope: "whole container includes SIMH, bridge and supervisor",
  samples: [],
  commands: 0,
  handoffs: 0,
  refreshes: 0,
  latencyMs: [],
};
const began = Date.now();
function counters() {
  const code = `import sys,json,pathlib,os\nsys.path.insert(0,'/lab/m512')\nfrom supervisor import control\nr=pathlib.Path('/work');p=json.loads((r/'ready.json').read_text())['bridge_pid'];s=pathlib.Path('/proc')/str(p)\nf=(s/'stat').read_text().rsplit(')',1)[1].split()\nv=control('/tmp/m551-control/control.sock','metrics');v['cpu_seconds']=(int(f[11])+int(f[12]))/os.sysconf('SC_CLK_TCK');v['rss_kib']=int(next(x.split()[1] for x in (s/'status').read_text().splitlines() if x.startswith('VmRSS:')));v['fds']=len(list((s/'fd').iterdir()));v['cgroup_bytes']=int(pathlib.Path('/sys/fs/cgroup/memory.current').read_text());v['cgroup_events']=pathlib.Path('/sys/fs/cgroup/memory.events').read_text();v['status']=control('/tmp/m551-control/control.sock','status');print(json.dumps(v))`;
  return JSON.parse(
    execFileSync("docker", ["exec", "pidp11-m551", "python3", "-c", code], {
      encoding: "utf8",
    }),
  );
}
async function open(context) {
  const page = await context.newPage();
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.getByLabel("Guest endpoint").selectOption("v7-dc0");
  await page.locator("[data-connect]").click();
  await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
  return page;
}
async function type(page, text) {
  await page.locator(".guest-xterm textarea").focus();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}
try {
  let context = await browser.newContext({ ignoreHTTPSErrors: true });
  expect(
    (
      await context.request.post(base + "/api/v1/login", {
        headers: { Origin: base },
        data: { token: readFileSync(root + "/writer.token", "utf8").trim() },
      })
    ).status(),
  ).toBe(200);
  let pages = [await open(context), await open(context)],
    owner = 0;
  await pages[owner].locator("[data-acquire]").click();
  await expect(pages[owner].locator("[data-release]")).toBeEnabled();
  await type(pages[owner], "");
  await expect
    .poll(() => pages[owner].locator(".guest-xterm .xterm-rows").innerText())
    .toMatch(/login:|\$\s*$/);
  if (
    (
      await pages[owner].locator(".guest-xterm .xterm-rows").innerText()
    ).includes("login:")
  ) {
    await type(pages[owner], "dmr");
    await expect
      .poll(() => pages[owner].locator(".guest-xterm .xterm-rows").innerText())
      .toMatch(/\$\s*$/);
  }
  results.start = counters();
  for (let cycle = 0; Date.now() - began < duration * 1000; cycle++) {
    const marker = "SOAK_" + cycle,
      started = performance.now();
    await type(pages[owner], "echo " + marker);
    for (const p of pages)
      await expect
        .poll(
          async () =>
            (await p.locator(".guest-xterm .xterm-rows").innerText())
              .split("\n")
              .some((line) => line.trim() === marker),
          { timeout: 60000 },
        )
        .toBe(true);
    results.latencyMs.push(performance.now() - started);
    results.commands++;
    if (cycle % 6 === 0) {
      const burst = "BURST_DONE_" + cycle;
      await type(pages[owner], "ls -l /bin; echo " + burst);
      await expect
        .poll(
          async () =>
            (await pages[owner].locator(".guest-xterm .xterm-rows").innerText())
              .split("\n")
              .some((line) => line.trim() === burst),
          { timeout: 60000 },
        )
        .toBe(true);
    }

    if (cycle % 5 === 4) {
      await pages[owner].locator("[data-release]").click();
      await expect(pages[1 - owner].locator(".guest-status")).toContainText(
        "acquire keyboard explicitly",
      );
      owner = 1 - owner;
      await pages[owner].locator("[data-acquire]").click();
      await expect(pages[owner].locator("[data-release]")).toBeEnabled();
      results.handoffs++;
    }
    if (cycle % 12 === 11) {
      const observer = 1 - owner;
      await pages[observer].close();
      pages[observer] = await open(context);
      await expect(pages[observer].locator("[data-release]")).toBeDisabled();
      results.refreshes++;
    }
    if (cycle % 3 === 0) {
      const sample = counters();
      sample.elapsedSeconds = (Date.now() - began) / 1000;
      results.samples.push(sample);
      writeFileSync(
        root + "/endurance-progress.json",
        JSON.stringify(results, null, 2),
      );
    }
    // Authentication intentionally expires after 15 minutes. The lab operator
    // explicitly signs in again; never extend the service session automatically.
    if (cycle % 36 === 35) {
      await pages[owner].locator("[data-release]").click();
      await context.close();
      context = await browser.newContext({ ignoreHTTPSErrors: true });
      expect(
        (
          await context.request.post(base + "/api/v1/login", {
            headers: { Origin: base },
            data: {
              token: readFileSync(root + "/writer.token", "utf8").trim(),
            },
          })
        ).status(),
      ).toBe(200);
      pages = [await open(context), await open(context)];
      owner = 0;
      await pages[owner].locator("[data-acquire]").click();
      await expect(pages[owner].locator("[data-release]")).toBeEnabled();
      results.explicitReauthentications =
        (results.explicitReauthentications || 0) + 1;
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  await pages[owner].locator("[data-release]").click();
  results.elapsedSeconds = (Date.now() - began) / 1000;
  results.end = counters();
  results.pass = true;
} catch (error) {
  results.failure = String(error);
  results.elapsedSeconds = (Date.now() - began) / 1000;
  throw error;
} finally {
  await browser.close();
  writeFileSync(
    root + "/endurance-results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
}
