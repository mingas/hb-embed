/* The Testosterone Blueprint - Testosterone Lifestyle Score
   Self-contained embeddable quiz for men. Mounts into #tool-mount
   (or #tls-quiz / a div with data-tls-quiz). 10 lifestyle questions, each
   scored 0-3 toward a /30 "support score". Returns the score, a tier, and
   the visitor's weakest areas with specific actions and (where relevant)
   links to recommended products via the site's /recommends redirects.
   Original tool grounded in recognised testosterone lifestyle factors
   (sleep, training, body fat, diet, alcohol, stress, vitamin D).
   No backend, no tracking; answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/tools/low-testosterone-score";
  var EMBED_SRC = SITE + "/tools/testosterone-lifestyle-score?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* Each question: title, hint, domain label, fix advice, optional rec
     (recommended product via /recommends), and four options (label + score). */
  var Q = [
    { d: "Sleep", t: "Sleep", h: "How many hours you usually sleep",
      o: [["Under 5 hours", 0], ["5\u20136 hours", 1], ["6\u20137 hours", 2], ["7\u20139 hours", 3]],
      fix: "Aim for 7\u20139 hours of quality sleep \u2014 short sleep is one of the fastest ways to lower testosterone.",
      rec: { label: "The magnesium I use for sleep", slug: "magnesium" } },
    { d: "Strength training", t: "Strength training", h: "Lifting weights or resistance work each week",
      o: [["Never", 0], ["About once a week", 1], ["Twice a week", 2], ["3+ times a week", 3]],
      fix: "Add 2\u20133 short strength sessions a week \u2014 compound lifts (squats, presses, rows) raise testosterone most.",
      rec: { label: "The creatine I recommend", slug: "creatine" } },
    { d: "Daily activity", t: "Daily movement", h: "Steps and general activity outside the gym",
      o: [["Mostly sitting all day", 0], ["A little movement", 1], ["Fairly active", 2], ["On my feet / very active", 3]],
      fix: "Break up long periods of sitting \u2014 a daily walk and more steps support healthy testosterone." },
    { d: "Body fat", t: "Waistline", h: "Where you carry your weight",
      o: [["Lots around the middle", 0], ["A bit over", 1], ["Healthy weight", 2], ["Lean and muscular", 3]],
      fix: "Losing excess belly fat lowers aromatase \u2014 the enzyme that turns testosterone into oestrogen." },
    { d: "Protein", t: "Protein", h: "Meat, fish, eggs, dairy or legumes at meals",
      o: [["Rarely", 0], ["At some meals", 1], ["At most meals", 2], ["At every meal", 3]],
      fix: "Aim for a palm of protein at each meal \u2014 it supports muscle and a leaner body.",
      rec: { label: "The zinc I recommend", slug: "zinc" } },
    { d: "Healthy fats", t: "Healthy fats", h: "Eggs, oily fish, olive oil, nuts, avocado",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]],
      fix: "Include healthy fats daily \u2014 cholesterol is the raw material your body builds testosterone from.",
      rec: { label: "The omega-3 I recommend", slug: "omega-3" } },
    { d: "Sugar & processed food", t: "Sugary & processed food", h: "Fizzy drinks, sweets, ultra-processed snacks",
      o: [["Most days", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely", 3]],
      fix: "Cut back on sugary drinks and ultra-processed food \u2014 they spike insulin, which depresses testosterone." },
    { d: "Alcohol", t: "Alcohol", h: "How often you drink",
      o: [["Most days / heavily", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely or never", 3]],
      fix: "Keep alcohol low \u2014 regular heavy drinking measurably lowers testosterone." },
    { d: "Stress", t: "Stress", h: "How easily you switch off and recover",
      o: [["Constantly stressed", 0], ["Often", 1], ["Sometimes", 2], ["Rarely \u2014 I recover well", 3]],
      fix: "Build in real recovery \u2014 chronic stress raises cortisol, which directly suppresses testosterone.",
      rec: { label: "The ashwagandha I recommend", slug: "ashwagandha" } },
    { d: "Vitamin D & sunlight", t: "Sunlight & vitamin D", h: "Daylight exposure, or a vitamin D supplement",
      o: [["Little sun, no supplement", 0], ["Some sun", 1], ["Regular sun or a supplement", 2], ["Consistent sun + supplement", 3]],
      fix: "Get regular daylight; if you are often indoors or in a northern winter, vitamin D3 is one of the best-supported supplements.",
      rec: { label: "The vitamin D3 + K2 I recommend", slug: "vitamin-d3-k2" } }
  ];
  var MAX = 30;

  /* tier: 0 strong, 1 solid, 2 quick wins, 3 big opportunities */
  var TPILL = ["Strong foundation", "Solid \u2014 room to gain", "Several quick wins", "Big opportunities"];
  var TBG = ["#EAF3DE", "#DEF1ED", "#FBF1DC", "#FBE3D2"];
  var TFG = ["#3B6D11", "#1F7A6B", "#A9822F", "#B5561E"];
  var TLEAD = [
    "Your habits are already doing a lot for your testosterone. The aim now is to protect what is working and fine-tune the rest.",
    "A solid base, with a few clear areas where small changes would add up. Your weakest spots are below.",
    "Plenty of quick wins here. Focusing on the areas below first tends to give the fastest return.",
    "There is a real opportunity to feel different. Start with the areas below \u2014 small, steady changes compound."
  ];
  var ans = Array(10).fill(null);
  var root, body;

  /* ---- pure logic ---- */
  function computeScore(answers) {
    var total = 0, i;
    for (i = 0; i < Q.length; i++) total += (answers[i] || 0);
    var tier;
    if (total >= 24) tier = 0;
    else if (total >= 17) tier = 1;
    else if (total >= 10) tier = 2;
    else tier = 3;
    /* weakest areas: domains scoring <=2, lowest first, tie by order; up to 3 */
    var idx = [];
    for (i = 0; i < Q.length; i++) idx.push(i);
    idx.sort(function (a, b) { return (answers[a] || 0) - (answers[b] || 0) || a - b; });
    var weak = [];
    for (i = 0; i < idx.length && weak.length < 3; i++) {
      if ((answers[idx[i]] || 0) <= 2) weak.push(idx[i]);
    }
    return { total: total, tier: tier, weak: weak };
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
      + ".mbq .opt.sel{border-color:#C39A4A;background:#FBF6EC}"
      + ".mbq .opt.sel .rd{border-color:#C39A4A;background:#C39A4A;box-shadow:inset 0 0 0 3px #fff}"
      + ".mbq .ratio{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .ratio b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:42px;color:#12294A;line-height:1}"
      + ".mbq .ratio span{font-size:13px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 16px}"
      + ".mbq .scale{position:relative;height:10px;border-radius:6px;margin:8px 0 6px;background:linear-gradient(90deg,#F0A0A0 0%,#FAC775 33%,#C0DD97 66%,#9CCB6B 100%)}"
      + ".mbq .scale .mk{position:absolute;top:-4px;width:3px;height:18px;background:#12294A;border-radius:2px;transform:translateX(-50%)}"
      + ".mbq .scl-lab{display:flex;justify-content:space-between;font-size:10.5px;color:#9aa3ad;margin-bottom:18px}"
      + ".mbq .rk-h{font-size:12px;color:#9aa3ad;margin:2px 0 10px}"
      + ".mbq .fixrow{border:1px solid #EFEADB;border-radius:11px;padding:12px 14px;margin-bottom:9px;background:#FCFAF4}"
      + ".mbq .fixnm{font-size:13px;font-weight:500;color:#12294A;margin-bottom:3px}"
      + ".mbq .fixtx{font-size:13px;line-height:1.55;color:#3a4654}"
      + ".mbq .reclink{display:inline-block;margin-top:6px;font-size:12.5px;color:#A9822F;text-decoration:underline}"
      + ".mbq .recnote{font-size:11px;color:#9aa3ad;margin:2px 0 16px;font-style:italic}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="700" loading="lazy" style="border:0;max-width:560px" title="Testosterone lifestyle score"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">In about a minute, see how well your daily habits support your testosterone \u2014 and the few changes that would move the needle most. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'A clear lifestyle score out of 30</li>'
      + '<li>' + TICK + 'Your biggest opportunities, ranked</li>'
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
      opts += '<button class="opt' + selCls + '" data-v="' + q.o[k][1] + '"><span class="rd"></span>' + q.o[k][0] + '</button>';
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
    var r = computeScore(ans);
    var t = r.tier;
    var pos = Math.max(0, Math.min(100, (r.total / MAX) * 100));
    var hasRec = false, rows = "";
    if (r.weak.length === 0) {
      rows = '<div class="fixrow"><div class="fixtx">No obvious weak spots \u2014 your habits are genuinely dialled in. Keep protecting your sleep, training and body composition.</div></div>';
    } else {
      for (var w = 0; w < r.weak.length; w++) {
        var q = Q[r.weak[w]];
        var rec = "";
        if (q.rec) {
          hasRec = true;
          rec = '<a class="reclink" href="' + recHref(q.rec.slug) + '" target="_blank" rel="sponsored noopener">' + q.rec.label + ' \u2192</a>';
        }
        rows += '<div class="fixrow"><div class="fixnm">' + q.d + '</div><div class="fixtx">' + q.fix + (rec ? '<br>' + rec : '') + '</div></div>';
      }
    }
    var recNote = hasRec ? '<p class="recnote">Product links are affiliate-supported, at no extra cost to you.</p>' : '';

    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.total + '</b><span>/ ' + MAX + ' lifestyle support</span></div>'
      + '<span class="pill" style="background:' + TBG[t] + ';color:' + TFG[t] + '">' + TPILL[t] + '</span>'
      + '<p class="interp">' + TLEAD[t] + '</p>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>0</span><span>15</span><span>30</span></div>'
      + '<p class="rk-h">Your biggest opportunities</p>'
      + rows
      + recNote
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:6px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Check your symptoms with the Low-T quiz</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational guide, not a diagnosis. Lifestyle is only part of the picture \u2014 testosterone is also affected by age, medication and medical conditions. If you have symptoms of low testosterone, see a doctor; supplements are not a substitute for medical care.</p>';
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
        var t = r.tier, M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Testosterone Lifestyle Score", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Testosterone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(18, 41, 74);
        doc.text(r.total + " / " + MAX + "   " + TPILL[t], M, y); y += 28;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Your biggest opportunities", M, y); y += 18;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        if (r.weak.length === 0) {
          var none = doc.splitTextToSize("No obvious weak spots - your habits are genuinely dialled in.", 483);
          doc.text(none, M, y); y += none.length * 15 + 6;
        } else {
          for (var w = 0; w < r.weak.length; w++) {
            var q = Q[r.weak[w]];
            doc.setFont("helvetica", "bold"); doc.text(q.d, M, y); y += 15;
            doc.setFont("helvetica", "normal");
            var fx = doc.splitTextToSize(q.fix, 483);
            doc.text(fx, M, y); y += fx.length * 14;
            if (q.rec) { doc.setTextColor(169, 130, 47); doc.text(recHref(q.rec.slug), M, y); y += 16; doc.setTextColor(40, 48, 63); }
            y += 6;
          }
        }
        y += 8;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Educational guide, not a diagnosis. If you have symptoms of low testosterone, see a doctor. Product links are affiliate-supported. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("testosterone-lifestyle-score.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("tls-quiz") || document.querySelector("[data-tls-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "tls-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Testosterone lifestyle score</h3>'
      + '<div class="sub">10 quick questions \u00b7 for men</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Testosterone Blueprint</b></span>'
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
