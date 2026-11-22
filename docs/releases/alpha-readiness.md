# Source-alpha decision for M5.13

The current candidate is **source only**, for local demonstration and controlled
guest labs. Start with [the source-alpha notes](M5.13-source-alpha.md),
[quick start](../getting-started/source-alpha.md), [review checklist](M5.13-review-checklist.md)
and [M5.13 findings](../lab/M5.13.md). The owner approved the exact source candidate,
published as [M5.13 Source Alpha 1](M5.13-publication.md) on November 22, 2026.
No public downloadable binary is authorized.
Physical deployment and general Pi installation remain NO-GO.

The following retained ARM64 candidate procedure is a separate optional-service
path, not a prerequisite for the local source demonstration.

# Alpha package readiness

**Current presentation: `m5.12-rc.1`, Linux ARM64 laboratory candidate.** This is a source-based preview, not a stable release or a promise of a hosted binary download. For any future Pi pilot, the original PiDP-11 must already work independently. Hardware repair, enforceable memory containment, guest-line identity and representative Pi measurements remain acceptance gates.

## Category decision

| Category | Decision | Supported scope |
| --- | --- | --- |
| A: local demonstration | GO, experimental source alpha | No hardware or guest media required |
| B: controlled laboratories | GO, bounded subsets | Verified disposable V7/BSD/RSX; RT-11 application-terminal experiment; explicit guest approval |
| C: optional Pi companion | NO-GO | Target containment, production observer deployment and real-machine qualification incomplete |
| D: physical acceptance | NO | No authorized repaired-hardware test |

These are separate decisions. An A/B recommendation does not authorize Pi
installation, autostart, production networking or a GitHub binary release.

## What is included

One static Go executable with browser assets, a stopped/disabled systemd service candidate, installation/configuration/preflight/removal helpers, notices, compatibility metadata and checksums. No guest images, manuals, model weights, private configuration or development containers are included. M5.12 adds optional supervised process/socket attachments, a delayed-publication revocation fence and source-reference corrections. Its separately controlled genuine-guest tests do not qualify a physical installation.

- [Release notes](M5.12-alpha-notes.md)
- [Package identity](M5.12-package.md) · [Package qualification](../../lab/m512/results/package.json) · [Preserved M5.10 artifact](M5.10-package.md)
- [Current compatibility](../capabilities.md) and [limitations](../known-limitations.md)
- [Installation paths](../getting-started/installation-paths.md), [service/security setup and removal](../getting-started/optional-service.md)
- [Troubleshooting](../getting-started/questions.md)

## Prepare a versioned archive

In a **Mac development shell**, use a reviewed clean committed checkout and the [documented Go/Node tools](../technical/development.md). This builds only; it does not install, publish a GitHub release or contact a Pi.

```sh
GOFLAGS=-buildvcs=false sh packaging/release.sh m5.12-rc.1 /absolute/path/to/new-preview-output
```

Use a fresh output directory; the helper refuses an existing one or a dirty source tree. The explicit build flag makes the runtime comparison independent of documentation-only Git metadata. `COMPATIBILITY.json` still records the exact source commit. The archive and external `SHA256SUMS` sit beside the extracted package directory. The package’s own `PACKAGE_SHA256SUMS` covers its executable and support files.

Verify the external checksum before extraction, then all inner checksums. On Linux use `sha256sum -c`; on the Mac use `shasum -a 256 -c`. Checksums detect changes but are not signatures; obtain the archive and expected checksum from a trusted source. A locally rebuilt archive can have different gzip/tar metadata; compare the recorded runtime and package contents as well.

## Acceptance and security

Protected service tests passed in disposable ARM64 Linux through M5.12 alongside an independently running genuine V7 guest. The unit requires effective cgroup v2 `MemoryMax=96M`, `MemorySwapMax=0` and the runtime startup guard. `GOMEMLIMIT=72MiB` is only a soft target. Missing protection means **leave the service stopped**, not remove the guard.

HTTPS, certificate validation, separate private role tokens, exact origins and dedicated guest-only loopback endpoints remain mandatory for an authorized service pilot. The package does not approve a guest, change boot maps, configure guest drivers, enable autostart or start an emulator. A new process starts detached. Stop the actual bridge before any intentional guest change; never infer identity from a reused port.

Model chat and device followers are optional separately configured functions. Chat has no general host/guest/panel authority. Deployment, network exposure, boot changes and physical repair remain separately reviewed work. No M5.12 stable release or physical installation is authorized by this package preparation.

Older binaries refuse the new `supervised_endpoints` configuration key. A rollback
must restore the prior reviewed private configuration while stopped, as rehearsed
in M5.12. Never silently weaken requested supervision to get an older binary to
start. The Linux observer and sharing guard remain lab-only and are not installed
by the package. See the [identity contract](../technical/supervised-guest-identity.md).
