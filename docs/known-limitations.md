# What is still experimental

The desktop has genuine guest and device evidence, but it is not an accepted production Pi installation. The [capability matrix](capabilities.md) records what works; this page gathers the boundaries that still matter.

| Area | Current limitation |
|---|---|
| Physical deployment | V7/browser/physical subtests passed in M5.5, but the wrong-guest fallback blocked overall acceptance. Temporary changes were rolled back. The machine is now disassembled awaiting switch repair; no permanent companion service is accepted. |
| Memory containment | The assessed Pi has disabled memory cgroups. The candidate refuses unprotected startup: 96 MiB hard memory limit, zero swap and a 72 MiB Go soft target. Actual Pi readiness remains unresolved. |
| Guest identity | Explicit attachment, per-process identity and retired generations prevent automatic reused-port attachment. An OS change on the same surviving stream may remain invisible. Stop the actual bridge before intentional changes and verify independently. |
| Panel control | Delayed START release and blocked RPC defeat simple fail-safe assumptions. Remote control is not a production feature; passive observation remains separate. A closed browser does not prove a halted CPU. |
| Terminal scope | V7 and 2.11BSD applications passed specific subsets. VT100/VT52/VT220 are not complete device emulations. Input is ASCII7; DEC text is 80 × 24. ASR-33 paper is a 72-column approximation without mechanical timing. |
| Other guests | Original-console RT-11 success is not browser acceptance. RSTS/E and RSX source coverage does not qualify their serial drivers, logins or applications. |
| Graphics | V7 Tektronix plotting is genuine. GIN is fixture-tested only; full 4014 and VT11/VR14 transport remain unqualified/planned. |
| Device observation | Genuine CPU programs drive original LP11/PC11 devices. Guest OS printer-driver integration is unverified. Live observation needs a trusted separate producer and explicit generation approval; host-visible bytes may arrive in bursts. |
| Simulated media | Disk, magnetic-tape, paper-tape and system-selection controls do not manage real media. Local printer jobs are temporary. Download preserves text; printing the visible DOM is not a supported full-spool export. |
| AI accuracy | Models produce factual and arithmetic errors. In Phase D, 13/15 fresh Gemma cases had expected answers; two were wrong. Narrow fragment checks recognized 14/38 cases, missing five contradictions and nine true claims. Source links and annotations do not certify a whole answer. |
| Source review | 29 notes and 13 deterministic facts have source review by the same development workflow, not independent expert acceptance. Matching RT-11 V5.3 sources and broader review remain open. |
| Hacker Replicant | Actual app interoperability used an explicitly modified pinned copy, separate login and synthetic selected text. Live guest identity and supported full integration are unqualified. No merger or endorsement is implied. |
| Command proposals | Disabled by default; only three allowlisted UNIX suggestions can be reviewed. This is not arbitrary command execution or authority over SIMH, Linux or the panel. |
| Exposure | TLS and role tokens do not constitute a complete Internet-facing or multiuser provisioning design. Keep guest/RPC endpoints private. |
| Performance | Earlier Pi samples were 6.7 MiB idle / 13.8 MiB active bridge RSS and 0.30% / 5.55% CPU. Active CPU exceeded the <5% target; these short older workloads do not qualify the current feature set, sustained load or emulator impact. |
| Browser coverage | Chromium, Firefox and WebKit have recorded acceptance tests. Native Safari automation was unavailable under the owner’s settings, which were preserved. |
| Installation guide | Successful original installation history does not establish an independent replay of the entire reconstructed blank-card tutorial. |

Evidence: [physical pilot](lab/M5.5-physical-pilot.md), [SR0 comparison](lab/M5.7.1.md), [lamp diagnosis](lab/M5.7.2.md), [readiness](lab/M5.8-readiness.md), [live peripherals and BSD](lab/M5.9.2.md), [Phase D tutor measurements](lab/M5.9.3-D.md), [panel safety](lab/M4.md), [installation status](installation/README.md).

The [roadmap](../ROADMAP.md) keeps these as separate gates. A polished gallery, new package or successful Mac test does not advance physical acceptance.
