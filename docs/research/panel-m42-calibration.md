# M4.2 panel calibration and supplied DIGITAL assets

Research date: 2026-11-17 UTC (2026-11-16 Arizona). This is a reference/calibration record for original SVG artwork, not a mechanical drawing or a claim of hardware integration. Work used public references and existing local manuals only. No Pi was contacted. Original supplied logos and manuals were not modified.

## Evidence and reproducibility

| Source | What was directly inspected | Confidence / limit |
|---|---|---|
| DEC *PDP-11/70 Processor Handbook 1977–78*, local `/Volumes/TheBench/Projects/PiDP11/docs/PDP-11_70_Handbook_1977-78.pdf` | Chapter 11, printed 11-1 through 11-8; cached page renders | Authoritative labels/functions; not calibrated mechanical dimensions |
| Henk Gooijen photograph, [w11 Fig D-1](https://wfjm.github.io/home/w11/), [image](https://wfjm.github.io/downloads/w11/pictures/HenkGooijen-pdp11-70-front.jpg) | 702×349 image, visible arrangement and switch directions | Different viewing angle/crop from PANELSIM; its 2.01:1 image ratio is not a mechanical aspect-ratio specification |
| BlinkenBone pinned `1ce5c0657690ebd8e5f343f36fd4473a60d4402b`, [PANELSIM Java](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/src/blinkenbone/panelsim/panelsim1170/Panel1170.java) | Controls, mouse semantics, detent-to-wire mapping, asset-loading convention | Exact inspected source behavior; filenames alone are insufficient to determine wire ordinals |
| Same pin, [1200-coordinate CSV](https://raw.githubusercontent.com/j-hoppe/BlinkenBone/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/resources/blinkenbone/panelsim/panelsim1170/images/pdp1170_size=1200_coordinates.csv) and [photographic background](https://raw.githubusercontent.com/j-hoppe/BlinkenBone/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/resources/blinkenbone/panelsim/panelsim1170/images/pdp1170_size=1200_background.png) | CSV coordinates, 1200×688 background, selected LED/switch/knob sprite pixel dimensions | Exact raster coordinates and dimensions; photograph-derived, not physical measurements |
| [Oscar's building instructions](https://obsolescence.dev/pidp-11-building-instructions.html) | Parts list and assembly explanations | Documents red LEDs and red/magenta/white switches; not a calibrated colorimetry specification |
| Supplied `/Volumes/TheBench/Projects/PiDP11/digital-logo-offWht.svg` and `/Volumes/TheBench/Projects/PiDP11/digital-logo-red.svg` | XML geometry, viewBox, fill styles, element counts and hashes | User-provided source geometry; originals and hashes preserved |

Research-only downloads reside in ignored `.research/panel42/`. No upstream photograph or sprite is proposed as a shipped UI asset. Java source contains Joerg Hoppe's MIT notice. The application remains an independent companion, not an official DEC product.

Hashes:

```text
supplied offWht.svg  f51197843709288fbcba05707fcd96468a81743e8fc82c13de54dd1f5c52297d
supplied red.svg     3a31058789214c20c277a4f08e10f312eb9da11ee79c99ba5215341a2f846e44
PANELSIM CSV 1200    d6558219440caf2a99738c846707584c58c022cbea8947333ac1aa9422762e93
PANELSIM CSV 5424    43c7662380f52076a341a7fa21c0c9a07594d325484d0e01e84bbdcd7fab6e9a
PANELSIM background 721ad797ab1498477c570e49cc26d7d868be5b37380c4145345181d900eee931
Henk photograph     f833ef19ced2fb53ea60270992a10e0827505802d3af92afc5e22d44c8c14014
local DEC handbook  8b6ce6229fccf49b4089ac4f4cb883aed94d7f7bc3352f3f9bf4fef2508368ad
```

## Geometry decision

The M4.1 panel used `viewBox="0 0 1120 480"` (2.33:1). This compressed the vertical arrangement relative to both inspected photographs. A useful new reference canvas is **1200×688**, matching the known PANELSIM background exactly; 1120×642 is an equivalent uniformly scaled canvas. Full-panel and desktop-integrated modes must use the same SVG and state adapter, changing only available space/zoom and surrounding controls. Do not stretch X and Y independently.

This is a deliberate photographic calibration, **not proof that the physical panel is 1.744:1**. The source photograph includes black margins, a substantial lower bezel and perspective; another legitimate view has a different crop. No verified production mechanical dimensions were located. Do not print guessed inch/millimetre dimensions in the UI or documentation.

At the 1200×688 reference scale, the following body/label extents are visual estimates from the background (typically ±2–5 px):

| Element | Approximate reference placement |
|---|---|
| Outer cream/champagne bezel | x21, y36, width1156, height630 |
| Inner black face | x48, y128, width1104, height382; rounded corners |
| DIGITAL embossed mark | x83, y58, width110, height33 |
| `pdp11/70` outline model mark | x88, y193, width147, height42 |
| ADDRESS colored strip | x89, y253, width750, height17 |
| DATA colored strip | x296, y350, width544, height18 |
| SR legend boxes | y450–494, x88–839 |
| Paddle row, neutral visible bodies | approximately y510–599 |
| Address selector pivot | approximately (1086,263) |
| Data selector pivot | approximately (1086,387) |
| Power key | approximately (122,388), with POWER/LOCK above and OFF below |

The selector sprite bounding boxes include long shadows: the address sprite starts (1037,229), dimensions76×97; the data sprite starts (1032,358), dimensions81×92. Their bounding-box centers are **not** the knob pivots. Pivot estimates above were inspected from the white pivot dot. A flat SVG should use the actual approximate pivot and omit the photographed shadow.

## Exact lamp anchors versus normalized SVG geometry

CSV positions are sprite **top-left** coordinates. Selected address/data sprites are15×15, so add7.5px to obtain their image center. The source has small photographed alignment variations; uniform rows are an explicit SVG normalization, not a claim that source coordinates are perfectly collinear.

| Element | Inspected center in 1200 canvas |
|---|---|
| ADDRESS21 / ADDRESS0 | (105.5,308.5) / (824.5,310.5) |
| DATA15 / DATA0 | (311.5,406.5) / (825.5,407.5) |
| PARITY HIGH / LOW | approximately (209.5,407.5) / (243.5,406.5), assuming matching15px lamp crop |
| PAR ERR | (448,217.5), inspected14×15 sprite |
| ADRS ERR | (482.5,218.5),15×15 |
| RUN / PAUSE | (517,218.5),14×15 / (551,218),14×14 |
| MASTER / USER | (585.5,218.5) / (619.5,218.5),15×15 |
| SUPER / KERNEL | (653.5,218.5) / (688.5,218.5),15×15 |
| DATA space | (722,218.5),14×15 |
| ADDRESSING16 /18 /22 | (757,218),14×14 / (791.5,218.5),15×15 / (826,218.5),14×15 |

For original compact SVG artwork, a justified normalization is `addressX(bit) = 105.5 + (21-bit)*(719/21)`, addressY310, dataY407 with DATA15…0 aligned under ADDRESS15…0. Keep the status row around y218. Do not move PARITY lamps into the status row or derive mapping lamps from selector position. Actual observed lamps must remain authoritative; lack of a valid lamp value must not be replaced by invented activity.

No individual address/data bit numbers are printed above the lamps in the inspected PANELSIM photograph; the numbered SR legend boxes supply the visible bit numbering. Keep bit numbers in accessible labels/tooltips without adding ahistorical visible rows of numbers. The twelve status labels read PAR ERR, ADRS ERR, RUN, PAUSE, MASTER, USER, SUPER, KERNEL, DATA, then16/18/22 under ADDRESSING. The photograph and manual support parity HIGH then LOW, left of DATA15.

The lit PANELSIM LED sprite is red, and the PiDP assembly instructions specify red LEDs. A restrained red core with a darker red bezel better reflects these references than the existing amber lamp styling. Exact brightness, red wavelength, diffuser appearance and incandescent-versus-replica LED behavior are not calibrated. Avoid claiming light intensity is a real measured machine signal unless the backend supplies such a value.

## Paddles and color groups

Exact sprite top-left X values in the1200 CSV:

```text
SR21…0: 77,115,150,185,220,255,289,323,359,393,427,
         462,496,530,565,600,634,668,703,737,771,805
Lamp test837; LOAD ADRS873; EXAM907; DEP940; CONT976;
ENABLE/HALT1010; S INST/S BUS CYCLE1044; START1078.
Most paddle sprite Y507; DEP/lamp-test Y506.
```

The inspected SR21 active sprite is47×94; LOAD active sprite42×97. These are transparent/photo crop bounds, not clean paddle widths. Use approximately34px center pitch with original flat paddle geometry, a narrow inter-paddle gap and hit targets appropriate to the display scale. A 44px UI touch target may extend beyond the visible paddle, but overlapping targets must not steal adjacent switches. At phone scale provide zoom/scroll or an equivalent accessible control list rather than shrinking all controls into unusable touch targets.

Source color grouping: bit21 is red; bits20–18 purple/magenta;17–15 red;14–12 purple;11–9 red;8–6 purple;5–3 red;2–0 purple. In the M4.1 formula the red/purple choices were reversed. The same grouping appears in the ADDRESS/DATA colored strips. DATA15 is the last red bit of its octal group, followed by14–12 purple. The lamp-test paddle is white. The seven control paddles alternate red, purple, red, purple, red, purple, red.

Use upper/lower text exactly as appropriate: LOAD / ADRS; EXAM; DEP; CONT; ENABLE / HALT; S INST / S BUS CYCLE; START. DEP raises, EXAM lowers; lamp test raises. ENABLE and S INST are upper latch positions. The original key-switch artwork can be shown as unavailable/inert; visual authenticity does not authorize a host POWER operation.

## Selector semantics and interaction

Address legend rows: USER D | USER I; SUPER D | SUPER I; KERNEL D | KERNEL I; CONS PHY | PROG PHY. Data legend rows: DATA PATHS | µADRS FPP/CPU; BUS REG | DISPLAY REGISTER. Place these as two columns to the left of each knob, not as a generic numeric dial.

PANELSIM circular address detents map to RPC values `[7,4,6,3,1,0,2,5]`; data detents map `[3,2,0,1,3,2,0,1]`. Preserve the already-tested semantic-to-wire mapping rather than using HTML option indices or misleading sprite filenames. A simpler four-semantic-position browser data selector is reasonable if declared as a UI adaptation; it is not evidence that all original mechanics had four distinct physical detents. Java left/right halves decrement/increment with wrap, while latches toggle and momentaries remain asserted only during a press.

The web protocol's bounded pulse abstraction is intentionally different from directly forwarding browser pointer-down/up. Keep M3/M4/M4.1 semantics: ENABLE alone never resumes, START release may execute RUN, and cancellation/reconnect must never synthesize a live release. UI animation must not become a new emulator implementation. Current original REALCONS does not implement S BUS CYCLE merely because the physical label exists.

## Supplied DIGITAL logo handling

Both SVGs declare `viewBox="0 0 975 292"`, aspect ratio975/292≈3.33904. The off-white file uses seven compound path tiles with gray `#c8c8c8` fill and transparent letter cutouts. The red file uses seven `#a80c30` blocks plus white letter paths. Neither is ordinary typed lettering; replacing it with spaced text changes the geometry.

Preserve the supplied original files and hashes. For panel use, a separately named neutral-gray derivative of the off-white geometry can approximate the embossed mark; use the supplied off-white version on a dark desktop/title surface and red on a light About/identity area. Preserve paths and proportional viewBox. Avoid stretching to a guessed rectangle. An SVG `<image>`/HTML `<img>` isolates internal IDs; if inline, namespace IDs when multiple windows can render the same mark. Derived colors and stripped XML metadata should be recorded as transformations, not silently applied to the originals.

Keep DIGITAL branding primarily on the panel and use the application's own name for the shell. A brief About statement should identify this as independent companion software. The supplied originals and their provenance are preserved; no public release is part of M4.2.
