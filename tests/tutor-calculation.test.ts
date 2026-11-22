import {test} from "node:test";import assert from "node:assert/strict";
import {parseTutorCalculation,calculateTutor} from "../src/tutor-calculation.ts";
function calc(text:string){const r=parseTutorCalculation(text);assert.ok(r);return calculateTutor(r);}
test("Explicit tutor calculations reuse exact integer utilities",()=>{
 assert.match(calc('/calc 16 oct 177776'),/decimal 65534 = hex FFFE/);
 assert.match(calc('/calc 16 dec -32768 signed'),/hex 8000/);
 assert.match(calc('/calc 8 hex FF and 0F'),/decimal 15/);
 assert.match(calc('/calc 8 bin 1 shl 7'),/decimal 128/);
 assert.match(calc('/calc 8 hex 80 shr 7'),/decimal 1/);
 assert.match(calc('/calc 16 oct 017 xor 7'),/decimal 8/);
 assert.match(calc('/calc 22 hex 3FFFFF'),/decimal 4194303/);
 assert.match(calc('/calc 8 dec 017 or 2'),/decimal 19/);
 assert.equal(parseTutorCalculation('Please convert 177776'),null);
});
test("Malformed operations, digits, shift ranges and overflow fail closed",()=>{
 for(const text of ['/calc','/calc 12 oct 1','/calc 16 oct 178000','/calc 8 hex 100','/calc 16 dec -32769 signed','/calc 16 dec -1','/calc 8 bin 1 shl 8','/calc 8 bin 10 shl 7','/calc 16 oct 1 + 2','/calc 16 oct 1 and','/calc 16 oct 1; shutdown','/calc 16 oct 1 shr -1','/calc 16 oct 1 and 1 trailing']) assert.throws(()=>calc(text),text);
});
