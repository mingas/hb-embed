/* The Hormone Blueprint - Cortisol & Stress Check
   Self-contained embeddable quiz for everyone. Mounts into #tool-mount
   (or #cortisol-quiz / a div with data-cortisol-quiz). 14 questions across
   two axes - symptom load (8) and stress load + drivers (6) - returning a
   combined stress-hormone load score out of 42, a tier, two bars, an
   optional "tired but wired" flag, personalised quick wins from the
   visitor's strongest drivers, evidence-based ways to lower cortisol, a
   medical red-flag block, and links to recommended products via the site's
   /recommends redirects. Original tool grounded in recognised chronic-
   cortisol symptoms and stress-load constructs, not a copyrighted scale.
   No backend, no tracking; answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var QUIZ_URL = SITE + "/hormone-quiz";
  var LOWT_URL = SITE + "/tools/low-testosterone-score";
  var EMBED_SRC = SITE + "/tools/cortisol-stress-check?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* x = axis: "sym" (symptom load) or "str" (stress load + driver).
     Driver questions (str) carry a fix and optional rec (/recommends). */
  var Q = [
    /* --- Axis A: symptom load (8 x 0-3 = max 24) --- */
    { x: "sym", t: "Tiredness that sleep doesn't fix", h: "Worn out even after a full night's rest",
      o: [["My energy is steady", 0], ["Occasionally", 1], ["Often", 2], ["Almost daily \u2014 running on empty", 3]] },
    { x: "sym", t: "Waking in the small hours", h: "Stirring around 2\u20134am, wired but tired",
      o: [["Rarely", 0], ["Now and then", 1], ["Most weeks", 2], ["Most nights", 3]] },
    { x: "sym", t: "Feeling anxious or on edge", h: "Tense, restless or easily irritated",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most of the time", 3]] },
    { x: "sym", t: "Brain fog", h: "Trouble focusing, or remembering things",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]] },
    { x: "sym", t: "Cravings or stress-eating", h: "Reaching for sugar, salt or comfort food",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]] },
    { x: "sym", t: "Weight settling around your middle", h: "Despite no real change in your habits",
      o: [["No", 0], ["A little", 1], ["Noticeably", 2], ["A lot", 3]] },
    { x: "sym", t: "Tension or getting run down", h: "Muscle tension, headaches, or catching every bug",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most of the time", 3]] },
    { x: "sym", t: "Low libido, or an irregular cycle", h: "Lower sex drive, or (for women) a changing cycle",
      o: [["No change", 0], ["Slightly", 1], ["Noticeably", 2], ["A lot", 3]] },
    /* --- Axis B: stress load + drivers (6 x 0-3 = max 18) --- */
    { x: "str", d: "Feeling overloaded", t: "Things piling up faster than you can handle", h: "How often life feels like too much at once",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Very often", 3]],
      fix: "When everything piles up, name the three things that truly must happen today and let the rest wait \u2014 narrowing the list lowers the stress signal." },
    { x: "str", d: "Feeling out of control", t: "Unable to control the things that matter", h: "How often the important things feel out of your hands",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Very often", 3]],
      fix: "Put your energy into the parts you can influence and deliberately set down what you can't \u2014 a sense of control is one of the strongest levers on cortisol." },
    { x: "str", d: "Caffeine", t: "Coffee or energy drinks a day", h: "Cups or cans across a typical day",
      o: [["None or 1", 0], ["2", 1], ["3", 2], ["4 or more", 3]],
      fix: "Keep caffeine to the morning only \u2014 it lingers six hours or more and keeps evening cortisol high, feeding the 'wired but tired' loop." },
    { x: "str", d: "Alcohol to unwind", t: "Using a drink to take the edge off", h: "Reaching for alcohol to relax in the evening",
      o: [["Rarely or never", 0], ["Occasionally", 1], ["Several times a week", 2], ["Most evenings", 3]],
      fix: "Swap the evening drink for something non-alcoholic a few nights a week \u2014 alcohol fragments the deep sleep when cortisol should be at its lowest." },
    { x: "str", d: "Recovery time", t: "Real downtime to switch off", h: "Time to properly rest and recover",
      o: [["Plenty \u2014 I recover well", 0], ["A fair amount", 1], ["Not much", 2], ["Almost none", 3]],
      fix: "Protect a daily wind-down \u2014 even 20 minutes of genuine downtime (a walk, slow breathing, no screens) signals to your body that the threat has passed.",
      rec: { label: "The magnesium I use to wind down", slug: "magnesium" } },
    { x: "str", d: "Training without rest", t: "Hard training with too few rest days", h: "Pushing most days without real recovery",
      o: [["No \u2014 I rest enough", 0], ["Sometimes", 1], ["Often", 2], ["I rarely take rest days", 3]],
      fix: "Build in one to two full rest days a week \u2014 training hard every day keeps cortisol elevated and blunts the gains you're chasing." }
  ];
  var MAX_A = 24; /* 8 symptom items x 3 */
  var MAX_B = 18; /* 6 stress items x 3 */
  var MAX = MAX_A + MAX_B; /* 42 */

  /* tier: 0 Low (<=10), 1 Moderate (11-20), 2 Elevated (21-30), 3 High (31-42) */
  var TPILL = ["Low load", "Moderate load", "Elevated load", "High load"];
  var TBG = ["#EAF3DE", "#DEF1ED", "#FBF1DC", "#FBE3D2"];
  var TFG = ["#3B6D11", "#1F7A6B", "#A9822F", "#B5561E"];
  var TLEAD = [
    "Your answers show few signs that stress hormones are running high \u2014 reassuring. Cortisol is meant to rise and fall across the day, and the basics below keep that rhythm healthy.",
    "Your answers show a moderate stress-hormone load. Nothing alarming, but a few of the drivers below are worth easing before they build up.",
    "Your answers point to an elevated stress-hormone load. This pattern is common when cortisol stays high for too long \u2014 the good news is most of it responds well to the basics below.",
    "Your answers point to a high stress-hormone load. That is worth taking seriously: start with the drivers below, and consider asking your doctor about proper cortisol testing."
  ];

  /* evidence-based ways to lower cortisol (always shown) */
  var HELP = [
    "Keep a regular sleep\u2013wake time, even at weekends, to reset your cortisol rhythm.",
    "Build meals around protein and fibre to steady blood sugar and break the crash-and-crave cycle.",
    "Move most days, but don't max out every session \u2014 gentle movement lowers cortisol, relentless intensity raises it.",
    "Get daylight early and dim screens late to anchor the natural rise and fall your hormones expect.",
    "Make time for what genuinely settles you \u2014 nature, slow breathing and real connection all measurably lower cortisol."
  ];

  var ans = Array(14).fill(null);
  var root, body;

  /* ---- pure logic ---- */
  function computeCortisol(answers) {
    var sym = 0, str = 0, i, v;
    for (i = 0; i < Q.length; i++) {
      v = answers[i] || 0;
      if (Q[i].x === "sym") sym += v; else str += v;
    }
    var total = sym + str;
    var tier;
    if (total <= 10) tier = 0;
    else if (total <= 20) tier = 1;
    else if (total <= 30) tier = 2;
    else tier = 3;
    /* "tired but wired": fatigue + 2-4am waking + anxiety all elevated */
    var tiredWired = (answers[0] || 0) >= 2 && (answers[1] || 0) >= 2 && (answers[2] || 0) >= 2;
    /* strongest drivers: stress-axis questions scoring >=2, highest first,
       tie broken by question order; up to 3 */
    var drv = [];
    for (i = 0; i < Q.length; i++) if (Q[i].x === "str") drv.push(i);
    drv.sort(function (a, b) { return (answers[b] || 0) - (answers[a] || 0) || a - b; });
    var top = [];
    for (i = 0; i < drv.length && top.length < 3; i++) {
      if ((answers[drv[i]] || 0) >= 2) top.push(drv[i]);
    }
    return { sym: sym, str: str, total: total, tier: tier, tiredWired: tiredWired, drivers: top };
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
      + ".mbq .ratio{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .ratio b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:42px;color:#12294A;line-height:1}"
      + ".mbq .ratio span{font-size:13px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 14px}"
      + ".mbq .interp{font-size:13.5px;line-height:1.6;color:#3a4654;margin:0 0 14px}"
      + ".mbq .note{font-size:12.5px;line-height:1.55;color:#6E7A88;margin:0 0 18px;padding:11px 13px;background:#F7F9FC;border-radius:10px}"
      + ".mbq .rk-h{font-size:12px;color:#9aa3ad;margin:2px 0 10px}"
      + ".mbq .sub-row{margin-bottom:12px}"
      + ".mbq .sub-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px}"
      + ".mbq .sub-top .nm{color:#23303F}"
      + ".mbq .sub-top .vl{color:#9aa3ad}"
      + ".mbq .sub-row.lead-row .sub-top .nm{font-weight:500;color:#12294A}"
      + ".mbq .bar{height:8px;border-radius:5px;background:#ECEAE3;overflow:hidden}"
      + ".mbq .bar i{display:block;height:100%;border-radius:5px}"
      + ".mbq .flag{border:1px solid #E7D3A6;background:#FCF6E8;border-radius:11px;padding:12px 14px;margin:4px 0 18px}"
      + ".mbq .flag .fh{font-size:13px;font-weight:500;color:#8A6A1E;margin-bottom:3px}"
      + ".mbq .flag .ft2{font-size:12.5px;line-height:1.55;color:#6b5a32}"
      + ".mbq .fixrow{border:1px solid #EFEADB;border-radius:11px;padding:12px 14px;margin-bottom:9px;background:#FCFAF4}"
      + ".mbq .fixnm{font-size:13px;font-weight:500;color:#12294A;margin-bottom:3px}"
      + ".mbq .fixtx{font-size:13px;line-height:1.55;color:#3a4654}"
      + ".mbq .reclink{display:inline-block;margin-top:6px;font-size:12.5px;color:#A9822F;text-decoration:underline}"
      + ".mbq .recnote{font-size:11px;color:#9aa3ad;margin:2px 0 16px;font-style:italic}"
      + ".mbq .redflag{border:1px solid #E8C7BC;background:#FCF1EC;border-radius:11px;padding:12px 14px;margin:6px 0 18px}"
      + ".mbq .redflag .rh{font-size:13px;font-weight:500;color:#9A4A2A;margin-bottom:3px}"
      + ".mbq .redflag .rt{font-size:12.5px;line-height:1.55;color:#7a4b39}"
      + ".mbq .bridge{font-size:12.5px;line-height:1.55;color:#3a4654;margin:0 0 16px}"
      + ".mbq .bridge a{color:#A9822F;text-decoration:underline}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="720" loading="lazy" style="border:0;max-width:560px" title="Cortisol and stress check"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">In about a minute, see how heavily stress hormones may be weighing on you \u2014 across your symptoms and the daily drivers behind them \u2014 plus the changes that help most. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'A combined stress-hormone load score</li>'
      + '<li>' + TICK + 'Your symptom load and stress load, side by side</li>'
      + '<li>' + TICK + 'Your biggest drivers, with specific next steps</li>'
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

  function bar(name, score, max, gold) {
    var w = Math.round((score / max) * 100);
    var colour = gold ? "#C39A4A" : "#AEBDD0";
    return '<div class="sub-row' + (gold ? ' lead-row' : '') + '"><div class="sub-top"><span class="nm">' + name + '</span><span class="vl">' + score + ' / ' + max + '</span></div>'
      + '<div class="bar"><i style="width:' + w + '%;background:' + colour + '"></i></div></div>';
  }

  function recHref(slug) { return SITE + "/recommends/" + slug; }

  function result() {
    var r = computeCortisol(ans);
    var t = r.tier;

    /* two bars - gold leads the axis carrying the greater proportional load */
    var symGold = (r.sym / MAX_A) >= (r.str / MAX_B);

    /* tired-but-wired flag */
    var flag = r.tiredWired
      ? '<div class="flag"><div class="fh">A "wired but tired" pattern</div>'
        + '<div class="ft2">Exhausted by day yet alert at night, with 2\u20134am waking, points to cortisol running too high in the evening when it should be at its lowest. Anchoring your wind-down and cutting afternoon caffeine usually helps most here.</div></div>'
      : "";

    /* personalised driver callouts */
    var hasRec = false, rows = "";
    if (r.drivers.length === 0) {
      rows = '<div class="fixrow"><div class="fixtx">No single driver stands out \u2014 your daily load looks well managed. Keep protecting your sleep, recovery and caffeine timing.</div></div>';
    } else {
      for (var w = 0; w < r.drivers.length; w++) {
        var q = Q[r.drivers[w]];
        var rec = "";
        if (q.rec) {
          hasRec = true;
          rec = '<a class="reclink" href="' + recHref(q.rec.slug) + '" target="_blank" rel="sponsored noopener">' + q.rec.label + ' \u2192</a>';
        }
        rows += '<div class="fixrow"><div class="fixnm">' + q.d + '</div><div class="fixtx">' + q.fix + (rec ? '<br>' + rec : '') + '</div></div>';
      }
    }

    /* evidence-based help list (always) + ashwagandha callout (honest framing) */
    var helpList = "";
    for (var h = 0; h < HELP.length; h++) helpList += '<li>' + TICK + HELP[h] + '</li>';
    var ashwa = '<div class="fixrow"><div class="fixnm">A supplement with real evidence</div>'
      + '<div class="fixtx">In randomised trials, ashwagandha significantly lowered cortisol over about eight weeks. It won\u2019t fix the root cause, but alongside the basics above it is one of the better-supported options.'
      + '<br><a class="reclink" href="' + recHref("ashwagandha") + '" target="_blank" rel="sponsored noopener">The ashwagandha I recommend \u2192</a></div></div>';
    var recNote = '<p class="recnote">Product links are affiliate-supported, at no extra cost to you.</p>';

    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.total + '</b><span>/ ' + MAX + ' stress-hormone load</span></div>'
      + '<span class="pill" style="background:' + TBG[t] + ';color:' + TFG[t] + '">' + TPILL[t] + '</span>'
      + '<p class="interp">' + TLEAD[t] + '</p>'
      + '<div class="note">This is a symptom-and-lifestyle check, not a measure of your actual cortisol. Only proper testing \u2014 saliva, blood or urine, taken across the day \u2014 can confirm what your hormones are doing.</div>'
      + '<p class="rk-h">Your two signals</p>'
      + bar("Symptom load", r.sym, MAX_A, symGold)
      + bar("Stress load", r.str, MAX_B, !symGold)
      + flag
      + '<p class="rk-h">Your biggest drivers</p>'
      + rows
      + '<p class="rk-h">What helps lower cortisol</p>'
      + '<ul class="ticks">' + helpList + '</ul>'
      + ashwa
      + recNote
      + '<div class="redflag"><div class="rh">When to see a doctor</div>'
      + '<div class="rt">Book an appointment promptly if you notice purple or red stretch marks, a rounding or flushing of the face, muscle weakness, easy bruising, or rapid unexplained weight gain. These are uncommon, but can point to a medical cause worth ruling out.</div></div>'
      + '<p class="bridge">If you\u2019re a man, chronic cortisol quietly drags testosterone down. <a href="' + LOWT_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Check your symptoms with the Low-T quiz \u2192</a></p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:6px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + QUIZ_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Go deeper with the Hormone Quiz</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational screening tool, not a diagnosis. Cortisol naturally rises and falls across the day, and these symptoms overlap with many other conditions \u2014 including thyroid problems and depression. Only a qualified clinician and proper testing can confirm what is going on. Supplements are not a substitute for medical care.</p>';
    document.getElementById("mbq-again").onclick = function () { ans = Array(14).fill(null); start(); };
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
        doc.text("Your Cortisol & Stress Check", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(18, 41, 74);
        doc.text(r.total + " / " + MAX + "   " + TPILL[t], M, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        doc.text("Symptom load:  " + r.sym + " / " + MAX_A + "      Stress load:  " + r.str + " / " + MAX_B, M, y); y += 22;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        if (r.tiredWired) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(138, 106, 30);
          var tw = doc.splitTextToSize("A 'wired but tired' pattern: tired by day, alert at night with 2-4am waking - a sign of evening cortisol running too high.", 483);
          doc.text(tw, M, y); y += tw.length * 14 + 10; doc.setTextColor(40, 48, 63);
        }
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Your biggest drivers", M, y); y += 18;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        if (r.drivers.length === 0) {
          var none = doc.splitTextToSize("No single driver stands out - your daily load looks well managed.", 483);
          doc.text(none, M, y); y += none.length * 15 + 6;
        } else {
          for (var w = 0; w < r.drivers.length; w++) {
            var q = Q[r.drivers[w]];
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
        var note = doc.splitTextToSize("This is a screening tool, not a measure of your actual cortisol - only proper testing can confirm that. See a doctor for purple stretch marks, facial rounding, muscle weakness, easy bruising or rapid weight gain. Product links are affiliate-supported. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("cortisol-stress-check.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("cortisol-quiz") || document.querySelector("[data-cortisol-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "cortisol-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Cortisol & stress check</h3>'
      + '<div class="sub">14 quick questions \u00b7 for everyone</div></div>'
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
