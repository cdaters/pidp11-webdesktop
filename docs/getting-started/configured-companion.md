# Using the optional configured companion

The offline guide works without a model. A configured companion can send your question, recent conversation and deliberately shared excerpt to an owner-selected Ollama or OpenAI-compatible service. The model can run on a capable Mac or another explicitly chosen host; the Pi does not need a model runtime. The desktop continues working when the provider is unavailable.

M5.9.1 verified this path with deterministic local HTTP fixtures. The existing explicitly configured local Ollama endpoint was unavailable. **A genuine model conversation remains untested.** No models or software were downloaded, no private cloud credentials were used and no nonlocal private model service was contacted.

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

This object belongs under the `companion` key in the existing configuration, not in a replacement configuration file. Loopback refers to the service host. A Pi service cannot reach a Mac model through the Pi's own loopback address. Use an explicitly reviewed HTTPS endpoint for another host; keep model credentials and traffic private.

For an OpenAI-compatible service, use `kind: "openai-compatible"`, its complete chat-completions URL, optional same-origin model-list URL and an approved model list. Verify compatibility with that provider. Native Ollama uses a different request/response shape. The service refuses redirects and unapproved models; it never downloads one. [Ollama discovery](https://docs.ollama.com/api/tags) and [OpenAI model listing](https://developers.openai.com/api/reference/resources/models/methods/list) describe the upstream dialects.

If needed, `token_file` names an absolute private regular file, owned by root or the service identity with mode 0600/0640. Keep it out of Git and browser assets. The service reads the token into memory and uses it only for the configured provider. Parent directories and group membership must remain reserved. Existing removal tooling deliberately refuses unknown private files: preserve/review an added provider token separately before requesting complete purge. Do not put a token in an endpoint URL.

Check the private configuration using the installed `webdesktop-service check` command, then manually start the protected service. Startup remains detached and does not call the provider. Use `fixture: true` only for a deterministic test endpoint; it labels responses visibly and does not create a model.

## Ask a question deliberately

1. Sign in through **Guest terminal** with the writer credential. This does not attach a guest or acquire its keyboard. Observer credentials cannot submit model requests.
2. Open **AI Companion**, then **Use configured provider**. Read the displayed destination. This step inspects local configuration only.
3. Select an approved model. **Test connection / list models** explicitly asks the provider for its inventory when discovery is configured; without a discovery URL, it returns only the local approved list and does not prove connectivity. A chat response is the actual request test.
4. Type a question. Optionally select terminal text and choose **Share selected text**, or paste a small excerpt into the companion. Review the exact text and source before sending. Provider changes clear the previous conversation and excerpt.
5. Choose **Send text to configured provider**. This sends the question, retained conversation, displayed excerpt/source and compact project reference notes. Nothing is sent automatically from another session. Cancel stops the local request; it cannot retract content already received by the provider. Clear or close discards local conversation state.

The backend allows one in-flight provider request, a 20-second timeout, at most 18 submitted conversation messages, 12,000 total input bytes, 4,096 bytes per message/excerpt and a bounded response. A limit error means shorten the excerpt or clear the conversation. Responses are suggestions, not observations of the machine; the model may be wrong. The supplied notes cover basic V7/RT-11 differences, octal, PDP-11 instructions and links to project documentation, not a complete historical reference library.

## Reviewing a suggested command

Chat never sends terminal input and model tool requests are rejected. A separate experimental review path must be enabled by the operator with `allow_readonly_command_proposals: true`; the default is false. Initially it admits only `pwd`, `ls` or `ls /`, each followed by Return. The user manually selects one of those suggestions; arbitrary model text is not parsed into executable commands.

After independently verifying the UNIX guest/context, acquire the terminal keyboard and open **Review a suggested UNIX command**. Enable review in that window, select a command and request exact-byte review. Inspect the displayed `\r` (Return), then approve once or cancel. The server expires the proposal after 30 seconds and binds it to the current attachment, window and keyboard lease. Reconnect or ownership change requires a new proposal. An uncertain write is never replayed. “Bytes delivered” does not prove the guest command succeeded.

Acceptance used a fake guest behind the actual installed ARM64 service in all three browser engines. No AI-generated command was executed in a genuine guest. There is no authority over a host shell, SIMH monitor, boot, shutdown, media or physical panel.
