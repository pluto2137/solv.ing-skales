/* Audyt sali: form check + send to Web3Forms. Classic script, no deps. */
var PENDING_KEY = 'solving_lead_v1';
var WEB3FORMS_URL = 'https://api.web3forms.com/submit';
var KEY_PLACEHOLDER = 'WEB3FORMS_ACCESS_KEY';
var SEND_TIMEOUT_MS = 15000;

var LEAD_ERRORS = {
  imie: 'Wpisz swoje imię.',
  obiekt: 'Wpisz nazwę sali i miasto albo wklej link.',
  telefon: 'Wpisz numer telefonu, co najmniej 9 cyfr.',
  email: 'Ten adres e-mail wygląda na niepełny. Popraw go albo zostaw puste pole.',
  wlasciciel: 'Zaznacz „tak” albo „nie”.',
  zgoda: 'Bez tej zgody nie możemy do Ciebie zadzwonić ani napisać SMS-a.'
};

function str(v) { return v == null ? '' : String(v).trim(); }

function normalizePhone(s) {
  var d = str(s).replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.length === 9) d = '48' + d;
  return d;
}

function validateLead(f) {
  f = f || {};
  var errors = {};
  if (!str(f.imie)) errors.imie = LEAD_ERRORS.imie;
  if (!str(f.obiekt)) errors.obiekt = LEAD_ERRORS.obiekt;
  var digits = str(f.telefon).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) errors.telefon = LEAD_ERRORS.telefon;
  var email = str(f.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = LEAD_ERRORS.email;
  if (f.wlasciciel !== 'tak' && f.wlasciciel !== 'nie') errors.wlasciciel = LEAD_ERRORS.wlasciciel;
  if (f.zgoda !== true) errors.zgoda = LEAD_ERRORS.zgoda;
  var bot = f.botcheck === true;
  return { ok: !bot && Object.keys(errors).length === 0, errors: errors };
}

function submitLead(fields, opts) {
  opts = opts || {};
  var key = str(opts.key);
  var doFetch = opts.fetch;
  if (!key || key === KEY_PLACEHOLDER || typeof doFetch !== 'function') return Promise.resolve({ ok: false });
  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, SEND_TIMEOUT_MS) : null;
  var body = {
    access_key: key,
    subject: 'Audyt sali – ' + str(fields.imie),
    from_name: 'SOLV.ING audyt sali',
    imie: str(fields.imie),
    obiekt: str(fields.obiekt),
    telefon: str(fields.telefon),
    email: str(fields.email),
    wlasciciel: fields.wlasciciel,
    imprezy: str(fields.imprezy),
    zgoda: fields.zgoda === true ? 'tak' : 'nie',
    zgoda_tresc: str(fields.zgoda_tresc),
    strona: str(fields.strona)
  };
  return Promise.resolve()
    .then(function () {
      return doFetch(WEB3FORMS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined
      });
    })
    .then(function (res) {
      if (!res || !res.ok) return { ok: false };
      return Promise.resolve(res.json()).then(function (data) {
        return { ok: !!(data && data.success === true) };
      });
    })
    .catch(function () { return { ok: false }; })
    .then(function (r) { if (timer) clearTimeout(timer); return r; });
}

function newEventId() {
  return crypto.randomUUID();
}

/* Page glue: runs only in a browser. */
if (typeof document !== 'undefined') {
  (function () {
    function ready(fn) {
      if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
    }
    ready(function () {
      var form = document.getElementById('formularz');
      if (!form) return;
      var btn = form.querySelector('button[type="submit"]');
      var fallback = document.getElementById('awaria');
      var status = document.getElementById('form-status');
      var sending = false;
      if (btn) btn.disabled = false;

      function read() {
        var checked = form.querySelector('input[name="wlasciciel"]:checked');
        var zgodaLabel = document.getElementById('zgoda-tresc');
        return {
          imie: form.imie.value,
          obiekt: form.obiekt.value,
          telefon: form.telefon.value,
          email: form.email.value,
          wlasciciel: checked ? checked.value : '',
          imprezy: form.imprezy.value,
          zgoda: form.zgoda.checked,
          botcheck: form.botcheck.checked,
          zgoda_tresc: zgodaLabel ? zgodaLabel.textContent.replace(/\s+/g, ' ').trim() : '',
          strona: location.pathname
        };
      }

      function showErrors(errors) {
        var first = null;
        ['imie', 'obiekt', 'telefon', 'email', 'wlasciciel', 'zgoda'].forEach(function (name) {
          var slot = document.getElementById('err-' + name);
          var msg = errors[name] || '';
          if (slot) slot.textContent = msg;
          var inputs = form.querySelectorAll('[name="' + name + '"]');
          for (var i = 0; i < inputs.length; i++) {
            if (msg) inputs[i].setAttribute('aria-invalid', 'true'); else inputs[i].removeAttribute('aria-invalid');
          }
          if (msg && !first) first = inputs[0];
        });
        if (first) first.focus();
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sending) return;
        var f = read();
        var v = validateLead(f);
        showErrors(v.errors);
        if (!v.ok) return;
        sending = true;
        btn.disabled = true;
        btn.textContent = 'Wysyłamy…';
        if (status) status.textContent = '';
        var keyInput = form.querySelector('input[name="access_key"]');
        submitLead(f, { fetch: window.fetch.bind(window), key: keyInput ? keyInput.value : '' }).then(function (r) {
          if (r.ok) {
            try {
              sessionStorage.setItem(PENDING_KEY, JSON.stringify({
                eventId: newEventId(),
                owner: f.wlasciciel,
                email: str(f.email),
                telefon: str(f.telefon)
              }));
            } catch (err) { /* storage blocked: thank-you page still works, just no Lead */ }
            location.href = '/audyt-sali-dziekujemy';
            return;
          }
          sending = false;
          btn.disabled = false;
          btn.textContent = 'Spróbuj wysłać ponownie';
          if (fallback) {
            fallback.hidden = false;
            fallback.focus();
          }
          if (status) status.textContent = 'Nie udało się wysłać zgłoszenia.';
        });
      });
    });
  })();
}

if (typeof module !== 'undefined') {
  module.exports = { validateLead: validateLead, normalizePhone: normalizePhone, submitLead: submitLead, newEventId: newEventId, PENDING_KEY: PENDING_KEY };
}
