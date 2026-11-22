# Historical reference desk and exact values

The companion includes a small, offline historical reference library and an exact value calculator. Neither needs a model, network connection or guest. They are available inside **AI Companion**, even when its optional provider is unavailable.

## Find and inspect a reference

1. Open **Search historical references · offline**. Enter a question or several subject words, such as `PDP-11/70 virtual physical architecture`.
2. Optionally select a system. This is an exact filter; a V7 note must not become an RT-11 procedure.
3. Choose **Search references**, then expand a result to read its complete curated passage. The source link includes organization, edition, document and section information.
4. For model chat, inspect the destination and sharing scope. **Include up to two matching reference notes** searches the final question only when you deliberately send it. Selecting an explicit reference topic takes precedence over search. It does not silently inspect terminal output or earlier messages.

The catalog is intentionally small. `focused-notes` means relevant notes were found, not that they answer every part of a question. `no-match`, `ambiguous-version` and `incomplete` are visible limitations. A generic RSX question without a specified release/interpreter is not automatically treated as RSX-11M. RSTS/E and RSX-11M-PLUS have explicit scope notices, not verified administration recipes. Select a system and refine the question where appropriate; changing a filter cannot supply a missing manual.

The deterministic offline chat guide remains available separately. Searching the reference desk is more precise than relying on that guide's small demonstration response set.

## Sources and integrity

[`references.json`](../../internal/companion/references.json) is the single Go/TypeScript catalog. Its 24 entries cover V7, RT-11SJ V05.03, RSX-11M, 2.11BSD, PDP-11/70 addresses/instructions, octal, SIMH, REALCONS, terminal personalities, Tektronix graphics and LP11/PC11. Two entries explicitly record missing RSTS/E/PLUS operational coverage.

The distribution contains original short explanatory notes and source metadata. It does **not** contain DEC manual PDFs, model weights, guest disks or private captures. Existing project source/evidence links are pinned to the Phase A revision. Historical facts use the retained DEC PDP-11/70 1977–78 handbook text and the previously reviewed RSX-11M Beginner's Guide (June 1977), section 3.2.1. Ten Phase C additions use the handbook, V7 manual source preserved by TUHS, the VT100 User Guide transcription and the August 11, 2022 SIMH manual; [metadata and source digests](../../lab/m593c/results/sources.json) identify each retained input. Other focused notes link to tested project records, which distinguish modern browser behavior from original hardware behavior.

Every note has a SHA-256 digest of its exact UTF-8 text. Source digests are provided for available local project records and the retained handbook **OCR text**, explicitly identified as such. An OCR digest is not the PDF's digest. The RSX manual and archive-only scope notices do not claim an unavailable source-file checksum. Several original archive endpoints refused new retrieval during this milestone; retained reviewed excerpts were used where available. Full manual coverage remains work to do.

Publication dates/editions, system scope, document identifiers and available sections are recorded. Unknown page numbers or editions are not invented. A source link identifies provenance, not permission to redistribute the complete source. Corrections should update the original note, digest and regression cases together; preserve the earlier benchmark catalog with its evidence.

## Retrieval and citations

The search matches curated keywords, requires substantive matches and returns at most two notes. It is case-insensitive, bounded to a 4,096-byte question and an exact system filter. It has no embeddings, database, crawler or remote search. Go and TypeScript use a shared regression corpus to guard equivalent behavior. This conservative search will miss synonyms; it deliberately does not pretend to be semantic retrieval.

The server adds its own catalog text, never caller-supplied reference instructions. The combined reference context stays below the provider's per-message limit. Documents and selected terminal excerpts remain untrusted data. No content grants tool or keyboard authority.

Model citation identifiers use `[ref:ID]`. An identifier outside the supplied notes causes the answer to be withheld. This also conservatively rejects a model quoting an invalid citation while explaining why it is invalid. A valid identifier does **not** establish that the associated claim follows from its note: testing found incorrect explanations with valid citations. The UI labels sources as retrieved context, renders model text inertly and uses only catalog-owned source links. It does not turn invented model URLs into clickable citations. Inspect the passages and original sources; model prose remains unverified advice.

Authenticated read-only search is available at `GET /api/v1/companion/references?q=...&system=...`, using the existing writer session capability even without a configured model. The optional model-host gateway exposes the same result at `/v1/references` with its own private token. Neither route invokes inference or terminal observation.

## Calculate exactly

Open **Exact PDP-11 values**, choose an input radix and width, enter a value and choose **Calculate exactly**. Octal `177776` produces decimal `65534`, hexadecimal `FFFE` and signed 16-bit `-2`. This result is calculated locally with integer arithmetic and displayed separately from model text; a model cannot replace it.

- Input radix is explicit: decimal `017` is seventeen; octal `017` is fifteen. Matching `0o`, `0x` or `0b` prefixes are optional. Invalid digits, fractions, plus signs and overflow are rejected.
- Widths are 8-bit byte, 16-bit word/virtual address/instruction word, and 22-bit physical address. Maximum unsigned values are 255, 65535 and 4194303 respectively. Physical address range is not installed memory capacity.
- Negative input requires decimal, 16-bit width and **Signed decimal input**. The admitted range is −32768 through 32767; output includes the corresponding two's-complement word.
- Binary output and set-bit positions use bit 0 as the least significant bit. An optional unsigned AND mask uses the same selected radix and width. An omitted mask leaves the value unchanged.
- Formatting a word as an instruction does not decode, validate or execute it. A 16-bit virtual value does not reveal its mapped physical address. The calculator performs no emulator or memory operation.

The exact result is not sent automatically to a provider. A user can deliberately quote it in a question, but generated prose remains separately labeled. The benchmark demonstrates why address arithmetic should use this utility rather than a chatbot.

## Exact calculations in the question box

Enter `/calc 16 oct 177776`, then use the normal Send button. The interface displays octal `177776`, decimal `65534`, hexadecimal `FFFE`, binary, signed 16-bit `-2` and the set bit positions. This is local integer arithmetic even when a model is selected. Shared text remains unsent, and the calculation does not enter model history.

The grammar is `/calc WIDTH BASE VALUE [signed] [OP OPERAND]`. WIDTH is 8, 16 or 22; BASE is `oct`, `dec`, `hex` or `bin`. `signed` permits signed decimal 16-bit input. OP is `and`, `or`, `xor`, `shl` or `shr`. Masks use the selected base; shift counts are decimal, from zero to one less than WIDTH. Right shifts fill with zeros, and left-shift overflow is rejected. Arbitrary expressions and natural-language guesses are not evaluated. For example, `/calc 16 hex FFFE shr 1` gives `7FFF`.

## What claim review means

Model answers remain labeled **unverified explanation**. The expandable review distinguishes recognized support, contradiction, unverified prose, calculations, unobserved machine state and version-dependent commands. A supported annotation applies only to one complete recognized atomic statement and its exact supplied catalog passage. It does not approve the answer, a command or a guest action.

The nine current fact rules are deliberately narrow: word/address widths, three addressing-mode numbers, MOVB register sign extension, vector size and V7 `ls`. Correct paraphrases, quoted claims and compound statements often remain unverified. The 45-response Phase C comparison produced no atomic support/contradiction matches, despite a passing 20-case adversarial rule corpus. Read the actual passages; a valid citation is not a correctness test. [Measured limits](../lab/M5.9.3-C.md).
