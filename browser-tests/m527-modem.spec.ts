import { test, expect } from "@playwright/test";
const original = "abcdef123456abcdef123456abcdef12-1";
const sample = () => ({version:1,generation:original,mode:"data",result:"CONNECT",reason:"",guest_connected:true,peer_connected:true,echo:false,guest_received:46,guest_written:44,peer_received:44,peer_written:46,sample_unix_ms:Date.now(),activity_unix_ms:Date.now(),profile:{guest:"UNIX V7",controller:"DC11",line:3,unit:0,guest_device:"/dev/tty03",simulator:"fixture-epoch",application:"cu",peer:"LOCAL fixture",framing:"ascii7-raw-socket"}});
test("modem observer retires on replacement and never dials", async ({page})=>{
 let generation=original,requests=0;
 await page.route("**/api/v1/modem",route=>{expect(route.request().method()).toBe("GET");requests++;return route.fulfill({json:{...sample(),generation}});});
 await page.goto("/");await page.getByRole("button",{name:"Open Local modem",exact:true}).click();
 expect(requests).toBe(0);
 await page.getByRole("button",{name:"Observe modem",exact:true}).click();
 await expect(page.locator("[data-modem-facts]")).toContainText("result: CONNECT");
 await expect(page.locator("[data-modem-facts]")).toContainText("guest 46/44 bytes");
 generation="fedcba123456abcdef123456abcdef12-1";
 await expect(page.locator("[data-modem-facts]")).toContainText("Attachment changed");
 const stopped=requests;await page.waitForTimeout(900);expect(requests).toBe(stopped);
 await page.getByRole("button",{name:"Observe modem",exact:true}).click();
 await expect(page.locator("[data-modem-facts]")).toContainText(generation);
 await page.getByRole("button",{name:"Disconnect observation",exact:true}).click();
 await expect(page.locator("[data-modem-facts]")).toContainText("independent modem unchanged");
});
test("stale observations never retain a connected claim",async({page})=>{
 await page.route("**/api/v1/modem",route=>route.fulfill({json:{...sample(),sample_unix_ms:Date.now()-5000}}));
 await page.goto("/");await page.getByRole("button",{name:"Open Local modem",exact:true}).click();await page.getByRole("button",{name:"Observe modem",exact:true}).click();
 await expect(page.locator("[data-modem-facts]")).toContainText("stale or unavailable");
 await expect(page.locator("[data-modem-facts]")).not.toContainText("CONNECT");
});
