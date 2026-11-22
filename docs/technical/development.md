# Development and tests

Work on a local clone. The normal demonstration does not require a Pi. The normal application remains a mock desktop. M5.3 adds a separate terminal-only pilot command while retaining the proven M5.0 bridge and laboratory safeguards. Read the [coding standards](CODING-STANDARDS.md) and [source map](SOURCE-MAP.md) before changing a subsystem.

## Browser development

Requirements: Node.js **22.18 or newer** and npm, matching the repository's engine requirement. From a Mac, Linux or compatible Windows development shell:

```sh
git clone https://github.com/cdaters/pidp11-webdesktop.git
cd pidp11-webdesktop
npm ci
npm run dev
```

Open the loopback URL Vite prints. The browser-only desktop uses simulated panel/media data. This is a local developer preview, not a hosted demo or Pi connection. Stop it with Ctrl-C.

## Embedded Go service

Go **1.25 or newer** is required. On the tested Mac development host:

```sh
sh scripts/build.sh
./bin/webdesktop-macos
```

Open `http://127.0.0.1:8080/?backend=mock` for the shared mock backend. It has no emulator/GPIO integration. For a native Linux development build, run `npm run build:server`, `mkdir -p bin`, then `CGO_ENABLED=0 go build -o bin/webdesktop ./cmd/webdesktop` and start `./bin/webdesktop`. These commands run in the Linux development shell, not on the owner's Pi. Windows-native development has not received the same validation as the recorded Mac environment.

The Mac build helper also creates a static Linux ARM64 mock executable. This is not a production terminal installer. `npm run build` creates `dist/prototype.html`, a self-contained offline demonstration whose policy disables network connections. The original M0 prototype is separately preserved under `checkpoints/m0/`.

## Focused checks

```sh
npm run check
npm test
npm run test:integration
go vet ./...
go test -race ./...
npm run build
```

The TypeScript integration command uses a deterministic socket fixture. Go package tests cover real local HTTP/WebSocket interoperability; neither is a genuine guest test.

For browser checks, install the Playwright engines locally if needed with `npx playwright install`. Start Vite on port 5173 and the built mock service on port 8080 in separate shells, then run `npm run test:browser`. The suite covers Chromium, Firefox and WebKit. Native Safari is a distinct test target; a WebKit pass is not a native Safari result.

The M5.0 baseline records 46 TypeScript tests, one transport integration test and 45 desktop browser cases, alongside Go race checks and genuine guest acceptance. Counts can change with later contributions. Existing browser tests may write capture files under `docs/screenshots`; inspect changes before committing. Do not replace an accepted baseline screenshot unintentionally.

## Genuine guest laboratory

Follow the [M5.0 runbook](../lab/M5.0-runbook.md). Its current automation targets the existing **OrbStack `orbstack` Docker context on an ARM64 Mac**. It is not a generic Docker Desktop/Windows/Linux recipe. A contributor port should retain network isolation, disposable media and independent console access, and report its actual environment.

The first image build fetches pinned public upstream source/packages. Runtime guest tests use a disposable network-none container; containers are development tools, not a proposed Pi deployment dependency. Guest media is obtained separately and verified. No disk images, credentials, container images or emulator binaries are distributed in this repository.

For the new single-line pilot binary, follow the [M5.3 lab replay](../../lab/m53/README.md). The actual-Pi result and cleanup are recorded in [M5.3](../lab/M5.3.md); replaying that hardware work requires separate authorization.

If port 8080 is occupied, start your own mock server on another loopback port and set `PIDP11_TEST_BACKEND` for the artifact tests, for example `PIDP11_TEST_BACKEND=http://127.0.0.1:8081/ npm run test:browser`. Do not stop an unrelated service.

The original guest browser script is `lab/m50/browser.mjs`. The intercepted fixture is `browser-tests/guest.spec.ts`. Keep those evidence categories distinct. Do not rerun long control/stress campaigns for a prose or screenshot change.

## Installation-guide checks

```sh
python3 docs/installation/tests/test_guide.py
```

These checks exercise documented helpers in temporary fixtures and syntax-check command blocks. They do not execute a real installation, contact a Pi, open a card device or boot a guest. See [the test scope](../installation/tests/README.md).

Please read [CONTRIBUTING](../../CONTRIBUTING.md), retain notices, and include the relevant actual test results in a pull request.


## M5.5.1 diagnostics and optional service

Use the [M5.5.1 lab instructions](../../lab/m551/README.md) for the offline original-C scanner oracle, detached-service lifecycle, actual V7 browser checks and repeatable transport benchmarks. The relevant browser fixture command is `npx playwright test browser-tests/guest.spec.ts` with Vite running; it is separate from `lab/m551/browser.mjs`, which uses a genuine disposable guest.

Build the optional installation candidate with `sh packaging/build.sh FRESH_OUTPUT_DIRECTORY`. Do not use the existing `terminal-pilot` as an installed service: it retains its supervised one-shot startup connection. The new service, setup/private-file requirements, explicit local attachment and companion-only uninstall are described in [M5.6 implementation](../lab/M5.6-implementation.md). Actual Pi access still requires separate authorization.

M5.9 adds [repeatable terminal/graphics and package checks](../../lab/m59/README.md). Genuine V7 plotting and installed ARM64 desktop checks remain separate from intercepted browser fixtures. [Setup paths](../getting-started/installation-paths.md) describe the candidate distribution boundary.

## M5.11 focused checks

Run `npm run test:replicant` for isolated optional-app route tests (no model or upstream process). `go test ./internal/peripheral -run '^$' -bench BenchmarkRetainedSpoolPoll -benchmem` measures the bounded retained-window check on a real temporary file. [M5.11 laboratory instructions](../../lab/m511/README.md) keep genuine guests, synthetic transport loads and real-model evidence distinct. Prior screenshots use their existing defaults; `M59_GRAPHICS_SCREENSHOT` and `M592_SCREENSHOT` provide separate capture destinations for new runs.
