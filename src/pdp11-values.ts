/** Exact, offline PDP-11 values. No model, guest or bitwise signed-32 coercion. */
export type Radix = 2 | 8 | 10 | 16;
export type Width = 8 | 16 | 22;

/** Input radix is explicit: leading zeroes never change it. A matching 0b/0o/0x
 * prefix is optional. Negative decimal is admitted only for signed 16-bit input. */
export function parsePDPValue(
  input: string,
  radix: Radix,
  width: Width,
  signed = false,
): bigint {
  if (![2, 8, 10, 16].includes(radix) || ![8, 16, 22].includes(width))
    throw Error("Unsupported radix or width");
  let digits = input.trim();
  if (!digits || digits.length > 64) throw Error("Enter at most 64 digits");
  const negative = digits.startsWith("-");
  if (negative) {
    if (!signed || width !== 16 || radix !== 10)
      throw Error("Negative input requires signed decimal 16-bit mode");
    digits = digits.slice(1);
  }
  const prefix = { 2: "0b", 8: "0o", 10: "", 16: "0x" }[radix];
  if (prefix && digits.toLowerCase().startsWith(prefix))
    digits = digits.slice(2);
  const valid = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-f]+$/i,
  }[radix];
  if (!valid.test(digits)) throw Error("Invalid digits for the selected radix");
  let value = BigInt((prefix || "") + digits);
  if (negative) value = -value;
  if (signed) {
    if (width !== 16 || radix !== 10)
      throw Error("Signed input requires decimal 16-bit mode");
    if (value < -32768n || value > 32767n)
      throw Error("Signed word range is -32768 through 32767");
    if (value < 0n) value += 65536n;
  } else if (value >= 2n ** BigInt(width))
    throw Error(`Overflow: value must fit ${width} bits`);
  return value;
}

/** A mask is interpreted in the same explicit radix and width, always unsigned.
 * Formatting an instruction word does not decode or execute that instruction. */
export function describePDPValue(
  input: string,
  radix: Radix,
  width: Width,
  signed = false,
  mask?: string,
) {
  const value = parsePDPValue(input, radix, width, signed);
  const masked =
    mask === undefined || mask.trim() === ""
      ? value
      : value & parsePDPValue(mask, radix, width);
  return {
    unsigned: value.toString(10),
    signed16:
      width === 16
        ? (value >= 32768n ? value - 65536n : value).toString()
        : null,
    octal: value.toString(8).padStart(Math.ceil(width / 3), "0"),
    hex: value
      .toString(16)
      .toUpperCase()
      .padStart(Math.ceil(width / 4), "0"),
    binary: value.toString(2).padStart(width, "0"),
    bits: Array.from({ length: width }, (_, bit) => bit).filter(
      (bit) => (value & (1n << BigInt(bit))) !== 0n,
    ),
    maskedOctal: masked.toString(8).padStart(Math.ceil(width / 3), "0"),
    interpretation:
      width === 22
        ? "22-bit physical address (not installed RAM)"
        : width === 8
          ? "8-bit byte"
          : "16-bit word / virtual address / instruction word",
  };
}

/** The host owns these detached DOM controls; this function creates no timers. */
export function mountPDPValues(host: HTMLElement): void {
  host.innerHTML = `<details><summary>Exact PDP-11 values · no model required</summary><p>Choose the input radix explicitly. Leading zeroes do not change it. The result below is computed locally and is never replaced by a model answer.</p><div class="pdp-values-fields"><label>Value <input aria-label="Exact value" value="177776" maxlength="64"></label><label>Radix <select aria-label="Value radix"><option value="8">Octal</option><option value="10">Decimal</option><option value="16">Hexadecimal</option><option value="2">Binary</option></select></label><label>Width <select aria-label="Value width"><option value="16">16-bit word / virtual</option><option value="8">8-bit byte</option><option value="22">22-bit physical</option></select></label><label><input type="checkbox" aria-label="Signed input">Signed decimal input</label><label>AND mask (optional, same radix)<input aria-label="Value mask" maxlength="64"></label><button type="button">Calculate exactly</button></div><pre role="status" aria-label="Exact result"></pre></details>`;
  const field = (label: string) =>
    host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  host.querySelector("button")!.onclick = () => {
    const output = host.querySelector("pre")!;
    try {
      const result = describePDPValue(
        field("Exact value").value,
        Number(field("Value radix").value) as Radix,
        Number(field("Value width").value) as Width,
        field("Signed input").checked,
        field("Value mask").value,
      );
      output.textContent = `Exact local calculation · ${result.interpretation}\nOctal ${result.octal} = decimal ${result.unsigned} = hex ${result.hex}\nBinary ${result.binary}\n${result.signed16 === null ? "" : `Signed 16-bit: ${result.signed16}\n`}Set bits: ${result.bits.join(", ") || "none"}\nAND-mask result (octal): ${result.maskedOctal}`;
    } catch (error) {
      output.textContent = (error as Error).message;
    }
  };
}
