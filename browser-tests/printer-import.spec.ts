import { test, expect } from "@playwright/test";
test("imported text snapshot preserves printer queue and form-feed presentation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Line printer", exact: true })
    .click();
  await page
    .getByLabel("Import printer text spool")
    .setInputFiles({
      name: "snapshot.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("IMPORTED LISTING\r\nROW\fSECOND PAGE"),
    });
  await expect(page.locator("[data-import-status]")).toContainText(
    "No guest attached",
  );
  await page.locator("[data-print]").click();
  await expect(page.locator(".printer-paper")).toContainText(
    "IMPORTED LISTING",
  );
  await page.locator("[data-bottom]").click();
  await expect(page.locator(".printer-paper")).toContainText("SECOND PAGE");
  await page
    .getByLabel("Import printer text spool")
    .setInputFiles({
      name: "binary.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([255]),
    });
  await expect(page.locator("[data-import-status]")).toContainText("ASCII7");
  await expect(page.locator(".job-list li")).toHaveCount(1);
});
