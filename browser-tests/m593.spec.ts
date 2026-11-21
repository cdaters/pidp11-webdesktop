import { test, expect } from "@playwright/test";

test("received terminal selection opens its review panel without submitting", async ({
  page,
}) => {
  let submitted = 0;
  await page.route("**/api/v1/companion/chat", (r) => {
    submitted++;
    return r.fulfill({ status: 500 });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  await expect(page.getByLabel("Shared terminal excerpt")).toBeHidden();
  await page.evaluate(async () => {
    const path = "/src/terminal-sharing.ts";
    const sharing = await import(path);
    sharing.shareSelection(
      "Synthetic selected terminal · generation-a",
      "EXPLICITLY SELECTED TEXT",
    );
  });
  await expect(page.getByLabel("Shared terminal excerpt")).toBeVisible();
  await expect(page.getByLabel("Shared terminal excerpt")).toHaveValue(
    "EXPLICITLY SELECTED TEXT",
  );
  await expect(page.getByLabel("Shared terminal source")).toHaveValue(
    "Synthetic selected terminal · generation-a",
  );
  await expect(page.locator("[data-tutor]")).not.toHaveAttribute("open", "");
  expect(submitted).toBe(0);
});
