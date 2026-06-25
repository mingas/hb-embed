/* The Hormone Blueprint - TDEE & Daily Calorie Calculator
   Self-contained embeddable calculator for everyone. Mounts into #tool-mount
   (or #tdee-calc / a div with data-tdee-calc). Estimates BMR (Mifflin-St Jeor,
   1990), maintenance calories (TDEE) from an activity multiplier, and a daily
   calorie target for the chosen goal (maintain / lose fat / build muscle),
   plus a protein range (1.6-2.2 g/kg). Safe calorie floors are enforced
   (1200 kcal women, 1500 kcal men). No backend, no tracking; values stay on
   the visitor's device.
   v1.0.0 */
(function () {
  "use strict";

  var SITE = "https://testosteroneblueprintguide.com";
  var CTA_URL = SITE + "/start-here";
  var PROTEIN_URL = SITE + "/tools/protein-intake-calculator";
  var EMBED_SRC = SITE + "/tools/tdee-calculator?embed=1";

  var EMBED = false;
  try {
    EMBED = /[?&]embed=1\b/.test(window.location.search) || window.self !== window.top;
  } catch (e) { EMBED = true; }

  var root, body;

  var LB_TO_KG = 0.45359237;
  var IN_TO_CM = 2.54;

  var ACT = {
    sed:  { f: 1.2,   label: "Sedentary", note: "Desk job, little or no exercise" },
    light:{ f: 1.375, label: "Lightly active", note: "Light exercise 1\u20133 days/week" },
    mod:  { f: 1.55,  label: "Moderately active", note: "Moderate exercise 3\u20135 days/week" },
    very: { f: 1.725, label: "Very active", note: "Hard exercise 6\u20137 days/week" },
    extra:{ f: 1.9,   label: "Extra active", note: "Hard exercise + physical job, or twice-daily training" }
  };

  /* ---- pure logic (testable) ---- */
  /* Mifflin-St Jeor (1990), metric. sex: "female"|"male" */
  function bmrMifflin(sex, age, kg, cm) {
    return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
  }
  function r25(n) { return Math.round(n / 25) * 25; }

  function compute(sex, age, kg, cm, actKey, goal) {
    var bmr = bmrMifflin(sex, age, kg, cm);
    var tdee = bmr * ACT[actKey].f;
    var floor = sex === "male" ? 1500 : 1200;
    var maintain = r25(tdee);
    var target, floored = false, deltaPct = 0;
    if (goal === "lose") {
      target = tdee * 0.80;            // ~20% deficit
      if (target < floor) { target = floor; floored = true; }
      target = r25(target);
      deltaPct = -20;
    } else if (goal === "gain") {
      target = r25(tdee * 1.12);       // ~12% surplus
      deltaPct = 12;
    } else {
      target = maintain;
      deltaPct = 0;
    }
    return {
      bmr: Math.round(bmr),
      tdee: maintain,
      target: target,
      goal: goal,
      floored: floored,
      floor: floor,
      proteinLo: Math.round(1.6 * kg),
      proteinHi: Math.round(2.2 * kg),
      deltaPct: deltaPct
    };
  }

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
      + ".mbq input[type=number],.mbq input[type=date],.mbq select{width:100%;border:1.5px solid #E7E0CF;border-radius:11px;padding:12px 14px;font:400 14px Inter,sans-serif;color:#23303F;background:#fff}"
      + ".mbq select.u{max-width:120px}"
      + ".mbq input:focus,.mbq select:focus{outline:none;border-color:#12294A}"
      + ".mbq .hint{font-size:11.5px;color:#9aa3ad;margin:5px 0 0}"
      + ".mbq .err{font-size:12.5px;color:#A32D2D;margin:0 0 14px;display:none}"
      + ".mbq .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#C39A4A;color:#fff;border:none;border-radius:11px;padding:13px 20px;font:500 14.5px Inter,sans-serif;cursor:pointer;width:100%;text-decoration:none}"
      + ".mbq .btn:hover{background:#A9822F}"
      + ".mbq .btn.sec{background:#fff;color:#12294A;border:1.5px solid #E7E0CF}"
      + ".mbq .btn.sec:hover{background:#FBF8F0}"
      + ".mbq .res{display:flex;flex-direction:column;gap:10px;margin:2px 0 14px}"
      + ".mbq .rcard{border:1px solid #EFEADB;border-radius:12px;padding:14px 16px;background:#FBF8F0}"
      + ".mbq .rcard.lead-card{background:#12294A;border-color:#12294A}"
      + ".mbq .rcard.lead-card .k{color:#AEBDD0}"
      + ".mbq .rcard.lead-card .v{color:#fff}"
      + ".mbq .rcard.lead-card .s{color:#AEBDD0}"
      + ".mbq .rcard .k{font-size:12px;color:#6E7A88;margin-bottom:3px}"
      + ".mbq .rcard .v{font-family:Fraunces,Georgia,serif;font-size:24px;color:#12294A;line-height:1.15}"
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
      + '&lt;iframe src="' + EMBED_SRC + '" width="100%" height="700" loading="lazy" style="border:0;max-width:560px" title="TDEE and daily calorie calculator"&gt;&lt;/iframe&gt;'
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

  function heightRow(unit) {
    if (unit === "ftin") {
      return '<div class="row"><div class="grow"><input type="number" id="tdee-ft" step="any" placeholder="ft"></div>'
        + '<div class="grow"><input type="number" id="tdee-in" step="any" placeholder="in"></div>'
        + '<select class="u" id="tdee-h-u"><option value="cm">cm</option><option value="ftin" selected>ft/in</option></select></div>';
    }
    return '<div class="row"><div class="grow"><input type="number" id="tdee-cm" step="any" placeholder="e.g. 175"></div>'
      + '<select class="u" id="tdee-h-u"><option value="cm">cm</option><option value="ftin">ft/in</option></select></div>';
  }

  function wireHeightUnit() {
    var sel = document.getElementById("tdee-h-u");
    if (!sel) return;
    sel.onchange = function () {
      var wrap = document.getElementById("tdee-h-wrap");
      wrap.innerHTML = heightRow(this.value);
      wireHeightUnit();
    };
  }

  function form() {
    body.innerHTML = ""
      + '<p class="lead">Work out how many calories you burn a day (your TDEE) and a daily target for your goal \u2014 using the Mifflin-St Jeor equation, the standard dietitians use. Nothing is stored or sent.</p>'
      + '<div class="fld"><label for="tdee-sex">Sex</label>'
      + '<select id="tdee-sex"><option value="female">Female</option><option value="male">Male</option></select>'
      + '<p class="hint">Used for the calorie equation (biological sex).</p></div>'
      + '<div class="fld"><label for="tdee-age">Age</label>'
      + '<input type="number" id="tdee-age" step="1" placeholder="e.g. 38"></div>'
      + '<div class="fld"><label for="tdee-wt">Weight</label>'
      + '<div class="row"><div class="grow"><input type="number" id="tdee-wt" step="any" placeholder="e.g. 75"></div>'
      + '<select class="u" id="tdee-wt-u"><option value="kg">kg</option><option value="lb">lb</option></select></div></div>'
      + '<div class="fld"><label>Height</label><div id="tdee-h-wrap">' + heightRow("cm") + '</div></div>'
      + '<div class="fld"><label for="tdee-act">Activity level</label>'
      + '<select id="tdee-act"><option value="sed">Sedentary \u2014 little or no exercise</option>'
      + '<option value="light">Lightly active \u2014 1\u20133 days/week</option>'
      + '<option value="mod" selected>Moderately active \u2014 3\u20135 days/week</option>'
      + '<option value="very">Very active \u2014 6\u20137 days/week</option>'
      + '<option value="extra">Extra active \u2014 physical job or twice-daily</option></select>'
      + '<p class="hint">Most people overestimate. When unsure, pick the lower option.</p></div>'
      + '<div class="fld"><label for="tdee-goal">Your goal</label>'
      + '<select id="tdee-goal"><option value="maintain" selected>Maintain weight</option>'
      + '<option value="lose">Lose fat</option><option value="gain">Build muscle</option></select></div>'
      + '<p class="err" id="tdee-err"></p>'
      + '<button class="btn" id="tdee-go">Calculate</button>'
      + '<p class="priv">Everything is worked out on your device.</p>'
      + embedBox();
    document.getElementById("tdee-go").onclick = calc;
    wireHeightUnit();
    wireEmbed();
  }

  function calc() {
    var err = document.getElementById("tdee-err");
    function fail(m) { err.textContent = m; err.style.display = "block"; }
    var sex = document.getElementById("tdee-sex").value;
    var age = parseFloat(document.getElementById("tdee-age").value);
    var wt = parseFloat(document.getElementById("tdee-wt").value);
    var wtU = document.getElementById("tdee-wt-u").value;
    var hU = document.getElementById("tdee-h-u").value;
    var act = document.getElementById("tdee-act").value;
    var goal = document.getElementById("tdee-goal").value;

    if (isNaN(age) || age < 14 || age > 100) return fail("Please enter your age (14\u2013100).");
    if (isNaN(wt) || wt <= 0) return fail("Please enter your weight.");
    var kg = wtU === "lb" ? wt * LB_TO_KG : wt;
    if (kg < 30 || kg > 350) return fail("That weight looks off \u2014 please check the value and unit.");

    var cm;
    if (hU === "ftin") {
      var ft = parseFloat(document.getElementById("tdee-ft").value);
      var inch = parseFloat(document.getElementById("tdee-in").value);
      if (isNaN(ft) && isNaN(inch)) return fail("Please enter your height.");
      if (isNaN(ft)) ft = 0;
      if (isNaN(inch)) inch = 0;
      cm = (ft * 12 + inch) * IN_TO_CM;
    } else {
      cm = parseFloat(document.getElementById("tdee-cm").value);
    }
    if (isNaN(cm) || cm < 120 || cm > 230) return fail("That height looks off \u2014 please check the value and unit.");

    err.style.display = "none";
    result(compute(sex, age, kg, cm, act, goal));
  }

  function goalWord(g) { return g === "lose" ? "lose fat" : g === "gain" ? "build muscle" : "maintain weight"; }

  function result(r) {
    var goalLabel = r.goal === "lose" ? "Daily target to lose fat" : r.goal === "gain" ? "Daily target to build muscle" : "Daily target to maintain";
    var deltaTxt = r.goal === "maintain" ? "Same as your maintenance"
      : (r.deltaPct < 0 ? "About a " + Math.abs(r.deltaPct) + "% deficit" : "About a " + r.deltaPct + "% surplus");
    body.innerHTML = ""
      + '<div class="res">'
      + '<div class="rcard lead-card"><div class="k">' + goalLabel + '</div>'
      + '<div class="v">' + r.target + ' kcal/day</div>'
      + '<div class="s">' + deltaTxt + (r.floored ? " \u00b7 capped at a safe minimum (" + r.floor + " kcal)" : "") + '</div></div>'
      + '<div class="rcard"><div class="k">Maintenance (TDEE)</div>'
      + '<div class="v">' + r.tdee + ' kcal/day</div>'
      + '<div class="s">What you burn on an average day</div></div>'
      + '<div class="rcard"><div class="k">Resting burn (BMR)</div>'
      + '<div class="v">' + r.bmr + ' kcal/day</div>'
      + '<div class="s">Calories at complete rest</div></div>'
      + '<div class="rcard"><div class="k">Protein target</div>'
      + '<div class="v">' + r.proteinLo + '\u2013' + r.proteinHi + ' g/day</div>'
      + '<div class="s">1.6\u20132.2 g per kg \u2014 supports muscle on any goal</div></div>'
      + '</div>'
      + '<p class="interp">' + interp(r) + '</p>'
      + '<a class="btn" href="' + CTA_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + '>Get your free personalised plan</a>'
      + '<a class="btn sec" href="' + PROTEIN_URL + '"' + (EMBED ? ' target="_blank" rel="noopener"' : '') + ' style="margin-top:9px">Fine-tune your protein \u2192</a>'
      + '<button class="btn sec" id="mbq-pdf" style="margin-top:9px">Download your result (PDF)</button>'
      + '<button class="btn sec" id="mbq-again" style="margin-top:9px">Start over</button>'
      + embedBox()
      + '<p class="disc">Estimated with the Mifflin-St Jeor equation (1990), the dietitian-recommended standard. Individual burn varies by about \u00b110%, so use these as a starting point and adjust to your real 2-week weight trend. Calorie floors (1,500 kcal men, 1,200 kcal women) are applied for safety \u2014 going lower needs medical supervision. This is general guidance, not medical or dietary advice.</p>';
    document.getElementById("mbq-again").onclick = form;
    document.getElementById("mbq-pdf").onclick = function () { downloadPdf(r); };
    wireEmbed();
  }

  function interp(r) {
    if (r.goal === "lose") {
      return "To lose fat steadily, aim for about <b>" + r.target + " kcal a day</b> \u2014 a moderate deficit that targets roughly 0.5 kg (1 lb) a week."
        + (r.floored ? " We\u2019ve held your target at a safe minimum rather than cutting lower." : "")
        + " Keep protein high (" + r.proteinLo + "\u2013" + r.proteinHi + " g) to protect muscle while you lose.";
    }
    if (r.goal === "gain") {
      return "To build muscle, aim for about <b>" + r.target + " kcal a day</b> \u2014 a modest surplus over your " + r.tdee
        + " kcal maintenance. Pair it with resistance training and " + r.proteinLo + "\u2013" + r.proteinHi + " g of protein to favour muscle over fat.";
    }
    return "To hold your weight steady, aim for about <b>" + r.tdee + " kcal a day</b>. Eat consistently, keep protein at "
      + r.proteinLo + "\u2013" + r.proteinHi + " g, and adjust if your weight drifts over a few weeks.";
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
        doc.text("Your Daily Calorie Result", M, y); y += 24;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        doc.text("The Hormone Blueprint  \u00b7  " + new Date().toLocaleDateString("en-GB"), M, y); y += 30;
        doc.setDrawColor(231, 224, 207); doc.line(M, y, 539, y); y += 26;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(40, 48, 63);
        doc.text("Goal:  " + goalWord(r.goal), M, y); y += 20;
        doc.text("Daily target:  " + r.target + " kcal", M, y); y += 20;
        doc.text("Maintenance (TDEE):  " + r.tdee + " kcal", M, y); y += 20;
        doc.text("Resting burn (BMR):  " + r.bmr + " kcal", M, y); y += 20;
        doc.text("Protein:  " + r.proteinLo + "\u2013" + r.proteinHi + " g/day", M, y); y += 30;
        doc.setFontSize(10); doc.setTextColor(110, 122, 136);
        var note = doc.splitTextToSize("Estimated with the Mifflin-St Jeor equation (1990). Individual burn varies about \u00b110% \u2014 adjust to your real 2-week weight trend. Not medical or dietary advice. Get your free personalised plan at " + CTA_URL, 483);
        doc.text(note, M, y);
        doc.save("daily-calorie-result.pdf");
      } catch (e) { alert("Sorry, the PDF could not be generated just now."); }
      if (btn) btn.textContent = "Download your result (PDF)";
    });
  }

  function build() {
    injectStyles();
    var host = document.getElementById("tool-mount") || document.getElementById("tdee-calc") || document.querySelector("[data-tdee-calc]");
    if (!host) {
      host = document.createElement("div");
      host.id = "tdee-calc";
      (document.currentScript ? document.currentScript.parentNode : document.body).appendChild(host);
    }
    host.innerHTML = "";
    root = document.createElement("div");
    root.className = "mbq";
    root.innerHTML = ""
      + '<div class="hd"><div class="ey">Free \u00b7 no email \u00b7 private</div>'
      + '<h3>TDEE &amp; calorie calculator</h3>'
      + '<div class="sub">Your daily calories for fat loss, maintenance or muscle</div></div>'
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
