(function () {
  var RATES = {
    cedar: { name: "Cedar", summer: 165, shoulder: 125, winter: 110, sleeps: 2 },
    alder: { name: "Alder", summer: 210, shoulder: 160, winter: 140, sleeps: 4 },
    spruce: { name: "Big Spruce", summer: 295, shoulder: 225, winter: 195, sleeps: 6 }
  };
  var CLEANING = 60;

  function seasonOf(date) {
    var m = date.getMonth();
    if (m >= 5 && m <= 7) return "summer";
    if (m === 11 || m <= 1) return "winter";
    return "shoulder";
  }

  /* season switch: recolours the sky and highlights a column */
  function setSeason(season) {
    document.body.setAttribute("data-season", season);
    var cells = document.querySelectorAll(".rate-table [data-col]");
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.toggle("on", cells[i].getAttribute("data-col") === season);
    }
  }
  var radios = document.querySelectorAll('input[name="season"]');
  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener("change", function (e) { setSeason(e.target.value); });
  }
  setSeason(seasonOf(new Date()));
  var current = document.querySelector('input[name="season"][value="' + document.body.getAttribute("data-season") + '"]');
  if (current) current.checked = true;

  /* price estimate */
  var form = document.getElementById("request");
  var arrive = document.getElementById("arrive");
  var leave = document.getElementById("leave");
  var cabin = document.getElementById("cabin");
  var guests = document.getElementById("guests");
  var estimate = document.getElementById("estimate");
  var msg = document.getElementById("form-msg");

  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  var today = new Date();
  arrive.min = iso(today);
  leave.min = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));

  function parse(v) {
    if (!v) return null;
    var p = v.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function update() {
    var a = parse(arrive.value);
    var b = parse(leave.value);
    var c = RATES[cabin.value];
    if (a) leave.min = iso(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1));
    if (!a || !b) {
      estimate.textContent = "Pick your dates to see the price.";
      return;
    }
    var nights = Math.round((b - a) / 86400000);
    if (nights < 1) {
      estimate.textContent = "Departure has to be at least one day after arrival.";
      return;
    }
    var total = 0;
    for (var n = 0; n < nights; n++) {
      var night = new Date(a.getFullYear(), a.getMonth(), a.getDate() + n);
      total += c[seasonOf(night)];
    }
    total += CLEANING;
    var min = (a.getMonth() === 6 || a.getMonth() === 7) ? 3 : 2;
    var text = nights + (nights === 1 ? " night" : " nights") + " in " + c.name + ": <strong>$" + total.toLocaleString("en-US") + "</strong> including the $" + CLEANING + " cleaning fee.";
    if (nights < min) text += " The minimum stay for these dates is " + min + " nights.";
    if (+guests.value > c.sleeps) text += " " + c.name + " sleeps " + c.sleeps + ", so pick a bigger cabin for " + guests.value + " guests.";
    estimate.innerHTML = text;
  }
  [arrive, leave, cabin, guests].forEach(function (el) {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  /* submit (demo only: nothing is sent) */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var missing = [];
    [["arrive", "arrival date"], ["leave", "departure date"], ["name", "your name"], ["email", "your email"]].forEach(function (f) {
      var el = document.getElementById(f[0]);
      var bad = !el.value || (f[0] === "email" && !el.checkValidity());
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) missing.push(f[1]);
    });
    if (missing.length) {
      msg.className = "form-msg error";
      var list = missing.length > 1 ? missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1] : missing[0];
      msg.textContent = "Add " + list + " to send the request.";
      return;
    }
    msg.className = "form-msg sent";
    msg.textContent = "Request sent. You'll get a reply by email, usually within a few hours. (This is a demo, so nothing was actually sent.)";
    form.querySelector('button[type="submit"]').textContent = "Request sent";
  });
})();
