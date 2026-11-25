# Resume here

Read this file and AGENTS.md before continuing work. This is a repository handoff,
not a grant of authority. Verify actual Git/process state and the current owner's
request; historical approvals do not authorize new hardware, releases or messages.

## Current point

- **M5.27 engineering complete.** Code commit
  `c156e5c` adds the independent bounded local modem, startup-output reservation,
  lifecycle/fault tests and read-only equipment observation. Read
  [report](docs/lab/M5.27.md), [contract](docs/technical/local-modem.md) and
  [runbook](lab/m527/README.md). A clean detached checkout passed offline dependency installation,
  frontend tests/embed build, Go vet and both executable builds. Documentation
  follows in a separate commit; development publication is authorized to main. This is not owner acceptance, a release or physical approval.
- **Genuine result:** original V7 cu/DC11 line 3 completed AT/CONNECT/text/hangup,
  repeated exchange, peer loss and actual modem kill/restart. Independent peer and
  stopped-disk extraction match 46-byte outgoing and 44-byte return files. Original
  cu exactly matches an unchanged-source guest rebuild; reversed ioctl arguments
  fail. Installed stty with output redirection establishes raw/no-echo without
  patching historical binaries. Interrupted receive diversion includes NO CARRIER
  in its partial file: no arbitrary binary/file-completion guarantee.
- **UI and authority:** Local modem is read-only observation of a separate optional
  process. It cannot dial, hang up, attach or control a guest. Explicit observation
  stops on stale data/generation change. Real hangup remains guest/operator-owned.
  The actor is fixed to one loopback V7/DC11 line and LOCAL peer, starts detached,
  uses existing supervision/keyboard leases, caps buffers/transfers and never
  silently reattaches. A same-process/same-socket guest change is still unknowable.
- **Inventory:** actual disposable 2.11BSD inspection found DEUNA/DELUA and TCP/IP
  symbols in /netnix, INET/NDE configuration and networking tools. Its startup adds
  a default route; it was not executed. No Ethernet build or guest network enabled.
- **Verification:** full vet/uncached race, 110 frontend unit tests, builds and
  21 modem/communications/guest browser fixture tests across three engines passed.
  Genuine modem tests used the independent console, not three guest-browser runs.
  Failed diagnostic upload, startup race, compile attempts, bind retry and shared
  browser-output collision are retained. Working ARM64 modem RSS 8,720 KiB/HWM
  8,920 KiB; short idle CPU sample 0.483% one core; not Pi measurements.
- **Cleanup:** V7 and BSD synced/exited; both owned guest containers removed after
  stopped-state checks. Modem, supervisors and peers stopped. Original hashes,
  sizes, modes and nanosecond mtimes match. Prior 22 containers/seven running match
  baseline. Check current preview/process state rather than assuming cleanup.
  Private evidence: `.research/m527/`; preserve working media and failures.
- **Backup:** M5.26 incremental **M5.27-incremental-20261125T023333Z**, 77 files/five
  directories, 200,216,739 logical bytes, archive 200,533,504 bytes, SHA-256
  `798e4edb9175dbb9a119aa209d0232ad42aa4fe69067ba399905ac122235d93a`.
  Every archived file hash/supported metadata reread; no full restore. Private
  project-level pointer: `Backups/M5.27-incremental-20261125T023333Z/backup.json`.
- **Next recommendation:** repeatable text-file completion and a separately built
  XU/2.11BSD no-route Ethernet lab. No physical Pi, external dialing, production
  networking, deployment, releases/tags or interoperability changes authorized.

- **Previous completed milestone: M5.26.** Engineering commit
  `ba1e5819a8365e00688a6c3ea2f0222c88d0333f`; documentation follows separately.
  Read [report](docs/lab/M5.26.md), [session contract](docs/technical/serial-communications.md)
  and [isolated runbook](lab/m526/README.md). This is an engineering result, not
  owner acceptance, a release or physical/production approval.
- **Result:** genuine original V7 `/bin/cu` on DC11 line 3 exchanged distinctive
  ASCII text with an independent peer and Chromium/Firefox/WebKit. Communications
  reuses terminal generations and keyboard leases, adds optional operator metadata
  and socket counts, and labels stale/unknown state. Delayed directory replies
  cannot relabel an active attachment. Browser disconnect preserved the guest;
  actual bridge restart was detached under a new service instance.
- **Limits:** guest echo and newline processing apply. Browser CR alone remained
  buffered; explicit Workstation Line feed completed it. `/dev/null` substituted
  for the absent calling unit. `cu -s 9600` falls back to B300 in inspected source;
  later trials used 300, but actual ioctl/raw-mode success and physical timing are
  unqualified. The genuine modem attempt returned OK then repeated ERROR feedback;
  no successful Hayes session is claimed. Original SIMH has no Ethernet backend.
  No guest TCP/IP/DECnet, flow-control or binary-transfer qualification is added.
- **Verification:** full vet/uncached race, 109 frontend unit tests, builds,
  bounded decoder/modem tests, actual peer disconnect/reconnect/SIGKILL, three
  genuine browser engines and service stop/restart. Initial full fixture campaign:
  228 passed, six embedded-preview connection failures; all nine artifact tests
  passed after starting the missing preview. Final communications/guest suite:
  15 passed across three engines. See the report for failed lab attempts and
  measurement limits. Clean-checkout results are in the validation record.
- **Resources/cleanup:** service RSS snapshots 12,832–14,664 KiB, a two-second lab
  CPU sample about 0.50% of one core; not Pi or sustained-throughput measurements.
  Service ran with enforced 96 MiB/zero swap (shared with the guest), no OOM events.
  V7 synced three times and original SIMH exited 0. Owned peers, bridge, observer,
  relay, previews and lab container stopped/removed; prior 22 containers/seven
  running preserved. Original disk hash, size, mode and mtime unchanged. No Pi access,
  public guest networking, releases, deployment or interoperability changes.
- **Backup:** M5.25 evidence preserved before experimentation in
  `M5.26-incremental-20261125T011230Z`, 1,998 files / 233 directories,
  351,968,268 logical bytes; archive 358,692,352 bytes, SHA-256
  `c45df8ed270e71710c39fc5bde444d247c7ebbf75256b137423d804e3d3f749b`.
  Independent readback verified every file hash and supported metadata; no full restore.
  Private project-level pointer: `Backups/WebDesktop-M5.26-incremental-20261125T011230Z/backup.json`.
  New private M5.26 evidence is under `.research/m526/`; preserve failures and working media.
- **Next recommendation:** resolve actual V7 cu line-setting behavior on disposable
  media, qualify received-file integrity and flow control, then the bounded local
  modem. Separately inventory 2.11BSD kernel/tools for a no-route Ethernet lab.
  This recommendation does not authorize physical access or external dialing.

- **M5.25 completed.** Read the [report](docs/lab/M5.25.md)
  and [isolated runbook](lab/m525/README.md). Engineering commit
  `55c6629cabe2af79ea7b050f00394805d523f274`, active-stream crash test `0fc8132`; backup checkpoint `157c454`;
  starting M5.24 main `3a22c3e`. Documentation follows in a separate commit.
  Completion is not owner acceptance, a release or physical/production approval.
- **Decision:** GO for further bounded TM11 laboratory development, NO-GO for
  ordinary/physical deployment. All six genuine RT-11 modes recovered exact bytes
  and identical whole working disks; separate control/disabled/enabled CPU tests
  serviced four interrupts with identical DMA/status. Reader absence/crash did not
  stop the guest. Only TM0 READ FORWARD is observed; other operations/controllers
  are outside scope. Ordinary application builds remain snapshot-only.
- **Bounds and limits:** fixed 16 KiB ring, drop-new/no waiting, explicit gap and
  generation retirement; separate reader starts unapproved. Final reader RSS/HWM
  6,644 KiB exceeds the 1 MiB incremental-process target. Pi 1% CPU target unmeasured;
  small three-engine visible-age estimates p95 145–194 ms are lab summaries, not
  every-event/physical acceptance. Guest changes without attachment changes need
  independent retirement. Same-UID peer checking is not a malicious-process boundary.
  REALCONS was disconnected, so connected timing/coexistence is unqualified.
- **Validation:** vet/uncached Go race (25 packages), TypeScript/106 frontend tests,
  build, C ASan/UBSan concurrent ring/pressure tests, genuine six-mode RT-11 and
  three-mode interrupt comparisons, actual SIGKILL during a 200-read CPU stream,
  crash/reapproval and late-reader checks, actual
  halted tape replacement, three genuine browser engines and final three-engine
  delayed-reply/cancellation/independent-expiry fixtures. Clean detached `55c6629`
  built ordinary desktop and ARM64 reader without private inputs. The ordinary full
  browser suite and C ThreadSanitizer were not rerun/run respectively. Report records
  rejected first candidate, failed prompt detection and corrected measurement scopes.
- **Cleanup/preservation:** all 26 owned M5.25 containers removed after evidence
  capture; readers/relays/previews stopped; prior 22 containers/seven running states
  preserved. Original source/media hashes and metadata unchanged. No Pi access.
  Interoperability 0.1/0.2, accepted tags and public releases remain unchanged.
  Recheck current processes before a new experiment; this is a historical record.
- **Backup:** M5.24 evidence archive `M5.25-incremental-20261124T064928Z`, 2,703 files,
  339 directories/six symlinks, 373,080,685 logical bytes; archive 384,715,264 bytes,
  SHA-256 `c8d438a4c5714bd9ac0652fa903925e74aa3081920cd20a6cde56fb699de7973`.
  All file bytes/supported metadata independently reread; no full restore.
  Private project-level recovery pointer:
  `Backups/WebDesktop-M5.25-incremental-20261124T064928Z/backup.json`.
  It predates new M5.25 evidence, retained under `.research/m525/`; do not overwrite
  failed attempts, working media, build copies or raw measurements.
- **Next recommendation:** serial communications, virtual modems and isolated
  networking, beginning with one genuine two-endpoint transfer and independent
  console/lifecycle checks. This is a recommendation, not a new authorization.

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

- **Prior completed engineering milestone: M5.24.** Read the [report](docs/lab/M5.24.md),
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
- **Prior M5.24 recommendation (now completed by M5.25):** bounded optional storage-completion event feasibility in
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
4. Read the current [M5.25 report](docs/lab/M5.25.md), then the [M5.24 report](docs/lab/M5.24.md), then the [M5.23 report](docs/lab/M5.23.md), [M5.22 report](docs/lab/M5.22.md), [M5.21 report](docs/lab/M5.21.md) and [M5.20 report](docs/lab/M5.20.md) and [M5.19 workstation report](docs/lab/M5.19.md), then the latest [publication record](docs/releases/M5.18-publication.md)
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
No new release or binary publication is authorized for M5.25.

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

- Ordinary disk/tape browser output is captured metadata, not live I/O. The separate
  M5.25 TM11 experiment is laboratory-only and does not qualify production activity. Guest OS and safe
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
