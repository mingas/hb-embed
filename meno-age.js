/* The Hormone Blueprint - Menopause Age Estimator
   Self-contained embeddable calculator for women. Mounts into #tool-mount
   (or #mage-calc / a div with data-mage-calc). Estimates the likely age of
   natural menopause from the factors population research links to timing:
   mother's menopause age (genetics, ~50% heritable), smoking, body weight
   (BMI), and number of births. An educational estimate, never a diagnosis.
   No backend, no tracking; values stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/menopause-age-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  var BASE_AGE = 51;           /* population average age of natural menopause */
  var STAGES = ["Premenopause", "Approaching transition", "Perimenopause likely", "Around menopause now", "Likely postmenopausal"];
  function stageColour(i) { return ["#3B6D11", "#7E8CA0", "#EF9F27", "#C39A4A", "#A32D2D"][i]; }
  function stageTint(i) { return ["#EAF3DE", "#EDEFF3", "#FBE9D2", "#FBF1DC", "#F7DEDE"][i]; }

  var SMOKE = { never: 0, former: -0.5, current: -1.5 };
  var WEIGHT = { under: -1, healthy: 0, over: 0.5, obese: 1 };
  var BIRTHS = { "0": -0.5, "1-2": 0, "3+": 0.5 };

  /* ---- pure logic ---- */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function computeMenopause(currentAge, motherAge, smoking, weight, births) {
    /* genetics anchor: ~50% heritable, so blend mother's age with the
       population average; fall back to the average when unknown. */
    var base = (motherAge != null) ? (0.5 * motherAge + 0.5 * BASE_AGE) : BASE_AGE;
    var delta = (SMOKE[smoking] || 0) + (WEIGHT[weight] || 0) + (BIRTHS[births] || 0);
    var predicted = clamp(Math.round(base + delta), 42, 58);
    var rangeLow = Math.max(40, predicted - 3);
    var rangeHigh = predicted + 3;
    var yearsToGo = predicted - currentAge;

    var stage;
    if (currentAge >= predicted + 1) stage = 4;
    else if (yearsToGo <= 1) stage = 3;
    else if (yearsToGo <= 4) stage = 2;
    else if (yearsToGo <= 10) stage = 1;
    else stage = 0;

    return {
      predicted: predicted, rangeLow: rangeLow, rangeHigh: rangeHigh,
      yearsToGo: yearsToGo, stage: stage, currentAge: currentAge
    };
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
      + ".mbq input[type=number],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .ratio{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .ratio b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:44px;color:#12294A;line-height:1}"
      + ".mbq .ratio span{font-size:13px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .meta{font-size:13px;color:#3a4654;margin:0 0 14px;line-height:1.5}"
      + ".mbq .meta b{color:#12294A}"
      + ".mbq .scale{position:relative;height:10px;border-radius:6px;margin:8px 0 6px;background:linear-gradient(90deg,#EDEFF3 0%,#EDEFF3 53%,#FAC775 53%,#FAC775 80%,#F0A0A0 80%,#F0A0A0 100%)}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="640" loading="lazy" style="border:0;max-width:560px" title="Menopause age estimator"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">No tool can predict menopause exactly, but your mother\u2019s timing, smoking, body weight and births all shift the odds. Get a personalised estimate in under a minute. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="ma-age">Your current age</label>'
      + '<input type="number" id="ma-age" step="1" min="18" max="75" placeholder="e.g. 44"></div>'
      + '<div class="fld"><label for="ma-mum">Your mother\u2019s age at menopause</label>'
      + '<input type="number" id="ma-mum" step="1" min="35" max="62" placeholder="if you know it">'
      + '<p class="hint">Genetics is the strongest factor. Leave blank if you don\u2019t know.</p></div>'
      + '<div class="fld"><label for="ma-smoke">Smoking</label>'
      + '<select id="ma-smoke"><option value="never">Never smoked</option><option value="former">Former smoker</option><option value="current">Current smoker</option></select></div>'
      + '<div class="fld"><label for="ma-weight">Body weight</label>'
      + '<select id="ma-weight"><option value="healthy">Healthy weight</option><option value="under">Underweight</option><option value="over">Overweight</option><option value="obese">Obese</option></select></div>'
      + '<div class="fld"><label for="ma-births">Number of children you\u2019ve given birth to</label>'
      + '<select id="ma-births"><option value="0">None</option><option value="1-2">1\u20132</option><option value="3+">3 or more</option></select></div>'
      + '<p class="err" id="ma-err"></p>'
      + '<button class="btn" id="ma-go">Estimate my menopause age</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("ma-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("ma-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var ageRaw = document.getElementById("ma-age").value;
    var mumRaw = document.getElementById("ma-mum").value;
    var age = parseInt(ageRaw, 10);
    if (isNaN(age) || age < 18 || age > 75) return fail("Please enter your age (18\u201375).");
    var mum = null;
    if (mumRaw !== "" && mumRaw != null) {
      mum = parseInt(mumRaw, 10);
      if (isNaN(mum) || mum < 35 || mum > 62) return fail("Please check your mother\u2019s menopause age (35\u201362), or leave it blank.");
    }
    var smoking = document.getElementById("ma-smoke").value;
    var weight = document.getElementById("ma-weight").value;
    var births = document.getElementById("ma-births").value;
    err.style.display = "none";
    result(computeMenopause(age, mum, smoking, weight, births));
  }

  function result(r) {
    var i = r.stage;
    /* timeline window: predicted-12 .. predicted+3 (15 years) */
    var pos = clamp(((r.currentAge - (r.predicted - 12)) / 15) * 100, 0, 100);
    var yearsLine;
    if (r.yearsToGo > 1) yearsLine = "about <b>" + r.yearsToGo + " years</b> from now";
    else if (r.yearsToGo >= -1) yearsLine = "<b>around now</b>";
    else yearsLine = "your age is already past this estimate";

    var interps = [
      "You\u2019re likely still several years from the transition. It\u2019s a good window to build the habits \u2014 sleep, strength training, steady blood sugar \u2014 that make menopause smoother when it comes.",
      "You may be approaching the early transition. Tracking changes in your cycle length from now is a useful early signal, and there\u2019s a lot you can do to prepare.",
      "You\u2019re in the window where perimenopause often begins \u2014 irregular cycles, sleep changes, mood shifts and hot flushes can start here. Many of these are very manageable.",
      "This is close to your age now. If your periods are changing or have become irregular, you\u2019re likely in the menopause transition \u2014 and support makes a real difference.",
      "Your age is past your estimated menopause age. If you\u2019ve gone 12 months without a period, you\u2019ve reached menopause. Symptoms can persist, and they respond well to the right support."
    ];

    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.predicted + '</b><span>estimated menopause age</span></div>'
      + '<span class="pill" style="background:' + stageTint(i) + ';color:' + stageColour(i) + '">' + STAGES[i] + '</span>'
      + '<p class="meta">Typical range for someone like you: <b>' + r.rangeLow + '\u2013' + r.rangeHigh + '</b>.<br>That\u2019s ' + yearsLine + '.</p>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>premenopause</span><span>perimenopause</span><span>after</span></div>'
      + '<p class="interp">' + interps[i] + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Check your symptoms with the Hormone Quiz</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">No calculator can predict menopause exactly \u2014 genetics, health and chance all play a part. This is an educational estimate based on population research (mother\u2019s age, smoking, body weight and births), not a diagnosis. For a clearer picture, FSH/AMH testing and a qualified clinician can help.</p>';
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
        doc.text("Your Menopause Age Estimate", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(18, 41, 74);
        doc.text(String(r.predicted), M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(80, 80, 80);
        doc.text("Estimated age of natural menopause (typical range " + r.rangeLow + "\u2013" + r.rangeHigh + ")", M, y); y += 22;
        doc.setTextColor(110, 122, 136);
        doc.text("Stage now: " + STAGES[r.stage], M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("No calculator can predict menopause exactly. This is an educational estimate based on population research (mother's age, smoking, body weight and births), not a diagnosis. For a clearer picture, FSH/AMH testing and a clinician can help. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("menopause-age-estimate.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("mage-calc") || document.querySelector("[data-mage-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "mage-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Menopause age estimator</h3>'
      + '<div class="sub">Estimate your timing from genetics &amp; lifestyle</div></div>'
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
