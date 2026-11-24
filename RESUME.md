# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **M5.25 active:** bounded TM11 completion-event feasibility in disposable source/build copies.
  M5.24 evidence backup verified: `M5.25-incremental-20261124T064928Z`, 2,703 files / 339 directories / six symlinks,
  373,080,685 logical bytes; archive 384,715,264 bytes, SHA-256
  `c8d438a4c5714bd9ac0652fa903925e74aa3081920cd20a6cde56fb699de7973`. All file bytes and supported metadata independently reread; no full restore.
  Private recovery pointer: `Backups/WebDesktop-M5.25-incremental-20261124T064928Z/backup.json`.
  New work belongs in `.research/m525/`; original source/media, ordinary builds, physical Pi
  and interoperability remain untouched. No running M5.24 processes found at start.

- **M5.24 completed:** genuine RT-11 MT/PIP tape reads and V7 RH70/RP06 captured status.
  Backup prerequisite completed: `M5.24-incremental-20261124T041941Z`, 123 files / seven directories,
  42,097,705 logical bytes; archive 42,601,472 bytes, SHA-256
  `a39b56eca99d76de8c66f11577c6bcb006010c6fb9fb245bf6c744616ebff73d`. Independently reread bytes and supported
  metadata; no full restore. Private project-level recovery pointer: `Backups/WebDesktop-M5.24-incremental-20261124T041941Z/backup.json`.
  Fresh evidence is retained under `.research/m524/`; preserve it and earlier experiments.
  No Pi access or interoperability changes authorized.

- **Latest documentation/design checkpoint: M5.23.1.** The owner supplied Rolf
  Peters' agreement on five architectural directions: optional provider, mandatory
  selected-text receipts, Desktop-owned publication/consent, one slot and local
  reset with retention limits. Read the [decision/change inventory](docs/technical/M5.23.1-interoperability-review.md),
  [0.2 proposal](docs/technical/selection-contract-0.2-proposal.md),
  [short handoff](docs/technical/M5.23.1-hacker-replicant-handoff.md) and
  [planned conformance](docs/technical/selection-contract-0.2-conformance.md).
  This is documentation only; 0.1 runtime, credentials and tests are unchanged.
  Manual receipt transfer, exact wire schema and exclusive migration profile are
  recommendations, not separately agreed or implemented. No upstream code approval,
  new genuine integration result or maintainer contact. Further implementation,
  migration and sending the packet require separate authorization. M5.23 below
  remains the completed engineering milestone and storage work is undisturbed.
  Documentation links, JSON examples, pinned code links and publication scope were
  checked; no runtime tests or genuine experiments were rerun for this prose-only work.

- **Latest completed engineering milestone: M5.24.** Read the [report](docs/lab/M5.24.md),
  [historical tape workflow](docs/technical/rt11-magnetic-tape.md),
  [capture contract](docs/technical/storage-observation.md),
  [future activity proposal](docs/technical/storage-activity-proposal.md) and
  [runbook/results](lab/m524/README.md). This is engineering completion, not owner
  acceptance, a release or physical/production authorization.
- **Checkpoints:** starting `29b5e1e` (M5.23.1), `2f85a38` (private evidence backup),
  `73341f9a4a8a9f7b9d1e21360e635c5a95d87fa6` (implementation, tests and genuine lab
  results), followed by M5.24 documentation. Development-main publication only.
  Accepted engineering `845f885` and all earlier tags/releases remain unchanged.
- **Tape:** original RT-11SJ (S) V05.03, supplied MT.SYS/PIP.SAV, readonly authored
  512-byte-label TM11/TU10 image. DIR and COPY/IMAGE recovered 512 + 1,024 exact bytes;
  independent filesystem extraction matched both hashes. Expected filemark/error
  summary and logical end at byte 4,188 were recorded; no physical EOT or tape write.
  INSTALL initially lacked a handler slot; removing unused CT allowed installation.
  Raw failures and the deliberate missing-file search remain private.
- **Disk:** original V7 console `ls /` and `sync` through RH70/RP06, unit zero,
  174,423,040 bytes and source-defined geometry. A narrow RP06 adapter joins RL02
  and TM11; bounds were not raised for the larger RSX RQ image. Current activity is
  unavailable; guest identity and safe capture remain operator-attested.
- **Browser/lifecycle:** provenance, geometry and capture age visible. Six genuine
  device views across three engines matched every captured field. Two real observer
  revoke/stop/restarts returned empty inventories and 404 old URLs; no automatic
  restoration. Independent consoles worked after observers stopped.
- **Validation:** vet, uncached race (24 packages), TypeScript, 106 frontend tests,
  one transport/nine selection checks, build, full 231-pass browser suite (no skips,
  failures or flakes). Clean detached `73341f9` build used no private inputs. Existing
  standalone size/deprecation warnings remain; prototype 596,156 bytes.
- **Resources:** two 100-request ARM64 TLS metadata samples, ~5.46 seconds each;
  maximum observer RSS 15,708 KiB, ten descriptors/eight threads, 1.11% one core at
  100-Hz counter resolution. Six browser click-to-DOM samples 40.98–65.71 ms. These
  are small lab measurements, not physical Pi or long-duration acceptance.
- **Cleanup/preservation:** both actual observers stopped; RT-11 idle quit and V7
  three-sync/independent halt/quit exited zero. Owned containers removed; previews,
  mock and relay stopped; all 22 preexisting containers/seven running states retained.
  Original disks retain exact hash/size/mode/mtime and input tape hash is unchanged.
  M5.23.1 interoperability documents and 0.1 implementation were not changed.
- **Next recommendation:** bounded optional storage-completion event feasibility in
  a disposable build versus an unmodified control. It is a proposal, not an existing
  feed or implicit authorization. No physical Pi access, new release, browser media
  control, upstream work or production deployment is authorized.
- **Prior private backups:** M5.23 incremental of M5.22 evidence
  `M5.23-incremental-20261123T213751Z`, M5.22 incremental of M5.21 evidence
  `M5.22-incremental-20261123T183000Z`, M5.21 incremental of M5.20 evidence
  `M5.21-incremental-20261123T173629Z`, and full `M5.20-20261123T055815Z` remain intact.
  Exact manifests/hashes/pointers remain in project-level `Backups/` and prior reports.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.24 report](docs/lab/M5.24.md), then the [M5.23 report](docs/lab/M5.23.md), [M5.22 report](docs/lab/M5.22.md), [M5.21 report](docs/lab/M5.21.md) and [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.24.

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
  immediately. Snapshot recovery never grants authority. TM11 has narrow RT-11 MT/PIP read
  qualification and separate CPU evidence, not a physical transport or general
  tape-writing/backup capability. No automatic media management.

- Two original ARM64 provisioning exit-139 incidents and the initial V7 plotting
  timeout remain unexplained. Use retained bounded diagnostics on recurrence;
  successful repetitions are not a fix.
- Guest OS identity is operator-attested; a surviving process/socket is insufficient.
- Independent security/historical review and Hacker Replicant wire-protocol/code
  acceptance remain pending; M5.23.1 records agreed architectural direction only.
  Citation IDs do not certify AI explanations.
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
