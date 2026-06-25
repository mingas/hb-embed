/* The Hormone Blueprint - Hormone Age Quiz
   Self-contained embeddable quiz for everyone. Mounts into #tool-mount
   (or #age-quiz / a div with data-age-quiz). Collects chronological age, then
   eight lifestyle questions that genuinely affect hormonal/metabolic ageing
   (sleep, resistance training, activity, central fat, smoking, alcohol, diet,
   stress). Returns an estimated "body age" = chronological age + a net
   adjustment CAPPED at +-6 years, with a transparent breakdown. This is an
   educational lifestyle estimate, NOT a validated biological clock or hormone
   test. Original tool grounded in population evidence (AHA Life's Essential 8,
   Jha 2013, Moore 2012), not a copyrighted instrument. No backend, no
   tracking; answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/hormone-age-quiz?embed=1";
  var CAP = 6; // maximum net adjustment in years (anchored to AHA Life's Essential 8 ~6 yrs)

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;
  var chronAge = null;
  var ans = [];

  var TICK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:7px"><path d="M20 6L9 17l-5-5"></path></svg>';

  /* Each question: t=title, h=hint, lab=short factor label for breakdown,
     o=options [text, years] (negative = younger). */
  var Q = [
    { lab: "Sleep", t: "How do you sleep?", h: "On a typical night",
      o: [["7\u20139 hours, good quality", -1.5], ["About right, but restless", 0], ["Often 6\u20137 hours", 0.5], ["Under 6 hours or poor quality", 1.5]] },
    { lab: "Strength training", t: "Do you do resistance/strength training?", h: "Weights, bands or bodyweight",
      o: [["2 or more times a week", -1.5], ["About once a week", -0.5], ["Rarely", 0.5], ["Never", 1]] },
    { lab: "Activity", t: "How active are you otherwise?", h: "Walking, cardio, sport",
      o: [["150+ active minutes a week", -1.5], ["Some most weeks", -0.5], ["A little", 0.5], ["Mostly inactive", 1.5]] },
    { lab: "Waist", t: "Do you carry extra weight around your middle?", h: "Central fat affects hormones most",
      o: [["No \u2014 trim waist", -1.5], ["A little", 0], ["A fair amount", 1], ["A lot", 2]] },
    { lab: "Smoking", t: "Do you smoke or vape nicotine?", h: "",
      o: [["Never have", -1], ["Former \u2014 quit over a year ago", 0], ["Occasionally", 1.5], ["Daily", 2.5]] },
    { lab: "Alcohol", t: "How much alcohol do you drink?", h: "UK low-risk guide is \u226414 units/week",
      o: [["Rarely or never", -0.5], ["Within the guideline", 0], ["A bit over most weeks", 1], ["Well over the guideline", 1.5]] },
    { lab: "Diet", t: "How would you rate your everyday diet?", h: "Whole foods and protein vs processed",
      o: [["Mostly whole foods, good protein", -1], ["Fairly balanced", 0], ["Hit and miss", 0.5], ["Mostly processed", 1.5]] },
    { lab: "Stress", t: "How is your stress, day to day?", h: "And how well you manage it",
      o: [["Low, or well managed", -0.5], ["Manageable", 0], ["Often high", 1], ["High and unrelenting", 1.5]] }
  ];

  function r1d(n) { return (Math.round(n * 10) / 10); }

  /* ---- pure logic (testable) ---- */
  function computeAge(age, deltas) {
    var raw = 0;
    for (var i = 0; i < deltas.length; i++) raw += deltas[i];
    var net = Math.max(-CAP, Math.min(CAP, raw));     // clamp to +-CAP
    var bodyAge = Math.round(age + net);
    if (bodyAge < 18) bodyAge = 18;
    return { raw: raw, net: net, bodyAge: bodyAge, diff: bodyAge - age };
  }
  function tier(diff) {
    if (diff <= -3) return { i: 0, label: "Younger than your age" };
    if (diff < 2) return { i: 1, label: "About on track" };
    if (diff < 5) return { i: 2, label: "A little older" };
    return { i: 3, label: "Older than your age" };
  }
  function tierColour(i) { return ["#3B6D11", "#3B6D11", "#BA7517", "#C1582F"][i]; }
  function tierTint(i) { return ["#EAF3DE", "#EAF3DE", "#FBEFD9", "#FBE7DE"][i]; }

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
      + ".mbq .ul{list-style:none;padding:0;margin:0 0 18px;font-size:13.5px;line-height:1.7;color:#3a4654}"
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
      + ".mbq .prog{height:5px;background:#EFEADB;border-radius:4px;overflow:hidden;margin:0 0 16px}"
      + ".mbq .prog i{display:block;height:100%;background:#C39A4A;transition:width .2s}"
      + ".mbq .qmeta{font-size:11.5px;color:#9aa3ad;margin:0 0 8px}"
      + ".mbq .qt{font-family:Fraunces,Georgia,serif;font-size:18px;color:#12294A;margin:0 0 4px}"
      + ".mbq .qh{font-size:12.5px;color:#7a838d;margin:0 0 14px}"
      + ".mbq .opt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;margin-bottom:8px;font:400 13.5px Inter,sans-serif;color:#23303F;background:#fff;cursor:pointer}"
      + ".mbq .opt:hover{border-color:#12294A;background:#F7F9FC}"
      + ".mbq .opt .rd{width:17px;height:17px;border-radius:50%;border:2px solid #cdd4dc;flex:none}"
      + ".mbq .opt.sel{border-color:#C39A4A;background:#FBF6EC}"
      + ".mbq .opt.sel .rd{border-color:#C39A4A;background:#C39A4A;box-shadow:inset 0 0 0 3px #fff}"
      + ".mbq .back{background:none;border:none;color:#6E7A88;font-size:12.5px;cursor:pointer;padding:6px 0;margin-top:2px;text-decoration:underline}"
      + ".mbq .big{text-align:center;border:1px solid #EFEADB;border-radius:14px;padding:20px 16px;background:#FBF8F0;margin:2px 0 16px}"
      + ".mbq .big .k{font-size:12px;color:#6E7A88}"
      + ".mbq .big .v{font-family:Fraunces,Georgia,serif;font-size:46px;color:#12294A;line-height:1.05;margin:4px 0}"
      + ".mbq .big .pill{display:inline-block;font-size:12.5px;font-weight:500;padding:5px 13px;border-radius:20px}"
      + ".mbq .big .cmp{font-size:12.5px;color:#7a838d;margin-top:8px}"
      + ".mbq .bd-list{list-style:none;padding:0;margin:0 0 16px}"
      + ".mbq .bd-list li{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0ECE0;padding:9px 2px;font-size:13px}"
      + ".mbq .bd-list .f{color:#3a4654}"
      + ".mbq .bd-list .y{font-weight:500;font-variant-numeric:tabular-nums}"
      + ".mbq .yg{color:#3B6D11}.mbq .yr{color:#C1582F}.mbq .yn{color:#9aa3ad}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="680" loading="lazy" style="border:0;max-width:560px" title="Hormone age quiz"&gt;&lt;/iframe&gt;'
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

  function start() {
    body.innerHTML = ""
      + '<p class="lead">Your habits age your hormones and metabolism faster \u2014 or slower \u2014 than the calendar. Answer 8 quick questions to see your estimated <b>body age</b>.</p>'
      + '<ul class="ul">'
      + '<li>' + TICK + 'Built on lifestyle factors that genuinely affect ageing</li>'
      + '<li>' + TICK + 'A clear breakdown of what helps and what ages you</li>'
      + '<li>' + TICK + 'Free, private, no email \u2014 about a minute</li></ul>'
      + '<div class="fld"><label for="aq-age">Your age</label>'
      + '<input type="number" id="aq-age" step="1" placeholder="e.g. 42"></div>'
      + '<p class="err" id="aq-err"></p>'
      + '<button class="btn" id="aq-begin">Begin</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("aq-begin").onclick = function () {
      var err = document.getElementById("aq-err");
      var a = parseInt(document.getElementById("aq-age").value, 10);
      if (isNaN(a) || a < 18 || a > 100) { err.textContent = "Please enter your age (18\u2013100)."; err.style.display = "block"; return; }
      chronAge = a;
      ans = [];
      renderQ(0);
    };
    wireEmbed();
  }

  function renderQ(i) {
    var q = Q[i];
    var pct = Math.round((i / Q.length) * 100);
    var opts = "";
    for (var k = 0; k < q.o.length; k++) {
      var selCls = (ans[i] !== undefined && ans[i].k === k) ? " sel" : "";
      opts += '<button class="opt' + selCls + '" data-k="' + k + '"><span class="rd"></span>' + q.o[k][0] + '</button>';
    }
    body.innerHTML = ""
      + '<div class="prog"><i style="width:' + pct + '%"></i></div>'
      + '<div class="qmeta">Question ' + (i + 1) + ' of ' + Q.length + '</div>'
      + '<div class="qt">' + q.t + '</div>'
      + (q.h ? '<div class="qh">' + q.h + '</div>' : '<div style="height:6px"></div>')
      + opts
      + (i > 0 ? '<button class="back" id="aq-back">\u2190 Back</button>' : '');
    var bs = body.querySelectorAll(".opt");
    for (var b = 0; b < bs.length; b++) {
      bs[b].onclick = function () {
        var k = parseInt(this.getAttribute("data-k"), 10);
        ans[i] = { k: k, y: q.o[k][1] };
        var sel = body.querySelectorAll(".opt");
        for (var s = 0; s < sel.length; s++) sel[s].className = "opt";
        this.className = "opt sel";
        if (i < Q.length - 1) setTimeout(function () { renderQ(i + 1); }, 180);
        else setTimeout(function () { result(); }, 180);
      };
    }
    var bk = document.getElementById("aq-back");
    if (bk) bk.onclick = function () { renderQ(i - 1); };
  }

  function result() {
    var deltas = [];
    for (var i = 0; i < Q.length; i++) deltas.push(ans[i] ? ans[i].y : 0);
    var r = computeAge(chronAge, deltas);
    var t = tier(r.diff);

    // breakdown rows (only non-zero, sorted by magnitude)
    var rows = [];
    for (var j = 0; j < Q.length; j++) {
      var y = deltas[j];
      if (y !== 0) rows.push({ lab: Q[j].lab, y: y });
    }
    rows.sort(function (a, b) { return Math.abs(b.y) - Math.abs(a.y); });
    var bdHtml = "";
    for (var m = 0; m < rows.length; m++) {
      var yy = rows[m].y;
      var cls = yy < 0 ? "yg" : "yr";
      var txt = (yy < 0 ? "\u2212" : "+") + Math.abs(yy) + (Math.abs(yy) === 1 ? " yr" : " yrs");
      bdHtml += '<li><span class="f">' + rows[m].lab + '</span><span class="y ' + cls + '">' + txt + '</span></li>';
    }
    if (!bdHtml) bdHtml = '<li><span class="f">Your answers</span><span class="y yn">no net change</span></li>';

    var diffTxt = r.diff === 0 ? "exactly your age"
      : (Math.abs(r.diff) + (Math.abs(r.diff) === 1 ? " year " : " years ") + (r.diff < 0 ? "younger" : "older") + " than your age of " + chronAge);
    var capNote = Math.abs(r.raw) > CAP ? " (capped at \u00b1" + CAP + " years)" : "";

    body.innerHTML = ""
      + '<div class="big"><div class="k">Your estimated body age</div>'
      + '<div class="v">' + r.bodyAge + '</div>'
      + '<span class="pill" style="background:' + tierTint(t.i) + ';color:' + tierColour(t.i) + '">' + t.label + '</span>'
      + '<div class="cmp">That\u2019s ' + diffTxt + '.' + capNote + '</div></div>'
      + '<ul class="bd-list">' + bdHtml + '</ul>'
      + '<p class="interp">' + interp(r, t) + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Take the full hormone quiz \u2192</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational lifestyle estimate \u2014 <b>not</b> a hormone test or a validated biological-age measurement. It doesn\u2019t measure your blood or hormones. The weightings are transparent, evidence-informed estimates capped at \u00b1' + CAP + ' years, anchored to research such as the American Heart Association\u2019s Life\u2019s Essential 8. For real concerns (fatigue, low libido, irregular cycles), see a clinician and get proper testing.</p>';
    document.getElementById("mbq-again").onclick = start;
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r, t, rows); };
    wireEmbed();
  }

  function interp(r, t) {
    if (r.diff <= -3) return "Your habits are doing you real favours \u2014 your lifestyle points to a body that\u2019s ageing more slowly than the calendar. Keep protecting sleep, strength and a steady waist.";
    if (r.diff < 2) return "You\u2019re broadly on track for your age. The biggest gains now usually come from whichever factor added the most years above \u2014 start there.";
    if (r.diff < 5) return "A few habits are nudging your body age up. The good news: the factors that added years are the most changeable ones. Tackle the largest first.";
    return "Several habits are ageing your hormones and metabolism faster than they need to \u2014 and every one of them can move the other way. Pick the single biggest contributor above and start there.";
  }

  function loadJsPDF(cb) {
    if (window.jspdf && window.jspdf.jsPDF) { cb(); return; }
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = cb;
    s.onerror = function () { alert("Sorry, the PDF could not be generated just now."); };
    document.head.appendChild(s);
  }

  function downloadPdf(r, t, rows) {
    var btn = document.getElementById("mbq-pdf");
    if (btn) btn.textContent = "Preparing\u2026";
    loadJsPDF(function () {
      try {
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Hormone Age Result", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        doc.text("Your age:  " + chronAge, M, y); y += 20;
        doc.text("Estimated body age:  " + r.bodyAge + "  (" + t.label + ")", M, y); y += 26;
        doc.setFont("helvetica", "bold"); doc.text("What moved your result:", M, y); y += 18;
        doc.setFont("helvetica", "normal");
        for (var i = 0; i < rows.length; i++) {
          var yy = rows[i].y;
          var txt = (yy < 0 ? "-" : "+") + Math.abs(yy) + " yrs   " + rows[i].lab;
          doc.text(txt, M, y); y += 18;
        }
        y += 12;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("An educational lifestyle estimate, not a hormone test or validated biological-age measurement (capped at \u00b1" + CAP + " years). For real concerns, see a clinician. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("hormone-age-result.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("age-quiz") || document.querySelector("[data-age-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "age-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Hormone age quiz</h3>'
      + '<div class="sub">Is your body older or younger than your age?</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Hormone Blueprint</b></span>'
      + '<a href="' + SITE + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>' + SITE.replace("https://", "") + '</a></div>';
    host.appendChild(root);
    body = root.querySelector("#mbq-body");
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
