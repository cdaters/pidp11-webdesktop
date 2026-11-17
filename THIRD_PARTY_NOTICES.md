# Third-party inventory

- Go standard library: BSD-style license. Toolchain source and license: https://go.dev/LICENSE . No Go runtime installation is required on the target.
- `github.com/coder/websocket v1.8.15`: ISC license; the sole external Go runtime module. Upstream notice is retained in `licenses/coder-websocket.txt`. No compression is enabled; no transitive runtime modules appear in this module graph.
- BlinkenBone fixture IDL/generated C: Joerg Hoppe, MIT terms in `scripts/fixtures/original/rpc_blinkenlight_api.x` and `licenses/blinkenbone.txt`. Test/research use only, not linked into the executable.
- TypeScript, Vite and @types/node: development dependencies only; pinned in npm's lockfile. M4.2 adds the two browser runtime packages listed below. Vite-generated runtime boilerplate is included in the built JavaScript under its upstream MIT terms; notice retained in `licenses/vite.txt`.
- Reference photograph by Henk Gooijen and DEC handbook pages: research references only, not distributed as product assets. The SVG is original artwork based on observed arrangement.

The accepted M0 original-code license decision is unchanged: the owner has not yet selected a project distribution license. Nothing is published by this milestone. Dependency notices do not grant rights to unrelated guest OS images or upstream artwork.

M3/M4 laboratory images compile original SIMH/REALCONS and BlinkenBone C sources from the pinned public PiDP revision. Their per-file source notices remain in the image; the original code is not linked into the Go desktop. Debian build/runtime packages and the test-only PTY shim are not deployment dependencies. Source/image/package provenance is recorded in `docs/lab/environment.json` and `docs/lab/build-metadata.json`. No laboratory image or source archive has been published.

M4.1 adds project-authored, optional C compatibility hooks on a disposable copy of the same pinned SIMH/REALCONS source. Original per-file notices remain intact. The reviewable patch and module are under `lab/interlock`; neither is linked into the ordinary mock Go executable. Source distribution licensing remains an explicit owner decision before publication. No guest software, artwork, new runtime library, patched upstream release or container image was published.

## M4.2 additions

- `@xterm/xterm 6.0.0` and `@xterm/addon-fit 0.11.0`: MIT, pinned browser runtime code, lazy loaded and embedded locally. Notices retained in `licenses/xterm.txt` and `licenses/xterm-addon-fit.txt`. No CDN, shell transport, web-links addon, WebGL addon or external terminal service is used.
- `@playwright/test 1.65.1`: Apache-2.0, development/testing only; browsers are local test tools, never part of the Pi executable.
- DIGITAL logos: user-supplied originals preserved byte-for-byte under `src/assets/original`; hashes and derived versions in `src/assets/logo-provenance.json`. They are historical branding references, not a claim of official DEC affiliation. Trademark/redistribution review remains required before public release; no ownership or license grant is inferred.
- The High Nibble's inspected firmware/GUI package is **not redistributed**. Its software/code/artwork was not copied into the desktop. Research inventory records inspected package hashes, source notices and the release's prohibition on rehosting.
- Optional M4.2 publisher/recovery hooks are project-authored and applied only to disposable copies of pinned upstream C source. Their binaries are laboratory artifacts, not linked into the normal Go desktop.

## M4.3 additions

The user-supplied PDP-11 switch photograph and supplemental IMSAI shading screenshot are preserved unchanged under `docs/references`, with provenance and SHA-256 values. They are local research evidence, not embedded product artwork; redistribution rights remain unestablished. The shared SVG paddle geometry is project-authored. No additional Go or browser runtime dependency was introduced. Optional RPC-budget and diagnostic C copies retain upstream notices and remain isolated test artifacts, separate from the normal static Go desktop.
