/* The Hormone Blueprint - Hormone Imbalance Check
   Self-contained embeddable quiz for women. Mounts into #tool-mount
   (or #hi-quiz / a div with data-hi-quiz). 15 symptom questions mapped to
   five recognised hormone patterns; returns the strongest pattern, ranked.
   Original symptom check, not a copyrighted scale.
   No backend, no tracking, answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var EMBED_SRC = SITE + "/tools/hormone-imbalance-check?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* p = pattern index (0..4) */
  var Q = [
    { t: "Heavy or painful periods", h: "Clots, flooding, or strong cramps", p: 0 },
    { t: "Strong PMS", h: "Mood swings or irritability before your period", p: 0 },
    { t: "Breast tenderness or bloating", h: "Especially in the second half of your cycle", p: 0 },
    { t: "Hot flushes or night sweats", h: "Sudden heat, or waking up sweating", p: 1 },
    { t: "Vaginal dryness or discomfort", h: "Dryness, or discomfort during sex", p: 1 },
    { t: "Periods changing or stopping", h: "Becoming irregular, lighter, or stopping", p: 1 },
    { t: "Feeling the cold", h: "Cold when others are comfortable", p: 2 },
    { t: "Unexplained weight gain", h: "Or a metabolism that feels slow", p: 2 },
    { t: "Dry skin, thinning hair, brittle nails", h: "Changes in skin, hair, or nails", p: 2 },
    { t: "Wired but tired", h: "Hard to switch off or wind down at night", p: 3 },
    { t: "Energy crashes or cravings", h: "Slumps, or cravings for sugar or salt", p: 3 },
    { t: "Overwhelmed, weight around the middle", h: "Feeling stretched, with belly weight settling", p: 3 },
    { t: "Acne or oily skin", h: "Breakouts beyond your teenage years", p: 4 },
    { t: "Extra hair on face or body", h: "On the chin, jaw, or body", p: 4 },
    { t: "Irregular cycles, hard to lose weight", h: "Missed periods with stubborn weight", p: 4 }
  ];
  var OPTS = ["No", "Sometimes", "Often", "A lot"];
  var PATTERNS = ["Oestrogen dominance", "Low oestrogen", "Thyroid-type", "Cortisol and stress", "Androgen excess (PCOS-type)"];
  var INTERP = [
    "Your answers lean towards oestrogen dominance \u2014 oestrogen high relative to progesterone. It often shows up as heavy periods, PMS, and breast tenderness. Steadier blood sugar, good sleep, and supporting progesterone can help \u2014 and a clinician can check where you are in your cycle.",
    "Your answers lean towards low oestrogen \u2014 common in perimenopause and menopause. Hot flushes, dryness, and changing periods are typical. There is a great deal that helps, and it is worth a conversation with a clinician.",
    "Your answers lean towards an underactive-thyroid pattern. Feeling cold, low energy, weight changes, and dry skin can point here. A simple blood test (TSH and more) can clarify it \u2014 worth asking your doctor.",
    "Your answers lean towards a stress and cortisol pattern. A 'wired but tired' feeling, cravings, and weight around the middle are classic. Calming the nervous system, sleep, and steady meals are the foundation.",
    "Your answers lean towards an androgen-excess (PCOS-type) pattern. Acne, extra hair, and irregular cycles can point here. It is worth asking your doctor about PCOS screening \u2014 it is common and very manageable."
  ];
  var MILD = "Your symptoms look mild overall, with no single pattern standing out. That is reassuring \u2014 keep an eye on the foundations: sleep, food, movement, and stress.";
  var ans = Array(15).fill(null);
  var root, body;

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
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:4px 0 14px;background:#FBF1DC;color:#A9822F}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .rk-h{font-size:12px;color:#9aa3ad;margin:0 0 10px}"
      + ".mbq .sub-row{margin-bottom:12px}"
      + ".mbq .sub-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}"
      + ".mbq .sub-top .nm{color:#23303F}"
      + ".mbq .sub-top .vl{color:#9aa3ad}"
      + ".mbq .sub-row.lead-row .sub-top .nm{font-weight:500;color:#12294A}"
      + ".mbq .bar{height:8px;border-radius:5px;background:#ECEAE3;overflow:hidden}"
      + ".mbq .bar i{display:block;height:100%;border-radius:5px}"
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

  function start() {
    body.innerHTML = ""
      + '<p class="lead">In about a minute, see which hormone pattern best fits your symptoms \u2014 and what tends to help. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'Which pattern best fits your symptoms</li>'
      + '<li>' + TICK + 'A clear, ranked result across 5 patterns</li>'
      + '<li>' + TICK + 'A free, personalised next step</li>'
      + '</ul>'
      + '<button class="btn" id="mbq-start">Start the check</button>'
      + '<p class="priv">Your answers stay on your device.</p>';
    document.getElementById("mbq-start").onclick = function () { renderQ(0); };
  }

  function renderQ(i) {
    var q = Q[i], pct = Math.round((i / 15) * 100), opts = "";
    for (var k = 0; k < 4; k++) {
      var selCls = (ans[i] === k) ? " sel" : "";
      opts += '<button class="opt' + selCls + '" data-v="' + k + '"><span class="rd"></span>' + OPTS[k] + '<span class="sc">' + k + '</span></button>';
    }
    body.innerHTML = ""
      + '<div class="prog"><i style="width:' + pct + '%"></i></div>'
      + '<div class="qtop"><span class="qcount">Question ' + (i + 1) + ' of 15</span>'
      + (i > 0 ? '<button class="qback" id="mbq-back">\u2190 Back</button>' : '<span></span>') + '</div>'
      + '<div class="qh">' + q.t + '</div><div class="qhint">' + q.h + '</div>' + opts;
    var bs = body.querySelectorAll(".opt");
    for (var j = 0; j < bs.length; j++) {
      bs[j].onclick = function () {
        ans[i] = parseInt(this.getAttribute("data-v"), 10);
        for (var m = 0; m < bs.length; m++) bs[m].classList.remove("sel");
        this.classList.add("sel");
        if (i < 14) setTimeout(function () { renderQ(i + 1); }, 180);
        else setTimeout(function () { result(); }, 180);
      };
    }
    var bk = document.getElementById("mbq-back");
    if (bk) bk.onclick = function () { renderQ(i - 1); };
  }

  function computeScores() {
    var sums = [0, 0, 0, 0, 0];
    for (var i = 0; i < 15; i++) sums[Q[i].p] += ans[i];
    var ranked = [];
    for (var p = 0; p < 5; p++) ranked.push({ nm: PATTERNS[p], idx: p, v: sums[p], max: 9 });
    ranked.sort(function (a, b) { return b.v - a.v || a.idx - b.idx; });
    var top = ranked[0];
    var mild = top.v <= 2;
    return { ranked: ranked, top: top, mild: mild };
  }

  function result() {
    var r = computeScores(), ranked = r.ranked, top = r.top, mild = r.mild;
    var headline = mild ? "Mild \u2014 no single pattern stands out" : top.nm;
    var pill = mild ? "Mild overall" : "Strongest pattern";
    var interp = mild ? MILD : INTERP[top.idx];
    var bars = "";
    for (var s = 0; s < ranked.length; s++) {
      var x = ranked[s], w = Math.round((x.v / x.max) * 100);
      var colour = (!mild && s === 0) ? "#C39A4A" : "#AEBDD0";
      bars += '<div class="sub-row' + ((!mild && s === 0) ? ' lead-row' : '') + '"><div class="sub-top"><span class="nm">' + x.nm + '</span><span class="vl">' + x.v + ' / ' + x.max + '</span></div>'
        + '<div class="bar"><i style="width:' + w + '%;background:' + colour + '"></i></div></div>';
    }
    var embedSection = EMBED ? "" :
      '<button class="embed-link" id="mbq-embed-toggle">Want this on your site? Get the embed code</button>'
      + '<div class="embed-box" id="mbq-embed-box"><textarea readonly id="mbq-embed-code">'
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="680" loading="lazy" style="border:0;max-width:560px" title="Hormone imbalance check"&gt;&lt;/iframe&gt;'
      + '</textarea><button class="btn sec cp" id="mbq-copy">Copy code</button></div>';

    body.innerHTML = ""
      + '<span class="pill">' + pill + '</span>'
      + '<div class="top-nm">' + headline + '</div>'
      + '<p class="interp">' + interp + '</p>'
      + '<p class="rk-h">How your answers ranked across the five patterns</p>'
      + bars
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:6px">Get your free personalised plan</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedSection
      + '<p class="disc">This is a screening tool, not a diagnosis. Hormone patterns overlap, and only a qualified clinician and the right tests can confirm what is going on. Speak to your doctor about your symptoms before changing any medication.</p>';

    document.getElementById("mbq-again").onclick = function () { ans = Array(15).fill(null); start(); };
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r); };

    if (!EMBED) {
      var tg = document.getElementById("mbq-embed-toggle");
      var bx = document.getElementById("mbq-embed-box");
      tg.onclick = function () { bx.style.display = bx.style.display === "block" ? "none" : "block"; };
      document.getElementById("mbq-copy").onclick = function () {
        var ta = document.getElementById("mbq-embed-code");
        ta.select();
        try { document.execCommand("copy"); this.textContent = "Copied"; } catch (e) {}
        var self = this; setTimeout(function () { self.textContent = "Copy code"; }, 1600);
      };
    }
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
        doc.text("Your Hormone Pattern Check", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(18, 41, 74);
        doc.text(r.mild ? "Mild \u2014 no single pattern stands out" : "Strongest pattern: " + r.top.nm, M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("How your answers ranked", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        for (var i = 0; i < r.ranked.length; i++) {
          var x = r.ranked[i];
          doc.text("\u2022  " + x.nm + ":  " + x.v + " / " + x.max, M, y); y += 18;
        }
        y += 16;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("This is a screening tool, not a diagnosis. Hormone patterns overlap, and only a qualified clinician and the right tests can confirm what is going on. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("hormone-pattern-check.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("hi-quiz") || document.querySelector("[data-hi-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "hi-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Hormone imbalance check</h3>'
      + '<div class="sub">15 quick questions \u00b7 for women</div></div>'
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
