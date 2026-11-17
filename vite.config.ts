import { defineConfig } from "vite";
import { randomBytes } from "node:crypto";
// Development only. Production HTML receives a fresh nonce per Go response.
export default defineConfig(({ command }) => {
  const nonce =
    command === "serve"
      ? randomBytes(24).toString("base64")
      : "__STYLE_NONCE__";
  return {
    server: {
      watch: {
        ignored: [
          "**/.research/**",
          "**/docs/screenshots/**",
          "**/dist/**",
          "**/internal/web/static/**",
        ],
      },
    },
    html: { cspNonce: nonce },
    plugins: [
      {
        name: "terminal-style-nonce",
        transformIndexHtml: {
          order: "pre",
          handler: (html) => html.replaceAll("__STYLE_NONCE__", nonce),
        },
      },
    ],
  };
});
