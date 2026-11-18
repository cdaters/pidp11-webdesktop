import {test} from 'node:test';import assert from 'node:assert/strict';
import {safeGuestPaste} from '../src/guest-terminal.ts';
test('real guest paste requires one bounded reviewed ASCII line without execution controls',()=>{
 assert.equal(safeGuestPaste('ls /usr\t/bin'),'ls /usr\t/bin');
 for(const value of ['', 'x'.repeat(257), 'ls\r', 'ls\n', '\x1b[31m', 'a\x03', 'caf\u00e9']) assert.throws(()=>safeGuestPaste(value));
});
