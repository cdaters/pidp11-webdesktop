import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

test("configured provider is explicit, previews shared text and labels fixture responses", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/session", (r) =>
    r.fulfill({ json: { csrf: "fixture" } }),
  );
  await page.route("**/api/v1/companion", (r) =>
    r.fulfill({
      json: {
        configured: true,
        discovery: true,
        destination: "http://127.0.0.1:19191",
        models: ["fixture"],
        fixture: true,
      },
    }),
  );
  await page.route("**/api/v1/companion/models", (r) =>
    r.fulfill({ json: { models: ["fixture"] } }),
  );
  await page.route("**/api/v1/companion/chat", (r) => {
    calls++;
    const body = r.request().postDataJSON();
    expect(body.shared_text).toBe("EXACT OWNER SELECTION");
    expect(body.source).toBe("tty02 generation-a");
    expect(body.send_to_configured_provider).toBe(true);
    return r.fulfill({
      json: {
        answer: "Fixture: octal uses digits zero through seven.",
        fixture: true,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use configured provider", exact: true })
    .click();
  await expect(page.locator("[data-provider]")).toContainText(
    "DETERMINISTIC PROVIDER FIXTURE",
  );
  await page
    .getByRole("button", { name: "Test connection / list models" })
    .click();
  await expect(page.locator("[data-status]")).toContainText(
    "Provider responded",
  );
  await page
    .getByText("Deliberately share selected terminal text", { exact: true })
    .click();
  await page
    .getByLabel("Shared terminal excerpt")
    .fill("EXACT OWNER SELECTION");
  await page.getByLabel("Shared terminal source").fill("tty02 generation-a");
  await page.getByLabel("Companion question").fill("Explain octal");
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Send text to configured provider" })
    .click();
  await expect(page.getByRole("log")).toContainText("zero through seven");
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Use offline guide" }).click();
  await expect(page.getByRole("log")).toBeEmpty();
});
test("device observation pins generation, preserves bytes and rejects replacement", async ({
  page,
}) => {
  const bytes = Buffer.from("ABC\rZ\nSECOND\fFORM TWO");
  const sha = createHash("sha256").update(bytes).digest("hex");
  let retired = false;
  const device = {
    id: "lp",
    kind: "lp11",
    state: "completed",
    generation: "generation-one",
    simulator_generation: "sim-1",
    guest_generation: "diskless-1",
    bytes: bytes.length,
    sha256: sha,
  };
  await page.route("**/api/v1/devices", (r) => r.fulfill({ json: [device] }));
  await page.route("**/api/v1/devices/lp/generation-one", (r) =>
    retired
      ? r.fulfill({ status: 404 })
      : r.fulfill({ json: { ...device, data: bytes.toString("base64") } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Guest devices", exact: true })
    .click();
  await page.getByRole("button", { name: "Refresh observations" }).click();
  await page.getByLabel("Observed device", { exact: true }).selectOption("lp");
  await page.getByRole("button", { name: "View selected generation" }).click();
  await expect(page.locator("[data-device-status]")).toContainText(
    "checksum verified",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save exact device bytes" }).click();
  const artifact = await download;
  const stream = await artifact.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(bytes);
  retired = true;
  await page.getByRole("button", { name: "View selected generation" }).click();
  await expect(page.locator("[data-device-status]")).toContainText("retired");
  await expect(
    page.getByRole("button", { name: "Save exact device bytes" }),
  ).toBeDisabled();
});
test("proposal UI shows Return and needs a separate approval click", async ({
  page,
}) => {
  let approves = 0,
    expiresAfter = 30000,
    cancels = 0;
  await page.route("**/api/v1/session", (r) =>
    r.fulfill({
      json: { capabilities: { "terminal.input": true }, csrf: "fixture" },
    }),
  );
  await page.route("**/api/v1/features", (r) =>
    r.fulfill({ json: { readonly_command_proposals: true } }),
  );
  await page.route("**/api/v1/terminals", (r) =>
    r.fulfill({
      json: [
        {
          id: "fake",
          label: "FAKE GUEST",
          connected: true,
          generation: "one",
          state: "attached",
        },
      ],
    }),
  );
  await page.routeWebSocket(
    "**/api/v1/terminals/fake/generation/one/ws",
    (ws) => {
      ws.send(
        JSON.stringify({
          type: "state",
          connected: true,
          owner: false,
          epoch: 1,
        }),
      );
      ws.onMessage((raw) => {
        const m = JSON.parse(String(raw));
        if (m.type === "acquire")
          ws.send(
            JSON.stringify({
              type: "state",
              connected: true,
              owner: true,
              epoch: 2,
            }),
          );
        if (m.type === "propose")
          ws.send(
            JSON.stringify({
              type: "proposal",
              proposal_id: "single-use",
              data: m.data,
              epoch: 2,
              expires: Date.now() + expiresAfter,
            }),
          );
        if (m.type === "cancel-proposal") cancels++;
        if (m.type === "approve") {
          approves++;
          ws.send(
            JSON.stringify({
              type: "proposal-result",
              message: "Bytes delivered once; fake guest only",
            }),
          );
        }
      });
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Guest terminal", exact: true })
    .click();
  await page.locator("[data-connect]").click();
  await page.locator("[data-acquire]").click();
  await page
    .getByText("Review a suggested UNIX command (experimental)", {
      exact: true,
    })
    .click();
  await page.locator("[data-enable-proposals]").check();
  await page.locator("[data-propose]").click();
  await expect(page.locator("[data-proposal-preview]")).toContainText("\\r");
  expect(approves).toBe(0);
  await page.locator("[data-approve]").click();
  await expect(page.locator(".guest-status")).toContainText("fake guest");
  expect(approves).toBe(1);
  await expect(page.locator("[data-approve]")).toBeDisabled();
  expiresAfter = 600;
  await page.locator("[data-propose]").click();
  await expect(page.locator("[data-proposal-preview]")).toContainText("fake");
  await expect(page.locator("[data-proposal-preview]")).toContainText("one");
  await expect(page.locator("[data-approve]")).toBeDisabled({ timeout: 3000 });
  await expect(page.locator(".guest-status")).toContainText("expired");
  expect(approves).toBe(1);
  expect(cancels).toBeGreaterThan(0);
  await page.locator("[data-disconnect]").click();
  await expect(page.locator("[data-proposal-preview]")).toBeEmpty();
});
