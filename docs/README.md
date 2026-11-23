# Documentation

Current development: [M5.20 genuine printer/paper-tape findings](lab/M5.20.md),
[M5.19 workstation findings](lab/M5.19.md),
[virtual-computer-room direction](product/virtual-computer-room.md),
[workstation controls](technical/terminal-workstation.md) and [resume handoff](../RESUME.md).
These are development-main additions, separate from the published release below.

Latest publication: [Source Alpha 2 verification](releases/M5.18-publication.md) and [local quick start](getting-started/source-alpha-2.md). [M5.17 findings](lab/M5.17.md) retain the engineering scope; [independent review](security/review-intake/README.md) remains pending. Alpha 1 is unchanged.

Start with the browser demonstration; it needs no Pi, guest disk or AI model. Genuine guest access uses a separate, authenticated service and a deliberately approved terminal line. The [capability matrix](capabilities.md) distinguishes those experiences.

## Getting started

- [Welcome and local preview](getting-started/README.md)
- [Existing PiDP-11 or fresh installation?](getting-started/installation-paths.md)
- [Original-software Trixie guide and evidence](installation/README.md)
- [Optional service: authentication, TLS, attachment and removal](getting-started/optional-service.md)
- [Optional AI setup](getting-started/configured-companion.md)
- [Questions and troubleshooting](getting-started/questions.md) and [alpha setup diagnostics](getting-started/alpha-troubleshooting.md)
- [Alpha package, checksums and acceptance status](releases/alpha-readiness.md)

## Using the desktop

- [Windows, layouts, demonstrations and equipment](getting-started/explore.md)
- [Terminals, guest connections and keyboard ownership](getting-started/terminals.md)
- [Terminal personalities](technical/terminal-personalities.md) and [graphics](technical/graphics-foundations.md)
- [Printer and paper-tape observation](technical/observed-peripherals.md)
- [Reference desk, source facts and exact calculator](technical/historical-reference-library.md)
- [AI Companion and deliberate sharing](getting-started/configured-companion.md)
- [Actual application gallery](screenshots/README.md)

## Developers

- [Build and test](technical/development.md), [coding standards](technical/CODING-STANDARDS.md), [source map](technical/SOURCE-MAP.md)
- [Architecture](architecture.md), [Go backend](backend-milestone.md), [TypeScript windows](frontend-m42.md)
- [Terminal transport and authentication](lab/M5.0.md), [guest lifecycle](lab/M5.4.md), [optional service](getting-started/optional-service.md)
- [Read-only device observation](technical/observed-peripherals.md)
- [Model-host gateway](technical/hosted-local-companion.md), [model compatibility](technical/model-compatibility.md)
- [Hacker Replicant interoperability](technical/hacker-replicant-interop.md) and [modified app setup](../integrations/hacker-replicant/README.md)
- [Complete technical index](technical/README.md)

## Development history and current boundaries

- [Roadmap](../ROADMAP.md), [known limitations](known-limitations.md), [timeline](timeline.md), [changelog](../CHANGELOG.md)
- [Architecture decisions](development/DECISIONS.md) and [independent access](decisions/0004-independent-access.md)
- [Milestone reports](lab/) and [preserved checkpoints](development/checkpoints.md)
- [M5.10 presentation verification](lab/M5.10.md) and [website handoff](website-sync/M5.10/README.md)

Historical reports describe their own tested revision. Use the current capability matrix for present scope; a later overview never turns an earlier experiment into physical acceptance.

Latest engineering evidence: [M5.16 review readiness and fault qualification](lab/M5.16.md), [reproduction notes](../lab/m516/README.md), [external security review](security/M5.16-review.md), and [concise interoperability handoff](technical/M5.16-hacker-replicant-handoff.md). Earlier reports and presentation captures remain preserved.
