// Additional genuine application checks invoked by the existing BSD harness.
import { expect } from "@playwright/test";
export async function expandBSD({
  context,
  page,
  base,
  personality,
  file,
  type,
  screen,
}) {
  await type(`/usr/ucb/vi ${file}`);
  await expect(screen).toContainText("SECOND LINE");
  const observer = await context.newPage();
  try {
    await observer.goto(base);
    await observer
      .getByRole("button", { name: "Open Guest terminal", exact: true })
      .click();
    await observer
      .getByLabel("Guest terminal personality")
      .selectOption(personality);
    await observer.locator("[data-connect]").click();
    await expect(observer.locator(".guest-heading")).toContainText("READ-ONLY");
    // No historical replay: the actual editor redraw supplies both displays.
    await page.locator(".guest-xterm textarea").focus();
    await page.keyboard.press("Control+l");
    await expect(observer.locator(".guest-xterm .xterm-rows")).toContainText(
      "SECOND LINE",
    );
    await page.locator("[data-release]").click();
    // Wait for the server-confirmed release epoch before acquiring from another page.
    await expect(observer.locator(".guest-status")).toContainText(
      "acquire keyboard explicitly",
    );
    await observer.locator("[data-acquire]").click();
    await expect(observer.locator("[data-release]")).toBeEnabled();
    await observer.locator(".guest-xterm textarea").focus();
    await observer.keyboard.type("GA HANDOFF", { delay: 30 });
    await observer.keyboard.press("Escape");
    await observer.keyboard.type(":wq");
    await observer.keyboard.press("Enter");
    await expect
      .poll(() => observer.locator(".guest-xterm .xterm-rows").innerText())
      .toMatch(/#\s*$/);
    await observer.keyboard.type(`cat ${file}`);
    await observer.keyboard.press("Enter");
    await expect(observer.locator(".guest-xterm .xterm-rows")).toContainText(
      "SECOND LINE HANDOFF",
    );
    await expect(screen).toContainText("SECOND LINE HANDOFF");
    await observer.locator("[data-release]").click();
  } finally {
    await observer.close();
  }
  await expect(page.locator(".guest-status")).toContainText(
    "acquire keyboard explicitly",
  );
  await page.locator("[data-acquire]").click();
  await expect(page.locator("[data-release]")).toBeEnabled();
  const numbers = Array.from({ length: 40 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  ).join(" ");
  await type(`for i in ${numbers}; do echo PAGE$i; done > /tmp/m592-pages`);
  await type("/usr/ucb/more /tmp/m592-pages");
  await expect(screen).toContainText("--More--");
  await page.keyboard.press("Space");
  await expect(screen).toContainText("PAGE40");
  await expect.poll(() => screen.innerText()).toMatch(/#\s*$/);
}
