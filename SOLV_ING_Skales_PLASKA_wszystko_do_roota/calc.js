(function () {
  var ids = ['rate', 'nights', 'clean', 'fee', 'stays', 'direct', 'card'];
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; };
  var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };

  function run() {
    var stay = num('rate') * num('nights') + num('clean');
    var feeStay = stay * num('fee') / 100;
    var stays = num('stays');
    var direct = Math.min(num('direct'), stays);
    var keepStay = Math.max(0, feeStay - stay * num('card') / 100);
    var month = keepStay * direct;
    $('o-stay').textContent = usd(feeStay);
    $('o-allm').textContent = usd(feeStay * stays);
    $('o-month').textContent = usd(month);
    $('o-year').textContent = usd(month * 12);
    $('o-text').textContent = stays > 0
      ? 'With ' + direct + ' of your ' + stays + ' monthly stays booked directly, you keep about ' + usd(keepStay) +
        ' more on each of those stays after the card fee. Over a year that is about ' + usd(month * 12) + '.'
      : 'Enter how many stays you get in a typical month.';
  }

  document.addEventListener('DOMContentLoaded', function () {
    ids.forEach(function (id) { $(id).addEventListener('input', run); });
    $('calc').addEventListener('submit', function (e) { e.preventDefault(); });
    run();
  });
})();
