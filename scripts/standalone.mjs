import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const scriptMatch = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
if (!scriptMatch || !styleMatch) throw new Error('Expected one bundled script and stylesheet.');
const js = (await readFile(new URL(scriptMatch[1].replace(/^\//, ''), root), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = await readFile(new URL(styleMatch[1].replace(/^\//, ''), root), 'utf8');
const hash = value => createHash('sha256').update(value).digest('base64');
html = html.replace(scriptMatch[0], () => `<script type="module">${js}</script>`)
  .replace(styleMatch[0], () => `<style>${css}</style>`)
  .replace(/content="default-src[^\"]+"/, `content="default-src 'none'; script-src 'sha256-${hash(js)}'; style-src 'sha256-${hash(css)}'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"`);
await writeFile(new URL('prototype.html', root), html);
console.log(`Self-contained prototype: dist/prototype.html (${Buffer.byteLength(html)} bytes; network connections disabled by CSP)`);
