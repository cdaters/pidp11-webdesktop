# M5.25 — laboratory-only storage completion experiment

The selected first path is **TM0/TM11 READ FORWARD**, from the pinned original
`pdp11_tm.c`. The initial plan selected this path before execution. Original RT-11 MT/PIP COPY/IMAGE and
independent exact-byte verification provide a genuine guest workload. No second
controller is planned: RP has asynchronous completion stages and needs separate review.

Original request scheduling is distinct from `tm_svc` execution. The hook sits after
DMA accounting, `tm_set_done` and `tm_updcsta`, and copies final MTS/MTC plus the
actual TM interrupt-request bit. Requested bytes come from the service's original
count; completed bytes are set only after the original READ DMA path updates it.
Filemark/error paths retain completed=0. Rewind/space/write, rejected immediate
requests and unattached early returns are deliberately outside this event subset.

The C ring holds 256 × 64-byte entries. A bounded try gate protects producer and
internal-worker copies. No waiting, allocation, file or socket operation occurs in
the completion hook; a host monotonic clock read is an explicit measurable cost.
The worker sends at most 32 events plus one heartbeat every 100 ms to a fixed local
Unix datagram destination, without waiting. It is an outgoing socket, not a SIMH
listener. Reader absence/send failure loses events; queue pressure drops new events.
Loss/counter exhaustion retires observation, never the guest. Atomics must be native
lock-free. Worker stack is capped at 128 KiB; startup allocations are not device-path
allocations. This is not a claim of zero timing impact.

Enable only the disposable instrumented binary with `PIDP11_M525_ENABLE=1`.
Unset/default creates no ring activity, socket or worker. Original source and binary
are separate and unchanged. This directory is not wired into production build scripts.
No event contains payload bytes, file paths or a monitor command. The optional reader
must validate identity, exact attachment generation, sequence, loss, status and expiry;
startup approval is explicit and does not establish guest identity automatically.
Guest transitions require operator retirement. The experiment adds no guest-control API.

Build and guest results, failures, measurements and the GO/NO-GO decision are recorded
in `docs/lab/M5.25.md`. Synthetic tests are never proof of guest-device compatibility.

## Completed scope and evidence

See the [M5.25 report](../../docs/lab/M5.25.md) for the decision, exact build identities,
source review, genuine comparisons, failures and measurements. `results/` contains
sanitized numeric/status evidence and one real browser capture, never working disks
or complete private console transcripts. The genuine browser capture predates the
final independent activity-expiry timer; final expiry/cancel fixtures are separate.

| Entry point | Responsibility |
|---|---|
| `apply.py`, `experimental.patch`, `NOTICE` | Guarded patch recipe, exact qualified diff and retained upstream notices |
| `events.c`, `events.h`, `ring-test.c` | Fixed-memory producer/worker and synthetic concurrency/pressure tests |
| `observer/` | Separate unprivileged Linux reader, local operator approval, read-only bounded HTTP and fixture tests |
| `workload.py` | Original-console RT-11 six-mode comparison and optional crash/reapproval or late-reader checks |
| `interrupts.py` | Authored CPU test of four actually serviced TM11 interrupts, DMA and saved status |
| `browser_workload.py` | Independent original-console workload and halted media-replacement check |
| `viewer.ts`, `browser.mjs` | Lab-only injection and genuine three-engine render measurements |
| `browser-fixtures.mjs` | Intercepted delayed-response, cancellation and independent expiry tests |
| `forward.py` | Bounded Mac loopback HTTP relay into the network-none disposable lab |

The reader is a trusted lab process under the same unprivileged UID as SIMH, not a
security boundary against a malicious same-UID program. Peer credentials check the
source PID, not its historical guest. No production authentication/transport claim
is made. Guest transition without an attachment change remains undetectable until
an independent operator retires observation. A changed attachment retires it even
if the simulator process survives. Reapproval requires a fresh reader and explicit
local attestation; the browser cannot approve it.

## Reproduction boundaries

These are laboratory instructions, not an installation procedure. The Mac owns the
experiments. Never run these harnesses against the physical Pi, original installed
source, accepted evidence directories or original guest disks. Stop on a failed
checkpoint; retain the failed working copy rather than replaying uncertain commands.

1. In the **Mac shell**, read the pinned source/build identity in
   `results/build-identity.json`, the [lab environment](../../docs/lab/environment.json)
   and [M5.24 media workflow](../m524/README.md). The retained ARM64 build image is a
   local development prerequisite, not a published image. Obtain legitimate RT-11
   media independently; no disk is included here. Verify the source manifest and
   original disk hash before copying. Choose a new private experiment directory.
2. In **disposable ARM64 Linux**, mount the verified original tree read-only at
   `/upstream`, this directory read-only at `/lab`, and an empty owned output at
   `/work`. Run `sh /lab/build.sh`. It refuses an existing `/work/m525`, builds control
   and instrumented copies with the same original flags, then runs ordinary and
   ASan/UBSan ring tests. The patch requires the exact TM and SCP source hashes and
   an owned path containing `/m525/instrumented/`. Never use Python `-O`, which would
   disable its assertions. `results/patch-reproduction.json` records a fresh exact
   source reproduction; build timestamps/path can change executable hashes.
3. In the **Mac shell**, compile the separate reader (output outside Git):

   ```sh
   CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o /tmp/m525-event-reader ./lab/m525/observer
   go test -race -count=1 ./lab/m525/observer
   ```

   Prepare a private readonly `/lab` overlay with this reader named `event-reader`,
   the M5.25 harnesses, `lab/m524/verify_tape.py`,
   `lab/integration.py` and its `lab/pdp11_program.py` dependency. Locate these
   tracked helpers before running; do not substitute a different emulator harness.
4. Each **runtime container** needs its own fresh `/work/disk0.work`, authored
   `/work/tape/input.tap` and expected-content JSON created with the M5.24 media
   helper. Mount the completed build root read-only at `/build`. Use UID/GID
   501:20 as measured, network none, read-only root, all capabilities dropped,
   no-new-privileges, 128 MiB memory with equal total memory-swap limit, two CPUs,
   128 PIDs and bounded writable `/tmp`; set `PIDP11_ISOLATED_LAB=1`. This is a
   lab-wide limit, not the future 96 MiB companion-only qualification. Verify the
   runtime paths/permissions and that no earlier socket or experiment exists.
5. In **that Linux container**, run `python3 /lab/workload.py MODE`, once, where
   MODE is `control`, `disabled`, `enabled`, `absent`, `crash` or `slow`. Each needs
   a separate working copy. The private harness operates the original console,
   checks the guest identity, supplies reader approval and stops on unexpected
   output. `M525_REAPPROVE=1` and `M525_LATE_PROBE=1` select the separately recorded
   recovery checks; inspect the script's exact environment names before use.
   The observer does not issue those console commands. Require exact-byte recovery,
   unchanged input media, expected status and clean exit before accepting a run.
6. For a **browser campaign**, compile `viewer.ts` separately with strict TypeScript
   into a private asset copy and name it `m525-viewer.js`. Use the original ordinary
   frontend build unchanged. `browser_workload.py` waits for filesystem markers
   written by the independent Mac test driver; these are not browser commands.
   `forward.py` permits only the named owned browser containers and loopback port
   8450, without publishing a container network port. Never broaden it into a generic
   target relay. The browser can only read `/activity` and static assets.
7. After each run, inspect its exact console/result and process exit. Preserve
   originals and raw failures, stop the actual reader/relay, and remove only owned
   stopped containers. Recheck original hashes and unrelated process/container
   inventory. Do not infer guest shutdown from a closed browser.

The helper paths and optional modes above are prerequisites to verify, not a promise
that a new clone contains private media or retained images. Normal development needs
none of them. For synthetic browser checks, serve a private asset copy on Mac
loopback 8451, set `M525_FIXTURE_RESULT` to a fresh private JSON output path, and run
`node lab/m525/browser-fixtures.mjs`. Those intercepted responses are not genuine
SIMH evidence. All test servers must be stopped afterward.

## Measurement interpretation

The ring is exactly 16 KiB, the sender stack is 128 KiB, and the final separate Go
reader reached 6,644 KiB RSS/HWM. That separate-process cost exceeds the 1 MiB
incremental-memory target. Embedding a reader in an existing Go runtime is not yet
measured. The guest spins near one core; short 100-Hz CPU samples and mode-specific
waits cannot establish a 1% overhead bound. No physical Pi performance was measured.

Browser results retain uncensored newly observed sequences during active guest
work. Initial pre-work history is excluded by sequence baseline, not latency.
Reader event age plus the full browser request duration is a conservative visible-age
estimate; it is not a device service time or a cross-host clock subtraction.
The second campaign's original request counter extended past its timing interval;
public rates use the aligned render samples instead. The driver now records its
request counter at the interval boundary. Do not reuse that discarded rate.
