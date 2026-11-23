# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **Latest completed engineering milestone:** M5.22 practical equipment operation,
  history and recovery. Completed engineering is not owner acceptance or production
  approval. Read the [report](docs/lab/M5.22.md), [operator guide](docs/technical/equipment-operator.md),
  [history contract](docs/technical/equipment-history.md), [runbook](lab/m522/README.md)
  and [curated results](lab/m522/results/). Publication remains Source Alpha 2.
- **Checkpoint sequence:** starting M5.21 `72e9a98`; `3c9788a` records the verified
  incremental M5.21 evidence backup; `b265d20` adds M5.22 implementation, regression
  tests and lab helpers. Final documentation follows separately on main; inspect
  `git log` for its exact revision. No new tag.
- **Implemented:** guided local equipment commands and exclusive configuration
  preparation; eight immutable terminal-job records, each at most 64 KiB; explicit
  private archive/save and data-only recovery. The browser adds Job history with
  distinct jobs, provenance, complete/incomplete labels and verified downloads.
  No guest lifecycle, browser mounting or automatic reconnect/adoption authority.
- **Genuine RSX:** two 172-byte printer jobs and two 44,341-byte punch outputs from
  44,017-byte inputs reused the same slots and spool paths. Original PIP/LPDRV/PRDRV/
  PPDRV produced the bytes. PTP TIME 10000 enabled visible growth; restored to 100.
  Twelve exact history downloads before restart; fifteen after recovery, across
  Chromium/Firefox/WebKit. Same tape checksum does not merge distinct job identities.
- **Restart/partial evidence:** guided supervisor quit; actual expiry 4,820 ms,
  40,960 incomplete bytes retained. New supervisor could not complete the unowned
  session. Actual observer restart had empty history and detached devices/terminal;
  five explicit recoveries restored only saved data. Expired output was never
  retrospectively completed. Independent original console answered after bridge stop.
- **RT-11:** original LP/PC ASCII subset produced 152 printer bytes and 512 punch
  bytes from 113-byte input. Chromium completed observations and six three-engine
  history downloads matched exactly. Utilities ran through the independent console;
  no new browser login shell or sustained small-job live stream is claimed.
- **Validation:** Go vet and uncached race in 23 tested packages; 105 frontend units,
  one transport, nine selection tests; TypeScript/build; 192 full browser passes,
  then 24 final affected cases, zero skips/flakes. Late leading-FF/navigation/selector
  changes and a reproduced checksum-wait selection race were fixture-tested after
  genuine runs. Failed reproduction retained; no guest replay for these corrections.
  Existing large-bundle warning remains; standalone prototype 587,570 bytes.
- **Active resources:** maximum sampled observer RSS/HWM 14,556 KiB, supervisor
  8,524 KiB. Short deliberately slowed ARM64 windows, not physical Pi measurements.
  Sampled host-growth-to-visible-count lag 57–341 ms; five recovered records held
  129,986 bytes. Future 96 MiB enforced companion/zero-swap gate remains unchanged.
- **Cleanup:** actual bridges stopped first; independent consoles answered. RSX
  SHUTUP completed final dismount/HALT before quit; RT-11 exited at its idle monitor.
  Both owned containers exited zero and were removed. Relays/preview stopped; seven
  unrelated containers preserved. Working media and raw records retained; no Pi access.
- **Preservation:** original RSX/RT-11 hashes, lengths, modes and nanosecond mtimes
  unchanged; 22 accepted remote tag refs and Alpha 1/2 metadata preserved. No release,
  binary, guest media or private transcript upload. Development main only.
- **M5.21 incremental backup:** version `M5.22-incremental-20261123T183000Z` on the
  owner-selected private NAS, 158 files / five directories, 348,802,328 logical bytes;
  archive 349,435,904 bytes, SHA-256
  `ab23bf0c41cefe215c9cbaa76020f9b3335090120b4917cb30161b2fc664bfa2`.
  Independently reread content/supported metadata. Creation times recorded; no full
  restore. Project-level private pointer:
  `Backups/WebDesktop-M5.22-incremental-20261123T183000Z/backup.json`.
  This predates new M5.22 evidence, which remains local and needs a future incremental.
- **Previous backups preserved:** M5.21 incremental `M5.21-incremental-20261123T173629Z`
  of M5.20 evidence, archive hash
  `d941b0872c81c5cb03fc45ec04bd18a37257fa09bcf5da2604d14f13f91cdfa0`;
  full `M5.20-20261123T055815Z`, archive hash
  `7d5e5a32e5b8ac132f9dd775528b01a5d498616c5f9c80e8eff5b6102859e21c`.
  Private recovery pointers remain under project-level `Backups/`. No source deleted.
- **Private evidence:** `.research/m522/`, earlier `.research/m521-equipment/` and
  `.research/m520/` unchanged. In M5.22 RSX, `lp-first.out`/`punch-first.bin` and
  `lp-second.out`/`punch-second.bin` preserve completed originals; `punch1.bin` is the
  later full interruption-test output, not the retained partial record. Never rerun
  helpers over these paths. Credentials/console captures/archives stay private.
- **Recommended M5.23:** genuine disk and magnetic-tape inventory and read-only
  status/provenance using legitimate disposable media. Keep writes/mounts under
  independent console ownership. No further broad LP11/PC11 milestone unless a
  demonstrated defect blocks this next step. No hardware or release authorization.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.22 report](docs/lab/M5.22.md), [M5.21 report](docs/lab/M5.21.md) and [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.22.

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
