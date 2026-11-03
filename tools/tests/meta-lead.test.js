'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');

const SITE = path.join(__dirname, '..', '..', 'SOLV_ING_Skales_PLASKA_wszystko_do_roota');
const handler = require(path.join(SITE, 'api', 'meta-lead.js'));
const { buildPayload, sha256 } = handler;
const leadForm = require(path.join(SITE, 'lead-form.js'));

const ENV = { META_PIXEL_ID: '123456', META_CAPI_TOKEN: 'secret-token', META_GRAPH_VERSION: 'v26.0' };
const BODY = {
  event_id: 'ev-1', email: '', telefon: '505 119 531', owner: 'tak', consent: true,
  event_source_url: 'https://www.solving-agency.pl/audyt-sali-dziekujemy',
};

function req(over = {}) {
  return {
    method: 'POST',
    headers: {
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      cookie: '_fbp=fb.1.123.456; other=x',
    },
    body: JSON.stringify(BODY),
    ...over,
  };
}
function res() {
  return {
    statusCode: 200,
    ended: false,
    status(c) { this.statusCode = c; return this; },
    setHeader() {},
    end() { this.ended = true; },
  };
}
function spyFetch(impl) {
  const calls = [];
  const fn = async (url, opts) => { calls.push({ url, opts }); return impl ? impl() : { ok: true, status: 200 }; };
  fn.calls = calls;
  return fn;
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('sha256 is hex sha256', () => {
  assert.equal(sha256('abc'), sha('abc'));
});

test('GET → 405, no fetch', async () => {
  const fetch = spyFetch();
  const r = res();
  await handler(req({ method: 'GET' }), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 405);
  assert.equal(fetch.calls.length, 0);
});

test('missing env (any one) → 204, no fetch', async () => {
  for (const missing of [null, 'META_PIXEL_ID', 'META_CAPI_TOKEN', 'META_GRAPH_VERSION']) {
    const env = missing === null ? {} : { ...ENV, [missing]: '' };
    const fetch = spyFetch();
    const r = res();
    await handler(req(), r, { fetch, env });
    assert.equal(r.statusCode, 204, String(missing));
    assert.equal(fetch.calls.length, 0, String(missing));
  }
});

test('owner nie → 204, no fetch', async () => {
  const fetch = spyFetch();
  const r = res();
  await handler(req({ body: JSON.stringify({ ...BODY, owner: 'nie' }) }), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 204);
  assert.equal(fetch.calls.length, 0);
});

test('consent false or missing → 204, no fetch', async () => {
  for (const consent of [false, 'true', undefined]) {
    const fetch = spyFetch();
    const r = res();
    await handler(req({ body: JSON.stringify({ ...BODY, consent }) }), r, { fetch, env: ENV });
    assert.equal(r.statusCode, 204);
    assert.equal(fetch.calls.length, 0);
  }
});

test('no event_id → 400, no fetch', async () => {
  const fetch = spyFetch();
  const r = res();
  const { event_id, ...rest } = BODY;
  await handler(req({ body: JSON.stringify(rest) }), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 400);
  assert.equal(fetch.calls.length, 0);
});

test('junk body → 400, no fetch', async () => {
  const fetch = spyFetch();
  const r = res();
  await handler(req({ body: '{nope' }), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 400);
  assert.equal(fetch.calls.length, 0);
});

test('valid body → one POST to Graph API with the right event, then 204', async () => {
  const fetch = spyFetch();
  const r = res();
  await handler(req(), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 204);
  assert.equal(fetch.calls.length, 1);
  const { url, opts } = fetch.calls[0];
  assert.equal(url, 'https://graph.facebook.com/v26.0/123456/events?access_token=secret-token');
  assert.equal(opts.method, 'POST');
  const payload = JSON.parse(opts.body);
  assert.equal(payload.data.length, 1);
  const ev = payload.data[0];
  assert.equal(ev.event_name, 'Lead');
  assert.equal(ev.event_id, 'ev-1');
  assert.equal(ev.action_source, 'website');
  assert.equal(ev.event_source_url, BODY.event_source_url);
  assert.equal(typeof ev.event_time, 'number');
  assert.equal(ev.user_data.ph[0], sha256('48505119531'));
  assert.equal('em' in ev.user_data, false, 'no em when email is empty');
  assert.equal(ev.user_data.fbp, 'fb.1.123.456');
  assert.equal('fbc' in ev.user_data, false);
  assert.equal(ev.user_data.client_ip_address, '203.0.113.7');
  assert.equal(ev.user_data.client_user_agent, 'TestAgent/1.0');
});

test('object body (JSON content type) works too', async () => {
  const fetch = spyFetch();
  const r = res();
  await handler(req({ body: { ...BODY } }), r, { fetch, env: ENV });
  assert.equal(r.statusCode, 204);
  assert.equal(fetch.calls.length, 1);
});

test('buildPayload: email trimmed + lowercased then hashed; fbc from cookie; given time', () => {
  const p = buildPayload({ ...BODY, email: '  Anna@Example.COM ' }, req({ headers: { cookie: '_fbc=fb.1.1.abc; _fbp=fb.1.2.def' } }), 1700000000);
  const ev = p.data[0];
  assert.equal(ev.event_time, 1700000000);
  assert.deepEqual(ev.user_data.em, [sha('anna@example.com')]);
  assert.equal(ev.user_data.fbc, 'fb.1.1.abc');
  assert.equal(ev.user_data.fbp, 'fb.1.2.def');
});

test('server normalizePhone matches lead-form.js', () => {
  for (const s of ['+48 505-119-531', '505119531', '0048 505 119 531', '+44 20 7946 0958']) {
    const p = buildPayload({ ...BODY, telefon: s }, req(), 1);
    assert.equal(p.data[0].user_data.ph[0], sha256(leadForm.normalizePhone(s)), s);
  }
});

test('fetch rejects → still 204, and nothing personal is logged', async () => {
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a.join(' '));
  try {
    const fetch = spyFetch(() => { throw new Error('boom'); });
    const r = res();
    await handler(req({ body: JSON.stringify({ ...BODY, email: 'anna@example.com' }) }), r, { fetch, env: ENV });
    assert.equal(r.statusCode, 204);
  } finally {
    console.error = orig;
  }
  const all = logged.join('\n');
  assert.ok(logged.length >= 1, 'expected an error log');
  for (const secret of ['secret-token', 'anna@example.com', '505', '119', '531']) assert.equal(all.includes(secret), false, secret);
});

test('Meta non-2xx → 204 and logs only the status', async () => {
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a.join(' '));
  try {
    const fetch = spyFetch(() => ({ ok: false, status: 400 }));
    const r = res();
    await handler(req(), r, { fetch, env: ENV });
    assert.equal(r.statusCode, 204);
  } finally {
    console.error = orig;
  }
  assert.match(logged.join('\n'), /400/);
  assert.equal(logged.join('\n').includes('secret-token'), false);
});
