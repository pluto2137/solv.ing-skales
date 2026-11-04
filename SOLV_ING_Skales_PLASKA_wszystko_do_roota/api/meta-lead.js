'use strict';
// Vercel function: server copy (Conversions API) of the "Lead" event from /audyt-sali-dziekujemy.
// Sends only for venue owners (owner === 'tak') who gave consent (consent === true).
// Env (set in Vercel by Oscar): META_PIXEL_ID, META_CAPI_TOKEN, META_GRAPH_VERSION. Any missing = do nothing.
// Only accepts beacons whose Origin/Referer is https://(www.)solving-agency.pl (else 403) with a UUID event_id (else 400).
// Never logs the email, phone or token.
const crypto = require('node:crypto');

function sha256(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

// Same as normalizePhone in /lead-form.js (the function bundle can't read site files). A test keeps them equal.
function normalizePhone(s) {
  let d = String(s == null ? '' : s).trim().replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.length === 9) d = '48' + d;
  return d;
}

function readCookie(header, name) {
  const parts = String(header || '').split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i === -1) continue;
    if (p.slice(0, i).trim() === name) return decodeURIComponent(p.slice(i + 1).trim());
  }
  return '';
}

function buildPayload(body, req, nowSec) {
  const headers = (req && req.headers) || {};
  const userData = {};
  const email = String(body.email || '').trim().toLowerCase();
  if (email) userData.em = [sha256(email)];
  const phone = normalizePhone(body.telefon);
  if (phone) userData.ph = [sha256(phone)];
  const ip = String(headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip) userData.client_ip_address = ip;
  if (headers['user-agent']) userData.client_user_agent = String(headers['user-agent']);
  const fbp = readCookie(headers.cookie, '_fbp');
  if (fbp) userData.fbp = fbp;
  const fbc = readCookie(headers.cookie, '_fbc');
  if (fbc) userData.fbc = fbc;
  return {
    data: [{
      event_name: 'Lead',
      event_time: nowSec,
      event_id: String(body.event_id),
      action_source: 'website',
      event_source_url: String(body.event_source_url || ''),
      user_data: userData,
    }],
  };
}

function parseBody(raw) {
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  try {
    const v = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || ''));
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    return null;
  }
}

const ALLOWED_HOSTS = ['www.solving-agency.pl', 'solving-agency.pl'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The beacon comes from our own thank-you page, so its Origin (or Referer if Origin is missing) is our https host.
// Stops drive-by and browser-based fake Leads; a forged curl can still set headers.
function fromOurSite(headers) {
  const h = headers || {};
  const src = h.origin ? h.origin : h.referer;
  if (!src) return false;
  try {
    const u = new URL(String(src));
    return u.protocol === 'https:' && ALLOWED_HOSTS.indexOf(u.hostname) !== -1;
  } catch (e) {
    return false;
  }
}

function send(res, code) {
  res.statusCode = code;
  res.end();
}

async function handler(req, res, deps) {
  const fetchFn = (deps && deps.fetch) || globalThis.fetch;
  const env = (deps && deps.env) || process.env;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405);
  }
  if (!fromOurSite(req.headers)) return send(res, 403);
  const pixelId = env.META_PIXEL_ID;
  const token = env.META_CAPI_TOKEN;
  const version = env.META_GRAPH_VERSION;
  if (!pixelId || !token || !version) return send(res, 204);

  const body = parseBody(req.body);
  if (!body) return send(res, 400);
  if (body.consent !== true || body.owner !== 'tak') return send(res, 204);
  if (typeof body.event_id !== 'string' || !UUID_RE.test(body.event_id)) return send(res, 400);

  const url = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
  const payload = buildPayload(body, req, Math.floor(Date.now() / 1000));
  try {
    const r = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r || !r.ok) console.error('meta-lead: Meta answered', r ? r.status : 'nothing');
  } catch (e) {
    console.error('meta-lead: request to Meta failed', e && e.name ? e.name : 'Error');
  }
  return send(res, 204);
}

module.exports = handler;
module.exports.buildPayload = buildPayload;
module.exports.sha256 = sha256;
