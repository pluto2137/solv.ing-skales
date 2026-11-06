(function () {
  "use strict";
  // Direct booking check for small US lodging (B&Bs, inns, guesthouses, cabins, small motels).
  // Tap-only chat. Link per business: /q/check/#business-name (then we already know who it is).
  // Without a #tag, the last step asks for an email so we know where to send the plan.
  var QS = [
    { id: "rooms", q: "How many rooms or units do you have?", o: ["1–3", "4–10", "11–25", "26 or more"] },
    { id: "sources", q: "Where do most of your bookings come from?", o: ["Booking.com", "Airbnb / Vrbo", "Expedia", "My own website", "Phone calls", "Repeat guests", "Google"], multi: true },
    { id: "direct", q: "Roughly what share of bookings come direct, with no OTA fee?", o: ["Under 20%", "20–50%", "Over half", "Not sure"] },
    { id: "bookonsite", q: "Can guests book and pay on your own website?", o: ["Yes, instantly", "Request only", "No, call or email", "No website yet"] },
    { id: "googlepos", q: "Search Google for your town plus “bed and breakfast” (or “inn”). Where do you show up?", o: ["Top 3 on the map", "First page", "Further or not at all", "Haven't checked"] },
    { id: "speed", q: "How fast do you usually reply to a new inquiry?", o: ["Within an hour", "Same day", "Next day or later", "It depends"] },
    { id: "pastguests", q: "Do you invite past guests to come back?", o: ["Yes, regularly", "Sometimes", "Never"] },
    { id: "goal", q: "What would help you most this year?", o: ["More direct bookings", "Lower OTA fees", "Fill the off-season", "More reviews", "Save time"] }
  ];
  var DONE_LABEL = "That's all";
  var EMAIL = "oscar.rowe21@gmail.com";
  var WEB3FORMS_KEY = "bff1e2e2-41f9-4321-b8ff-2871a2837852";
  var CALL_SUBJECT = "15-minute call about direct bookings";

  var chat = document.getElementById("chat");
  var chipsEl = document.getElementById("chips");
  var prog = document.getElementById("prog");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tag = (location.hash || "").replace("#", "").toLowerCase();
  var who = /^[a-z0-9-]{2,40}$/.test(tag) ? tag : "";
  var KEY = "solving-check-us-v1";
  var st = { i: -1, a: {}, picked: [], sent: false, email: "" };
  var busy = false;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.a) return s; } catch (e) {} return null; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function scroll() { chat.scrollTop = chat.scrollHeight; }
  function node(t, cls, text) { var d = document.createElement(t); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }
  function bot(text, step) { var d = node("div", "bot"); if (step) d.appendChild(node("span", "step", step)); d.appendChild(document.createTextNode(text)); chat.appendChild(d); scroll(); return d; }
  function user(text) { chat.appendChild(node("div", "user", text)); scroll(); }
  async function typing(ms) { var t = node("div", "bot typing"); t.setAttribute("aria-label", "SOLV.ING is typing"); for (var k = 0; k < 3; k++) t.appendChild(node("span")); chat.appendChild(t); scroll(); await wait(ms || 700); t.remove(); }
  function chips(list) {
    chipsEl.replaceChildren();
    list.forEach(function (label) {
      var b = node("button", "chip", label); b.type = "button";
      b.addEventListener("click", function () { tap(label); });
      chipsEl.appendChild(b);
    });
    scroll();
  }
  function setProg() { prog.textContent = st.i >= 0 && st.i < QS.length ? (st.i + 1) + " / " + QS.length : ""; }

  var SVG = "http://www.w3.org/2000/svg";
  function icon(paths) {
    var s = document.createElementNS(SVG, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    paths.forEach(function (p) { var e = document.createElementNS(SVG, p[0]); Object.keys(p[1]).forEach(function (k) { e.setAttribute(k, p[1][k]); }); s.appendChild(e); });
    return s;
  }
  var ICON_CAL = [["rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }], ["path", { d: "M16 3v4M8 3v4M3 10h18" }]];
  var ICON_MAIL = [["rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }], ["path", { d: "M3 7l9 6 9-6" }]];

  function introCard() {
    var c = node("div", "card");
    var ban = node("div", "ban");
    ban.appendChild(node("div", "k", "SOLV.ING"));
    var h = node("h1", "h"); h.appendChild(document.createTextNode("Direct booking")); h.appendChild(document.createElement("br")); h.appendChild(document.createTextNode("check in 2 minutes"));
    ban.appendChild(h);
    var cb = node("div", "cb");
    cb.appendChild(node("p", "ct", "8 quick questions, just tap"));
    cb.appendChild(node("p", "cd", "At the end we send you the 3 things we would fix first to get you more direct bookings. No typing."));
    c.appendChild(ban); c.appendChild(cb); chat.appendChild(c); scroll();
  }
  function resultCard() {
    var c = node("div", "card");
    var ban = node("div", "ban short");
    ban.appendChild(node("div", "k", "DONE"));
    ban.appendChild(node("p", "h", "Your 3 things: within a day"));
    var cb = node("div", "cb");
    cb.appendChild(node("p", "cd", "We'll look at your answers and your site, then send you a short plan: what's holding direct bookings back and what to fix first. No obligation."));
    var acts = node("div", "acts");
    var a1 = node("a", "act"); a1.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(CALL_SUBJECT + (who ? " – " + who : ""));
    a1.appendChild(icon(ICON_CAL)); a1.appendChild(document.createTextNode("Book a 15-min call"));
    var a2 = node("a", "act"); a2.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Question about my booking check" + (who ? " – " + who : ""));
    a2.appendChild(icon(ICON_MAIL)); a2.appendChild(document.createTextNode("Email us"));
    acts.appendChild(a1); acts.appendChild(a2);
    c.appendChild(ban); c.appendChild(cb); c.appendChild(acts); chat.appendChild(c); scroll();
  }

  function ask(i) {
    var Q = QS[i];
    bot(Q.q + (Q.multi ? "\nYou can pick more than one." : ""), "Question " + (i + 1) + " of " + QS.length);
    st.picked = [];
    chips(Q.o.slice());
    setProg();
  }
  function multiChips() {
    var Q = QS[st.i];
    var left = Q.o.filter(function (x) { return st.picked.indexOf(x) < 0; });
    chips(st.picked.length ? left.concat([DONE_LABEL]) : Q.o.slice());
  }

  async function tap(label) {
    if (busy) return;
    if (label === "Start over") { restart(); return; }
    if (st.i === -1) {
      chipsEl.replaceChildren(); user(label);
      busy = true;
      if (label === "Maybe later") { await typing(600); bot("No problem. Come back whenever you have 2 minutes."); busy = false; chips(["Let's start"]); return; }
      await typing(650); st.i = 0; save(); ask(0); busy = false; return;
    }
    var Q = QS[st.i];
    if (!Q) return;
    if (Q.multi && label !== DONE_LABEL) { user(label); st.picked.push(label); multiChips(); return; }
    chipsEl.replaceChildren(); user(label);
    st.a[Q.id] = Q.multi ? st.picked.slice() : label;
    st.i += 1; save();
    busy = true;
    if (st.i < QS.length) { await typing(650); ask(st.i); busy = false; return; }
    setProg();
    if (!who && !st.email) { await typing(700); busy = false; askEmail(); return; }
    await finish();
  }

  function askEmail() {
    bot("Thanks! Where should we send your plan?");
    chipsEl.replaceChildren();
    var f = node("form", "ask");
    var lab = node("label", "sr", "Your email"); lab.htmlFor = "em";
    var inp = node("input"); inp.type = "email"; inp.id = "em"; inp.required = true; inp.autocomplete = "email"; inp.placeholder = "you@yourinn.com";
    var b = node("button", "chip", "Send"); b.type = "submit";
    f.appendChild(lab); f.appendChild(inp); f.appendChild(b);
    f.addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = inp.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { inp.focus(); return; }
      st.email = v; save(); chipsEl.replaceChildren(); user(v); busy = true; await finish();
    });
    chipsEl.appendChild(f); inp.focus(); scroll();
  }

  async function finish() {
    await typing(800);
    bot("Got it, thanks. Sending your answers…");
    var ok = await send();
    busy = false;
    if (ok) { st.sent = true; save(); await typing(500); resultCard(); chips(["Start over"]); }
    else { bot("That didn't go through. Try again in a moment, or email us your answers."); retryChips(); }
  }
  function retryChips() {
    chipsEl.replaceChildren();
    var b = node("button", "chip", "Try again"); b.type = "button";
    b.addEventListener("click", async function () { chipsEl.replaceChildren(); busy = true; await finish(); });
    var m = node("a", "chip link", "Email my answers"); m.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("My booking check") + "&body=" + encodeURIComponent(summary());
    chipsEl.appendChild(b); chipsEl.appendChild(m); scroll();
  }
  function summary() {
    var lines = ["Direct booking check (US)" + (who ? " – " + who : "") + (st.email ? " – " + st.email : "")];
    QS.forEach(function (Q, n) { var v = st.a[Q.id]; lines.push((n + 1) + ". " + Q.q + "\n→ " + (Array.isArray(v) ? v.join(", ") : (v || "–"))); });
    return lines.join("\n");
  }
  async function post(url, body) {
    var ctl = new AbortController(); var t = setTimeout(function () { ctl.abort(); }, 15000);
    try {
      var r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      var j = await r.json().catch(function () { return {}; });
      return r.ok && String(j.success) === "true";
    } catch (e) { return false; } finally { clearTimeout(t); }
  }
  async function send() {
    var name = who || st.email || "no name";
    var subject = "US booking check – " + name;
    var fields = { Business: who || "–", Email: st.email || "–", Channel: "chat www (EN)", Answers: summary() };
    if (st.email) fields.replyto = st.email;
    var ok = await post("https://api.web3forms.com/submit", Object.assign({ access_key: WEB3FORMS_KEY, subject: subject, from_name: "SOLV.ING booking check" }, fields));
    if (!ok) ok = await post("https://formsubmit.co/ajax/" + EMAIL, Object.assign({ _subject: subject, _template: "box", _captcha: "false" }, fields));
    return ok;
  }

  function restart() {
    st = { i: -1, a: {}, picked: [], sent: false, email: "" }; save();
    chat.replaceChildren(node("div", "day", "Today")); start();
  }
  async function start() {
    introCard(); setProg();
    await wait(400);
    chips(["Let's start", "Maybe later"]);
  }

  var prev = load();
  if (prev && prev.sent) {
    st = prev; introCard();
    bot("Your answers already reached us. We'll be in touch within a day.");
    resultCard(); chips(["Start over"]);
  } else if (prev && prev.i === QS.length) {
    st = prev; introCard(); bot("Almost done.");
    if (!who && !st.email) askEmail(); else { busy = true; finish(); }
  } else if (prev && prev.i >= 0 && prev.i < QS.length) {
    st = prev; introCard(); bot("Picking up where you left off."); ask(st.i);
  } else {
    start();
  }
})();
