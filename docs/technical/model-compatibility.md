# Model compatibility and qualification

A provider that returns text is not necessarily a reliable historical tutor. Keep the offline reference desk and exact calculator available regardless of the selected model. [Phase B results](../lab/M5.9.3-B.md) preserve actual responses, resource observations and limitations; the [Phase A record](../lab/M5.9.3-A.md) remains unchanged.

## Tested interfaces

| Interface | Application behavior |
|---|---|
| Native Ollama `/api/chat` | Explicit approved model, optional thinking preference, no streaming/tools, active context 4096 and output limit 512 |
| OpenAI-compatible chat completions | Explicit approved model and optional private token; one completed text choice, no tool calls; output limit 512 |
| Model listing | Explicit user action; intersection with the owner's allowlist, no installation or automatic fallback |
| Model-host gateway | Native Ollama behind a restricted OpenAI-compatible chat-only façade; separate token/TLS, no runner-management routes |

Ollama's model tags can select different runtimes and formats. Record the installed manifest/digest and `/api/show`, not just a marketing name. In this evaluation, Qwen3.5's explicit `9b-q4_K_M` used GGUF/llamacpp, while `gemma4:12b` selected safetensors/NVFP4/MLX on the Mac. The initially attempted `gemma4:12b-q4_K_M` tag did not exist and downloaded no model; its base 12B tag was then used. Do not assume tag spellings from another family.

The [Ollama Qwen3.5 listing](https://ollama.com/library/qwen3.5:9b-q4_K_M), [official Qwen model card](https://huggingface.co/Qwen/Qwen3.5-9B) and [Ollama Gemma 4 12B listing](https://ollama.com/library/gemma4:12b) were consulted before selection. The retrieved model license records identify Apache 2.0. The project distributes no weights and implies no model-provider endorsement. Runner 0.40.16 already supported both; no runtime upgrade was needed.

## Context and failures

The native context is now explicitly 4,096 tokens rather than inherited from runner preferences. Message, excerpt and total-byte bounds remain in force, but bytes and model tokens are different measures. The service does not have each provider's tokenizer. Long conversations can reach a model's context limit before the byte limit; clear the conversation and shorten excerpts rather than assuming all retained text was processed. This milestone qualifies short exchanges, not full-context recall.

The adapter rejects malformed, overlarge, incomplete or tool-bearing responses. Unavailable runner, timeout and caller cancellation are separate failures. Nothing retries a prompt or switches a provider automatically. The runner may keep working briefly after transport cancellation; closing a request does not retract submitted text or prove immediate GPU idleness.

An explicitly submitted chat can load an installed model that was unloaded. Inspection of desktop configuration does not contact the provider; model listing does not download one. Removing a model makes it unavailable until the owner deliberately restores it. The desktop cannot invoke pull/create/delete APIs.

## Choosing responsibly

Use one loaded model at a time on the tested 24-GiB Mac. A 4K context does not mean a 4K memory footprint. Weight format, runtime caches, other applications and retained swap all matter. An unloaded model may leave macOS swap allocated; do not purge memory or terminate unrelated apps to improve a benchmark.

The qualification asks identical architecture, instruction, OS, terminal, peripheral, uncertainty and injection questions raw and with references. It records sampling defaults and single samples; the results are not a general leaderboard. Unsupported extra detail counts against an otherwise plausible answer. Valid citation IDs only establish that the note was supplied, not that the claim is entailed by it. Arithmetic belongs in the exact calculator even if a model happened to get one conversion right.
