/* Cookie consent for the Meta Pixel on /audyt-sali pages. Classic script, no deps. */
var CONSENT_KEY = 'solving_consent_v1';

function getConsent(storage) {
  try {
    var v = storage ? storage.getItem(CONSENT_KEY) : null;
    return v === 'granted' || v === 'denied' ? v : null;
  } catch (e) {
    return null;
  }
}

function setConsent(storage, value) {
  if (value !== 'granted' && value !== 'denied') return;
  try { storage.setItem(CONSENT_KEY, value); } catch (e) { /* storage blocked: choice lasts this page view only */ }
}

if (typeof module !== 'undefined') {
  module.exports = { getConsent: getConsent, setConsent: setConsent, CONSENT_KEY: CONSENT_KEY };
}
