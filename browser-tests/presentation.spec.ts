import { test, expect } from "@playwright/test";
import { APP_MILESTONE } from "../src/version.ts";

test("About and footer share the application version and identify the local demonstration", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".local-label")).toContainText(APP_MILESTONE);
  await page.getByRole("button", { name: "Open About", exact: true }).click();
  const about = page.locator('[data-window="about"]');
  await expect(about.locator("[data-app-version]")).toHaveText(APP_MILESTONE);
  await expect(about).toContainText("No real PiDP-11 is connected");
  await expect(about).toContainText("four mock terminals");
  await expect(about).toContainText("not guest OS sessions or SIMH-mounted disks");
  await expect(about).toContainText("Oscar Vermeulen");
  await expect(about).toContainText("BlinkenBone/REALCONS");
  await expect(about).toContainText("xterm.js");
  await expect(about).toContainText("Keyboard");
  await expect(about).not.toContainText("rights review");
});
