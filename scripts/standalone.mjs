import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { build } from 'vite';
// The regular desktop lazy-loads the terminal. The self-contained checkpoint
// deliberately bundles optional modules so file:// needs no requests.
await build({configFile:false,build:{outDir:'.research/standalone-build',emptyOutDir:true,assetsInlineLimit:1000000,cssCodeSplit:false,rollupOptions:{output:{inlineDynamicImports:true}}}});
const root = new URL('../.research/standalone-build/', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const scriptMatch = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
if (!scriptMatch || !styleMatch) throw new Error('Expected one bundled script and stylesheet.');
const js = (await readFile(new URL(scriptMatch[1].replace(/^\//, ''), root), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = await readFile(new URL(styleMatch[1].replace(/^\//, ''), root), 'utf8');
const nonce = randomBytes(24).toString('base64');
html = html.replaceAll('__STYLE_NONCE__', nonce);
const hash = value => createHash('sha256').update(value).digest('base64');
html = html.replace(scriptMatch[0], () => `<script type="module">${js}</script>`)
  .replace(styleMatch[0], () => `<style>${css}</style>`)
  .replace(/content="default-src[^\"]+"/, `content="default-src 'none'; script-src 'sha256-${hash(js)}'; style-src 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-bW1Ujdf9K6BIHmNaTmlDwwEQxTma5apzZ90Y45GaMmU=' 'sha256-${hash(css)}' 'nonce-${nonce}'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"`);
await writeFile(new URL('../dist/prototype.html', import.meta.url), html);
console.log(`Self-contained prototype: dist/prototype.html (${Buffer.byteLength(html)} bytes; network connections disabled by CSP)`);
