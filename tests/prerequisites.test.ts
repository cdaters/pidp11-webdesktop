import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Plain JavaScript entry point also works before npm installation.
import {prerequisiteErrors} from '../scripts/check-prerequisites.mjs';

test('prerequisite diagnostic distinguishes unsupported Node from missing dependencies', () => {
  for (const version of ['v20.19.0', 'v22.17.0', 'unknown']) {
    assert.match(prerequisiteErrors(version)[0], /Node.js 22.18/);
  }
  for (const version of ['v22.18.0', 'v24.0.0', 'v26.1.0']) assert.deepEqual(prerequisiteErrors(version), []);
  const missing = prerequisiteErrors('v22.18.0', (name: string) => name !== 'vite');
  assert.equal(missing.length, 1);
  assert.match(missing[0], /Missing locked dependency vite.*npm ci/);
});
