# What is still experimental

M5.12 adds a supervised Linux laboratory subset, not verified OS discovery. It
cannot detect a guest switch inside an unchanged process and stream. Stop the
actual observer and bridge before guest changes, then verify and approve anew.
The observer is not packaged for production. Alpha categories A/B are recommended
for experimental demonstration/lab use; C/D remain NO-GO. See the
[M5.12 report](lab/M5.12.md) and [identity contract](technical/supervised-guest-identity.md).

The generated RT-11FB experiment qualifies MTTEST input/output, not independent
login shells or a complete diagnostic pass. RSTS/E's tested monitor lacks generated
DZ11 lines and the available disks lack complete regeneration inputs. Historical
claim review remains narrow: 2/12 recognized in the new frozen corpus, with five
contradictions left unverified. Citation IDs do not validate quotation wording.

Older packages reject `supervised_endpoints`; rollback must restore the prior
reviewed private configuration while stopped. Never silently remove a required
check to run an older binary.


The desktop has genuine guest and device evidence, but it is not an accepted production Pi installation. The [capability matrix](capabilities.md) records what works; this page gathers the boundaries that still matter.

| Area | Current limitation |
|---|---|
| Physical deployment | V7/browser/physical subtests passed in M5.5, but the wrong-guest fallback blocked overall acceptance. Temporary changes were rolled back. The machine is now disassembled awaiting switch repair; no permanent companion service is accepted. |
| Memory containment | The assessed Pi has disabled memory cgroups. The candidate refuses unprotected startup: 96 MiB hard memory limit, zero swap and a 72 MiB Go soft target. Actual Pi readiness remains unresolved. |
| Guest identity | Explicit attachment, per-process identity and retired generations prevent automatic reused-port attachment. An OS change on the same surviving stream may remain invisible. Stop the actual bridge before intentional changes and verify independently. |
| Panel control | Delayed START release and blocked RPC defeat simple fail-safe assumptions. Remote control is not a production feature; passive observation remains separate. A closed browser does not prove a halted CPU. |
| Terminal scope | V7 and 2.11BSD applications passed specific subsets. VT100/VT52/VT220 are not complete device emulations. Input is ASCII7; DEC text is 80 × 24. ASR-33 paper is a 72-column approximation without mechanical timing. |
| Other guests | RT-11SJ baseline and RSTS/E V7.0 remain console-qualified. Separately generated RT-11FB passed a browser application test, not a login-shell or full diagnostic test. RSX-11M-PLUS V4.6 passed a Chromium text-terminal test; full-screen applications and other releases remain unqualified. |
| Graphics | V7 Tektronix plotting is genuine. GIN is fixture-tested only; full 4014 and VT11/VR14 transport remain unqualified/planned. |
| Device observation | Genuine CPU programs drive original LP11/PC11 devices. Guest OS printer-driver integration is unverified. Live observation needs a trusted separate producer and explicit generation approval; host-visible bytes may arrive in bursts. |
| Simulated media | Disk, magnetic-tape, paper-tape and system-selection controls do not manage real media. Local printer jobs are temporary. Download preserves text; printing the visible DOM is not a supported full-spool export. |
| AI accuracy | Models produce factual and arithmetic errors. M5.11 had 10/10 narrow expected distinctions but one incorrect additional claim. Its unchanged checker recognized 3/18 new cases and missed seven contradictions and six true claims. Source links and annotations do not certify a whole answer. |
| Source review | 36 notes and 15 deterministic facts have source review by the same development workflow, not independent expert acceptance. Matching RT-11 V5.3 sources and broader review remain open. |
| Hacker Replicant | M5.12 shared supervised genuine V7 text with a modified pinned app under a lab-only lifetime guard. It cannot detect a different OS on an unchanged surviving stream; supported production integration is unqualified. No merger or endorsement is implied. |
| Command proposals | Disabled by default; only three allowlisted UNIX suggestions can be reviewed. This is not arbitrary command execution or authority over SIMH, Linux or the panel. |
| Exposure | TLS and role tokens do not constitute a complete Internet-facing or multiuser provisioning design. Keep guest/RPC endpoints private. |
| Performance | Earlier Pi samples were 6.7 MiB idle / 13.8 MiB active bridge RSS and 0.30% / 5.55% CPU. Active CPU exceeded the <5% target; these short older workloads do not qualify the current feature set, sustained load or emulator impact. |
| Browser coverage | Chromium, Firefox and WebKit have recorded acceptance tests. Native Safari automation was unavailable under the owner’s settings, which were preserved. |
| Installation guide | Successful original installation history does not establish an independent replay of the entire reconstructed blank-card tutorial. |

Evidence: [physical pilot](lab/M5.5-physical-pilot.md), [SR0 comparison](lab/M5.7.1.md), [lamp diagnosis](lab/M5.7.2.md), [readiness](lab/M5.8-readiness.md), [live peripherals and BSD](lab/M5.9.2.md), [Phase D tutor measurements](lab/M5.9.3-D.md), [panel safety](lab/M4.md), [installation status](installation/README.md).

The [roadmap](../ROADMAP.md) keeps these as separate gates. A polished gallery, new package or successful Mac test does not advance physical acceptance.
