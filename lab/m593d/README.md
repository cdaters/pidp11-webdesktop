# Phase D reproduction

Use the **Mac development shell** and disposable ARM64 Linux only. The [report](../../docs/lab/M5.9.3-D.md) separates genuine inference, synthetic excerpts, transport fixtures, historical source review and absent physical/genuine-guest acceptance. Preserve previous evidence and accepted tags. No command here authorizes a physical Pi connection.

## Source checks and evaluation

From the repository root:

```sh
go vet ./...
go test -race ./...
npm run check
npm test
npm run test:integration
npm run build:server
go run ./lab/m593d/evaluation
go run ./lab/m593d/evaluation -corpus lab/m593d/evaluation/coverage-addendum.json
go run ./lab/m593d/review
```

The evaluator reports misses rather than requiring broad recognition to pass. The 30-case corpus and eight-case supplement are separate from development unit tests. The replay reads the published 45-response Phase C evidence; it is explicitly a regression check. Source review was independent of the model, but not a separate expert reviewer. Published cases/results are synthetic or public historical material; no private terminal transcript belongs here.

Run Vite on loopback 5173 and the mock backend on 8081. With those development processes running:

```sh
PIDP11_TEST_BACKEND=http://127.0.0.1:8081/ npm run test:browser
node lab/m593d/desktop-demo.mjs
```

The regression suite uses Chromium, Firefox and WebKit. The separate demo captures the real simulation UI; it does not connect to a guest. Preserve accepted screenshots and move generated `m431-test-*` captures into a new private evidence directory.

## Fresh local-model comparison and browser conversation

Inventory existing model work and available memory before loading anything. Use the already installed loopback Ollama `gemma4:12b`; do not download a model as part of this recipe. Create a fresh `.research/m593d` evidence directory and preserve the Phase C catalog:

```sh
git show 8ca8187:internal/companion/references.json > /absolute/private/phase-c-references.json
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593d \
  -baseline /absolute/private/phase-c-references.json \
  -output /absolute/private/new-model-D.jsonl
```

This single Phase D pass uses the 15 retained questions and `d` note IDs, with 4,096 context, 512 output tokens, thinking off and 20-second deadline. The baseline file is validated for the shared comparison harness; retained C results supply the comparison, not another contemporaneous C run. Do not call this an unseen-question benchmark. Grade the entire explanation against the specified expected result; correct final numbers with wrong derivations do not pass.

`browser.mjs` expects a newly provisioned native service configuration at `.research/m593d/config`, HTTPS loopback 8448, local private control socket and the configured native model as described in the [companion guide](../../docs/getting-started/configured-companion.md). Build `cmd/webdesktop-service`, use its `provision` command, set the private companion fields, then start it manually with `serve -config ...`. All guest lines stay detached. The harness trusts only its temporary browser context and sends explicitly synthetic text. It tests real conversations, local `/calc`/`/fact` bypass, sources, follow-up and cancellation in all three engines and writes separate screenshots/results.

## Actual optional application and separate-network test

Requires Docker, Go, Python, OpenSSH, OpenSSL, Playwright browsers and the existing local model. These are development dependencies, not a Pi deployment stack. Use a fresh `.research/m593d/cross-host`; existing output causes refusal. First prepare the exact upstream checkout as in the [optional integration instructions](../../integrations/hacker-replicant/README.md), at `.research/m593d/upstream`, and install its pinned dependencies with `npm ci --ignore-scripts`.

```sh
docker build -t pidp11-m593d-lab:local -f lab/m593c/Dockerfile .
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593d/model-gateway ./cmd/model-gateway
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593d/model-client ./lab/m593d/client
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593d/selection-adapter ./cmd/replicant-adapter
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593d/model-faults ./lab/m593d/faults
python3 lab/m593d/cross-host.py
```

Run qualification and the network test sequentially to avoid model contention. Reserve Mac loopback ports 2223 and 8510 and the exact `pidp11-m593d-*` container/network names. The two 256-MiB/one-CPU containers have separate process/network namespaces; model access crosses authenticated SSH forwards and TLS. Only temporary SSH and the companion’s TLS byte relay are published to Mac loopback. The relay is a **lab-only** way for the Mac browser to reach the actual Node application; the app retains independent TLS authentication. `localhost` for the app and `127.0.0.1` for the desktop are distinct browser hostnames.

The script generates fresh private SSH identities, separate credentials and a one-day lab certificate. It verifies positive/negative authentication, genuine model chat, explicit loss/recovery, host/client restarts, actual upstream UI sharing/reference retrieval, expired identity, revocation, origin refusal and disabled tools. `replicant-cancellation.mjs` uses the separately labeled slow fixture to prove Cancel-button and browser-disconnect propagation. No model fixture is counted as a genuine answer.

The `finally` block retains private evidence, then removes only its named containers/networks and owned SSH process. Check `results.json` for `pass:true` and any cleanup errors. Preserve failed attempts under new private names before retrying; do not delete evidence or loosen validation. The original upstream clone, unrelated containers and owner’s runner are left alone.

## Exact ARM64 package lifecycle

Build a new immutable package from the intended code commit:

```sh
GOFLAGS=-buildvcs=false sh packaging/build.sh /absolute/path/to/new-package
```

Use an isolated `pidp11-m593d` Debian Trixie ARM64 OrbStack VM with `--isolated --isolate-network --memory 1G --cpus 2 --disk 4G`. Bring external `eth0` down. Transfer only the candidate, the genuine previous Phase C package and lab helpers through the VM control interface; no shared host folders, emulator or media are needed. Preserve package hashes and actual source revision.

Follow the established [systemd lab setup](../m56/setup-systemd.sh), retaining every distributed hardening directive. OrbStack’s global overrides require reasserting those exact directives locally, as described in Phase C; this is not a production override. `lifecycle.py` verifies restart identity, detached lines and revoked sessions. Run `memory-readiness.sh` **inside the named guarded VM** with `PIDP11_ISOLATED_LAB=1`; it temporarily places the service in a slice without memory-controller access, verifies refusal before HTTPS, and restores protected startup.

Stop the companion before selecting the actual old package, verify its hash, start detached, stop again and return to the exact candidate. Verify private configuration against its pre-upgrade digests. For short latency observations, authenticated curl against loopback `/api/v1/terminals` avoids installing Python in the minimal VM; measure `time_total`, not VM-control round-trip overhead. This does not qualify LAN/guest latency or sustained CPU budgets.

Exercise the package’s explicit full-removal option only in this disposable VM. Verify account, known private configuration, installation directory and listener removal; remove the lab-owned override separately. Save measurements before deleting the exact task VM. Stop native test servers/tunnels and unload a model only if this task loaded it and no unrelated inference is running. Do not terminate an owner’s runner or unrelated applications.
