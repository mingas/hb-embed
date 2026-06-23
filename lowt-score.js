/* The Testosterone Blueprint - Low Testosterone Symptom Score
   Self-contained embeddable quiz. Mounts into #tool-mount (or #lowt-quiz /
   a div with data-lowt-quiz). Original 11-item symptom score based on the
   recognised symptoms of low testosterone (not a copyrighted scale).
   No backend, no tracking, answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var EMBED_SRC = SITE + "/tools/low-testosterone-score?embed=1";

  /* embed mode: ?embed=1 in the URL, or running inside an iframe */
  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var Q = [
    { t: "Low sex drive", h: "Less interest in sex than before", g: 0 },
    { t: "Weaker morning erections", h: "Fewer or softer morning erections", g: 0 },
    { t: "Low energy or fatigue", h: "Tired through the day, low get-up-and-go", g: 0 },
    { t: "Reduced stamina", h: "Less endurance for exercise or daily activity", g: 0 },
    { t: "Loss of muscle or strength", h: "Strength or muscle harder to build or keep", g: 1 },
    { t: "Gaining belly fat", h: "Putting on weight around the middle", g: 1 },
    { t: "Poor sleep", h: "Trouble sleeping, or waking unrefreshed", g: 1 },
    { t: "Reduced physical performance", h: "Aches, slower recovery, less drive to train", g: 1 },
    { t: "Low mood or motivation", h: "Flat mood, lost ambition or drive", g: 2 },
    { t: "Irritability", h: "More easily annoyed or short-tempered", g: 2 },
    { t: "Poor concentration", h: "Brain fog, harder to focus or remember", g: 2 }
  ];
  var OPTS = ["None", "Mild", "Moderate", "Severe", "Very severe"];
  var GROUP_NAMES = ["Drive and vitality", "Body and strength", "Mood and mind"];
  var GROUP_MAX = [16, 16, 12];
  var ans = Array(11).fill(null);
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
      + ".mbq .total{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .total b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:40px;color:#12294A;line-height:1}"
      + ".mbq .total span{font-size:14px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq .sub-row{margin-bottom:13px}"
      + ".mbq .sub-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}"
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

  function start() {
    body.innerHTML = ""
      + '<p class="lead">In about a minute, see how strongly your symptoms point to low testosterone \u2014 and what to do next. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'A clear symptom score out of 44</li>'
      + '<li>' + TICK + 'Where your symptoms cluster \u2014 across 3 areas</li>'
      + '<li>' + TICK + 'A free, personalised next step</li>'
      + '</ul>'
      + '<button class="btn" id="mbq-start">Start the check</button>'
      + '<p class="priv">Your answers stay on your device.</p>';
    document.getElementById("mbq-start").onclick = function () { renderQ(0); };
  }

  function renderQ(i) {
    var q = Q[i], pct = Math.round((i / 11) * 100), opts = "";
    for (var k = 0; k < 5; k++) {
      opts += '<button class="opt" data-v="' + k + '"><span class="rd"></span>' + OPTS[k] + '<span class="sc">' + k + '</span></button>';
    }
    body.innerHTML = ""
      + '<div class="prog"><i style="width:' + pct + '%"></i></div>'
      + '<div class="qtop"><span class="qcount">Question ' + (i + 1) + ' of 11</span>'
      + (i > 0 ? '<button class="qback" id="mbq-back">\u2190 Back</button>' : '<span></span>') + '</div>'
      + '<div class="qh">' + q.t + '</div><div class="qhint">' + q.h + '</div>' + opts;
    var bs = body.querySelectorAll(".opt");
    for (var j = 0; j < bs.length; j++) {
      bs[j].onclick = function () {
        ans[i] = parseInt(this.getAttribute("data-v"), 10);
        if (i < 10) renderQ(i + 1); else result();
      };
    }
    var bk = document.getElementById("mbq-back");
    if (bk) bk.onclick = function () { renderQ(i - 1); };
  }

  function computeScores() {
    var sums = [0, 0, 0];
    for (var i = 0; i < 11; i++) sums[Q[i].g] += ans[i];
    var total = sums[0] + sums[1] + sums[2];
    var tb = total <= 4 ? 0 : total <= 8 ? 1 : total <= 16 ? 2 : 3;
    var subs = [
      { nm: GROUP_NAMES[0], v: sums[0], max: 16, b: sums[0] <= 2 ? 0 : sums[0] <= 4 ? 1 : sums[0] <= 8 ? 2 : 3 },
      { nm: GROUP_NAMES[1], v: sums[1], max: 16, b: sums[1] <= 2 ? 0 : sums[1] <= 4 ? 1 : sums[1] <= 8 ? 2 : 3 },
      { nm: GROUP_NAMES[2], v: sums[2], max: 12, b: sums[2] <= 1 ? 0 : sums[2] <= 3 ? 1 : sums[2] <= 6 ? 2 : 3 }
    ];
    return { total: total, tb: tb, subs: subs };
  }

  function result() {
    var r = computeScores(), total = r.total, tb = r.tb, subs = r.subs;
    var tlabel = ["Minimal", "Mild", "Moderate", "Marked"][tb];
    var top = subs.slice().sort(function (a, b) { return b.b - a.b || b.v - a.v; })[0];
    var interp = tb === 0 ? "Your symptoms look minimal overall \u2014 low testosterone looks unlikely to be the main driver." :
      tb === 1 ? "Your symptoms look mild overall." :
      tb === 2 ? "Your symptoms look moderate overall \u2014 they are consistent with low testosterone, though many things can cause them." :
      "Your symptoms look marked overall. It is worth a blood test and a chat with a clinician \u2014 many causes are treatable.";
    var sub = "";
    for (var s = 0; s < subs.length; s++) {
      var x = subs[s], w = Math.round((x.v / x.max) * 100);
      sub += '<div class="sub-row"><div class="sub-top"><span class="nm">' + x.nm + '</span><span class="vl">' + x.v + ' / ' + x.max + '</span></div>'
        + '<div class="bar"><i style="width:' + w + '%;background:' + bandColour(x.b) + '"></i></div></div>';
    }
    var embedSection = EMBED ? "" :
      '<button class="embed-link" id="mbq-embed-toggle">Want this on your site? Get the embed code</button>'
      + '<div class="embed-box" id="mbq-embed-box"><textarea readonly id="mbq-embed-code">'
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="640" loading="lazy" style="border:0;max-width:560px" title="Low testosterone symptom score"&gt;&lt;/iframe&gt;'
      + '</textarea><button class="btn sec cp" id="mbq-copy">Copy code</button></div>';

    body.innerHTML = ""
      + '<div class="total"><b>' + total + '</b><span>/ 44 symptom score</span></div>'
      + '<span class="pill" style="background:' + bandColour(tb) + '33;color:' + bandText(tb) + '">' + tlabel + ' overall</span>'
      + '<p class="interp">' + interp + ' Your symptoms cluster most in <b style="color:#12294A">' + top.nm.toLowerCase() + '</b>.</p>'
      + sub
      + '<div class="legend"><span><b style="background:#C0DD97"></b>low</span><span><b style="background:#EF9F27"></b>moderate</span><span><b style="background:#F09595"></b>marked</span></div>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedSection
      + '<p class="disc">This is a screening tool, not a diagnosis. These symptoms overlap with many conditions; only a blood test and a qualified clinician can confirm low testosterone. Speak to your doctor before changing any medication.</p>';

    document.getElementById("mbq-again").onclick = function () { ans = Array(11).fill(null); start(); };
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
        var tlabel = ["Minimal", "Mild", "Moderate", "Marked"][r.tb];
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Low Testosterone Symptom Score", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Testosterone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(18, 41, 74);
        doc.text(String(r.total) + " / 44", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(80, 80, 80);
        doc.text(tlabel + " overall symptom burden", M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Where your symptoms cluster", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        for (var i = 0; i < r.subs.length; i++) {
          var x = r.subs[i];
          doc.text("\u2022  " + x.nm + ":  " + x.v + " / " + x.max, M, y); y += 18;
        }
        y += 16;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("This is a screening tool based on the recognised symptoms of low testosterone, not a diagnosis. Only a blood test and a qualified clinician can confirm low testosterone. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("low-testosterone-symptom-score.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("lowt-quiz") || document.querySelector("[data-lowt-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "lowt-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Low testosterone symptom score</h3>'
      + '<div class="sub">11 quick questions \u00b7 based on recognised low-T symptoms</div></div>'
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
