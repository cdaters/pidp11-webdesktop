# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **Active assignment:** M5.20, genuine printer/paper-tape workflows. Development
  is blocked on the owner's required verified private `.research/` backup.
- **Backup preflight, 2026-11-23 UTC:** 38,778 regular files, 5,344 directories,
  60 symlinks; 40,753,880,985 logical bytes / 39,330,615,296 allocated bytes.
  TheBench had 35,088,527,360 bytes free, insufficient for the separate copy.
  No sockets/FIFOs/special entries or traversal errors were found. These are
  inventory counts, not file hashes or a verified backup.
- **Next action:** obtain sufficient free space or an alternate private local backup
  destination, recheck active resources, then create and independently verify the
  versioned backup before substantial M5.20 work. Do not delete existing evidence
  or backups, rely on unmeasured compression, or upload private material to cloud/Git.
  A private preflight record is retained outside the repository in the project's
  Backups directory; no source backup was created. No M5.20 guest was started.

- **Latest completed engineering milestone:** M5.19, genuine terminal workstation.
  This records completed work, not owner acceptance or production approval.
- **Latest publication:** M5.18, immutable Source Alpha 2; no M5.19 release exists.
- **Implementation checkpoints:** `1ce8ffb` (genuine-tested workstation) and
  `72e5e2d` (final local focus/shortcut behavior and extended audio checks).
- **Report:** [M5.19](docs/lab/M5.19.md), with curated [results](lab/m519/results/).
  Check recent Git history for the accompanying final documentation commit.
- **Validation:** Go vet/uncached race (22 packages), 105 frontend units, transport
  and client-contract fixtures, 129 cases in three browsers, clean-checkout build;
  V7 12 cases, BSD vi/pager 9, BSD robots 3 with initial redraw, RSX EDT 3, RT-11
  application/AST subset. Exact scope and failed attempts are in the report.
- **Resources:** all four owned M5.19 guests/bridges were safely stopped, containers
  removed and relays/previews stopped. Working disks/evidence retained privately;
  original media, unrelated containers, accepted tags and both releases unchanged.
  Verify actual state before new work; this is a historical observation.
- **Product scope:** the owner has now authorized M5.20 printer/paper-tape work
  after the backup prerequisite above. Follow the [product direction](docs/product/virtual-computer-room.md);
  no hardware or release authority is implied.
- **New limitation:** BSD robots needs Ctrl-L to complete its initial screen in all
  final engine cases. Cause unresolved; explicit redraw is a workaround, not a fix.

## Start a fresh session

1. Inspect `git status`, current branch/HEAD and recent commits. Preserve any local
   edits and running work. Do not reset or recreate the workspace to match this file.
2. Read [AGENTS.md](AGENTS.md), [PHILOSOPHY.md](PHILOSOPHY.md),
   [CONTRIBUTING.md](CONTRIBUTING.md), [coding standards](docs/technical/CODING-STANDARDS.md)
   and [source map](docs/technical/SOURCE-MAP.md).
3. Read [current capabilities](docs/capabilities.md), [known limitations](docs/known-limitations.md),
   [roadmap](ROADMAP.md) and [documentation index](docs/README.md). Historical plans
   describe their time; later verified reports supersede pending-status wording.
4. Read the current [M5.19 report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.19.

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
- LP11/PC11 qualification is genuine CPU/device behavior, not guest printer-driver
  acceptance. Ordinary panel/media controls remain simulations.
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

M5.19 ended with its owned guests, bridges, relays and previews stopped. This is a historical observation, not proof of current process state.
Preserve unrelated services/containers and accepted screenshot baselines.

## Maintaining this handoff

Update at milestone completion and before handing off unfinished work: completed
checkpoint, active scope, owned resources, exact pending step, failures/evidence,
validation actually performed and remaining restrictions. Link details rather than
copying entire reports. Record no secrets or raw private console content here.
