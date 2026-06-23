/* The Hormone Blueprint - PCOS Symptom Checker
   Self-contained embeddable screener for women. Mounts into #tool-mount
   (or #pcos-quiz / a div with data-pcos-quiz). Ten questions across the two
   self-reportable Rotterdam features (irregular cycles + signs of higher
   androgens) plus supporting metabolic signs. Returns a screening pattern,
   never a diagnosis. Original wording, not a copyrighted scale.
   No backend, no tracking, answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/pcos-symptom-checker?embed=1";

  /* embed mode: ?embed=1 in the URL, or running inside an iframe */
  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* g = area: 0 = cycle (Rotterdam: oligo/anovulation),
     1 = androgen-related signs (Rotterdam: hyperandrogenism),
     2 = supporting metabolic / risk signs (not a Rotterdam criterion) */
  var Q = [
    { t: "Irregular or unpredictable periods", h: "Cycle length that varies a lot, or is hard to predict", g: 0 },
    { t: "Long gaps between periods", h: "More than 35 days apart, or fewer than 8 periods a year", g: 0 },
    { t: "Missed periods", h: "Periods that skip or stop for months \u2014 not from pregnancy or the pill", g: 0 },
    { t: "Excess facial or body hair", h: "Coarser hair on the chin, upper lip, chest, or stomach", g: 1 },
    { t: "Persistent acne", h: "Breakouts continuing beyond the teenage years, often on the jaw or chin", g: 1 },
    { t: "Thinning hair on the scalp", h: "Thinning at the crown, or a receding hairline", g: 1 },
    { t: "Weight gain around the middle", h: "Putting on weight around the waist, or finding it hard to lose", g: 2 },
    { t: "Sugar cravings or energy crashes", h: "Strong cravings, or slumps in the hours after meals", g: 2 },
    { t: "Darkened patches of skin", h: "Velvety, darker skin in the neck folds, armpits, or groin", g: 2 },
    { t: "PCOS or diabetes in the family", h: "PCOS in a mother or sister, or type-2 diabetes in close family", g: 2 }
  ];
  var OPTS = ["No", "Mild", "Moderate", "Marked"];
  var AREA_NAMES = ["Cycle changes", "Androgen-related signs", "Other / metabolic signs"];
  var AREA_MAX = [9, 9, 12];
  var NQ = Q.length; /* 10 */
  var ans = Array(NQ).fill(null);
  var root, body;

  function bandColour(i) { return ["#C0DD97", "#FAC775", "#EF9F27", "#F09595"][i]; }
  function bandText(i) { return ["#3B6D11", "#BA7517", "#854F0B", "#A32D2D"][i]; }

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
      + ".mbq .ticks{list-style:none;margin:0 0 20px;padding:0;display:grid;gap:9px}"
      + ".mbq .ticks li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#23303F}"
      + ".mbq .ticks svg{flex:none;margin-top:1px}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .prog{height:5px;border-radius:3px;background:#ECEAE3;margin-bottom:14px;overflow:hidden}"
      + ".mbq .prog i{display:block;height:100%;background:#C39A4A;border-radius:3px;transition:width .25s}"
      + ".mbq .qtop{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}"
      + ".mbq .qcount{font-size:11.5px;color:#9aa3ad}"
      + ".mbq .qback{font-size:12px;color:#6E7A88;background:none;border:none;cursor:pointer}"
      + ".mbq .qh{font-family:Fraunces,Georgia,serif;font-size:19px;color:#12294A;margin:0 0 3px;line-height:1.25}"
      + ".mbq .qhint{font-size:12.5px;color:#6E7A88;margin:0 0 15px;line-height:1.45}"
      + ".mbq .opt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;margin-bottom:8px;font:400 13.5px Inter,sans-serif;color:#23303F;background:#fff;cursor:pointer}"
      + ".mbq .opt:hover{border-color:#12294A;background:#F7F9FC}"
      + ".mbq .opt .rd{width:17px;height:17px;border-radius:50%;border:2px solid #cdd4dc;flex:none}"
      + ".mbq .opt .sc{margin-left:auto;font-size:11.5px;color:#aeb6bf}"
      + ".mbq .opt.sel{border-color:#C39A4A;background:#FBF6EC}"
      + ".mbq .opt.sel .rd{border-color:#C39A4A;background:#C39A4A;box-shadow:inset 0 0 0 3px #fff}"
      + ".mbq .top-nm{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:24px;color:#12294A;margin:2px 0 2px;line-height:1.15}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .sub-row{margin-bottom:13px}"
      + ".mbq .sub-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}"
      + ".mbq .sub-top .nm{color:#23303F}"
      + ".mbq .sub-top .vl{color:#6E7A88}"
      + ".mbq .bar{height:8px;border-radius:5px;background:#ECEAE3;overflow:hidden}"
      + ".mbq .bar i{display:block;height:100%;border-radius:5px}"
      + ".mbq .legend{display:flex;gap:14px;font-size:11px;color:#6E7A88;margin:14px 0 18px}"
      + ".mbq .legend span{display:inline-flex;align-items:center;gap:5px}"
      + ".mbq .legend b{width:9px;height:9px;border-radius:50%;display:inline-block}"
      + ".mbq .dl-wrap{margin-top:6px}"
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

  var TICK = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="8.5" cy="8.5" r="8.5" fill="#F1E8D2"/><path d="M5 8.8l2.3 2.2L12 6.3" stroke="#C39A4A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function embedBox() {
    if (EMBED) return "";
    return '<button class="embed-link" id="mbq-embed-toggle">Want this on your site? Get the embed code</button>'
      + '<div class="embed-box" id="mbq-embed-box"><textarea readonly id="mbq-embed-code">'
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="660" loading="lazy" style="border:0;max-width:560px" title="PCOS symptom checker"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">In about a minute, see whether your symptoms fit the pattern doctors screen for in PCOS \u2014 and what to do next. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'A clear screening result, not a diagnosis</li>'
      + '<li>' + TICK + 'Based on the Rotterdam criteria for PCOS</li>'
      + '<li>' + TICK + 'A free, personalised next step</li>'
      + '</ul>'
      + '<button class="btn" id="mbq-start">Start the check</button>'
      + '<p class="priv">Your answers stay on your device.</p>'
      + embedBox();
    document.getElementById("mbq-start").onclick = function () { renderQ(0); };
    wireEmbed();
  }

  function renderQ(i) {
    var q = Q[i], pct = Math.round((i / NQ) * 100), opts = "";
    for (var k = 0; k < OPTS.length; k++) {
      var selCls = (ans[i] === k) ? " sel" : "";
      opts += '<button class="opt' + selCls + '" data-v="' + k + '"><span class="rd"></span>' + OPTS[k] + '<span class="sc">' + k + '</span></button>';
    }
    body.innerHTML = ""
      + '<div class="prog"><i style="width:' + pct + '%"></i></div>'
      + '<div class="qtop"><span class="qcount">Question ' + (i + 1) + ' of ' + NQ + '</span>'
      + (i > 0 ? '<button class="qback" id="mbq-back">\u2190 Back</button>' : '<span></span>') + '</div>'
      + '<div class="qh">' + q.t + '</div><div class="qhint">' + q.h + '</div>' + opts;
    var bs = body.querySelectorAll(".opt");
    for (var j = 0; j < bs.length; j++) {
      bs[j].onclick = function () {
        ans[i] = parseInt(this.getAttribute("data-v"), 10);
        for (var m = 0; m < bs.length; m++) bs[m].classList.remove("sel");
        this.classList.add("sel");
        if (i < NQ - 1) setTimeout(function () { renderQ(i + 1); }, 180);
        else setTimeout(function () { result(); }, 180);
      };
    }
    var bk = document.getElementById("mbq-back");
    if (bk) bk.onclick = function () { renderQ(i - 1); };
  }

  /* PRESENT threshold: a single item scored Moderate (2) or Marked (3)
     counts as a clinically meaningful positive for that area. */
  function computeScores() {
    var sums = [0, 0, 0], maxes = [0, 0, 0], cFlags = 0;
    for (var i = 0; i < NQ; i++) {
      var g = Q[i].g, v = ans[i] || 0;
      sums[g] += v;
      if (v > maxes[g]) maxes[g] = v;
      if (g === 2 && v >= 2) cFlags++;
    }
    var aPresent = maxes[0] >= 2;
    var bPresent = maxes[1] >= 2;
    var coreCount = (aPresent ? 1 : 0) + (bPresent ? 1 : 0);

    var tier;
    if (aPresent && bPresent) tier = 3;            /* both self-reportable Rotterdam features */
    else if (coreCount === 1 && cFlags >= 1) tier = 2; /* one core feature + supporting signs */
    else if (coreCount === 1) tier = 1;            /* one core feature alone */
    else tier = 0;                                  /* neither core feature */

    var subs = [];
    for (var a = 0; a < 3; a++) {
      var p = sums[a] / AREA_MAX[a];
      var b = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
      subs.push({ nm: AREA_NAMES[a], v: sums[a], max: AREA_MAX[a], b: b });
    }
    return { tier: tier, aPresent: aPresent, bPresent: bPresent, coreCount: coreCount, cFlags: cFlags, subs: subs };
  }

  function result() {
    var r = computeScores();
    var labels = ["No clear PCOS pattern", "Some signs present", "Possible PCOS pattern", "Strong PCOS pattern"];
    var tlabel = labels[r.tier];
    var interps = [
      "Your answers don\u2019t show a clear PCOS pattern. If any symptoms are affecting you, they\u2019re still worth raising with a doctor \u2014 many things can cause them.",
      "Your answers show one of the features that can point to PCOS. On its own this is common and often has other explanations \u2014 keep an eye on it, and mention it to your doctor if it continues.",
      "Your answers show one of the two features doctors screen for, alongside some related signs. PCOS is possible, though other causes can look similar \u2014 it\u2019s worth raising with your doctor.",
      "Your answers show both irregular cycles and signs of higher androgens \u2014 the two features doctors look for when screening for PCOS. This doesn\u2019t diagnose it, but it\u2019s well worth asking your doctor for an assessment."
    ];
    var interp = interps[r.tier];
    var pillTxt = r.coreCount === 2 ? "Both core features present"
      : r.coreCount === 1 ? "1 of 2 core features"
      : (r.cFlags > 0 ? "Supporting signs only" : "No core features");
    var pillBand = r.tier;

    var sub = "";
    for (var s = 0; s < r.subs.length; s++) {
      var x = r.subs[s], w = Math.round((x.v / x.max) * 100);
      sub += '<div class="sub-row"><div class="sub-top"><span class="nm">' + x.nm + '</span><span class="vl">' + x.v + ' / ' + x.max + '</span></div>'
        + '<div class="bar"><i style="width:' + w + '%;background:' + bandColour(x.b) + '"></i></div></div>';
    }
    var embedSection = embedBox();

    body.innerHTML = ""
      + '<div class="top-nm">' + tlabel + '</div>'
      + '<span class="pill" style="background:' + bandColour(pillBand) + '33;color:' + bandText(pillBand) + '">' + pillTxt + '</span>'
      + '<p class="interp">' + interp + '</p>'
      + sub
      + '<div class="legend"><span><b style="background:#C0DD97"></b>low</span><span><b style="background:#EF9F27"></b>moderate</span><span><b style="background:#F09595"></b>marked</span></div>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Not sure it\u2019s PCOS? Take the Hormone Quiz</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedSection
      + '<p class="disc">This is an educational screening tool, not a diagnosis. PCOS is diagnosed by a doctor using the Rotterdam criteria, which include blood tests and sometimes an ultrasound \u2014 things this quiz can\u2019t measure. Always speak to a qualified clinician.</p>';

    document.getElementById("mbq-again").onclick = function () { ans = Array(NQ).fill(null); start(); };
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
        var labels = ["No clear PCOS pattern", "Some signs present", "Possible PCOS pattern", "Strong PCOS pattern"];
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your PCOS Symptom Screener", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(18, 41, 74);
        doc.text(labels[r.tier], M, y); y += 22;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(80, 80, 80);
        var core = r.coreCount === 2 ? "Both core features present"
          : r.coreCount === 1 ? "1 of 2 core features present"
          : "No core features present";
        doc.text(core, M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Your answers by area", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        for (var i = 0; i < r.subs.length; i++) {
          var x = r.subs[i];
          doc.text("\u2022  " + x.nm + ":  " + x.v + " / " + x.max, M, y); y += 18;
        }
        y += 16;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("This is an educational screening tool, not a diagnosis. PCOS is diagnosed by a doctor using the Rotterdam criteria, which include blood tests and sometimes an ultrasound. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("pcos-symptom-screener.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("pcos-quiz") || document.querySelector("[data-pcos-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "pcos-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>PCOS symptom checker</h3>'
      + '<div class="sub">10 quick questions \u00b7 based on the Rotterdam criteria</div></div>'
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
