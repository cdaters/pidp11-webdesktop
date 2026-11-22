# Phase C reproduction

Use the **Mac development shell** and disposable ARM64 Linux only. The [report](../../docs/lab/M5.9.3-C.md) distinguishes actual Gemma responses, protocol fixtures and absent genuine guest acceptance. Nothing here authorizes physical Pi access. Preserve earlier evidence; the harnesses create new private output directories and must not overwrite a prior run.

## Local checks and model comparison

From the repository root, run Go vet/race, `npm run check`, `npm test`, `npm run test:integration` and `npm run build:server`. Start Vite on loopback 5173 and the mock binary on 8081, then run:

```sh
PIDP11_TEST_BACKEND=http://127.0.0.1:8081/ npm run test:browser
```

`m593c.spec.ts` covers local calculations and simultaneous claim-review/source display in Chromium, Firefox and WebKit. The shared retrieval cases also protect Go/TypeScript parity. `claim-cases.json` is a constructed adversarial rule corpus, not general factual accuracy evidence.

For actual model questions, inventory free memory/disk and existing inference work first. The harness requires the already installed `gemma4:12b` at native loopback Ollama. It downloads nothing and sends only synthetic prompts/public notes. Preserve the Phase B catalog in a private new file with `git show ef9a057:internal/companion/references.json`. Then:

```sh
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593c \
  -baseline /absolute/path/to/baseline-references.json \
  -output /absolute/path/to/new-private-results.jsonl
```

Questions are fixed before inference. Each mode uses common PDP-11/system framing, at most 90 requested words, 4,096 context, 512 output tokens, thinking off and a 20-second deadline. Selected note IDs are explicit; this does not benchmark automatic retrieval. Review the entire response, not just final numbers or citation validity. Published judgments and response copies contain only synthetic questions. Keep actual private terminal excerpts out of this harness.

## Separate-network and upstream laboratory

Requires Docker in the existing ARM64 Mac environment, Go, Python, OpenSSH tools, OpenSSL, and the existing local runner. It uses no Pi SSH alias. Build the disposable image and probes:

```sh
docker build -t pidp11-m593c-lab:local -f lab/m593c/Dockerfile .
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593c/model-gateway ./cmd/model-gateway
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593c/model-client ./lab/m593c/client
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593c/selection-adapter ./lab/m593c/adapter
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o .research/m593c/model-faults ./lab/m593c/faults
```

The Dockerfile installs ordinary lab dependencies; it is not a production package. Obtain the upstream source at `6f8a2aca7786736e01bdf5ba9b44bf66a7f19349`, export that revision into a fresh `.research/m593c/replicant-upstream`, and run `npm ci --ignore-scripts` there. The upstream server source is unchanged. Its dependencies are development-only and are not incorporated into the desktop package.

Run `python3 lab/m593c/cross-host.py`. It requires a fresh `.research/m593c/cross-host` directory and free task names/loopback SSH port 2223. It creates two 256-MiB containers, an internal network and a management network. Only model-host SSH is published at Mac loopback. The production gateway and runner forwards bind loopback inside their namespaces. The client never receives the host's private SSH key. The script waits for the separate synthetic question series before model probes when its expected private result file exists; run qualification separately to avoid contention.

The script verifies identities/authentication, real chat, deliberate losses/restarts, refused keyboard input, a labeled selected-text fixture and the actual upstream chat with tools OFF. Direct upstream prompt rejection is expected. `replicant-shim.mjs` is an explicitly lab-only bounded translator, including the unknown-status workaround. It is not a deployment recipe. The timeout/cancellation stage uses `model-faults`, not an inference result. It verifies 20-second provider expiry, concurrent refusal and runner cancellation counters.

A `finally` block removes only named task containers/networks and the owned Mac SSH process, after retaining private logs. Inspect the final `pass` and cleanup results. On failure, read retained evidence before retrying; move the failed run directory to a new evidence name rather than deleting it. Unrelated containers and the owner's runner stay untouched.

## Real browser and ARM64 package

`browser.mjs` expects a freshly provisioned private native service configuration at `.research/m593c/config`, loopback HTTPS 8448 and the installed model. Build the native service, use its `provision` command, set a local private control socket and native Ollama companion configuration as in the configured-companion guide, then start it manually. All guest endpoints must remain detached. The browser harness deliberately trusts only this temporary test context, uses a labeled synthetic excerpt, checks calculation bypass/review, and saves separate Phase C screenshots. No intercepted route supplies the model response.

Create a disposable `pidp11-m593c` Debian Trixie ARM64 OrbStack VM with `--isolated --isolate-network --memory 1G --cpus 2 --disk 4G`. Bring its external interface down. Build a fresh package with `packaging/build.sh`; transfer only the candidate and helpers through the VM control interface. No host folders, emulator or media are needed.

Use the established `lab/m56/setup-systemd.sh` procedure with the documented awk substitute for Python override generation (see Phase B), preserving all shipped hardening settings. Then `lifecycle.py` verifies restart identity, detached lines and revoked sessions; `memory-readiness.sh` inside the exact guarded VM verifies startup refusal when memory containment is unavailable. Stop the companion before selecting a prior/candidate release. Verify hashes and private configuration, then exercise complete removal using the package's explicit purge option only in this disposable VM. Remove the exact VM after saving results. Never apply the lab overrides to the physical Pi.
