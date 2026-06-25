/* The Hormone Blueprint - Period Predictor
   Self-contained embeddable calculator for women. Mounts into #tool-mount
   (or #period-calc / a div with data-period-calc). From the first day of the
   last period, average cycle length and bleed duration, it predicts the next
   several period dates. Period prediction only - NO ovulation, fertile window
   or contraception logic. Flags cycle/bleed values worth discussing with a
   doctor (NHS/ACOG/NICE). No backend, no tracking; values stay on device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var OVU_URL = SITE + "/tools/ovulation-cycle-calculator";
  var EMBED_SRC = SITE + "/tools/period-predictor?embed=1";
  var DAY = 86400000;

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  /* ---- date helpers (UTC, testable) ---- */
  function todayUTC() {
    var t = new Date();
    return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function parseDateUTC(v) {
    if (!v) return NaN;
    var p = v.split("-");
    if (p.length !== 3) return NaN;
    return Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  var MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function fmtLong(ms) {
    var d = new Date(ms);
    return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function fmtShort(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + " " + MONS[d.getUTCMonth()];
  }

  /* ---- pure logic (testable) ---- */
  function predict(lmpMs, L, dur, n, todayMs) {
    if (isNaN(lmpMs) || isNaN(L)) return null;
    // roll the "last period" forward to the most recent one that has started on/before today
    var startMs = lmpMs;
    if (!isNaN(todayMs) && todayMs >= lmpMs) {
      var cyclesPassed = Math.floor((todayMs - lmpMs) / (L * DAY));
      startMs = lmpMs + cyclesPassed * L * DAY;
    }
    var list = [];
    for (var i = 1; i <= n; i++) {
      var s = startMs + i * L * DAY;
      list.push({ start: s, end: s + (dur - 1) * DAY });
    }
    var nextMs = list[0].start;
    var daysToNext = !isNaN(todayMs) ? Math.round((nextMs - todayMs) / DAY) : null;
    return { periods: list, nextMs: nextMs, daysToNext: daysToNext, L: L, dur: dur };
  }

  function flags(L, dur) {
    var f = [];
    if (L < 21) f.push("Your cycle is shorter than 21 days. Cycles this short are worth discussing with a doctor.");
    if (L > 35) f.push("Your cycle is longer than 35 days. Cycles this long (or that vary a lot) are worth discussing with a doctor.");
    if (dur > 7) f.push("Bleeding longer than 7 days is worth mentioning to a doctor.");
    return f;
  }

  function injectStyles() {
    if (document.getElementById("mbq-styles")) return;
    var css = ""
      + "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Inter:wght@400;500&display=swap');"
      + ".mbq{font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;border:1px solid #E7E0CF;border-radius:16px;overflow:hidden;background:#fff;color:#23303F;-webkit-font-smoothing:antialiased}"
      + ".mbq *{box-sizing:border-box}"
      + ".mbq .hd{background:#12294A;padding:18px 22px}"
      + ".mbq .ey{font-size:11px;letter-spacing:.04em;color:#E7D8B0}"
      + ".mbq .hd h3{font-family:Fraunces,Georgia,serif;font-weight:500;color:#fff;font-size:21px;margin:5px 0 3px}"
      + ".mbq .hd .sub{font-size:12px;color:#AEBDD0}"
      + ".mbq .bd{padding:22px}"
      + ".mbq .lead{font-size:14px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq label{display:block;font-size:13px;font-weight:500;color:#12294A;margin:0 0 6px}"
      + ".mbq .fld{margin-bottom:15px}"
      + ".mbq input[type=number],.mbq input[type=date],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .next{border:1px solid #12294A;background:#12294A;border-radius:12px;padding:16px 18px;margin:2px 0 14px;color:#fff}"
      + ".mbq .next .k{font-size:12px;color:#AEBDD0;margin-bottom:3px}"
      + ".mbq .next .v{font-family:Fraunces,Georgia,serif;font-size:23px;line-height:1.15}"
      + ".mbq .next .s{font-size:12px;color:#AEBDD0;margin-top:4px}"
      + ".mbq .plist{list-style:none;padding:0;margin:0 0 16px}"
      + ".mbq .plist li{display:flex;justify-content:space-between;align-items:center;border:1px solid #EFEADB;border-radius:11px;padding:11px 15px;margin-bottom:8px;background:#FBF8F0;font-size:13.5px}"
      + ".mbq .plist .n{color:#9aa3ad;font-size:12px}"
      + ".mbq .plist .d{font-weight:500;color:#12294A}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .flag{border-left:3px solid #C39A4A;background:#FBF6EC;border-radius:8px;padding:11px 14px;font-size:12.5px;line-height:1.55;color:#5a4a25;margin:0 0 12px}"
      + ".mbq .redflag{border-left:3px solid #A32D2D;background:#FBEDEC;border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.55;color:#7a2420;margin:14px 0 0}"
      + ".mbq .redflag b{display:block;margin-bottom:4px}"
      + ".mbq .embed-link{display:inline-block;margin-top:12px;font-size:12px;color:#6E7A88;background:none;border:none;cursor:pointer;text-decoration:underline}"
      + ".mbq .embed-box{margin-top:10px;display:none}"
      + ".mbq .embed-box textarea{width:100%;height:74px;font:400 11.5px ui-monospace,Menlo,monospace;color:#23303F;border:1.5px solid #E7E0CF;border-radius:9px;padding:9px;resize:none;background:#FBF8F0}"
      + ".mbq .embed-box .cp{margin-top:7px;font-size:12px;padding:8px 12px;width:auto}"
      + ".mbq .disc{font-size:11.5px;color:#8a93a0;line-height:1.5;margin:16px 0 0;padding-top:14px;border-top:1px solid #EFEADB}"
      + ".mbq .ft{background:#12294A;display:flex;justify-content:space-between;align-items:center;padding:11px 22px}"
      + ".mbq .ft .pw{font-size:11.5px;color:#AEBDD0}"
      + ".mbq .ft .pw b{color:#E7D8B0;font-weight:500}"
      + ".mbq .ft a{font-size:11.5px;color:#fff;text-decoration:none}"
      + ".mbq .priv{font-size:11px;color:#9aa3ad;margin:13px 0 0}";
    var s = document.createElement("style");
    s.id = "mbq-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function embedBox() {
    if (EMBED) return "";
    return '<button class="embed-link" id="mbq-embed-toggle">Want this on your site? Get the embed code</button>'
      + '<div class="embed-box" id="mbq-embed-box"><textarea readonly id="mbq-embed-code">'
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="660" loading="lazy" style="border:0;max-width:560px" title="Period predictor"&gt;&lt;/iframe&gt;'
      + '</textarea><button class="btn sec cp" id="mbq-copy">Copy code</button></div>';
  }
  function wireEmbed() {
    if (EMBED) return;
    var tg = document.getElementById("mbq-embed-toggle");
    var bx = document.getElementById("mbq-embed-box");
    if (!tg || !bx) return;
    tg.onclick = function () { bx.style.display = bx.style.display === "block" ? "none" : "block"; };
    document.getElementById("mbq-copy").onclick = function () {
      var ta = document.getElementById("mbq-embed-code");
      ta.select();
      try { document.execCommand("copy"); this.textContent = "Copied"; } catch (e) {}
      var self = this; setTimeout(function () { self.textContent = "Copy code"; }, 1600);
    };
  }

  function form() {
    body.innerHTML = ""
      + '<p class="lead">Enter the first day of your last period and your usual cycle to see when your next few periods are likely to arrive. This predicts periods only \u2014 not ovulation. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="pp-lmp">First day of your last period</label>'
      + '<input type="date" id="pp-lmp"></div>'
      + '<div class="fld"><label for="pp-len">Average cycle length (days)</label>'
      + '<input type="number" id="pp-len" step="1" value="28">'
      + '<p class="hint">First day of one period to the first day of the next. Most are 21\u201335 days; 28 is a fair default.</p></div>'
      + '<div class="fld"><label for="pp-dur">How many days does bleeding last?</label>'
      + '<input type="number" id="pp-dur" step="1" value="5">'
      + '<p class="hint">Usually 2\u20137 days.</p></div>'
      + '<div class="fld"><label for="pp-n">Show me</label>'
      + '<select id="pp-n"><option value="3">My next 3 periods</option><option value="6" selected>My next 6 periods</option></select></div>'
      + '<p class="err" id="pp-err"></p>'
      + '<button class="btn" id="pp-go">Predict my periods</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("pp-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("pp-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var lmpV = document.getElementById("pp-lmp").value;
    var lmpMs = parseDateUTC(lmpV);
    var L = parseInt(document.getElementById("pp-len").value, 10);
    var dur = parseInt(document.getElementById("pp-dur").value, 10);
    var n = parseInt(document.getElementById("pp-n").value, 10);

    if (isNaN(lmpMs)) return fail("Please pick the first day of your last period.");
    var today = todayUTC();
    if (lmpMs > today + DAY) return fail("That date is in the future \u2014 please pick the day your last period started.");
    if (isNaN(L) || L < 15 || L > 60) return fail("Please enter a cycle length between 15 and 60 days.");
    if (isNaN(dur) || dur < 1 || dur > 14) return fail("Please enter a bleed length between 1 and 14 days.");
    err.style.display = "none";
    result(predict(lmpMs, L, dur, n, today), L, dur);
  }

  function result(r, L, dur) {
    var fl = flags(L, dur);
    var items = "";
    for (var i = 0; i < r.periods.length; i++) {
      var p = r.periods[i];
      var range = dur > 1 ? (fmtShort(p.start) + " \u2013 " + fmtShort(p.end)) : fmtShort(p.start);
      items += '<li><span class="n">Period ' + (i + 1) + '</span><span class="d">' + range + '</span></li>';
    }
    var nextWhen = r.daysToNext === 0 ? "today" : r.daysToNext === 1 ? "tomorrow" : "in about " + r.daysToNext + " days";
    var flHtml = "";
    for (var j = 0; j < fl.length; j++) flHtml += '<div class="flag">' + fl[j] + '</div>';

    body.innerHTML = ""
      + '<div class="next"><div class="k">Your next period</div>'
      + '<div class="v">' + fmtLong(r.nextMs) + '</div>'
      + '<div class="s">That\u2019s ' + nextWhen + ', based on a ' + L + '-day cycle.</div></div>'
      + '<ul class="plist">' + items + '</ul>'
      + flHtml
      + '<p class="interp">These dates assume a steady ' + L + '-day cycle. Real cycles shift by a few days with stress, illness, travel, sleep, weight changes or perimenopause \u2014 so treat them as a guide. Tracking two or three cycles makes your own pattern clearer.</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + OVU_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Trying to conceive? Ovulation calculator \u2192</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your dates (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + '<div class="redflag"><b>See a doctor sooner if you have:</b>bleeding between periods or after sex; any bleeding after menopause; soaking a pad or tampon every 1\u20132 hours; clots larger than a 2.5 cm coin; no period for 90+ days when not pregnant; or a sudden change from your usual pattern.</div>'
      + embedBox()
      + '<p class="disc">Predictions are estimates from your average cycle and are least reliable if your cycles are irregular. This tool is for awareness only \u2014 it is <b>not contraception</b>, not a conception aid, and not medical advice. Normal cycles run about 21\u201335 days with 2\u20137 days of bleeding (NHS/ACOG).</p>';
    document.getElementById("mbq-again").onclick = form;
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r, L, dur); };
    wireEmbed();
  }

  function loadJsPDF(cb) {
    if (window.jspdf && window.jspdf.jsPDF) { cb(); return; }
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = cb;
    s.onerror = function () { alert("Sorry, the PDF could not be generated just now."); };
    document.head.appendChild(s);
  }

  function downloadPdf(r, L, dur) {
    var btn = document.getElementById("mbq-pdf");
    if (btn) btn.textContent = "Preparing\u2026";
    loadJsPDF(function () {
      try {
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Predicted Periods", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB") + "  \u00b7  " + L + "-day cycle", M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        for (var i = 0; i < r.periods.length; i++) {
          var p = r.periods[i];
          var range = dur > 1 ? (fmtLong(p.start) + "  to  " + fmtShort(p.end)) : fmtLong(p.start);
          doc.text("Period " + (i + 1) + ":  " + range, M, y); y += 20;
        }
        y += 12;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Estimates from your average cycle; least reliable if cycles are irregular. For awareness only \u2014 not contraception or medical advice. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("predicted-periods.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your dates (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("period-calc") || document.querySelector("[data-period-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "period-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Period predictor</h3>'
      + '<div class="sub">When your next few periods are likely to arrive</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Hormone Blueprint</b></span>'
      + '<a href="' + SITE + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>' + SITE.replace("https://", "") + '</a></div>';
    host.appendChild(root);
    body = root.querySelector("#mbq-body");
    form();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
