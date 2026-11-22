# Phase B reproduction

All commands here are for the **Mac development shell** unless marked otherwise. No physical Pi, original media or hosted inference provider is involved. Read the [results](../../docs/lab/M5.9.3-B.md) and [reference design](../../docs/technical/historical-reference-library.md) before interpreting the scores.

## Model questions

Inventory free storage, active models and memory first. Keep at least 20 GiB free on the system volume during downloads. Record model identity/configuration before removing a superseded model. Use one loaded model at a time; the benchmark does not stop another workload or download anything.

With an explicitly approved, installed native Ollama model and the existing loopback API:

```sh
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593b \
  -model your-installed-model -output /absolute/path/to/new-results.jsonl
```

The output path must not exist. The harness asks the same 15 synthetic questions raw and with bounded retrieved notes. It uses the actual provider adapter, 4,096 active context, at most 512 output tokens, thinking disabled and a 20-second request timeout. Sampling otherwise uses the model's runner defaults. It never sends a private terminal capture. Each line records the question, expected checks, actual answer, elapsed completion time and citation-ID validation. Review the prose as well as the checks: a valid citation ID does not prove a correct statement. Single samples are not a statistical knowledge benchmark.

The saved comparison used the same catalog for all three models. Results are retained in `results/`; notes and prompts are public original text, not model weights or private configuration. Questions overlap the curated topics, so this is a retrieval/transport experiment rather than an independent general-knowledge examination. Separate browser conversations qualify application behavior.

## Automated checks

From the repository root:

```sh
go vet ./...
go test -race ./...
npm run check
npm test
npm run test:integration
npm run build:server
```

`browser-tests/m593b.spec.ts` exercises offline search, ambiguity and exact values without a provider. The existing M591/M592/M593 cases protect selected-text consent, source selection, guest approval and peripheral behavior. Follow the existing development guide to start Vite and the mock backend for the full three-engine suite. Fixtures are not genuine guest or model evidence.

`browser.mjs` uses a real locally configured model through the authenticated compiled service. It expects a newly provisioned private lab configuration at `.research/m593b/config`, loopback HTTPS 8448 and detached guest endpoints. It deliberately shares a synthetic excerpt, verifies sources, arithmetic, conversation/cancellation and zero guest sockets. It must not overwrite an accepted earlier screenshot.

## Disposable ARM64 tests

The lab is a fresh, isolated `pidp11-m593b` Debian Trixie ARM64 OrbStack VM, 1 GiB RAM, two CPUs, 4 GiB disk, without host-folder sharing. No original simulator or guest media is installed. Package creation uses the existing `packaging/build.sh` into a new private directory. Transfer only that candidate, test binaries and lab helpers through the VM control interface. The retained Phase A package is not replaced.

Service rehearsal reuses `lab/m56/setup-systemd.sh` with the documented awk equivalent of its Python override generation. Reassert the shipped hardening settings against OrbStack's type-wide override. Configure loopback HTTPS 8445, manually start, and leave boot enablement disabled. `lifecycle.py` requires the exact VM name and external interface DOWN; it verifies fresh instance, detached lines and revoked prior sessions after restart. A copy of `lab/m591/memory-readiness.sh` with the VM name/port substituted verifies missing-memory-controller refusal and recovery. No host boot setting changes.

For transport, install OpenSSH server **only in this disposable VM**, preventing package-service autostart during preparation; then bring its external interface DOWN. Compile `cmd/model-gateway` and `lab/m593b/fixture` for Linux ARM64, transfer them as `/tmp/model-gateway` and `/tmp/model-fixture`, and run `transport.sh` inside the VM. It verifies its hostname/architecture/network guard before acting. It creates fresh, private lab keys/certificate/token under `/root/m593b-transport`, never reusing owner credentials.

The script starts a loopback-only SSH daemon with a key restricted to forwarding one target, a TLS gateway and a labeled deterministic runner. It pins the fresh SSH host key and validates the TLS certificate, exercises auth/chat/refused management, then tests runner loss and tunnel loss. Owned child processes are stopped by a cleanup trap. This tests the tunnel mechanism between processes within an isolated ARM64 VM, **not an actual Pi-to-Mac link**, host account setup, Internet exposure or a live model across machines.

A first rehearsal put keys below `/tmp`; OpenSSH correctly refused that writable ancestor with StrictModes enabled. The retained corrected script uses `/root`, retaining StrictModes. Do not weaken SSH checks to obtain a pass.

After evidence collection, stop the optional service, verify no owned gateway/tunnel remains, remove the exact disposable VM and unload the model loaded for the test. Preserve private results and public sanitized records. Do not contact the physical Pi during reproduction.
