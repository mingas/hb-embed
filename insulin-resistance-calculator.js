/* The Hormone Blueprint - Insulin Resistance Calculator (HOMA-IR & TyG)
   Self-contained embeddable calculator for everyone. Mounts into #tool-mount
   (or #ir-calc / a div with data-ir-calc). Two modes:
     - HOMA-IR (Matthews et al. 1985): fasting glucose + fasting insulin
     - TyG index (Simental-Mendia 2008): fasting triglycerides + fasting glucose
   No backend, no tracking; values stay on device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var WHTR_URL = SITE + "/tools/waist-to-height-ratio";
  var EMBED_SRC = SITE + "/tools/insulin-resistance-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;
  var mode = "homa"; // "homa" | "tyg"

  /* ---- unit conversions ---- */
  var GLU_MGDL_PER_MMOL = 18.0;      // glucose: mmol/L -> mg/dL
  var TG_MGDL_PER_MMOL = 88.57;      // triglycerides: mmol/L -> mg/dL
  var INSULIN_PMOL_PER_UU = 6.0;     // insulin: pmol/L -> uU/mL (Knopp 2019, correct factor)

  /* ---- pure logic ---- */
  function computeHOMA(glucose_mmolL, insulin_uUmL) {
    return (glucose_mmolL * insulin_uUmL) / 22.5;
  }
  function computeTyG(tg_mgdl, glucose_mgdl) {
    return Math.log((tg_mgdl * glucose_mgdl) / 2);
  }

  function homaBand(v) {
    if (v < 1.0) return { label: "Optimal insulin sensitivity", c: "#3B6D11", t: "#EAF3DE",
      note: "below the reference value of 1.0 seen in insulin-sensitive adults." };
    if (v < 2.0) return { label: "Normal range", c: "#3B6D11", t: "#EAF3DE",
      note: "within the normal range most studies report for healthy adults." };
    if (v < 2.9) return { label: "Possible early insulin resistance", c: "#EF9F27", t: "#FBE9D2",
      note: "in the range often linked with early insulin resistance (a commonly used clinical cut-off is around 2.5). It can be worth a lifestyle review and a chat with your clinician." };
    return { label: "Likely significant insulin resistance", c: "#A32D2D", t: "#F7E0E0",
      note: "in the range commonly associated with significant insulin resistance and metabolic syndrome. Discussing this with a clinician is sensible." };
  }
  function tygBand(v) {
    if (v < 8.5) return { label: "Lower risk", c: "#3B6D11", t: "#EAF3DE",
      note: "below the range usually linked with insulin resistance." };
    if (v <= 8.8) return { label: "Borderline", c: "#EF9F27", t: "#FBE9D2",
      note: "in the borderline range — worth a lifestyle review and a chat with your clinician." };
    return { label: "Likely insulin resistance", c: "#A32D2D", t: "#F7E0E0",
      note: "in the range commonly associated with insulin resistance. Discussing this with a clinician is sensible." };
  }

  function r2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
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
      + ".mbq .lead{font-size:14px;line-height:1.6;color:#3a4654;margin:0 0 16px}"
      + ".mbq label{display:block;font-size:13px;font-weight:500;color:#12294A;margin:0 0 6px}"
      + ".mbq .fld{margin-bottom:15px}"
      + ".mbq .row{display:flex;gap:9px}"
      + ".mbq .row .grow{flex:1}"
      + ".mbq input[type=number],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq select{max-width:120px}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .tabs{display:flex;gap:8px;margin:0 0 18px}"
      + ".mbq .tab{flex:1;text-align:center;border:1.5px solid #E7E0CF;border-radius:11px;padding:10px 8px;font:500 13px Inter,sans-serif;color:#6E7A88;background:#fff;cursor:pointer;line-height:1.3}"
      + ".mbq .tab .ts{display:block;font-size:11px;font-weight:400;color:#9aa3ad;margin-top:2px}"
      + ".mbq .tab.on{border-color:#12294A;background:#12294A;color:#fff}"
      + ".mbq .tab.on .ts{color:#AEBDD0}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .res{display:flex;flex-direction:column;gap:10px;margin:2px 0 14px}"
      + ".mbq .rcard{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#FBF8F0}"
      + ".mbq .rcard .k{font-size:12px;color:#6E7A88;margin-bottom:3px}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:26px;color:#12294A;line-height:1.15}"
      + ".mbq .rcard .s{font-size:11.5px;color:#9aa3ad;margin-top:4px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="680" loading="lazy" style="border:0;max-width:560px" title="Insulin resistance calculator"&gt;&lt;/iframe&gt;'
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

  function tabs() {
    return '<div class="tabs">'
      + '<button class="tab' + (mode === "homa" ? " on" : "") + '" id="ir-tab-homa">HOMA-IR<span class="ts">needs fasting insulin</span></button>'
      + '<button class="tab' + (mode === "tyg" ? " on" : "") + '" id="ir-tab-tyg">TyG index<span class="ts">needs triglycerides</span></button>'
      + '</div>';
  }

  function gluField() {
    return '<div class="fld"><label for="ir-glu">Fasting glucose</label>'
      + '<div class="row"><div class="grow"><input type="number" id="ir-glu" step="any" placeholder="e.g. 5.2"></div>'
      + '<select id="ir-glu-u"><option value="mmolL">mmol/L</option><option value="mgdl">mg/dL</option></select></div></div>';
  }

  function form() {
    var fields;
    if (mode === "homa") {
      fields = gluField()
        + '<div class="fld"><label for="ir-ins">Fasting insulin</label>'
        + '<div class="row"><div class="grow"><input type="number" id="ir-ins" step="any" placeholder="e.g. 8"></div>'
        + '<select id="ir-ins-u"><option value="uuml">\u00b5U/mL</option><option value="pmolL">pmol/L</option></select></div>'
        + '<p class="hint">\u00b5U/mL is the same as mIU/L. Both values must be from the same fasting blood draw.</p></div>';
    } else {
      fields = gluField()
        + '<div class="fld"><label for="ir-tg">Fasting triglycerides</label>'
        + '<div class="row"><div class="grow"><input type="number" id="ir-tg" step="any" placeholder="e.g. 1.3"></div>'
        + '<select id="ir-tg-u"><option value="mmolL">mmol/L</option><option value="mgdl">mg/dL</option></select></div>'
        + '<p class="hint">On most UK lipid panels even when fasting insulin isn\u2019t tested.</p></div>';
    }
    body.innerHTML = ""
      + '<p class="lead">Two ways to estimate insulin resistance from a fasting blood test. <b>HOMA-IR</b> needs fasting insulin; <b>TyG</b> uses triglycerides and glucose, which most lab panels already include. Nothing is stored or sent.</p>'
      + tabs()
      + fields
      + '<p class="err" id="ir-err"></p>'
      + '<button class="btn" id="ir-go">Calculate</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("ir-tab-homa").onclick = function () { if (mode !== "homa") { mode = "homa"; form(); } };
    document.getElementById("ir-tab-tyg").onclick = function () { if (mode !== "tyg") { mode = "tyg"; form(); } };
    document.getElementById("ir-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("ir-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var glu = parseFloat(document.getElementById("ir-glu").value);
    var gluU = document.getElementById("ir-glu-u").value;
    if (isNaN(glu) || glu <= 0) return fail("Please enter your fasting glucose.");
    var glu_mmolL = gluU === "mgdl" ? glu / GLU_MGDL_PER_MMOL : glu;
    if (glu_mmolL > 60) return fail("That glucose looks too high \u2014 please check the value and unit.");

    if (mode === "homa") {
      var ins = parseFloat(document.getElementById("ir-ins").value);
      var insU = document.getElementById("ir-ins-u").value;
      if (isNaN(ins) || ins <= 0) return fail("Please enter your fasting insulin.");
      var ins_uUmL = insU === "pmolL" ? ins / INSULIN_PMOL_PER_UU : ins;
      if (ins_uUmL > 1000) return fail("That insulin looks too high \u2014 please check the value and unit.");
      err.style.display = "none";
      result({ kind: "homa", value: computeHOMA(glu_mmolL, ins_uUmL), glu_mmolL: glu_mmolL, ins_uUmL: ins_uUmL });
    } else {
      var tg = parseFloat(document.getElementById("ir-tg").value);
      var tgU = document.getElementById("ir-tg-u").value;
      if (isNaN(tg) || tg <= 0) return fail("Please enter your fasting triglycerides.");
      var tg_mgdl = tgU === "mmolL" ? tg * TG_MGDL_PER_MMOL : tg;
      var glu_mgdl = glu_mmolL * GLU_MGDL_PER_MMOL;
      if (tg_mgdl > 5000) return fail("That triglyceride value looks too high \u2014 please check the value and unit.");
      err.style.display = "none";
      result({ kind: "tyg", value: computeTyG(tg_mgdl, glu_mgdl), tg_mgdl: tg_mgdl, glu_mgdl: glu_mgdl });
    }
  }

  function result(r) {
    var isHoma = r.kind === "homa";
    var b = isHoma ? homaBand(r.value) : tygBand(r.value);
    var title = isHoma ? "HOMA-IR" : "TyG index";
    var sub = isHoma
      ? "Glucose " + r1d(r.glu_mmolL) + " mmol/L \u00b7 insulin " + r1d(r.ins_uUmL) + " \u00b5U/mL"
      : "Triglycerides " + Math.round(r.tg_mgdl) + " mg/dL \u00b7 glucose " + Math.round(r.glu_mgdl) + " mg/dL";
    var ref = isHoma
      ? "A reference value of 1.0 represents typical insulin sensitivity. Cut-offs are not universally standardised \u2014 they vary by laboratory, assay, age, sex and ethnicity."
      : "Cut-offs are not universally standardised and most are derived from non-UK populations \u2014 read this as a screening guide, not a diagnostic limit.";
    body.innerHTML = ""
      + '<div class="res">'
      + '<div class="rcard"><div class="k">' + title + '</div>'
      + '<div class="v">' + r2(r.value) + '<span class="pill" style="background:' + b.t + ';color:' + b.c + '">' + b.label + '</span></div>'
      + '<div class="s">' + sub + '</div></div>'
      + '</div>'
      + '<p class="interp">Your ' + title + ' is <b>' + r2(r.value) + '</b> \u2014 ' + b.note + ' ' + ref + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + WHTR_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Also check your Waist-to-Height Ratio \u2192</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">HOMA-IR uses the equation from Matthews et al. (1985); the TyG index follows Simental-Mendia et al. (2008). Both are estimates from a single fasting blood test, not a diagnosis. They are not reliable if you take insulin, have advanced type 2 diabetes, or are pregnant, and insulin assays are not standardised between laboratories. Discuss your results with a qualified clinician.</p>';
    document.getElementById("mbq-again").onclick = function () { form(); };
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r, b); };
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

  function downloadPdf(r, b) {
    var btn = document.getElementById("mbq-pdf");
    if (btn) btn.textContent = "Preparing\u2026";
    loadJsPDF(function () {
      try {
        var isHoma = r.kind === "homa";
        var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
        var M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Insulin Resistance Result", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        if (isHoma) {
          doc.text("Method:  HOMA-IR (Matthews et al. 1985)", M, y); y += 20;
          doc.text("HOMA-IR:  " + r2(r.value) + "  (" + b.label + ")", M, y); y += 20;
          doc.text("Inputs:  glucose " + r1d(r.glu_mmolL) + " mmol/L, insulin " + r1d(r.ins_uUmL) + " \u00b5U/mL", M, y); y += 30;
        } else {
          doc.text("Method:  TyG index (Simental-Mendia et al. 2008)", M, y); y += 20;
          doc.text("TyG index:  " + r2(r.value) + "  (" + b.label + ")", M, y); y += 20;
          doc.text("Inputs:  triglycerides " + Math.round(r.tg_mgdl) + " mg/dL, glucose " + Math.round(r.glu_mgdl) + " mg/dL", M, y); y += 30;
        }
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("This is an estimate from a single fasting blood test, not a diagnosis. Cut-offs are not universally standardised and vary by laboratory, assay, age, sex and ethnicity. Not reliable if you take insulin, have advanced type 2 diabetes, or are pregnant. Discuss your results with a qualified clinician. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("insulin-resistance-result.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("ir-calc") || document.querySelector("[data-ir-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "ir-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Insulin resistance calculator</h3>'
      + '<div class="sub">HOMA-IR &amp; TyG from your blood results</div></div>'
      + '<div class="bd" id="mbq-body"></div>'
      + '<div class="ft"><span class="pw">Powered by <b>The Hormone Blueprint</b></span>'
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
