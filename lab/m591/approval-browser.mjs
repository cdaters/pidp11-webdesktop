// Actual ARM64 service + deterministic fake guest/provider. No route interception.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const base = "https://127.0.0.1:8447",
  results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1000 },
    });
    expect(
      (
        await context.request.post(base + "/api/v1/login", {
          headers: { Origin: base },
          data: {
            token: readFileSync(
              ".research/m591/arm64-writer.token",
              "utf8",
            ).trim(),
          },
        })
      ).status(),
    ).toBe(200);
    const page = await context.newPage();
    await page.goto(base);
    await page
      .getByRole("button", { name: "Open Guest terminal", exact: true })
      .click();
    await page.getByLabel("Guest endpoint").selectOption("guest-dc0");
    await page.locator("[data-connect]").click();
    await page.locator("[data-acquire]").click();
    await expect(page.locator("[data-release]")).toBeEnabled();
    await page
      .getByText("Review a suggested UNIX command (experimental)", {
        exact: true,
      })
      .click();
    await page.locator("[data-enable-proposals]").check();
    await page.locator("[data-propose]").click();
    await expect(page.locator("[data-proposal-preview]")).toContainText(
      "pwd\\r",
    );
    await page.locator("[data-approve]").click();
    await expect(page.locator(".guest-xterm .xterm-rows")).toContainText(
      "FAKE GUEST received: pwd",
    );
    await expect(page.locator("[data-approve]")).toBeDisabled();
    await page.locator("[data-propose]").click();
    await expect(page.locator("[data-approve]")).toBeEnabled();
    await page.locator("[data-enable-proposals]").uncheck();
    await expect(page.locator("[data-proposal-preview]")).toBeEmpty();
    await page.locator("[data-disconnect]").click();
    await page.locator("[data-connect]").click();
    await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
    await page
      .getByRole("button", { name: "Open AI Companion", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use configured provider", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Test connection / list models" })
      .click();
    await expect(page.locator("[data-status]")).toContainText(
      "Provider responded",
    );
    await page.getByLabel("Companion question").fill("Explain ls");
    await page
      .getByRole("button", { name: "Send text to configured provider" })
      .click();
    await expect(page.getByRole("log")).toContainText(
      "DETERMINISTIC HTTP FIXTURE",
    );
    results.push({
      browser: name,
      actualARM64Service: true,
      fakeGuest: true,
      model: false,
      approvalDelivery: true,
      reconnectReadOnly: true,
      configuredProvider: true,
    });
    console.log(name + ": actual service approval/provider passed");
  } finally {
    await browser.close();
    writeFileSync(
      ".research/m591/approval-browser.json",
      JSON.stringify(results, null, 2),
    );
  }
}
