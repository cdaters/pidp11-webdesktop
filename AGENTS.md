# PiDP-11 Web Desktop working instructions

These instructions are self-contained for a standalone clone. Start with [CONTRIBUTING.md](CONTRIBUTING.md), the [coding standards](docs/technical/CODING-STANDARDS.md), and the [source map](docs/technical/SOURCE-MAP.md). No private workspace or AI tool is required for ordinary development.

## Engineering boundaries

- Keep the optional companion small: Go, TypeScript, HTML5, SVG and established emulator interfaces. SIMH/REALCONS own simulation; the demonstration model is not a replacement CPU.
- Keep physical switches/LEDs, the original console, SSH, GNU Screen, supported serial terminals and guest lifecycle independent of the browser.
- Do not discover, contact, SSH to, modify or deploy to the owner's Raspberry Pi without explicit authorization for the current task. Backup completion and public milestones do not authorize integration. Do not begin the live terminal pilot implicitly.
- Use the documented disposable, network-none Linux lab for local emulator/RPC interoperability, with verified public disposable media and no GPIO or production access. Hardware pilots are separately authorized, narrowly scoped work; see the completed [M5.3 terminal pilot](docs/lab/M5.3.md). Containers are development tools, not deployment requirements. Keep original SIMH source unmodified where practical; record any isolated experimental patches distinctly.
- Keep front-panel observation separate from control. Preserve the known START-release, polling and crash limitations; do not claim a browser disconnect proves a stopped CPU. Read [architecture](docs/architecture.md), [protocol](docs/protocol.md) and the relevant safety reports before changing adapters.
- Preserve accepted commits, tags, test evidence, source notices and supplied artwork. Use new commits; never move a checkpoint to conceal a correction. Publication and deployment require explicit authorization for the current task. The completed M5.3 pilot does not authorize later deployment, autostart, physical-panel integration or a stable release.

## Development and verification

Follow the linked coding standards: descriptive names, cohesive modules, documented APIs, explicit errors, resource ownership, locking and cancellation. Explain non-obvious historical/protocol behavior near the code. Avoid broad refactors or behavior changes for stylistic reasons.

For behavior changes, run `go vet ./...`, `go test -race ./...`, `npm run check`, `npm test` and `npm run build`, with affected browser/integration checks described in [development.md](docs/technical/development.md). For prose/comments, validate references and contracts; for formatting, also compile/type-check and run relevant tests. Do not restart genuine guest experiments or long stress campaigns for editorial changes. Report actual test scope and failures.

Keep resources bounded and performance claims tied to measurements. Mac/lab results are not Pi measurements. Capture the real application for screenshots, preserve baselines and distinguish mock, intercepted fixture, genuine lab and live hardware evidence.

## Documentation and stewardship

Write clear American English for intelligent readers who may be new to Linux. Identify the command environment, purpose, expected result and failure checkpoint where useful. Distinguish observed facts, reconstructed procedures and future plans. Preserve source records and state missing evidence instead of inventing results. Syntax-check installation examples without executing their disk, network or hardware actions.

The author/maintainer is **Craig Daters · RetroRealm.org**. Original RetroRealm code and appropriate original software documentation use MIT, copyright 2026 Craig Daters. Retain separate upstream terms and provenance; do not imply official endorsement. Acknowledge Codex/ChatGPT factually in credits rather than project branding.

This is a preservation-focused hobby project. Favor useful functionality, historical accuracy, interoperability and welcoming collaboration. The owner handles legal judgments and rights-holder correspondence. Address concrete asset questions individually; do not initiate speculative licensing investigations, remove functionality over theoretical concerns or freeze unrelated work.

Keep credentials, private addresses/captures, personal backups and working guest disks out of commits and public packages. Inspect the material being published, including history when appropriate, without repeating completed publication work unnecessarily. Never rewrite history automatically.
