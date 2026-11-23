# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **Latest completed engineering milestone:** M5.23 genuine disk/tape discovery and
  captured read-only status. This is completed engineering, not owner acceptance or
  physical/production approval. Read the [report](docs/lab/M5.23.md),
  [inventory](docs/technical/storage-inventory.md), [contract](docs/technical/storage-observation.md)
  and [runbook](lab/m523/README.md). Source Alpha 2 remains the latest release.
- **Checkpoint sequence:** starting M5.22 `73dadb2`; `0a16f9f` records the verified
  incremental M5.22 evidence backup; `fca1061` adds implementation, tests and lab
  helpers. Final documentation follows separately on main; inspect Git for its exact
  revision. No new tag, release, binary or guest-media publication.
- **Implemented:** narrow local `storage-snapshot` collector, read-only whole-image
  identity/hash verification, private instance/revision approvals, captured generations,
  30-second freshness, explicit revocation and empty restart. Existing disk/tape
  windows add observation and retained-snapshot modes beside simulation. Only
  RL0/RL11/RL02 and TM0/TM11/TU10 unit zero are qualified. No monitor/mount/guest control.
- **Disk evidence:** fresh RT-11SJ (S) V05.03 boot from DL0/RL02; resident DL driver,
  actual directory listings, captured original RL11/attachment/registers, 10,478,080
  image bytes versus 10,485,760 logical capacity. Original and working image hash
  `543277ee81fb4c024d19242bf6d6a04c81a257c48fe4cece256a42de3fe8dd98`.
- **Tape evidence:** original TM11/TU10 read a 42-byte authored record by CPU DMA,
  then two filemarks and end-of-image; readonly SIMH tape 58 bytes, logical positions
  0/50/54/58/58. Original status preserved, including expected EOF/error summary.
  No guest tape-driver claim: RT-11 MT/MS/MM files exist but were not installed or used.
- **Observation boundary:** named register EXAMINE can notify REALCONS. The collector
  never contacts SIMH; independent fixed lab captures used halted/idle boundaries,
  REALCONS disconnected. FrontPanel API 12 sampling remains a separate unqualified
  interface. Current state is always unknown; a recent capture is not live telemetry.
- **Lifecycle/browser evidence:** six genuine disk/tape views across three engines,
  every captured field matched. Captures were correctly labeled stale. Explicit
  revoke, actual observer stop/restart, empty inventory and both old URLs returning
  404 passed. No automatic fetch on window open or restored terminal/device approval.
  Original RT-11 console remained usable after capture and after bridge stops.
- **Validation:** Go vet/uncached race in 24 packages; 105 frontend units, one transport,
  nine selection checks; TypeScript/build; one full 225-pass browser run with zero
  skips/failures/flakes. Additional affected-package race covered blocked-writer
  revocation. Fresh independent `fca1061` checkout passed offline dependency install,
  embedded asset build and Go command builds without private inputs. Bundle warning
  remains; standalone prototype 595,464 bytes.
- **Measurements:** 100 local TLS snapshot reads / 5.54 seconds, max service RSS/HWM
  12,664 KiB, nine descriptors/eight threads, 11 CPU ticks (~2.01% one core), 2,430-byte
  max response. Metadata/TLS lab measurements, not block I/O or physical Pi benchmarks.
  Existing future 96 MiB enforced companion/zero-swap gate unchanged.
- **Corrected attempts:** initial imports refused tabs in normalized register text;
  fixed the lab formatter, preserved rejected configs and took new captures. First
  browser attempt lacked published records; second had an incorrect close-button
  locator. No guest/CPU operation failed or uncertain guest command was replayed.
- **Cleanup:** actual observer stopped first; original console answered. RT-11 exited
  at its idle monitor; diskless tape CPU was halted before quit. Both owned containers
  exited zero and were removed. Owned preview/mock/relay stopped, seven unrelated
  running containers and previous stopped resources preserved. No physical Pi access.
- **Preservation:** original RT-11 hash/size/mode/nanosecond mtime and readonly authored
  tape hash unchanged. Accepted tags and Alpha 1/2 metadata preserved. Working disks,
  raw captures, rejected attempts and browser evidence remain in `.research/m523/`.
  Do not rerun scripts over that directory or change its retained evidence.
- **Verified M5.22 incremental backup:** `M5.23-incremental-20261123T213751Z` on the
  owner-selected NAS; 217 files / nine directories, 417,600,495 logical bytes;
  archive 418,473,984 bytes, SHA-256
  `d2bacb19f2646117c1440e667c4964e3e8e47cf2cca675129b0435e2a08b37ba`.
  Contents/supported metadata independently reread; creation times recorded, no full
  restore. Private project-level pointer:
  `Backups/WebDesktop-M5.23-incremental-20261123T213751Z/backup.json`.
  This predates new M5.23 evidence; a future milestone needs its own incremental backup.
- **Prior backups preserved:** M5.22 incremental of M5.21 evidence
  `M5.22-incremental-20261123T183000Z`, M5.21 incremental of M5.20 evidence
  `M5.21-incremental-20261123T173629Z`, and full `M5.20-20261123T055815Z`.
  Exact manifests/hashes/pointers remain in project-level `Backups/` and prior reports.
  No prior backup or source was deleted; no cloud destination was used.
- **Recommended M5.24:** qualify a documented historical guest magnetic-tape workflow
  with the inventoried legitimate handlers; broaden read-only disk provenance with
  exact attachment/guest evidence. Continuous telemetry needs separate qualification.
  Media control stays independent. No hardware, new release or broad LP11/PC11 work
  is authorized by this recommendation.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.23 report](docs/lab/M5.23.md), [M5.22 report](docs/lab/M5.22.md), [M5.21 report](docs/lab/M5.21.md) and [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
   and [M5.17 engineering report](docs/lab/M5.17.md). Follow relevant subsystem/lab
   runbooks instead of reconstructing commands from memory.
5. Identify any owned running lab/preview before starting another. One outstanding
   request per guest harness; never retry uncertain guest input automatically.
6. Reconcile the owner's newest request with this handoff. Continue only authorized
   work; record measurements separately from assumptions and fixture behavior.

## Immutable public releases

| Release | Exact source revision | Archive SHA-256 |
|---|---|---|
| `v0.5.17-source-alpha.2` | `38bcfad84dc0b100005542f3aee6752ee147c649` | `7328d7dad3c1790323b67ed29ba2f4e58b64a73c6a188c6b6624979ffbc7c64e` |
| `v0.5.13-source-alpha.1` | `ef643e59e5040adcbf7f7b1286fe3472ff08a00f` | `24fb624d4242972410c9f44616c74af6d89383bc7fb7b931b0a2e78cd9788f08` |

Alpha 2 is public, source-only and experimental: 14,789,290 bytes / 1,026 members.
Only its archive and SHA256SUMS were attached. Both releases and all accepted tags
must remain unchanged. Do not republish them or tag current main as their source.
No new release or binary publication is authorized for M5.23.

## Product and operating boundaries

The destination is a useful virtual PDP-11 computer room for **both physical
PiDP-11 owners and ordinary SIMH users without a panel**. Everyday genuine terminals
come first, then guest connections, printer/paper tape, storage, communications and
graphics. Simulation is useful for development but is not finished genuine equipment.

No Pi SSH, power/probing, GPIO, original installation/media modification, physical
observation/control or production deployment is authorized. Physical hardware is
pending repair; do not infer readiness from elapsed time. Original operator console,
SSH, Screen, panels and supported guest access remain independent of Web Desktop.
No website edits, upstream changes, maintainer contact, announcements or AI machine
authority. New implementations must preserve explicit connection approval,
keyboard leases, generation retirement and resource bounds. Saved preferences must
not reconnect guests, restore authority, mount media or start emulators.

## Open limits to preserve

- Disk/tape browser output is captured metadata, not live I/O. Guest OS and safe
  attachment remain operator-attested; unreported transitions can obsolete a capture
  immediately. Snapshot recovery never grants authority. TM11 is CPU/device-qualified,
  not a guest tape utility or physical transport. No automatic media management.

- Two original ARM64 provisioning exit-139 incidents and the initial V7 plotting
  timeout remain unexplained. Use retained bounded diagnostics on recurrence;
  successful repetitions are not a fix.
- Guest OS identity is operator-attested; a surviving process/socket is insufficient.
- Independent security/historical review and Hacker Replicant protocol agreement
  remain pending. Citation IDs do not certify AI explanations.
- RT-11 is verified application I/O, not an independent browser shell or complete
  MTTEST pass. RSTS/E remains console-only. Terminal conformance is partial.
- LP11/PC11 now have narrow RSX PIP and RT-11 console-operated ASCII/browser qualification plus
  separate CPU/device evidence. RSX live punch/sequential supervision is lab tested;
  automatic safe-state detection, browser mounting and production supervision remain
  unqualified. Ordinary panel/media controls remain simulations. Identity and
  completion require the independent operator; RAM artifact retention is bounded.
- Pi memory-controller readiness, switch repair, observer privileges, representative
  performance and renewed supervised coexistence are separate physical gates.

## Evidence and local-only files

Published reports and sanitized `lab/*/results/` survive a fresh Git clone.
Ignored `.research/` contains private logs, working guest media, credentials,
archives, runtime builds and diagnostic disks; GitHub does **not** back these up.
Never commit that directory or substitute its working media for immutable bases.

Local M5.17 artifacts/evidence are under `.research/m517/`; the approved archive
is in `candidate-a/`. M5.18 public-download verification is under `.research/m518/`.
M5.19 evidence is retained in `.research/m519/`; do not reuse its media or filenames for another run. Missing local assets must
be reconstructed from documented authorized sources or requested, not invented.
A new clone can run the basic no-Pi demo without any of these private files.

M5.20 evidence is in ignored `.research/m520/`; do not overwrite its working media,
output files or failed-attempt records. Its private backup does not include evidence
generated after backup completion.

M5.20 ended with its owned guests, bridges, relays and previews stopped. This is a historical observation, not proof of current process state.
Preserve unrelated services/containers and accepted screenshot baselines.

## Maintaining this handoff

Update at milestone completion and before handing off unfinished work: completed
checkpoint, active scope, owned resources, exact pending step, failures/evidence,
validation actually performed and remaining restrictions. Link details rather than
copying entire reports. Record no secrets or raw private console content here.
