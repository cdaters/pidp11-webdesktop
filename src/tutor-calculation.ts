import { parsePDPValue, describePDPValue, type Width, type Radix } from "./pdp11-values.ts";

export interface TutorCalculation {
  width: Width;
  radix: Radix;
  value: string;
  signed: boolean;
  operation?: "and" | "or" | "xor" | "shl" | "shr";
  operand?: string;
}

const radices: Readonly<Record<string, Radix>> = { oct: 8, dec: 10, hex: 16, bin: 2 };

/** Only the explicit /calc grammar is recognized. Never evaluate natural language. */
export function parseTutorCalculation(text: string): TutorCalculation | null {
  if (!/^\/calc(?:\s|$)/i.test(text)) return null;
  if (text.length > 256) throw Error("Calculation is too long");
  const parts = text.trim().split(/\s+/);
  parts.shift();
  const width = Number(parts.shift());
  const radixName = parts.shift();
  const value = parts.shift();
  const radix = radixName && Object.hasOwn(radices, radixName) ? radices[radixName] : undefined;
  if (![8, 16, 22].includes(width) || !radix || !value) {
    throw Error("Use /calc WIDTH oct|dec|hex|bin VALUE [signed] [and|or|xor MASK or shl|shr COUNT]");
  }
  const signed = parts[0] === "signed";
  if (signed) parts.shift();
  const operation = parts.shift();
  const operand = parts.shift();
  if (parts.length || (operation && (!["and", "or", "xor", "shl", "shr"].includes(operation) || !operand))) {
    throw Error("Unsupported calculation expression");
  }
  return { width: width as Width, radix, value, signed, operation: operation as TutorCalculation["operation"], operand };
}

/** Exact fixed-width arithmetic. Shifts are logical; overflow is never wrapped. */
export function calculateTutor(request: TutorCalculation): string {
  let value = parsePDPValue(request.value, request.radix, request.width, request.signed);
  if (request.operation) {
    if (request.operand === undefined) throw Error("Missing operand");
    if (request.operation === "shl" || request.operation === "shr") {
      if (!/^[0-9]{1,2}$/.test(request.operand)) throw Error("Shift count must be a decimal integer");
      const count = Number(request.operand);
      if (count >= request.width) throw Error("Shift count must be smaller than the selected width");
      value = request.operation === "shl" ? value << BigInt(count) : value >> BigInt(count);
    } else {
      const mask = parsePDPValue(request.operand, request.radix, request.width);
      switch (request.operation) {
        case "and": value &= mask; break;
        case "or": value |= mask; break;
        case "xor": value ^= mask; break;
        default: throw Error("Unsupported operation");
      }
    }
  }
  const result = describePDPValue(value.toString(), 10, request.width);
  return `Exact local calculation (no model): octal ${result.octal} = decimal ${result.unsigned} = hex ${result.hex}\nBinary ${result.binary}${result.signed16 === null ? "" : ` · signed 16-bit ${result.signed16}`}\nSet bits: ${result.bits.join(", ") || "none"}. ${result.interpretation}.`;
}
