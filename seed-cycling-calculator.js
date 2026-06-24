/* The Hormone Blueprint - Seed Cycling Calculator
   Self-contained embeddable calculator for women. Mounts into #tool-mount
   (or #sc-calc / a div with data-sc-calc). Two modes:
     - Regular periods: last period date + average cycle length -> current
       cycle day, phase (follicular/luteal), which seeds to eat now, when to switch.
     - Irregular / menopausal: new-moon method (new moon = day 1, 28-day schedule).
   Evidence for seed cycling is limited; framing is deliberately honest.
   No backend, no tracking; values stay on device.
   v1.0.1 - cycle-length field full-width (removed decorative unit select that collapsed it) */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/seed-cycling-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;
  var mode = "regular"; // "regular" | "moon"

  var MS_DAY = 86400000;
  var SYNODIC = 29.530588853;
  var REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // known new moon

  var FOLL = { key: "foll", name: "Follicular phase", seeds: "ground flaxseed + pumpkin seeds",
    other: "ground sunflower + sesame seeds", c: "#3B6D11", t: "#EAF3DE" };
  var LUT = { key: "lut", name: "Luteal phase", seeds: "ground sunflower + sesame seeds",
    other: "ground flaxseed + pumpkin seeds", c: "#BA7517", t: "#FBEFD9" };

  /* ---- pure logic ---- */
  function startOfDay(t) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

  function computeRegular(lastPeriodMs, cycleLen, nowMs) {
    var lp = startOfDay(lastPeriodMs), today = startOfDay(nowMs);
    var daysSince = Math.floor((today - lp) / MS_DAY);
    if (daysSince < 0) return { error: "future" };
    var cyclesPassed = Math.floor(daysSince / cycleLen);
    var cycleStart = lp + cyclesPassed * cycleLen * MS_DAY;
    var cycleDay = daysSince - cyclesPassed * cycleLen + 1;
    var nextPeriod = cycleStart + cycleLen * MS_DAY;
    var switchDay = Math.max(7, cycleLen - 14);
    var lutStartDate = cycleStart + switchDay * MS_DAY; // date of first luteal day (day switchDay+1)
    var foll = cycleDay <= switchDay;
    var phase = foll ? FOLL : LUT;
    var switchDate = foll ? lutStartDate : nextPeriod;
    var daysToSwitch = Math.round((switchDate - today) / MS_DAY);
    return {
      mode: "regular", cycleDay: cycleDay, cycleLen: cycleLen, switchDay: switchDay,
      phase: phase, isFoll: foll, switchDate: switchDate, daysToSwitch: daysToSwitch,
      nextPeriod: nextPeriod, daysSince: daysSince
    };
  }

  function computeMoon(nowMs) {
    var age = (((nowMs - REF_NEW_MOON) / MS_DAY) % SYNODIC);
    if (age < 0) age += SYNODIC;
    var cycleDay = Math.floor(age) + 1;
    var foll = cycleDay <= 14;
    var phase = foll ? FOLL : LUT;
    var daysToSwitch = foll ? (15 - cycleDay) : Math.ceil(SYNODIC - age);
    var today = startOfDay(nowMs);
    var switchDate = today + daysToSwitch * MS_DAY;
    return {
      mode: "moon", cycleDay: cycleDay, phase: phase, isFoll: foll,
      daysToSwitch: daysToSwitch, switchDate: switchDate
    };
  }

  function fmtDate(ms) {
    try { return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" }); }
    catch (e) { var d = new Date(ms); return d.getDate() + "/" + (d.getMonth() + 1); }
  }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }

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
      + ".mbq .lead{font-size:14px;line-height:1.6;color:#3a4654;margin:0 0 16px}"
      + ".mbq label{display:block;font-size:13px;font-weight:500;color:#12294A;margin:0 0 6px}"
      + ".mbq .fld{margin-bottom:15px}"
      + ".mbq .row{display:flex;gap:9px}"
      + ".mbq .row .grow{flex:1}"
      + ".mbq input[type=number],.mbq input[type=date],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .tabs{display:flex;gap:8px;margin:0 0 18px}"
      + ".mbq .tab{flex:1;text-align:center;border:1.5px solid #E7E0CF;border-radius:11px;padding:10px 8px;font:500 13px Inter,sans-serif;color:#6E7A88;background:#fff;cursor:pointer;line-height:1.3}"
      + ".mbq .tab .ts{display:block;font-size:11px;font-weight:400;color:#9aa3ad;margin-top:2px}"
      + ".mbq .tab.on{border-color:#12294A;background:#12294A;color:#fff}"
      + ".mbq .tab.on .ts{color:#AEBDD0}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .res{display:flex;flex-direction:column;gap:10px;margin:2px 0 14px}"
      + ".mbq .rcard{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#FBF8F0}"
      + ".mbq .rcard .k{font-size:12px;color:#6E7A88;margin-bottom:3px}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:22px;color:#12294A;line-height:1.2}"
      + ".mbq .rcard .s{font-size:12.5px;color:#3a4654;margin-top:6px;line-height:1.5}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin-left:8px;vertical-align:middle}"
      + ".mbq .eat{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#fff}"
      + ".mbq .eat .lab{font-size:12px;color:#6E7A88;margin-bottom:4px}"
      + ".mbq .eat .big{font-family:Fraunces,Georgia,serif;font-size:18px;color:#12294A;line-height:1.3}"
      + ".mbq .eat .amt{font-size:12.5px;color:#3a4654;margin-top:5px}"
      + ".mbq .sched{margin:4px 0 0;border:1px solid #EFEADB;border-radius:12px;overflow:hidden}"
      + ".mbq .sched .r{display:flex;justify-content:space-between;gap:10px;padding:10px 14px;font-size:12.5px}"
      + ".mbq .sched .r+.r{border-top:1px solid #EFEADB}"
      + ".mbq .sched .r .ph{color:#12294A;font-weight:500}"
      + ".mbq .sched .r .sd{color:#6E7A88;text-align:right}"
      + ".mbq .note{font-size:12.5px;line-height:1.6;color:#3a4654;background:#FBF8F0;border-radius:10px;padding:12px 14px;margin:14px 0 0}"
      + ".mbq .note b{color:#12294A}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="720" loading="lazy" style="border:0;max-width:560px" title="Seed cycling calculator"&gt;&lt;/iframe&gt;'
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

  function tabs() {
    return '<div class="tabs">'
      + '<button class="tab' + (mode === "regular" ? " on" : "") + '" id="sc-tab-reg">Regular periods<span class="ts">use my dates</span></button>'
      + '<button class="tab' + (mode === "moon" ? " on" : "") + '" id="sc-tab-moon">Irregular / menopausal<span class="ts">moon method</span></button>'
      + '</div>';
  }

  function form() {
    var fields;
    if (mode === "regular") {
      fields = '<div class="fld"><label for="sc-date">First day of your last period</label>'
        + '<input type="date" id="sc-date"></div>'
        + '<div class="fld"><label for="sc-len">Average cycle length (days)</label>'
        + '<input type="number" id="sc-len" step="1" value="28" placeholder="28">'
        + '<p class="hint">Most cycles are 24\u201335 days. If you track ovulation, switch seeds the day after you ovulate.</p></div>';
    } else {
      fields = '<div class="note" style="margin:0 0 4px">If your cycle is irregular, absent, or you\u2019re peri/post-menopausal, the common approach is to follow the moon: <b>new moon = day 1</b>, then a steady 28-day rhythm. No dates needed \u2014 just press calculate.</div>';
    }
    body.innerHTML = ""
      + '<p class="lead">Seed cycling rotates four seeds across your cycle to gently support hormone balance \u2014 <b>flaxseed + pumpkin</b> in the first half, <b>sunflower + sesame</b> in the second. This tells you which to eat today. Nothing is stored or sent.</p>'
      + tabs()
      + fields
      + '<p class="err" id="sc-err"></p>'
      + '<button class="btn" id="sc-go">Show today\u2019s seeds</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("sc-tab-reg").onclick = function () { if (mode !== "regular") { mode = "regular"; form(); } };
    document.getElementById("sc-tab-moon").onclick = function () { if (mode !== "moon") { mode = "moon"; form(); } };
    document.getElementById("sc-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("sc-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var r;
    if (mode === "regular") {
      var dv = document.getElementById("sc-date").value;
      if (!dv) return fail("Please enter the first day of your last period.");
      var parts = dv.split("-");
      var lpMs = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      if (isNaN(lpMs)) return fail("Please enter a valid date.");
      var len = parseInt(document.getElementById("sc-len").value, 10);
      if (isNaN(len) || len < 20 || len > 45) return fail("Please enter a cycle length between 20 and 45 days.");
      r = computeRegular(lpMs, len, Date.now());
      if (r.error === "future") return fail("That date is in the future \u2014 please check it.");
    } else {
      r = computeMoon(Date.now());
    }
    err.style.display = "none";
    result(r);
  }

  function result(r) {
    var p = r.phase;
    var dayLine = r.mode === "regular"
      ? "Cycle day " + r.cycleDay + " of about " + r.cycleLen
      : "Moon day " + r.cycleDay + " of about 29";
    var switchLine;
    if (r.isFoll) {
      switchLine = "Switch to <b>" + p.other + "</b> on <b>" + fmtDate(r.switchDate) + "</b> (in " + plural(r.daysToSwitch, "day") + ").";
    } else if (r.mode === "regular") {
      switchLine = "Your next period is around <b>" + fmtDate(r.nextPeriod) + "</b> (in " + plural(r.daysToSwitch, "day") + ") \u2014 then start <b>" + p.other + "</b> again.";
    } else {
      switchLine = "Switch back to <b>" + p.other + "</b> at the next new moon, around <b>" + fmtDate(r.switchDate) + "</b> (in " + plural(r.daysToSwitch, "day") + ").";
    }

    var schedFoll, schedLut;
    if (r.mode === "regular") {
      schedFoll = "Days 1\u2013" + r.switchDay;
      schedLut = "Days " + (r.switchDay + 1) + "\u2013" + r.cycleLen;
    } else {
      schedFoll = "New moon \u2192 day 14";
      schedLut = "Day 15 \u2192 next new moon";
    }

    body.innerHTML = ""
      + '<div class="res">'
      + '<div class="rcard"><div class="k">Today</div>'
      + '<div class="v">' + p.name + '<span class="pill" style="background:' + p.t + ';color:' + p.c + '">' + dayLine + '</span></div>'
      + '<div class="s">' + switchLine + '</div></div>'
      + '<div class="eat"><div class="lab">Eat now, every day</div>'
      + '<div class="big">1 tbsp each of ' + p.seeds + '</div>'
      + '<div class="amt">Grind fresh and eat raw \u2014 stir into porridge, yoghurt, smoothies or salads. Give it at least three cycles.</div></div>'
      + '</div>'
      + '<div class="sched">'
      + '<div class="r"><span class="ph">Follicular \u00b7 flaxseed + pumpkin</span><span class="sd">' + schedFoll + '</span></div>'
      + '<div class="r"><span class="ph">Luteal \u00b7 sunflower + sesame</span><span class="sd">' + schedLut + '</span></div>'
      + '</div>'
      + '<div class="note"><b>How strong is the evidence?</b> Seed cycling is a food-based, low-risk practice, but large clinical trials of the full protocol are limited. Most support comes from the nutrients in the seeds themselves \u2014 lignans, zinc, vitamin E, selenium and omega-3 \u2014 plus one small 2023 trial in women with PCOS. Treat it as gentle nutritional support, not a treatment. The seeds are nourishing either way.</div>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:14px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Take the 2-minute hormone quiz \u2192</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your schedule (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">For general education only \u2014 not medical advice, a diagnosis, or a proven treatment for any condition. Phase dates are estimates. If you have irregular cycles, PCOS, a thyroid condition, are pregnant or trying to conceive, or have a seed allergy, speak with a qualified clinician. Seeds are a choking risk for very young children.</p>';
    document.getElementById("mbq-again").onclick = function () { form(); };
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
        var p = r.phase;
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Seed Cycling Schedule", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        var dayLine = r.mode === "regular" ? "Cycle day " + r.cycleDay + " of about " + r.cycleLen : "Moon day " + r.cycleDay;
        doc.text("Today:  " + p.name + "  (" + dayLine + ")", M, y); y += 20;
        doc.text("Eat now:  1 tbsp each of " + p.seeds + ", daily", M, y); y += 20;
        doc.text("Switch in:  " + plural(r.daysToSwitch, "day") + "  (around " + fmtDate(r.switchDate) + ")", M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(18, 41, 74);
        doc.text("The full rotation", M, y); y += 18;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        doc.text("Follicular (first half):  1 tbsp each ground flaxseed + pumpkin seeds, daily", M, y); y += 18;
        doc.text("Luteal (second half):  1 tbsp each ground sunflower + sesame seeds, daily", M, y); y += 30;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Grind fresh, eat raw, and give it at least three cycles. Seed cycling is a low-risk, food-based practice; large trials of the full protocol are limited, so treat it as gentle nutritional support rather than a treatment. For general education only \u2014 not medical advice or a diagnosis. Speak with a qualified clinician if you have irregular cycles, PCOS, are pregnant or trying to conceive, or have a seed allergy. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("seed-cycling-schedule.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your schedule (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("sc-calc") || document.querySelector("[data-sc-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "sc-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Seed cycling calculator</h3>'
      + '<div class="sub">Which seeds to eat today, for your cycle</div></div>'
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
