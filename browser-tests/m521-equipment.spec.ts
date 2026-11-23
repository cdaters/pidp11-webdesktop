import { test, expect, type Page } from "@playwright/test";
const row = () => ({ id: "lp1", kind: "lp11", generation: "generation-one", owner: "owner-one", job: "print-one", phase: "observing", device: "LP0", label: "RSX printer", simulator_generation: "sim", guest_generation: "rsx", state: "observing", message: "Operator-attested session", sequence: 0, start_offset: 0, next_offset: 0, total_bytes: 0, lost: false, data: null, sha256: "", reader_length: 0, reader_bytes: 0, reader_eof: false, reader_sha256: "" });
async function open(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Line printer", exact: true }).click();
  const win = page.locator('[data-window="printer"]');
  await win.getByRole("button", { name: "Observe device", exact: true }).click();
  await win.locator("[data-inventory]").click();
  await win.getByLabel("Live peripheral").selectOption("lp1");
  await win.locator("[data-follow]").click();
  return win;
}
test("equipment session exposes each completion boundary without guessing a completed artifact", async ({ page }) => {
  const current = row();
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [current] }));
  await page.route("**/api/v1/device-streams/lp1/generation-one?*", r => r.fulfill({ json: current }));
  const win = await open(page);
  for (const [phase, text] of [["observing", "completion not established"], ["guest-returned", "drain and flush"], ["drained", "host-file close"], ["closed", "artifact verification pending"]]) {
    current.phase = phase!; current.sequence++;
    await expect(win.locator("[data-equipment-session]")).toContainText(text!);
    await expect(win.locator("[data-save]")).toBeDisabled();
  }
  current.phase = "disconnected"; current.state = "disconnected"; current.sequence++;
  await expect(win.locator("[data-equipment-session]")).toContainText("retained output may be incomplete");
});
for (const field of ["owner", "job", "phase"] as const) {
  test(`rejects a changed session ${field} without taking over a replacement`, async ({ page }) => {
    const current = row(); current.phase = "drained";
    await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [current] }));
    let calls = 0;
    await page.route("**/api/v1/device-streams/lp1/generation-one?*", r => r.fulfill({ json: ++calls === 1 ? current : { ...current, [field]: field === "phase" ? "observing" : "replacement" } }));
    const win = await open(page);
    await expect(win.locator("[data-activity-status]")).toContainText("changed");
    await expect(win.locator("[data-save]")).toBeDisabled();
    const stopped = calls; await page.waitForTimeout(500); expect(calls).toBe(stopped);
  });
}
test("reader catalog is explicit, inert, bounded and never offers mounting", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/device-media", r => { calls++; return r.fulfill({ json: [{ id: "punch1", name: "<img src=x onerror=alert(1)>", format: "ASCII", provenance: "Authored disposable copy", sha256: "a".repeat(64), bytes: 40, verified: true, read_only: true, generation: "", message: "Operator attachment required" }] }); });
  await page.goto("/"); await page.getByRole("button", { name: "Open Paper tape", exact: true }).click();
  const win = page.locator('[data-window="paper"]');
  await win.getByRole("button", { name: "Observe device", exact: true }).click();
  expect(calls).toBe(0);
  await win.locator("summary").filter({ hasText: "Approved reader media" }).click();
  await win.getByRole("button", { name: "Refresh reader catalog" }).click();
  await expect(win.locator("[data-catalog-status]")).toContainText("does not prove the tape is attached");
  await expect(win.locator("li")).toContainText("<img src=x");
  await expect(win.locator("li img")).toHaveCount(0);
  await expect(win.getByRole("button", { name: /^Mount|^Attach/ })).toHaveCount(0);
  await win.getByRole("button", { name: "Local simulation", exact: true }).click();
  await win.getByRole("button", { name: "Observe device", exact: true }).click();
  expect(calls).toBe(1); await expect(win.locator("[data-catalog-status]")).toContainText("Not loaded");
});
test("stopping a supervised view labels its job as cached", async ({ page }) => {
  const current = row();
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [current] }));
  await page.route("**/api/v1/device-streams/lp1/generation-one?*", r => r.fulfill({ json: current }));
  const win = await open(page);
  await expect(win.locator("[data-equipment-session]")).toContainText("print-one");
  await win.locator("[data-stop]").click();
  await expect(win.locator("[data-equipment-session]")).toContainText("no active observation");
});
test("a delayed reader catalog cannot repaint a different equipment mode", async ({ page }) => {
  let requested = false;
  await page.route("**/api/v1/device-media", async r => {
    requested = true; await new Promise(resolve => setTimeout(resolve, 300));
    await r.fulfill({ json: [] }).catch(() => {});
  });
  await page.goto("/"); await page.getByRole("button", { name: "Open Paper tape", exact: true }).click();
  const win = page.locator('[data-window="paper"]');
  await win.getByRole("button", { name: "Observe device", exact: true }).click();
  await win.locator("summary").filter({ hasText: "Approved reader media" }).click();
  await win.getByRole("button", { name: "Refresh reader catalog" }).click();
  await expect.poll(() => requested).toBe(true);
  await win.getByRole("button", { name: "Local simulation", exact: true }).click();
  await page.waitForTimeout(400);
  await expect(win.locator("[data-catalog-status]")).toHaveCount(0);
  await expect(win.getByRole("button", { name: "Observe device", exact: true })).toHaveAttribute("aria-pressed", "false");
});
