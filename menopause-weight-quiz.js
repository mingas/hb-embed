/* The Hormone Blueprint - Menopause Weight-Gain Check
   Self-contained embeddable quiz for women. Mounts into #tool-mount
   (or #mw-quiz / a div with data-mw-quiz). 10 questions mapped to five
   recognised drivers of midlife weight gain - oestrogen-driven fat
   redistribution, muscle loss, blood sugar / insulin, stress / cortisol and
   sleep - returning a ranked breakdown, the biggest drivers with tailored
   actions, and (where relevant) links to recommended products via the
   site's /recommends redirects. Original symptom check grounded in
   recognised menopause-metabolism science, not a copyrighted scale.
   No backend, no tracking; answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/menopause-weight-quiz?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* p = driver index (0..4). Each question carries its own scored options. */
  var Q = [
    { p: 0, t: "Weight settling around your middle", h: "More belly weight, even with the same habits",
      o: [["No", 0], ["A little", 1], ["Noticeably", 2], ["A lot", 3]] },
    { p: 0, t: "Periods changing, or hot flushes", h: "Cycles irregular, lighter or stopped \u2014 or flushes",
      o: [["Not yet", 0], ["Maybe starting", 1], ["Yes", 2], ["Yes, well into it / post", 3]] },
    { p: 1, t: "Strength or resistance training", h: "Weights, bands or bodyweight work each week",
      o: [["2\u20133+ times a week", 0], ["About once a week", 1], ["Rarely", 2], ["Never", 3]] },
    { p: 1, t: "Feeling weaker, or losing muscle", h: "Muscle harder to keep than it used to be",
      o: [["No", 0], ["A little", 1], ["Yes", 2], ["A lot", 3]] },
    { p: 2, t: "Refined carbs and sugar", h: "Bread, pasta, sweets, sugary drinks",
      o: [["Rarely", 0], ["Sometimes", 1], ["Most days", 2], ["Several times a day", 3]] },
    { p: 2, t: "Energy crashes or cravings", h: "Slumps, or strong cravings between meals",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]] },
    { p: 3, t: "Feeling stressed or stretched", h: "Hard to switch off or wind down",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most of the time", 3]] },
    { p: 3, t: "Comfort or stress eating", h: "Eating more when stressed or low",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]] },
    { p: 4, t: "How is your sleep?", h: "Quality and length most nights",
      o: [["Solid 7\u20139 hours", 0], ["Mostly ok", 1], ["Often broken", 2], ["Poor most nights", 3]] },
    { p: 4, t: "Night sweats or waking", h: "Hot flushes or waking disrupting sleep",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most nights", 3]] }
  ];
  var MAX_DRV = 6; /* 2 questions x 3 per driver */

  var DRV = [
    { nm: "Oestrogen & fat redistribution",
      fix: "As oestrogen falls, your body shifts fat to your middle \u2014 even with the same diet and exercise. This is hormonal, not a willpower problem. Strength training and protein help most, and it is worth asking your GP whether HRT is right for you." },
    { nm: "Muscle loss & strength",
      fix: "Muscle naturally drops 5\u201310% each decade after 50, which slows your metabolism. Two to three short strength sessions a week is the single most effective fix \u2014 it rebuilds the engine that burns fat.",
      rec: { label: "The creatine I recommend", slug: "creatine" } },
    { nm: "Blood sugar & insulin",
      fix: "Menopause nudges you towards insulin resistance, so refined carbs and sugar are stored more easily as belly fat. Build meals around protein, fibre and vegetables, and keep sugary drinks and snacks occasional." },
    { nm: "Stress & cortisol",
      fix: "Chronic stress raises cortisol, which drives belly fat and cravings \u2014 and harsh, shame-based dieting makes it worse. Protecting real downtime, and being kinder to yourself, genuinely helps your waistline.",
      rec: { label: "The ashwagandha I recommend", slug: "ashwagandha" } },
    { nm: "Sleep",
      fix: "Broken sleep disrupts the hormones that control hunger, so you tend to eat more the next day. Treating night sweats and protecting 7\u20139 hours pays off surprisingly fast.",
      rec: { label: "The magnesium I use to wind down", slug: "magnesium" } }
  ];
  var DRV_LEAD = [
    "Your answers point most to the oestrogen-driven shift in where your body stores fat.",
    "Your answers point most to muscle loss slowing your metabolism.",
    "Your answers point most to blood-sugar and insulin changes.",
    "Your answers point most to stress and cortisol.",
    "Your answers point most to disrupted sleep."
  ];
  var REASSURE = "Midlife weight gain is driven by hormonal change, not willpower \u2014 and that means it responds to the right strategy. ";
  var MILD = "Your answers don't point strongly to any one driver \u2014 reassuring. Keep protecting the basics: strength training, protein, steady blood sugar, sleep and stress.";

  var ans = Array(10).fill(null);
  var root, body;

  /* ---- pure logic ---- */
  function computeDrivers(answers) {
    var sums = [0, 0, 0, 0, 0], i;
    for (i = 0; i < Q.length; i++) sums[Q[i].p] += (answers[i] || 0);
    var ranked = [];
    for (i = 0; i < 5; i++) ranked.push({ idx: i, nm: DRV[i].nm, v: sums[i] });
    ranked.sort(function (a, b) { return b.v - a.v || a.idx - b.idx; });
    var top = ranked[0];
    var mild = top.v <= 2;
    /* drivers to call out: score >= 3, highest first, up to 3 */
    var focus = [];
    for (i = 0; i < ranked.length && focus.length < 3; i++) {
      if (ranked[i].v >= 3) focus.push(ranked[i].idx);
    }
    return { ranked: ranked, top: top, mild: mild, focus: focus };
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
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:4px 0 14px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .rk-h{font-size:12px;color:#9aa3ad;margin:2px 0 10px}"
      + ".mbq .sub-row{margin-bottom:12px}"
      + ".mbq .sub-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}"
      + ".mbq .sub-top .nm{color:#23303F}"
      + ".mbq .sub-top .vl{color:#9aa3ad}"
      + ".mbq .sub-row.lead-row .sub-top .nm{font-weight:500;color:#12294A}"
      + ".mbq .bar{height:8px;border-radius:5px;background:#ECEAE3;overflow:hidden}"
      + ".mbq .bar i{display:block;height:100%;border-radius:5px}"
      + ".mbq .fixrow{border:1px solid #EFEADB;border-radius:11px;padding:12px 14px;margin-bottom:9px;background:#FCFAF4}"
      + ".mbq .fixnm{font-size:13px;font-weight:500;color:#12294A;margin-bottom:3px}"
      + ".mbq .fixtx{font-size:13px;line-height:1.55;color:#3a4654}"
      + ".mbq .reclink{display:inline-block;margin-top:6px;font-size:12.5px;color:#A9822F;text-decoration:underline}"
      + ".mbq .recnote{font-size:11px;color:#9aa3ad;margin:2px 0 16px;font-style:italic}"
      + ".mbq .note{font-size:12.5px;line-height:1.55;color:#6E7A88;margin:6px 0 18px;padding:11px 13px;background:#F7F9FC;border-radius:10px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="720" loading="lazy" style="border:0;max-width:560px" title="Menopause weight-gain check"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Menopause weight gain isn\u2019t about willpower \u2014 it\u2019s hormonal. In about a minute, see which drivers are working hardest against you, and where to focus first. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'Your weight-gain drivers, ranked</li>'
      + '<li>' + TICK + 'Which one to tackle first</li>'
      + '<li>' + TICK + 'Specific, doable next steps</li>'
      + '</ul>'
      + '<button class="btn" id="mbq-start">Start the check</button>'
      + '<p class="priv">Your answers stay on your device.</p>'
      + embedBox();
    document.getElementById("mbq-start").onclick = function () { renderQ(0); };
    wireEmbed();
  }

  function renderQ(i) {
    var q = Q[i], pct = Math.round((i / Q.length) * 100), opts = "";
    for (var k = 0; k < q.o.length; k++) {
      var selCls = (ans[i] === q.o[k][1]) ? " sel" : "";
      opts += '<button class="opt' + selCls + '" data-v="' + q.o[k][1] + '"><span class="rd"></span>' + q.o[k][0] + '<span class="sc">' + q.o[k][1] + '</span></button>';
    }
    body.innerHTML = ""
      + '<div class="prog"><i style="width:' + pct + '%"></i></div>'
      + '<div class="qtop"><span class="qcount">Question ' + (i + 1) + ' of ' + Q.length + '</span>'
      + (i > 0 ? '<button class="qback" id="mbq-back">\u2190 Back</button>' : '<span></span>') + '</div>'
      + '<div class="qh">' + q.t + '</div><div class="qhint">' + q.h + '</div>' + opts;
    var bs = body.querySelectorAll(".opt");
    for (var j = 0; j < bs.length; j++) {
      bs[j].onclick = function () {
        ans[i] = parseInt(this.getAttribute("data-v"), 10);
        for (var m = 0; m < bs.length; m++) bs[m].classList.remove("sel");
        this.classList.add("sel");
        if (i < Q.length - 1) setTimeout(function () { renderQ(i + 1); }, 180);
        else setTimeout(function () { result(); }, 180);
      };
    }
    var bk = document.getElementById("mbq-back");
    if (bk) bk.onclick = function () { renderQ(i - 1); };
  }

  function recHref(slug) { return SITE + "/recommends/" + slug; }

  function result() {
    var r = computeDrivers(ans), ranked = r.ranked, mild = r.mild;
    var pill = mild ? "Mild overall" : "Your biggest driver";
    var pillBg = mild ? "#EDEFF3" : "#FBF1DC", pillFg = mild ? "#5A6B86" : "#A9822F";
    var headline = mild ? "No single driver stands out" : r.top.nm;
    var interp = mild ? MILD : (REASSURE + DRV_LEAD[r.top.idx] + " Here\u2019s where to focus first.");

    var bars = "";
    for (var s = 0; s < ranked.length; s++) {
      var x = ranked[s], w = Math.round((x.v / MAX_DRV) * 100);
      var gold = (!mild && s === 0);
      bars += '<div class="sub-row' + (gold ? ' lead-row' : '') + '"><div class="sub-top"><span class="nm">' + x.nm + '</span><span class="vl">' + x.v + ' / ' + MAX_DRV + '</span></div>'
        + '<div class="bar"><i style="width:' + w + '%;background:' + (gold ? "#C39A4A" : "#AEBDD0") + '"></i></div></div>';
    }

    var rows = "", hasRec = false, recsShown = 0;
    if (r.focus.length === 0) {
      rows = '<div class="fixrow"><div class="fixtx">Nothing is strongly driving the scales right now. Keep protecting the basics \u2014 strength training, protein, steady blood sugar, sleep and stress.</div></div>';
    } else {
      for (var f = 0; f < r.focus.length; f++) {
        var d = DRV[r.focus[f]];
        var rec = "";
        if (d.rec && recsShown < 2) {
          hasRec = true; recsShown++;
          rec = '<a class="reclink" href="' + recHref(d.rec.slug) + '" target="_blank" rel="sponsored noopener">' + d.rec.label + ' \u2192</a>';
        }
        rows += '<div class="fixrow"><div class="fixnm">' + d.nm + '</div><div class="fixtx">' + d.fix + (rec ? '<br>' + rec : '') + '</div></div>';
      }
    }
    var recNote = hasRec ? '<p class="recnote">Product links are affiliate-supported, at no extra cost to you.</p>' : '';

    body.innerHTML = ""
      + '<span class="pill" style="background:' + pillBg + ';color:' + pillFg + '">' + pill + '</span>'
      + '<div class="top-nm">' + headline + '</div>'
      + '<p class="interp">' + interp + '</p>'
      + '<p class="rk-h">What\u2019s driving it most</p>'
      + bars
      + '<p class="rk-h" style="margin-top:16px">Where to focus first</p>'
      + rows
      + recNote
      + '<div class="note">It\u2019s also worth asking your GP about HRT, which can ease the shift, and screening for thyroid problems and insulin resistance \u2014 all common in midlife and very treatable.</div>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:2px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Go deeper with the Hormone Quiz</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational screening tool, not a diagnosis. Weight is shaped by many things, and these drivers overlap \u2014 only a qualified clinician can confirm what is going on for you. Speak to your doctor before making big changes, especially if you have a medical condition.</p>';
    document.getElementById("mbq-again").onclick = function () { ans = Array(10).fill(null); start(); };
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
        var M = 56, y = 70, i;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Menopause Weight-Gain Check", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(18, 41, 74);
        doc.text(r.mild ? "Mild \u2014 no single driver stands out" : "Biggest driver: " + r.top.nm, M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("What's driving it most", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        for (i = 0; i < r.ranked.length; i++) {
          doc.text("\u2022  " + r.ranked[i].nm + ":  " + r.ranked[i].v + " / 6", M, y); y += 18;
        }
        y += 8;
        if (r.focus.length) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
          doc.text("Where to focus first", M, y); y += 18;
          doc.setFontSize(11); doc.setTextColor(40, 48, 63);
          for (i = 0; i < r.focus.length; i++) {
            var d = DRV[r.focus[i]];
            doc.setFont("helvetica", "bold"); doc.text(d.nm, M, y); y += 15;
            doc.setFont("helvetica", "normal");
            var fx = doc.splitTextToSize(d.fix, 483);
            doc.text(fx, M, y); y += fx.length * 14 + 6;
          }
        }
        y += 8;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Educational screening tool, not a diagnosis. Ask your GP about HRT and screening for thyroid and insulin resistance. Product links are affiliate-supported. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("menopause-weight-check.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("mw-quiz") || document.querySelector("[data-mw-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "mw-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Menopause weight-gain check</h3>'
      + '<div class="sub">10 quick questions \u00b7 for women</div></div>'
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
