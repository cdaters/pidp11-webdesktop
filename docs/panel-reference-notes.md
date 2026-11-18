# PDP-11/70 panel reference notes

Research date: 2026-11-16. Scope: local DEC/PiDP manuals, public reference photograph, and the already pinned BlinkenBone/PiDP source snapshots. No Raspberry Pi access. These notes guide original SVG artwork and mock interactions; they do not authorize production control or claim CPU/MMU emulation.

## Evidence and page references

| Reference | Exact location inspected | Use |
|---|---|---|
| DEC, *PDP-11/70 Processor Handbook 1977–78* | Chapter 11, printed 11-1 through 11-8; PDF pages 241–248 (1-based), especially 242–248 visually rendered | Authoritative control functions, operator sequences, selector names and indicators |
| Oscar Vermeulen, *PiDP-11 Manual*, local copy | “Try out the front panel,” PDF page 14 (1-based) | Confirms HALT → ENABLE → CONT sequence for the replica; distinguishes replica operation from original hardware |
| Henk Gooijen's real PDP-11/70 console photograph on the w11 project page | [Figure D-1 and attribution](https://wfjm.github.io/home/w11/), [photograph](https://wfjm.github.io/downloads/w11/pictures/HenkGooijen-pdp11-70-front.jpg) | Authentic arrangement, visual proportions, paddle and face colors |
| BlinkenBone Java panel | [`Panel1170.java`](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/src/blinkenbone/panelsim/panelsim1170/Panel1170.java), notably control construction at lines 225–319, mouse handling around 875–965, selector encoding at 1052–1117 | Momentary versus latching classification, press/release and selector wire mapping |
| PiDP REALCONS controller | [`realcons_console_pdp11_70.c`](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/02.3_simh/4.x%2Brealcons/src/REALCONS/realcons_console_pdp11_70.c), lines 84–97, 798–862 and 900–993 | Actual existing emulator interface semantics; do not substitute historical assumptions for source behavior |

Local manuals are unchanged at `../docs/PDP-11_70_Handbook_1977-78.pdf` and `../docs/PiDP-11_Manual.pdf` relative to the project root. The DEC PDF is also indexed by [w11's DEC manual list](https://wfjm.github.io/home/w11/info/manuals.html) and archived at [Bitsavers](https://www.bitsavers.org/pdf/dec/pdp11/1170/PDP-11_70_Handbook_1977-78.pdf). The web reader returned 403 for the archive; the user's local copy was inspected instead.

The photo and manual renders remain in ignored `.research/panel-reference/` and are not shipped as product assets. Photo credit is Henk Gooijen, as stated by w11. Colors below are visual observations, not calibrated DEC paint specifications.

## Layout corrections with the greatest value

The accepted prototype is readable but rearranges important groups. The photograph supports the following sequence and placement:

1. **Status row above the address display**, over its right-hand portion: PAR ERR, ADRS ERR, RUN, PAUSE, MASTER, USER, SUPER, KERNEL, DATA, then addressing indicators 16, 18, 22. The first prototype put some status indicators in the data row, omitted mode/data-space lamps, and moved the mapping group to the lower right.
2. **22 address lamps**, bit 21 on the left through bit 0 on the right. A magenta band runs over the lamps; ADDRESS is labeled at the right end. The first prototype's left-aligned ADDRESS label is a stylistic adaptation.
3. **16 data lamps directly below the lower 16 address positions**. PARITY HIGH and LOW sit immediately to the left of the data bank, not at the far right of the address row. DATA is labeled at the right end of the data band.
4. **Two selectors on the right**, stacked: eight-position address selector above four semantic data positions. The physical knob, legends and surrounding space form a separate right-hand block.
5. **22 switch-register paddles across the lower left**, 21 through 0, followed by a small unlabelled **lamp-test paddle**, then seven control paddles on the lower right: LOAD ADRS, EXAM, DEP, CONT, ENABLE/HALT, S INST/S BUS CYCLE, START.
6. **Power/lock key at lower left**, beneath the logo and left of the parity group. For this milestone, either omit functional power controls or render a clearly non-operational key position. Historical POWER/OFF is not permission to add host power functions.

The full photographed bezel is approximately 2:1 width:height; its black face alone is wider, roughly 2.8:1. These are rough photograph proportions, not manufacturing dimensions. In the 702-pixel-wide reference, the SR/address area occupies approximately x=50–494; the control bank x=514–654; the selector block x=520–660. This suggests roughly two thirds of the face for the registers and one fifth for selectors/controls, rather than stretching register lamps across the entire available width and putting controls on a separate full-width strip.

The photo shows dark and lighter pink/magenta/red paddles, with octal groups picked out; it does **not** show alternating cream paddles. Retain the accepted warm desktop palette in surrounding controls while moving the historical face to magenta variants. A cream/champagne outer bezel remains plausible from the photo. Use a small original text logo treatment rather than copying bitmap branding. Flat SVG geometry can reproduce proportions without photorealistic texture or dependencies.

## Switch and operator behavior

| Control | Physical interaction / state | Historical effect and mock requirement |
|---|---|---|
| SR 21…0 | Latching up/down | 22-bit stored input; low 16 bits supply deposited data. Keep the physical/input state distinct from lamp output. |
| LOAD ADRS | Momentary, depressed | Load SR as the selected console address. Do not continuously repeat while held. |
| EXAM | Momentary, depressed | Read current location; repeated consecutive EXAM operations step to the next location. |
| DEP | Momentary, **raised** | Deposit low 16 SR bits; repeated consecutive DEP operations step. Its active paddle direction should differ from EXAM. |
| CONT | Momentary, depressed | With ENABLE: resume. With HALT: single-step (instruction or bus-cycle mode on original hardware). While already running: no effect. |
| ENABLE/HALT | **Latching**, ENABLE up / HALT down | HALT stops execution. Moving back to ENABLE **does not resume by itself**; CONT or START is needed. Represent `haltSwitch` separately from `running`. |
| S INST/S BUS CYCLE | **Latching**, S INST up / S BUS CYCLE down | Controls CONT stepping on original hardware. Do not invent bus-cycle simulation; label unsupported/mock-only behavior. |
| START | Momentary, depressed | With HALT: initialize/clear system while remaining halted. With ENABLE: initialize and start at the previously loaded address. This is not the current SR unless LOAD ADRS was performed. |
| Lamp test | Momentary, raised; historically unlabelled | Illuminate while held; return to previous lamp state on release. Give it an accessible label even if the face is unlabelled. |

DEC handbook printed 11-2 explicitly separates releasing HALT from continuing execution. Printed 11-6 specifies the opposite activation directions for DEP and EXAM. Java classes separately model `PDP11_SWITCH` (permanent positions) and `PDP11_KEY` (momentary), so implementing all of these as toggle buttons would lose both historic and upstream semantics.

Memory step details (printed 11-3/11-4): EXAM then EXAM advances +2; DEP then DEP advances +2; EXAM → DEP → EXAM stays at the same location. LOAD ADRS interrupts the sequence. Real hardware does not cross a 32K-word block boundary in an EXAM/DEP step; general-register addresses increment by one and wrap specially. A simple mock may implement basic consecutive-action stepping, but must document that mapped references, CPU registers, boundary/error behavior and real memory are not implemented.

Power key LOCK blocks the seven controls from LOAD ADRS through START; SR and selectors remain usable (printed 11-5). Browser ownership lock and historical panel key lock are different state concepts and must not share one ambiguous flag.

## Selectors: labels are not wire ordinals

The physical address legend has two columns, D on the left and I on the right: USER D / USER I; SUPER D / SUPER I; KERNEL D / KERNEL I; CONS PHY / PROG PHY. The data legends are DATA PATHS, BUS REG, **µADRS FPP/CPU**, DISPLAY REGISTER (printed 11-7).

Pinned REALCONS input encoding:

| Address position | RPC value |
|---|---:|
| USER I | 0 |
| USER D | 1 |
| SUPER I | 2 |
| SUPER D | 3 |
| CONS PHY | 4 |
| KERNEL I | 5 |
| KERNEL D | 6 |
| PROG PHY | 7 |

| Data position | RPC value |
|---|---:|
| µADRS FPP/CPU | 0 |
| DISPLAY REGISTER | 1 |
| DATA PATHS | 2 |
| BUS REG | 3 |

The Java visual address detent order maps to values `[7,4,6,3,1,0,2,5]`. Its data visual detents map `[3,2,0,1,3,2,0,1]`; the historic description has four semantic selections, while Java renders eight knob positions with repeats. Some Java image filenames suggest different ordinals from the actual conversion function. Use the function and named semantic controls, not filenames or HTML option index. Keep a dedicated UI-to-wire map and test all positions.

Virtual address selections display 16-bit virtual addresses with address lamps 21–16 off, while CONS PHY/PROG PHY concern physical addresses (printed 11-7). Mapping status 16/18/22 represents CPU mapping mode, not simply which selector was chosen (printed 11-8; REALCONS lines 1135–1142). The first prototype's selector-derived mapping lamps are illustrative, not correct machine behavior. In the mock, supply explicit synthetic mapping state or mark it unavailable rather than implying an MMU.

## Edge handling and broker implications

The pinned REALCONS controller processes one momentary action per service call, detecting rising input level for LOAD_ADRS, EXAM, DEPOSIT and CONT. START is special: it observes both transitions. START rising with HALT produces reset; START falling with ENABLE produces run. Its documented nominal service interval is 20 ms, but completion takes time and polling may stall.

Consequently, a browser click must become a bounded press/release sequence whose levels are visible across consumer polls. Browser pointerup alone is not reliable: cancellation, tab closure, ownership change and transport loss all need recovery. A dropped START release cannot be repaired by blindly clearing its bit when ENABLE is active, because that falling edge can itself run the emulator. The future broker should revoke writes, inhibit start/resume, neutralize held inputs under a tested HALT/interlock sequence, and demand explicit re-arming. With no emulator or GPIO integration in this milestone, simulate and test the state machine, not hardware effects.

The source's `S_BUS_CYCLE` input is discovered, but the inspected CONT branch emits `step 1` when HALT is asserted without consulting that input. Thus an authentic label/control may coexist with an unsupported function. Do not claim single-bus-cycle execution based merely on adding the switch to the UI.

## Suggested milestone acceptance checks

- All 22 SR switches remain accessible through keyboard and pointer; labels descend 21→0.
- Status, parity and data groups follow the reference arrangement and the newly included mode lamps have explicit mock state.
- HALT→ENABLE stays stopped until CONT/START; START uses the loaded address.
- Each press produces at most one action; auto-return is visible; keyboard repeat does not create duplicate actions.
- DEP and lamp-test animate upward; other momentaries downward; latching switches remain in position.
- Pointer cancellation/disconnect/ownership revocation cannot create a start-on-release action.
- Selector semantic-to-wire mapping tests cover every value; no numeric HTML-order assumption.
- Historical omissions and synthetic values remain stated in the UI/docs rather than disguised as successful emulator behavior.
