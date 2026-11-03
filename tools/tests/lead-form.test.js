'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SITE = path.join(__dirname, '..', '..', 'SOLV_ING_Skales_PLASKA_wszystko_do_roota');
const { validateLead, normalizePhone, submitLead, newEventId, PENDING_KEY } = require(path.join(SITE, 'lead-form.js'));

const good = () => ({
  imie: 'Anna',
  obiekt: 'Sala Pod Lipami, Kartuzy',
  telefon: '505 119 531',
  email: '',
  wlasciciel: 'tak',
  imprezy: '',
  zgoda: true,
  botcheck: false,
});

test('validateLead: a complete lead is ok', () => {
  const r = validateLead(good());
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
});

for (const field of ['imie', 'obiekt', 'telefon', 'wlasciciel']) {
  test(`validateLead: missing ${field} is an error`, () => {
    const f = good();
    f[field] = '';
    const r = validateLead(f);
    assert.equal(r.ok, false);
    assert.ok(r.errors[field], `expected an error on ${field}`);
  });
}

test('validateLead: whitespace-only imie is an error', () => {
  const r = validateLead({ ...good(), imie: '   ' });
  assert.ok(r.errors.imie);
});

test('validateLead: zgoda not ticked is an error', () => {
  const r = validateLead({ ...good(), zgoda: false });
  assert.equal(r.ok, false);
  assert.ok(r.errors.zgoda);
});

test('validateLead: wlasciciel must be tak or nie', () => {
  assert.ok(validateLead({ ...good(), wlasciciel: 'moze' }).errors.wlasciciel);
  assert.equal(validateLead({ ...good(), wlasciciel: 'nie' }).ok, true);
});

test('validateLead: telefon with fewer than 9 digits is an error', () => {
  const r = validateLead({ ...good(), telefon: '12345' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.telefon);
});

test('validateLead: bad email is an error, empty email is fine', () => {
  assert.ok(validateLead({ ...good(), email: 'zly' }).errors.email);
  assert.equal(validateLead({ ...good(), email: '' }).errors.email, undefined);
  assert.equal(validateLead({ ...good(), email: 'anna@example.com' }).ok, true);
});

test('validateLead: honeypot ticked is never ok', () => {
  assert.equal(validateLead({ ...good(), botcheck: true }).ok, false);
});

test('normalizePhone', () => {
  assert.equal(normalizePhone('+48 505-119-531'), '48505119531');
  assert.equal(normalizePhone('505119531'), '48505119531');
  assert.equal(normalizePhone('505 119 531'), '48505119531');
  assert.equal(normalizePhone('0048 505 119 531'), '48505119531');
  assert.equal(normalizePhone(''), '');
});

test('PENDING_KEY and newEventId', () => {
  assert.equal(PENDING_KEY, 'solving_lead_v1');
  const a = newEventId();
  const b = newEventId();
  assert.match(a, /^[0-9a-f-]{36}$/);
  assert.notEqual(a, b);
});

function fakeFetch(response) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    if (response instanceof Error) throw response;
    return response;
  };
  fn.calls = calls;
  return fn;
}

test('submitLead: 2xx with success:true is ok, and posts the right JSON', async () => {
  const fetch = fakeFetch({ ok: true, status: 200, json: () => ({ success: true }) });
  const r = await submitLead(good(), { fetch, key: 'real-key-123' });
  assert.deepEqual(r, { ok: true });
  assert.equal(fetch.calls.length, 1);
  const { url, opts } = fetch.calls[0];
  assert.equal(url, 'https://api.web3forms.com/submit');
  assert.equal(opts.method, 'POST');
  const body = JSON.parse(opts.body);
  assert.equal(body.access_key, 'real-key-123');
  assert.equal(body.subject, 'Audyt sali – Anna');
  assert.equal(body.from_name, 'SOLV.ING audyt sali');
  assert.equal(body.obiekt, 'Sala Pod Lipami, Kartuzy');
  assert.equal(body.wlasciciel, 'tak');
  assert.ok(opts.signal, 'expected an AbortController signal (timeout)');
});

test('submitLead: HTTP 500 is not ok', async () => {
  const fetch = fakeFetch({ ok: false, status: 500, json: () => ({ success: false }) });
  assert.deepEqual(await submitLead(good(), { fetch, key: 'k' }), { ok: false });
});

test('submitLead: 200 with success:false is not ok', async () => {
  const fetch = fakeFetch({ ok: true, status: 200, json: () => ({ success: false }) });
  assert.deepEqual(await submitLead(good(), { fetch, key: 'k' }), { ok: false });
});

test('submitLead: fetch throwing is not ok', async () => {
  const fetch = fakeFetch(new Error('network down'));
  assert.deepEqual(await submitLead(good(), { fetch, key: 'k' }), { ok: false });
});

test('submitLead: unreadable JSON is not ok', async () => {
  const fetch = fakeFetch({ ok: true, status: 200, json: () => { throw new Error('bad json'); } });
  assert.deepEqual(await submitLead(good(), { fetch, key: 'k' }), { ok: false });
});

test('submitLead: placeholder or empty key never calls fetch', async () => {
  for (const key of ['WEB3FORMS_ACCESS_KEY', '', undefined]) {
    const fetch = fakeFetch({ ok: true, status: 200, json: () => ({ success: true }) });
    assert.deepEqual(await submitLead(good(), { fetch, key }), { ok: false });
    assert.equal(fetch.calls.length, 0);
  }
});
