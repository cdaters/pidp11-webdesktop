import { test, expect, type Page } from "@playwright/test";
const row = () => ({ id: "disk", device: "RL0", controller: "RL11", unit: 0, simulator: "original-lab", guest: "rt11-attested", capture: "capture-one", captured_at: new Date().toISOString(), family: "RL02", configured: true, attachment: "attached", media: "Disposable RL02", provenance: "Verified original; new working copy", sha256: "a".repeat(64), size: 10478080, format: "SIMH disk", capacity: 10485760, geometry: "512 cylinders; 2 heads; 40 sectors; 256 bytes", write_protection: "guest-writable", guest_access: "observed", guest_evidence: "Original console directory listing", activity: "unavailable", position: -1, position_meaning: "unavailable", ready: "observed-ready", filemark: "unavailable", end_of_medium: "unavailable", registers: "RLCS: 000201", source: "Independent idle-console capture", generation: "a".repeat(32) + "-" + "b".repeat(32), freshness: "observed", mode: "captured-snapshot" });
async function open(page: Page) {
 await page.goto("/"); await page.getByRole("button", { name: "Open Disk drives", exact: true }).click();
 const win = page.locator('[data-window="disks"]'); await win.getByRole("button", { name: "Read-only observation", exact: true }).click(); return win;
}
async function routes(page: Page, value = row(), changed = value) {
 await page.route("**/api/v1/storage", r => r.fulfill({ json: [value] }));
 await page.route("**/api/v1/storage/disk/*", r => r.fulfill({ json: changed })); return value;
}
test("explicit capture separates configuration, attachment and guest evidence", async ({ page }) => {
 const item = await routes(page); const win = await open(page);
 await expect(win.locator("[data-storage-status]")).toContainText("Disconnected");
 await win.locator("[data-storage-refresh]").click(); await win.getByLabel("Storage capture").selectOption(item.generation); await win.locator("[data-storage-view]").click();
 await expect(win.locator("[data-storage-facts]")).toContainText("Original console directory listing");
 await expect(win.locator("[data-storage-facts]")).toContainText("no animated or inferred activity");
 await expect(win.getByRole("button", { name: /Mount|Eject|Rewind/ })).toHaveCount(0);
 await win.getByRole("button", { name: "Retained snapshot", exact: true }).click();
 await expect(win.locator("[data-storage-status]")).toContainText("not connected");
 await expect(win.locator("[data-storage-facts]")).toContainText("Disposable RL02");
});
for (const corruption of ["unit", "identity", "activity"] as const) test(`reject ${corruption} mismatch`, async ({ page }) => {
 const item = row(), changed = { ...item };
 if (corruption === "unit") changed.unit = 1;
 if (corruption === "identity") changed.sha256 = "c".repeat(64);
 if (corruption === "activity") changed.activity = "idle";
 await routes(page,item,changed); const win = await open(page);
 await win.locator("[data-storage-refresh]").click(); await win.getByLabel("Storage capture").selectOption(item.generation); await win.locator("[data-storage-view]").click();
 await expect(win.locator("[data-storage-status]")).toContainText(corruption === "identity" ? "identity changed" : corruption === "unit" ? "Unsupported" : "Unqualified");
 await expect(win.locator("[data-storage-facts]")).toBeEmpty();
});
test("old capture is stale, never inferred idle", async ({ page }) => {
 const item = row(); item.captured_at = "2026-01-01T00:00:00Z"; await routes(page,item); const win = await open(page);
 await win.locator("[data-storage-refresh]").click(); await win.getByLabel("Storage capture").selectOption(item.generation); await win.locator("[data-storage-view]").click();
 await expect(win.locator("[data-storage-status]")).toContainText("STALE capture");
});
test("delayed capture cannot repaint after cancellation", async ({ page }) => {
 const item = await routes(page); let requested = false;
 await page.route("**/api/v1/storage/disk/*", async r => { requested = true; await new Promise(resolve => setTimeout(resolve,300)); await r.fulfill({ json: item }).catch(() => {}); });
 const win = await open(page); await win.locator("[data-storage-refresh]").click(); await win.getByLabel("Storage capture").selectOption(item.generation); await win.locator("[data-storage-view]").click();
 await expect.poll(() => requested).toBe(true); await win.locator("[data-storage-stop]").click(); await page.waitForTimeout(400);
 await expect(win.locator("[data-storage-facts]")).toBeEmpty(); await expect(win.locator("[data-storage-status]")).toContainText("Disconnected viewer");
});
test("closed or replaced mode cancels pending inventory", async ({ page }) => {
 await page.route("**/api/v1/storage", async r => { await new Promise(resolve => setTimeout(resolve,300)); await r.fulfill({ json:[row()] }).catch(() => {}); });
 const win = await open(page); await win.locator("[data-storage-refresh]").click(); await win.getByRole("button", { name: "Local simulation", exact:true }).click(); await page.waitForTimeout(400);
 await expect(win.locator("[data-storage-facts]")).toHaveCount(0); await expect(win.getByRole("button", { name:"Mount", exact:true }).first()).toBeVisible();
});
test("bounded inventory rejects extra devices", async ({ page }) => {
 await page.route("**/api/v1/storage", r => r.fulfill({ json:Array.from({length:5},()=>row()) })); const win=await open(page); await win.locator("[data-storage-refresh]").click(); await expect(win.locator("[data-storage-status]")).toContainText("bounds");
});
test("narrow storage window keeps controls inside the window", async ({page})=>{
 await page.setViewportSize({width:390,height:844}); await routes(page); const win=await open(page); await win.locator("[data-storage-refresh]").click();
 const bounds=await win.boundingBox(), select=await win.getByLabel("Storage capture").boundingBox(); expect(select!.width).toBeLessThan(bounds!.width);
});
