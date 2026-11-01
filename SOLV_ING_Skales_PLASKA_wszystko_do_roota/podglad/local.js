(function () {
  var form = document.getElementById("request");
  if (!form) return;
  var msg = document.getElementById("form-msg");
  var d = document.getElementById("when");
  if (d && d.type === "date") {
    var t = new Date();
    d.min = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name"), contact = document.getElementById("contact");
    var missing = [];
    [[name, "your name"], [contact, "a phone number or email"]].forEach(function (f) {
      var bad = !f[0].value.trim();
      f[0].setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) missing.push(f[1]);
    });
    if (missing.length) {
      msg.className = "form-msg error";
      msg.textContent = "Add " + missing.join(" and ") + " to send the request.";
      return;
    }
    msg.className = "form-msg sent";
    msg.textContent = "This is a preview, so nothing was sent. On the live site, this request goes straight to " + (form.getAttribute("data-to") || "your inbox") + " and your phone.";
  });
})();
