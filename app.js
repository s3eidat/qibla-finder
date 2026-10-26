/* Qibla Finder — great-circle bearing to the Kaaba, computed on the device. Sensors are used only after a click. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KAABA = { lat: 21.4225, lon: 39.8262 }, R_KM = 6371.0088, NS = "http://www.w3.org/2000/svg";
  var rad = Math.PI / 180;

  // ---------- math ----------
  function bearing(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * rad, p2 = lat2 * rad, dl = (lon2 - lon1) * rad;
    var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / rad + 360) % 360;
  }
  function distanceKm(lat1, lon1, lat2, lon2) {
    var dp = (lat2 - lat1) * rad, dl = (lon2 - lon1) * rad;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  var P16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  var P8AR = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  function point16(b) { return P16[Math.round(b / 22.5) % 16]; }
  function point8ar(b) { return P8AR[Math.round(b / 45) % 8]; }
  function turn(b) { return b <= 180 ? { dir: "right", deg: b } : { dir: "left", deg: 360 - b }; }
  function angDiff(a, b) { return ((a - b + 540) % 360) - 180; } // signed, -180..180

  // ---------- text ----------
  var STR = {
    en: { title: "Qibla Finder", intro: "The direction of the Kaaba in Makkah from wherever you are, as degrees from north, with a live compass on phones. Your location is used only on this device.",
      startCompass: "Start live compass", stopCompass: "Stop compass", compassNote: "On a phone: hold it flat, top edge pointing ahead. Move it in a figure-8 if the reading looks wrong.",
      location: "Your location", useLoc: "Use my location", city: "City", lat: "Latitude", lon: "Longitude", copy: "Copy", custom: "Custom location", myLoc: "My location",
      trueNorth: "Degrees are from true north. A magnetic compass points to magnetic north, which can differ by a few degrees depending on where you are.",
      fromNorth: "from north", direction: "direction", distance: "to the Kaaba", staticNote: "Compass not running: north is up.",
      explain: "Face <b>north</b>, then turn <b>{dir}</b> by <b>{deg}°</b>. You are then facing the Qibla ({pt}).", right: "clockwise (to your right)", left: "counter-clockwise (to your left)",
      atKaaba: "You are at the Kaaba.", facing: "You're facing the Qibla ✓", turnR: "Turn right {d}°", turnL: "Turn left {d}°", heading: "Phone heading {h}°",
      noSensor: "No compass sensor detected. Use the degrees with a compass app or a real compass.", denied: "Motion permission was denied.", geoNo: "Location isn't available in this browser",
      geoDenied: "Location permission was denied. Pick a city or type coordinates.", badCoords: "Latitude must be −90 to 90 and longitude −180 to 180", copied: "Qibla from {p}: {b}° from true north ({pt}), {km} km to the Kaaba" },
    ar: { title: "اتجاه القبلة", intro: "اتجاه الكعبة المشرفة من أي مكان، بالدرجات من الشمال، مع بوصلة حيّة على الهاتف. موقعك يُستخدم على هذا الجهاز فقط.",
      startCompass: "تشغيل البوصلة", stopCompass: "إيقاف البوصلة", compassNote: "على الهاتف: أمسكه بشكل مستوٍ وأعلاه للأمام. حرّكه على شكل 8 إذا بدت القراءة غير دقيقة.",
      location: "موقعك", useLoc: "استخدم موقعي", city: "المدينة", lat: "خط العرض", lon: "خط الطول", copy: "نسخ", custom: "موقع مخصص", myLoc: "موقعي",
      trueNorth: "الدرجات مقاسة من الشمال الجغرافي. البوصلة المغناطيسية تشير إلى الشمال المغناطيسي وقد يختلف بضع درجات حسب مكانك.",
      fromNorth: "من الشمال", direction: "الاتجاه", distance: "إلى الكعبة", staticNote: "البوصلة غير مفعّلة: الشمال للأعلى.",
      explain: "اتجه نحو <b>الشمال</b> ثم استدر <b>{dir}</b> بمقدار <b>{deg}°</b>، فتكون متجهًا إلى القبلة ({pt}).", right: "مع عقارب الساعة (إلى اليمين)", left: "عكس عقارب الساعة (إلى اليسار)",
      atKaaba: "أنت عند الكعبة.", facing: "أنت باتجاه القبلة ✓", turnR: "استدر يمينًا {d}°", turnL: "استدر يسارًا {d}°", heading: "اتجاه الهاتف {h}°",
      noSensor: "لا يوجد حساس بوصلة. استخدم الدرجات مع تطبيق بوصلة أو بوصلة حقيقية.", denied: "تم رفض إذن الحركة.", geoNo: "تحديد الموقع غير متاح في هذا المتصفح",
      geoDenied: "تم رفض إذن الموقع. اختر مدينة أو أدخل الإحداثيات.", badCoords: "خط العرض بين −90 و90 وخط الطول بين −180 و180", copied: "القبلة من {p}: {b}° من الشمال الجغرافي ({pt})، {km} كم إلى الكعبة" }
  };
  var CITIES = [["amman", "Amman", "عمّان", 31.9539, 35.9106], ["irbid", "Irbid", "إربد", 32.5556, 35.85], ["zarqa", "Zarqa", "الزرقاء", 32.0728, 36.088], ["aqaba", "Aqaba", "العقبة", 29.5321, 35.0063],
    ["medina", "Medina", "المدينة المنورة", 24.4686, 39.6142], ["riyadh", "Riyadh", "الرياض", 24.7136, 46.6753], ["jeddah", "Jeddah", "جدة", 21.4858, 39.1925],
    ["jerusalem", "Jerusalem", "القدس", 31.7683, 35.2137], ["damascus", "Damascus", "دمشق", 33.5138, 36.2765], ["beirut", "Beirut", "بيروت", 33.8938, 35.5018],
    ["baghdad", "Baghdad", "بغداد", 33.3152, 44.3661], ["cairo", "Cairo", "القاهرة", 30.0444, 31.2357], ["dubai", "Dubai", "دبي", 25.2048, 55.2708],
    ["doha", "Doha", "الدوحة", 25.2854, 51.531], ["kuwait", "Kuwait City", "مدينة الكويت", 29.3759, 47.9774], ["muscat", "Muscat", "مسقط", 23.588, 58.3829],
    ["istanbul", "Istanbul", "إسطنبول", 41.0082, 28.9784], ["casablanca", "Casablanca", "الدار البيضاء", 33.5731, -7.5898], ["tunis", "Tunis", "تونس", 36.8065, 10.1815],
    ["algiers", "Algiers", "الجزائر", 36.7538, 3.0588], ["khartoum", "Khartoum", "الخرطوم", 15.5007, 32.5599], ["karachi", "Karachi", "كراتشي", 24.8607, 67.0011],
    ["dhaka", "Dhaka", "دكا", 23.8103, 90.4125], ["delhi", "Delhi", "دلهي", 28.6139, 77.209], ["kualalumpur", "Kuala Lumpur", "كوالالمبور", 3.139, 101.6869],
    ["jakarta", "Jakarta", "جاكرتا", -6.2088, 106.8456], ["tehran", "Tehran", "طهران", 35.6892, 51.389], ["london", "London", "لندن", 51.5074, -0.1278],
    ["paris", "Paris", "باريس", 48.8566, 2.3522], ["berlin", "Berlin", "برلين", 52.52, 13.405], ["newyork", "New York", "نيويورك", 40.7128, -74.006],
    ["toronto", "Toronto", "تورنتو", 43.6532, -79.3832], ["losangeles", "Los Angeles", "لوس أنجلوس", 34.0522, -118.2437], ["sydney", "Sydney", "سيدني", -33.8688, 151.2093]
  ].map(function (c) { return { id: c[0], en: c[1], ar: c[2], lat: c[3], lon: c[4] }; });

  var saved = S3.store("qibla") || {};
  var st = { lang: saved.lang === "ar" || (!saved.lang && /^ar/i.test(navigator.language || "")) ? "ar" : "en", city: saved.city || "amman",
    lat: isFinite(saved.lat) ? +saved.lat : 31.9539, lon: isFinite(saved.lon) ? +saved.lon : 35.9106, name: saved.name || "", heading: null, live: false };
  function save() { S3.store("qibla", { lang: st.lang, city: st.city, lat: st.lat, lon: st.lon, name: st.name }); }
  function t(k) { return STR[st.lang][k] || STR.en[k]; }
  function placeName() { var c = CITIES.filter(function (x) { return x.id === st.city; })[0]; return c ? c[st.lang] : st.name === "my" ? t("myLoc") : t("custom"); }
  function num(n, d) { return n.toLocaleString(st.lang === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: d, minimumFractionDigits: d }); }

  // ---------- compass drawing ----------
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function drawDial() {
    var g = $("#dial"); while (g.firstChild) g.removeChild(g.firstChild);
    el("circle", { "class": "face", r: 150 }, g);
    for (var d = 0; d < 360; d += 5) {
      var major = d % 30 === 0, r1 = major ? 130 : 138, a = d * rad;
      el("line", { "class": "tick" + (major ? " major" : ""), x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * 147, y2: -Math.cos(a) * 147 }, g);
      if (major && d % 90) { var tx = el("text", { "class": "deg", x: Math.sin(a) * 120, y: -Math.cos(a) * 120 }, g); tx.textContent = d; }
    }
    var labels = st.lang === "ar" ? ["ش", "شر", "ج", "غ"] : ["N", "E", "S", "W"];
    labels.forEach(function (l, i) { var a = i * 90 * rad, tx = el("text", { "class": "lbl" + (i ? "" : " n"), x: Math.sin(a) * 116, y: -Math.cos(a) * 116 }, g); tx.textContent = l; });
    var arrow = el("g", { id: "arrow" }, g);
    el("path", { "class": "arrow", d: "M0 -96 L13 -12 L0 -20 L-13 -12 Z" }, arrow);
    var k = el("g", { "class": "kaaba", transform: "translate(0 -104)" }, arrow);
    el("rect", { x: -9, y: -9, width: 18, height: 18, rx: 2 }, k); el("line", { x1: -9, y1: -3, x2: 9, y2: -3 }, k);
    el("circle", { "class": "hub", r: 9 }, g);
    render();
  }

  // ---------- render ----------
  function render() {
    var b = bearing(st.lat, st.lon, KAABA.lat, KAABA.lon), km = distanceKm(st.lat, st.lon, KAABA.lat, KAABA.lon), here = km < 0.05;
    var arrow = $("#arrow"); if (arrow) arrow.setAttribute("transform", "rotate(" + b.toFixed(2) + ")");
    $("#dial").setAttribute("transform", "rotate(" + (st.heading == null ? 0 : -st.heading).toFixed(2) + ")");
    $("#bearingBig").textContent = here ? "🕋" : num(b, 1) + "°";
    var pt = st.lang === "ar" ? point8ar(b) : point16(b);
    function stat(l, v) { return '<div class="stat"><b>' + S3.esc(v) + "</b><span>" + S3.esc(l) + "</span></div>"; }
    $("#stats").innerHTML = stat(t("fromNorth"), num(b, 1) + "°") + stat(t("direction"), pt) + stat(t("distance"), num(Math.round(km), 0) + (st.lang === "ar" ? " كم" : " km"));
    var tr = turn(b);
    // Only our own fixed strings go into innerHTML; the numbers are formatted by us.
    $("#explain").innerHTML = here ? S3.esc(t("atKaaba")) : t("explain").replace("{dir}", S3.esc(t(tr.dir))).replace("{deg}", S3.esc(num(tr.deg, 1))).replace("{pt}", S3.esc(pt));
    var card = $("#compassCard"), status = $("#status");
    if (st.heading == null) { card.classList.remove("aligned"); status.textContent = st.live ? "…" : t("staticNote"); }
    else {
      var diff = angDiff(b, st.heading), aligned = Math.abs(diff) <= 5;
      if (aligned && !card.classList.contains("aligned") && navigator.vibrate) navigator.vibrate(60);
      card.classList.toggle("aligned", aligned);
      status.textContent = (aligned ? t("facing") : (diff > 0 ? t("turnR") : t("turnL")).replace("{d}", Math.round(Math.abs(diff)))) + " · " + t("heading").replace("{h}", Math.round(st.heading));
    }
  }
  function fillCities() {
    var cs = $("#city"); cs.innerHTML = "";
    cs.appendChild(S3.h("option", { value: "custom", text: st.name === "my" ? t("myLoc") : t("custom") }));
    CITIES.slice().sort(function (a, b) { return a[st.lang].localeCompare(b[st.lang], st.lang); }).forEach(function (c) { cs.appendChild(S3.h("option", { value: c.id, text: c[st.lang] })); });
    cs.value = CITIES.some(function (c) { return c.id === st.city; }) ? st.city : "custom";
  }
  function applyLang() {
    var main = $("#main"); main.dir = st.lang === "ar" ? "rtl" : "ltr"; main.lang = st.lang;
    $$("[data-t]").forEach(function (e) { e.textContent = t(e.dataset.t); });
    $("#live").firstChild.textContent = st.live ? t("stopCompass") : t("startCompass");
    $$("#lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === st.lang)); });
    fillCities(); drawDial();
  }
  function setCoords(lat, lon, city, name) {
    if (!(isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) { S3.toast(t("badCoords"), "error"); return false; }
    st.lat = Math.round(lat * 1e4) / 1e4; st.lon = Math.round(lon * 1e4) / 1e4; st.city = city || "custom"; st.name = name || "";
    $("#lat").value = st.lat; $("#lon").value = st.lon; fillCities(); save(); render(); return true;
  }

  // ---------- sensors (only after a click) ----------
  var smooth = null, gotData = false, evName = null;
  function onOrient(e) {
    var h = null;
    if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === "deviceorientationabsolute") && e.alpha != null) h = (360 - e.alpha) % 360;
    if (h == null) return;
    var so = (screen.orientation && typeof screen.orientation.angle === "number") ? screen.orientation.angle : (window.orientation || 0);
    h = (h + so + 360) % 360;
    gotData = true;
    smooth = smooth == null ? h : (smooth + angDiff(h, smooth) * 0.25 + 360) % 360; // low-pass on the circle
    st.heading = smooth; render();
  }
  function startLive() {
    function go() {
      evName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
      window.addEventListener(evName, onOrient);
      st.live = true; gotData = false; smooth = null; applyLang();
      setTimeout(function () { if (st.live && !gotData) { S3.toast(t("noSensor"), "error"); stopLive(); } }, 3000);
    }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") go(); else S3.toast(t("denied"), "error"); }, function () { S3.toast(t("denied"), "error"); });
    } else if (window.DeviceOrientationEvent) go();
    else S3.toast(t("noSensor"), "error");
  }
  function stopLive() { if (evName) window.removeEventListener(evName, onOrient); st.live = false; st.heading = null; applyLang(); }

  // ---------- wiring ----------
  $("#live").addEventListener("click", function () { if (st.live) stopLive(); else startLive(); });
  $("#geo").addEventListener("click", function () {
    if (!navigator.geolocation) { S3.toast(t("geoNo"), "error"); return; }
    navigator.geolocation.getCurrentPosition(function (p) { if (setCoords(p.coords.latitude, p.coords.longitude, "custom", "my")) S3.done(); },
      function () { S3.toast(t("geoDenied"), "error"); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 });
  });
  $("#city").addEventListener("change", function () { var c = CITIES.filter(function (x) { return x.id === $("#city").value; })[0]; if (c) setCoords(c.lat, c.lon, c.id, ""); });
  ["#lat", "#lon"].forEach(function (id) { $(id).addEventListener("change", function () { setCoords(parseFloat($("#lat").value), parseFloat($("#lon").value), "custom", ""); }); });
  $$("#lang button").forEach(function (b) { b.addEventListener("click", function () { st.lang = b.dataset.v; save(); applyLang(); }); });
  $("#copy").addEventListener("click", function () {
    var b = bearing(st.lat, st.lon, KAABA.lat, KAABA.lon);
    S3.copy(t("copied").replace("{p}", placeName()).replace("{b}", num(b, 1)).replace("{pt}", st.lang === "ar" ? point8ar(b) : point16(b)).replace("{km}", num(Math.round(distanceKm(st.lat, st.lon, KAABA.lat, KAABA.lon)), 0)));
    S3.done();
  });

  $("#lat").value = st.lat; $("#lon").value = st.lon;
  applyLang();

  window.S3_DEMO = function () { st.lang = "en"; setCoords(31.9539, 35.9106, "amman", ""); applyLang(); };

  window.S3_SELFTEST = function () {
    var amman = bearing(31.9539, 35.9106, KAABA.lat, KAABA.lon), london = bearing(51.5074, -0.1278, KAABA.lat, KAABA.lon), ny = bearing(40.7128, -74.006, KAABA.lat, KAABA.lon);
    var a = Math.abs(amman - 160.71) < 0.05 && Math.abs(london - 118.99) < 0.1 && Math.abs(ny - 58.48) < 0.1;
    var jak = bearing(-6.2088, 106.8456, KAABA.lat, KAABA.lon), b = Math.abs(jak - 295.15) < 0.2; // Jakarta: west-northwest
    var dA = distanceKm(31.9539, 35.9106, KAABA.lat, KAABA.lon), c = dA > 1225 && dA < 1245 && distanceKm(KAABA.lat, KAABA.lon, KAABA.lat, KAABA.lon) < 1e-6;
    var d = point16(amman) === "SSE" && point16(359) === "N" && point16(london) === "ESE" && point8ar(amman) === "جنوب" && point8ar(jak) === "شمال غرب";
    var e = turn(160.7).dir === "right" && turn(300).dir === "left" && turn(300).deg === 60 && angDiff(10, 350) === 20 && angDiff(350, 10) === -20;
    return a && b && c && d && e;
  };
})();
