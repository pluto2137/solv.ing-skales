(function () {
  var form = document.getElementById("request");
  if (!form) return;
  var msg = document.getElementById("form-msg");
  var arrive = document.getElementById("arrive");
  var leave = document.getElementById("leave");
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var t = new Date();
  arrive.min = iso(t);
  leave.min = iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
  arrive.addEventListener("change", function () {
    if (!arrive.value) return;
    var p = arrive.value.split("-");
    leave.min = iso(new Date(+p[0], +p[1] - 1, +p[2] + 1));
  });
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
      msg.textContent = "Add " + (missing.length > 1 ? missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1] : missing[0]) + " to send the request.";
      return;
    }
    msg.className = "form-msg sent";
    msg.textContent = "This is a preview, so nothing was sent. On the live site, this request goes straight to " + (form.getAttribute("data-to") || "your inbox") + ".";
  });
})();
