// Preserve previous milestone screenshots when reusing the genuine device suite.
process.env.M592_SCREENSHOT ??= "docs/screenshots/m511/equipment.png";
await import("../m592/equipment.mjs");
