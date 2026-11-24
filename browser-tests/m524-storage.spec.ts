import { test, expect } from "@playwright/test";
// Intercepted fixtures; genuine guest rendering is separately exercised in lab/m524.
export const rpFixture = () => ({ id: "rp-disk", device: "RP0", controller: "RH70", unit: 0, simulator: "original-lab", guest: "v7-attested", capture: "capture-one", captured_at: new Date().toISOString(), family: "RP06", configured: true, attachment: "attached", media: "Disposable V7 RP06", provenance: "Verified immutable base; disposable working copy", sha256: "a".repeat(64), size: 174423040, format: "SIMH disk", capacity: 174423040, geometry: "815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors", write_protection: "guest-writable", guest_access: "observed", guest_evidence: "Original console ls / completed", activity: "unavailable", position: -1, position_meaning: "unavailable", ready: "observed-ready", filemark: "unavailable", end_of_medium: "unavailable", registers: "DS[0]: 010700; ER1[0]: 000000", source: "Independent idle-console capture", generation: "a".repeat(32) + "-" + "b".repeat(32), freshness: "observed", mode: "captured-snapshot" });
test("RP06 provenance, geometry and aging remain visible when retained", async ({page}) => {
 const rp = rpFixture(); rp.captured_at = new Date(Date.now()-40000).toISOString();
 const rl = {...rp, id:"rl-disk", device:"RL0", controller:"RL11", family:"RL02", capacity:10485760, size:10478080, geometry:"RL02 fixture", generation:"c".repeat(32)+"-"+"d".repeat(32)};
 await page.route("**/api/v1/storage", r => r.fulfill({json:[rl,rp]}));
 await page.route("**/api/v1/storage/rp-disk/*", r => r.fulfill({json:rp}));
 await page.goto("/"); await page.getByRole("button",{name:"Open Disk drives",exact:true}).click();
 const win=page.locator('[data-window="disks"]'); await win.getByRole("button",{name:"Read-only observation",exact:true}).click();
 await win.locator("[data-storage-refresh]").click(); await expect(win.getByLabel("Storage capture").locator("option")).toHaveCount(3);
 await win.getByLabel("Storage capture").selectOption(rp.generation); await win.locator("[data-storage-view]").click();
 await expect(win.locator("[data-storage-facts]")).toContainText(rp.provenance);
 await expect(win.locator("[data-storage-facts]")).toContainText(rp.geometry);
 await expect(win.locator("[data-storage-age]")).toContainText("seconds since capture; current state unknown");
 await expect(win.locator("[data-storage-status]")).toContainText("STALE");
 await win.getByRole("button",{name:"Retained snapshot",exact:true}).click();
 await expect(win.locator("[data-storage-status]")).toContainText("not connected");
 await expect(win.locator("[data-storage-age]")).toContainText("current state unknown");
});
test("unqualified RH11 cannot populate the disk window", async ({page}) => {
 await page.route("**/api/v1/storage", r => r.fulfill({json:[{...rpFixture(),controller:"RH11"}]}));
 await page.goto("/"); await page.getByRole("button",{name:"Open Disk drives",exact:true}).click();
 const win=page.locator('[data-window="disks"]'); await win.getByRole("button",{name:"Read-only observation",exact:true}).click(); await win.locator("[data-storage-refresh]").click();
 await expect(win.locator("[data-storage-status]")).toContainText("Wrong RP06 identity"); await expect(win.locator("[data-storage-facts]")).toBeEmpty();
});
