// Local Mac browser workload; only the explicitly supplied loopback mock service.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
try {
  await page.goto("http://127.0.0.1:8080/?backend=mock");
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "Open Terminal", exact: true })
      .click();
  for (let i = 1; i <= 4; i++) {
    await page
      .getByRole("button", {
        name: `Restore DZ${i - 1} · DEC terminal`,
        exact: true,
      })
      .click();
    await page.locator(`[data-window="terminal-${i}"] [data-keyboard]`).click();
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const metrics = async () =>
    Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
  const before = await metrics(),
    samples = [],
    latency = [];
  const start = performance.now();
  for (let i = 0; i < 300; i++) {
    const t = performance.now();
    const n = (i % 4) + 1;
    await page
      .getByRole("button", {
        name: `Restore DZ${n - 1} · DEC terminal`,
        exact: true,
      })
      .click();
    await page
      .locator(`[data-window="terminal-${n}"] textarea.xterm-helper-textarea`)
      .focus();
    await page.keyboard.type("HELP");
    await page.keyboard.press("Enter");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    latency.push(performance.now() - t);
    if (i % 10 === 0) samples.push(await metrics());
    if (i % 30 === 0) console.log("Browser soak", i, "seconds");
    await new Promise((r) =>
      setTimeout(r, Math.max(0, start + (i + 1) * 1000 - performance.now())),
    );
  }
  const after = await metrics();
  await cdp.send("HeapProfiler.collectGarbage");
  const retained = await metrics();
  latency.sort((a, b) => a - b);
  const report = {
    scope:
      "Mac Chromium; four independent mock terminals, 300 HELP commands, mock backend observer; not Pi/browser OS RSS",
    seconds: (performance.now() - start) / 1000,
    terminals: 4,
    commands: 300,
    js_heap_before_gc_bytes: before.JSHeapUsedSize,
    js_heap_after_gc_bytes: retained.JSHeapUsedSize,
    js_heap_peak_sample_bytes: Math.max(
      ...samples.map((s) => s.JSHeapUsedSize),
    ),
    renderer_task_cpu_percent:
      ((after.TaskDuration - before.TaskDuration) / 300) * 100,
    interaction_to_two_animation_frames_p95_ms:
      latency[Math.floor(latency.length * 0.95)],
    dom_nodes_start: before.Nodes,
    dom_nodes_end: retained.Nodes,
    errors,
  };
  if (errors.length) throw Error(JSON.stringify(errors));
  if (retained.JSHeapUsedSize > 64 * 1024 * 1024)
    throw Error("retained heap budget");
  writeFileSync(
    ".research/m42-browser-soak.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(report);
} finally {
  await browser.close();
}
