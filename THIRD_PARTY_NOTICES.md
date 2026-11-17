# Third-party inventory

- Go standard library: BSD-style license. Toolchain source and license: https://go.dev/LICENSE . No Go runtime installation is required on the target.
- `github.com/coder/websocket v1.8.15`: ISC license; the sole external Go runtime module. Upstream notice is retained in `licenses/coder-websocket.txt`. No compression is enabled; no transitive runtime modules appear in this module graph.
- BlinkenBone fixture IDL/generated C: Joerg Hoppe, MIT terms in `scripts/fixtures/original/rpc_blinkenlight_api.x` and `licenses/blinkenbone.txt`. Test/research use only, not linked into the executable.
- TypeScript, Vite and @types/node: development dependencies only; pinned in npm's lockfile. No npm runtime packages are shipped with the browser app. Vite-generated runtime boilerplate is included in the built JavaScript under its upstream MIT terms; notice retained in `licenses/vite.txt`.
- Reference photograph by Henk Gooijen and DEC handbook pages: research references only, not distributed as product assets. The SVG is original artwork based on observed arrangement.

The accepted M0 original-code license decision is unchanged: the owner has not yet selected a project distribution license. Nothing is published by this milestone. Dependency notices do not grant rights to unrelated guest OS images or upstream artwork.
