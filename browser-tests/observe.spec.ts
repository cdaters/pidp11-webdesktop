import { test, expect } from "@playwright/test";
const frame = () => ({
  source: "realcons-observation-lab",
  available: true,
  fresh: true,
  ageMs: 12,
  frame: {
    boot: "0000000000000001",
    seq: 1,
    capturedUnixMs: Date.now(),
    inputs: {
      SR: 123,
      LAMPTEST: 0,
      LOAD_ADRS: 0,
      EXAM: 0,
      DEPOSIT: 0,
      CONT: 0,
      HALT: 1,
      S_BUS_CYCLE: 0,
      START: 0,
      POWER: 1,
      PANEL_LOCK: 0,
      ADDR_SELECT: 4,
      DATA_SELECT: 2,
    },
    outputs: {
      ADDRESS: 123,
      DATA: 456,
      PARITY_HIGH: 0,
      PARITY_LOW: 0,
      PAR_ERR: 0,
      ADRS_ERR: 0,
      RUN: 0,
      PAUSE: 0,
      MASTER: 1,
      MMR0_MODE: 0,
      DATA_SPACE: 0,
      ADDRESSING_16: 1,
      ADDRESSING_18: 0,
      ADDRESSING_22: 0,
      ADDR_SELECT_FEEDBACK: 16,
      DATA_SELECT_FEEDBACK: 4,
    },
  },
});
test("read-only observation, unavailable/stale states and spectator reconnect", async ({
  page,
}) => {
  let sockets = 0;
  const sent: string[] = [];
  await page.route("**/api/v1/login", (route) =>
    route.fulfill({ json: { capabilities: ["observe"] } }),
  );
  await page.routeWebSocket("**/api/v1/observe/ws", (ws) => {
    sockets++;
    ws.onMessage((m) => sent.push(String(m)));
    ws.send(JSON.stringify(frame()));
    if (sockets === 1) setTimeout(() => ws.close(), 80);
  });
  await page.goto("/?backend=observe");
  await expect(page.locator("#source-badge")).toHaveText(
    "OBSERVATION UNAVAILABLE",
  );
  await expect(page.locator("#address-value")).toHaveText("—");
  await page.locator("#observe-login").click();
  await page
    .getByLabel("Observation token")
    .fill("test-only-token-no-real-permissions");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => sockets).toBe(2);
  await expect(page.locator("#address-value")).toHaveText("00000173");
  await expect(page.locator("#source-badge")).toHaveText("STALE OBSERVATION", {
    timeout: 3000,
  });
  await expect(
    page.getByRole("switch", { name: "Switch register bit 0", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  expect(sent).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("pidp11.layout.v1")),
  ).not.toMatch(/token|owner|capabilities/);
});
test("touch switch uses the shared panel model on a tablet", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/");
  await page
    .getByRole("button", { name: "Open Front panel", exact: true })
    .tap();
  await page.locator(".touch-controls summary").tap();
  const bit = page.locator('.touch-controls [data-bit="0"]');
  await bit.tap();
  await expect(bit).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#switch-0")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(
    await bit.evaluate((e) => e.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(44);
  await context.close();
});
