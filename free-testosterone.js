/* The Testosterone Blueprint - Free Testosterone Calculator
   Self-contained embeddable calculator for men. Mounts into #tool-mount
   (or #ft-calc / a div with data-ft-calc). Estimates free and bioavailable
   testosterone from total testosterone, SHBG and albumin using the
   Vermeulen (1999) equation. No backend, no tracking; values stay on device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var EMBED_SRC = SITE + "/tools/free-testosterone-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  /* ng/dL -> nmol/L factor for testosterone */
  var NGDL_TO_NMOLL = 0.03467;

  /* ---- pure logic (Vermeulen 1999), all internal units mol/L ---- */
  function computeFreeT(totalT_nmolL, shbg_nmolL, albumin_gL) {
    var Ka = 3.6e4;   // albumin association constant (L/mol)
    var Ks = 1.0e9;   // SHBG association constant (L/mol)
    var T = totalT_nmolL * 1e-9;
    var S = shbg_nmolL * 1e-9;
    var A = albumin_gL / 66500;      // albumin MW ~66500 g/mol
    var N = 1 + Ka * A;
    var a = Ks * N;
    var b = N + Ks * (S - T);
    var c = -T;
    var FT = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // mol/L
    var BioT = N * FT;
    return {
      freeNmolL: FT * 1e9,
      freePmolL: FT * 1e12,
      freeNgDl: (FT * 1e9) / NGDL_TO_NMOLL,
      bioNmolL: BioT * 1e9,
      bioNgDl: (BioT * 1e9) / NGDL_TO_NMOLL,
      freePct: (FT / T) * 100
    };
  }

  function band(pct) {
    if (pct < 1.5) return { i: 0, label: "Lower than typical" };
    if (pct <= 3) return { i: 1, label: "Typical range" };
    return { i: 2, label: "Higher than typical" };
  }
  function bandColour(i) { return ["#EF9F27", "#3B6D11", "#BA7517"][i]; }
  function bandTint(i) { return ["#FBE9D2", "#EAF3DE", "#FBEFD9"][i]; }

  function r1(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function r0(n) { return Math.round(n); }
  function r1d(n) { return (Math.round(n * 10) / 10).toFixed(1); }

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
      + ".mbq select{max-width:120px}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .res{display:flex;flex-direction:column;gap:10px;margin:2px 0 14px}"
      + ".mbq .rcard{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#FBF8F0}"
      + ".mbq .rcard .k{font-size:12px;color:#6E7A88;margin-bottom:3px}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:21px;color:#12294A;line-height:1.15}"
      + ".mbq .rcard .s{font-size:11.5px;color:#9aa3ad;margin-top:3px}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin-left:8px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="640" loading="lazy" style="border:0;max-width:560px" title="Free testosterone calculator"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Your total testosterone is only half the story. Enter your blood results to estimate your <b>free</b> and <b>bioavailable</b> testosterone \u2014 the part your body can actually use. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="ft-tt">Total testosterone</label>'
      + '<div class="row"><div class="grow"><input type="number" id="ft-tt" step="any" placeholder="e.g. 18"></div>'
      + '<select id="ft-tt-u"><option value="nmolL">nmol/L</option><option value="ngdl">ng/dL</option></select></div></div>'
      + '<div class="fld"><label for="ft-shbg">SHBG</label>'
      + '<input type="number" id="ft-shbg" step="any" placeholder="e.g. 30"><p class="hint">In nmol/L (the usual unit).</p></div>'
      + '<div class="fld"><label for="ft-alb">Albumin</label>'
      + '<div class="row"><div class="grow"><input type="number" id="ft-alb" step="any" value="43"></div>'
      + '<select id="ft-alb-u"><option value="gL">g/L</option><option value="gdl">g/dL</option></select></div>'
      + '<p class="hint">If unknown, leave the default (43 g/L).</p></div>'
      + '<p class="err" id="ft-err"></p>'
      + '<button class="btn" id="ft-go">Calculate</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("ft-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("ft-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var tt = parseFloat(document.getElementById("ft-tt").value);
    var ttU = document.getElementById("ft-tt-u").value;
    var shbg = parseFloat(document.getElementById("ft-shbg").value);
    var alb = parseFloat(document.getElementById("ft-alb").value);
    var albU = document.getElementById("ft-alb-u").value;
    if (isNaN(tt) || tt <= 0) return fail("Please enter your total testosterone.");
    if (isNaN(shbg) || shbg <= 0) return fail("Please enter your SHBG (in nmol/L).");
    if (isNaN(alb) || alb <= 0) return fail("Please enter a valid albumin value.");
    var tt_nmolL = ttU === "ngdl" ? tt * NGDL_TO_NMOLL : tt;
    var alb_gL = albU === "gdl" ? alb * 10 : alb;
    if (tt_nmolL > 200) return fail("That total testosterone looks too high \u2014 please check the value and unit.");
    if (shbg > 400) return fail("That SHBG looks too high \u2014 please check the value.");
    if (alb_gL < 10 || alb_gL > 80) return fail("Albumin should be roughly 30\u201355 g/L (3\u20135.5 g/dL).");
    err.style.display = "none";
    result(computeFreeT(tt_nmolL, shbg, alb_gL));
  }

  function result(r) {
    var b = band(r.freePct);
    body.innerHTML = ""
      + '<div class="res">'
      + '<div class="rcard"><div class="k">Free testosterone</div>'
      + '<div class="v">' + r1(r.freeNmolL) + ' nmol/L<span class="pill" style="background:' + bandTint(b.i) + ';color:' + bandColour(b.i) + '">' + b.label + '</span></div>'
      + '<div class="s">= ' + r0(r.freePmolL) + ' pmol/L \u00b7 ' + r1d(r.freeNgDl) + ' ng/dL \u00b7 ' + r1d(r.freePct) + '% of total</div></div>'
      + '<div class="rcard"><div class="k">Bioavailable testosterone</div>'
      + '<div class="v">' + r1d(r.bioNmolL) + ' nmol/L</div>'
      + '<div class="s">= ' + r0(r.bioNgDl) + ' ng/dL (free + albumin-bound)</div></div>'
      + '</div>'
      + '<p class="interp">Your free testosterone is about <b>' + r1d(r.freePct) + '%</b> of your total \u2014 ' + (b.i === 1 ? "within the typical 1.5\u20133% range for adult men." : b.i === 0 ? "a little below the typical 1.5\u20133% range. High SHBG can cause this even when total testosterone looks normal." : "a little above the typical 1.5\u20133% range, often seen with low SHBG.") + ' Reference ranges vary between labs \u2014 read your result with your own lab\u2019s range and a clinician.</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">This calculator uses the Vermeulen (1999) equation, widely used by endocrinologists. Results are estimates and depend on your SHBG and albumin values; they are not a diagnosis. Discuss your results with a qualified clinician.</p>';
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
        var b = band(r.freePct);
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Free Testosterone Result", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Testosterone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        doc.text("Free testosterone:  " + r1(r.freeNmolL) + " nmol/L  (" + r0(r.freePmolL) + " pmol/L, " + r1d(r.freeNgDl) + " ng/dL)", M, y); y += 20;
        doc.text("Free fraction:  " + r1d(r.freePct) + "% of total  (" + b.label + ")", M, y); y += 20;
        doc.text("Bioavailable testosterone:  " + r1d(r.bioNmolL) + " nmol/L  (" + r0(r.bioNgDl) + " ng/dL)", M, y); y += 30;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Estimated with the Vermeulen (1999) equation. Reference ranges vary between laboratories \u2014 read your result with your own lab\u2019s range and a clinician. Not a diagnosis. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("free-testosterone-result.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("ft-calc") || document.querySelector("[data-ft-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "ft-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Free testosterone calculator</h3>'
      + '<div class="sub">Free &amp; bioavailable T from your blood results</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Testosterone Blueprint</b></span>'
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
