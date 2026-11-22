# Alpha package readiness

**Current presentation: `m5.11-preview.1`, Linux ARM64 laboratory candidate.** This is a source-based preview, not a stable release or a promise of a hosted binary download. The original PiDP-11 must already work independently. Hardware repair, enforceable memory containment, guest-line identity and representative Pi measurements remain acceptance gates.

## What is included

One static Go executable with browser assets, a stopped/disabled systemd service candidate, installation/configuration/preflight/removal helpers, notices, compatibility metadata and checksums. No guest images, manuals, model weights, private configuration or development containers are included. M5.11 adds sharing and peripheral lifetime corrections plus source-reference additions. Its separately controlled genuine-guest tests do not qualify a physical installation.

- [Release notes](M5.11-alpha-notes.md)
- [Package identity](M5.11-package.md) · [Package qualification](../../lab/m511/results/package.json) · [Preserved M5.10 artifact](M5.10-package.md)
- [Current compatibility](../capabilities.md) and [limitations](../known-limitations.md)
- [Installation paths](../getting-started/installation-paths.md), [service/security setup and removal](../getting-started/optional-service.md)
- [Troubleshooting](../getting-started/questions.md)

## Prepare a versioned archive

In a **Mac development shell**, use a reviewed clean committed checkout and the [documented Go/Node tools](../technical/development.md). This builds only; it does not install, publish a GitHub release or contact a Pi.

```sh
GOFLAGS=-buildvcs=false sh packaging/release.sh m5.11-preview.1 /absolute/path/to/new-preview-output
```

Use a fresh output directory; the helper refuses an existing one or a dirty source tree. The explicit build flag makes the runtime comparison independent of documentation-only Git metadata. `COMPATIBILITY.json` still records the exact source commit. The archive and external `SHA256SUMS` sit beside the extracted package directory. The package’s own `PACKAGE_SHA256SUMS` covers its executable and support files.

Verify the external checksum before extraction, then all inner checksums. On Linux use `sha256sum -c`; on the Mac use `shasum -a 256 -c`. Checksums detect changes but are not signatures; obtain the archive and expected checksum from a trusted source. A locally rebuilt archive can have different gzip/tar metadata; compare the recorded runtime and package contents as well.

## Acceptance and security

Protected service tests passed in disposable ARM64 Linux through M5.11 alongside an independently running genuine V7 guest. The unit requires effective cgroup v2 `MemoryMax=96M`, `MemorySwapMax=0` and the runtime startup guard. `GOMEMLIMIT=72MiB` is only a soft target. Missing protection means **leave the service stopped**, not remove the guard.

HTTPS, certificate validation, separate private role tokens, exact origins and dedicated guest-only loopback endpoints remain mandatory for an authorized service pilot. The package does not approve a guest, change boot maps, configure guest drivers, enable autostart or start an emulator. A new process starts detached. Stop the actual bridge before any intentional guest change; never infer identity from a reused port.

Model chat and device followers are optional separately configured functions. Chat has no general host/guest/panel authority. Deployment, network exposure, boot changes and physical repair remain separately reviewed work. No M5.11 stable release or physical installation is authorized by this package preparation.
