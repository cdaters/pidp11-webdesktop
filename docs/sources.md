# Research sources

Inspected on 2026-11-16 using public web pages and source downloads on the Mac. No upstream program or installation script was executed. The ignored `.research/` cache contains downloaded source, not dependencies of the prototype. [source-manifest.json](source-manifest.json) records exact revisions, paths, links and SHA-256 digests for all inspected/downloaded files.

| Project | Pinned revision | Scope inspected |
|---|---|---|
| [Oscar Vermeulen / PiDP-11](https://github.com/obsolescence/pidp11) | `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75` | C API/IDL/generated XDR, physical GPIO server, REALCONS controller, launcher/control scripts |
| [Joerg Hoppe / BlinkenBone](https://github.com/j-hoppe/BlinkenBone) | `1ce5c0657690ebd8e5f343f36fd4473a60d4402b` | C API, Java RPC server/generated stubs, Java PDP-11/70 panel model, RemoteTea byte encoding and license |

Additional primary references:

- [Retrocmp simulated panels](https://retrocmp.com/projects/blinkenbone/simulated-panels): Java panels controlled by SIMH with REALCONS. The supplied www URL failed in the web reader; the canonical non-www page was readable.
- [The High Nibble IMSAI desktop](https://thehighnibble.com/imsai8080/#features): functional inspiration for panel/terminal/media separation; no assets copied.
- [RFC 4506](https://www.rfc-editor.org/rfc/rfc4506) and [RFC 5531](https://www.rfc-editor.org/rfc/rfc5531): XDR and ONC RPC.
- [Go GC guide](https://go.dev/doc/gc-guide), [HTTP](https://pkg.go.dev/net/http), [RPC](https://pkg.go.dev/net/rpc), [build targets](https://go.dev/doc/install/source#environment).
- [Rust ownership](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html), [ARM64 Linux target](https://doc.rust-lang.org/rustc/platform-support/aarch64-unknown-linux-gnu.html), [license](https://github.com/rust-lang/rust#license).
- [xterm.js](https://xtermjs.org/): proposed later terminal renderer.

The sibling `../docs/` directory contains DEC and PiDP manuals; these were not modified. The prototype is based on the named upstream control model, not a claim of pixel-perfect reproduction from those PDFs. No installed-target measurements or packet captures were taken.
