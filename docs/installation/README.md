# Headless PiDP-11 on Trixie Lite

**Craig Daters · [RetroRealm.org](https://retrorealm.org/)**

[Read the complete step-by-step guide](PIDP11-TRIXIE-HEADLESS-GUIDE.md).

This guide prepares **Oscar Vermeulen's original PiDP-11 software** on Raspberry Pi OS Trixie Lite ARM64. It is not an installer for the Web Desktop, and it is not an official or endorsed replacement for Oscar's instructions.

The original installation was successfully tested on a Pi 3B+. The complete tutorial was reconstructed afterward and has **not yet been independently repeated from a blank microSD card**. Its checkpoints, evidence gaps, UNIX V4 limitation and recorded power/thermal concerns remain part of the guide. The later M5.1 idle snapshot does not invalidate that history or prove the supply concern resolved.

Use the procedure only for a new expendable installation. Do not apply its setup/copy steps over a working PiDP-11. Stop at failed checkpoints, preserve original media, and distinguish the Mac shell, Pi Linux shell, SIMH monitor and guest console.

## What is included

- [Complete headless guide](PIDP11-TRIXIE-HEADLESS-GUIDE.md), with prerequisites, command environments, expected results and troubleshooting.
- [Installation record](PIDP11-TRIXIE-INSTALLATION-RECORD.md), separating historical actions from reconstructed recommendations.
- [Evidence appendix](PIDP11-EVIDENCE-APPENDIX.md), with selected sanitized excerpts and supporting identities.
- [Verification and clean-card replay checklist](PUBLICATION-CHECKLIST.md).
- [Local helper-test scope](tests/README.md) and [executable fixture tests](tests/test_guide.py).
- [Publication provenance](provenance.json): source/export hashes and confirmation that every fenced block remains identical to the reviewed source edition.

The source documents remain unchanged in the owner's installation workspace. This public edition adds Craig's byline, updates publication framing and navigation, and clarifies example identities. It does not replace a missing execution transcript or claim a new installation test.

## References and credits

Start with [Oscar's PiDP-11 repository](https://github.com/obsolescence/pidp11) and [building instructions](https://obsolescence.dev/pidp-11-building-instructions.html). The guide cites the pinned software revision, Raspberry Pi documentation and relevant guest maintainers. Credit belongs to Oscar, SIMH, BlinkenBone/REALCONS and the wider community whose software and records made the work possible.

A separate headless-installation repository may eventually make navigation easier. For now the complete guide lives here alongside the companion project's documentation, without delaying either project.
