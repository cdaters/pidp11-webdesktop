import { test, expect } from "@playwright/test";
test("offline companion shares only submitted text, renders inert content and clears", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/companion/**", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  await expect(page.locator("[data-provider]")).toContainText(
    "no model or network",
  );
  await page
    .getByLabel("Companion question")
    .fill("List directories <img src=x onerror=alert(1)>");
  await page
    .getByText("Deliberately share selected terminal text", { exact: true })
    .click();
  await page
    .getByLabel("Shared terminal excerpt")
    .fill("private sample; never execute this");
  await page.getByRole("button", { name: "Send to offline fixture" }).click();
  await expect(page.getByRole("log")).toContainText(
    "ls lists directory entries",
  );
  await expect(page.getByRole("log").locator("img")).toHaveCount(0);
  await expect(page.getByLabel("Shared terminal excerpt")).toBeEmpty();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Clear chat" }).click();
  await expect(page.getByRole("log")).toBeEmpty();
});
