import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).cspViolations.push(e.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as any).cspViolations)).toEqual([]);
});
test("working desktop, independent terminals and media workflows", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator('[data-window="panel"]')).toBeVisible();
  await expect(page.locator(".front-panel")).toHaveAttribute(
    "viewBox",
    "0 0 1200 688",
  );
  // Window focus, movement, minimize/restore, close/reopen, maximization.
  await page
    .getByRole("button", { name: "Minimize DZ0 · DEC terminal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore DZ0 · DEC terminal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Disk drives", exact: true })
    .click();
  const disks = page.locator('[data-window="disks"]');
  const before = await disks.boundingBox();
  await disks.locator(".window-title").hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + 160, before!.y + 70, { steps: 5 });
  await page.mouse.up();
  expect((await disks.boundingBox())!.x).not.toBe(before!.x);
  const grip = disks.getByRole("button", {
    name: "Resize Disk drives",
    exact: true,
  });
  await grip.focus();
  const w = (await disks.boundingBox())!.width;
  await page.keyboard.press("ArrowRight");
  expect((await disks.boundingBox())!.width).toBeGreaterThan(w);
  await disks
    .getByRole("button", {
      name: "Maximize / restore Disk drives",
      exact: true,
    })
    .click();
  await expect(disks).toHaveClass(/maximized/);
  await disks
    .getByRole("button", {
      name: "Maximize / restore Disk drives",
      exact: true,
    })
    .click();
  await disks.locator('[data-mount="RL0"]').click();
  await expect(disks).toContainText("RT-11 · demonstration pack");
  await page.getByRole("button", { name: "Open Systems", exact: true }).click();
  await page
    .getByRole("button", { name: "Start demo", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("button", { name: "Open Disk drives", exact: true })
    .click();
  await disks.locator('[data-eject="RL0"]').click();
  await expect(page.locator("#toast")).toContainText(
    "Stop the simulated session",
  );
  await page.getByRole("button", { name: "Open Systems", exact: true }).click();
  await page
    .getByRole("button", { name: "Stop simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Line printer", exact: true })
    .click();
  await page.getByRole("button", { name: "Add sample job" }).click();
  await page.getByRole("button", { name: "Print queue", exact: true }).click();
  await expect(page.locator(".printer-paper")).toContainText("HELLO, WORLD");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download spool" }).click();
  expect((await download).suggestedFilename()).toBe("pidp11-demo-spool.txt");
  await page
    .getByRole("button", { name: "Open Paper tape", exact: true })
    .click();
  await page.getByRole("button", { name: "Punch text", exact: true }).click();
  await expect(page.locator('[data-window="paper"]')).toContainText(
    "output bytes",
  );
  await page
    .getByLabel("Load local paper tape")
    .setInputFiles({
      name: "demo.pt",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0, 255, 65, 66]),
    });
  await expect(page.locator('[data-window="paper"]')).toContainText(
    "4 bytes loaded",
  );
  // Each renderer/session owns its keyboard independently; never dispatch panel commands.
  await page
    .getByRole("button", { name: "Open Terminal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore DZ0 · DEC terminal", exact: true })
    .click();
  const t0 = page.locator('[data-window="terminal-1"]');
  const t1 = page.locator('[data-window="terminal-2"]');
  await expect(t0.locator(".xterm")).toBeVisible();
  await t0.getByRole("button", { name: "Acquire keyboard" }).click();
  await t0.locator("textarea.xterm-helper-textarea").focus();
  await page.keyboard.type("HELP");
  await page.keyboard.press("Enter");
  await expect(t0.locator(".xterm-screen")).toContainText(
    "Local terminal fixture",
  );
  await page
    .getByRole("button", { name: "Restore DZ1 · DEC terminal", exact: true })
    .click();
  await expect(
    t1.getByRole("button", { name: "Acquire keyboard" }),
  ).toBeVisible();
  await expect(t1.locator(".xterm-screen")).not.toContainText(
    "Local terminal fixture",
  );
  await page
    .getByRole("button", { name: "Open Front panel", exact: true })
    .click();
  const panel = page.locator('[data-window="panel"]');
  await panel
    .getByRole("switch", { name: "Switch register bit 0", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(
    panel.getByRole("switch", { name: "Switch register bit 0", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Full panel", exact: true }).click();
  await expect(panel.locator(".window-body")).toHaveClass(/authentic-mode/);
  await expect(panel.locator(".panel-options")).toBeHidden();
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/m43-full-panel.png" });
  await page
    .getByRole("button", { name: "Desktop panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close Paper tape", exact: true })
    .click({ force: true });
  await page
    .getByRole("button", { name: "Open Paper tape", exact: true })
    .click();
  await expect(page.locator('[data-window="paper"]')).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile touch and desktop screenshots; preferences contain geometry only", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await expect(page.locator(".xterm-screen")).toContainText(
    "LOCAL TERMINAL FIXTURE",
  );
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/m43-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('[data-window="panel"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Open Magnetic tape", exact: true })
    .click();
  await page.locator('[data-mount="MT0"]').click();
  await page.getByRole("button", { name: "Advance", exact: true }).click();
  await expect(page.locator(".tape-position")).toContainText("block 10");
  if (browserName === "chromium")
    await page.screenshot({ path: "docs/screenshots/m43-mobile.png" });
  const saved = await page.evaluate(() =>
    localStorage.getItem("pidp11.layout.v1"),
  );
  expect(saved).not.toMatch(/owner|token|csrf|credential/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
