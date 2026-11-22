# Actual evaluation evidence

These files preserve generated answers, including **incorrect facts, calculations and command suggestions**. They are test output, not operating instructions. Do not copy a model's guessed administration commands into a guest.

- `qwen3.json`, `qwen35.json`, `gemma.json`: 15 raw and 15 reference-assisted replies from each actual local model, with elapsed times and expected checks. Citation validity checks IDs only; raw-run flags are diagnostic, not a claim that retrieval was supplied.
- `references.json`: original catalog snapshot used for the 90-response comparison. The final installed instruction note has additional definitions and a corrected handbook section locator. Preserve this snapshot to explain the earlier failures.
- `addressing-followup.json`: three differently worded Gemma probes against the strengthened note, including remaining errors. These are not a replacement for the baseline responses.
- `browser.json`: final genuine three-engine conversations through the authenticated desktop using deliberately synthetic terminal text. No guest was attached.
- `stream.json`: separate native first-content timing probe; its arithmetic is wrong.
- `acceptance.json`: sanitized test counts, final package hash, ARM64 startup snapshot and cleanup observations. The reload timing summary records the earlier explicit unload/reload run; final browser replies are preserved separately.
- `integrity.json`: SHA-256 of the exact questions and initial catalog.

[Interpretation and limits](../../../docs/lab/M5.9.3-B.md) · [Reproduction](../README.md).
