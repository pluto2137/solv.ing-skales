/* Meta Pixel for /audyt-sali pages: loads only with a Pixel ID AND consent = granted.
   Classic script, no inline code (CSP). Needs consent.js and meta-config.js loaded first. */
var PENDING_KEY = 'solving_lead_v1';
var FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

function loadPixel(o) {
  o = o || {};
  var id = typeof o.pixelId === 'string' ? o.pixelId.trim() : '';
  var doc = o.doc;
  var win = o.win || (typeof window !== 'undefined' ? window : {});
  if (!id || o.consent !== 'granted' || !doc) return false;
  if (win.__solvingPixelLoaded) return false;
  win.__solvingPixelLoaded = true;
  if (!win.fbq) {
    // Same queue stub as Meta's base code, without inline script.
    var n = function () {
      if (n.callMethod) n.callMethod.apply(n, arguments); else n.queue.push(arguments);
    };
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    win.fbq = n;
    if (!win._fbq) win._fbq = n;
  }
  var s = doc.createElement('script');
  s.async = true;
  s.src = FBEVENTS_SRC;
  doc.head.appendChild(s);
  // No automatic events or automatic advanced matching (form scraping): we send only PageView and Lead.
  win.fbq('set', 'autoConfig', false, id);
  win.fbq('init', id);
  win.fbq('track', 'PageView');
  return true;
}

function shouldFireLead(lead, consent, pixelId) {
  return !!(lead && lead.eventId && lead.owner === 'tak' && consent === 'granted' &&
    typeof pixelId === 'string' && pixelId.trim() !== '');
}

function takePendingLead(storage) {
  var raw = null;
  try {
    raw = storage.getItem(PENDING_KEY);
    storage.removeItem(PENDING_KEY);
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    var lead = JSON.parse(raw);
    return lead && typeof lead === 'object' ? lead : null;
  } catch (e) {
    return null;
  }
}

function fireLead(lead, win) {
  win = win || window;
  if (typeof win.fbq === 'function') win.fbq('track', 'Lead', {}, { eventID: lead.eventId });
  var body = JSON.stringify({
    event_id: lead.eventId,
    email: lead.email || '',
    telefon: lead.telefon || '',
    owner: lead.owner,
    consent: true,
    event_source_url: win.location ? win.location.href : ''
  });
  try {
    if (win.navigator && typeof win.navigator.sendBeacon === 'function') win.navigator.sendBeacon('/api/meta-lead', body);
  } catch (e) { /* the browser Lead already went; the server copy is a bonus */ }
}

function sendIfAllowed(o) {
  var lead = takePendingLead(o.storage);
  if (!lead) return 'none';
  if (!shouldFireLead(lead, o.consent, o.pixelId)) return 'dropped';
  fireLead(lead, o.win);
  return 'fired';
}

/* Thank-you page load. If a Pixel ID is set and the visitor hasn't answered the banner yet,
   the lead waits in sessionStorage for onConsentChoice. Otherwise it is taken (removed) now. */
function onThankYouLoad(o) {
  var hasId = typeof o.pixelId === 'string' && o.pixelId.trim() !== '';
  if (hasId && o.consent === null) return 'waiting';
  return sendIfAllowed(o);
}

/* Banner answered on the thank-you page: send the waiting Lead if allowed, else drop it. Removed either way. */
function onConsentChoice(o) {
  return sendIfAllowed(o) === 'fired';
}

/* Page glue: banner, settings link, Pixel, Lead on the thank-you page. Browser only. */
if (typeof document !== 'undefined') {
  (function () {
    function store(name) { try { return window[name]; } catch (e) { return null; } }
    function ready(fn) {
      if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
    }
    function clearMetaCookies() {
      var host = location.hostname;
      var domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
      ['_fbp', '_fbc'].forEach(function (name) {
        domains.forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      });
    }
    ready(function () {
      var pixelId = (window.SOLVING_META && window.SOLVING_META.pixelId) || '';
      var banner = document.getElementById('cookie-banner');
      var settings = document.querySelectorAll('[data-cookie-settings]');
      var consent = getConsent(store('localStorage'));
      var i;

      // Without a Pixel ID there is nothing to ask about: no banner, no settings link.
      if (pixelId) {
        for (i = 0; i < settings.length; i++) settings[i].hidden = false;
        if (banner && consent === null) banner.hidden = false;
      }

      var thankYou = document.body.getAttribute('data-page') === 'audyt-sali-dziekujemy';
      function choose(value) {
        setConsent(store('localStorage'), value);
        consent = value;
        if (banner) banner.hidden = true;
        if (value === 'granted') loadPixel({ pixelId: pixelId, consent: value, doc: document, win: window });
        if (thankYou) onConsentChoice({ storage: store('sessionStorage'), consent: value, pixelId: pixelId, win: window });
        if (value !== 'granted') {
          clearMetaCookies();
          if (window.__solvingPixelLoaded) location.reload();
        }
      }
      if (banner) {
        banner.querySelector('[data-consent="granted"]').addEventListener('click', function () { choose('granted'); });
        banner.querySelector('[data-consent="denied"]').addEventListener('click', function () { choose('denied'); });
      }
      for (i = 0; i < settings.length; i++) {
        settings[i].addEventListener('click', function (e) {
          e.preventDefault();
          if (!banner) return;
          banner.hidden = false;
          banner.scrollIntoView({ block: 'start' });
          banner.focus();
        });
      }

      loadPixel({ pixelId: pixelId, consent: consent, doc: document, win: window });

      if (thankYou) onThankYouLoad({ storage: store('sessionStorage'), consent: consent, pixelId: pixelId, win: window });
    });
  })();
}

if (typeof module !== 'undefined') {
  module.exports = {
    loadPixel: loadPixel, shouldFireLead: shouldFireLead, takePendingLead: takePendingLead, fireLead: fireLead,
    onThankYouLoad: onThankYouLoad, onConsentChoice: onConsentChoice
  };
}
