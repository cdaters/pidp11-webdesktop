# Coding standards

Write code that another developer can understand from the repository alone. Prefer descriptive names, direct control flow and small, cohesive units. Explain non-obvious decisions near the code, and link larger explanations instead of copying them. These conventions guide new and changed code; they do not require a repository-wide rewrite.

## Go

Follow [Effective Go](https://go.dev/doc/effective_go) for core idioms and the current [Go documentation-comment conventions](https://go.dev/doc/comment) for APIs. Effective Go predates some modern language features; use the toolchain declared in `go.mod` and current standard-library documentation when those matter.

- Run `gofmt` on changed Go files. Keep standard-library imports separate from external/project imports in new or substantially edited blocks.
- Run `go vet ./...` and appropriate tests. Use `go test -race ./...` for concurrent/backend changes.
- Keep packages cohesive. Prefer standard-library facilities and concrete types until a real boundary calls for an interface; avoid wrappers introduced only for hypothetical reuse.
- Name values for their role. Short receiver/index names are fine when their meaning is local. Expand dense functions when doing so helps a reader follow the decision or state transition.
- Handle errors explicitly. Return useful context without exposing credentials. If an error is deliberately ignored, explain the reason where it is not obvious. Do not silently turn delivery uncertainty into a retry.
- Document exported types, functions, constants and interface contracts. State assumptions, side effects and caller obligations rather than paraphrasing names. Add a concise package comment describing its responsibility.
- Document which mutex protects which state, required lock order, and whether callbacks or blocking operations run under locks. State whether public methods support concurrent use.
- Give every goroutine, timer, subscription, channel and connection an owner and termination path. Explain who cancels, closes or waits, and whether slices/maps are borrowed or copied. Do not copy structs containing active mutexes.

## TypeScript

Keep [`strict` type checking](https://www.typescriptlang.org/tsconfig/strict.html) enabled. Types describe trusted program values; they do not validate JSON received at runtime.

- Use descriptive interfaces and discriminated unions for messages and state transitions. Prefer `unknown` plus validation at external boundaries to `any`, unsafe assertions or loosely structured objects.
- Use two-space indentation, semicolons, and the nearby file's quote convention. Keep one logical action per statement and expand multi-step handlers into readable blocks. Do not reformat unrelated files or add a formatter dependency solely for a small patch.
- Keep modules focused. Presentation should consume a transport/device interface, not decide guest lifecycle or ownership policy. Share behavior because it has the same contract, not merely similar spelling.
- Document exported interfaces and complex lifecycle transitions. Record who owns DOM nodes, sockets, listeners, renderer queues and cleanup callbacks. Handle promises deliberately and prevent stale asynchronous callbacks from taking over a newer connection.
- Preserve the difference between mock command editing, xterm's streaming parser, and real guest byte transport. A VT100 escape sequence can cross output chunks; a reconnect is a different parser lifetime.

Some older modules remain dense or incompletely typed. Improve them in focused changes with evidence; the [maintainability review](MAINTAINABILITY.md) identifies the main candidates.

## HTML, CSS and SVG

Use semantic elements, accessible names, visible focus and usable keyboard interaction. A pointer action needs an equivalent keyboard route where appropriate; disabled controls and status changes must remain understandable without color alone.

Use descriptive component/class names and preserve responsive layouts and SVG scaling. Keep panel labels, proportions, switch motion and terminal/printer presentation grounded in the recorded historical references. Distinguish a historical behavior from a deliberate modern approximation. Avoid duplicated markup, needless DOM churn and rendering the entire contents of a potentially long listing. Keep guest/user text out of executable markup; preserve the existing content-security policy and scoped terminal style handling.

## Shell scripts and utilities

State the command environment, prerequisites, generated files, network use and side effects at the entry point or its runbook. Use readable steps, quoted paths and explicit failure checks. Use `set -eu` where appropriate for POSIX shell, while remembering that it is not a substitute for checking important operations. Do not assume pipeline failure propagates in POSIX shell.

Validate inputs and stop at failed checkpoints. Use temporary fixtures for helper tests. Disk writes, deletion, privilege changes and service changes need a specific purpose and documented readiness checks; do not hide them in setup helpers or clever one-liners. Never execute a guide's installation commands just to syntax-check them.

## Comments and subsystem contracts

Explain **why** a constraint exists: signed XDR characters, REALCONS switch edges, DEC key modes, UNIX V7 erase settings, sequence/epoch fences, renderer acknowledgements, or bounded writes. Avoid line-by-line narration and boilerplate headers.

For a subsystem, make its purpose, inputs/outputs, public entry points, dependencies, resource ownership, assumptions and recovery behavior discoverable. Put short contracts beside the implementation. Use the [source map](SOURCE-MAP.md) and linked reports for architecture and evidence.

The following invariants require particular care:

- SIMH remains the emulator. Mock state is never evidence of a genuine guest result.
- Terminal observation and keyboard ownership are separate. A reconnect must not silently acquire authority or replay uncertain input.
- Bound viewers, buffers, input sizes, queues and retry behavior. Document what happens when a bound is reached; silent unbounded growth is not a recovery strategy.
- Panel observation and control remain separate. A REALCONS input read can advance switch state; a successful RPC reply is not proof that the CPU completed an operation or halted.
- Physical controls, conventional console, SSH, Screen and supported serial access remain independent of browser lifecycle.

Changes to these contracts need focused regression evidence. Formatting work is not a reason to change them.

## Documentation and verification

Use natural American English for a curious reader. Explain unfamiliar terms when needed. Identify the shell or guest console for commands, expected results and failure checkpoints. Separate executed results, reconstructed instructions and future proposals. Cite recorded revisions and preserve original notices and accepted screenshots.

For comments/prose, check links, `git diff --check` and the accuracy of contracts against source. For source formatting, also compile/type-check and use relevant existing tests. For behavior changes, run the established Go race tests, TypeScript checks/tests and build, plus affected browser cases; transport changes need integration evidence appropriate to that transport. The [development guide](development.md) lists commands and distinguishes fixtures from genuine guest acceptance. Never claim native Safari, a real guest or a physical Pi was tested based on a different test environment.

Keep each pull request focused. Report what changed, why, actual checks and unresolved limitations. No new framework, mandatory hosted service, elaborate approval process or AI tool is required to contribute.
