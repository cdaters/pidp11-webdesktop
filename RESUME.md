# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **Latest completed engineering milestone:** M5.20, genuine printer/paper-tape
  workflows; completed work, not owner acceptance or production approval.
- **Report:** [M5.20](docs/lab/M5.20.md), [runbook](lab/m520/README.md), curated
  [results](lab/m520/results/). Read these before reconstructing a guest experiment.
- **Checkpoints:** `4d63e8f` verified private backup; `ed0d970` explicit equipment
  modes/lifecycle tests; `df91a51` genuine RSX/CPU lab helpers and final presentation
  corrections. The final documentation commit follows these in Git history.
- **Genuine RSX results:** PIP/LPDRV printing from a real Chromium terminal,
  160 records / 10,241 bytes; partial live observation and completed exact downloads
  in all three engines. Separate PIP/PRDRV/PPDRV tape copy through the original
  console: 401-byte input / 725-byte output with verified leader/trailer transform;
  completed browser exports in all engines. Not live RSX punch qualification.
- **CPU/device result:** separate diskless original SIMH copied all byte values
  through PC11, 12,288 bytes in three phases, exact progress/EOF/downloads. This
  remains distinct from OS-driver evidence.
- **Validation:** Go vet/uncached race (22 tested packages), 105 frontend units,
  one transport and nine selection-contract tests, TypeScript/build; 153 full-suite
  browser passes, then 45 affected passes after final visibility/overflow changes.
  Genuine runs preceded the last presentation-only correction; see report scope.
- **Private backup:** version `M5.20-20261123T055815Z` on the owner's selected NAS.
  38,778 files, 5,345 directories including root, 60 symlinks; 40,753,880,985 logical
  bytes independently verified. Archive SHA-256
  `7d5e5a32e5b8ac132f9dd775528b01a5d498616c5f9c80e8eff5b6102859e21c`.
  File metadata readback passed; exact creation times recorded separately; no full
  restore tested. This backup predates the new M5.20 lab evidence.
- **Private recovery pointer:** project-level `Backups/`, outside this repository,
  contains `WebDesktop-M5.20-verified-20261123T064653Z/backup.json`; a copy is in
  ignored `.research/m520/backup-verification.json`. That record contains the actual
  private destination. Earlier backups and failed attempts are preserved.
- **Resources at completion:** both RSX guests safely completed SHUTUP/final
  dismount/HALT; RT-11 inventory and separate diskless CPU ended cleanly. Exact
  bridges stopped first and both original RSX consoles still answered. Owned
  containers removed, relays/Vite/mock stopped; seven unrelated containers preserved.
  Verify actual current state before new work. No Pi was accessed.
- **Preservation:** original RSX/RT-11 hashes, lengths, modes and nanosecond mtimes
  unchanged; all accepted tag refs and Alpha 1/2 asset metadata matched baseline.
  No new release/tag or binary/media upload. Public source release remains Alpha 2.
- **Next recommendation:** supervised equipment sessions: live RSX punch from a
  fresh approved spool, repeated jobs/new generations, independently verified
  completion and safe reader-selection authority; RT-11 as a second guest candidate.
  This recommendation is not authorization for hardware or production controls.
- **Failures retained:** failed backup-verifier assumptions corrected before
  verification; setup path/read-only/no-exec failures before successful bridge;
  printer cleanup click obscured after successful printing, recovered read-only
  without reprinting; initial guessed print transform rejected; finished spool
  correctly refused as a fresh live follower, then published as completed export.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.20.

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
- LP11/PC11 now have narrow RSX PIP driver qualification plus separate CPU/device
  evidence. Other guests, live RSX punch streaming, repeated-job supervision and
  browser media selection remain unqualified. Ordinary panel/media controls remain
  simulations. Identity and completion require the independent operator.
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
