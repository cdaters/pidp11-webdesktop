import { test, expect } from "@playwright/test";
test("Offline references and exact values work without a provider", async ({
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
    .getByRole("button", {
      name: "Maximize / restore AI Companion · optional",
      exact: true,
    })
    .click();
  await win
    .getByText("Exact PDP-11 values · no model required", { exact: true })
    .click();
  await win.getByRole("button", { name: "Calculate exactly" }).click();
  await expect(win.getByLabel("Exact result")).toContainText(
    "decimal 65534 = hex FFFE",
  );
  await win.getByLabel("Exact value", { exact: true }).fill("178000");
  await win.getByRole("button", { name: "Calculate exactly" }).click();
  await expect(win.getByLabel("Exact result")).toContainText("Invalid digits");
  await win.getByLabel("Exact value", { exact: true }).fill("177776");
  await win.getByRole("button", { name: "Calculate exactly" }).click();
  await win
    .getByText("Search historical references · offline", { exact: true })
    .click();
  await win
    .getByLabel("Reference search", { exact: true })
    .fill("PDP-11/70 virtual physical architecture");
  await win
    .getByRole("button", { name: "Search references", exact: true })
    .click();
  await win.locator("[data-search-results] summary").click();
  await expect(win.locator("[data-search-results]")).toContainText(
    "16-bit virtual",
  );
  await expect(win.locator("[data-search-results] a")).toHaveAttribute(
    "href",
    /PDP-11_70_Handbook/,
  );
  await win
    .getByLabel("Reference search", { exact: true })
    .fill("RSX directory");
  await win
    .getByRole("button", { name: "Search references", exact: true })
    .click();
  await expect(win.locator("[data-search-results]")).toContainText(
    "ambiguous-version",
  );
  await expect(win.getByLabel("Exact result")).toContainText("hex FFFE");
  expect(requests).toBe(0);
});
