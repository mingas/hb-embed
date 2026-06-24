/* The Testosterone Blueprint - Testosterone Foods Score
   Self-contained embeddable quiz for men. Mounts into #tool-mount
   (or #tf-quiz / a div with data-tf-quiz). 10 food-frequency questions, each
   scored 0-3 toward a /30 "testosterone-diet score". Five questions reward
   testosterone-supporting foods (oily fish, zinc-rich foods, magnesium foods,
   healthy fats, quality protein); five are reverse-scored for foods to limit
   (sugar, ultra-processed, fried/seed oils, alcohol, refined carbs). Returns
   the score, a tier, and the visitor's weakest areas with specific food swaps
   that deep-link into the site's /foods library, plus honest, optional
   supplement links via /recommends redirects.
   Grounded in recognised diet-testosterone science: zinc, vitamin D (when
   low) and magnesium support testosterone; very low-fat eating lowers it;
   sugar, ultra-processed food, trans/seed-oil load and heavy alcohol lower it.
   Soy is deliberately NOT demonised (neutral at normal intakes).
   No backend, no tracking; answers stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var FOODS_URL = SITE + "/foods";
  var LOWT_URL = SITE + "/tools/low-testosterone-score";
  var EMBED_SRC = SITE + "/tools/testosterone-foods-score?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  /* Each question: domain label (d), short title (t), hint (h), options
     (label + score 0..3), fix advice, real /foods deep-links (slug + label),
     optional limit flag (reverse foods = "Limit" not "Try"), optional rec
     (recommended supplement via /recommends). */
  var Q = [
    { d: "Oily fish", t: "Oily fish", h: "Salmon, mackerel, sardines \u2014 vitamin D & omega-3",
      o: [["Never", 0], ["Occasionally", 1], ["Weekly", 2], ["2\u20133\u00d7 a week or more", 3]],
      fix: "Oily fish is one of the best whole-food sources of vitamin D and omega-3, both tied to healthy testosterone. Aim for 2\u20133 portions a week.",
      foods: [["salmon", "Salmon"], ["sardines", "Sardines"], ["mackerel", "Mackerel"]],
      rec: { label: "The vitamin D3 + K2 I recommend", slug: "vitamin-d3-k2" } },
    { d: "Zinc-rich foods", t: "Zinc-rich foods", h: "Oysters, shellfish, red meat, eggs",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]],
      fix: "Zinc is essential for testosterone production, and many men run low. Oysters, red meat and eggs are the richest sources.",
      foods: [["oysters", "Oysters"], ["grass-fed-beef", "Red meat"], ["eggs", "Eggs"]],
      rec: { label: "The zinc I recommend", slug: "zinc" } },
    { d: "Magnesium foods", t: "Magnesium foods", h: "Leafy greens, nuts, seeds",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]],
      fix: "Magnesium supports free testosterone and sleep, and most diets fall short. Lean on leafy greens, pumpkin seeds and nuts.",
      foods: [["spinach", "Leafy greens"], ["pumpkin-seeds", "Pumpkin seeds"], ["almonds", "Almonds"]],
      rec: { label: "The magnesium I use", slug: "magnesium" } },
    { d: "Healthy fats", t: "Healthy fats", h: "Olive oil, avocado, nuts, eggs",
      o: [["Rarely", 0], ["Sometimes", 1], ["Often", 2], ["Most days", 3]],
      fix: "Cholesterol and healthy fats are the raw material your body builds testosterone from \u2014 very low-fat eating lowers it. Include olive oil, avocado and nuts daily.",
      foods: [["extra-virgin-olive-oil", "Olive oil"], ["avocado", "Avocado"], ["walnuts", "Walnuts"]] },
    { d: "Quality protein", t: "Protein at meals", h: "Meat, fish, eggs or dairy at meals",
      o: [["Rarely", 0], ["Some meals", 1], ["Most meals", 2], ["Every meal", 3]],
      fix: "Protein supports muscle and a leaner body, which in turn supports testosterone. Aim for a palm of quality protein at each meal.",
      foods: [["eggs", "Eggs"], ["grass-fed-beef", "Beef"], ["chicken", "Chicken"], ["greek-yogurt", "Greek yogurt"]] },
    { d: "Sugar & sugary drinks", t: "Sugar & sugary drinks", h: "Fizzy drinks, sweets, added sugar", limit: true,
      o: [["Daily", 0], ["Most days", 1], ["Sometimes", 2], ["Rarely", 3]],
      fix: "Sugar spikes insulin, and chronically high insulin drags testosterone down. Cutting sugary drinks and sweets is one of the fastest wins.",
      foods: [["added-sugar", "Added sugar"], ["sugary-drinks", "Sugary drinks"], ["energy-drinks", "Energy drinks"]] },
    { d: "Ultra-processed & fast food", t: "Ultra-processed & fast food", h: "Ready meals, fast food, packaged snacks", limit: true,
      o: [["Most days", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely", 3]],
      fix: "Ultra-processed and fast food crowd out the nutrients testosterone needs and drive fat gain. Build meals from whole foods instead.",
      foods: [["ultra-processed-foods", "Ultra-processed food"], ["fast-food", "Fast food"]] },
    { d: "Fried foods & seed oils", t: "Fried foods & seed oils", h: "Deep-fried food, vegetable/seed oils, margarine", limit: true,
      o: [["Most days", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely", 3]],
      fix: "Trans fats and a heavy load of refined seed oils promote inflammation that works against testosterone. Cook with olive oil or butter instead.",
      foods: [["trans-fats", "Trans fats"], ["seed-oils", "Seed oils"]] },
    { d: "Alcohol", t: "Alcohol", h: "How often you drink", limit: true,
      o: [["Most days / heavily", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely or never", 3]],
      fix: "Regular heavy drinking measurably lowers testosterone. Keeping alcohol occasional protects your levels.",
      foods: [["alcohol", "Spirits"], ["beer", "Beer"]] },
    { d: "Refined carbs", t: "Refined carbs", h: "White bread, pastries, refined flour", limit: true,
      o: [["Most days", 0], ["Several times a week", 1], ["Occasionally", 2], ["Rarely", 3]],
      fix: "Refined flour behaves like sugar \u2014 fast spikes that strain insulin. Swap to whole grains, or pair carbs with protein and fat.",
      foods: [["refined-flour", "White bread & flour"]] }
  ];
  var MAX = 30;

  /* tier: 0 strong, 1 good, 2 quick wins, 3 big opportunities */
  var TPILL = ["Testosterone-friendly diet", "Good \u2014 a few easy swaps", "Average \u2014 clear wins", "Lots to gain from food"];
  var TBG = ["#EAF3DE", "#DEF1ED", "#FBF1DC", "#FBE3D2"];
  var TFG = ["#3B6D11", "#1F7A6B", "#A9822F", "#B5561E"];
  var TLEAD = [
    "Your diet is already feeding your testosterone well. Protect what is working and fine-tune the rest below.",
    "A good base, with a few easy food swaps that would add up. Your weakest areas are below.",
    "Plenty of quick wins on your plate. Start with the areas below for the fastest return.",
    "Your food is a real opportunity. Small, steady swaps \u2014 starting below \u2014 compound fast."
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
      + ".mbq .btn.foods{background:#15324F;color:#fff;border:none}"
      + ".mbq .btn.foods:hover{background:#0E2540}"
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
      + ".mbq .foodlinks{font-size:12.5px;line-height:1.5;color:#6E7A88;margin-top:7px}"
      + ".mbq .foodlinks .fl-lab{color:#9aa3ad}"
      + ".mbq .foodlinks a{color:#12294A;text-decoration:underline;text-underline-offset:2px}"
      + ".mbq .foodlinks a:hover{color:#A9822F}"
      + ".mbq .reclink{display:inline-block;margin-top:6px;font-size:12.5px;color:#A9822F;text-decoration:underline}"
      + ".mbq .recnote{font-size:11px;color:#9aa3ad;margin:2px 0 16px;font-style:italic}"
      + ".mbq .foodscta{font-size:12.5px;line-height:1.5;color:#6E7A88;margin:0 0 14px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="720" loading="lazy" style="border:0;max-width:560px" title="Testosterone foods score"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">In about a minute, see how well your diet supports your testosterone \u2014 and the exact foods to eat more of (and less of) to move the needle. Nothing is stored or sent.</p>'
      + '<ul class="ticks">'
      + '<li>' + TICK + 'A clear food score out of 30</li>'
      + '<li>' + TICK + 'Your biggest food wins, ranked</li>'
      + '<li>' + TICK + 'Specific foods to eat \u2014 and to limit</li>'
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
  function foodHref(slug) { return SITE + "/foods/" + slug; }
  var TGT = EMBED ? ' target="_blank" rel="noopener"' : '';

  function foodLinks(q) {
    if (!q.foods || !q.foods.length) return "";
    var lab = q.limit ? "Limit: " : "Try: ";
    var parts = [];
    for (var i = 0; i < q.foods.length; i++) {
      parts.push('<a href="' + foodHref(q.foods[i][0]) + '"' + TGT + '>' + q.foods[i][1] + '</a>');
    }
    return '<div class="foodlinks"><span class="fl-lab">' + lab + '</span>' + parts.join(" \u00b7 ") + '</div>';
  }

  function result() {
    var r = computeScore(ans);
    var t = r.tier;
    var pos = Math.max(0, Math.min(100, (r.total / MAX) * 100));
    var hasRec = false, recsShown = 0, rows = "";
    if (r.weak.length === 0) {
      rows = '<div class="fixrow"><div class="fixtx">No obvious weak spots \u2014 your plate is genuinely dialled in. Keep leaning on whole foods, protein and healthy fats.</div></div>';
    } else {
      for (var w = 0; w < r.weak.length; w++) {
        var q = Q[r.weak[w]];
        var rec = "";
        if (q.rec && recsShown < 2) {
          hasRec = true; recsShown++;
          rec = '<a class="reclink" href="' + recHref(q.rec.slug) + '" target="_blank" rel="sponsored noopener">' + q.rec.label + ' \u2192</a>';
        }
        rows += '<div class="fixrow"><div class="fixnm">' + q.d + '</div><div class="fixtx">' + q.fix + '</div>'
          + foodLinks(q) + (rec ? '<div>' + rec + '</div>' : '') + '</div>';
      }
    }
    var recNote = hasRec ? '<p class="recnote">Supplement links are affiliate-supported, at no extra cost to you \u2014 food first, supplements only to fill a genuine gap.</p>' : '';

    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.total + '</b><span>/ ' + MAX + ' testosterone-diet score</span></div>'
      + '<span class="pill" style="background:' + TBG[t] + ';color:' + TFG[t] + '">' + TPILL[t] + '</span>'
      + '<p class="interp">' + TLEAD[t] + '</p>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>0</span><span>15</span><span>30</span></div>'
      + '<p class="rk-h">Your biggest food wins</p>'
      + rows
      + recNote
      + '<p class="foodscta">Each food above links to its page in our library \u2014 with the science, how much, and the best form. Or browse all 80 hormone foods.</p>'
      + '<a class="btn foods" href="' + FOODS_URL + '"' + TGT + '>See all 80 hormone foods \u2192</a>'
      + '<a class="btn" href="' + CTA_URL + '"' + TGT + ' style="margin-top:9px">Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + LOWT_URL + '"' + TGT + ' style="margin-top:9px">Low testosterone? Take the 2-min check</a>'
      + '<div class="dl-wrap"><button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button></div>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This is an educational guide, not a diagnosis. Diet is only part of the picture \u2014 testosterone is also affected by age, body composition, sleep, medication and medical conditions. If you have symptoms of low testosterone, see a doctor; supplements are not a substitute for medical care.</p>';
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
        var t = r.tier, M = 56, y = 70, w;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Testosterone Foods Score", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Testosterone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(18, 41, 74);
        doc.text(r.total + " / " + MAX + "   " + TPILL[t], M, y); y += 28;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(18, 41, 74);
        doc.text("Your biggest food wins", M, y); y += 18;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        if (r.weak.length === 0) {
          var none = doc.splitTextToSize("No obvious weak spots - your plate is genuinely dialled in.", 483);
          doc.text(none, M, y); y += none.length * 15 + 6;
        } else {
          for (w = 0; w < r.weak.length; w++) {
            var q = Q[r.weak[w]];
            doc.setFont("helvetica", "bold"); doc.text(q.d, M, y); y += 15;
            doc.setFont("helvetica", "normal");
            var fx = doc.splitTextToSize(q.fix, 483);
            doc.text(fx, M, y); y += fx.length * 14;
            var fl = (q.limit ? "Limit: " : "Try: ") + q.foods.map(function (f) { return f[1]; }).join(", ");
            var fls = doc.splitTextToSize(fl, 483);
            doc.setTextColor(110, 122, 136); doc.text(fls, M, y); y += fls.length * 14;
            doc.setTextColor(40, 48, 63); y += 6;
          }
        }
        y += 6;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Explore the full food library at " + FOODS_URL + ". Educational guide, not a diagnosis. If you have symptoms of low testosterone, see a doctor. Supplement links are affiliate-supported. Free personalised plan: " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("testosterone-foods-score.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("tf-quiz") || document.querySelector("[data-tf-quiz]");
    if (!host) {
      host = document.createElement("div");
      host.id = "tf-quiz";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Testosterone foods score</h3>'
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
