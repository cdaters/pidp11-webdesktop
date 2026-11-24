# Third-party notices

- Go standard library: BSD-style license. Toolchain source and license: https://go.dev/LICENSE . No Go runtime installation is required on the target.
- `github.com/coder/websocket v1.8.15`: ISC license; the sole external Go runtime module. Upstream notice is retained in `licenses/coder-websocket.txt`. No compression is enabled; no transitive runtime modules appear in this module graph.
- BlinkenBone fixture IDL/generated C: Joerg Hoppe, MIT terms in `scripts/fixtures/original/rpc_blinkenlight_api.x` and `licenses/blinkenbone.txt`. Test/research use only, not linked into the executable.
- TypeScript, Vite and @types/node: development dependencies only; pinned in npm's lockfile. M4.2 adds the two browser runtime packages listed below. Vite-generated runtime boilerplate is included in the built JavaScript under its upstream MIT terms; notice retained in `licenses/vite.txt`.
- Reference photograph by Henk Gooijen and DEC handbook pages: research references only, not distributed as product assets. The SVG is original artwork based on observed arrangement.

M5.2 adopts the [MIT License](LICENSE), copyright 2026 Craig Daters, for original RetroRealm code and appropriate original software documentation. It does not relicense upstream code, historical software, logos, photographs or other separately identified materials. Earlier milestone statements below describe what was distributed at that time.

M3/M4 laboratory images compile original SIMH/REALCONS and BlinkenBone C sources from the pinned public PiDP revision. Their per-file source notices remain in the image; the original code is not linked into the Go desktop. Debian build/runtime packages and the test-only PTY shim are not deployment dependencies. Source/image/package provenance is recorded in `docs/lab/environment.json` and `docs/lab/build-metadata.json`. No laboratory image or source archive has been published.

M4.1 adds project-authored, optional C compatibility hooks on a disposable copy of the same pinned SIMH/REALCONS source. Original per-file notices remain intact. The reviewable patch and module are under `lab/interlock`; neither is linked into the ordinary mock Go executable. No guest software, artwork, new runtime library, patched upstream release or container image was published.

## M4.2 additions

- `@xterm/xterm 6.0.0` and `@xterm/addon-fit 0.11.0`: MIT, pinned browser runtime code, lazy loaded and embedded locally. Notices retained in `licenses/xterm.txt` and `licenses/xterm-addon-fit.txt`. No CDN, shell transport, web-links addon, WebGL addon or external terminal service is used.
- `@playwright/test 1.65.1`: Apache-2.0, development/testing only; browsers are local test tools, never part of the Pi executable.
- DIGITAL logos: user-supplied originals preserved byte-for-byte under `src/assets/original`; hashes and derived versions in `src/assets/logo-provenance.json`. They are historical branding references, not a claim of official DEC affiliation.
- The High Nibble's inspected firmware/GUI package is **not redistributed**. Its software/code/artwork was not copied into the desktop. Research inventory records inspected package hashes, source notices and the release's prohibition on rehosting.
- Optional M4.2 publisher/recovery hooks are project-authored and applied only to disposable copies of pinned upstream C source. Their binaries are laboratory artifacts, not linked into the normal Go desktop.

## M4.3 additions

The user-supplied PDP-11 switch photograph and supplemental IMSAI shading screenshot are preserved unchanged under `docs/references`, with provenance and SHA-256 values. They are retained as small research references for the documented visual comparisons, not embedded product artwork. Supplied references and historical logos are outside the original-code MIT grant; their provenance is recorded beside them. The primary supplied photograph's photographer has not been established. That specific attribution remains open. The shared SVG paddle geometry is project-authored. No additional Go or browser runtime dependency was introduced. Optional RPC-budget and diagnostic C copies retain upstream notices and remain isolated test artifacts, separate from the normal static Go desktop.

## M5.2 publication

Original source, documentation and application captures are published with their existing history. Generated-C fixtures retain the BlinkenBone MIT notice; the original SIMH/REALCONS source is fetched separately by the lab and is not relicensed by this repository. Historical guest disks, downloaded upstream packages and private lab records are not included. The root license does not assert ownership of historical names or marks.

For a specific attribution, clarification or removal request, contact Craig Daters through [RetroRealm.org](https://retrorealm.org/). The owner will review it in good faith.

## M5.25 laboratory experiment

The optional TM11 completion patch applies only to disposable copies of the pinned
original SIMH/REALCONS source. [Exact diff](lab/m525/experimental.patch) and
[retained source notices](lab/m525/NOTICE) identify its scope. No upstream source
was relicensed or installed binary replaced; the ordinary Go desktop does not link
this C code. No new runtime dependency, guest disk or patched binary is published.
