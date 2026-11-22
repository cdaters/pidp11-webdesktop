// Isolated route tests for our optional module; no upstream server or model runs.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { installReadOnly } from "./read-only.mjs";

function routes(t) {
  const directory = mkdtempSync(join(tmpdir(), "pidp-readonly-"));
  const prior = {};
  const env = {
    PIDP11_READONLY: "1",
    COMPANION_ORIGIN: "https://localhost:8510",
    ADAPTER_URL: "https://localhost:19002/api/pidp11",
    LOCAL_BASE_URL: "https://localhost:19001/v1",
    LOCAL_MODEL: "test-model",
  };
  for (const [i, name] of [
    "COMPANION_LOGIN_FILE",
    "ADAPTER_READ_FILE",
    "ADAPTER_SHARE_FILE",
    "MODEL_TOKEN_FILE",
  ].entries()) {
    const path = join(directory, name);
    writeFileSync(path, String(i).repeat(32), { mode: 0o600 });
    env[name] = path;
  }
  for (const [name, value] of Object.entries(env)) {
    prior[name] = process.env[name];
    process.env[name] = value;
  }
  const handlers = new Map();
  installReadOnly({
    use() {},
    get(path, fn) {
      handlers.set("GET " + path, fn);
    },
    post(path, fn) {
      handlers.set("POST " + path, fn);
    },
  });
  t.after(() => {
    rmSync(directory, { recursive: true });
    for (const [name, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  return handlers;
}
function response() {
  const r = new EventEmitter();
  r.statusCode = 200;
  r.status = (n) => ((r.statusCode = n), r);
  r.json = (v) => ((r.body = v), r);
  r.end = (v) => ((r.body = v), r);
  r.writeHead = (n, h) => ((r.statusCode = n), (r.headers = h), r);
  return r;
}

test("null message elements fail closed without an unhandled rejection", async (t) => {
  const handler = routes(t).get("POST /api/chat");
  for (const messages of [
    [null],
    [null, { role: "user", content: "question" }],
  ]) {
    const res = response();
    await handler({ body: { messages } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("a changed shared excerpt cannot replace the one this page approved", async (t) => {
  const handler = routes(t).get("POST /api/chat");
  const original = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/references"))
      return Response.json({ notes: [] });
    if (String(url).endsWith("/screen"))
      return Response.json({
        selection_id: "b".repeat(32),
        text: "Another browser approved this private excerpt",
      });
    modelCalls++;
    return Response.json({
      choices: [{ message: { content: "Explanation" } }],
    });
  };
  t.after(() => (globalThis.fetch = original));
  const res = response();
  await handler(
    {
      body: {
        messages: [{ role: "user", content: "Explain my selected text" }],
        includeSelection: true,
        selectionId: "a".repeat(32),
      },
    },
    res,
  );
  assert.equal(modelCalls, 0, "replacement excerpt reached the model");
  assert.notEqual(res.statusCode, 200);
});

test("matching receipt sends only the explicitly approved excerpt; missing receipt is refused", async (t) => {
  const handler = routes(t).get("POST /api/chat");
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/references"))
      return Response.json({ notes: [] });
    if (String(url).endsWith("/screen"))
      return Response.json({
        selection_id: "a".repeat(32),
        text: "bounded approved text",
      });
    calls.push(JSON.parse(options.body));
    return Response.json({
      choices: [{ message: { content: "Experimental explanation" } }],
    });
  };
  t.after(() => (globalThis.fetch = original));
  const missing = response();
  await handler(
    {
      body: {
        messages: [{ role: "user", content: "Explain" }],
        includeSelection: true,
      },
    },
    missing,
  );
  assert.equal(missing.statusCode, 400);
  assert.equal(calls.length, 0);
  const success = response();
  await handler(
    {
      body: {
        messages: [{ role: "user", content: "Explain" }],
        includeSelection: true,
        selectionId: "a".repeat(32),
      },
    },
    success,
  );
  assert.equal(success.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].messages.at(-1).content,
    "UNTRUSTED SELECTED TEXT; NOT LIVE MACHINE STATE:\nbounded approved text",
  );
});

test("publication carries its pre-revoke epoch and never retries a refused write", async (t) => {
  const handler = routes(t).get("POST /api/selection");
  const original = globalThis.fetch;
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith("/status"))
      return Response.json({
        attachment_confirmed: true,
        publication_epoch: "old-instance:3",
        attachment: {
          endpoint: "tty0",
          generation: "a",
          simulator_generation: "s",
        },
      });
    writes++;
    assert.equal(JSON.parse(options.body).publication_epoch, "old-instance:3");
    return new Response("retired", { status: 409 });
  };
  t.after(() => (globalThis.fetch = original));
  const res = response();
  await handler({ body: { consent: true, text: "approved passage" } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(writes, 1);
});

test("browser closure cancels a delayed model and releases the single request slot", async (t) => {
  const handler = routes(t).get("POST /api/chat");
  const original = globalThis.fetch;
  let entered;
  const ready = new Promise((resolve) => (entered = resolve));
  let cancelled = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/references"))
      return Response.json({ notes: [] });
    entered();
    return new Promise((resolve, reject) =>
      options.signal.addEventListener(
        "abort",
        () => {
          cancelled = true;
          reject(Error("cancelled"));
        },
        { once: true },
      ),
    );
  };
  t.after(() => (globalThis.fetch = original));
  const req = {
      body: { messages: [{ role: "user", content: "Explain MOVB" }] },
    },
    res = response();
  const pending = handler(req, res);
  await ready;
  const busy = response();
  await handler(req, busy);
  assert.equal(busy.statusCode, 429);
  res.emit("close");
  await pending;
  assert.equal(cancelled, true);
  globalThis.fetch = async (url) =>
    String(url).includes("/references")
      ? Response.json({ notes: [] })
      : new Response("unavailable", { status: 503 });
  const retry = response();
  await handler(req, retry);
  assert.equal(retry.statusCode, 502);
});

test('late successful provider reply cannot publish after browser cancellation', async (t) => {
  const handler = routes(t).get('POST /api/chat');
  const original = globalThis.fetch;
  let finish, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  globalThis.fetch = async url => {
    if (String(url).includes('/references')) return Response.json({notes:[]});
    entered();
    return new Promise(resolve => { finish = resolve; });
  };
  t.after(() => {globalThis.fetch = original;});
  const res = response();
  const pending = handler({body:{messages:[{role:'user',content:'Explain'}]}},res);
  await ready;
  res.emit('close');
  finish(Response.json({choices:[{message:{content:'late-private-canary'}}]}));
  await pending;
  assert.notEqual(res.statusCode,200);
  assert.ok(!JSON.stringify(res.body).includes('late-private-canary'));
});
