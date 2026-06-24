/* The Hormone Blueprint - Oestrogen Balance Check
   Self-contained embeddable quiz for women. Mounts into #tool-mount
   (or #eb-quiz / a div with data-eb-quiz). 12 symptom questions scored on
   two axes - higher-oestrogen signs and lower-oestrogen signs - returning a
   clear pattern: balanced, higher, lower, or fluctuating. Original symptom
   check grounded in recognised high/low oestrogen symptoms, not a
   copyrighted scale. No backend, no tracking; answers stay on the device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var EMBED_SRC = SITE + "/tools/estrogen-balance-quiz?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* x = axis: "hi" (higher-oestrogen sign) or "lo" (lower-oestrogen sign) */
  var Q = [
    { t: "Heavy or flooding periods", h: "Soaking through protection, or passing clots", x: "hi" },
    { t: "Breast tenderness or swelling", h: "Especially in the second half of your cycle", x: "hi" },
    { t: "Bloating or water retention", h: "Puffiness or a swollen feeling, often before your period", x: "hi" },
    { t: "Strong or worsening PMS", h: "Mood swings, irritability or low mood before your period", x: "hi" },
    { t: "Premenstrual headaches or migraines", h: "Headaches in the days before your period", x: "hi" },
    { t: "Weight settling on hips and thighs", h: "Hard to shift, around the hips, thighs or middle", x: "hi" },
    { t: "Hot flushes or sudden heat", h: "Waves of heat, or flushing in the face or chest", x: "lo" },
    { t: "Night sweats", h: "Waking up hot or sweating", x: "lo" },
    { t: "Vaginal dryness or discomfort", h: "Dryness, or discomfort during sex", x: "lo" },
    { t: "Periods getting lighter or less frequent", h: "Cycles lengthening, skipping, or stopping", x: "lo" },
    { t: "Drier skin or eyes", h: "Skin or eyes feeling drier than they used to", x: "lo" },
    { t: "Brain fog or trouble concentrating", h: "Memory blips, or finding it harder to focus", x: "lo" }
  ];
  var OPTS = ["No", "Sometimes", "Often", "A lot"];
  var MAX_AXIS = 18; /* 6 items x 3 */
  var THRESH = 6;    /* score at/above this on an axis counts as elevated */
  var SPREAD = 4;    /* gap needed to call a winner when both axes are elevated */

  /* verdict: 0 balanced, 1 higher, 2 lower, 3 fluctuating */
  var VPILL = ["Balanced", "Higher-oestrogen pattern", "Lower-oestrogen pattern", "Fluctuating pattern"];
  var VHEAD = [
    "Balanced \u2014 few signs of oestrogen imbalance",
    "Signs lean towards high oestrogen",
    "Signs lean towards low oestrogen",
    "A mixed, fluctuating pattern"
  ];
  var VPILLBG = ["#EAF3DE", "#FBF1DC", "#EDEFF3", "#F3ECF7"];
  var VPILLFG = ["#3B6D11", "#A9822F", "#5A6B86", "#7A5A93"];
  var INTERP = [
    "Your answers show few strong signs either way \u2014 reassuring. Oestrogen naturally rises and falls across your cycle; keeping sleep, blood sugar and stress steady helps it stay in balance.",
    "Your answers lean towards higher oestrogen relative to progesterone \u2014 often called oestrogen dominance. Heavy periods, breast tenderness, bloating and strong PMS are typical. Steady blood sugar, fibre, supporting progesterone and managing stress can help \u2014 and a clinician can confirm with timed testing.",
    "Your answers lean towards lower oestrogen \u2014 common in perimenopause and menopause, and sometimes with very low body fat or heavy training. Hot flushes, dryness, changing periods and brain fog are typical. A great deal helps, and it is worth a conversation with a clinician.",
    "Your answers show signs of both higher and lower oestrogen \u2014 a fluctuating pattern that is very common in perimenopause, when oestrogen swings up and down. Tracking your symptoms across the month, and a chat with a clinician, can bring clarity."
  ];
  var ans = Array(12).fill(null);
  var root, body;

  /* ---- pure logic ---- */
  function computeEstrogen(answers) {
    var hi = 0, lo = 0;
    for (var i = 0; i < Q.length; i++) {
      var v = answers[i] || 0;
      if (Q[i].x === "hi") hi += v; else lo += v;
    }
    var hiUp = hi >= THRESH, loUp = lo >= THRESH;
    var verdict;
    if (!hiUp && !loUp) verdict = 0;
    else if (hiUp && !loUp) verdict = 1;
    else if (loUp && !hiUp) verdict = 2;
    else { /* both elevated */
      var d = hi - lo;
      if (d >= SPREAD) verdict = 1;
      else if (d <= -SPREAD) verdict = 2;
      else verdict = 3;
    }
    return { hi: hi, lo: lo, hiUp: hiUp, loUp: loUp, verdict: verdict };
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

  function embedBox() {
    if (EMBED) return "";
    return '<button class="embed-link" id="mbq-embed-toggle">Want this on your site? Get the embed code</button>'
      + '<div class="embed-box" id="mbq-embed-box"><textarea readonly id="mbq-embed-code">'
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="660" loading="lazy" style="border:0;max-width:560px" title="Oestrogen balance check"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">In about a minute, see whether your symptoms lean towards higher or lower oestrogen \u2014 and what tends to help. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'Whether your signs lean higher or lower</li>'
      + '<li>' + TICK + 'A clear read on both oestrogen axes</li>'
      + '<li>' + TICK + 'A free, personalised next step</li>'
      + '</ul>'
      + '<button class="btn" id="mbq-start">Start the check</button>'
      + '<p class="priv">Your answers stay on your device.</p>'
      + embedBox();
    document.getElementById("mbq-start").onclick = function () { renderQ(0); };
    wireEmbed();
  }

  function renderQ(i) {
    var q = Q[i], pct = Math.round((i / Q.length) * 100), opts = "";
    for (var k = 0; k < 4; k++) {
      var selCls = (ans[i] === k) ? " sel" : "";
      opts += '<button class="opt' + selCls + '" data-v="' + k + '"><span class="rd"></span>' + OPTS[k] + '<span class="sc">' + k + '</span></button>';
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

  function bar(name, score, gold) {
    var w = Math.round((score / MAX_AXIS) * 100);
    var colour = gold ? "#C39A4A" : "#AEBDD0";
    return '<div class="sub-row' + (gold ? ' lead-row' : '') + '"><div class="sub-top"><span class="nm">' + name + '</span><span class="vl">' + score + ' / ' + MAX_AXIS + '</span></div>'
      + '<div class="bar"><i style="width:' + w + '%;background:' + colour + '"></i></div></div>';
  }

  function result() {
    var r = computeEstrogen(ans);
    var v = r.verdict;
    var hiGold = (v === 1 || v === 3);
    var loGold = (v === 2 || v === 3);
    body.innerHTML = ""
      + '<span class="pill" style="background:' + VPILLBG[v] + ';color:' + VPILLFG[v] + '">' + VPILL[v] + '</span>'
      + '<div class="top-nm">' + VHEAD[v] + '</div>'
      + '<p class="interp">' + INTERP[v] + '</p>'
      + '<p class="rk-h">Your two oestrogen signals</p>'
      + bar("Higher-oestrogen signs", r.hi, hiGold)
      + bar("Lower-oestrogen signs", r.lo, loGold)
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:6px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Go deeper with the Hormone Quiz</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is a screening tool, not a diagnosis. Oestrogen rises and falls naturally across the cycle and symptoms overlap between high and low states \u2014 only a qualified clinician and properly timed testing can confirm what is going on. Speak to your doctor before changing any medication.</p>';
    document.getElementById("mbq-again").onclick = function () { ans = Array(12).fill(null); start(); };
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
        var v = r.verdict, M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Oestrogen Balance Check", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(18, 41, 74);
        doc.text(VHEAD[v], M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Your two oestrogen signals", M, y); y += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        doc.text("\u2022  Higher-oestrogen signs:  " + r.hi + " / " + MAX_AXIS, M, y); y += 18;
        doc.text("\u2022  Lower-oestrogen signs:  " + r.lo + " / " + MAX_AXIS, M, y); y += 26;
        doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        var t = doc.splitTextToSize(INTERP[v], 483);
        doc.text(t, M, y); y += t.length * 15 + 14;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("This is a screening tool, not a diagnosis. Only a qualified clinician and properly timed testing can confirm what is going on. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("oestrogen-balance-check.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("eb-quiz") || document.querySelector("[data-eb-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "eb-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Oestrogen balance check</h3>'
      + '<div class="sub">12 quick questions \u00b7 for women</div></div>'
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
