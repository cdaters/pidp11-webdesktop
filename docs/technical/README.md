# Technical documentation

The desktop uses TypeScript/HTML5/SVG and xterm.js; Go serves embedded assets and bounded streams. SIMH does the actual PDP-11 emulation. The normal executable remains a mock service, while the separate M5.0 laboratory command connects to genuine guest lines.

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
