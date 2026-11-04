'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', '..', 'SOLV_ING_Skales_PLASKA_wszystko_do_roota');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'vercel.json'), 'utf8'));

// Copied from origin/main (e855dba) vercel.json. Every page except /audyt-sali* must keep exactly this.
const GLOBAL_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com https://formsubmit.co; frame-ancestors 'none'; upgrade-insecure-requests";

// The 6 other security headers on origin/main, unchanged.
const OTHER_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const PAGE_OVERRIDES = {
  'script-src': "'self' https://connect.facebook.net",
  'img-src': "'self' data: https://www.facebook.com",
  'connect-src': "'self' https://api.web3forms.com https://www.facebook.com https://connect.facebook.net",
  'form-action': "'self'",
};

function rule(source) {
  return cfg.headers.find((r) => r.source === source && !r.has);
}
const QUIZ_HOSTS = '(wesele|dj|klub)\\.solving-agency\\.pl';
function headerMap(r) {
  return Object.fromEntries(r.headers.map((h) => [h.key, h.value]));
}
function directives(csp) {
  return csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(' ');
    return i === -1 ? [d, ''] : [d.slice(0, i), d.slice(i + 1)];
  });
}

test('global rule excludes /audyt-sali* and keeps today\'s CSP exactly', () => {
  assert.equal(rule('/(.*)'), undefined, 'the old catch-all rule must be gone (it would also hit audyt-sali)');
  const g = rule('/((?!audyt-sali).*)');
  assert.ok(g, 'global rule with negative lookahead missing');
  assert.equal(headerMap(g)['Content-Security-Policy'], GLOBAL_CSP);
});

test('audyt-sali rule differs from the global CSP only in the 4 Meta/Web3Forms directives', () => {
  const p = rule('/audyt-sali(.*)');
  assert.ok(p, 'page rule missing');
  const got = directives(headerMap(p)['Content-Security-Policy']);
  const want = directives(GLOBAL_CSP).map(([k, v]) => [k, k in PAGE_OVERRIDES ? PAGE_OVERRIDES[k] : v]);
  assert.deepEqual(got, want);
});

test('both rules keep the other 6 security headers unchanged', () => {
  for (const source of ['/((?!audyt-sali).*)', '/audyt-sali(.*)']) {
    const m = headerMap(rule(source));
    assert.equal(Object.keys(m).length, 7, `${source}: expected CSP + 6 headers`);
    for (const [k, v] of Object.entries(OTHER_HEADERS)) assert.equal(m[k], v, `${source}: ${k}`);
  }
});

test('the two CSP rules never match the same path', () => {
  // Vercel turns `source` into an anchored regex; mimic that for these two patterns.
  const g = /^\/((?!audyt-sali).*)$/;
  const p = /^\/audyt-sali(.*)$/;
  const paths = ['/', '/index.html', '/audyt-sali', '/audyt-sali.html', '/audyt-sali-dziekujemy', '/audyt-sali.css',
    '/polityka-prywatnosci', '/blog/audyt-sali', '/api/meta-lead', '/social-media-i-reklamy'];
  for (const u of paths) assert.equal(g.test(u) !== p.test(u), true, `exactly one rule must match ${u}`);
  assert.equal(p.test('/blog/audyt-sali'), false);
});

test('other parts of vercel.json are untouched', () => {
  const film = rule('/film-(.*)');
  assert.deepEqual(film, { source: '/film-(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] });
  assert.equal(cfg.cleanUrls, true);
  assert.equal(cfg.redirects.length, 27);
  assert.ok(rule('/samples/(.*)'), 'samples rule from main kept');
  assert.equal(cfg.headers.length, 5);
});

test('quiz hosts: own CSP rule, global rule skips them, root rewritten to /q/<quiz>/', () => {
  const g = rule('/((?!audyt-sali).*)');
  assert.deepEqual(g.missing, [{ type: 'host', value: QUIZ_HOSTS }]);
  const q = cfg.headers.find((r) => r.has && r.has[0].value === QUIZ_HOSTS);
  assert.ok(q, 'quiz host header rule missing');
  assert.equal(q.source, '/(.*)');
  const m = headerMap(q);
  for (const [k, v] of Object.entries(OTHER_HEADERS)) assert.equal(m[k], v, `quiz: ${k}`);
  const csp = Object.fromEntries(directives(m['Content-Security-Policy']));
  assert.equal(csp['connect-src'], 'https://api.web3forms.com https://formsubmit.co');
  assert.equal(csp['frame-ancestors'], "'none'");
  for (const quiz of ['wesele', 'dj', 'klub']) {
    const r = cfg.rewrites.find((x) => x.has[0].value === `${quiz}.solving-agency.pl`);
    assert.deepEqual(r, { source: '/', has: [{ type: 'host', value: `${quiz}.solving-agency.pl` }], destination: `/q/${quiz}/index.html` });
    assert.ok(fs.existsSync(path.join(SITE, 'q', quiz, 'index.html')), `${quiz} page missing`);
  }
  const red = cfg.redirects[cfg.redirects.length - 1];
  assert.equal(red.destination, 'https://:quiz.solving-agency.pl/');
  assert.deepEqual(red.missing, [{ type: 'host', value: QUIZ_HOSTS }]);
});
