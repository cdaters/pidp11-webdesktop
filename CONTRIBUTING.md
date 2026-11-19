# Join the workbench

You do not need a physical PiDP-11, private access to Craig's machines or an AI assistant to help. Terminal-compatibility reports, historical references, hardware experience, clearer explanations and small code improvements are all welcome.

## Start locally

Install Git and Node.js **22.18 or newer** with npm. For backend work, also install Go **1.25 or newer** as required by `go.mod`. From your development computer's shell:

```sh
git clone https://github.com/cdaters/pidp11-webdesktop.git
cd pidp11-webdesktop
npm ci
npm run dev
```

Open the loopback address Vite prints, normally `http://127.0.0.1:5173`. This is the browser-only demonstration: mock terminals and simulated peripherals, with no Pi connection. Stop it with Ctrl-C.

For a compiled service on the tested Mac host, stop the preview if you no longer need it, then run:

```sh
sh scripts/build.sh
./bin/webdesktop-macos
```

Open `http://127.0.0.1:8080/?backend=mock`. The helper builds browser assets and native Mac/static Linux ARM64 **mock** executables; it deploys neither. See [development and tests](docs/technical/development.md) for native Linux build instructions and platform limits. `npm run build` separately produces `dist/prototype.html`, the self-contained offline demonstration.

## Find the code

| Location | Purpose |
|---|---|
| `cmd/` | Go entry points: ordinary mock service and separate lab/probe commands |
| `internal/` | Panel models, RPC/XDR, broker experiments, authentication, observation, guest bridge and web serving |
| `src/` | Desktop composition, transport adapters, panel artwork, terminal views and simulated peripherals |
| `tests/`, `integration/`, `browser-tests/` | TypeScript units, transport fixture and Playwright browser cases |
| `lab/` | Isolated interoperability and genuine guest harnesses; not production installation scripts |
| `docs/` | Beginner/developer guides, historical references and retained milestone evidence |
| `checkpoints/m0/` | Preserved original prototype |

The [source map](docs/technical/SOURCE-MAP.md) connects these directories to their interfaces, lifecycle owners and failure behavior. Start there for a subsystem change.

## Make and verify a focused change

Read the [coding standards](docs/technical/CODING-STANDARDS.md). Use `gofmt` for changed Go files, preserve strict TypeScript checking, and keep state transitions readable. Explain the reason for historical workarounds and ownership/resource limits. Avoid unrelated reformatting or dependency additions.

For behavior changes, use these commands from the repository root:

```sh
go vet ./...
go test -race ./...
npm run check
npm test
npm run test:integration
npm run build
```

The Go tests use local fixtures; `test:integration` is a deterministic browser-transport fixture, not a genuine guest test. For affected browser flows, follow the [Playwright setup](docs/technical/development.md#focused-checks) and run `npm run test:browser` or the relevant test file. Preserve accepted screenshot baselines. For documentation-only edits, check links and `git diff --check`; run the installation guide's helper tests only when that material changes.

The **Guest terminal** is separate from the mock terminal. It has communicated with genuine UNIX V7 in the isolated M5.0 lab. Reproduce that result through the [M5.0 runbook](docs/lab/M5.0-runbook.md), including its public media download, checksums, OrbStack/ARM64 Mac prerequisites and cleanup. Earlier RPC/safety experiments have their own reports linked from the [technical index](docs/technical/README.md). No private disk or Pi access is needed. The existing harness is not a generic container recipe or a production Pi installer.

## Share what you found

Use [Discussions](https://github.com/cdaters/pidp11-webdesktop/discussions) for questions and exploratory ideas, and [Issues](https://github.com/cdaters/pidp11-webdesktop/issues) for reproducible bugs or proposed changes. Include your browser/OS, commit, steps, expected result and actual result. Say whether the evidence comes from simulation, an intercepted fixture, an isolated guest or your own hardware. Remove credentials, private addresses and personal guest data; report security issues [privately](SECURITY.md).

To contribute a patch, fork the repository on GitHub, clone your fork (or add it as a Git remote), create a topic branch, commit the focused change and open a pull request against `main`. Describe the problem and resulting behavior, list the checks actually run, and mention limits. Small improvements need no elaborate proposal. Discuss substantial features early so others can share context.

Write documentation in clear American English. Identify which shell or guest console runs a command, explain unfamiliar terms when needed, and distinguish tested results from plans. Keep substantial background in one place and link it. Preserve source notices, authentic screenshots and historical checkpoint tags. Changes must keep the original console and physical machine independent of the browser; hardware work needs deliberately prepared, authorized media and equipment.

Original contributions use the project's [MIT License](LICENSE); separately identified material keeps its terms. Include source/attribution with reference contributions. One asset question should not prevent unrelated improvements. Patient explanations, curiosity and respect for the people who built and preserve these machines matter here.


For terminal work, start with [personality conformance](docs/technical/terminal-personalities.md) and distinguish intercepted fixtures from the [genuine M5.6 lab](lab/m56/README.md). Graphics contributors should read the separate [4010 and VT11 paths](docs/technical/graphics-foundations.md). Future external applications need an explicit [capability boundary](docs/technical/companion-applications.md); this repository has no general plugin loader.
