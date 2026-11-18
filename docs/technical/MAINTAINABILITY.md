# M5.2.1 maintainability review

Reviewed the M5.2 baseline `07e125a` on **2026-11-18**. This is a targeted source/documentation assessment, not an exhaustive security audit or a claim that every API already meets the new standards.

## Findings and changes made

The repository already separates emulator behavior, bounded transports, simulation and presentation, and retains useful regression evidence. The main contributor obstacles were dense event handlers, incomplete API/lifetime explanations, scattered navigation and an instruction to read a parent-workspace file that is absent from a standalone clone.

This follow-up adds [coding standards](CODING-STANDARDS.md), a [source map](SOURCE-MAP.md), a self-contained root `AGENTS.md`, and practical setup/test/contribution instructions. Near-code comments now explain terminal API ownership, mutex-protected state, renderer acknowledgements, partial-write uncertainty, old-socket callbacks, broker lock order, side-effecting RPC reads, UDP retransmission caching, signed XDR characters and presentation cleanup. Several terminal lifecycle blocks were expanded into readable statements. The build helper now states prerequisites and generated outputs.

No ownership, security, transport, simulation or rendering behavior was deliberately changed. Original SIMH sources, accepted evidence and checkpoint tags are unchanged. No Pi was contacted and no guest/lab campaign was run.

## Focused follow-ups

| Candidate | Why it matters | Smallest useful next step and evidence |
|---|---|---|
| Desktop composition in [`main.ts`](../../src/main.ts) | Window setup, application markup, menus and shared-device refresh are concentrated in one large module. Similar UI wiring is repeated. | Extract one application at a time behind the existing mount/cleanup contract, following PrinterApp. Preserve shared model identity; run affected desktop/window browser cases. Avoid a new framework. |
| Guest terminal view in [`guest-terminal.ts`](../../src/guest-terminal.ts) | Authentication, frame parsing, ownership controls and rendering still share one function; several handlers remain dense. | Separate typed message parsing from UI lifetime in a dedicated change. Keep byte order, limits, lease timing and no-replay behavior unchanged; cover reconnect, late callbacks and renderer credit with guest browser fixtures. |
| Browser wire validation in [`guest-terminal.ts`](../../src/guest-terminal.ts) and [`remote.ts`](../../src/remote.ts) | JSON parsing yields values outside TypeScript's static guarantees. Some paths perform checks, but there is no consistent typed decoder contract. | Define narrow discriminated wire types and runtime validators, with malformed-frame fixtures. Treat changed rejection behavior as a protocol/security change, not cosmetic cleanup. |
| Exported Go contracts beyond the bridge | Several helpers/types in panel, access, observation and RPC still lack complete API comments; exported configuration/maps can obscure who may mutate them. | Document a touched package's constructors, immutable configuration, copied/borrowed data and concurrent-use rules. Consider encapsulation only in a separate, tested change; do not rename established wire fields for style. |
| Error and lifecycle review | Some deadline, close, encode and best-effort send errors are intentionally or implicitly discarded. Cancellable listener/reader helpers rely on their owners to end lifetimes. | Audit one subsystem at a time; distinguish harmless cleanup failures from uncertain delivery. Add failure-path tests before changing behavior. Do not introduce automatic command retries. |
| Repeated control metadata | Descriptors, observation bank limits, broker names and browser labels repeat related facts but also encode different boundaries. | First compare them against pinned source/fixtures. Share only genuinely identical metadata; preserve independent observation validation and historical labels. Add a consistency fixture before any extraction. |
| Test/build discoverability | `test:integration` is a socket fixture despite its broad name. Browser tests require separately started services and can write accepted screenshot paths; lab scripts assume OrbStack on ARM64 Mac. | Keep these distinctions explicit now. A later small runner could manage temporary outputs/services without replacing baselines; lab portability needs its own environment-specific evidence. |

These are bounded maintenance candidates, not prerequisites for community participation. Remote panel-control safety and the terminal-only Pi pilot remain the separate engineering work described in the [roadmap](../../ROADMAP.md).

## Verification for this follow-up

Checks completed on the Mac with Go 1.26.0 and Node.js 26.9.0:

- `go vet ./...` and `go test -race ./...`: passed.
- `npm run check`: passed with strict checking unchanged.
- `npm test`: all **46** tests passed.
- `npm run test:integration`: the **one** deterministic transport fixture passed.
- `npm run build`: passed; generated the browser build and offline prototype.
- Changed Go files pass `gofmt` checks; `sh -n scripts/build.sh` passed without executing the build helper.
- Compared all nine changed Go files with the baseline using Go's scanner: identical non-comment tokens. All seven changed TypeScript modules produce identical JavaScript through the installed Vite/Oxc transformer after removing comments. These checks substantiate the limited readability scope; they are not new safety proofs.
- Checked relative Markdown destinations against repository files, the new development-guide anchor and `git diff --check`.

No browser campaign, genuine guest acceptance replay, installation-helper campaign or production integration was run: the changes preserve executable behavior and do not change those procedures. The accepted [M5.0 results](../lab/M5.0.md) and [M5.1 assessment](../lab/M5.1.md) remain historical evidence, not new test claims. No dependencies or runtime version were changed.
