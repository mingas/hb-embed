/* The Testosterone Blueprint - Testosterone Level Checker
   Self-contained embeddable calculator for men. Mounts into #tool-mount
   (or #tl-calc / a div with data-tl-calc). Takes a total testosterone value
   in ng/dL or nmol/L, converts between the two, and interprets it against
   the clinical low threshold (300 ng/dL, Endocrine Society / AUA) and
   age-aware reference ranges (NHANES middle-tertile lower bounds for men
   20-44; conservative extension above). Educational, not a diagnosis.
   No backend, no tracking; values stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/tools/low-testosterone-score";
  var EMBED_SRC = SITE + "/tools/testosterone-level-checker?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  var NGDL_TO_NMOL = 0.0347; /* ng/dL x 0.0347 = nmol/L */
  var LOW_LINE = 300;        /* clinical low threshold, ng/dL (Endocrine Society / AUA) */

  var TIERS = ["Below the clinical threshold", "Low for your age", "Within typical range", "Strong, upper range", "Above the usual range"];
  function tierColour(i) { return ["#A32D2D", "#C77A1E", "#3B6D11", "#1F7A6B", "#3F63B3"][i]; }
  function tierTint(i) { return ["#F7DEDE", "#FBE9D2", "#EAF3DE", "#DEF1ED", "#E6ECF8"][i]; }
  var INTERP = [
    "Your level is below the clinical threshold of 300 ng/dL (10.4 nmol/L) that the Endocrine Society and AUA use to define low testosterone. This is worth a conversation with a doctor \u2014 a diagnosis needs at least two morning blood draws plus symptoms. Both lifestyle (sleep, strength training, fat loss) and, where appropriate, medical treatment can help.",
    "Your level is above the clinical low line (300 ng/dL) but below the typical range for your age. Many men here still notice low energy, libido or motivation. It is worth checking your symptoms and reviewing the foundations \u2014 sleep, strength training, body fat and stress.",
    "Your level sits within the typical range for your age. Keep supporting it with good sleep, regular strength training, enough protein and a healthy body-fat level \u2014 the things that protect testosterone over time.",
    "Your level is in the upper, robust range \u2014 a good place to be. The priority now is keeping it there: sleep, strength work, and avoiding the things that erode it (excess body fat, heavy alcohol, poor sleep).",
    "Your level is above the usual range. If you are not using testosterone therapy or supplements, it is worth repeating the test to confirm \u2014 very high readings can reflect timing, supplements or a lab artefact. A doctor can help interpret it."
  ];

  /* ---- pure logic ---- */
  function lowerNormalForAge(age) {
    /* NHANES middle-tertile lower bounds (men 20-44), conservative extension above 44 */
    if (age < 30) return 410;
    if (age < 40) return 355;
    if (age < 50) return 350;
    if (age < 60) return 340;
    return 320;
  }
  function classifyLevel(age, ngdl) {
    var ln = lowerNormalForAge(age);
    var tier;
    if (ngdl < LOW_LINE) tier = 0;
    else if (ngdl < ln) tier = 1;
    else if (ngdl < 600) tier = 2;
    else if (ngdl <= 1000) tier = 3;
    else tier = 4;
    return { tier: tier, ln: ln, ngdl: ngdl, nmol: ngdl * NGDL_TO_NMOL };
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
      + ".mbq .row{display:flex;gap:9px}"
      + ".mbq .row .grow{flex:1}"
      + ".mbq input[type=number],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .ratio{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .ratio b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:42px;color:#12294A;line-height:1}"
      + ".mbq .ratio span{font-size:13px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .meta{font-size:12.5px;color:#6E7A88;margin:0 0 14px;line-height:1.5}"
      + ".mbq .meta b{color:#12294A;font-weight:500}"
      + ".mbq .scale{position:relative;height:10px;border-radius:6px;margin:8px 0 6px;background:linear-gradient(90deg,#F0A0A0 0%,#F0A0A0 12.5%,#FAC775 12.5%,#FAC775 25%,#C0DD97 25%,#C0DD97 100%)}"
      + ".mbq .scale .mk{position:absolute;top:-4px;width:3px;height:18px;background:#12294A;border-radius:2px;transform:translateX(-50%)}"
      + ".mbq .scl-lab{display:flex;justify-content:space-between;font-size:10.5px;color:#9aa3ad;margin-bottom:18px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="600" loading="lazy" style="border:0;max-width:560px" title="Testosterone level checker"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Enter your total testosterone from a blood test to see how it compares with the clinical low line and the typical range for your age \u2014 in either unit. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="tl-age">Your age</label>'
      + '<input type="number" id="tl-age" step="1" min="18" max="100" placeholder="e.g. 38"></div>'
      + '<div class="fld"><label for="tl-unit">Lab unit</label>'
      + '<select id="tl-unit"><option value="ngdl">ng/dL (US labs)</option><option value="nmol">nmol/L (UK / EU labs)</option></select></div>'
      + '<div class="fld"><label for="tl-val">Total testosterone</label>'
      + '<input type="number" id="tl-val" step="any" placeholder="your total T result">'
      + '<p class="hint">US labs report ng/dL; UK and EU labs usually report nmol/L.</p></div>'
      + '<p class="err" id="tl-err"></p>'
      + '<button class="btn" id="tl-go">Check my level</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("tl-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("tl-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var age = parseInt(document.getElementById("tl-age").value, 10);
    if (isNaN(age) || age < 18 || age > 100) return fail("Please enter your age (18\u2013100).");
    var unit = document.getElementById("tl-unit").value;
    var val = parseFloat(document.getElementById("tl-val").value);
    if (isNaN(val) || val <= 0) return fail("Please enter your total testosterone result.");
    var ngdl = unit === "nmol" ? (val / NGDL_TO_NMOL) : val;
    if (ngdl < 50 || ngdl > 3000) return fail("That result looks out of range \u2014 please check the value and the unit.");
    err.style.display = "none";
    result(classifyLevel(age, ngdl), unit, val);
  }

  function result(r, unit, entered) {
    var i = r.tier;
    var ngdlR = Math.round(r.ngdl);
    var nmolR = (r.ngdl * NGDL_TO_NMOL).toFixed(1);
    var big, unitLabel, conv;
    if (unit === "nmol") {
      big = (Math.round(entered * 10) / 10).toString();
      unitLabel = "nmol/L";
      conv = ngdlR + " ng/dL";
    } else {
      big = ngdlR.toString();
      unitLabel = "ng/dL";
      conv = nmolR + " nmol/L";
    }
    var pos = Math.max(0, Math.min(100, ((r.ngdl - 200) / 800) * 100)); /* scale 200..1000 */
    body.innerHTML = ""
      + '<div class="ratio"><b>' + big + '</b><span>' + unitLabel + '  \u00b7  ' + conv + '</span></div>'
      + '<span class="pill" style="background:' + tierTint(i) + ';color:' + tierColour(i) + '">' + TIERS[i] + '</span>'
      + '<p class="meta">Clinical low line: <b>300 ng/dL</b> (10.4 nmol/L). Typical for your age starts around <b>' + r.ln + ' ng/dL</b>.</p>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>300</span><span>600</span><span>1000+</span></div>'
      + '<p class="interp">' + INTERP[i] + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Check your symptoms with the Low-T quiz</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational guide, not a diagnosis. A single reading cannot diagnose anything \u2014 testosterone varies with sleep, time of day, stress and illness, and labs differ. Diagnosing low testosterone needs at least two morning blood tests plus symptoms, interpreted by a doctor. Age-specific ranges below 45 are based on population data (NHANES); above that, discuss age-appropriate ranges with your clinician.</p>';
    document.getElementById("mbq-again").onclick = form;
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r, unit, entered); };
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

  function downloadPdf(r, unit, entered) {
    var btn = document.getElementById("mbq-pdf");
    if (btn) btn.textContent = "Preparing\u2026";
    loadJsPDF(function () {
      try {
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var i = r.tier, M = 56, y = 70;
        var ngdlR = Math.round(r.ngdl), nmolR = (r.ngdl * NGDL_TO_NMOL).toFixed(1);
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Testosterone Level", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Testosterone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(18, 41, 74);
        doc.text(ngdlR + " ng/dL   (" + nmolR + " nmol/L)", M, y); y += 22;
        doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(80, 80, 80);
        doc.text(TIERS[i], M, y); y += 22;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("Clinical low line: 300 ng/dL (10.4 nmol/L)  \u00b7  Typical for your age starts ~" + r.ln + " ng/dL", M, y); y += 28;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        var t = doc.splitTextToSize(INTERP[i], 483);
        doc.text(t, M, y); y += t.length * 15 + 14;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Educational guide, not a diagnosis. Diagnosing low testosterone needs at least two morning blood tests plus symptoms, interpreted by a doctor. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("testosterone-level.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("tl-calc") || document.querySelector("[data-tl-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "tl-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Testosterone level checker</h3>'
      + '<div class="sub">Interpret your total T \u00b7 ng/dL &amp; nmol/L</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Testosterone Blueprint</b></span>'
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
