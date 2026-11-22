// Preserve previous milestone screenshots when reusing the genuine V7 suite.
process.env.M59_GRAPHICS_SCREENSHOT ??= "docs/screenshots/m511/v7-tek.png";
await import("../m59/graphics-browser.mjs");
