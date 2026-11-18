# M5.2 publication record

**Craig Daters · RetroRealm.org · 2026-11-18**

M5.2 prepares the public **PiDP-11 Web Desktop** repository with its original development history. Original RetroRealm source and appropriate original software documentation use MIT, copyright 2026 Craig Daters. Upstream notices and supplied-reference provenance remain intact.

## Scope and preserved baseline

The starting revision was `ccfb972` (M5.1), with 11 commits and 10 existing checkpoint tags. The functional application remains the accepted M5.0 implementation, `156ce33d6b42ee4ad7689554c3d85e4883abb907`. This milestone changes documentation, license and repository housekeeping only. It does not modify runtime source, rebuild SIMH, contact the Pi, run a guest, or execute the proposed Pi pilot.

The public entry points are the [README](../README.md), [beginner guide](getting-started/README.md), [technical guide](technical/README.md), [philosophy](../PHILOSOPHY.md), [roadmap](../ROADMAP.md), [changelog](../CHANGELOG.md) and [architecture decisions](development/DECISIONS.md). The [gallery](screenshots/README.md) uses existing actual application captures. README captions distinguish simulated panel/peripherals from the genuine M5.0 guest terminal.

## Checks performed before publication

- Reviewed all 485 reachable historical blobs across the original 11 commits and all 10 tags. The focused credential/private-file scan found no tracked secrets, private captures, guest/backup images or temporary archives. Three private-address matches were intentional rejection-test fixtures, including two historical versions of one test. No history rewrite was needed.
- Preserved all existing checkpoint commits and tag targets. Private research and disposable laboratory material stay ignored.
- Exported the complete headless Trixie guide and its supporting record/appendix. All fenced blocks in those three documents remain byte-identical to the parent source records. [Provenance hashes](installation/provenance.json) identify both source and public editions; parent records remain unchanged.
- Ran `python3 docs/installation/tests/test_guide.py`: **48 checks passed**. These use isolated temporary fixtures and syntax checks, not actual installation, network, card-device or guest operations. This does not establish a complete blank-card replay.
- Checked Markdown file destinations and publication changes for whitespace errors. Corrected the M5.0 runbook's fresh-clone download directory and preparation example; the historical lab result is unchanged.

No application regression campaign was repeated for this documentation-only milestone. Existing [M5.0 results](lab/M5.0.md) and [M5.1 assessment](lab/M5.1.md) remain the sources for those engineering claims.

## GitHub verification

Publication is being completed under the owner's explicit M5.2 authorization. The published owner, visibility, branch, commit, settings, README images and preserved tag targets will be recorded here after GitHub confirms them. No stable release or binary distribution is part of this milestone.
