# PiDP-11 Web Desktop

This is an independent, local development project. Do not connect to the Raspberry Pi, discover it on the network, SSH to it, install anything on it, or change its official installation. Authorized work includes the mock Go backend and M3/M4/M4.1/M4.2/M4.3/M5.0 isolated Linux laboratory: original SIMH/REALCONS, loopback RPC server/client, simulated physical panel and control broker, and authenticated dedicated guest terminal lines using disposable verified public media. Run actual emulator/RPC interoperability only inside the disposable network-none lab, with no physical GPIO or production access. Do not connect to the Raspberry Pi even after backup completion; production integration requires separate explicit authorization. Preserve all checkpoints. Containers are development-only, never a deployment dependency.

Keep emulator behavior in SIMH/REALCONS. Do not turn the demonstration model into a replacement PDP-11 emulator. Keep browser presentation independent of transport. Read docs/architecture.md and docs/protocol.md before adding adapters. Treat performance figures as targets until measured on authorized target hardware. Preserve source revision citations.

Run go test -race ./..., npm run check, npm test, and npm run build for behavior changes. Publication and deployment require explicit owner authorization for the current task. M5.2 authorizes public GitHub publication, not Pi deployment.

For documentation and presentation work, also read `../AGENTS.md` when working in the full PiDP11 project. Keep explanations beginner-friendly, preserve evidence labels and original notices, and identify simulated behavior clearly. Presentation-only edits must not change control policy or trigger new integration experiments.


## Project identity and stewardship

The author/maintainer is Craig Daters · RetroRealm.org. Original RetroRealm code and appropriate original software documentation use MIT, copyright 2026 Craig Daters. Keep upstream notices and asset provenance intact; do not imply that every third-party component shares the root license. Acknowledge Codex/ChatGPT assistance factually in credits, not as the primary identity.

This is a preservation-focused hobby project. Favor useful functionality, historical accuracy, interoperability and welcoming community documentation. Address concrete third-party material questions individually; do not reopen broad speculative licensing investigations, remove functionality for theoretical concerns, or halt unrelated work over one asset. The owner handles legal judgments and rights-holder correspondence. Preserve the distinction between compatibility work and redistribution of specific materials.

Keep private captures, credentials and guest/backup images outside public packages. Review history when publishing, preserve accepted tags and commits, and do not rewrite history automatically. Report actual demonstrations and current limitations accurately. No public milestone authorizes physical integration or remote panel control by itself.
