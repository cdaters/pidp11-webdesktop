/** Draft server-to-server adapter; no upstream source, browser UI or model access.
 * The caller owns preview/consent and credentials. No request is made until an
 * explicit operation. Fixed HTTPS origin, bounded replies, no redirects/retries.
 */
const required = ['publication-epoch', 'receipt-bound-read', 'explicit-revoke', 'expiry', 'unknown-os'];
const encoder = new TextEncoder();

export function negotiate(value) {
  if (value?.protocol !== 'pidp11-explicit-selection' || value.version !== '0.1-draft'
      || !Array.isArray(value.capabilities) || !required.every(name => value.capabilities.includes(name))
      || JSON.stringify(value.authority) !== '["selected-text-only"]'
      || value.maximum_selection_bytes !== 4096 || value.maximum_lifetime_seconds !== 30) {
    throw new Error('Unsupported selection contract; sharing refused');
  }
}

async function boundedJSON(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing adapter response');
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) throw new Error('Adapter response size limit');
      chunks.push(value);
    }
    const all = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(all));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function createSelectionClient({origin, readToken, publicationToken, fetch: request = globalThis.fetch}) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password
      || typeof readToken !== 'string' || typeof publicationToken !== 'string'
      || !/^[\S]{32,128}$/.test(readToken) || !/^[\S]{32,128}$/.test(publicationToken)
      || readToken === publicationToken) throw new Error('Fixed HTTPS origin and distinct credentials required');

  async function call(path, method, token, signal, body, headers = {}) {
    const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000);
    let response;
    try {
      response = await request(origin + '/api/pidp11/' + path, {
        method, redirect: 'error', signal: bounded,
        headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...headers},
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('request refused');
      }
      if (response.status === 204) return response.headers.get('X-Selection-ID');
      return await boundedJSON(response);
    } catch {
      // Do not echo transport errors, private response text, URLs or tokens.
      throw new Error('Selection operation failed, expired or cancelled; no retry');
    }
  }
  async function capabilities(signal) {
    negotiate(await call('capabilities', 'GET', readToken, signal));
  }
  return Object.freeze({
    capabilities,
    async publish(selection, {previewConfirmed, signal} = {}) {
      if (previewConfirmed !== true || typeof selection?.text !== 'string' || encoder.encode(selection.text).length > 4096) {
        throw new Error('Exact bounded preview and explicit consent required');
      }
      await capabilities(signal);
      const status = await call('status', 'GET', readToken, signal);
      if (status?.attachment_confirmed !== true || typeof status.publication_epoch !== 'string') {
        throw new Error('Current attested attachment required');
      }
      const receipt = await call('selection', 'POST', publicationToken, signal,
        {selection, consent: true, publication_epoch: status.publication_epoch});
      if (!/^[a-f0-9]{32}$/.test(receipt ?? '')) throw new Error('Missing publication receipt');
      return receipt;
    },
    async read(receipt, {signal} = {}) {
      if (!/^[a-f0-9]{32}$/.test(receipt ?? '')) throw new Error('Exact receipt required');
      await capabilities(signal);
      const selected = await call('screen', 'GET', readToken, signal, undefined, {'X-Selection-ID': receipt});
      if (selected?.selection_id !== receipt || typeof selected.text !== 'string'
          || encoder.encode(selected.text).length > 4096 || !Number.isSafeInteger(selected.expires_unix_ms)
          || selected.expires_unix_ms <= Date.now() || selected.expires_unix_ms > Date.now() + 30000) {
        throw new Error('Selection identity, size or expiry invalid');
      }
      return selected;
    },
    async revoke({signal} = {}) {
      // Revocation must remain possible even if capability negotiation fails.
      await call('selection', 'DELETE', publicationToken, signal);
    },
  });
}
