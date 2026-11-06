'use strict';
// Vercel function: our own RCS quiz bot ("Audyt DJ w 2 minuty") on Google RCS Business Messaging. No Twilio, no middleman.
//
// Env (set in Vercel by Oscar; any missing = the bot does nothing and says so):
//   RBM_AGENT_ID         agent id from the Google Business Communications console
//   RBM_SERVICE_ACCOUNT  the agent's service account key, the whole JSON as one value
//   RBM_CLIENT_TOKEN     the client token typed in the console when setting the webhook URL to https://www.solving-agency.pl/api/rcs
//   RCS_START_SECRET     a long random string; only callers with it can start a quiz
//
// Routes (one file):
//   GET  /api/rcs                    health: {ok, configured}
//   POST /api/rcs?action=start       header "Authorization: Bearer <RCS_START_SECRET>", body {"phone":"505119531","who":"marek"}
//                                    -> phone has RCS: sends the intro card, returns {rcs:true}
//                                    -> no RCS: returns {rcs:false, link} (send that link by normal SMS; same quiz as a chat page on dj.solving-agency.pl)
//   POST /api/rcs                    Google webhook: verification handshake and user replies (signature checked)
//
// No database: every button carries the answers so far in its postback data, so the bot keeps no state.
// Only send to people who agreed to get the quiz. Typing STOP ends it and emails us to add the number to do-not-contact.
// Never logs phone numbers, answers or keys.
const crypto = require('node:crypto');

const API = 'https://rcsbusinessmessaging.googleapis.com/v1';
const SCOPE = 'https://www.googleapis.com/auth/rcsbusinessmessaging';
const SITE = 'https://www.solving-agency.pl';
const QUIZ_HOST = 'https://dj.solving-agency.pl'; // the quiz host whose security rules allow the chat page's script and form service
const BANNER = SITE + '/q/czat-dj/rcs-baner.png';
const RESULT_BANNER = SITE + '/q/czat-dj/rcs-gotowe.png';
const PHONE_INTL = '48505119531';
const EMAIL = 'oscar.rowe21@gmail.com';
const WEB3FORMS_KEY = 'bff1e2e2-41f9-4321-b8ff-2871a2837852';
const DONE = 'To wszystko';

// Same 8 questions as /q/czat-dj/ (the chat page for phones without RCS). Labels max 25 characters (RCS limit).
const QS = [
  { id: 'y2027', q: 'Ile sobót na sezon 2027 masz już zajętych?', o: ['Prawie nic', 'Około 1/4', 'Około połowy', 'Prawie wszystkie'] },
  { id: 'sources', q: 'Skąd najczęściej przychodzą do Ciebie pary?', o: ['Polecenia', 'Google i Mapy', 'Instagram / Facebook', 'TikTok', 'Portale ślubne', 'Sale i planerzy'], multi: true },
  { id: 'inq', q: 'Ile zapytań o termin dostajesz w miesiącu?', o: ['Mniej niż 5', '5–15', '15–30', 'Ponad 30'] },
  { id: 'googlepos', q: 'Wpisz w Google „DJ na wesele” i swoje miasto. Gdzie jesteś?', o: ['Top 3 na mapie', 'Pierwsza strona', 'Dalej albo wcale', 'Nie sprawdzałem'] },
  { id: 'conv', q: 'Ile zapytań kończy się rezerwacją?', o: ['Mniej niż 1 na 5', '1–2 na 5', 'Mniej więcej połowa', 'Większość', 'Nie liczę'] },
  { id: 'speed', q: 'Jak szybko odpisujesz na nowe zapytanie?', o: ['W godzinę', 'Tego samego dnia', 'Po 1–2 dniach', 'Różnie'] },
  { id: 'pricecheck', q: 'Gdzie para sprawdzi cenę i wolny termin?', o: ['Na mojej stronie', 'Cena tak, termin nie', 'Tylko pisząc'] },
  { id: 'offseason', q: 'Co grasz poza sezonem weselnym?', o: ['Sylwester', 'Studniówki', 'Imprezy firmowe', 'Urodziny i 18-tki', 'Kluby i bary', 'Prawie nic'], multi: true, none: 'Prawie nic' }
];

// ---------- pure helpers (tested) ----------

function normalizePhone(s) {
  let d = String(s == null ? '' : s).trim().replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.length === 9) d = '48' + d;
  return /^\d{10,15}$/.test(d) ? '+' + d : '';
}

function cleanWho(s) {
  const w = String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
  return w;
}

// Postback data: "q|<i>|<answers>|<picks>|<choice>|<who>"
//   answers: one item per answered question, joined by ","; single = option index, multi = indexes joined by "+"
//   picks:   indexes already picked in the current multi question, joined by "+"
//   choice:  option index, or "D" (done with a multi question)
function encode(i, answers, picks, choice, who) {
  return ['q', i, answers.join(','), picks.join('+'), choice, who || ''].join('|');
}

function decode(pb) {
  const p = String(pb || '').split('|');
  if (p[0] === 'go' || p[0] === 'later' || p[0] === 'restart') return { kind: p[0], who: cleanWho(p[1]) };
  if (p[0] !== 'q' || p.length !== 6) return null;
  const i = Number(p[1]);
  if (!Number.isInteger(i) || i < 0 || i >= QS.length) return null;
  const answers = p[2] === '' ? [] : p[2].split(',');
  if (answers.length !== i) return null;
  for (let k = 0; k < answers.length; k++) {
    const parts = answers[k].split('+').map(Number);
    if (!parts.length || parts.some((n) => !Number.isInteger(n) || n < 0 || n >= QS[k].o.length)) return null;
    if (!QS[k].multi && parts.length !== 1) return null;
  }
  const picks = p[3] === '' ? [] : p[3].split('+').map(Number);
  if (picks.some((n) => !Number.isInteger(n) || n < 0 || n >= QS[i].o.length)) return null;
  const choice = p[4] === 'D' ? 'D' : Number(p[4]);
  if (choice !== 'D' && (!Number.isInteger(choice) || choice < 0 || choice >= QS[i].o.length)) return null;
  if (choice === 'D' && !picks.length) return null;
  return { kind: 'q', i, answers, picks, choice, who: cleanWho(p[5]) };
}

function chip(text, postbackData) {
  return { reply: { text, postbackData } };
}

function textMsg(text, suggestions) {
  const m = { contentMessage: { text } };
  if (suggestions && suggestions.length) m.contentMessage.suggestions = suggestions.slice(0, 11);
  return m;
}

function cardMsg(title, description, fileUrl, suggestions) {
  return {
    contentMessage: {
      richCard: {
        standaloneCard: {
          cardOrientation: 'VERTICAL',
          cardContent: {
            title,
            description,
            media: { height: 'MEDIUM', contentInfo: { fileUrl, forceRefresh: false } },
            suggestions: (suggestions || []).slice(0, 4)
          }
        }
      }
    }
  };
}

function introMessages(who) {
  return [cardMsg(
    'Audyt DJ w 2 minuty',
    '8 krótkich pytań, tylko klikasz. Na końcu dostajesz od nas 3 rzeczy, które dadzą Ci najwięcej. Bez pisania i bez linków.',
    BANNER,
    [chip('Zaczynamy', 'go|' + (who || '')), chip('Może później', 'later|' + (who || ''))]
  )];
}

function questionMessage(i, answers, who) {
  const Q = QS[i];
  const text = 'Pytanie ' + (i + 1) + ' z ' + QS.length + '\n' + Q.q + (Q.multi ? '\nMożesz wybrać kilka.' : '');
  return textMsg(text, Q.o.map((label, n) => chip(label, encode(i, answers, [], n, who))));
}

function morePicksMessage(i, answers, picks, who) {
  const Q = QS[i];
  const left = Q.o.map((label, n) => ({ label, n })).filter((x) => picks.indexOf(x.n) < 0 && x.label !== Q.none);
  const chips = left.map((x) => chip(x.label, encode(i, answers, picks, x.n, who)));
  chips.push(chip(DONE, encode(i, answers, picks, 'D', who)));
  return textMsg('Coś jeszcze? Kliknij „' + DONE + '”, gdy skończysz.', chips);
}

function resultMessages(who) {
  return [
    textMsg('Dzięki, mamy wszystko.'),
    cardMsg(
      'Twoje 3 rzeczy: dziś albo jutro',
      'Przejrzymy odpowiedzi i wyślemy tutaj krótki plan: co Cię dziś hamuje i od czego zacząć. Bez zobowiązań.',
      RESULT_BANNER,
      [
        { action: { text: 'Umów 15 min rozmowy', postbackData: 'book', openUrlAction: { url: 'https://wa.me/' + PHONE_INTL + '?text=' + encodeURIComponent('Cześć, zrobiłem audyt DJ w wiadomościach. Chętnie umówię 15 minut rozmowy.') } } },
        { action: { text: 'Zadzwoń do nas', postbackData: 'call', dialAction: { phoneNumber: '+' + PHONE_INTL } } },
        chip('Od nowa', 'restart|' + (who || ''))
      ]
    )
  ];
}

function summary(answers, who) {
  const lines = ['Audyt DJ (RCS)' + (who ? ' – ' + who : '')];
  QS.forEach((Q, k) => {
    const v = answers[k] == null ? '–' : String(answers[k]).split('+').map((n) => Q.o[Number(n)]).join(', ');
    lines.push((k + 1) + '. ' + Q.q + '\n→ ' + v);
  });
  return lines.join('\n');
}

// What to do with one tap. Returns {messages:[...], finished?: {answers, who}}.
function step(pb) {
  const d = decode(pb);
  if (!d) return { messages: [textMsg('Coś poszło nie tak. Zacznijmy od początku.', [chip('Zaczynamy', 'go|')])] };
  if (d.kind === 'go' || d.kind === 'restart') return { messages: [questionMessage(0, [], d.who)] };
  if (d.kind === 'later') return { messages: [textMsg('Jasne. Kliknij, kiedy będziesz mieć 2 minuty.', [chip('Zaczynamy', 'go|' + d.who)])] };
  const Q = QS[d.i];
  let answer;
  if (Q.multi && d.choice !== 'D' && Q.o[d.choice] !== Q.none) {
    const picks = d.picks.indexOf(d.choice) < 0 ? d.picks.concat([d.choice]) : d.picks;
    return { messages: [morePicksMessage(d.i, d.answers, picks, d.who)] };
  }
  if (Q.multi) answer = d.choice === 'D' ? d.picks.join('+') : String(d.choice);
  else answer = String(d.choice);
  const answers = d.answers.concat([answer]);
  const n = d.i + 1;
  if (n < QS.length) return { messages: [questionMessage(n, answers, d.who)] };
  return { messages: resultMessages(d.who), finished: { answers, who: d.who } };
}

function verifySignature(clientToken, dataB64, signature) {
  if (!clientToken || !dataB64 || !signature) return false;
  const mac = crypto.createHmac('sha512', clientToken).update(Buffer.from(dataB64, 'base64')).digest('base64');
  const a = Buffer.from(mac);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ---------- Google API ----------

let tokenCache = { token: '', exp: 0 };

function b64url(s) {
  return Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token;
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(sa.private_key, 'base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + sig
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('token ' + r.status);
  tokenCache = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return tokenCache.token;
}

async function rbm(cfg, method, path, body) {
  const t = await accessToken(cfg.sa);
  const sep = path.indexOf('?') < 0 ? '?' : '&';
  const r = await fetch(API + path + sep + 'agentId=' + encodeURIComponent(cfg.agentId), {
    method,
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r;
}

async function sendAll(cfg, phone, messages) {
  const p = encodeURIComponent(phone);
  for (const m of messages) {
    const r = await rbm(cfg, 'POST', '/phones/' + p + '/agentMessages?messageId=' + crypto.randomUUID(), m);
    if (!r.ok) { console.error('rcs send failed', r.status); return false; }
  }
  return true;
}

async function typing(cfg, phone) {
  try { await rbm(cfg, 'POST', '/phones/' + encodeURIComponent(phone) + '/agentEvents?eventId=' + crypto.randomUUID(), { eventType: 'IS_TYPING' }); } catch (e) { /* not important */ }
}

async function emailUs(subject, fields) {
  const post = async (url, body) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: SITE, Referer: SITE + '/q/czat-dj/' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      return r.ok && String(j.success) === 'true';
    } catch (e) { return false; }
  };
  let ok = await post('https://api.web3forms.com/submit', Object.assign({ access_key: WEB3FORMS_KEY, subject, from_name: 'SOLV.ING bot RCS' }, fields));
  if (!ok) ok = await post('https://formsubmit.co/ajax/' + EMAIL, Object.assign({ _subject: subject, _template: 'box', _captcha: 'false' }, fields));
  if (!ok) console.error('rcs: email to us failed');
  return ok;
}

function config() {
  const env = process.env;
  if (!env.RBM_AGENT_ID || !env.RBM_SERVICE_ACCOUNT || !env.RBM_CLIENT_TOKEN || !env.RCS_START_SECRET) return null;
  let sa;
  try { sa = JSON.parse(env.RBM_SERVICE_ACCOUNT); } catch (e) { return null; }
  if (!sa.client_email || !sa.private_key) return null;
  return { agentId: env.RBM_AGENT_ID, sa, clientToken: env.RBM_CLIENT_TOKEN, startSecret: env.RCS_START_SECRET };
}

// ---------- handler ----------

async function handler(req, res) {
  const cfg = config();
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!cfg });
  if (req.method !== 'POST') return res.status(405).end();
  if (!cfg) return res.status(503).json({ error: 'not configured' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = (req.query && req.query.action) || '';

  if (action === 'start') {
    const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!safeEqual(auth, cfg.startSecret)) return res.status(403).json({ error: 'forbidden' });
    const phone = normalizePhone(body.phone);
    if (!phone) return res.status(400).json({ error: 'bad phone' });
    const who = cleanWho(body.who);
    const cap = await rbm(cfg, 'GET', '/phones/' + encodeURIComponent(phone) + '/capabilities?requestId=' + crypto.randomUUID());
    if (cap.status === 404) return res.status(200).json({ rcs: false, link: QUIZ_HOST + '/q/czat-dj/' + (who ? '#' + who : '') });
    if (!cap.ok) return res.status(502).json({ error: 'capabilities ' + cap.status });
    const ok = await sendAll(cfg, phone, introMessages(who));
    return res.status(ok ? 200 : 502).json({ rcs: true, sent: ok });
  }

  // Webhook verification handshake from the console.
  if (body.clientToken && body.secret && !body.message) {
    if (!safeEqual(body.clientToken, cfg.clientToken)) return res.status(403).end();
    return res.status(200).json({ secret: body.secret });
  }

  const data = body.message && body.message.data;
  if (!verifySignature(cfg.clientToken, data, req.headers['x-goog-signature'])) return res.status(403).end();
  let ev;
  try { ev = JSON.parse(Buffer.from(data, 'base64').toString('utf8')); } catch (e) { return res.status(200).end(); }
  const phone = ev.senderPhoneNumber;
  if (!phone || (ev.agentId && ev.agentId !== cfg.agentId)) return res.status(200).end();

  if (ev.suggestionResponse && ev.suggestionResponse.postbackData) {
    const pb = ev.suggestionResponse.postbackData;
    if (pb === 'book' || pb === 'call') return res.status(200).end();
    await typing(cfg, phone);
    const out = step(pb);
    await sendAll(cfg, phone, out.messages);
    if (out.finished) {
      const who = out.finished.who || 'bez podpisu';
      await emailUs('Audyt DJ RCS – ' + who, { DJ: who, Kanal: 'RCS', Telefon: phone, Odpowiedzi: summary(out.finished.answers, out.finished.who) });
    }
    return res.status(200).end();
  }

  if (typeof ev.text === 'string') {
    const t = ev.text.trim().toUpperCase();
    if (t === 'STOP' || t === 'NIE') {
      await sendAll(cfg, phone, [textMsg('Jasne, nie napiszemy więcej. Dzięki i powodzenia w sezonie!')]);
      await emailUs('RCS STOP – dopisać do nie kontaktować', { Telefon: phone, Tekst: ev.text.slice(0, 200) });
      return res.status(200).end();
    }
    if (t === 'START') { await sendAll(cfg, phone, introMessages('')); return res.status(200).end(); }
    await sendAll(cfg, phone, [textMsg('Dzięki! Ten quiz działa na przyciskach: kliknij odpowiedź pod pytaniem. Jeśli przyciski zniknęły, zacznij od nowa.', [chip('Zacznij od nowa', 'go|')])]);
    await emailUs('RCS wiadomość od klienta', { Telefon: phone, Tekst: ev.text.slice(0, 1000) });
    return res.status(200).end();
  }

  return res.status(200).end();
}

module.exports = handler;
module.exports._t = { QS, normalizePhone, cleanWho, encode, decode, step, summary, verifySignature, introMessages, resultMessages };
