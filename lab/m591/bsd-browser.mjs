// Genuine historical 2.11BSD vi over its DZ11 guest line; no intercepted routes.
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const root = process.env.PIDP_BSD_WORK ?? ".research/m591/bsd",
  base = "https://127.0.0.1:8446";
const results = [];
for (const personality of (
  process.env.M591_PERSONALITIES ?? "vt100,vt52,vt220"
).split(","))
  for (const [name, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  }).filter(
    ([name]) => !process.env.BSD_ENGINE || name === process.env.BSD_ENGINE,
  )) {
    const browser = await engine.launch();
    const frames = [];
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
              token: readFileSync(root + "/writer.token", "utf8").trim(),
            },
          })
        ).status(),
      ).toBe(200);
      const page = await context.newPage();
      page.on("websocket", (socket) =>
        socket.on("framereceived", (frame) => {
          if (frames.length < 3000) frames.push(String(frame.payload));
        }),
      );
      await page.goto(base);
      await page
        .getByRole("button", { name: "Open Guest terminal", exact: true })
        .click();
      await page
        .getByLabel("Guest terminal personality")
        .selectOption(personality);
      await page.locator("[data-connect]").click();
      await page.locator("[data-acquire]").click();
      await expect(page.locator("[data-release]")).toBeEnabled();
      const screen = page.locator(".guest-xterm .xterm-rows");
      async function type(text, enter = true) {
        await page.locator(".guest-xterm textarea").focus();
        await page.keyboard.type(text, { delay: 15 });
        if (enter) await page.keyboard.press("Enter");
      }
      await type("");
      await expect
        .poll(() => screen.innerText(), { timeout: 15000 })
        .toMatch(/login:|#\s*$/);
      if ((await screen.innerText()).includes("login:")) {
        await type("root");
        await expect.poll(() => screen.innerText()).toMatch(/#\s*$/);
      }
      const file = `/tmp/${process.env.BSD_RUN ?? "m591"}-${personality}-${name}`;
      await type(`TERM=${personality}; export TERM; /usr/ucb/vi ${file}`);
      await expect
        .poll(() => screen.innerText(), { timeout: 15000 })
        .toContain("New file");
      await type(`iM591 ${personality} ${name}`, false);
      await page.keyboard.press("Enter");
      await type("SECOND LINE", false);
      await page.keyboard.press("Escape");
      await type(":w");
      await expect(screen).toContainText("SECOND LINE");
      await page.keyboard.press("Control+l");
      await expect(screen).toContainText("M591");
      if (
        name === "chromium" &&
        (personality === "vt100" || process.env.BSD_SCREENSHOT)
      ) {
        await page
          .locator('[data-window="guest"]')
          .getByRole("button", { name: /Maximize \/ restore/ })
          .click();
        await page.screenshot({
          path:
            process.env.BSD_SCREENSHOT ?? "docs/screenshots/m591-bsd-vi.png",
        });
      }
      await type("1Gx", false);
      await type(":wq");
      await expect.poll(() => screen.innerText()).toMatch(/#\s*$/);
      await type(`cat ${file}`);
      await expect(screen).toContainText(`591 ${personality} ${name}`);
      if (process.env.M592_EXPANDED === "1") {
        const { expandBSD } = await import("../m592/bsd-expanded.mjs");
        await expandBSD({
          context,
          page,
          base,
          personality,
          file,
          type,
          screen,
        });
      }
      await page.locator("[data-release]").click();
      await expect(page.locator("[data-acquire]")).toBeEnabled();
      await page.locator("[data-disconnect]").click();
      await page.locator("[data-connect]").click();
      await expect(page.locator(".guest-heading")).toContainText("READ-ONLY");
      results.push({
        personality,
        browser: name,
        guest: "2.11BSD",
        application: "/usr/ucb/vi",
        term: personality,
        insertWriteRedrawDeleteQuit: true,
        reconnectReadOnly: true,
        passed: true,
        expandedObserverPager: process.env.M592_EXPANDED === "1",
      });
      writeFileSync(
        root +
          `/vi-results${process.env.M591_PERSONALITIES ? "-" + process.env.M591_PERSONALITIES : ""}.json`,
        JSON.stringify(results, null, 2),
      );
      console.log(`${personality}/${name}: genuine vi passed`);
    } finally {
      writeFileSync(
        `${root}/vi-${personality}-${name}-frames.json`,
        JSON.stringify(frames),
      );
      await browser.close();
    }
  }
