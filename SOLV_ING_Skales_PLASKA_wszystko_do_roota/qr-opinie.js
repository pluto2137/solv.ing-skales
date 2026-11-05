/* Kod QR do opinii Google: everything runs in the browser, nothing is sent anywhere. */
(function (root) {
  'use strict';

  var QUIET = 4; // quiet zone in modules, as the QR standard asks

  // Build the QR matrix (array of rows of booleans) for a text.
  function matrix(text, qrlib) {
    var lib = qrlib || root.qrcode;
    lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
    var q = lib(0, 'M');
    q.addData(text, 'Byte');
    q.make();
    var n = q.getModuleCount(), rows = [];
    for (var r = 0; r < n; r++) {
      var row = [];
      for (var c = 0; c < n; c++) row.push(q.isDark(r, c));
      rows.push(row);
    }
    return rows;
  }

  // Normalise what the user pasted. Returns {url, error}.
  function normalise(raw) {
    var s = String(raw || '').trim().replace(/\s+/g, '');
    if (!s) return { error: 'Wklej link do opinii z profilu firmy w Google.' };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
    var u;
    try { u = new URL(s); } catch (e) { u = null; }
    if (!u || !/^https?:$/.test(u.protocol) || u.hostname.indexOf('.') < 1) {
      return { error: 'To nie wygląda na link. Skopiuj cały adres, który zaczyna się od https://' };
    }
    return { url: u.href, u: u };
  }

  // Is it a Google review link? Returns '' when fine, or a friendly warning.
  function check(u) {
    var h = u.hostname.toLowerCase().replace(/^www\./, '');
    var p = u.pathname.toLowerCase();
    var all = (u.pathname + u.search + u.hash).toLowerCase();
    if (h === 'g.page') {
      if (/^\/(r\/)?[^/]+\/review\/?$/.test(p)) return '';
      if (/^\/r\//.test(p)) return 'Ten link może otwierać sam profil, a nie okno opinii. Link z Google do opinii zwykle kończy się na /review. Zeskanuj gotowy kod telefonem i sprawdź, co się otwiera.';
    }
    if (h === 'search.google.com' && p.indexOf('/local/writereview') === 0) {
      if (u.searchParams.get('placeid')) return '';
      return 'W tym linku brakuje identyfikatora firmy (placeid). Skopiuj link jeszcze raz z opcji „Uzyskaj więcej opinii”.';
    }
    if (/(^|\.)google\.[a-z.]+$/.test(h) && (all.indexOf('writereview') > -1 || /lrd=[^&]*,3/.test(all))) return '';
    if (h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'g.co' || /(^|\.)google\.[a-z.]+$/.test(h)) {
      return 'To wygląda na link do samej wizytówki, nie do okna opinii. Klient zobaczy profil i będzie szukać przycisku na własną rękę. Lepiej skopiuj link z opcji „Uzyskaj więcej opinii” (instrukcja wyżej).';
    }
    return 'To nie wygląda na link do opinii w Google. Kod i tak jest gotowy, ale zanim go wydrukujesz, zeskanuj go telefonem i sprawdź, czy otwiera okno opinii o Twojej firmie.';
  }

  function svgOf(m) {
    var n = m.length, size = n + QUIET * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (m[r][c]) d += 'M' + (c + QUIET) + ' ' + (r + QUIET) + 'h1v1h-1z';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size * 10 + '" height="' + size * 10 + '" shape-rendering="crispEdges">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
  }

  function pngOf(m) {
    var n = m.length, size = n + QUIET * 2, scale = Math.max(8, Math.ceil(1200 / size));
    var cv = document.createElement('canvas');
    cv.width = cv.height = size * scale;
    var x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (m[r][c]) x.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
    }
    return cv.toDataURL('image/png');
  }

  function texts(link, firm) {
    var f = firm || '[nazwa firmy]';
    return {
      sms: 'Dzień dobry, tu ' + f + '. Dziękujemy za [wizytę / zlecenie]. Napisz proszę w Google kilka szczerych słów o tym, jak było, także jeśli coś mamy poprawić: ' + link,
      wa: 'Cześć, tu [imię], ' + f + '. Dzięki za [wizytę / zlecenie]! Mamy prośbę: napisz w Google kilka szczerych słów o tym, jak było, także jeśli coś możemy poprawić. Link: ' + link,
      mail: 'Temat: ' + f + ' dziękuje za współpracę\n\nDzień dobry, [imię],\n\ndziękujemy za [krótko: czym była usługa]. Jeśli masz kilka minut, napisz w Google, jak przebiegła współpraca: co było dobrze i co możemy poprawić. Twoja opinia pomoże innym klientom w wyborze, a nam w pracy.\n\nLink do opinii: ' + link + '\n\nPozdrawiamy,\n[imię], ' + f
    };
  }

  var api = { matrix: matrix, normalise: normalise, check: check, svgOf: svgOf, texts: texts, QUIET: QUIET };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  // ---------- page wiring ----------
  var d = document;
  var form = d.getElementById('qr-form');
  if (!form || !root.qrcode) return;
  var inLink = d.getElementById('qr-link'), inName = d.getElementById('qr-name');
  var msg = d.getElementById('qr-msg'), out = d.getElementById('qr-out');
  var img = d.getElementById('qr-img'), cardImg = d.getElementById('karta-img'), cardName = d.getElementById('karta-firma');
  var aPng = d.getElementById('qr-png'), aSvg = d.getElementById('qr-svg');
  var tSms = d.getElementById('tx-sms'), tWa = d.getElementById('tx-wa'), tMail = d.getElementById('tx-mail');
  var current = '';

  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'qmsg' + (text ? ' ' + kind : '');
  }

  function fillTexts() {
    var firm = inName.value.trim();
    var t = texts(current, firm);
    tSms.value = t.sms; tWa.value = t.wa; tMail.value = t.mail;
    cardName.textContent = firm;
    cardName.hidden = !firm;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = normalise(inLink.value);
    if (r.error) { say(r.error, 'err'); inLink.setAttribute('aria-invalid', 'true'); inLink.focus(); return; }
    inLink.removeAttribute('aria-invalid');
    var m;
    try { m = matrix(r.url); } catch (err) { say('Ten link jest za długi na kod QR. Skopiuj krótki link z opcji „Uzyskaj więcej opinii”.', 'err'); return; }
    current = r.url;
    var warn = check(r.u);
    say(warn || 'Gotowe. To wygląda na link do opinii w Google. Zeskanuj kod telefonem, zanim go wydrukujesz.', warn ? 'warn' : 'ok');
    var svg = svgOf(m);
    var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    img.src = svgUrl; cardImg.src = svgUrl;
    img.alt = 'Kod QR z linkiem do opinii w Google: ' + r.url;
    aSvg.href = svgUrl;
    aPng.href = pngOf(m);
    d.getElementById('qr-url').textContent = r.url;
    fillTexts();
    var first = out.hidden;
    out.hidden = false;
    if (first) { var h = d.getElementById('qr-out-h'); h.focus({ preventScroll: true }); out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });

  inName.addEventListener('input', function () { if (current) fillTexts(); });

  d.getElementById('qr-print').addEventListener('click', function () { root.print(); });

  [].slice.call(d.querySelectorAll('[data-copy]')).forEach(function (b) {
    b.addEventListener('click', function () {
      var ta = d.getElementById(b.getAttribute('data-copy'));
      var label = b.textContent;
      function done(ok) {
        b.textContent = ok ? 'Skopiowano' : 'Zaznacz i skopiuj ręcznie';
        setTimeout(function () { b.textContent = label; }, 2000);
      }
      function fallback() {
        ta.focus(); ta.select();
        var ok = false;
        try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
        done(ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(function () { done(true); }, fallback);
      } else fallback();
    });
  });
})(typeof window !== 'undefined' ? window : this);
