/* The Hormone Blueprint - Protein Intake Calculator
   Self-contained embeddable calculator for everyone. Mounts into #tool-mount
   (or #protein-calc / a div with data-protein-calc). Takes weight (kg/lb),
   age, sex, activity level and goal, and returns a daily protein target and
   range in grams, a per-meal split, the RDA floor for context, and a
   personalised note (menopause / older-adult / men). Grounded in the ISSN
   Position Stand (1.4-2.0 g/kg to build/maintain; up to ~2.2-3.1 g/kg in a
   deficit), Schoenfeld & Aragon per-meal work (~0.4 g/kg across 4 meals) and
   ESPEN/PROT-AGE older-adult guidance (>=1.0-1.2 g/kg). No backend, no
   tracking; values stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/protein-intake-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;
  var LB_TO_KG = 0.453592;

  /* base g/kg by goal x activity (act index 0..3: sedentary..very active) */
  var PERKG = {
    maintain: [1.1, 1.3, 1.5, 1.7],
    build: [1.5, 1.6, 1.8, 2.0],
    lose: [1.7, 1.9, 2.0, 2.2]
  };
  var GOAL_PILL = { maintain: "Maintain muscle", build: "Build muscle", lose: "Lose fat, keep muscle" };
  var GOAL_TINT = { maintain: "#DEF1ED", build: "#EAF3DE", lose: "#FBF1DC" };
  var GOAL_FG = { maintain: "#1F7A6B", build: "#3B6D11", lose: "#A9822F" };

  /* ---- pure logic ---- */
  function computeProtein(weightKg, age, sex, act, goal) {
    var perKg = PERKG[goal][act];
    /* older adults: anabolic resistance raises the floor (ESPEN/PROT-AGE) */
    if (age >= 50 && perKg < 1.2) perKg = 1.2;
    var lowKg = Math.max(1.0, perKg - 0.2);
    var highKg = perKg + 0.2;
    var target = Math.round(weightKg * perKg);
    var low = Math.round(weightKg * lowKg);
    var high = Math.round(weightKg * highKg);
    var rda = Math.round(weightKg * 0.8);
    var perMeal = Math.round(target / 4);
    return {
      perKg: perKg, lowKg: lowKg, highKg: highKg,
      target: target, low: low, high: high, rda: rda, perMeal: perMeal,
      age: age, sex: sex, goal: goal
    };
  }

  function tailoredNote(r) {
    if (r.age >= 65) {
      return "After about 65, your body responds less to protein (called anabolic resistance), so aim for the higher end of your range and include protein at every meal \u2014 paired with resistance training.";
    }
    if (r.sex === "female" && r.age >= 45) {
      return "Around menopause, falling oestrogen speeds up muscle loss, so hitting your protein target \u2014 alongside resistance training \u2014 matters more than ever for staying strong and lean.";
    }
    if (r.sex === "male") {
      return "Protein supports muscle and a leaner body, which in turn supports healthy testosterone. Pair it with regular resistance training for the best return.";
    }
    return "Spreading protein evenly across the day, alongside regular resistance training, gets you the most from every gram.";
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
      + ".mbq .row select{max-width:120px}"
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
      + ".mbq .scale{position:relative;height:10px;border-radius:6px;margin:8px 0 6px;background:linear-gradient(90deg,#EDEFF3 0%,#C0DD97 33%,#9CCB6B 66%,#FAC775 100%)}"
      + ".mbq .scale .mk{position:absolute;top:-4px;width:3px;height:18px;background:#12294A;border-radius:2px;transform:translateX(-50%)}"
      + ".mbq .scl-lab{display:flex;justify-content:space-between;font-size:10.5px;color:#9aa3ad;margin-bottom:18px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 16px}"
      + ".mbq .note{font-size:12.5px;line-height:1.55;color:#6E7A88;margin:0 0 18px;padding:11px 13px;background:#F7F9FC;border-radius:10px}"
      + ".mbq .res{display:flex;flex-direction:column;gap:9px;margin:2px 0 16px}"
      + ".mbq .rcard{display:flex;justify-content:space-between;align-items:baseline;border:1px solid #EFEADB;border-radius:11px;padding:11px 14px;background:#FBF8F0}"
      + ".mbq .rcard .k{font-size:12.5px;color:#3a4654}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:18px;color:#12294A}"
      + ".mbq .rcard .v small{font-family:Inter,sans-serif;font-size:11.5px;color:#9aa3ad;font-weight:400}"
      + ".mbq .fixrow{border:1px solid #EFEADB;border-radius:11px;padding:12px 14px;margin-bottom:9px;background:#FCFAF4}"
      + ".mbq .fixnm{font-size:13px;font-weight:500;color:#12294A;margin-bottom:3px}"
      + ".mbq .fixtx{font-size:13px;line-height:1.55;color:#3a4654}"
      + ".mbq .reclink{display:inline-block;margin-top:6px;font-size:12.5px;color:#A9822F;text-decoration:underline}"
      + ".mbq .recnote{font-size:11px;color:#9aa3ad;margin:2px 0 16px;font-style:italic}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="680" loading="lazy" style="border:0;max-width:560px" title="Protein intake calculator"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Find your daily protein target \u2014 the amount that actually supports muscle, a leaner body and healthy ageing. Tuned to your weight, age, activity and goal. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="pc-weight">Body weight</label>'
      + '<div class="row"><div class="grow"><input type="number" id="pc-weight" step="any" placeholder="e.g. 75"></div>'
      + '<select id="pc-weight-u"><option value="kg">kg</option><option value="lb">lb</option></select></div></div>'
      + '<div class="fld"><label for="pc-age">Age</label>'
      + '<input type="number" id="pc-age" step="1" placeholder="e.g. 42"></div>'
      + '<div class="fld"><label for="pc-sex">You are</label>'
      + '<select id="pc-sex"><option value="female">A woman</option><option value="male">A man</option></select></div>'
      + '<div class="fld"><label for="pc-act">Activity level</label>'
      + '<select id="pc-act"><option value="0">Mostly sedentary</option><option value="1">Lightly active</option><option value="2" selected>Active \u2014 train 2\u20133\u00d7 a week</option><option value="3">Very active \u2014 train 4\u00d7+ a week</option></select></div>'
      + '<div class="fld"><label for="pc-goal">Your goal</label>'
      + '<select id="pc-goal"><option value="maintain">Maintain &amp; stay healthy</option><option value="build" selected>Build muscle</option><option value="lose">Lose fat, keep muscle</option></select></div>'
      + '<p class="err" id="pc-err"></p>'
      + '<button class="btn" id="pc-go">Calculate my protein</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("pc-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("pc-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var w = parseFloat(document.getElementById("pc-weight").value);
    var wu = document.getElementById("pc-weight-u").value;
    var age = parseInt(document.getElementById("pc-age").value, 10);
    var sex = document.getElementById("pc-sex").value;
    var act = parseInt(document.getElementById("pc-act").value, 10);
    var goal = document.getElementById("pc-goal").value;
    if (isNaN(w) || w <= 0) return fail("Please enter your body weight.");
    if (isNaN(age) || age <= 0) return fail("Please enter your age.");
    var weightKg = wu === "lb" ? w * LB_TO_KG : w;
    if (weightKg < 35 || weightKg > 250) return fail("Please check your weight \u2014 it looks out of range.");
    if (age < 14 || age > 100) return fail("This tool is intended for adults aged 14\u2013100.");
    err.style.display = "none";
    result(computeProtein(weightKg, age, sex, act, goal));
  }

  function recHref(slug) { return SITE + "/recommends/" + slug; }

  function result(r) {
    var pos = Math.max(0, Math.min(100, ((r.perKg - 0.8) / (2.4 - 0.8)) * 100));
    var perKgTxt = (Math.round(r.perKg * 10) / 10).toFixed(1);

    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.target + '</b><span>g protein / day</span></div>'
      + '<span class="pill" style="background:' + GOAL_TINT[r.goal] + ';color:' + GOAL_FG[r.goal] + '">' + GOAL_PILL[r.goal] + '</span>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>0.8 g/kg</span><span>1.6 g/kg</span><span>2.4 g/kg</span></div>'
      + '<p class="interp">That works out to about <b>' + perKgTxt + ' g per kg</b> of body weight. Aim for a daily range of <b>' + r.low + '\u2013' + r.high + ' g</b>, and spread it out \u2014 roughly <b>' + r.perMeal + ' g of protein at each of 4 meals</b> is the sweet spot for muscle.</p>'
      + '<div class="res">'
      + '<div class="rcard"><span class="k">Daily range</span><span class="v">' + r.low + '\u2013' + r.high + ' <small>g</small></span></div>'
      + '<div class="rcard"><span class="k">Per meal (\u00d74)</span><span class="v">~' + r.perMeal + ' <small>g each</small></span></div>'
      + '<div class="rcard"><span class="k">RDA floor</span><span class="v">' + r.rda + ' <small>g \u00b7 minimum, not optimal</small></span></div>'
      + '</div>'
      + '<p class="note">' + tailoredNote(r) + '</p>'
      + '<div class="fixrow"><div class="fixnm">Pair protein with creatine</div>'
      + '<div class="fixtx">Creatine is the most-researched supplement for muscle and strength, and it works best alongside enough protein. A simple 3\u20135 g a day, any time, is all most people need.'
      + '<br><a class="reclink" href="' + recHref("creatine") + '" target="_blank" rel="sponsored noopener">The creatine I recommend \u2192</a></div></div>'
      + '<p class="recnote">Product links are affiliate-supported, at no extra cost to you.</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:2px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Take the free Hormone Quiz</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational estimate based on recognised sports-nutrition and healthy-ageing guidance, not personalised medical or dietary advice. If you have kidney disease or any medical condition, talk to your doctor before increasing your protein intake.</p>';
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
        var perKgTxt = (Math.round(r.perKg * 10) / 10).toFixed(1);
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Daily Protein Target", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(18, 41, 74);
        doc.text(r.target + " g / day   (" + GOAL_PILL[r.goal] + ")", M, y); y += 26;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        doc.text("\u2022  About " + perKgTxt + " g per kg of body weight", M, y); y += 18;
        doc.text("\u2022  Daily range:  " + r.low + "\u2013" + r.high + " g", M, y); y += 18;
        doc.text("\u2022  Per meal (\u00d74):  ~" + r.perMeal + " g each", M, y); y += 18;
        doc.text("\u2022  RDA floor:  " + r.rda + " g (minimum to avoid deficiency, not optimal)", M, y); y += 26;
        doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        var t = doc.splitTextToSize(tailoredNote(r), 483);
        doc.text(t, M, y); y += t.length * 15 + 14;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Educational estimate, not personalised medical or dietary advice. If you have kidney disease or any medical condition, speak to your doctor before increasing protein. Creatine (3-5 g/day) pairs well with adequate protein. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("protein-intake-target.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("protein-calc") || document.querySelector("[data-protein-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "protein-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Protein intake calculator</h3>'
      + '<div class="sub">How much protein you really need per day</div></div>'
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
