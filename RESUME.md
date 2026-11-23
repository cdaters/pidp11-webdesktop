# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **Active assignment:** M5.22 practical equipment operation/history/recovery.
  Work in `.research/m522/`. Before experiments, independently verified incremental
  M5.21 backup M5.22-incremental-20261123T183000Z; 158 files / 5 directories,
  348802328 logical bytes, archive 349435904 bytes. SHA-256
  `ab23bf0c41cefe215c9cbaa76020f9b3335090120b4917cb30161b2fc664bfa2`.
  Private recovery pointer: project-level `Backups/WebDesktop-M5.22-incremental-20261123T183000Z/backup.json`.
  Previous backups unchanged; no source deleted. This precedes new M5.22 evidence.


- **Latest completed engineering milestone:** M5.21 supervised equipment sessions,
  completed work, not owner acceptance or production approval. See [report](docs/lab/M5.21.md),
  [session design](docs/technical/equipment-sessions.md), [runbook](lab/m521-equipment/README.md)
  and [curated results](lab/m521-equipment/results/). Publication remains Source Alpha 2.
- **Checkpoint sequence:** starting M5.20 `153a9d1`; `9cfe97e` records the verified
  incremental backup; `e88959b` adds M5.21 implementation, tests and lab helpers.
  The final documentation commit follows on main; use `git log` for its revision. No new milestone tag or release.
- **Implemented:** optional isolated-Linux Go supervisor, exact owner/job/generation
  approvals, ordered operator-attested completion, stale-owner rejection, independent
  expiry, immutable completed exports and read-only reader catalog. No browser mounts,
  monitor commands or emulator lifecycle authority. Four slots bound volatile history.
- **Genuine RSX:** two printer jobs, 172 bytes each; two 48,817-byte reader inputs /
  49,141-byte punch outputs with distinct identities. Twelve exact completed downloads
  across three engines. Firefox recorded growing host/browser output from a fresh
  preapproved empty spool before guest return, using disclosed original PTP TIME delay.
- **Failure evidence:** actual supervisor-only kill; WebKit expired in 4,862 ms,
  retained 45,056 incomplete bytes, refused old live generation and preserved the
  prior completed export. Original console remained usable. New supervisor could
  not complete an unowned session. No retrospective completion of expired job.
- **RT-11:** genuine console-only LP/PC ASCII operations, 152-byte printer and
  113-byte reader / 512-byte punch. Initial handler-memory failure resolved only in
  disposable guest by removing verified unused CT/DM handlers. No new browser login
  or RT-11 live observation qualification.
- **Validation:** Go vet and uncached race in 23 tested packages; 105 frontend units,
  one transport, nine selection-contract tests; TypeScript/build; 174 full-suite
  browser passes with zero skips/flakes/failures; helper syntax and exact artifact
  verification. Final replacement-retention/cached-label fixes were fixture-tested
  after the genuine runtime. Existing large-bundle warning remains.
- **Resource sample:** ARM64 lab observer RSS 13,008 KiB / high-water 14,388 KiB;
  separate idle supervisor 6,800 KiB. Both zero measured ticks over about five seconds.
  Not active peak/latency or Pi measurements. 96 MiB companion/zero-swap gate remains.
- **Cleanup:** RSX bridge stopped first, original console answered, SHUTUP completed
  final dismount/HALT before quit. RT-11 exited at its idle monitor after device/file
  operations. Both owned containers exited zero and were removed. Relays, Vite/mock
  stopped; loopback ports 5173/8080/8449 had no listeners. Seven unrelated containers
  remained. Working disks, captures and failed-attempt evidence retained. No Pi access.
- **Preservation:** original RSX/RT-11 SHA-256, size, mode and nanosecond mtime unchanged;
  22 remote tag refs and Alpha 1/2 asset metadata match baseline. No release/binary/media upload.
- **Incremental backup:** all new M5.20 evidence (`.research/m520`) independently
  verified before M5.21 experiments: 130 files / 8 directories, 681,998,188 logical
  bytes, archive 682,530,304 bytes, SHA-256
  `d941b0872c81c5cb03fc45ec04bd18a37257fa09bcf5da2604d14f13f91cdfa0`.
  Version `M5.21-incremental-20261123T173629Z` on the owner-selected private NAS.
  Supported metadata passed readback, exact creation times recorded; no full restore.
  Project-level private recovery pointer:
  `Backups/WebDesktop-M5.21-incremental-20261123T173629Z/backup.json`.
  This supplement predates M5.21 evidence; it is not a backup of that new work.
- **Previous full backup preserved:** `M5.20-20261123T055815Z`, 38,778 files / 5,345
  directories including root / 60 symlinks; 40,753,880,985 logical bytes; archive SHA-256
  `7d5e5a32e5b8ac132f9dd775528b01a5d498616c5f9c80e8eff5b6102859e21c`.
  Exact destination is in project-level `Backups/WebDesktop-M5.20-verified-20261123T064653Z/backup.json`.
  No source deleted or cloud destination used.
- **Private evidence:** `.research/m521-equipment/`; the older `.research/m521/` is
  unrelated historical material and was preserved. The first completed RSX punch is
  `rsx/punch1-completed.bin`; `rsx/punch1.bin` is the later interruption-test output.
  Never replay scripts over either. Raw credentials/console captures stay private.
- **Corrected attempts:** first live overlap timing insufficient, stronger second
  run recorded host growth; RT-11 handler-memory error; immediate pause assertion;
  mock compile during asset regeneration; wrong readiness URL; literal backslash-r
  at shutdown cleared before submission. Details are in the report, not hidden.
- **Recommended next increment:** M5.22 independent operator workflow and bounded
  session history, actual export reuse/service restart, active resource/latency
  measurements and separate RT-11 browser observation. Browser mounting remains
  disabled until independent safe-state/attachment checks qualify it. No hardware
  or release authorization is implied by that recommendation.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.21 report](docs/lab/M5.21.md) and [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.21.

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

- Two original ARM64 provisioning exit-139 incidents and the initial V7 plotting
  timeout remain unexplained. Use retained bounded diagnostics on recurrence;
  successful repetitions are not a fix.
- Guest OS identity is operator-attested; a surviving process/socket is insufficient.
- Independent security/historical review and Hacker Replicant protocol agreement
  remain pending. Citation IDs do not certify AI explanations.
- RT-11 is verified application I/O, not an independent browser shell or complete
  MTTEST pass. RSTS/E remains console-only. Terminal conformance is partial.
- LP11/PC11 now have narrow RSX PIP and RT-11 console ASCII qualification plus
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
