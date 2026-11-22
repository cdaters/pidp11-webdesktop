import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectionClient, negotiate} from './client.mjs';

const descriptor = {protocol: 'pidp11-explicit-selection', version: '0.1-draft',
  capabilities: ['publication-epoch', 'receipt-bound-read', 'explicit-revoke', 'expiry', 'unknown-os'],
  authority: ['selected-text-only'], maximum_selection_bytes: 4096, maximum_lifetime_seconds: 30};
const receipt = 'a'.repeat(32);
const selection = {endpoint: 'line', generation: 'attachment', simulator_generation: 'sim', text: 'deliberate fixture'};

function fixture(overrides = {}) {
  const calls = [];
  const client = createSelectionClient({origin: 'https://adapter.invalid:8449', readToken: 'r'.repeat(32), publicationToken: 'w'.repeat(32),
    fetch: async (url, options) => {
      calls.push({url, ...options});
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal);
      if (options.signal.aborted) throw new Error('private-provider-canary');
      const path = new URL(url).pathname.split('/').at(-1);
      if (overrides[path]) return overrides[path](options);
      if (path === 'capabilities') return Response.json(descriptor);
      if (path === 'status') return Response.json({attachment_confirmed: true, publication_epoch: 'instance:1'});
      if (path === 'selection') return new Response(null, {status: 204, headers: {'X-Selection-ID': receipt}});
      return Response.json({...selection, selection_id: receipt, expires_unix_ms: Date.now() + 20000});
    }});
  return {client, calls};
}

test('reject unsupported version, absent consent capabilities and added authority', () => {
  negotiate(descriptor);
  for (const value of [{...descriptor, version: '1'}, {...descriptor, capabilities: []}, {...descriptor, authority: ['selected-text-only', 'keys']}]) {
    assert.throws(() => negotiate(value));
  }
});

test('no discovery or network until explicit preview; distinct writer credential and epoch', async () => {
  const {client, calls} = fixture();
  assert.equal(calls.length, 0);
  await assert.rejects(client.publish(selection), /preview/);
  assert.equal(calls.length, 0);
  assert.equal(await client.publish(selection, {previewConfirmed: true}), receipt);
  assert.equal(calls[0].headers.Authorization, 'Bearer ' + 'r'.repeat(32));
  assert.equal(calls[2].headers.Authorization, 'Bearer ' + 'w'.repeat(32));
  assert.deepEqual(JSON.parse(calls[2].body), {selection, consent: true, publication_epoch: 'instance:1'});
  assert.equal((await client.read(receipt)).text, selection.text);
  assert.equal(calls.at(-1).headers['X-Selection-ID'], receipt);
  await client.revoke();
  assert.equal(calls.at(-1).method, 'DELETE');
});

test('capability refusal never falls back to legacy sharing; revoke remains available', async () => {
  const {client, calls} = fixture({capabilities: () => Response.json({...descriptor, version: 'unsupported'})});
  await assert.rejects(client.publish(selection, {previewConfirmed: true}));
  assert.equal(calls.length, 1);
  await client.revoke();
  assert.equal(calls.at(-1).method, 'DELETE');
});

test('substituted receipt, expired response and oversized text are withheld', async () => {
  for (const change of [{selection_id: 'b'.repeat(32)}, {expires_unix_ms: Date.now() - 1}, {text: 'x'.repeat(4097)}]) {
    const {client} = fixture({screen: () => Response.json({...selection, selection_id: receipt, expires_unix_ms: Date.now() + 20000, ...change})});
    await assert.rejects(client.read(receipt));
  }
});

test('transport failures, cancellation and oversized responses expose no private text or retry', async () => {
  for (const response of [() => {throw new Error('private-provider-canary');}, () => new Response('private-provider-canary', {status: 409}), () => new Response('x'.repeat(8193))]) {
    const {client, calls} = fixture({capabilities: response});
    await assert.rejects(client.read(receipt), error => !error.message.includes('private-provider-canary'));
    assert.equal(calls.length, 1);
  }
  const {client, calls} = fixture();
  await assert.rejects(client.read(receipt, {signal: AbortSignal.abort()}));
  assert.equal(calls.length, 1);
});

test('configuration refuses plaintext, URL credentials, path discovery and shared tokens', () => {
  for (const origin of ['http://adapter.invalid', 'https://user:secret@adapter.invalid', 'https://adapter.invalid/path']) {
    assert.throws(() => createSelectionClient({origin, readToken: 'r'.repeat(32), publicationToken: 'w'.repeat(32)}));
  }
  assert.throws(() => createSelectionClient({origin: 'https://adapter.invalid', readToken: 'r'.repeat(32), publicationToken: 'r'.repeat(32)}));
});

test('publication uses the exact preview snapshot across asynchronous negotiation', async () => {
  const preview = {...selection};
  const {client, calls} = fixture({status: () => {
    preview.text = 'unreviewed replacement';
    preview.generation = 'different attachment';
    return Response.json({attachment_confirmed: true, publication_epoch: 'instance:1'});
  }});
  await client.publish(preview, {previewConfirmed: true});
  assert.deepEqual(JSON.parse(calls.at(-1).body).selection, selection);
});

test('malformed publication is refused locally before any network operation', async () => {
  for (const value of [null, [], {...selection, text: '\ud800'}, {...selection, endpoint: ''},
    {...selection, generation: 3}, {...selection, simulator_generation: 's'.repeat(129)},
    {...selection, viewer_revision: -1}, {...selection, keys: 'CONT'}]) {
    const {client, calls} = fixture();
    await assert.rejects(client.publish(value, {previewConfirmed: true}));
    assert.equal(calls.length, 0);
  }
});

test('cancellation observed during a delayed body cannot deliver an excerpt', async () => {
  const controller = new AbortController();
  const {client, calls} = fixture({screen: () => new Response(new ReadableStream({
    start(stream) {
      setTimeout(() => {
        controller.abort();
        // Model/transport may finish after cancellation. The consumer still
        // checks cancellation before returning the completed private response.
        stream.enqueue(new TextEncoder().encode(JSON.stringify({...selection,
          selection_id: receipt, expires_unix_ms: Date.now()+20000})));
        stream.close();
      }, 10);
    },
  }))});
  await assert.rejects(client.read(receipt,{signal:controller.signal}));
  assert.equal(calls.length,2);
});
