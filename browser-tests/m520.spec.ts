import { test, expect, type Page, type Locator } from "@playwright/test";
import { createHash } from "node:crypto";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const observation = (kind = "lp11") => ({
  id: kind === "lp11" ? "printer" : "punch", kind, generation: "one",
  simulator_generation: "sim", guest_generation: "guest", state: "observing",
  message: "Fixture only", sequence: 0, start_offset: 0, next_offset: 0,
  total_bytes: 0, lost: false, data: null as string | null, sha256: "",
  reader_length: 0, reader_bytes: 0, reader_eof: false, reader_sha256: "",
});
async function open(page: Page, equipment = "Line printer") {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${equipment}`, exact: true }).click();
  const win = page.locator(`[data-window="${equipment === "Line printer" ? "printer" : "paper"}"]`);
  await win.getByRole("button", { name: "Observe device", exact: true }).click();
  await win.locator("[data-inventory]").click();
  await win.getByLabel("Live peripheral").selectOption(equipment === "Line printer" ? "printer" : "punch");
  await win.locator("[data-follow]").click();
  return win;
}
async function downloaded(page: Page, button: Locator) {
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  const chunks: Buffer[] = [];
  for await (const chunk of (await file.createReadStream())!) chunks.push(Buffer.from(chunk));
  return { name: file.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

test("printer observation filters equipment and preserves explicitly incomplete bytes", async ({ page }) => {
  const row = observation(), bytes = Buffer.from("FIRST\r\nSECOND\fFORM TWO");
  let calls = 0;
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [row, observation("pc11-punch")] }));
  await page.route("**/api/v1/device-streams/printer/one?*", r => {
    calls++;
    const after = Number(new URL(r.request().url()).searchParams.get("after"));
    return r.fulfill({ json: { ...row, sequence: 1, start_offset: after, next_offset: bytes.length,
      total_bytes: bytes.length, data: bytes.subarray(after).toString("base64") } });
  });
  const win = await open(page);
  await expect(win.getByLabel("Live peripheral").locator("option")).toHaveCount(2);
  await expect(win.locator("[data-save-partial]")).toBeEnabled();
  await expect(win.locator("[data-save]")).toBeDisabled();
  await win.locator("[data-stop]").click();
  const count = calls;
  const raw = await downloaded(page, win.locator("[data-save-partial]"));
  expect(raw.bytes).toEqual(bytes);
  expect(raw.name).toContain(`one-0-${bytes.length}-incomplete`);
  expect((await downloaded(page, win.locator("[data-save-text]"))).bytes).toEqual(bytes);
  await page.waitForTimeout(500);
  expect(calls).toBe(count);
  await win.getByRole("button", { name: "Local simulation", exact: true }).click();
  await expect(win.getByRole("button", { name: "Add sample job" })).toBeVisible();
  await expect(win.locator("[data-activity-status]")).toHaveCount(0);
});

test("network loss preserves partial evidence and replacement needs an explicit selection", async ({ page }) => {
  const row = observation(), bytes = Buffer.from("PRESERVE ME");
  let calls = 0;
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [row] }));
  await page.route("**/api/v1/device-streams/printer/*?*", r => {
    calls++;
    if (calls > 1) return r.abort();
    return r.fulfill({ json: { ...row, sequence: 1, next_offset: bytes.length,
      total_bytes: bytes.length, data: bytes.toString("base64") } });
  });
  const win = await open(page);
  await expect(win.locator("[data-activity-status]")).toContainText("cached bytes");
  expect((await downloaded(page, win.locator("[data-save-partial]"))).bytes).toEqual(bytes);
  await expect(win.locator("[data-save]")).toBeDisabled();
  row.generation = "replacement";
  await win.locator("[data-inventory]").click();
  await expect(win.locator("[data-follow]")).toBeDisabled();
  await page.waitForTimeout(500);
  expect(calls).toBe(2);
});

test("completed printer bytes and text retain original carriage returns and form feeds", async ({ page }) => {
  const row = observation(), bytes = Buffer.from("ABC\rZ\nSECOND\fLAST");
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [row] }));
  await page.route("**/api/v1/device-streams/printer/one?*", r => r.fulfill({ json: {
    ...row, state: "completed", sequence: 1, next_offset: bytes.length,
    total_bytes: bytes.length, data: bytes.toString("base64"), sha256: hash(bytes),
  } }));
  const win = await open(page);
  await expect(win.locator("[data-save]")).toBeEnabled();
  await expect(win.locator("[data-save-partial]")).toBeDisabled();
  expect((await downloaded(page, win.locator("[data-save]"))).bytes).toEqual(bytes);
  const text = await downloaded(page, win.locator("[data-save-text]"));
  expect(text.bytes).toEqual(bytes);
  expect(text.name).toMatch(/-completed\.txt$/);
  await expect(win.locator(".paper-ink").first()).toHaveText("ZBC");
});

test("reader EOF never completes punch output and reader download pauses observation", async ({ page }) => {
  const bytes = Buffer.from([0, 128, 255]);
  const row = { ...observation("pc11-punch"), reader_length: 3, reader_bytes: 3, reader_eof: true, reader_sha256: hash(bytes) };
  let calls = 0;
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [observation(), row] }));
  await page.route("**/api/v1/device-streams/punch/one?*", r => { calls++; return r.fulfill({ json: row }); });
  await page.route("**/api/v1/device-streams/punch/one/reader", r => r.fulfill({ json: { generation: "one", data: bytes.toString("base64") } }));
  const win = await open(page, "Paper tape");
  await expect(win.locator("[data-activity-count]")).toContainText("end-of-tape reported");
  await expect(win.locator("[data-save]")).toBeDisabled();
  expect((await downloaded(page, win.locator("[data-reader]"))).bytes).toEqual(bytes);
  const count = calls;
  await expect(win.locator("[data-activity-status]")).toContainText("Observation paused");
  await page.waitForTimeout(500);
  expect(calls).toBe(count);
});

for (const change of ["kind", "guest_generation", "reader_length"] as const) {
  test(`changed ${change} is rejected even with the same observation generation`, async ({ page }) => {
    const row = observation();
    await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [row] }));
    await page.route("**/api/v1/device-streams/printer/one?*", r => r.fulfill({ json: {
      ...row, [change]: change === "reader_length" ? 1 : change === "kind" ? "pc11-punch" : "different-guest",
    } }));
    const win = await open(page);
    await expect(win.locator("[data-activity-status]")).toContainText("identity or order changed");
    await expect(win.locator("[data-save]")).toBeDisabled();
  });
}

test("switching equipment mode cancels a pending response without rendering its bytes", async ({ page }) => {
  const row = observation();
  let calls = 0;
  await page.route("**/api/v1/device-streams", r => r.fulfill({ json: [row] }));
  await page.route("**/api/v1/device-streams/printer/one?*", async r => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 400));
    await r.fulfill({ json: { ...row, next_offset: 5, total_bytes: 5, data: "TEFURSE=" } }).catch(() => {});
  });
  const win = await open(page);
  await expect.poll(() => calls).toBe(1);
  await win.getByRole("button", { name: "Local simulation", exact: true }).click();
  await page.waitForTimeout(650);
  await expect(win).not.toContainText("LATE!");
  await expect(win.locator("[data-activity-status]")).toHaveCount(0);
  expect(calls).toBe(1);
});
