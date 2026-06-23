/* The Hormone Blueprint - Ovulation & Cycle Calculator
   Self-contained embeddable calculator for women. Mounts into #tool-mount
   (or #ov-calc / a div with data-ov-calc). From the first day of the last
   period and average cycle length, estimates the next period, ovulation,
   fertile window and today's cycle phase. Awareness only, not contraception.
   No backend, no tracking, answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var EMBED_SRC = SITE + "/tools/ovulation-cycle-calculator?embed=1";
  var DAY = 86400000;

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  var PHASES = {
    menstrual: { nm: "menstrual", note: "Your period. Energy may dip \u2014 rest and iron-rich food help." },
    follicular: { nm: "follicular", note: "Rising oestrogen \u2014 energy, mood and strength often climb." },
    fertile: { nm: "fertile (around ovulation)", note: "Your most fertile days, around ovulation." },
    luteal: { nm: "luteal", note: "After ovulation \u2014 PMS-type symptoms can appear before your period." }
  };

  /* ---- pure logic (testable) ---- */
  function computeCycle(lmpMs, L, todayMs) {
    var daysSince = Math.floor((todayMs - lmpMs) / DAY);
    if (isNaN(daysSince) || daysSince < 0) return null;
    var cycles = Math.floor(daysSince / L);
    var startMs = lmpMs + cycles * L * DAY;        // current cycle start (<= today)
    var dayInCycle = Math.round((todayMs - startMs) / DAY) + 1; // 1..L
    var nextPeriodMs = startMs + L * DAY;          // upcoming period (always > today)
    // this cycle's ovulation/fertile
    var ovMs = startMs + (L - 14) * DAY;
    var fertEndMs = ovMs + DAY;
    // today's phase (based on current cycle)
    var periodEndMs = startMs + 4 * DAY;           // assume ~5-day period
    var fertStartMs = ovMs - 5 * DAY;
    var phase;
    if (todayMs <= periodEndMs) phase = "menstrual";
    else if (todayMs >= fertStartMs && todayMs <= fertEndMs) phase = "fertile";
    else if (todayMs < fertStartMs) phase = "follicular";
    else phase = "luteal";
    // upcoming ovulation: if this cycle's has passed, use next cycle's
    var ovDisplayMs = ovMs;
    if (todayMs > fertEndMs) ovDisplayMs = nextPeriodMs + (L - 14) * DAY;
    return {
      startMs: startMs,
      dayInCycle: dayInCycle,
      nextPeriodMs: nextPeriodMs,
      ovulationMs: ovDisplayMs,
      fertileStartMs: ovDisplayMs - 5 * DAY,
      fertileEndMs: ovDisplayMs + DAY,
      phase: phase
    };
  }

  function fmt(ms) {
    var d = new Date(ms);
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[d.getUTCDay()] + " " + d.getUTCDate() + " " + mons[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function fmtShort(ms) {
    var d = new Date(ms);
    var mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getUTCDate() + " " + mons[d.getUTCMonth()];
  }
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
      + ".mbq .fld{margin-bottom:16px}"
      + ".mbq input[type=date],.mbq input[type=number]{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq input:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .res{display:flex;flex-direction:column;gap:10px;margin:2px 0 16px}"
      + ".mbq .rcard{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#FBF8F0}"
      + ".mbq .rcard .k{font-size:12px;color:#6E7A88;margin-bottom:3px}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:19px;color:#12294A;line-height:1.15}"
      + ".mbq .rcard.hl{background:#12294A;border-color:#12294A}"
      + ".mbq .rcard.hl .k{color:#AEBDD0}"
      + ".mbq .rcard.hl .v{color:#fff}"
      + ".mbq .phase{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .phase b{color:#12294A}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="620" loading="lazy" style="border:0;max-width:560px" title="Ovulation and cycle calculator"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Enter the first day of your last period and your usual cycle length to see your next period, fertile window and where you are today. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="ov-lmp">First day of your last period</label>'
      + '<input type="date" id="ov-lmp"></div>'
      + '<div class="fld"><label for="ov-len">Average cycle length (days)</label>'
      + '<input type="number" id="ov-len" value="28" min="20" max="45" step="1">'
      + '<p class="hint">Most cycles are 21\u201335 days. Not sure? 28 is a fair default.</p></div>'
      + '<p class="err" id="ov-err"></p>'
      + '<button class="btn" id="ov-go">See my cycle</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("ov-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var lmpV = document.getElementById("ov-lmp").value;
    var lenV = parseInt(document.getElementById("ov-len").value, 10);
    var err = document.getElementById("ov-err");
    var lmpMs = parseDateUTC(lmpV);
    var today = todayUTC();
    if (isNaN(lmpMs)) { err.textContent = "Please enter the first day of your last period."; err.style.display = "block"; return; }
    if (lmpMs > today) { err.textContent = "That date is in the future \u2014 please check it."; err.style.display = "block"; return; }
    if (isNaN(lenV) || lenV < 20 || lenV > 45) { err.textContent = "Cycle length should be between 20 and 45 days."; err.style.display = "block"; return; }
    if (today - lmpMs > 200 * DAY) { err.textContent = "That date is a long time ago \u2014 please enter your most recent period."; err.style.display = "block"; return; }
    err.style.display = "none";
    result(computeCycle(lmpMs, lenV, today));
  }

  function result(r) {
    var ph = PHASES[r.phase];
    body.innerHTML = ""
      + '<div class="res">'
      + '<div class="rcard hl"><div class="k">Your next period is expected</div><div class="v">' + fmt(r.nextPeriodMs) + '</div></div>'
      + '<div class="rcard"><div class="k">Estimated ovulation</div><div class="v">' + fmt(r.ovulationMs) + '</div></div>'
      + '<div class="rcard"><div class="k">Most fertile window</div><div class="v">' + fmtShort(r.fertileStartMs) + ' \u2013 ' + fmtShort(r.fertileEndMs) + '</div></div>'
      + '</div>'
      + '<p class="phase">Today you are likely in your <b>' + ph.nm + ' phase</b> (around day ' + r.dayInCycle + ' of your cycle). ' + ph.note + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your dates (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">Estimates based on a regular cycle and a typical 14-day luteal phase. Cycles vary, so treat these as a guide \u2014 this is for awareness, not contraception, and not medical advice.</p>';
    document.getElementById("mbq-again").onclick = form;
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r); };
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

  function downloadPdf(r) {
    var btn = document.getElementById("mbq-pdf");
    if (btn) btn.textContent = "Preparing\u2026";
    loadJsPDF(function () {
      try {
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Cycle Forecast", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        doc.text("Next period expected:  " + fmt(r.nextPeriodMs), M, y); y += 20;
        doc.text("Estimated ovulation:  " + fmt(r.ovulationMs), M, y); y += 20;
        doc.text("Most fertile window:  " + fmtShort(r.fertileStartMs) + " - " + fmtShort(r.fertileEndMs), M, y); y += 20;
        doc.text("Today: " + PHASES[r.phase].nm + " phase (around day " + r.dayInCycle + ")", M, y); y += 30;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Estimates based on a regular cycle and a typical 14-day luteal phase. For awareness only, not contraception or medical advice. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("cycle-forecast.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your dates (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("ov-calc") || document.querySelector("[data-ov-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "ov-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Ovulation &amp; cycle calculator</h3>'
      + '<div class="sub">Your next period, fertile window &amp; cycle phase</div></div>'
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
