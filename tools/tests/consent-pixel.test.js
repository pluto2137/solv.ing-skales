'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SITE = path.join(__dirname, '..', '..', 'SOLV_ING_Skales_PLASKA_wszystko_do_roota');
const { getConsent, setConsent, CONSENT_KEY } = require(path.join(SITE, 'consent.js'));
const { loadPixel, shouldFireLead, takePendingLead, fireLead, onThankYouLoad, onConsentChoice } = require(path.join(SITE, 'pixel.js'));
const { PENDING_KEY, shouldStorePending } = require(path.join(SITE, 'lead-form.js'));

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
}
const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};
function fakeDoc() {
  const added = [];
  const created = [];
  return {
    added,
    created,
    createElement(tag) { const el = { tagName: tag.toUpperCase() }; created.push(el); return el; },
    head: { appendChild(el) { added.push(el); return el; } },
  };
}

test('consent: key name, empty storage, set and read back', () => {
  assert.equal(CONSENT_KEY, 'solving_consent_v1');
  const s = memStorage();
  assert.equal(getConsent(s), null);
  setConsent(s, 'denied');
  assert.equal(getConsent(s), 'denied');
  setConsent(s, 'granted');
  assert.equal(getConsent(s), 'granted');
  assert.equal(s._m.get('solving_consent_v1'), 'granted');
});

test('consent: junk values and blocked storage read as null, never throw', () => {
  assert.equal(getConsent(memStorage({ solving_consent_v1: 'yes' })), null);
  assert.equal(getConsent(brokenStorage), null);
  assert.equal(getConsent(null), null);
  assert.doesNotThrow(() => setConsent(brokenStorage, 'granted'));
  const s = memStorage();
  setConsent(s, 'maybe');
  assert.equal(getConsent(s), null);
});

test('loadPixel: nothing from Meta without an ID or without consent', () => {
  for (const args of [
    { pixelId: '', consent: 'granted' },
    { pixelId: '123', consent: null },
    { pixelId: '123', consent: 'denied' },
    { pixelId: '', consent: null },
    { pixelId: undefined, consent: 'granted' },
  ]) {
    const doc = fakeDoc();
    const win = {};
    assert.equal(loadPixel({ ...args, doc, win }), false, JSON.stringify(args));
    assert.equal(doc.added.length, 0, 'no script added');
    assert.equal(doc.created.length, 0, 'no element created');
    assert.equal(win.fbq, undefined, 'no fbq defined');
  }
});

test('loadPixel: with ID and consent adds fbevents.js once and queues autoConfig off, init, PageView', () => {
  const doc = fakeDoc();
  const win = {};
  assert.equal(loadPixel({ pixelId: '123', consent: 'granted', doc, win }), true);
  assert.equal(doc.added.length, 1);
  assert.equal(doc.added[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  assert.equal(doc.added[0].async, true);
  assert.equal(typeof win.fbq, 'function');
  assert.deepEqual(win.fbq.queue.map((a) => Array.from(a)), [['set', 'autoConfig', false, '123'], ['init', '123'], ['track', 'PageView']]);
  // second call on the same page: no second script
  assert.equal(loadPixel({ pixelId: '123', consent: 'granted', doc, win }), false);
  assert.equal(doc.added.length, 1);
});

test('shouldFireLead: only owner tak + consent granted + pixel ID', () => {
  const lead = { eventId: 'e1', owner: 'tak' };
  assert.equal(shouldFireLead(lead, 'granted', '123'), true);
  assert.equal(shouldFireLead({ ...lead, owner: 'nie' }, 'granted', '123'), false);
  assert.equal(shouldFireLead(lead, 'denied', '123'), false);
  assert.equal(shouldFireLead(lead, null, '123'), false);
  assert.equal(shouldFireLead(lead, 'granted', ''), false);
  assert.equal(shouldFireLead(null, 'granted', '123'), false);
  assert.equal(shouldFireLead({ owner: 'tak' }, 'granted', '123'), false, 'no eventId');
});

test('takePendingLead: returns the lead once, then null (refresh does not resend)', () => {
  const lead = { eventId: 'e1', owner: 'tak', email: '', telefon: '505 119 531' };
  const s = memStorage({ [PENDING_KEY]: JSON.stringify(lead) });
  assert.deepEqual(takePendingLead(s), lead);
  assert.equal(takePendingLead(s), null);
  assert.equal(s._m.has(PENDING_KEY), false);
});

test('takePendingLead: junk JSON and blocked storage give null', () => {
  const s = memStorage({ [PENDING_KEY]: '{not json' });
  assert.equal(takePendingLead(s), null);
  assert.equal(s._m.has(PENDING_KEY), false, 'junk is removed too');
  assert.equal(takePendingLead(brokenStorage), null);
});

test('fireLead: browser Lead with the same eventID, then beacon to /api/meta-lead', () => {
  const calls = [];
  const beacons = [];
  const win = {
    fbq: (...a) => calls.push(a),
    navigator: { sendBeacon: (url, body) => { beacons.push([url, body]); return true; } },
    location: { href: 'https://www.solving-agency.pl/audyt-sali-dziekujemy' },
  };
  fireLead({ eventId: 'e1', owner: 'tak', email: 'a@b.pl', telefon: '505119531' }, win);
  assert.deepEqual(calls, [['track', 'Lead', {}, { eventID: 'e1' }]]);
  assert.equal(beacons.length, 1);
  assert.equal(beacons[0][0], '/api/meta-lead');
  assert.deepEqual(JSON.parse(beacons[0][1]), {
    event_id: 'e1', email: 'a@b.pl', telefon: '505119531', owner: 'tak', consent: true,
    event_source_url: 'https://www.solving-agency.pl/audyt-sali-dziekujemy',
  });
});

// Thank-you page flow (review item 1): consent given on the thank-you page must still send the Lead, once.
function fakeWin() {
  const fbq = [];
  const beacons = [];
  return {
    fbq: (...a) => fbq.push(a),
    navigator: { sendBeacon: (url, body) => { beacons.push(JSON.parse(body)); return true; } },
    location: { href: 'https://www.solving-agency.pl/audyt-sali-dziekujemy' },
    _fbq: fbq,
    _beacons: beacons,
  };
}
const LEAD = { eventId: '6f1c2b1e-8d1a-4c55-9b7e-2f3a4b5c6d7e', owner: 'tak', email: '', telefon: '505119531' };

test('thank-you: consent not answered yet → lead waits, nothing sent', () => {
  const s = memStorage({ [PENDING_KEY]: JSON.stringify(LEAD) });
  const win = fakeWin();
  assert.equal(onThankYouLoad({ storage: s, consent: null, pixelId: '123', win }), 'waiting');
  assert.equal(s._m.has(PENDING_KEY), true);
  assert.equal(win._fbq.length + win._beacons.length, 0);
});

test('thank-you: "Akceptuję" clicked on the thank-you page fires the waiting Lead exactly once', () => {
  const s = memStorage({ [PENDING_KEY]: JSON.stringify(LEAD) });
  const win = fakeWin();
  onThankYouLoad({ storage: s, consent: null, pixelId: '123', win });
  assert.equal(onConsentChoice({ storage: s, consent: 'granted', pixelId: '123', win }), true);
  assert.deepEqual(win._fbq, [['track', 'Lead', {}, { eventID: LEAD.eventId }]]);
  assert.equal(win._beacons.length, 1);
  // clicking again (Ustawienia cookies → Akceptuję) or reloading does not resend
  assert.equal(onConsentChoice({ storage: s, consent: 'granted', pixelId: '123', win }), false);
  assert.equal(onThankYouLoad({ storage: s, consent: 'granted', pixelId: '123', win }), 'none');
  assert.equal(win._beacons.length, 1);
});

test('thank-you: "Odrzucam" clicked on the thank-you page drops the lead, nothing sent', () => {
  const s = memStorage({ [PENDING_KEY]: JSON.stringify(LEAD) });
  const win = fakeWin();
  onThankYouLoad({ storage: s, consent: null, pixelId: '123', win });
  assert.equal(onConsentChoice({ storage: s, consent: 'denied', pixelId: '123', win }), false);
  assert.equal(s._m.has(PENDING_KEY), false);
  assert.equal(win._fbq.length + win._beacons.length, 0);
});

test('thank-you: consent already granted → fires on load once; owner nie → dropped, nothing sent', () => {
  let s = memStorage({ [PENDING_KEY]: JSON.stringify(LEAD) });
  let win = fakeWin();
  assert.equal(onThankYouLoad({ storage: s, consent: 'granted', pixelId: '123', win }), 'fired');
  assert.equal(win._beacons.length, 1);
  assert.equal(onThankYouLoad({ storage: s, consent: 'granted', pixelId: '123', win }), 'none');
  assert.equal(win._beacons.length, 1);
  s = memStorage({ [PENDING_KEY]: JSON.stringify({ ...LEAD, owner: 'nie' }) });
  win = fakeWin();
  assert.equal(onThankYouLoad({ storage: s, consent: 'granted', pixelId: '123', win }), 'dropped');
  assert.equal(s._m.has(PENDING_KEY), false);
  assert.equal(win._fbq.length + win._beacons.length, 0);
});

test('thank-you: no Pixel ID or denied → lead removed at once, nothing sent', () => {
  for (const [consent, pixelId] of [[null, ''], ['granted', ''], ['denied', '123']]) {
    const s = memStorage({ [PENDING_KEY]: JSON.stringify(LEAD) });
    const win = fakeWin();
    assert.notEqual(onThankYouLoad({ storage: s, consent, pixelId, win }), 'fired');
    assert.equal(s._m.has(PENDING_KEY), false, `${consent}/${pixelId}`);
    assert.equal(win._fbq.length + win._beacons.length, 0);
  }
});

test('shouldStorePending: contact data kept for the thank-you page only when a Lead could still go', () => {
  assert.equal(shouldStorePending('tak', 'granted', '123'), true);
  assert.equal(shouldStorePending('tak', null, '123'), true, 'consent can still be given on the thank-you page');
  assert.equal(shouldStorePending('tak', 'denied', '123'), false);
  assert.equal(shouldStorePending('nie', 'granted', '123'), false);
  assert.equal(shouldStorePending('tak', 'granted', ''), false);
});
