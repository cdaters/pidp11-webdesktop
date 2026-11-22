# Using the optional configured companion

The offline guide works without a model. A configured companion can send your question, recent conversation and deliberately shared excerpt to an owner-selected Ollama or OpenAI-compatible service. The model can run on a capable Mac or another explicitly chosen host; the Pi does not need a model runtime. The desktop continues working when the provider is unavailable.

M5.9.3 Phase B verified genuine Gemma 4 12B conversations in Chromium, Firefox and WebKit, with reference retrieval and an exact calculator. Gemma is an experimental option, not a trusted historical or arithmetic authority. Keep the offline desk as the default and inspect source passages. Earlier Qwen results and the inventory changes are preserved in the [Phase B report](../lab/M5.9.3-B.md). No hosted inference or physical Pi was used.

## Configure the host

These are configuration instructions for a **separately authorized service host**, not permission to deploy to the Pi. Stop the companion, preserve its private configuration and add an optional `companion` object. Choose an actually installed model; the example name is a placeholder.

```json
{
  "kind": "ollama",
  "endpoint": "http://127.0.0.1:11434/api/chat",
  "models_endpoint": "http://127.0.0.1:11434/api/tags",
  "models": ["your-installed-model"]
}
```

This object belongs under the `companion` key in the existing configuration, not in a replacement configuration file. Loopback refers to the service host. A Pi service cannot reach a Mac model through the Pi's own loopback address. Use an explicitly reviewed HTTPS endpoint or authenticated private tunnel for another host; keep model credentials and traffic private. See the [host-side transport design](../technical/hosted-local-companion.md).

For an OpenAI-compatible service, use `kind: "openai-compatible"`, its complete chat-completions URL, optional same-origin model-list URL and an approved model list. Verify compatibility with that provider. Native Ollama uses a different request/response shape. The service refuses redirects and unapproved models; it never downloads one. [Ollama discovery](https://docs.ollama.com/api/tags) and [OpenAI model listing](https://developers.openai.com/api/reference/resources/models/methods/list) describe the upstream dialects.

If needed, `token_file` names an absolute private regular file, owned by root or the service identity with mode 0600/0640. Keep it out of Git and browser assets. The service reads the token into memory and uses it only for the configured provider. Parent directories and group membership must remain reserved. Existing removal tooling deliberately refuses unknown private files: preserve/review an added provider token separately before requesting complete purge. Do not put a token in an endpoint URL.

Check the private configuration using the installed `webdesktop-service check` command, then manually start the protected service. Startup remains detached and does not call the provider. Use `fixture: true` only for a deterministic test endpoint; it labels responses visibly and does not create a model.

## Ask a question deliberately

1. Sign in through **Guest terminal** with the writer credential. This does not attach a guest or acquire its keyboard. Observer credentials cannot submit model requests.
2. Open **AI Companion**, then **Use configured provider**. Read the displayed destination. This step inspects local configuration only.
3. Select an approved model. **Test connection / list models** explicitly asks the provider for its inventory when discovery is configured; without a discovery URL, it returns only the local approved list and does not prove connectivity. A chat response is the actual request test.
4. Type a question. Optionally select terminal text and choose **Share selected text**, or paste a small excerpt into the companion. Review the exact text and source before sending. Provider changes clear the previous conversation and excerpt.
5. Choose **Send text to configured provider**. This sends the question, retained conversation, displayed excerpt/source and compact project reference notes. Nothing is sent automatically from another session. Cancel stops the local request; it cannot retract content already received by the provider. Clear or close discards local conversation state.

The backend allows one in-flight provider request, a 20-second timeout, at most 18 submitted conversation messages, 12,000 total input bytes, 4,096 bytes per message/excerpt and a bounded response. A limit error means shorten the excerpt or clear the conversation. Responses are suggestions, not observations of the machine; the model may be wrong. The source library covers focused historical topics and explicitly marks missing RSTS/E/PLUS operational coverage. See the [reference desk and exact calculator](../technical/historical-reference-library.md).

## Reviewing a suggested command

Chat never sends terminal input and model tool requests are rejected. A separate experimental review path must be enabled by the operator with `allow_readonly_command_proposals: true`; the default is false. Initially it admits only `pwd`, `ls` or `ls /`, each followed by Return. The user manually selects one of those suggestions; arbitrary model text is not parsed into executable commands.

After independently verifying the UNIX guest/context, acquire the terminal keyboard and open **Review a suggested UNIX command**. Enable review in that window, select a command and request exact-byte review. Inspect the displayed `\r` (Return), then approve once or cancel. The server expires the proposal after 30 seconds and binds it to the current attachment, window and keyboard lease. Reconnect or ownership change requires a new proposal. An uncertain write is never replayed. “Bytes delivered” does not prove the guest command succeeded.

Acceptance used a fake guest behind the actual installed ARM64 service in all three browser engines. No AI-generated command was executed in a genuine guest. There is no authority over a host shell, SIMH monitor, boot, shutdown, media or physical panel.

## Historical reference desk and sharing scope

M5.9.2 includes a small reference desk for UNIX V7, RT-11, RSX-11, 2.11BSD, octal/PDP-11 instructions and peripherals. Expand it, choose a topic, read the note and follow its source link. These curated notes are available without a provider. Selecting a topic does not send a request. **Use this question** fills the question field; the selected reference is included only when you choose **Send text to configured provider**.

Before sending, review the destination, model, retained-message count, selected-text byte count and source shown above the conversation. The sharing section shows the actual excerpt. Terminal output is untrusted reference data, never permission to run commands. Clear the excerpt or chat when it should no longer be included. Changing providers clears retained conversation/sharing state. The service validates reference IDs and uses the same curated catalog as the browser; model-generated replies remain separately labeled.

The configured path limits each message and shared excerpt to 4,096 UTF-8 bytes, retained input to 12,000 bytes and 18 messages. Multibyte text therefore reaches the limit sooner than its character count might suggest. Existing provider timeouts, cancellation, response limits and private credential storage remain in force. No model runtime is required on the Pi. The older M5.9.2 local-model probe found no reachable authorized service; its screenshot uses a labeled fixture. Phase A separately records genuine local inference.

Command review now names the terminal and attachment generation alongside exact escaped bytes and expiration. Expired review disappears and cannot be approved. Keyboard ownership and the server's single-use/generation checks remain authoritative; closing a window or losing a response never causes a retry. These controls remain disabled by default and separate from chat.

## Historical Phase A Qwen 3 configuration

On the **Mac development service host**, after confirming Ollama is running locally and this model is already installed, the tested optional object is:

```json
{
  "kind": "ollama",
  "endpoint": "http://127.0.0.1:11434/api/chat",
  "models_endpoint": "http://127.0.0.1:11434/api/tags",
  "models": ["qwen3:14b"],
  "ollama_think": false
}
```

There is no `fixture` flag: these are real model replies. `ollama_think` is optional and applies only to native Ollama. Omission preserves the model's default, which exceeded the 20-second deadline on three of four tested Qwen 3 prompts. Explicit false affects this application's requests only; it changes no model files or global preferences. It is not a general switch for OpenAI-compatible providers.

Check `ollama ps` and memory before inference. The recorded runtime used context 4096 and roughly 9 GB of loaded model memory on a 24-GiB Mac; swap increased materially. Do not load multiple large models or interrupt another user's active model. Discovery is not a load-status check. An explicit chat can reload an already downloaded model after unload; the application does not install it. Use short selections rather than assuming the advertised maximum context is active.

Timeout, cancellation and unavailable-server errors now have distinct messages. A response cut off by the Ollama output limit is refused instead of presented as complete. Shorten the question, review the runner's state, or use the offline guide; there is no automatic retry. To end an owned test, close the companion request, stop only the test desktop process, and unload only the model that test loaded. Leave preexisting runner applications alone.

Phase A also tested `qwen2.5-coder:14b` without `ollama_think`. Its API worked, but it gave wrong hexadecimal/addressing answers. That model and the untested GPT-OSS weights were subsequently removed in Phase B; this historical record is not the current inventory. [Reproducible bounded tests](../../lab/m593a/README.md).

## Current experimental Gemma configuration

For the **Mac model host**, with the exact model already installed in Ollama, the current tested companion object is:

```json
{
  "kind": "ollama",
  "endpoint": "http://127.0.0.1:11434/api/chat",
  "models_endpoint": "http://127.0.0.1:11434/api/tags",
  "models": ["gemma4:12b"],
  "ollama_think": false
}
```

Phase B used Ollama 0.40.16 and the Apple Silicon MLX/NVFP4 variant, approximately 7.71 GB on disk and 8.5 GB reported loaded. The application now explicitly requests a 4,096-token context and at most 512 output tokens. Use the [model compatibility guide](../technical/model-compatibility.md) rather than assuming every tag selects the same format. The earlier Qwen models and untested GPT-OSS weights were removed after restore records were preserved; the old examples describe earlier qualification, not the final installed inventory.

Open **Search historical references** for offline lookup. Before sending a model question, inspect the system filter and the checkbox that includes up to two matched notes. An explicitly selected reference topic takes precedence. Returned passages are available below the answer, with actual catalog links and incomplete-coverage labels. Unknown citation IDs cause the answer to be withheld; correct IDs do not prove the model's explanation is correct.

Use **Exact PDP-11 values** for arithmetic. Its locally computed result remains separate from generated text. No model or guest is contacted by the calculator or offline search. The optional cross-host gateway is a separate, manual model-host program; [its isolated transport test](../../lab/m593b/README.md) does not authorize Pi deployment or changes to Mac SSH settings.
