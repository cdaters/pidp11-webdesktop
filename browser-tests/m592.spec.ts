import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

test("live observer orders partial bytes, completes download and stops on generation loss", async ({
  page,
}) => {
  const chunks = ["LIVE\r", "PAPER\n", "NEXT\fFORM"];
  const all = Buffer.from(chunks.join(""));
  let calls = 0;
  const row = {
    id: "lp",
    kind: "lp11",
    generation: "run-one",
    simulator_generation: "sim1",
    guest_generation: "cpu1",
    state: "observing",
    message: "fixture",
    sequence: 0,
    start_offset: 0,
    next_offset: 0,
    total_bytes: 0,
    lost: false,
    data: null,
    sha256: "",
    reader_length: 0,
    reader_bytes: 0,
    reader_eof: false,
    reader_sha256: "",
  };
  await page.route("**/api/v1/device-streams", (r) =>
    r.fulfill({ json: [row] }),
  );
  await page.route("**/api/v1/device-streams/lp/run-one?*", (r) => {
    const after = Number(new URL(r.request().url()).searchParams.get("after"));
    const data = Buffer.from(chunks[calls++] ?? "");
    const completed = calls === 3;
    return r.fulfill({
      json: {
        ...row,
        state: completed ? "completed" : "observing",
        sequence: calls,
        start_offset: after,
        next_offset: after + data.length,
        total_bytes: after + data.length,
        data: data.toString("base64"),
        sha256: completed ? createHash("sha256").update(all).digest("hex") : "",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Guest devices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Live activity", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh devices", exact: true })
    .click();
  await page.getByLabel("Live peripheral").selectOption("lp");
  await page
    .getByRole("button", { name: "Observe selected generation" })
    .click();
  await expect(page.locator("[data-save]")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.locator("[data-save]").click();
  const stream = await (await download).createReadStream();
  const buffers = [];
  for await (const part of stream!) buffers.push(part);
  expect(Buffer.concat(buffers)).toEqual(all);
  expect(calls).toBe(3);
  await page
    .getByRole("button", { name: "Completed exports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guest device output" }),
  ).toBeVisible();
});

test("live offset loss is explicit and never automatically retried", async ({
  page,
}) => {
  let calls = 0;
  const row = {
    id: "ptp",
    kind: "pc11-punch",
    generation: "one",
    simulator_generation: "sim",
    guest_generation: "guest",
    state: "observing",
    message: "fixture",
    sequence: 1,
    start_offset: 0,
    next_offset: 0,
    total_bytes: 0,
    lost: false,
    data: null,
    sha256: "",
    reader_length: 0,
    reader_bytes: 0,
    reader_eof: false,
    reader_sha256: "",
  };
  await page.route("**/api/v1/device-streams", (r) =>
    r.fulfill({ json: [row] }),
  );
  await page.route("**/api/v1/device-streams/ptp/one?*", (r) => {
    calls++;
    return r.fulfill({
      json: {
        ...row,
        lost: true,
        start_offset: 100,
        next_offset: 101,
        total_bytes: 101,
        data: "QQ==",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Guest devices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Live activity", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh devices", exact: true })
    .click();
  await page.getByLabel("Live peripheral").selectOption("ptp");
  await page
    .getByRole("button", { name: "Observe selected generation" })
    .click();
  await expect(page.locator("[data-activity-status]")).toContainText(
    "Output loss",
  );
  await page.waitForTimeout(600);
  expect(calls).toBe(1);
  await expect(page.locator("[data-save]")).toBeDisabled();
});

test("equipment arrangement preserves independent windows and uses taskbar on tablets", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of [
    "Guest terminal",
    "Guest terminal",
    "Guest devices",
    "AI Companion",
  ])
    await page
      .getByRole("button", { name: `Open ${name}`, exact: true })
      .click();
  await page
    .getByRole("button", { name: "Arrange equipment", exact: true })
    .click();
  for (const id of ["guest", "guest-2", "device-observer", "companion"])
    await expect(page.locator(`[data-window="${id}"]`)).toBeVisible();
  const left = await page.locator('[data-window="guest"]').boundingBox();
  const right = await page.locator('[data-window="guest-2"]').boundingBox();
  expect(right!.x).toBeGreaterThan(left!.x + left!.width);
  await page.setViewportSize({ width: 820, height: 1100 });
  await page
    .getByRole("button", { name: "Arrange equipment", exact: true })
    .click();
  await expect(page.locator(".desktop-window:visible")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Restore Real guest terminal", exact: true })
    .first()
    .click();
  await expect(page.locator('[data-window="guest"]')).toBeVisible();
});

test("reference desk and sharing scope do not contact a provider until submission", async ({
  page,
}) => {
  let sent = 0;
  await page.route("**/api/v1/session", (r) =>
    r.fulfill({ json: { csrf: "fixture" } }),
  );
  await page.route("**/api/v1/companion", (r) =>
    r.fulfill({
      json: {
        configured: true,
        destination: "http://127.0.0.1:19191",
        models: ["model-a", "model-b"],
        fixture: true,
      },
    }),
  );
  await page.route("**/api/v1/companion/chat", (r) => {
    sent++;
    const request = r.request().postDataJSON();
    expect(request.reference).toBe("octal");
    expect(request.model).toBe("model-b");
    expect(request.source).toBe("tty00 selected generation");
    expect(request.shared_text).toBe("17");
    return r.fulfill({
      json: { answer: "Fixture explanation", fixture: true },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open AI Companion", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use configured provider", exact: true })
    .click();
  await expect(page.locator("[data-provider]")).toContainText("DETERMINISTIC");
  await page.getByLabel("Companion model").selectOption("model-b");
  await page
    .getByText("Historical computing reference desk", { exact: true })
    .click();
  await page.getByLabel("Companion reference topic").selectOption("octal");
  await page.getByRole("button", { name: "Use this question" }).click();
  await page
    .getByText("Deliberately share selected terminal text", { exact: true })
    .click();
  await page
    .getByLabel("Shared terminal source")
    .fill("tty00 selected generation");
  await page.getByLabel("Shared terminal excerpt").fill("17");
  await expect(page.locator("[data-sharing-scope]")).toContainText("model-b");
  expect(sent).toBe(0);
  await page
    .getByRole("button", { name: "Send text to configured provider" })
    .click();
  await expect(page.getByRole("log")).toContainText("Fixture explanation");
  expect(sent).toBe(1);
});
