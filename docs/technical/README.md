# Technical documentation

The desktop uses TypeScript/HTML5/SVG and xterm.js; Go serves embedded assets and bounded streams. SIMH does the actual PDP-11 emulation. The normal executable remains a mock service. Genuine guest labs and the separate optional service use the established terminal bridge; the candidate service starts detached and requires explicit local approval. [Current capabilities](../capabilities.md) and [service procedure](../getting-started/optional-service.md).

Latest optional tutor milestone: [Phase D results and screenshots](../lab/M5.9.3-D.md), [read-only app setup](../../integrations/hacker-replicant/README.md), and [reproduction](../../lab/m593d/README.md). Live-guest and physical acceptance remain separate.

Prior qualification: [M5.16 findings](../lab/M5.16.md), [reproduction](../../lab/m516/README.md), [security review entry point](../security/M5.16-review.md), and [concise Hacker Replicant handoff](M5.16-hacker-replicant-handoff.md). This work does not change the published M5.13 release or authorize Pi deployment.

Latest qualification: [M5.17 candidate report](../lab/M5.17.md), [candidate decision](../releases/M5.17-candidate.md), [review intake](../security/review-intake/README.md) and [interoperability feedback matrix](M5.17-interoperability-feedback.md). No new release or physical deployment is authorized.

## Start here

- [Development environment and tests](development.md)
- [Coding standards](CODING-STANDARDS.md), [source map](SOURCE-MAP.md) and [maintainability review](MAINTAINABILITY.md)
- [Architecture decisions](../development/DECISIONS.md)
- [Architecture overview and original proposal](../architecture.md)
- [Go backend/API](../backend-milestone.md) and [frontend/window model](../frontend-m42.md)
- [Language choice](../backend-decision.md), [resource targets](../roadmap.md)

## Genuine terminals

- [M5.0 implementation and results](../lab/M5.0.md): DC11, alternatives, xterm integration, keyboard leases, observers, authentication, bounded I/O, restart and original-console independence.
- [Reproduce M5.0](../lab/M5.0-runbook.md): disposable UNIX V7 and network-none Linux ARM64 lab on the Mac. Genuine guest acceptance is separate from intercepted browser fixtures.
- [Terminal compatibility matrix](../lab/M4.3-terminals.md): tested renderer/encoder fixtures and limitations.
- [M5.1 installed-Pi assessment](../lab/M5.1.md): binary/source provenance, guest-specific requirements, resources and future serial coexistence.
- [M5.3 actual Pi pilot](../lab/M5.3.md): separate terminal-only entry point, genuine V7, independent Screen console, short Pi measurements and verified cleanup. [M5.3 lab replay](../../lab/m53/README.md).
- [Original M5.1 pilot design](../lab/M5.1-pilot-plan.md): historical proposal; M5.3 records the actual execution and limits. The lab server still rejects a normally networked host.

## Panel protocol and safety experiments

- [BlinkenBone RPC/XDR](../protocol.md) and [M3 original-C interoperability](../lab/M3.md)
- [Broker safety design](../broker-safety.md), [M4 failure evidence](../lab/M4.md), [M4.1 consumer fence](../lab/M4.1.md)
- [Independent access](../decisions/0004-independent-access.md)
- [Passive observation](../lab/M4.2-observation.md), [TLS/session security](../lab/M4.3-security.md), [bounded recovery experiment](../lab/M4.3-recovery.md)

These reports describe laboratory work, not authorization or proof of production panel safety. They remain versioned historical evidence; newer overview pages do not silently rewrite old results.

## Presentation, peripherals and evidence

- [Continuous-form printer](../printer-m432.md): bounded rendering and exact spool semantics; simulated LP0.
- [Panel references](../panel-reference-notes.md) and [paddle geometry](../research/panel-m43-geometry.md)
- [Validation overview](../validation.md), [M4.3 performance](../lab/M4.3-performance.md), [M5.0 measurements](../lab/m50/validation.json)
- [Timeline](../timeline.md), [source references](../sources.md), [third-party notices](../../THIRD_PARTY_NOTICES.md)

Private capture paths mentioned in reports intentionally do not resolve to public files. Selected sanitized evidence is committed; passwords, private host configuration, disk images and raw private captures are not.

[M5.4 coexistence preparation](../lab/M5.4.md) covers normal-launcher profiles, guest/line lifecycle, one-shot attachment safeguards and the separate future optional service. The [supervised pilot proposal](../lab/M5.4-pilot-plan.md) is unexecuted.

[M5.5 physical findings](../lab/M5.5-physical-pilot.md) record successful V7/browser/physical subtests, the failed IDLED fallback and controlled rollback. Overall acceptance is blocked. The [candidate and Mac lab](../lab/M5.5.md), [historical reviewed procedure](../lab/M5.5-pilot-plan.md), and [M5.6 optional-deployment design](../lab/M5.6-deployment-spec.md) remain supporting records, not authority to retry the launcher.


[M5.6 results](../lab/M5.6.md) cover the optional package's [owner setup](../getting-started/optional-service.md), [VT100/VT52 conformance](terminal-personalities.md), [4010 and VT11 foundations](graphics-foundations.md), [future companion boundaries](companion-applications.md) and [repeatable local labs](../../lab/m56/README.md). Physical deployment and switch diagnostics remain separately authorized work.


[M5.7 diagnostic results](../lab/M5.7.md) record 20/20 unexpected SR0 readings with all paddles confirmed DOWN, the stopped sequence, unchanged original files and unresolved physical cause. [M5.8 readiness](../lab/M5.8-readiness.md) separates detached installation from guest coexistence and records the actual disabled-memory-controller blocker.

[M5.7.1 SR0 comparison and memory containment](../lab/M5.7.1.md) records the UP/DOWN result, immediate mismatch stop, verified Pi cleanup, optional-service startup refusal without kernel limits, and disposable ARM64 enforcement/browser tests. No Pi deployment or physical-selection acceptance.

[M5.7.2 physical ADDRESS-lamp comparison](../lab/M5.7.2.md) confirms persistent SR0 assertion through the original diskless REALCONS path while SR1 responds in both directions. It records owner observations, console comparisons, the isolated rehearsal and verified stopped-state cleanup. Powered-off inspection requires separate authorization; M5.8 remains gated.

[M5.9 local development](../lab/M5.9.md) records genuine V7 Tektronix plotting, initial VT220/teletype, bounded manual printer import and offline companion/provider contracts. The [two setup paths](../getting-started/installation-paths.md) and [lab runbook](../../lab/m59/README.md) cover the exact candidate package without advancing physical acceptance.

## M5.9.1 applications and peripherals

- [Completed device observation](observed-peripherals.md), [configured companion](../getting-started/configured-companion.md) and [architecture decision](../decisions/0007-completed-devices-and-companion.md).
- [Genuine guest and ARM64 evidence](../lab/M5.9.1.md), [reproduction](../../lab/m591/README.md) and [candidate record](../lab/M5.9.1-package.md).

## Source-assisted companion

- [Historical references and exact PDP-11 values](historical-reference-library.md)
- [Model compatibility and qualification](model-compatibility.md)
- [Private model-host transport](hosted-local-companion.md)
- [Hacker Replicant interoperability foundation](hacker-replicant-interop.md)
- [Phase B findings and reproduction](../lab/M5.9.3-B.md)

- [M5.9.3 Phase C](../lab/M5.9.3-C.md): expanded references, limited claim review, exact in-chat calculations, separate-network model gateway and read-only upstream interoperability evidence.
