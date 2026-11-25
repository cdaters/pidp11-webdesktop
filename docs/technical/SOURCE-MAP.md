# Source map and subsystem boundaries

## M5.28 isolated Ethernet laboratory

- `lab/m528/build.sh`: two original-source TAP builds with byte comparison.
- `lab/m528/isolation.py`, `setup-network.sh`: exclusive namespace gate/setup.
- `lab/m528/guest.py`, `peer.py`: independently operated BSD and fixed TCP peer.
- `lab/m528/capture.py`, `packets.py`, `observation.py`: bounded passive capture,
  offline checksummed frame accounting and explicit retained identity selection.
- [Runbook](../../lab/m528/README.md), [report](../lab/M5.28.md),
  [observation contract](isolated-ethernet.md). No production application imports.

## M5.27 local modem

- `internal/localmodem/`: bounded command/data personality, independently supervised
  actor and strict read-only observation; colocated parser/lifecycle/fault tests.
- `cmd/local-modem/`: opt-in network-none executable, private status/control files,
  enforced memory containment; never starts SIMH.
- `src/modem.ts`: explicit generation-pinned read-only equipment observation.
- `lab/m527/`: independent peer, diagnostic ioctl probe, bounded earlier-feedback
  reproduction, replay runbook and sanitized measurements.
- [Contract](local-modem.md), [engineering report](../lab/M5.27.md).


## M5.25 isolated completion experiment

[`lab/m525`](../../lab/m525/README.md) contains the opt-in C ring, guarded source
patch/diff, separate Go reader and three-engine lab injection. Nothing is imported
by the ordinary frontend or service. The C hook copies only final TM0 forward-read
metadata; a worker owns outgoing nonblocking datagrams. The reader owns local
approval, bounded history and HTTP lifetime; the viewer owns requests and expiry.
The [report](../lab/M5.25.md) maps genuine guest, CPU/device, synthetic and browser
evidence, including rejected candidates and unmet performance targets.

## M5.23 captured storage observations

- `internal/storage` owns strict RL0/TM0 metadata, private approval revisions, immutable generations, expiry/revocation, bounded HTTP output and read-only media verification. It never opens a simulator interface.
- `cmd/storage-snapshot` reads private operator capture/configuration, independently verifies the allowlisted image and publishes once through the existing Unix socket. `terminalservice.Config.Storage` contains only device tuples; restart has no saved captures.
- `src/storage-workspace.ts` owns the existing Disk/Magnetic tape windows' explicit modes, capture identity checks, local freshness timer, one retained copy and disposal. Simulation keeps the shared device model in `main.ts`.
- [Architecture/field provenance](storage-observation.md), [original inventory](storage-inventory.md), [lab runbook](../../lab/m523/README.md) and [results](../lab/M5.23.md) separate genuine snapshots, guest access and CPU/device evidence.

## M5.22 operation and retained history

- `internal/equipmentsession/guided.go` translates narrow local operator commands into the existing ordered supervisor protocol. `cmd/equipment-supervisor` prepares exclusive private configuration and starts the guide; neither controls SIMH.
- `internal/peripheral/history.go` copies up to eight terminal records independently of live/export slots. `archive.go` bounds explicit private records and validates metadata/data. `cmd/equipment-records` saves or explicitly recovers data without authority.
- `src/equipment-history.ts` owns explicit list/selection, immutable identity checks, retained paper/raw exports and cancellation. `equipment-workspace.ts` adds Job history alongside existing modes.
- [Operator guide](equipment-operator.md), [history contract](equipment-history.md), [lab runbook](../../lab/m522/README.md) and [report](../lab/M5.22.md) distinguish operator attestations, regression fixtures and genuine output.

## M5.21 equipment sessions

[`cmd/equipment-supervisor`](../../cmd/equipment-supervisor/main.go) and
[`internal/equipmentsession`](../../internal/equipmentsession/supervisor.go) own
private ordered approvals and periodic renewal in isolated Linux. They never control
SIMH. [`internal/peripheral/session.go`](../../internal/peripheral/session.go) validates
owner/job phases and the readonly catalog; [`src/reader-catalog.ts`](../../src/reader-catalog.ts)
owns explicit catalog retrieval/cancellation. [Session contract](equipment-sessions.md)
and [lab runbook](../../lab/m521-equipment/README.md) distinguish operator attestations,
actual device evidence, bounded retention and the independent private harness.

Read this alongside the [architecture decisions](../development/DECISIONS.md). The normal mock desktop, passive-observation lab, genuine guest-terminal lab and M5.3 terminal-only pilot are distinct entry points. None is a production Pi installation procedure.

## Go services and interfaces

| Start here | Responsibility and boundary |
|---|---|
| [`cmd/webdesktop`](../../cmd/webdesktop/main.go), [`internal/server`](../../internal/server/server.go) | Serve embedded assets and mock panel REST/WebSocket requests. The command owns the listener and cancellation; `Server.Run` polls a `Hub`. Hub implementations synchronize requests and polling. Browser loss releases that session; it does not establish emulator state. |
| [`internal/panel`](../../internal/panel/hub.go) | Deterministic demonstration and its ownership arbiter. Takes bounded requests and emits snapshots/results under a mutex. No emulator, network, filesystem or GPIO access. Its memory is illustrative, not PDP-11 emulation. |
| [`internal/web`](../../internal/web/serve.go) | Read-only embedded frontend and per-document content-security policy/style nonce. Build assets before compiling the executable. It neither authenticates terminal operations nor grants panel authority. |
| [`cmd/terminal-lab`](../../cmd/terminal-lab/main.go), [`internal/terminalbridge`](../../internal/terminalbridge/bridge.go) | Operator-configured raw guest serial sockets to authenticated browser viewers. The command validates private files and a Linux network-none environment, owns TLS/listener setup and cancellation. Bridge owns guest connections; Endpoint owns viewer accounting and keyboard leases. HTTP handlers own WebSocket lifetime. No SIMH process control or automatic guest-line reconnect. M5.4 makes each bridge connection attempt and endpoint attachment one-shot; [lifecycle tests](../../internal/terminalbridge/lifecycle_test.go) cover port reuse and late output after detach. |
| [`cmd/terminal-pilot`](../../cmd/terminal-pilot/main.go) | M5.3 Linux pilot: one fixed DC11 endpoint and loopback HTTPS, reusing the same bridge/authentication/assets. Owns only its listener and guest socket, with no emulator lifecycle. Operator-provisioned private files and an SSH tunnel remain separate. [Actual Pi evidence](../lab/M5.3.md). |
| [`cmd/webdesktop-service`](../../cmd/webdesktop-service/main.go), [`internal/terminalservice`](../../internal/terminalservice/lifecycle.go) | Optional installed candidate, detached at startup. Manager owns fresh instance/revision approvals and one-shot endpoints; a private Unix socket is the local operator boundary. Browsers must name the chosen attachment generation. No emulator/GPIO/media authority. Packaged startup uses [`internal/memoryguard`](../../internal/memoryguard/check.go) to require a kernel memory/swap boundary before sockets open; it never changes limits. [Implementation and rehearsal](../lab/M5.6-implementation.md). |
| [`cmd/switchdiag`](../../cmd/switchdiag/main.go), [`internal/switchdiag`](../../internal/switchdiag/diagnostic.go) | Bounded offline scanner interpretation; separately authorized hardware mode invokes only the pinned original scanner after ownership checks. No launcher, RPC or media operation. The scanner does initialize GPIO; the supervised [M5.7 capture](../lab/M5.7.md) reproduced an unexpected SR0 reading. M5.7.1 adds an optional expected-SR stop before any further sample; its [movement comparison](../lab/M5.7.1.md) still read SR0 asserted with the paddle DOWN. Further hardware testing requires separate authorization. [Diagnostic design](../lab/M5.5.1-switch-diagnostic.md). |
| [`internal/access`](../../internal/access/access.go) | Provisioned credentials to bounded cookie sessions and independent capabilities. Gate owns session/audit state under its mutex. Configure origin and clock before concurrent serving. Callers enforce the capability for each operation and close/release transports when access expires. An observer is not a keyboard owner. |
| [`internal/blinkenbone`](../../internal/blinkenbone/xdr.go) | Pure bounded ONC RPC/XDR encoding/decoding, no sockets or emulator access. Procedure selects payload shape. Original IDL character vectors are four-byte XDR elements, not opaque byte strings. Malformed input returns errors; see [protocol and fixtures](../protocol.md). |
| [`internal/labrpc`](../../internal/labrpc/server.go) | Loopback UDP/TCP RPC transport and PDP-11/70 descriptors. Server owns listeners and workers; its context bounds lifetime. Client serializes calls and does not discover/retry endpoints. UDP duplicate replies prevent repeated execution of a side-effecting input read. M5.5 adds an explicit fast-fixture entry limit with the original 35-second retention and a 16 MiB payload bound; `Listen` keeps its 4096-entry default. Panel callbacks execute under its lock and must not reenter Panel. |
| [`internal/broker`](../../internal/broker/broker.go), [`consumer`](../../internal/consumer/client.go) | Isolated arbitration and optional consumer-fence experiments. Broker owns effective switch state, leases and a bounded trace. The adapter translates browser requests; the fence client exchanges bounded local messages. Lock order is adapter → broker → fence client. Fence callbacks must not reenter broker. Quiescing is not proof of CPU halt after crash or delayed delivery; retain the [M4 counterexample](../lab/M4.md) and [M4.1 limits](../lab/M4.1.md). |
| [`internal/observe`](../../internal/observe/observe.go) | Validate copies of existing REALCONS state and publish read-only snapshots. Store owns copied banks, freshness and retired producer identities under a mutex. Listener owns its Unix socket; caller supplies/cancels context. Stale data is labeled unavailable/stale rather than replaced with invented live lamps. No RPC input reads or switch writes. Linux peer checks are a separate platform-specific path. |

RPC transport does not itself turn registration into a production service. The original C/Go interoperability and registration experiments are described in [M3](../lab/M3.md); their commands remain laboratory procedures.

## M5.20 equipment modes

`equipment-workspace.ts` owns explicit simulation/observation/completed-mode
lifetimes inside existing printer and tape windows. `peripheral-details.ts` explains
the selected source and authority. `live-devices.ts` validates stream identity,
reader continuity and bounded retained downloads; `device-observer.ts` verifies
immutable completed exports. Neither module controls the simulator or media.
`browser-tests/m520.spec.ts` covers replacement, malformed identity, EOF separation
and cancellation; `internal/peripheral/reader_lifecycle_test.go` covers paired-reader
validation and independent producer behavior. [The lab](../../lab/m520/README.md)
contains separate private-operator helpers, not production supervision.

## M5.19 workstation modules

`terminal-workstation.ts` owns local display/search/audio controls and releases its
subscriptions on rebind/disposal. `terminal-preferences.ts` whitelists presentation
fields; `terminal-keyboard.ts` distinguishes local shortcuts from DEC keys;
`terminal-audio.ts` owns a shared optional context and per-window sound state.
`equipment.ts` renders descriptive status without granting authority. The existing
`guest-terminal.ts` still owns transport, current lease checks and explicit reconnect.
See [the workstation contract](terminal-workstation.md) and [M5.19](../lab/M5.19.md).

## Browser modules

| Start here | Responsibility and resource owner |
|---|---|
| [`src/main.ts`](../../src/main.ts), [`windows.ts`](../../src/windows.ts) | Compose applications and choose adapters. WindowManager owns window DOM and lifecycle callbacks; mounted applications return cleanup functions. Preferences store geometry, not credentials or machine authority. Main is still larger than desirable; see the [review](MAINTAINABILITY.md). |
| [`model.ts`](../../src/model.ts), [`remote.ts`](../../src/remote.ts), [`observed.ts`](../../src/observed.ts) | `PanelAdapter` connects read-only views and commands to local simulation, mock/lab control transport or read-only observation. Consumers own unsubscribe callbacks; network adapters own sockets/timers and expose `close`. Mock/lab reconnect is spectator-only and never replays commands. Observation cannot dispatch control. |
| [`panel.ts`](../../src/panel.ts), [`paddles.ts`](../../src/paddles.ts), [`panel.css`](../../src/panel.css) | SVG layout, calibrated paddle geometry and accessible interaction. Input is a snapshot; output is DOM updates or adapter commands. The containing view owns DOM/listeners. Rendering does not decide whether control is authorized. Historical references live in [panel notes](../panel-reference-notes.md). |
| [`guest-terminal.ts`](../../src/guest-terminal.ts) | xterm view of a genuine configured guest line. Owns the renderer, WebSocket, lease-renewal timer and callbacks. Its caller must run cleanup on window close, including when an asynchronous mount completes late. Socket identity excludes old callbacks; reconnect starts a fresh renderer and read-only view. |
| [`terminal.ts`](../../src/terminal.ts), [`terminal-protocol.ts`](../../src/terminal-protocol.ts) | Mock terminal rendering, shared DEC key encoding, and offline byte/protocol fixtures. xterm handles VT escape sequences. The mock input filter is a line-editor convenience, not a guest parser. `TelnetNVT` and `TerminalChannel` are offline fixtures, not the M5.0 raw serial transport. `terminalDocument` scopes style nonces without changing global DOM behavior. |
| [`devices.ts`](../../src/devices.ts) | Shared RAM-only disk/tape/catalog/printer state and mock terminal sessions. Main owns the instance; windows reflect that shared state. Catalog entries are metadata, not guest disk images. Bounds and failure checks stay in the model rather than individual renderers. |
| [`printer-app.ts`](../../src/printer-app.ts), [`printer.ts`](../../src/printer.ts) | Printer UI and bounded visible-paper rendering. VirtualDevices retains the original spool; PaperViewer derives presentation rows without altering download text. The window owner disposes the resize observer and scheduled frame. See [printer semantics](../printer-m432.md). |

## Genuine terminal lifecycle

The [M5.0 harness](../../lab/m50/serve.py) configures SIMH DC11 and the disposable guest. The bridge connects once to configured raw lines. A browser authenticates, chooses a listed line and subscribes as an observer; keyboard acquisition is a separate explicit operation. Other viewers can continue receiving output.

Endpoint's mutex protects membership, output credit, input sequence, lease and guest writes. A write is bounded by 250 ms and the remaining lease while holding that lock, so a release cannot overtake already accepted input. Delivery uncertainty closes the line and is never automatically replayed. A browser acknowledges output only after xterm consumes it; excessive unacknowledged output removes that viewer rather than blocking the guest reader.

Disconnecting a browser releases its keyboard, not the guest. Closing the bridge detaches its raw sockets without issuing guest shutdown. The operator harness/conventional console owns guest startup and shutdown. DC11 availability alone does not establish a working login line: each guest needs its actual serial driver and login configuration checked.

## Test and build entry points

[`development.md`](development.md) is the command reference. Go tests sit beside their packages; TypeScript model tests live in `tests/`. `integration/remote.test.ts` replaces the browser socket with a deterministic fixture. `browser-tests/` exercises actual browser engines but includes intercepted guest/observation endpoints. The separately configured `lab/m50/browser.mjs`, `lab/m53` replay and `lab/m551/browser.mjs` exercise genuine disposable V7 guests; intercepted browser fixtures do not.

`scripts/build.sh` generates browser/embedded assets and mock executables. `lab/build-image.sh` fetches pinned public upstream source and builds a local lab image. The M5.0 runbook documents media preparation, the network-none runtime, forwarding and cleanup. Do not infer a live Pi test from any of these local checks.

The [M5.5 lab and profile preparation](../../lab/m55/README.md) execute the full candidate boot file against original REALCONS and the direct Go stand-in. The bounded Mac helper emits only a new local review package; it is not an installer. The terminal application and front-panel authority implementations are unchanged.


## Optional-service lifecycle additions

The shared terminal HTTP layer consumes `terminalbridge.Directory`: the original Bridge remains immutable, while `terminalservice.Manager` publishes new endpoint objects behind explicit generation IDs. Manager lock order is manager → endpoint; endpoint readers never call back into the manager. A local approval consumes its revision even when dialing fails. Detached browser views cannot approve a dial. Tests cover stale generations, concurrent detach/dial, EOF, service-instance replacement, malformed local requests and public socket limits.

`packaging/` contains the ARM64 builder and companion-only installation helpers. `lab/m551/` owns scanner oracles, the nine-scenario TLS/WS benchmark, genuine guest/browser supervision and real-systemd lifecycle rehearsal. These are development tools; none belongs in the runtime executable. See [the lab instructions](../../lab/m551/README.md).


### M5.6 additions

- `src/terminal-profile.ts` owns connection-local VT52 interpretation and personality key mappings; `guest-terminal.ts` still owns sockets, credits, authentication UI and keyboard authority. See [conformance](terminal-personalities.md).
- `src/tek4010.ts` owns bounded fixture graphics state; `tek4010-app.ts` renders safe SVG nodes. It opens no transport. See [graphics paths](graphics-foundations.md).
- `webdesktop-service check` validates private configuration without sockets. `packaging/configure.sh` performs first-run permissions and checks as the dedicated account. `PACKAGE_SHA256SUMS` covers the delivered helpers as well as retained payload.
- `lab/m56/` adds terminal-personality guest regression and first-run/credential checks while reusing M5.5.1's genuine SIMH, systemd and benchmark harnesses. [Reproduction](../../lab/m56/README.md).

### M5.9 additions

- `vt220.ts` and `teletype.ts` are connection-local bounded adapters. `tek-display.ts` renders the same inert SVG for the fixture and approved guest stream. `guest-terminal.ts` retains transport/lease ownership; `main.ts` caps guest windows at four within the global limit.
- `printer-import.ts` validates explicit local ASCII snapshots; `printer-app.ts` cancels stale file reads on clear/disposal. No new backend printer or media endpoint exists.
- `companion.ts` defines chat-only and future proposal-review contracts. `companion-app.ts` owns/disposes the offline chat. `internal/companion` is a standalone tested provider library, not a registered HTTP route or model connection.
- `packaging/preflight.sh` is structural/read-only; `release.sh` builds a versioned candidate only from a clean committed tree. `lab/m59` reuses original-SIMH V7 and systemd harnesses, with the explicit isolated DCO 7B profile and no original C changes.

### M5.9.1 additions

- `internal/peripheral` owns fixed allowlists, private one-shot publication and at most four immutable 64-KiB copies. Its public API requires observation capability and accepts no path or control operation. `device-observer.ts` verifies generation/size/hash, renders through the existing paper viewer and aborts stale reads on replacement/disposal.
- `internal/companion/service.go` owns optional configured HTTP routes and one shared provider slot, reusing `provider.go`. It retains no chat history. `companion-http.ts` is same-origin only; `companion-app.ts` owns visible context and cancellation. `terminal-sharing.ts` stores only one bounded, deliberately selected excerpt until consumed.
- `terminalbridge/proposal.go` binds one expiring proposal per viewer to endpoint lifetime and lease epoch, consumes before writing, and calls the existing bounded input path under the same lock. HTTP requires the private opt-in. No generic command endpoint exists.
- `media-observation.ts` is a strict read-only schema and generation fence, not a collector. `lab/m591` contains genuine CPU-device programs, full-screen/browser tests, explicit completed-export publication and fake-peer ARM64 rehearsals. [Results](../lab/M5.9.1.md).

### M5.9.2 additions

- `internal/peripheral/follow.go` owns fixed-path spool descriptors, producer leases, bounded tails and completion hashes; `follow_http.go` separates private approval from authenticated read-only polling.
- `src/live-devices.ts` follows one explicit generation per window; `peripheral-workspace.ts` switches between completed and live modes while disposing old resources. `windows.ts` arranges equipment and exposes terminal status without persisting authority.
- `internal/companion/references.json` is the shared curated catalog used by Go and TypeScript. The server accepts allowlisted reference IDs, not caller-supplied system instructions.
- `lab/m592` contains genuine live-device supervision, equipment-browser acceptance and expanded BSD checks. `lab/pdp11_program.py` builds the small original CPU test programs shared with M5.9.1. [Results](../lab/M5.9.2.md).

### M5.9.3 Phase A additions

- `internal/companion/provider.go` accepts an optional native-Ollama thinking preference, preserves unset behavior, and distinguishes bounded timeout, cancellation, unavailable server and truncated-output errors. No model lifecycle or tool API is exposed.
- `lab/m593a` contains bounded loopback tutor probes, real three-engine companion acceptance and sanitized response evidence. [Results](../lab/M5.9.3-A.md) separate model accuracy from transport acceptance.
- `browser-tests/m593.spec.ts` protects visible review of explicitly shared terminal text. [Host-side transport design](hosted-local-companion.md) is a future deployment proposal, not an installed tunnel.

### M5.9.3 Phase B additions

- `internal/companion/references.go` and the shared catalog provide bounded lexical retrieval, explicit version scope, note integrity and citation-ID checks. `companion-references.ts` supplies offline search and catalog-owned links; shared retrieval cases guard both implementations. A valid citation ID is not proof of a supported claim.
- `pdp11-values.ts` performs exact, bounded integer conversion/masking and owns its offline controls. Its results are separate from generated answers and have no guest/provider effects.
- `internal/modelhost` and `cmd/model-gateway` expose authenticated chat/models/reference lookup to an existing local runner. The command owns loopback TLS and shutdown; the handler owns one in-flight slot. No runner management, browser CORS, tools or terminal authority.
- `internal/replicant` is a pure, explicit-selection/readback and status-claim contract. Automatic keys always fail. It is not an installed Hacker Replicant endpoint or operator-console integration.
- `lab/m593b` contains real model qualification, three-engine conversations, held-out addressing probes and isolated ARM64 SSH/TLS and lifecycle rehearsals. Fixtures, genuine inference and untested deployment boundaries are distinguished in the [report](../lab/M5.9.3-B.md).

## Phase C tutor additions

- `internal/companion/claims.go`: bounded atomic-rule review of an answer against exact supplied catalog notes; no execution authority.
- `src/claim-review.ts`: runtime validation and text-only annotation rendering beside source passages.
- `src/tutor-calculation.ts`: constrained `/calc` parser and exact fixed-width arithmetic, sharing `pdp11-values.ts`; intercepts local requests before chat history/provider access.
- `internal/replicant/http.go`: separately embedded token-authenticated, expiring selected-text adapter; caller owns authoritative identity, TLS and server lifecycle. No integration into the ordinary desktop listener.
- `lab/m593c/`: synthetic historical comparison, separate-network gateway/upstream harness and protected ARM64 lifecycle checks; [reproduction](../../lab/m593c/README.md).

## Phase D tutor and optional application

- `src/tutor-facts.ts` and `internal/companion/facts.json` resolve explicit source facts locally before history or model access; `src/external-companion.ts` opens a separately authenticated HTTPS hostname without passing session authority.
- `internal/companion/natural_claims.go` adds bounded fragment-only matches; `claims.go` retains unverified compound remainders. `lab/m593d/evaluation` and `review` report misses as well as matches against source-reviewed cases and retained natural responses.
- `internal/replicant/sharing.go` adds a distinct writer credential. `cmd/replicant-adapter` owns loopback TLS, private-file validation and an expiring owner-attested identity callback; it does not observe actual guest lifecycle.
- `integrations/hacker-replicant/` prepares an exact disposable upstream revision and provides optional read-only Node/UI modules. The app owns independent authentication, one in-flight chat, bounded context and cancellation; the adapter owns its mutex-protected expiring snapshot. Neither owns a terminal or emulator process.
- `lab/m593d/` contains genuine-model, actual-app, cross-host fault, browser and ARM64 lifecycle harnesses. [Reproduction](../../lab/m593d/README.md) and [results](../lab/M5.9.3-D.md) distinguish synthetic selection identity from unperformed live-guest acceptance.

## M5.11 lifecycle and sharing boundaries

`terminalbridge.Endpoint.Observation` returns an atomic connection/viewer snapshot under the endpoint lock. `terminalservice.Manager.Status` exposes that membership revision only on its private operator interface; public listings still convey attachment choices. A membership change is not an OS or CPU observation. `internal/replicant` fences revoke/publication races and assigns exact consent receipts. The modified optional app compares them before inference. `lab/m511/selection-guard` is an independent Linux test observer, excluded from the deployed executable; [its report](../lab/M5.11.md) states the surviving-stream and multi-view limitations. Peripheral `Close` is permanent and append polling checks the retained file bytes. These changes grant no additional control authority.

## M5.12 supervised attachments

`terminalservice.NewSupervised` marks explicitly named lines as requiring private
ordered lifetime renewal. `supervision.go` owns verification/active deadlines and
expiry retirement; `control.go` exposes renewal and bounded runtime counters only
through the private Unix socket. `lab/m512/supervisor.py` observes Linux pidfds and
owned sockets, and the updated lab selection guard additionally binds that proof.
Neither observer ships in the executable or infers an OS. `replicant.PublishAt`
requires the publication epoch captured before source observation, preventing a
request delayed across revocation from restoring consent. See the
[identity contract](supervised-guest-identity.md) and
[security packet](../security/M5.12-replicant-review.md).

## M5.26 communications

`internal/terminalbridge/serial.go` defines bounded operator metadata and socket
accounting. Existing endpoint locks, generations and leases still own the data
path. `src/serial-session.ts` validates and renders counts/freshness without owning
a socket; `guest-terminal.ts` owns polling and ignores directory replies that
arrive after attachment. Communications is a filtered terminal window, not another
network client. `lab/m526/` contains the isolated original-guest peer, modem
prototype and genuine three-engine harness; none is a production modem or guest
network stack. See the [session contract](serial-communications.md) and
[report](../lab/M5.26.md).
