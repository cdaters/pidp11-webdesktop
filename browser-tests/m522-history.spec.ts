import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";

const raw = Buffer.from("\fACTUAL RETAINED RECORD\r\n");
const hash = createHash("sha256").update(raw).digest("hex");
const record = (id = "a".repeat(64), job = "print-one") => ({
  id, slot: "lp", kind: "lp11", device: "LP0", label: "Original guest printer",
  job, generation: `session-${job}`, simulator_generation: "sim", guest_generation: "rsx",
  started_at: "2026-11-23T18:00:00Z", ended_at: "2026-11-23T18:01:00Z", completed_at: "2026-11-23T18:01:00Z",
  state: "completed", start_offset: 0, observed_bytes: raw.length, completed_bytes: raw.length,
  sha256: hash, full_sha256: hash, provenance: "Operator-attested closed device", recovered: false,
});
async function open(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Line printer", exact: true }).click();
  const win = page.locator('[data-window="printer"]');
  await win.getByRole("button", { name: "Job history", exact: true }).click();
  return win;
}
test("same device retains distinct jobs with explicit selection and exact bytes", async ({ page }) => {
  const first = record(), second = record("b".repeat(64), "print-two");
  let calls = 0;
  await page.route("**/api/v1/equipment-history", r => { calls++; return r.fulfill({ json: [first, second] }); });
  await page.route(`**/api/v1/equipment-history/${first.id}`, r => r.fulfill({ json: { ...first, data: raw.toString("base64") } }));
  const win = await open(page);
  expect(calls).toBe(0);
  await win.locator("[data-history-refresh]").click();
  await expect(win.getByLabel("Retained equipment job").locator("option")).toHaveCount(3);
  await win.getByLabel("Retained equipment job").selectOption(first.id);
  await win.locator("[data-history-view]").click();
  await expect(win.locator("[data-history-status]")).toContainText("no live observation");
  const pending = page.waitForEvent("download");
  await win.locator("[data-history-save]").click();
  const download = await pending;
  const chunks = [];
  for await (const chunk of (await download.createReadStream())) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(raw);
  expect(download.suggestedFilename()).toContain("print-one");
  await win.getByRole("button", { name: "Latest output", exact: true }).click();
  await expect.poll(() => win.locator(".paper-viewport").evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});
test("expired recovered output remains incomplete and cannot reconnect", async ({ page }) => {
  const item = { ...record(), state: "expired", completed_at: undefined, full_sha256: undefined, completed_bytes: 0, recovered: true };
  await page.route("**/api/v1/equipment-history", r => r.fulfill({ json: [item] }));
  await page.route(`**/api/v1/equipment-history/${item.id}`, r => r.fulfill({ json: { ...item, data: raw.toString("base64") } }));
  const win = await open(page);
  await win.locator("[data-history-refresh]").click();
  await win.getByLabel("Retained equipment job").selectOption(item.id);
  await win.locator("[data-history-view]").click();
  await expect(win.locator("[data-history-summary]")).toContainText("no completion established");
  await expect(win.locator("[data-history-save]")).toHaveText("Save retained incomplete bytes");
  await expect(win.locator("[data-history-details]")).toContainText("no authority restored");
  await expect(win.getByRole("button", { name: /Reconnect|Mount|Acquire/ })).toHaveCount(0);
});
for (const fault of ["identity", "checksum"] as const) {
  test(`retained ${fault} corruption disables downloads`, async ({ page }) => {
    const item = record();
    await page.route("**/api/v1/equipment-history", r => r.fulfill({ json: [item] }));
    await page.route(`**/api/v1/equipment-history/${item.id}`, r => r.fulfill({ json: { ...item, job: fault === "identity" ? "replacement" : item.job, data: (fault === "checksum" ? Buffer.alloc(raw.length) : raw).toString("base64") } }));
    const win = await open(page);
    await win.locator("[data-history-refresh]").click();
    await win.getByLabel("Retained equipment job").selectOption(item.id);
    await win.locator("[data-history-view]").click();
    await expect(win.locator("[data-history-status]")).toContainText(fault === "identity" ? "identity changed" : "checksum mismatch");
    await expect(win.locator("[data-history-save]")).toBeDisabled();
  });
}
test("delayed history reply cannot repaint another mode", async ({ page }) => {
  let requested = false;
  await page.route("**/api/v1/equipment-history", async r => {
    requested = true;
    await new Promise(resolve => setTimeout(resolve, 300));
    await r.fulfill({ json: [record()] }).catch(() => {});
  });
  const win = await open(page);
  await win.locator("[data-history-refresh]").click();
  await expect.poll(() => requested).toBe(true);
  await win.getByRole("button", { name: "Local simulation", exact: true }).click();
  await page.waitForTimeout(400);
  await expect(win.locator("[data-history-status]")).toHaveCount(0);
});
test("history rejects an oversized inventory", async ({ page }) => {
  await page.route("**/api/v1/equipment-history", r => r.fulfill({ json: Array.from({ length: 9 }, () => record()) }));
  const win = await open(page);
  await win.locator("[data-history-refresh]").click();
  await expect(win.locator("[data-history-status]")).toContainText("eight-job bound");
  await expect(win.locator("[data-history-view]")).toBeDisabled();
});

test("history selector and details fit a narrow window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/equipment-history", r => r.fulfill({ json: [record()] }));
  const win = await open(page);
  await win.locator("[data-history-refresh]").click();
  const selection = await win.getByLabel("Retained equipment job").boundingBox();
  const bounds = await win.boundingBox();
  expect(selection).not.toBeNull();
  expect(bounds).not.toBeNull();
  expect(selection!.width).toBeLessThan(bounds!.width);
});

test("changing jobs while checksum verification waits cannot revive the old selection", async ({ page }) => {
  const first = record(), second = record("b".repeat(64), "print-two");
  await page.addInitScript(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    const state = window as unknown as { digestWaiting?: boolean; releaseDigest?: () => void };
    crypto.subtle.digest = async (...args: Parameters<SubtleCrypto["digest"]>) => {
      const result = await original(...args);
      state.digestWaiting = true;
      await new Promise<void>(resolve => { state.releaseDigest = resolve; });
      return result;
    };
  });
  await page.route("**/api/v1/equipment-history", r => r.fulfill({ json: [first, second] }));
  await page.route(`**/api/v1/equipment-history/${first.id}`, r => r.fulfill({ json: { ...first, data: raw.toString("base64") } }));
  const win = await open(page);
  await win.locator("[data-history-refresh]").click();
  await win.getByLabel("Retained equipment job").selectOption(first.id);
  await win.locator("[data-history-view]").click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { digestWaiting?: boolean }).digestWaiting)).toBe(true);
  await win.getByLabel("Retained equipment job").selectOption(second.id);
  await page.evaluate(async () => {
    (window as unknown as { releaseDigest: () => void }).releaseDigest();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  await expect(win.locator("[data-history-save]")).toBeDisabled();
  await expect(win.locator("[data-history-summary]")).toBeEmpty();
});
