# What is still experimental

M5.25's [TM11 completion experiment](lab/M5.25.md) is confined to disposable
laboratory builds. It covers TM0 READ FORWARD, not all controller operations or
physical motion. The standalone reader reached 6,644 KiB RSS/HWM, exceeding the
1 MiB incremental-process target; the 1% Pi CPU target remains unmeasured. Small
lab summary-latency results do not establish physical or every-event latency.
Guest changes without attachment changes still require independent retirement,
and same-UID peer checks are not guest identity or a malicious-process boundary.
Connected REALCONS and production transport remain unqualified. The ordinary UI
stays snapshot-only; no production instrumentation is enabled.

[M5.24 storage views](lab/M5.24.md) are captured metadata, never continuous device
telemetry. An unreported guest/media transition can obsolete a snapshot immediately;
the UI always says current state is unknown. Only RL0/RL11/RL02, RP0/RH70/RP06 and TM0/TM11/TU10
are accepted. Guest identity, actual attachment and quiescent capture remain operator
attestations. The local collector verifies image bytes without write access; it does
not discover a guest or monitor. RT-11 MT/PIP labeled-file reads are now qualified,
but tape writing, backup/restore, other handlers, physical-length/EOT measurement,
automatic restart adoption, durable snapshot archives and browser mounting remain
unqualified.
Named register examination can notify REALCONS; production capture and FrontPanel
sampling need separate review. [Contract](technical/storage-observation.md).

[M5.22](lab/M5.22.md) demonstrates repeated RSX jobs, bounded history, controlled
observer restart and genuine RT-11 browser exports. The local guide still requires
independent guest/device checks: a prompt, EOF or idle stream cannot establish safe
completion. Eight terminal records retain at most 64 KiB each; older RAM records are
evicted and unsaved history is lost on service exit. Explicit private archives are
bounded, refuse overwrite and are not a power-loss durability guarantee. Recovery
restores data only, never ownership. A trusted local archive owner can forge evidence;
checksums do not authenticate historical attestations. See the
[history contract](technical/equipment-history.md) and [operator guide](technical/equipment-operator.md).
RT-11's small outputs were buffered until close; sustained live RT-11 growth and an
independent browser login shell remain unqualified. Active resource/latency samples
are short, deliberately slowed ARM64 laboratory runs, not physical Pi measurements.
Reader selection remains read-only; mounting, automatic safe-state discovery and
production supervision remain unqualified. No new release or physical access.

M5.19 development main adds [workstation controls](technical/terminal-workstation.md),
not a new release or physical installation approval. All terminal personalities
remain subsets: 132 columns, full character sets/reset fidelity and several hardware
functions remain unqualified. BSD `robots` requires an initial Ctrl-L redraw in all
three retained browser cases; the missing initial output's cause is unresolved.
RSX EDT now has genuine three-engine screen/keypad/save evidence, scoped to the
recorded configuration. Search is bounded, audio is an opt-in approximation, and
preferences cannot restore authority. Automated accessibility/audio checks are not
native assistive-technology or speaker certification. [Results and corrected attempts](lab/M5.19.md).


M5.18 [published the exact Source Alpha 2 candidate](releases/M5.18-publication.md)
qualified in M5.17. This is an experimental source release, not an independent audit. Exact extracted-source tests and
fresh guest/device checks passed; one bounded provision and separate-kernel
memory enforcement passed. The original provisioning incidents and plotting
timeout remain unresolved. Physical deployment remains NO-GO. See the
[M5.17 report](lab/M5.17.md) and [review intake](security/review-intake/README.md).

M5.16 prepares a [fixed-revision external review package](security/M5.16-review.md),
not an independent audit. Four further bounded provisions and six direct/tapped
V7 plots passed, but neither old fault was reproduced or explained. Native wait
status now distinguishes explicit exit 139 from a signal; the deliberate signal
control is not a Go fault recurrence. [Evidence and failed attempts](lab/M5.16.md).

The 0.1 selection protocol is unchanged. Legacy `/screen` still permits an absent
receipt; current clients supply/check one. A mandatory-receipt selected-text route and Desktop-owned publication now have
owner-relayed architectural agreement; the [0.2 wire proposal](technical/selection-contract-0.2-proposal.md)
is unimplemented and its detailed choices await review. One authorized publisher can replace or
revoke another page’s selection; another page or provider can retain already
delivered text. Local receipt/history-reset-event tests do not prove global erasure.
The published Alpha 1 remains older than M5.14/M5.15 fixes; Alpha 2 is published for demos/labs, without physical deployment approval.

M5.15 compared both provisioning executables under a separate Debian ARM64 kernel,
with 32 successful starts across ext4 and 9p. Neither original exit-139 incident
was reproduced or explained. The old V7 plotting failure also remains unresolved:
its raw stream was not retained, and a later attempt overwrote the rolling console
capture. New bounded traces, unique attempt records and cooperating-campaign
exclusion improve future diagnosis. Tracing can change timing, and a lab lock
cannot exclude unrelated tools. [M5.15 findings](lab/M5.15.md).

Two integration defects were reproduced and fixed: caller mutation could replace
reviewed selection text during negotiation, and a late provider reply could escape
cancellation. The client now snapshots the preview and both modules recheck
cancellation after reads. Already submitted data cannot be recalled. Actual
Go/Node TLS conformance supplements fixture tests; injected lifetime/expiry changes
do not qualify a production observer or prove OS identity. The
[review packet](technical/M5.15-interoperability-review.md) remains a proposal for
independent review, with no upstream approval. These corrections are on main;
the published M5.13 source archive remains unchanged.

M5.14 fixes handled partial-provisioning cleanup and adds an independent selection-contract prototype. The two original ARM64 exit-139 incidents did not recur in controlled tests and remain unexplained. An initial V7 equipment/plotting timeout also remains unexplained despite successful follow-up checks. Abrupt process or host failure can still leave incomplete provisioning; cleanup is not power-loss atomic. These development fixes are not in the unchanged M5.13 source archive. [M5.14 evidence](lab/M5.14.md) and [troubleshooting](getting-started/alpha-troubleshooting.md).

The implemented [0.1 selection experiment](technical/selection-contract-draft.md) is not native upstream compatibility. [M5.23.1](technical/M5.23.1-interoperability-review.md) records architectural agreement, not wire-protocol or code acceptance. Its client has fixture and actual Go/Node TLS qualification; prior genuine modified-app sharing remains M5.12 evidence. Revocation cannot recall text already submitted to a model, and process/socket identity cannot establish OS identity. Independent security acceptance remains outstanding.

M5.13 prepares a source-only alpha and external review packets. It does not supply independent security approval. RT-11’s diagnostic mismatch is explained but still present; no original diagnostic was patched. RSTS needs the generation/patch volumes named by its retained batch. Model quotation formatting is conservatively refused and every delivered explanation labels its source status, but factual claim coverage remains weak. [Current report](lab/M5.13.md).

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
| Device observation | Genuine CPU programs drive original LP11/PC11 devices; RSX PIP/LPDRV and PRDRV/PPDRV have the narrow M5.20 qualification. Other guest printer drivers remain unverified. Live observation needs a trusted separate producer and explicit generation approval; host-visible bytes may arrive in bursts. |
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
