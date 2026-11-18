# M4.3 paddle geometry research

Research date: 2026-11-17. This document records photographic evidence and an original SVG construction plan. It is not a dimensioned mechanical drawing or a claim of physical-hardware validation. The supplied photograph was inspected before proposing changes. No Raspberry Pi was contacted; the photograph, supplied logos, upstream sources, and existing checkpoints were left unchanged.

## Evidence

The primary reference is the user-supplied `/Volumes/TheBench/Projects/PiDP11/bottom-switches.png`: 1226 × 284 pixels, SHA-256 `8447ea53ba387e8af54074de13c59bf148b7ed5beeecd7f8f080dd929d0f52e9`. It shows the 22-bit switch register, including mixed positions. It does **not** show the function switches or lamp-test switch. It is preserved as the supplied research reference; the application renders original SVG rather than photographic sprites.

Supporting references, already cached and inspected for M4.2:

- DEC *PDP-11/70 Processor Handbook 1977–78*, chapter 11, particularly printed pp. 11-5–11-7. Local source: `/Volumes/TheBench/Projects/PiDP11/docs/PDP-11_70_Handbook_1977-78.pdf`. SHA-256 `8b6ce6229fccf49b4089ac4f4cb883aed94d7f7bc3352f3f9bf4fef2508368ad`. This establishes control functions and directions, not paddle dimensions.
- BlinkenBone [PANELSIM implementation](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/src/blinkenbone/panelsim/panelsim1170/Panel1170.java), pinned to `1ce5c0657690ebd8e5f343f36fd4473a60d4402b`. Its [photographic background](https://raw.githubusercontent.com/j-hoppe/BlinkenBone/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/resources/blinkenbone/panelsim/panelsim1170/images/pdp1170_size=1200_background.png), [coordinate table](https://raw.githubusercontent.com/j-hoppe/BlinkenBone/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/resources/blinkenbone/panelsim/panelsim1170/images/pdp1170_size=1200_coordinates.csv), SR21-up sprite and LOAD-ADRS-down sprite provide additional state-specific photographic evidence. Local copies are in ignored `.research/panel42/`.
- Henk Gooijen's full-panel photograph, credited on [w11, Figure D-1](https://wfjm.github.io/home/w11/), with [original image](https://wfjm.github.io/downloads/w11/pictures/HenkGooijen-pdp11-70-front.jpg). This corroborates arrangement; it is not the primary geometry reference for M4.3.
- [Official PiDP-11 building instructions](https://obsolescence.dev/pidp-11-building-instructions.html) distinguish the red, magenta and white switch inventory. Replica components are corroboration, not proof of original DEC mechanical dimensions.

These sources inform the original SVG paths; the Java source retains its MIT notice. See [M4.2 calibration](panel-m42-calibration.md) for source hashes, logo provenance and overall panel coordinates.

## What the primary photograph establishes

Most paddles show a broad colored upper sloping face, a narrow dark waist, and a lower projecting face with a subtle lip. Bits **6, 2, 1 and 0** instead show a small bright top cap and a long, very dark front face. Comparing this second shape with PANELSIM's explicitly named `switch_sr_21_up.png` identifies it as the raised SR position. The other visible SR paddles are down. This identification combines the photograph with implementation evidence; the photograph alone does not expose the electrical contact state.

The raised shape is not the lowered silhouette moved upward. The exposed surface areas, side wedges, apparent curvature and highlight locations change. Neither the shaft nor the actual hinge axis is directly visible. A circular center hinge or exposed metal axle would be invented detail. The dark waist is a visual crease, **not a measured pivot location**.

Approximate photographic measurements are a 52.4-pixel center pitch, about 50 pixels of visible paddle width and roughly 136 pixels from mounting edge to bottom lip. These are hand-estimated image coordinates, affected by perspective, crop and shadows. A nominal **32 × 90 SVG paddle at about 34-pixel pitch** is a useful fit to the accepted 1200 × 688 canvas; it is not an exact scale model. Keep the label strip stationary, separated from the moving geometry by the fixed dark mounting recess.

Fixed hardware colors, from left to right:

| Register bits | Color |
|---|---|
| 21 | Red |
| 20–18 | Purple |
| 17–15 | Red |
| 14–12 | Purple |
| 11–9 | Red |
| 8–6 | Purple |
| 5–3 | Red |
| 2–0 | Purple |

These are material colors. A bit becoming 1 must not change red to orange, purple to red, or either color into an illuminated surface.

## Original SVG construction plan

Coordinates below are **initial photographic fits**, relative to a 32 × 90 local viewport. They are actionable starting geometry, not measurements of a DEC part. Refine them through the required side-by-side captures. Keep the paddle origin, fixed recess and label anchors unchanged between states.

| Surface | DOWN SR geometry | UP SR geometry |
|---|---|---|
| Upper region | Broad upper face, approximately x=1…31 at y=2; narrows toward x=2…25 at y=40 | Small cap, approximately x=1…31 at y=2, narrowing to x=5…27 at y=12–13 |
| Central region | Narrow shaded crease around y=40…47 | Long dark front, beginning at x=5…27, y=13; shallow curvature rather than a flat translated rectangle |
| Lower region | Projecting face broadens from x=2…25 at y=44 to x=2…31 at y=85…88 | Predominantly dark lower face, widening toward x=1…30 at y=84…88 |
| Lip | Small molded edge around y=85…89, less bright than exposed upper face | Narrow subdued bottom edge; avoid copying the large DOWN lower plane unchanged |
| Side | Thin dark wedge on the right; black recess visible in adjacent gaps | Thin dark side plane; cap edge and long front define the raised silhouette |

Possible starting paths for the two dominant faces:

```text
DOWN upper: M1 2 L31 2 C29 12 26 24 25 40 L2 39 C0.5 25 0 12 1 2 Z
DOWN lower: M2 44 L25 44 L31 85 Q31 88 27 88 L5 88 Q2 87 2 84 L0 55 Z
UP cap:     M1 2 L31 2 L27 13 H5 Z
UP front:   M5 13 L27 13 C24 31 25 56 30 82 L29 88 L1 88 C6 65 6 34 5 13 Z
```

Use a shared dark recess behind these paths, a narrow side plane and restrained lip/crease accents. Reuse gradients by material and surface orientation. Favor a few SVG paths and gradients over blur filters or many small highlight shapes. Discrete pose changes are preferable to an inaccurate sweeping rotation; any interpolation must keep the mounting cue fixed and respect reduced motion. Do not animate numbered labels.

### Color evidence and limits

Representative decoded RGB pixels from the supplied image provide an initial palette. They are **image samples**, not calibrated DEC paint or plastic specifications. Lighting, camera processing, display color management and the original material's age are unknown.

| Region | Example source pixel | Approximate RGB / hex |
|---|---|---|
| Red DOWN upper face | (65,150) | (190,34,64), `#be2240` |
| Red lower face, middle | (65,224) | (85,53,54), `#553536` |
| Red lower face, bottom | (65,245) | (51,16,17), `#331011` |
| Purple DOWN upper face | (120,150) | (99,38,75), `#63264b` |
| Purple lower face, middle | (120,224) | (60,48,50), `#3c3032` |
| Purple lower face, bottom | (120,245) | (31,19,21), `#1f1315` |
| Purple UP cap, bit 6 | (850,125) | (157,66,119), `#9d4277` |
| Purple UP front, bit 6 | (850,170) | (25,10,16), `#190a10` |
| Black gap | (91,180) | (5,1,1), `#050101` |

Do not use one global brighten-on-active filter. The raised cap can be brighter while most of its front becomes substantially darker. This redistribution of light is a stronger orientation cue than changing the base material color.

## Function switches and the authentic lamp-test paddle

There are **seven labeled function switches plus a separate unlabeled lamp-test switch**. DEC handbook §11.8.4, printed pp. 11-6–11-7, explicitly locates lamp test between the switch register and LOAD ADRS and specifies raising it to illuminate all console indicators. Keep the cream/white paddle in that gap and leave its historical label strip blank. An accessible name or companion help text can identify it without inventing a printed panel legend.

PANELSIM corroborates this position: `switch_lamptest_up.png` is located at (837,506) in the 1200-pixel coordinate table. Java declares it as a momentary `PDP11_KEY` with no Blinkenlight API input control; press and release change the local panel self-test mode. The Java member comment “not on physical panel” is inconsistent with the DEC manual if read as a statement about original hardware. It must not override the primary manual or be used to remove the paddle. The exact reason for that upstream comment is unresolved.

| Control, left to right | Material | Active direction / behavior supported by the inspected sources |
|---|---|---|
| Unlabeled lamp test | Cream/white | Raise, momentary; local panel test in PANELSIM |
| LOAD ADRS | Red | Depress, momentary |
| EXAM | Purple | Depress, momentary |
| DEP | Red | Raise, momentary |
| CONT | Purple | Depress, momentary |
| ENABLE / HALT | Red | Latching; HALT corresponds to the down sprite |
| S/INST / S/BUS CYCLE | Purple | Latching; S/BUS CYCLE corresponds to the down sprite |
| START | Red | Down sprite, momentary; existing REALCONS semantics remain authoritative |

The primary switch-register photograph cannot establish function-paddle geometry. The inspected PANELSIM `switch_load_adrs_down.png` (42 × 97 including sprite bounds) has a long exposed front plane and a small bright bottom lip; it differs from the broad-upper-face/dark-lower-face SR-down photographic pose. Its SR21-up sprite (47 × 94 including bounds) has the small cap and dark long front seen in the supplied photograph. Transparent bounds and shadows must not be treated as physical paddle width.

This is a reason to separate **electrical state**, **control type** and **visual pose** in one reusable renderer. A momentary control can have a rest pose and a raised/depressed active pose; latching switches retain their selected pose. Do not assume that every electrical 1 uses the SR-UP shape, or every source filename containing `down` must have the identical projected silhouette. The background and active sprite establish each control's view. A small pose mapping inside a shared renderer is preferable to separate interaction implementations.

An initial active-depressed function pose can use a long colored front extending from approximately x=1…29, y=2 to x=10…27, y=81, with a bright but narrow molded lower edge around y=82…89 and dark side wedges. This is a **secondary-reference approximation** requiring visual comparison. The exact spring-return angles, internal travel and hidden pivot remain unknown. Preserve current press/release, keyboard/touch cancellation and broker semantics independently of this artwork.

## Validation and remaining uncertainty

For a directly comparable mixed-state capture, use UP bits 6, 2, 1 and 0, with all other register bits DOWN. Compare the reference and rendered crop at equal register-bank width. Also capture all-down, all-up, isolated red and purple paddles, all function controls at rest, held DEP/lamp test, held LOAD/START, and both latch positions. Verify that labels do not move and that the material color group does not change.

This research does not establish millimeter dimensions, exact pivot position, original molded-part radii, calibrated plastic colors, spring force or travel angles. It also does not certify the resulting implementation: the final rendered screenshots and interaction tests must supply that evidence. Photographic similarity and historical semantics are separate checks. No simulated image can demonstrate actual PiDP-11 control or safety behavior.
