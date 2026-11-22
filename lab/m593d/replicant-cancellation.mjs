// Slow transport fixture through the actual optional app; never model output.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = ".research/m593d/cross-host";
const base = "https://localhost:8510";
const browser = await chromium.launch();
const state = () =>
  JSON.parse(
    execFileSync(
      "docker",
      [
        "exec",
        "pidp11-m593d-model",
        "curl",
        "-sS",
        "http://127.0.0.1:19191/state",
      ],
      { encoding: "utf8" },
    ),
  );
const result = { fixture: true };
try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    httpCredentials: {
      username: "companion",
      password: readFileSync(root + "/login-token", "utf8").trim(),
    },
  });
  const page = await context.newPage();
  await page.goto(base);
  const before = state();
  await page
    .locator("#chat-input")
    .fill("SLOW TRANSPORT FIXTURE: explain PDP-11");
  await page.locator("#chat-form").evaluate((form) => form.requestSubmit());
  await expect.poll(() => state().entered).toBe(before.entered + 1);
  const competing = await context.request.post(base + "/api/chat", {
    headers: { Origin: base },
    data: { messages: [{ role: "user", content: "No queue" }] },
  });
  expect(competing.status()).toBe(429);
  await page
    .getByRole("button", { name: "Cancel question", exact: true })
    .click();
  await expect.poll(() => state().cancelled).toBe(before.cancelled + 1);
  result.buttonCancellationPropagated = true;
  result.concurrentRefused = true;
  await expect(page.locator("#chat-log")).toContainText("failed");
  await page
    .locator("#chat-input")
    .fill("SLOW TRANSPORT FIXTURE: explain PDP-11 again");
  await page.locator("#chat-form").evaluate((form) => form.requestSubmit());
  await expect.poll(() => state().entered).toBe(before.entered + 2);
  await page.close();
  await expect.poll(() => state().cancelled).toBe(before.cancelled + 2);
  result.browserDisconnectPropagated = true;
} finally {
  writeFileSync(
    root + "/replicant-cancellation.json",
    JSON.stringify(result, null, 2),
  );
  await browser.close();
}
