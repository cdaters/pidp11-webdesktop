# M5.9.3 Phase A local model qualification

These are **Mac development commands**, not Pi instructions. Use existing installed runners and downloaded models only, after inspecting listeners, loaded models, ongoing workloads and memory. The [report](../../docs/lab/M5.9.3-A.md) records observed versions, limitations and inaccurate answers. `results.json` contains sanitized actual responses to synthetic prompts; it contains no credentials or real terminal capture.

`go run ./lab/m593a` requires `PIDP11_LOCAL_MODEL_TEST=1` and an explicitly named installed model. Its only endpoints are literal loopback Ollama 11434 and LM Studio 1234. It uses the real project adapter, four fixed prompts, the existing 20-second request deadline and 512-token output bound, then checks input rejection and a 100-ms deadline. Run one qualification at a time; do not mix a streaming probe into its timing run.

```sh
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593a -model qwen2.5-coder:14b
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593a -model qwen3:14b -no-thinking
```

The first chat can load an already installed model through the runner. This helper does not manage its lifetime. Record what your test loaded and unload only that model when finished; do not stop a runner or unload someone else's model. Inspect memory between models. The default-thinking Qwen 3 baseline was run without `-no-thinking`; three requests timed out. One separately recorded streaming probe overlapped part of that initial run, so those overlapping latency figures are not used as a benchmark. The first architecture timeout preceded that probe. A later isolated streaming repeat supplies the published warm Qwen 3 timing.

Discovery-only LM Studio verification does not request inference:

```sh
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m593a \
  -kind openai-compatible -model openai/gpt-oss-20b -models-only
```

It requires an already running, separately approved local server. The actual run briefly started the installed server with `lms server start --bind 127.0.0.1 --port 1234`, verified its bind and discovery, then used `lms server stop`. It did not load GPT-OSS: the 15.78-GiB estimate at context 4096 and observed swap pressure left insufficient conservative headroom. Do not turn this runbook into automatic model startup.

`stream.py` is an optional separate native Ollama timing probe. It uses one synthetic arithmetic prompt, 128 predicted tokens, temperature zero, context 4096 and a three-minute keep-alive. `PIDP11_LOCAL_MODEL_TEST=1 python3 lab/m593a/stream.py qwen3:14b no-thinking` measures first **content** and completion; it does not publish hidden reasoning. The companion itself deliberately uses nonstreaming replies, so its first visible answer arrives at completion. The probe does not establish a model's maximum context capability.

## Actual desktop acceptance

Build the embedded application and native Mac service, then provision a **new private** directory and an unused loopback HTTPS listener. The recorded test used `.research/m593a/config` and port 8448. Keep token/key permissions private. Configure the control socket inside that private directory, the actual loopback model endpoint, `models: ["qwen3:14b"]`, `ollama_think: false` and no fixture flag. Keep all terminal lines detached and command proposals disabled. No emulator or guest listener is needed.

Run the owned service manually without the Linux-only memory-containment flag; that Mac development exception is not permission to weaken the distributed Linux unit. `node lab/m593a/browser.mjs` reads only that new writer token and tests Chromium, Firefox and WebKit against the actual service. It verifies discovery, real generated output, deliberately pasted synthetic text, follow-up conversation, cancellation, detached lines and absence of terminal WebSockets. It writes private results and a real screenshot. Preserve the screenshot before a deliberate repeat.

The final recorded run followed an explicit model unload and service restart. Its first explicit Send reloaded the installed model; merely displaying the desktop did not infer or attach a guest. Never assume that model discovery means a model is loaded: LM Studio's inventory included the unloaded GPT-OSS entry.

Stop the owned desktop process and unload only the test model. Leave preexisting runner applications running, restore an originally stopped test-started API server to stopped, and verify the listener/model inventory. Keep private files outside commits. The normal Go/race, TypeScript, integration and focused browser tests exercise negative protocol and UI paths without inference.
