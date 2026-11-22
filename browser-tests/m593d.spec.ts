import { test, expect } from "@playwright/test";

test("Source facts bypass the model and expose their precise source", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/companion/**", (route) => {
    requests++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  const win = page.locator('[data-window="companion"]');
  await win
    .getByText("Source facts · no model required", { exact: true })
    .click();
  await win
    .getByLabel("Verified fact topic")
    .selectOption("deferred-increment");
  await win.getByRole("button", { name: "Prepare fact question" }).click();
  await expect(win.getByLabel("Companion question")).toHaveValue(
    "/fact deferred-increment",
  );
  await win.locator('form button[type="submit"]').click();
  await expect(win.getByRole("log")).toContainText("Source fact · no model");
  await expect(win.getByRole("log")).toContainText("two");
  await expect(win.getByRole("log").getByRole("link")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await win.getByLabel("Companion question").fill("/fact unknown");
  await win.locator('form button[type="submit"]').click();
  await expect(win.locator("[data-status]")).toContainText(
    "Choose a source fact",
  );
  expect(requests).toBe(0);
});

test("Companion link rejects a shared cookie hostname and never opens an iframe", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  const win = page.locator('[data-window="companion"]');
  await win
    .getByText("Optional Hacker Replicant · separate sign-in", { exact: true })
    .click();
  await win
    .getByLabel("Independent companion HTTPS address")
    .fill("https://127.0.0.1:9999");
  await win.getByRole("button", { name: "Open independent companion" }).click();
  await expect(win).toContainText("different hostname");
  await expect(page.locator("iframe")).toHaveCount(0);
});
