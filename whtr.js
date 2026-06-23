/* The Hormone Blueprint - Waist-to-Height Ratio
   Self-contained embeddable calculator. Mounts into #tool-mount (or #wh-calc
   / a div with data-wh-calc). Waist-to-height ratio is a simple, validated
   marker of visceral fat and cardiometabolic risk (keep it under 0.5).
   No backend, no tracking; values stay on the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var EMBED_SRC = SITE + "/tools/waist-to-height-ratio?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  var BANDS = ["Low", "Healthy", "Increased", "High"];
  function bandColour(i) { return ["#7E8CA0", "#3B6D11", "#EF9F27", "#A32D2D"][i]; }
  function bandTint(i) { return ["#EDEFF3", "#EAF3DE", "#FBE9D2", "#F7DEDE"][i]; }
  var INTERP = [
    "Your waist is low relative to your height. If this is unintentional, or you feel unwell, it is worth mentioning to your doctor.",
    "Your waist-to-height ratio is in the healthy range. Keeping your waist under half your height supports insulin, hormone balance and heart health.",
    "Your ratio suggests increased visceral (belly) fat. Visceral fat is hormonally active \u2014 it can lower testosterone in men, raise oestrogen, and worsen insulin resistance. Small, steady changes help.",
    "Your ratio suggests a high level of visceral fat, strongly linked to insulin resistance and hormone disruption. The good news: it is very responsive to change, and worth acting on."
  ];

  /* ---- pure logic ---- */
  function computeWHtR(waist, height) {
    var ratio = waist / height;
    var b = ratio < 0.4 ? 0 : ratio < 0.5 ? 1 : ratio < 0.6 ? 2 : 3;
    return { ratio: ratio, band: b };
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
      + ".mbq .lead{font-size:14px;line-height:1.6;color:#3a4654;margin:0 0 18px}"
      + ".mbq label{display:block;font-size:13px;font-weight:500;color:#12294A;margin:0 0 6px}"
      + ".mbq .fld{margin-bottom:15px}"
      + ".mbq .row{display:flex;gap:9px}"
      + ".mbq .row .grow{flex:1}"
      + ".mbq input[type=number],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq select{max-width:104px}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .ratio{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}"
      + ".mbq .ratio b{font-family:Fraunces,Georgia,serif;font-weight:500;font-size:44px;color:#12294A;line-height:1}"
      + ".mbq .ratio span{font-size:13px;color:#6E7A88}"
      + ".mbq .pill{display:inline-block;font-size:12px;font-weight:500;padding:4px 11px;border-radius:20px;margin:6px 0 16px}"
      + ".mbq .scale{position:relative;height:10px;border-radius:6px;margin:6px 0 6px;background:linear-gradient(90deg,#EDEFF3 0%,#C0DD97 18%,#C0DD97 50%,#FAC775 50%,#FAC775 75%,#F0A0A0 75%,#F0A0A0 100%)}"
      + ".mbq .scale .mk{position:absolute;top:-4px;width:3px;height:18px;background:#12294A;border-radius:2px;transform:translateX(-50%)}"
      + ".mbq .scl-lab{display:flex;justify-content:space-between;font-size:10.5px;color:#9aa3ad;margin-bottom:18px}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="560" loading="lazy" style="border:0;max-width:560px" title="Waist-to-height ratio calculator"&gt;&lt;/iframe&gt;'
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
      + '<p class="lead">Your waist-to-height ratio is one of the simplest, best-validated checks of visceral (belly) fat \u2014 the kind that affects your hormones. The rule of thumb: keep your waist under half your height. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="wh-unit">Units</label>'
      + '<select id="wh-unit" style="max-width:160px"><option value="cm">Centimetres (cm)</option><option value="in">Inches (in)</option></select></div>'
      + '<div class="fld"><label for="wh-waist">Waist circumference</label>'
      + '<input type="number" id="wh-waist" step="any" placeholder="measured at the belly button"></div>'
      + '<div class="fld"><label for="wh-height">Height</label>'
      + '<input type="number" id="wh-height" step="any" placeholder="your height"></div>'
      + '<p class="err" id="wh-err"></p>'
      + '<button class="btn" id="wh-go">Calculate</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("wh-go").onclick = calc;
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("wh-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var unit = document.getElementById("wh-unit").value;
    var waist = parseFloat(document.getElementById("wh-waist").value);
    var height = parseFloat(document.getElementById("wh-height").value);
    if (isNaN(waist) || waist <= 0) return fail("Please enter your waist measurement.");
    if (isNaN(height) || height <= 0) return fail("Please enter your height.");
    // plausibility (convert to cm internally just for bounds)
    var wcm = unit === "in" ? waist * 2.54 : waist;
    var hcm = unit === "in" ? height * 2.54 : height;
    if (hcm < 120 || hcm > 230) return fail("Please check your height \u2014 it looks out of range.");
    if (wcm < 40 || wcm > 200) return fail("Please check your waist measurement \u2014 it looks out of range.");
    if (waist >= height) return fail("Your waist looks larger than your height \u2014 please check the values and units.");
    err.style.display = "none";
    result(computeWHtR(waist, height));
  }

  function result(r) {
    var i = r.band;
    var pos = Math.max(0, Math.min(100, ((r.ratio - 0.3) / 0.4) * 100)); // scale 0.3..0.7
    body.innerHTML = ""
      + '<div class="ratio"><b>' + r.ratio.toFixed(2) + '</b><span>waist \u00f7 height</span></div>'
      + '<span class="pill" style="background:' + bandTint(i) + ';color:' + bandColour(i) + '">' + BANDS[i] + '</span>'
      + '<div class="scale"><div class="mk" style="left:' + pos.toFixed(1) + '%"></div></div>'
      + '<div class="scl-lab"><span>0.3</span><span>0.5</span><span>0.6</span><span>0.7+</span></div>'
      + '<p class="interp">' + INTERP[i] + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">Waist-to-height ratio is a screening guide, not a diagnosis, and does not distinguish muscle from fat in every case. Measure your waist at the belly button, unforced. Discuss any concerns with a qualified clinician.</p>';
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
        var i = r.band, M = 56, y = 70;
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(18, 41, 74);
        doc.text("Your Waist-to-Height Ratio", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(18, 41, 74);
        doc.text(r.ratio.toFixed(2) + "   " + BANDS[i], M, y); y += 26;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40, 48, 63);
        var t = doc.splitTextToSize(INTERP[i], 483);
        doc.text(t, M, y); y += t.length * 16 + 14;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Healthy is under 0.5; 0.5-0.6 increased; 0.6+ high. A screening guide, not a diagnosis. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("waist-to-height-ratio.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("wh-calc") || document.querySelector("[data-wh-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "wh-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>Waist-to-height ratio</h3>'
      + '<div class="sub">A simple, validated check of visceral fat</div></div>'
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
