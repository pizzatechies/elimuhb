/* Elimuhub demo app: an offline, interactive tour of the demo school for five roles. */
(function () {
  "use strict";

  var D = window.DEMO;
  var SCHOOL = D.SCHOOL;
  /** True inside the Android demo app, which provides the ElimuhubNative bridge. */
  var IN_APP = !!window.ElimuhubNative;
  /** Served over http(s), so the browser can install it and run a service worker. */
  var IS_WEB = /^https?:$/.test(location.protocol);
  var Native = window.ElimuhubNative || makeWebBridge();
  var STANDALONE = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var LOADED_AT = Date.now();
  var app = document.getElementById("app");

  // ------------------------------------------------------------------ helpers

  /** The same methods as the Android bridge, built on browser APIs (storage, notifications, sharing). */
  function makeWebBridge() {
    function store(key, value) {
      try {
        if (value === undefined) return localStorage.getItem(key) || "";
        localStorage.setItem(key, value);
      } catch (e) { /* storage unavailable */ }
      return "";
    }
    return {
      version: function () { return "1.0.1 (web)"; },
      loadState: function () { return store("elimuhub-demo-v1"); },
      saveState: function (json) { store("elimuhub-demo-v1", json); },
      notifySupported: function () { return IS_WEB && "Notification" in window && "serviceWorker" in navigator; },
      canNotify: function () { return this.notifySupported() && Notification.permission === "granted"; },
      requestNotify: function () {
        if (!this.notifySupported()) { window.__elimuhubNotifyResult(false); return; }
        Notification.requestPermission().then(function (p) { window.__elimuhubNotifyResult(p === "granted"); });
      },
      notify: function (title, body) {
        if (!this.canNotify()) return;
        var opts = { body: body, icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "elimuhub-" + Date.now() };
        navigator.serviceWorker.ready.then(function (reg) { return reg.showNotification(title, opts); }).catch(function () {
          try { new Notification(title, opts); } catch (e) { /* not allowed */ }
        });
      },
      liveUrl: function () { return store("elimuhub-demo-live"); },
      openLive: function (url) { store("elimuhub-demo-live", url); location.href = url; },
      openExternal: function (url) { window.open(url, "_blank", "noopener"); },
      share: function (text) {
        if (navigator.share) navigator.share({ text: text }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("Copied. Paste it into WhatsApp, SMS or email."); }, function () { toast("Couldn't copy in this browser"); });
        else toast("Sharing isn't available in this browser");
      },
    };
  }
  function notifySupported() { return IN_APP || Native.notifySupported(); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function kes(n) { return "KES " + Math.round(n).toLocaleString("en-KE"); }
  function kesShort(n) {
    if (Math.abs(n) >= 1e6) return "KES " + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (Math.abs(n) >= 1e4) return "KES " + Math.round(n / 1e3) + "K";
    return kes(n);
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ico(name, cls) { return '<svg class="ico ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function initials(name) {
    var parts = name.replace(/^(Dr|Mr|Mrs|Ms|Miss)\.?\s+/i, "").split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2); }
  function fmtDate(d) { return DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  function fmtDay(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function ago(at) {
    var m = Math.round((Date.now() - at) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + " h ago";
    var d = Math.round(h / 24);
    return d === 1 ? "Yesterday" : d + " days ago";
  }
  function greeting() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  /** Monday = 0 … Friday = 4, or -1 at the weekend. */
  function schoolDay(d) { var w = d.getDay(); return w === 0 || w === 6 ? -1 : w - 1; }

  // ------------------------------------------------------------------ state (kept on the phone)

  var KEY = "elimuhub-demo-v1";
  function freshState() {
    return {
      v: 1, role: null, child: "MA0120", readN: {}, notes: [], payments: [], matched: {}, attendance: {},
      marks: {}, published: {}, notices: [], done: {}, receiptNo: 1728, notifyAsked: false, sms: 0,
    };
  }
  function load() {
    try {
      var raw = Native ? Native.loadState() : localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.v === 1) return Object.assign(freshState(), o);
      }
    } catch (e) { /* start fresh */ }
    return freshState();
  }
  var S = load();
  function save() {
    var raw = JSON.stringify(S);
    try { if (Native) Native.saveState(raw); else localStorage.setItem(KEY, raw); } catch (e) { /* storage unavailable */ }
  }

  // ------------------------------------------------------------------ school data

  var ALL = D.G7E.concat([D.WANJIRU]);
  function learner(adm) { for (var i = 0; i < ALL.length; i++) if (ALL[i].adm === adm) return ALL[i]; return null; }
  function clsName(l) { return D.CLASSES[l.cls].name; }
  function firstName(l) { return l.name.split(" ")[0]; }
  function guardianOf(l) {
    if (D.CHILDREN.indexOf(l.adm) >= 0) return D.GUARDIAN;
    var r = rng(hash(l.adm + ":g"));
    var surname = l.name.split(" ").slice(-1)[0];
    return { name: (r() < 0.55 ? "Mrs. " : "Mr. ") + surname, phone: "07" + pad(Math.floor(r() * 100), 2) + " " + pad(Math.floor(r() * 1000), 3) + " " + pad(Math.floor(r() * 1000), 3), relation: "Parent" };
  }

  var BASE = {};
  function baseBalance(adm) {
    if (BASE[adm] != null) return BASE[adm];
    var st = D.STATEMENTS[adm];
    var v;
    if (st) v = st.reduce(function (a, e) { return a + (e.type === "invoice" ? e.amount : -e.amount); }, 0);
    else { var r = rng(hash(adm + ":bal")); v = r() < 0.15 ? 0 : Math.round((3500 + r() * 42000) / 100) * 100; }
    BASE[adm] = v;
    return v;
  }
  function paymentsFor(adm) { return S.payments.filter(function (p) { return p.adm === adm; }); }
  function balance(adm) { return baseBalance(adm) - paymentsFor(adm).reduce(function (a, p) { return a + p.amount; }, 0); }
  function runtimeTotal() { return S.payments.reduce(function (a, p) { return a + p.amount; }, 0); }
  function collected() { return SCHOOL.collected + runtimeTotal(); }

  function feed() {
    var seeded = D.PAYMENTS.map(function (p) {
      return { receipt: p.receipt, name: p.learner, cls: p.cls, amount: p.amount, method: p.method, code: p.code, at: LOADED_AT - p.minutesAgo * 60000 };
    });
    return S.payments.slice().concat(seeded).sort(function (a, b) { return b.at - a.at; });
  }
  function collectedToday() {
    var start = today().getTime();
    return feed().filter(function (p) { return p.at >= start; }).reduce(function (a, p) { return a + p.amount; }, 0);
  }
  function unmatched() { return D.UNMATCHED.filter(function (u) { return !S.matched[u.id]; }); }

  // Results -------------------------------------------------------------
  function subjectsOf(l) { return D.CLASSES[l.cls].subjects; }
  function scaleOf(l) { return D.CLASSES[l.cls].scale; }
  function level(score, scale) {
    if (score == null || isNaN(score)) return null;
    var bands = scale === "cbc4" ? D.CBC4 : D.CBC8;
    for (var i = 0; i < bands.length; i++) if (score >= bands[i][0]) return bands[i][1];
    return bands[bands.length - 1][1];
  }
  function lv(code) { return '<span class="lv lv-' + (code || "none") + '">' + (code || "—") + "</span>"; }
  function difficulty(subject) { return (hash(subject) % 15) - 7; }
  function scores(examKey, adm) {
    var l = learner(adm);
    var subs = subjectsOf(l);
    if (examKey === "midterm3") {
      var base = scores("opener", adm);
      var r0 = rng(hash(adm + ":mid"));
      var entered = S.marks["midterm3:Mathematics"] || {};
      return subs.map(function (s, i) {
        var generated = clamp(Math.round(base[i] + (r0() - 0.45) * 14), 8, 99);
        if (s === "Mathematics" && l.cls === "G7E") return entered[adm] == null ? null : entered[adm];
        return generated;
      });
    }
    var real = D.MARKS[examKey + ":" + adm];
    if (real) return real.slice();
    var r = rng(hash(adm + ":" + examKey));
    var ability = 36 + rng(hash(adm + ":ability"))() * 50;
    return subs.map(function (s) { return clamp(Math.round(ability + difficulty(s) + (r() - 0.5) * 18), 8, 99); });
  }
  function summary(examKey, adm) {
    var l = learner(adm);
    var sc = scores(examKey, adm);
    var got = sc.filter(function (v) { return v != null; });
    var total = got.reduce(function (a, v) { return a + v; }, 0);
    var mean = got.length ? total / got.length : 0;
    return { scores: sc, total: total, mean: mean, level: got.length ? level(mean, scaleOf(l)) : null, count: got.length };
  }
  function meritList(examKey) {
    var rows = D.G7E.map(function (l) { var s = summary(examKey, l.adm); return { l: l, total: s.total, mean: s.mean, level: s.level }; });
    rows.sort(function (a, b) { return b.total - a.total; });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    return rows;
  }
  function rankOf(examKey, adm) {
    if (learner(adm).cls !== "G7E") return null;
    var rows = meritList(examKey);
    for (var i = 0; i < rows.length; i++) if (rows[i].l.adm === adm) return rows[i].rank + "/" + rows.length;
    return null;
  }
  function examByKey(key) { for (var i = 0; i < D.EXAMS.length; i++) if (D.EXAMS[i].key === key) return D.EXAMS[i]; return null; }
  function isPublished(key) { var e = examByKey(key); return e.status === "published" || !!S.published[key]; }
  function publishedExams() { return D.EXAMS.filter(function (e) { return isPublished(e.key); }); }
  function mathsEntered() { var m = S.marks["midterm3:Mathematics"] || {}; return D.G7E.filter(function (l) { return m[l.adm] != null; }).length; }

  // Attendance ----------------------------------------------------------
  function attendance(adm, date) {
    var key = iso(date);
    var reg = S.attendance[key];
    if (reg && reg[adm]) return reg[adm];
    if (schoolDay(date) < 0 || date >= today()) return null;
    var r = rng(hash(adm + key))();
    return r < 0.035 ? "A" : r < 0.06 ? "L" : "P";
  }
  function monthDates() {
    var t = today();
    var days = [];
    for (var d = new Date(t.getFullYear(), t.getMonth(), 1); d.getMonth() === t.getMonth(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(d);
    return days;
  }
  function attendanceStats(adm) {
    var s = { P: 0, A: 0, L: 0, absentDays: [] };
    monthDates().forEach(function (d) {
      var st = attendance(adm, d);
      if (st) { s[st]++; if (st === "A") s.absentDays.push(d); }
    });
    var total = s.P + s.A + s.L;
    s.total = total;
    s.pct = total ? Math.round(((s.P + s.L) / total) * 100) : 100;
    return s;
  }

  // Notifications -------------------------------------------------------
  function notesFor(role) {
    var seeded = D.NOTIFICATIONS.filter(function (n) { return n.roles.indexOf(role) >= 0; }).map(function (n) {
      return { id: n.id, title: n.title, body: n.body, at: LOADED_AT - n.minutesAgo * 60000 };
    });
    var mine = S.notes.filter(function (n) { return n.roles.indexOf(role) >= 0; });
    return mine.concat(seeded).sort(function (a, b) { return b.at - a.at; });
  }
  function unreadCount(role) {
    var read = S.readN[role] || {};
    return notesFor(role).filter(function (n) { return !read[n.id]; }).length;
  }
  function addNote(roles, title, body) {
    S.notes.unshift({ id: "r" + Date.now().toString(36) + Math.floor(Math.random() * 1e4), roles: roles, title: title, body: body, at: Date.now() });
    if (S.notes.length > 60) S.notes.length = 60;
  }
  function phoneNotify(title, body) {
    if (Native) { try { Native.notify(title, body); } catch (e) { /* ignore */ } }
  }
  function canNotify() { try { return Native ? Native.canNotify() : false; } catch (e) { return false; } }

  // Notices -------------------------------------------------------------
  var AUDIENCE = { all: "Everyone", parents: "Parents", staff: "Staff", students: "Students" };
  var ROLE_AUDIENCE = { principal: ["all", "parents", "staff", "students"], bursar: ["all", "staff"], teacher: ["all", "staff"], parent: ["all", "parents"], student: ["all", "students"] };
  function notices(role) {
    var seeded = D.NOTICES.map(function (n) { return { id: n.id, title: n.title, body: n.body, audience: n.audience, at: LOADED_AT - n.daysAgo * 86400000 - 3600000 }; });
    var list = S.notices.concat(seeded);
    var allowed = ROLE_AUDIENCE[role];
    return list.filter(function (n) { return allowed.indexOf(n.audience) >= 0; }).sort(function (a, b) { return b.at - a.at; });
  }
  function upcomingEvents() {
    var t = today();
    var list = D.EVENTS.filter(function (e) { return parseISO(e.date) >= t; });
    return list.length ? list : D.EVENTS;
  }

  // ------------------------------------------------------------------ UI primitives

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.innerHTML = ico("check") + "<span>" + esc(msg) + "</span>";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200);
  }

  var sheet = null;
  function openSheet(title, html, bind) {
    closeSheet(true);
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    var el = document.createElement("div");
    el.className = "sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="grab"></div><div class="s-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">' + ico("x") + '</button></div><div class="s-body">' + html + "</div>";
    document.body.appendChild(scrim);
    document.body.appendChild(el);
    scrim.addEventListener("click", function () { closeSheet(); });
    el.addEventListener("click", onClick);
    sheet = { el: el, scrim: scrim, body: el.querySelector(".s-body") };
    requestAnimationFrame(function () { scrim.classList.add("show"); el.classList.add("show"); });
    if (bind) bind(sheet.body);
    return sheet.body;
  }
  function setSheet(title, html, bind) {
    if (!sheet) return openSheet(title, html, bind);
    sheet.el.querySelector(".s-head h2").textContent = title;
    sheet.body.innerHTML = html;
    sheet.body.scrollTop = 0;
    if (bind) bind(sheet.body);
    return sheet.body;
  }
  function closeSheet(instant) {
    if (!sheet) return;
    var s = sheet;
    sheet = null;
    if (instant) { s.el.remove(); s.scrim.remove(); return; }
    s.el.classList.remove("show");
    s.scrim.classList.remove("show");
    setTimeout(function () { s.el.remove(); s.scrim.remove(); }, 260);
  }

  function item(o) {
    var tag = o.go ? "a" : o.act ? "button" : "div";
    var attrs = o.go ? ' href="#/' + o.go + '"' : "";
    if (o.act) attrs += ' data-act="' + o.act + '"' + (o.data || "") + ' type="button"';
    var lead = o.avatar ? '<span class="avatar ' + (o.gender || "") + '">' + esc(o.avatar) + "</span>" : o.icon ? '<span class="lead-ico ' + (o.tone || "") + '">' + ico(o.icon) + "</span>" : "";
    var end = o.end != null ? '<span class="end">' + o.end + "</span>" : "";
    var chev = o.go || o.act ? '<svg class="ico ico-sm chev" aria-hidden="true"><use href="#i-chev"/></svg>' : "";
    return "<" + tag + ' class="item' + (o.cls ? " " + o.cls : "") + '"' + attrs + ">" + lead + '<span class="body"><span class="t">' + o.t + "</span>" + (o.s ? '<span class="s">' + o.s + "</span>" : "") + "</span>" + end + (o.noChev ? "" : chev) + "</" + tag + ">";
  }
  function sectionTitle(title, link) { return '<div class="section-title"><h2>' + esc(title) + "</h2>" + (link || "") + "</div>"; }
  function kpi(icon, label, value, sub, tone) {
    return '<div class="kpi ' + (tone || "") + '"><div class="k-ico">' + ico(icon, "ico-sm") + "</div><small>" + esc(label) + "</small><strong>" + value + "</strong>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>";
  }
  function pageHead(title, back) {
    return '<div class="page-head">' + (back ? '<a class="icon-btn back" href="#/' + back + '" aria-label="Back">' + ico("back") + "</a>" : "") + "<h1>" + esc(title) + "</h1></div>";
  }
  function childChips(role, tab) {
    return '<div class="chips">' + D.CHILDREN.map(function (adm) {
      var l = learner(adm);
      return '<button class="chip' + (S.child === adm ? " on" : "") + '" data-act="pickChild" data-adm="' + adm + '">' + esc(firstName(l)) + " · " + esc(clsName(l)) + "</button>";
    }).join("") + "</div>";
  }
  function methodTone(m) { return m === "M-Pesa" ? "" : m === "Bank" ? "blue" : m === "Cheque" ? "purple" : "amber"; }
  function paymentItem(p, act) {
    return item({
      icon: "cash", tone: methodTone(p.method), t: esc(p.name), s: esc(p.cls) + " · " + esc(p.method) + ' · <span class="mono">' + esc(p.code) + "</span>",
      end: "<strong>" + kes(p.amount) + "</strong><small>" + ago(p.at) + "</small>", act: act ? "receipt" : null, data: act ? ' data-receipt="' + p.receipt + '"' : "", noChev: true,
    });
  }

  // ------------------------------------------------------------------ routing

  var TABS = {
    principal: [["home", "Home", "home"], ["students", "Learners", "users"], ["finance", "Finance", "wallet"], ["academics", "Academics", "book"], ["more", "More", "grid"]],
    bursar: [["home", "Home", "home"], ["payments", "Payments", "receipt"], ["balances", "Balances", "wallet"], ["students", "Learners", "users"], ["more", "More", "grid"]],
    teacher: [["home", "Home", "home"], ["attendance", "Register", "register"], ["marks", "Marks", "pencil"], ["timetable", "Timetable", "calendar"], ["more", "More", "grid"]],
    parent: [["home", "Home", "home"], ["fees", "Fees", "wallet"], ["results", "Results", "chart"], ["attendance", "Attendance", "calendar"], ["more", "More", "grid"]],
    student: [["home", "Home", "home"], ["timetable", "Timetable", "calendar"], ["assignments", "Homework", "book"], ["results", "Results", "chart"], ["more", "More", "grid"]],
  };
  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return { role: parts[0], tab: parts[1] || "home", arg: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  function go(path, replace) {
    if (replace) location.replace("#/" + path);
    else location.hash = "#/" + path;
  }
  function isTab(role, tab) { return TABS[role].some(function (t) { return t[0] === tab; }); }

  /** Android back button: close a sheet, then step back towards the home tab. */
  window.__elimuhubBack = function () {
    if (sheet) { closeSheet(); return true; }
    var r = route();
    if (!r.role || !D.ROLES[r.role]) return false;
    if (r.arg) { go(r.role + "/" + (r.tab === "student" ? "students" : r.tab === "exam" ? "academics" : r.tab), true); return true; }
    if (!isTab(r.role, r.tab)) { go(r.role + "/more", true); return true; }
    if (r.tab !== "home") { go(r.role + "/home", true); return true; }
    return false;
  };
  window.__elimuhubNotifyResult = function (granted) {
    if (granted) phoneNotify("Notifications are on", "You'll get receipts, results, absence alerts and school notices here.");
    toast(granted ? "Notifications are on for this device" : notifySupported() ? "Notifications are blocked. Allow them in your browser or phone settings." : "This browser can't show notifications");
    refresh();
  };

  /** Re-draws the current screen in place (keeps the scroll position, no entrance animation). */
  function refresh() {
    var y = window.scrollY;
    app.classList.add("still");
    render({ keep: true });
    window.scrollTo(0, y);
  }

  function render(opts) {
    var r = route();
    closeSheet(true);
    if (!r.role || !D.ROLES[r.role]) { renderWelcome(); return; }
    if (S.role !== r.role) { S.role = r.role; save(); }
    var view = (VIEWS[r.role] && VIEWS[r.role][r.tab]) || SHARED[r.tab];
    if (!view) { go(r.role + "/home", true); return; }
    var out = view(r.role, r.arg) || {};
    renderShell(r.role, r.tab, out);
    if (!opts || !opts.keep) window.scrollTo(0, 0);
  }

  function renderShell(role, tab, out) {
    var person = D.ROLES[role];
    var unread = unreadCount(role);
    var active = isTab(role, tab) ? tab : tab === "student" ? "students" : tab === "exam" ? "academics" : "more";
    app.innerHTML =
      '<header class="topbar"><img class="mark" src="img/elimuhub.svg" alt=""><div class="school"><strong>' + esc(SCHOOL.name) + '</strong><span><span class="demo-chip">DEMO</span>' + esc(person.label) + " · " + esc(person.name) + "</span></div>" +
      '<button class="icon-btn" data-act="notifications" aria-label="Notifications">' + ico("bell") + (unread ? '<span class="dot">' + unread + "</span>" : "") + "</button>" +
      '<button class="icon-btn avatar" data-act="roleMenu" aria-label="Switch role">' + esc(person.initials) + "</button></header>" +
      '<main class="page" id="page">' + (out.html || "") + "</main>" +
      (out.fab || "") +
      '<div class="tabbar"><div class="side-brand"><img src="img/elimuhub.svg" alt=""><strong>Elimu<b>hub</b></strong></div><nav>' + TABS[role].map(function (t) {
        return '<a href="#/' + role + "/" + t[0] + '"' + (t[0] === active ? ' class="on" aria-current="page"' : "") + '><span class="pill">' + ico(t[2]) + "</span><span>" + t[1] + "</span></a>";
      }).join("") + "</nav></div>";
    if (out.bind) out.bind(document.getElementById("page"));
  }

  // ------------------------------------------------------------------ welcome

  function renderWelcome() {
    var roles = ["principal", "bursar", "teacher", "parent", "student"].map(function (k) {
      var p = D.ROLES[k];
      return item({ avatar: p.initials, t: esc(p.label) + ' <span class="muted small">· ' + esc(p.name) + "</span>", s: esc(p.about), go: k + "/home" });
    }).join("");
    var device = IN_APP || IOS || /android/i.test(navigator.userAgent) ? "phone" : "computer";
    app.innerHTML =
      '<div class="welcome"><div class="welcome-top"><div class="brand"><img src="img/elimuhub.svg" alt=""><strong>Elimu<b>hub</b></strong><span class="demo-chip">DEMO</span></div>' +
      "<h1>Explore a school on Elimuhub, right on your " + device + ".</h1><p>Choose who you want to be at Mwangaza Academy. It all works offline with sample data.</p></div>" +
      '<div class="welcome-body"><div class="card school-card"><div class="crest">MA</div><div><strong>' + esc(SCHOOL.name) + '</strong><div class="muted small">Demo school · ' + esc(SCHOOL.address) + " · " + SCHOOL.learners + " learners</div></div></div>" +
      (canOfferInstall() ? '<div class="card install-card"><div class="row"><span class="lead-ico">' + ico("download") + '</span><div class="spacer"><h3>Install Elimuhub</h3><div class="muted small">Add it to your ' + device + '. It opens like an app and works offline.</div></div><button class="btn sm" data-act="install">Install</button></div></div>' : "") +
      sectionTitle("Continue as") + '<div class="list">' + roles + "</div>" +
      sectionTitle("Already use Elimuhub?") + '<div class="list">' + item({ icon: "link", t: "Connect to your school", s: "Open your school's live Elimuhub in this app", act: "connect" }) + "</div>" +
      '<p class="hint center" style="margin-top:14px">Anything you change stays on this ' + device + '. Reset the demo any time from More.</p>' +
      '<div class="pt-foot"><span>A product of</span><div class="pt"><img src="img/pizza-emblem.png" alt=""><span>Pizza <span>Technologies</span></span></div><span>A better education for all</span></div></div></div>';
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ shared views

  function viewMore(role) {
    var school = [];
    school.push(item({ icon: "megaphone", t: "Notices", s: notices(role).length + " notices", go: role + "/notices" }));
    school.push(item({ icon: "calendar", tone: "blue", t: "School calendar", s: "Events, exams and holidays", go: role + "/events" }));
    if (role === "principal" || role === "bursar" || role === "parent") school.push(item({ icon: "clock", tone: "purple", t: "Timetable", s: role === "parent" ? "Your children's lessons" : "Grade 7 East", go: role + "/timetable" }));
    if (role === "principal") {
      school.push(item({ icon: "wallet", tone: "red", t: "Fee balances", s: "Balances and SMS reminders", go: role + "/balances" }));
      school.push(item({ icon: "users", tone: "amber", t: "Staff", s: D.STAFF.length + " staff shown", go: role + "/staff" }));
    }
    var notifyOn = canNotify();
    var appItems = [
      canOfferInstall() ? item({ icon: "download", t: "Install app", s: "Add Elimuhub to this " + (IOS || /android/i.test(navigator.userAgent) ? "phone" : "computer"), act: "install" }) : "",
      notifySupported() ? item({ icon: "bell", tone: notifyOn ? "" : "amber", t: "Notifications", s: notifyOn ? "On: payments, results, absences and notices" : "Off: tap to turn on", act: "enableNotify" }) : "",
      item({ icon: "switch", tone: "blue", t: "Switch role", s: "Principal, bursar, teacher, parent or student", act: "roleMenu" }),
      item({ icon: "link", tone: "purple", t: "Connect to your school", s: "Open your school's live Elimuhub", act: "connect" }),
      item({ icon: "refresh", tone: "grey", t: "Reset demo", s: "Start again with the original sample data", act: "reset" }),
      item({ icon: "info", tone: "grey", t: "About Elimuhub", s: "A product of Pizza Technologies", act: "about" }),
    ].join("");
    var locked = [["cash", "Payroll & payslips"], ["message", "Bulk SMS"], ["school", "Boarding & exeats"], ["globe", "School website builder"], ["book", "Library, stores & assets"], ["star", "Sick bay, discipline & clubs"]].map(function (x) {
      return item({ icon: x[0], tone: "grey", t: esc(x[1]), s: "In the full Elimuhub system", act: "locked", data: ' data-name="' + esc(x[1]) + '"', end: ico("lock", "ico-sm muted") });
    }).join("");
    return {
      html: pageHead("More") + '<div class="list">' + school.join("") + "</div>" + sectionTitle("App") + '<div class="list">' + appItems + "</div>" + sectionTitle("Also in Elimuhub") + '<div class="list">' + locked + "</div>" +
        '<div class="pt-foot"><span>A product of</span><div class="pt"><img src="img/pizza-emblem.png" alt=""><span>Pizza <span>Technologies</span></span></div><span>Elimuhub Demo ' + esc(version()) + "</span></div>",
    };
  }
  function version() { try { return Native.version(); } catch (e) { return "1.0.1"; } }

  // Installing from the browser ------------------------------------------
  var installEvent = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installEvent = e;
    if (!sheet) refresh();
  });
  window.addEventListener("appinstalled", function () {
    installEvent = null;
    STANDALONE = true;
    toast("Elimuhub is installed. Open it from your home screen or apps.");
    if (!sheet) refresh();
  });
  function canOfferInstall() { return IS_WEB && !IN_APP && !STANDALONE; }
  function installApp() {
    if (installEvent) {
      var ev = installEvent;
      installEvent = null;
      ev.prompt();
      ev.userChoice.then(function (choice) { if (choice.outcome !== "accepted") installEvent = ev; });
      return;
    }
    var steps;
    if (IOS) steps = ["Open this page in <b>Safari</b>.", "Tap the <b>Share</b> button (the square with an arrow).", "Tap <b>Add to Home Screen</b>, then <b>Add</b>."];
    else if (/android/i.test(navigator.userAgent)) steps = ["Open this page in <b>Chrome</b>.", "Tap the <b>⋮</b> menu.", "Tap <b>Install app</b> (or <b>Add to Home screen</b>)."];
    else steps = ["Open this page in <b>Chrome</b> or <b>Edge</b>.", "Click the <b>install</b> icon at the right of the address bar, or open the browser menu.", "Choose <b>Install Elimuhub</b>."];
    openSheet("Install Elimuhub", '<p class="muted small" style="margin-bottom:12px">Elimuhub installs straight from your browser: no app store needed. It gets its own icon, opens in its own window and works offline.</p><ol style="margin:0;padding-left:22px;line-height:2">' + steps.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol>");
  }

  function viewNotices(role) {
    var list = notices(role);
    var html = pageHead("Notices", role + "/more") + '<div class="list">' + list.map(function (n) {
      return item({ icon: "megaphone", tone: n.audience === "parents" ? "amber" : n.audience === "staff" ? "blue" : n.audience === "students" ? "purple" : "", t: esc(n.title), s: esc(AUDIENCE[n.audience]) + " · " + ago(n.at), act: "notice", data: ' data-id="' + n.id + '"' });
    }).join("") + "</div>";
    return { html: html, fab: role === "principal" ? '<button class="fab" data-act="newNotice">' + ico("plus") + "New notice</button>" : "" };
  }

  function viewEvents(role) {
    var groups = {};
    D.EVENTS.forEach(function (e) { var d = parseISO(e.date); var k = LONG_MONTHS[d.getMonth()] + " " + d.getFullYear(); (groups[k] = groups[k] || []).push(e); });
    var html = pageHead("School calendar", role + "/more");
    Object.keys(groups).forEach(function (k) {
      html += sectionTitle(k) + '<div class="list">' + groups[k].map(function (e) {
        var d = parseISO(e.date);
        var tone = e.kind === "Holiday" ? "amber" : e.kind === "Exams" ? "red" : e.kind === "Sports" ? "blue" : e.kind === "Meeting" ? "purple" : "";
        return '<div class="item"><span class="lead-ico ' + tone + '" style="flex-direction:column;line-height:1"><b style="font-size:16px">' + d.getDate() + '</b><small style="font-size:10px">' + DAYS[d.getDay()] + '</small></span><span class="body"><span class="t">' + esc(e.title) + '</span><span class="s">' + esc(e.kind) + (e.place ? " · " + esc(e.place) : "") + "</span></span></div>";
      }).join("") + "</div>";
    });
    return { html: html };
  }

  var ttDay = null;
  function timetableHtml(clsKey, opts) {
    opts = opts || {};
    var sd = schoolDay(new Date());
    if (ttDay == null) ttDay = sd < 0 ? 0 : sd;
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    var now = new Date();
    var nowStr = pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2);
    var lesson = 0;
    var rows = D.PERIODS.map(function (p) {
      if (p.isBreak) return '<div class="slot brk"><time>' + p.start + "</time><span>" + esc(p.name) + "</span></div>";
      var subject = D.TIMETABLE[clsKey][ttDay][lesson++];
      var teacher = D.TEACHERS[subject] || "";
      var mine = opts.teacher && teacher === opts.teacher;
      var isNow = ttDay === sd && nowStr >= p.start && nowStr < p.end;
      return '<div class="slot' + (mine ? " mine" : "") + (isNow ? " now" : "") + '"><time>' + p.start + "<br>" + p.end + '</time><span class="body"><span class="t" style="display:block;font-weight:600">' + esc(subject) + '</span><span class="s muted small">' + esc(teacher) + (isNow ? " · now" : "") + "</span></span>" + (mine ? '<span class="badge green">You</span>' : "") + "</div>";
    }).join("");
    return '<div class="days">' + days.map(function (d, i) {
      return '<button data-act="ttDay" data-day="' + i + '" class="' + (i === ttDay ? "on" : "") + '">' + d + (i === sd ? "<small>Today</small>" : "<small>&nbsp;</small>") + "</button>";
    }).join("") + '</div><div class="card flush" style="margin-top:12px">' + rows + "</div>";
  }
  function viewTimetable(role) {
    var cls = role === "parent" ? learner(S.child).cls : "G7E";
    var html = pageHead("Timetable", role + "/more") + (role === "parent" ? childChips(role, "timetable") + '<div style="height:10px"></div>' : '<p class="muted small" style="margin:-6px 0 12px">Grade 7 East · ' + esc(SCHOOL.term) + "</p>") + timetableHtml(cls);
    return { html: html };
  }

  function viewStaff(role) {
    return { html: pageHead("Staff", role + "/more") + '<div class="list">' + D.STAFF.map(function (s) { return item({ avatar: initials(s[0]), t: esc(s[0]), s: esc(s[1]) }); }).join("") + '</div><p class="hint">The demo shows ' + D.STAFF.length + " of " + SCHOOL.staff + " staff. Payroll, leave and staff attendance are in the full system.</p>" };
  }

  function viewStudents(role) {
    var html = pageHead("Learners") +
      '<div class="search">' + ico("search") + '<input class="input" id="q" type="search" placeholder="Search by name or admission no." autocomplete="off"></div>' +
      '<p class="muted small" style="margin:10px 2px">Grade 7 East · ' + D.G7E.length + " of " + SCHOOL.learners + ' learners</p><div class="list" id="studentList"></div>';
    return {
      html: html,
      bind: function (root) {
        var list = root.querySelector("#studentList");
        function draw(q) {
          q = (q || "").toLowerCase();
          var rows = ALL.filter(function (l) { return !q || l.name.toLowerCase().indexOf(q) >= 0 || l.adm.toLowerCase().indexOf(q) >= 0; });
          list.innerHTML = rows.length ? rows.map(function (l) {
            var bal = balance(l.adm);
            return item({ avatar: initials(l.name), gender: l.gender.toLowerCase(), t: esc(l.name), s: esc(l.adm) + " · " + esc(clsName(l)), end: bal > 0 ? '<strong class="red">' + kes(bal) + "</strong><small>balance</small>" : '<span class="badge green">Cleared</span>', go: role + "/student/" + l.adm });
          }).join("") : '<div class="empty">No learners match “' + esc(q) + "”.</div>";
        }
        draw("");
        root.querySelector("#q").addEventListener("input", function (e) { draw(e.target.value); });
      },
    };
  }

  function viewStudent(role, adm) {
    var l = learner(adm);
    if (!l) return { html: '<div class="empty">Learner not found.</div>' };
    var g = guardianOf(l);
    var bal = balance(adm);
    var att = attendanceStats(adm);
    var res = summary("opener", adm);
    var html = pageHead(firstName(l), role + "/students") +
      '<div class="card"><div class="row"><span class="avatar ' + l.gender.toLowerCase() + '" style="width:56px;height:56px;font-size:18px">' + initials(l.name) + '</span><div><h3 style="font-size:18px">' + esc(l.name) + '</h3><div class="muted small">' + esc(l.adm) + " · " + esc(clsName(l)) + " · " + (l.gender === "M" ? "Boy" : "Girl") + " · Day scholar</div></div></div></div>" +
      '<div class="kpis" style="margin-top:12px">' +
      kpi("wallet", "Fee balance", bal > 0 ? '<span class="red">' + kes(bal) + "</span>" : "Cleared", SCHOOL.term, bal > 0 ? "red" : "") +
      kpi("register", "Attendance", att.pct + "%", "This month", "blue") +
      kpi("chart", "T3 Opener", res.mean.toFixed(1) + "%", res.level + (rankOf("opener", adm) ? " · pos " + rankOf("opener", adm) : ""), "purple") +
      kpi("user", "Parent", esc(g.name.replace(/^(Mrs|Mr)\. /, "")), esc(g.phone), "amber") + "</div>" +
      sectionTitle("Actions") + '<div class="list">' +
      item({ icon: "receipt", t: "Fee statement", s: "Invoices, payments and receipts", act: "statement", data: ' data-adm="' + adm + '"' }) +
      item({ icon: "chart", tone: "purple", t: "Report card", s: "Term 3 Opener Exam 2026", act: "reportCard", data: ' data-adm="' + adm + '" data-exam="opener"' }) +
      item({ icon: "message", tone: "blue", t: "Message parent", s: esc(g.name) + " · " + esc(g.phone), act: "messageParent", data: ' data-adm="' + adm + '"' }) +
      item({ icon: "cash", tone: "amber", t: "Record a payment", s: "Cash, bank, cheque or M-Pesa", act: "recordPayment", data: ' data-adm="' + adm + '"' }) +
      "</div>";
    return { html: html };
  }

  function viewBalances(role) {
    var filter = viewBalances.filter || "owing";
    var rows = ALL.map(function (l) { return { l: l, bal: balance(l.adm) }; }).filter(function (r) { return filter === "all" || (filter === "owing" ? r.bal > 0 : r.bal <= 0); });
    rows.sort(function (a, b) { return b.bal - a.bal; });
    var total = rows.reduce(function (a, r) { return a + Math.max(0, r.bal); }, 0);
    var owing = rows.filter(function (r) { return r.bal > 0; }).length;
    var html = pageHead("Fee balances", isTab(role, "balances") ? null : role + "/more") +
      '<div class="card hero-card"><small class="muted">Outstanding · Grade 7 East & Grade 4 (demo)</small><div style="font-size:28px;font-weight:800;margin-top:2px">' + kes(total) + '</div><div class="muted small">' + owing + " learners with a balance · school-wide " + kesShort(SCHOOL.billed - collected()) + "</div></div>" +
      '<div class="seg" style="margin-top:14px">' + [["owing", "Owing"], ["cleared", "Cleared"], ["all", "All"]].map(function (f) {
        return '<button data-act="balFilter" data-f="' + f[0] + '" class="' + (filter === f[0] ? "on" : "") + '">' + f[1] + "</button>";
      }).join("") + "</div>" +
      (owing ? '<button class="btn soft block" style="margin-top:12px" data-act="smsReminders">' + ico("message", "ico-sm") + "Send SMS reminders to " + owing + " parents</button>" : "") +
      '<div class="list" style="margin-top:12px">' + (rows.length ? rows.map(function (r) {
        return item({ avatar: initials(r.l.name), gender: r.l.gender.toLowerCase(), t: esc(r.l.name), s: esc(r.l.adm) + " · " + esc(clsName(r.l)), end: r.bal > 0 ? '<strong class="red">' + kes(r.bal) + "</strong>" : '<span class="badge green">Cleared</span>', go: role + "/student/" + r.l.adm });
      }).join("") : '<div class="empty">Nobody here.</div>') + "</div>";
    return { html: html, fab: isTab(role, "balances") ? '<button class="fab" data-act="recordPayment">' + ico("plus") + "Record payment</button>" : "" };
  }

  function resultsHtml(adm, examKey) {
    var l = learner(adm);
    var s = summary(examKey, adm);
    var subs = subjectsOf(l);
    var rank = rankOf(examKey, adm);
    var rows = subs.map(function (sub, i) {
      var v = s.scores[i];
      return "<tr><td>" + esc(sub) + '</td><td class="num">' + (v == null ? "—" : v) + '</td><td class="num">' + lv(level(v, scaleOf(l))) + "</td></tr>";
    }).join("");
    return '<div class="kpis">' + kpi("chart", "Average", s.count ? s.mean.toFixed(1) + "%" : "—", s.count + " of " + subs.length + " subjects", "purple") + kpi("star", "Overall level", s.level ? lv(s.level) : "—", rank ? "Position " + rank : scaleOf(l) === "cbc4" ? "CBC 4-level scale" : "CBC 8-level scale", "blue") + "</div>" +
      '<div class="card flush" style="margin-top:12px"><table class="tbl"><thead><tr><th>Learning area</th><th class="num">Score</th><th class="num">Level</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<button class="btn ghost block" style="margin-top:12px" data-act="reportCard" data-adm="' + adm + '" data-exam="' + examKey + '">' + ico("receipt", "ico-sm") + "View report card</button>";
  }
  var resultsExam = {};
  function viewResults(role, adm, withChips) {
    var exams = publishedExams();
    var key = resultsExam[adm] && isPublished(resultsExam[adm]) ? resultsExam[adm] : exams[0].key;
    var html = pageHead(role === "student" ? "My results" : "Results") + (withChips ? childChips(role, "results") : "") +
      '<div class="chips" style="margin-top:6px">' + exams.map(function (e) { return '<button class="chip' + (e.key === key ? " on" : "") + '" data-act="pickExam" data-adm="' + adm + '" data-exam="' + e.key + '">' + esc(e.short) + "</button>"; }).join("") + "</div>" +
      '<p class="muted small" style="margin:6px 2px 12px">' + esc(examByKey(key).name) + " · " + esc(learner(adm).name) + "</p>" + resultsHtml(adm, key);
    return { html: html };
  }

  function calendarHtml(adm) {
    var dates = monthDates();
    var t = today();
    var first = (dates[0].getDay() + 6) % 7;
    var cells = ["M", "T", "W", "T", "F", "S", "S"].map(function (d) { return '<div class="dow">' + d + "</div>"; }).join("");
    for (var i = 0; i < first; i++) cells += "<div></div>";
    dates.forEach(function (d) {
      var st = attendance(adm, d);
      cells += '<div class="d ' + (st || "") + (d.getTime() === t.getTime() ? " today" : "") + '">' + d.getDate() + "</div>";
    });
    return '<div class="card"><h3 style="margin-bottom:12px">' + LONG_MONTHS[t.getMonth()] + " " + t.getFullYear() + '</h3><div class="cal">' + cells + '</div><div class="legend"><span><i style="background:var(--brand-50);border:1px solid var(--brand-100)"></i>Present</span><span><i style="background:var(--red)"></i>Absent</span><span><i style="background:#fef0c7"></i>Late</span></div></div>';
  }

  var SHARED = {
    more: viewMore, notices: viewNotices, events: viewEvents, timetable: viewTimetable, staff: viewStaff,
    students: viewStudents, student: viewStudent, balances: viewBalances,
  };

  // ------------------------------------------------------------------ principal

  function principalHome(role) {
    var p = D.ROLES[role];
    var pct = Math.round((collected() / SCHOOL.billed) * 100);
    var max = Math.max.apply(null, D.MONTHLY.map(function (m) { return m[1]; }));
    var bars = D.MONTHLY.map(function (m, i) {
      return '<div class="b' + (i === D.MONTHLY.length - 1 ? " now" : "") + '"><i style="height:' + Math.max(2, Math.round((m[1] / max) * 100)) + '%"></i><span>' + m[0] + "</span></div>";
    }).join("");
    var reg = S.attendance[iso(today())];
    var attPct = 96;
    var attSub = "292 of 304 present";
    if (reg) {
      var absent = Object.keys(reg).filter(function (k) { return reg[k] === "A"; }).length;
      attPct = Math.round(((SCHOOL.learners - 12 - absent) / SCHOOL.learners) * 100);
      attSub = "Grade 7 East: " + (D.G7E.length - absent) + "/" + D.G7E.length;
    }
    var um = unmatched().length;
    var html =
      '<div class="greet"><h1>' + greeting() + ", " + esc(p.first) + '</h1><p>' + fmtDate(new Date()) + " · " + esc(SCHOOL.term) + "</p></div>" +
      '<div class="card hero-card" style="margin-top:14px"><small class="muted">Fee collection · ' + esc(SCHOOL.term) + '</small><div style="font-size:30px;font-weight:800;letter-spacing:-.5px">' + kesShort(collected()) + '</div><div class="muted small" style="margin-bottom:10px">of ' + kesShort(SCHOOL.billed) + " billed · " + pct + '% collected</div><div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      (um ? '<a class="note" style="margin-top:12px" href="#/' + role + '/finance">' + ico("alert") + "<span><b>" + um + " M-Pesa payments</b> need matching to a learner.</span></a>" : "") +
      '<div class="kpis" style="margin-top:12px">' +
      kpi("users", "Learners", SCHOOL.learners, "158 boys · 146 girls", "blue") +
      kpi("user", "Staff", SCHOOL.staff, "15 teaching · 9 support", "purple") +
      kpi("cash", "Collected today", kesShort(collectedToday()), feed().filter(function (x) { return x.at >= today().getTime(); }).length + " payments") +
      kpi("register", "Attendance today", attPct + "%", attSub, "amber") + "</div>" +
      sectionTitle("Quick actions") + '<div class="actions">' +
      '<button class="action" data-act="recordPayment"><span class="lead-ico">' + ico("cash") + "</span>Record payment</button>" +
      '<button class="action" data-act="newNotice"><span class="lead-ico amber">' + ico("megaphone") + "</span>Send notice</button>" +
      '<a class="action" href="#/' + role + '/academics"><span class="lead-ico purple">' + ico("chart") + "</span>Results</a>" +
      '<a class="action" href="#/' + role + '/balances"><span class="lead-ico red">' + ico("wallet") + "</span>Balances</a></div>" +
      sectionTitle("Fee collections " + today().getFullYear()) + '<div class="card"><div class="bars">' + bars + "</div></div>" +
      sectionTitle("Latest payments", '<a href="#/' + role + '/finance">See all</a>') + '<div class="list">' + feed().slice(0, 4).map(function (x) { return paymentItem(x, !!x.adm); }).join("") + "</div>" +
      sectionTitle("Coming up", '<a href="#/' + role + '/events">Calendar</a>') + '<div class="list">' + upcomingEvents().slice(0, 3).map(function (e) {
        return item({ icon: "calendar", tone: "blue", t: esc(e.title), s: fmtDate(parseISO(e.date)) + (e.place ? " · " + esc(e.place) : "") });
      }).join("") + "</div>";
    return { html: html };
  }

  function financeView(role) {
    var billed = SCHOOL.billed;
    var col = collected();
    var methodsMax = D.METHODS[0][1];
    var um = unmatched();
    var html = pageHead("Finance") +
      '<div class="kpis">' + kpi("receipt", "Billed this term", kesShort(billed), SCHOOL.term, "blue") + kpi("cash", "Collected", kesShort(col), Math.round((col / billed) * 100) + "% of billed") +
      kpi("wallet", "Outstanding", kesShort(billed - col), "All active learners", "red") + kpi("trend", "Collected today", kesShort(collectedToday()), "Updates as payments arrive", "amber") + "</div>" +
      (um.length ? sectionTitle("Needs matching") + '<div class="list">' + um.map(function (u) {
        return item({ icon: "alert", tone: "amber", t: esc(u.payer) + " · " + kes(u.amount), s: 'Account “' + esc(u.account) + '” · <span class="mono">' + esc(u.code) + "</span>", act: "match", data: ' data-id="' + u.id + '"' });
      }).join("") + "</div>" : "") +
      sectionTitle("By payment method") + '<div class="card">' + D.METHODS.map(function (m) {
        return '<div class="meter"><span>' + m[0] + '</span><div class="progress"><i style="width:' + Math.round((m[1] / methodsMax) * 100) + '%"></i></div><b class="small">' + kesShort(m[1] + (m[0] === "M-Pesa" ? S.payments.filter(function (p) { return p.method === "M-Pesa"; }).reduce(function (a, p) { return a + p.amount; }, 0) : 0)) + "</b></div>";
      }).join("") + "</div>" +
      sectionTitle("Payments", role === "principal" ? '<a href="#/' + role + '/balances">Balances</a>' : "") + '<div class="list">' + feed().slice(0, 12).map(function (x) { return paymentItem(x, !!x.adm); }).join("") + "</div>";
    return { html: html, fab: '<button class="fab" data-act="recordPayment">' + ico("plus") + "Record payment</button>" };
  }

  function academicsView(role) {
    var entered = mathsEntered();
    var html = pageHead("Academics") +
      '<div class="list">' + D.EXAMS.map(function (e) {
        var pub = isPublished(e.key);
        return item({ icon: pub ? "chart" : "pencil", tone: pub ? "purple" : "amber", t: esc(e.name), s: pub ? "Published to parents" : "Marks entry open · Maths " + entered + "/" + D.G7E.length + " entered", end: pub ? '<span class="badge green">Published</span>' : '<span class="badge amber">Open</span>', go: role + "/exam/" + e.key });
      }).join("") + "</div>" +
      sectionTitle("Grade 7 East · T3 Opener") + '<div class="card flush"><table class="tbl"><thead><tr><th>#</th><th>Learner</th><th class="num">Mean</th><th class="num">Level</th></tr></thead><tbody>' +
      meritList("opener").slice(0, 5).map(function (r) { return "<tr><td>" + r.rank + "</td><td>" + esc(r.l.name) + '</td><td class="num">' + r.mean.toFixed(1) + '</td><td class="num">' + lv(r.level) + "</td></tr>"; }).join("") +
      '</tbody></table></div><a class="btn ghost block" style="margin-top:12px" href="#/' + role + '/exam/opener">Full merit list & analysis</a>';
    return { html: html };
  }

  function examView(role, key) {
    var e = examByKey(key);
    if (!e) return { html: '<div class="empty">Exam not found.</div>' };
    var pub = isPublished(key);
    var html = pageHead(e.short, role + "/academics") + '<p class="muted small" style="margin:-6px 2px 12px">' + esc(e.name) + " · Grade 7 East</p>";
    if (!pub) {
      var entered = mathsEntered();
      html += '<div class="card"><h3>Marks entry</h3><p class="muted small" style="margin-bottom:12px">Teachers enter marks on their phones. Elimuhub applies CBC levels and ranks learners automatically.</p>' +
        D.CLASSES.G7E.subjects.map(function (s) {
          var n = s === "Mathematics" ? entered : D.G7E.length;
          return '<div class="meter" style="grid-template-columns:minmax(0,1fr) 80px auto"><span class="small">' + esc(s) + '</span><div class="progress"><i style="width:' + Math.round((n / D.G7E.length) * 100) + '%"></i></div><b class="small">' + n + "/" + D.G7E.length + "</b></div>";
        }).join("") + "</div>" +
        '<button class="btn block" style="margin-top:14px" data-act="publish" data-exam="' + key + '">' + ico("send", "ico-sm") + "Publish results to parents</button>" +
        '<p class="hint center">Parents and learners get a notification and can open report cards straight away.</p>';
      return { html: html };
    }
    var rows = meritList(key);
    var subs = D.CLASSES.G7E.subjects;
    var means = subs.map(function (s, i) {
      var vals = D.G7E.map(function (l) { return scores(key, l.adm)[i]; }).filter(function (v) { return v != null; });
      return vals.length ? vals.reduce(function (a, v) { return a + v; }, 0) / vals.length : 0;
    });
    html += '<div class="card flush"><table class="tbl"><thead><tr><th>#</th><th>Learner</th><th class="num">Total</th><th class="num">Level</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr data-act="reportCard" data-adm="' + r.l.adm + '" data-exam="' + key + '"><td>' + r.rank + "</td><td>" + esc(r.l.name) + '<div class="muted small">' + r.l.adm + '</div></td><td class="num">' + r.total + '</td><td class="num">' + lv(r.level) + "</td></tr>"; }).join("") +
      "</tbody></table></div>" + '<p class="hint">Tap a learner to open their report card.</p>' +
      sectionTitle("Subject analysis") + '<div class="card">' + subs.map(function (s, i) {
        return '<div class="meter" style="grid-template-columns:minmax(0,1fr) 70px auto"><span class="small">' + esc(s) + '</span><div class="progress"><i style="width:' + Math.round(means[i]) + '%"></i></div><b class="small">' + means[i].toFixed(1) + "</b></div>";
      }).join("") + "</div>";
    return { html: html };
  }

  // ------------------------------------------------------------------ bursar

  function bursarHome(role) {
    var p = D.ROLES[role];
    var um = unmatched();
    var html =
      '<div class="greet"><h1>' + greeting() + ", " + esc(p.first) + '</h1><p>' + fmtDate(new Date()) + " · " + esc(SCHOOL.term) + "</p></div>" +
      '<div class="card hero-card" style="margin-top:14px"><small class="muted">Collected today</small><div style="font-size:30px;font-weight:800">' + kes(collectedToday()) + '</div><div class="muted small">' + kesShort(collected()) + " this term · paybill " + SCHOOL.paybill + "</div></div>" +
      (um.length ? '<a class="note" style="margin-top:12px" href="#/' + role + '/payments">' + ico("alert") + "<span><b>" + um.length + " M-Pesa payments</b> didn't match an admission number. Tap to match them.</span></a>" : '<div class="note green" style="margin-top:12px">' + ico("check") + "<span>All M-Pesa payments are matched.</span></div>") +
      '<div class="kpis" style="margin-top:12px">' + kpi("receipt", "Billed", kesShort(SCHOOL.billed), SCHOOL.term, "blue") + kpi("wallet", "Outstanding", kesShort(SCHOOL.billed - collected()), "All learners", "red") + "</div>" +
      sectionTitle("Quick actions") + '<div class="actions">' +
      '<button class="action" data-act="recordPayment"><span class="lead-ico">' + ico("cash") + "</span>Record payment</button>" +
      '<a class="action" href="#/' + role + '/payments"><span class="lead-ico amber">' + ico("phone") + "</span>M-Pesa</a>" +
      '<button class="action" data-act="smsReminders"><span class="lead-ico blue">' + ico("message") + "</span>SMS reminders</button>" +
      '<a class="action" href="#/' + role + '/balances"><span class="lead-ico red">' + ico("wallet") + "</span>Balances</a></div>" +
      sectionTitle("Latest payments", '<a href="#/' + role + '/payments">See all</a>') + '<div class="list">' + feed().slice(0, 5).map(function (x) { return paymentItem(x, !!x.adm); }).join("") + "</div>";
    return { html: html, fab: '<button class="fab" data-act="recordPayment">' + ico("plus") + "Record payment</button>" };
  }

  function paymentsView(role) {
    var mode = paymentsView.mode || (unmatched().length ? "unmatched" : "all");
    var um = unmatched();
    var html = pageHead("Payments") +
      '<div class="seg">' + [["all", "All payments"], ["unmatched", "Unmatched (" + um.length + ")"]].map(function (m) { return '<button data-act="payMode" data-m="' + m[0] + '" class="' + (mode === m[0] ? "on" : "") + '">' + m[1] + "</button>"; }).join("") + "</div>";
    if (mode === "unmatched") {
      html += '<p class="muted small" style="margin:12px 2px">Parents sometimes type the wrong account number. Match the payment to a learner and Elimuhub issues the receipt.</p>' +
        (um.length ? '<div class="list">' + um.map(function (u) {
          return item({ icon: "phone", tone: "amber", t: esc(u.payer) + " · " + kes(u.amount), s: 'Account “' + esc(u.account) + '” · ' + esc(u.phone) + " · " + ago(LOADED_AT - u.minutesAgo * 60000), act: "match", data: ' data-id="' + u.id + '"' });
        }).join("") + "</div>" : '<div class="card empty"><span class="lead-ico">' + ico("check") + "</span>All M-Pesa payments are matched.</div>");
    } else {
      html += '<div class="list" style="margin-top:12px">' + feed().map(function (x) { return paymentItem(x, !!x.adm); }).join("") + "</div>";
    }
    return { html: html, fab: '<button class="fab" data-act="recordPayment">' + ico("plus") + "Record payment</button>" };
  }

  // ------------------------------------------------------------------ teacher

  var TEACHER = "James Kiprono";
  /** Mr. Kiprono's lessons outside Grade 7 East (Mon–Fri): [period, subject, class]. */
  var TEACHER_OTHER = [
    [["Lesson 1", "Mathematics", "Grade 8 West"], ["Lesson 5", "Mathematics", "Grade 9 East"]],
    [["Lesson 2", "Mathematics", "Grade 8 West"], ["Lesson 7", "Physics", "Form 3 North"]],
    [["Lesson 6", "Physics", "Form 4"]],
    [["Lesson 1", "Mathematics", "Grade 9 East"], ["Lesson 8", "Physics", "Form 3 North"]],
    [["Lesson 4", "Mathematics", "Grade 8 West"]],
  ];
  function teacherHome(role) {
    var p = D.ROLES[role];
    var t = today();
    var reg = S.attendance[iso(t)];
    var sd = schoolDay(t);
    var mine = [];
    if (sd >= 0) {
      var lesson = 0;
      D.PERIODS.forEach(function (per) {
        if (per.isBreak) return;
        var s = D.TIMETABLE.G7E[sd][lesson++];
        if (D.TEACHERS[s] === TEACHER) mine.push({ per: per, s: s, cls: "Grade 7 East" });
        TEACHER_OTHER[sd].forEach(function (o) { if (o[0] === per.name) mine.push({ per: per, s: o[1], cls: o[2] }); });
      });
    }
    var absent = reg ? Object.keys(reg).filter(function (k) { return reg[k] === "A"; }).length : 0;
    var entered = mathsEntered();
    var html =
      '<div class="greet"><h1>' + greeting() + ", " + esc(p.first) + '</h1><p>' + fmtDate(new Date()) + " · Class teacher, Grade 7 East</p></div>" +
      '<div class="card" style="margin-top:14px"><div class="row"><span class="lead-ico">' + ico("register") + '</span><div class="spacer"><h3>Today\'s register</h3><div class="muted small">' +
      (reg ? D.G7E.length - absent + " present · " + absent + " absent" : "Grade 7 East · " + D.G7E.length + " learners") + "</div></div>" +
      (reg ? '<span class="badge green">Done</span>' : '<a class="btn sm" href="#/' + role + '/attendance">Take register</a>') + "</div></div>" +
      '<div class="card"><div class="row"><span class="lead-ico amber">' + ico("pencil") + '</span><div class="spacer"><h3>T3 Mid-Term · Mathematics</h3><div class="muted small">' + entered + "/" + D.G7E.length + " marks entered" + (isPublished("midterm3") ? " · published" : "") + '</div></div><a class="btn sm ghost" href="#/' + role + '/marks">' + (entered ? "Continue" : "Enter marks") + "</a></div>" +
      '<div class="progress" style="margin-top:12px"><i style="width:' + Math.round((entered / D.G7E.length) * 100) + '%"></i></div></div>' +
      sectionTitle("My lessons today", '<a href="#/' + role + '/timetable">Timetable</a>') +
      (mine.length ? '<div class="list">' + mine.map(function (m) { return item({ icon: "clock", tone: m.cls === "Grade 7 East" ? "" : "blue", t: esc(m.s) + " · " + esc(m.cls), s: m.per.start + "–" + m.per.end + " · " + esc(m.per.name) }); }).join("") + "</div>" : '<div class="card empty">' + (sd < 0 ? "No lessons at the weekend." : "No lessons today.") + "</div>") +
      sectionTitle("Notices", '<a href="#/' + role + '/notices">All</a>') + '<div class="list">' + notices(role).slice(0, 2).map(function (n) { return item({ icon: "megaphone", t: esc(n.title), s: ago(n.at), act: "notice", data: ' data-id="' + n.id + '"' }); }).join("") + "</div>";
    return { html: html };
  }

  var draftRegister = null;
  function registerView(role) {
    var t = today();
    var key = iso(t);
    if (!draftRegister || draftRegister.key !== key) {
      var saved = S.attendance[key] || {};
      draftRegister = { key: key, marks: {} };
      D.G7E.forEach(function (l) { draftRegister.marks[l.adm] = saved[l.adm] || "P"; });
    }
    var m = draftRegister.marks;
    var counts = { P: 0, A: 0, L: 0 };
    D.G7E.forEach(function (l) { counts[m[l.adm]]++; });
    var html = pageHead("Register") + '<p class="muted small" style="margin:-6px 2px 12px">Grade 7 East · ' + fmtDate(t) + (S.attendance[key] ? " · saved" : "") + "</p>" +
      (schoolDay(t) < 0 ? '<div class="note blue" style="margin-bottom:12px">' + ico("info") + "<span>It's the weekend, but you can still try the register.</span></div>" : "") +
      '<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + kpi("check", "Present", counts.P) + kpi("x", "Absent", counts.A, "", "red") + kpi("clock", "Late", counts.L, "", "amber") + "</div>" +
      '<div class="row" style="margin:14px 2px 8px"><span class="muted small spacer">Tap P, A or L for each learner</span><button class="link-btn" data-act="allPresent">Mark all present</button></div>' +
      '<div class="list">' + D.G7E.map(function (l) {
        return '<div class="item"><span class="avatar ' + l.gender.toLowerCase() + '">' + initials(l.name) + '</span><span class="body"><span class="t">' + esc(l.name) + '</span><span class="s">' + l.adm + '</span></span><span class="reg">' +
          ["P", "A", "L"].map(function (s) { return '<button class="' + s + (m[l.adm] === s ? " on" : "") + '" data-act="regMark" data-adm="' + l.adm + '" data-s="' + s + '" aria-label="' + { P: "Present", A: "Absent", L: "Late" }[s] + '">' + s + "</button>"; }).join("") + "</span></div>";
      }).join("") + "</div>" +
      '<div class="sticky-foot"><button class="btn block" data-act="saveRegister">' + ico("check", "ico-sm") + (S.attendance[key] ? "Update register" : "Save register") + (counts.A ? " · alert " + counts.A + " parent" + (counts.A > 1 ? "s" : "") : "") + "</button></div>";
    return { html: html };
  }

  var draftMarks = null;
  function marksView(role) {
    var saved = S.marks["midterm3:Mathematics"] || {};
    if (!draftMarks) { draftMarks = {}; Object.keys(saved).forEach(function (k) { draftMarks[k] = saved[k]; }); }
    var pub = isPublished("midterm3");
    var html = pageHead("Marks entry") + '<p class="muted small" style="margin:-6px 2px 12px">Term 3 Mid-Term Exam 2026 · Mathematics · Grade 7 East · out of 100</p>' +
      (pub ? '<div class="note green" style="margin-bottom:12px">' + ico("check") + "<span>These results are published. Parents can see them.</span></div>" : '<div class="note blue" style="margin-bottom:12px">' + ico("info") + "<span>Type a score and the CBC level appears instantly (Junior School 8-level scale).</span></div>") +
      '<div class="list">' + D.G7E.map(function (l) {
        var v = draftMarks[l.adm];
        return '<div class="item"><span class="body"><span class="t">' + esc(l.name) + '</span><span class="s">' + l.adm + '</span></span><input class="input mark-input" type="number" inputmode="numeric" min="0" max="100" data-adm="' + l.adm + '" value="' + (v == null ? "" : v) + '"' + (pub ? " disabled" : "") + ' aria-label="Score for ' + esc(l.name) + '"><span data-lv="' + l.adm + '">' + lv(level(v, "cbc8")) + "</span></div>";
      }).join("") + "</div>" +
      (pub ? "" : '<div class="sticky-foot"><div class="btn-row"><button class="btn ghost" data-act="fillMarks">Fill sample</button><button class="btn" data-act="saveMarks">' + ico("check", "ico-sm") + "Save marks</button></div></div>");
    return {
      html: html,
      bind: function (root) {
        root.querySelectorAll(".mark-input").forEach(function (input) {
          input.addEventListener("input", function () {
            var raw = input.value.trim();
            var v = raw === "" ? null : clamp(Math.round(Number(raw)), 0, 100);
            if (raw !== "" && Number(raw) > 100) input.value = "100";
            draftMarks[input.dataset.adm] = v;
            root.querySelector('[data-lv="' + input.dataset.adm + '"]').innerHTML = lv(level(v, "cbc8"));
          });
        });
      },
    };
  }

  function teacherTimetable(role) {
    return { html: pageHead("Timetable") + '<p class="muted small" style="margin:-6px 2px 12px">Grade 7 East · your lessons are highlighted</p>' + timetableHtml("G7E", { teacher: TEACHER }) };
  }

  // ------------------------------------------------------------------ parent

  function parentHome(role) {
    var p = D.ROLES[role];
    var showNotify = notifySupported() && !canNotify();
    var kids = D.CHILDREN.map(function (adm) {
      var l = learner(adm);
      var bal = balance(adm);
      var s = summary("opener", adm);
      var att = attendanceStats(adm);
      return '<div class="card"><div class="row"><span class="avatar ' + l.gender.toLowerCase() + '">' + initials(l.name) + '</span><div class="spacer"><h3>' + esc(l.name) + '</h3><div class="muted small">' + esc(clsName(l)) + " · Adm " + l.adm + "</div></div></div>" +
        '<div class="totals"><div><span>Fee balance</span><b class="' + (bal > 0 ? "red" : "green") + '" style="font-size:14px">' + (bal > 0 ? kes(bal) : "Cleared") + "</b></div><div><span>T3 Opener</span><b style=\"font-size:14px\">" + s.level + " · " + s.mean.toFixed(1) + '%</b></div><div><span>Attendance</span><b style="font-size:14px">' + att.pct + "%</b></div></div>" +
        '<div class="btn-row"><button class="btn sm" data-act="payMpesa" data-adm="' + adm + '">' + ico("phone", "ico-sm") + 'Pay with M-Pesa</button><button class="btn sm ghost" data-act="openChild" data-adm="' + adm + '" data-tab="results">Results</button></div></div>';
    }).join("");
    var html =
      '<div class="greet"><h1>Hello, ' + esc(p.first) + ' 👋</h1><p>' + esc(SCHOOL.term) + " · ends " + fmtDate(parseISO(SCHOOL.termEnd)) + "</p></div>" +
      (showNotify ? '<div class="card" style="margin-top:14px"><div class="row"><span class="lead-ico amber">' + ico("bell") + '</span><div class="spacer"><h3>Get instant notifications</h3><div class="muted small">Receipts, results, absence alerts and notices on this phone.</div></div></div><button class="btn block sm" style="margin-top:12px" data-act="enableNotify">Turn on notifications</button></div>' : "") +
      '<div style="margin-top:14px">' + kids + "</div>" +
      sectionTitle("Notices", '<a href="#/' + role + '/notices">All</a>') + '<div class="list">' + notices(role).slice(0, 3).map(function (n) { return item({ icon: "megaphone", tone: n.audience === "parents" ? "amber" : "", t: esc(n.title), s: ago(n.at), act: "notice", data: ' data-id="' + n.id + '"' }); }).join("") + "</div>" +
      sectionTitle("Coming up", '<a href="#/' + role + '/events">Calendar</a>') + '<div class="list">' + upcomingEvents().slice(0, 2).map(function (e) { return item({ icon: "calendar", tone: "blue", t: esc(e.title), s: fmtDate(parseISO(e.date)) }); }).join("") + "</div>";
    return { html: html };
  }

  /** Term 3 entries that add up to the learner's balance, for learners without a real statement. */
  function syntheticStatement(adm) {
    var base = baseBalance(adm);
    var fees = 27700;
    var start = parseISO(SCHOOL.termStart);
    var st = [{ type: "invoice", date: SCHOOL.termStart, ref: "INV-T3-" + adm.slice(2), label: "Term 3 fees", amount: fees }];
    if (base > fees) st.unshift({ type: "invoice", date: iso(new Date(start.getTime() - 86400000)), ref: "BAL-B/F", label: "Balance brought forward", amount: base - fees });
    if (base < fees) st.push({ type: "payment", date: iso(new Date(start.getTime() + 9 * 86400000)), ref: "RCT-00" + (1000 + (hash(adm) % 700)), label: "M-Pesa payment", amount: fees - base, synthetic: true });
    return st;
  }
  function statementRows(adm) {
    var st = (D.STATEMENTS[adm] || syntheticStatement(adm)).map(function (e) { return Object.assign({}, e, { d: parseISO(e.date).getTime() }); });
    paymentsFor(adm).forEach(function (p) { st.push({ type: "payment", d: p.at, ref: p.receipt, label: p.method + " " + p.code, amount: p.amount, method: p.method }); });
    st.sort(function (a, b) { return a.d - b.d; });
    var run = 0;
    st.forEach(function (e) { run += e.type === "invoice" ? e.amount : -e.amount; e.running = run; });
    return st.reverse();
  }
  function statementHtml(adm) {
    return '<div class="list">' + statementRows(adm).map(function (e) {
      var inv = e.type === "invoice";
      return item({ icon: inv ? "receipt" : "cash", tone: inv ? "amber" : "", t: esc(e.label), s: fmtDay(new Date(e.d)) + ' · <span class="mono">' + esc(e.ref) + "</span>", end: '<strong class="' + (inv ? "" : "green") + '">' + (inv ? "+" : "−") + " " + kes(e.amount) + "</strong><small>Bal " + kes(e.running) + "</small>", act: inv || e.synthetic ? null : "receipt", data: inv || e.synthetic ? "" : ' data-receipt="' + e.ref + '"', noChev: true });
    }).join("") + "</div>";
  }
  function parentFees(role) {
    var adm = S.child;
    var l = learner(adm);
    var bal = balance(adm);
    var html = pageHead("Fees & payments") + childChips(role, "fees") +
      '<div class="card hero-card" style="margin-top:10px"><small class="muted">' + esc(l.name) + " · current balance</small><div style=\"font-size:32px;font-weight:800;letter-spacing:-.5px\">" + (bal > 0 ? kes(bal) : "Cleared 🎉") + '</div><div class="muted small">' + esc(SCHOOL.term) + " · " + esc(clsName(l)) + "</div>" +
      '<button class="btn accent block" style="margin-top:14px" data-act="payMpesa" data-adm="' + adm + '">' + ico("phone", "ico-sm") + "Pay with M-Pesa</button></div>" +
      '<div class="card" style="margin-top:12px"><h3>Or pay by Paybill</h3><ol class="small" style="margin:8px 0 0;padding-left:20px;line-height:1.9"><li>M-Pesa → Lipa na M-Pesa → <b>Pay Bill</b></li><li>Business number: <b>' + SCHOOL.paybill + "</b></li><li>Account number: <b>" + adm + '</b></li><li>Enter the amount and your PIN</li></ol><p class="hint">The receipt arrives in this app automatically.</p></div>' +
      sectionTitle("Statement") + statementHtml(adm);
    return { html: html };
  }
  function parentResults(role) { return viewResults(role, S.child, true); }
  function parentAttendance(role) {
    var adm = S.child;
    var st = attendanceStats(adm);
    var html = pageHead("Attendance") + childChips(role, "attendance") +
      '<div class="kpis" style="margin-top:10px;grid-template-columns:repeat(3,minmax(0,1fr))">' + kpi("check", "Present", st.pct + "%", st.P + " days") + kpi("x", "Absent", st.A, st.A === 1 ? "day" : "days", "red") + kpi("clock", "Late", st.L, st.L === 1 ? "day" : "days", "amber") + "</div>" +
      '<div style="margin-top:12px">' + calendarHtml(adm) + "</div>" +
      (st.absentDays.length ? sectionTitle("Absent on") + '<div class="list">' + st.absentDays.map(function (d) { return item({ icon: "alert", tone: "red", t: fmtDate(d), s: "You were sent an SMS and app alert" }); }).join("") + "</div>" : "");
    return { html: html };
  }

  // ------------------------------------------------------------------ student

  var BRIAN = "MA0120";
  function studentHome(role) {
    var t = today();
    var sd = schoolDay(t);
    var lessons = [];
    if (sd >= 0) { var i = 0; D.PERIODS.forEach(function (p) { if (!p.isBreak) lessons.push({ p: p, s: D.TIMETABLE.G7E[sd][i++] }); }); }
    var now = new Date();
    var nowStr = pad(now.getHours(), 2) + ":" + pad(now.getMinutes(), 2);
    var next = lessons.filter(function (x) { return x.p.end > nowStr; })[0];
    var due = D.ASSIGNMENTS.filter(function (a) { return !isDone(a); });
    var s = summary("opener", BRIAN);
    var html =
      '<div class="greet"><h1>Hi Brian 👋</h1><p>' + fmtDate(new Date()) + " · Grade 7 East</p></div>" +
      '<div class="card hero-card" style="margin-top:14px"><small class="muted">' + (sd < 0 ? "No lessons today" : next ? (next.p.start <= nowStr ? "Now" : "Next lesson") + " · " + next.p.start + "–" + next.p.end : "Lessons are over for today") + '</small><div style="font-size:22px;font-weight:800;margin-top:2px">' + (sd < 0 ? "Enjoy your weekend" : next ? esc(next.s) : "See you tomorrow") + '</div><div class="muted small">' + (next && sd >= 0 ? esc(D.TEACHERS[next.s]) : "Check your homework below") + "</div></div>" +
      '<div class="kpis" style="margin-top:12px">' + kpi("book", "Homework due", due.length, due.length ? "Next: " + esc(due[0].subject) : "All done", "amber") + kpi("chart", "T3 Opener", s.mean.toFixed(1) + "%", s.level + " · position " + rankOf("opener", BRIAN), "purple") + "</div>" +
      sectionTitle("Homework", '<a href="#/' + role + '/assignments">All</a>') + '<div class="list">' + (due.length ? due.slice(0, 3).map(assignmentItem).join("") : '<div class="empty">No homework due. 🎉</div>') + "</div>" +
      sectionTitle("Today", '<a href="#/' + role + '/timetable">Timetable</a>') + (lessons.length ? '<div class="list">' + lessons.map(function (x) { return item({ icon: "clock", tone: x === next ? "amber" : "blue", t: esc(x.s), s: x.p.start + "–" + x.p.end + " · " + esc(D.TEACHERS[x.s]) }); }).join("") + "</div>" : '<div class="card empty">No lessons at the weekend.</div>');
    return { html: html };
  }
  function isDone(a) { return S.done[a.id] != null ? S.done[a.id] : !!a.done; }
  function dueLabel(a) {
    if (a.dueIn < 0) return "Was due " + fmtDate(new Date(today().getTime() + a.dueIn * 86400000));
    if (a.dueIn === 0) return "Due today";
    if (a.dueIn === 1) return "Due tomorrow";
    return "Due " + fmtDate(new Date(today().getTime() + a.dueIn * 86400000));
  }
  function assignmentItem(a) {
    var done = isDone(a);
    return item({ icon: done ? "check" : "book", tone: done ? "" : a.dueIn <= 1 ? "red" : "amber", t: esc(a.title), s: esc(a.subject) + " · " + (done ? "Done" : dueLabel(a)), act: "assignment", data: ' data-id="' + a.id + '"' });
  }
  function studentTimetable(role) { return { html: pageHead("Timetable") + '<p class="muted small" style="margin:-6px 2px 12px">Grade 7 East · ' + esc(SCHOOL.term) + "</p>" + timetableHtml("G7E") }; }
  function studentAssignments(role) {
    var mode = studentAssignments.mode || "pending";
    var list = D.ASSIGNMENTS.filter(function (a) { return mode === "done" ? isDone(a) : !isDone(a); });
    return {
      html: pageHead("Homework") + '<div class="seg">' + [["pending", "To do"], ["done", "Done"]].map(function (m) { return '<button data-act="hwMode" data-m="' + m[0] + '" class="' + (mode === m[0] ? "on" : "") + '">' + m[1] + "</button>"; }).join("") + "</div>" +
        '<div class="list" style="margin-top:12px">' + (list.length ? list.map(assignmentItem).join("") : '<div class="empty">' + (mode === "done" ? "Nothing done yet." : "All caught up! 🎉") + "</div>") + "</div>",
    };
  }
  function studentResults(role) { return viewResults(role, BRIAN, false); }

  var VIEWS = {
    principal: { home: principalHome, finance: financeView, academics: academicsView, exam: examView },
    bursar: { home: bursarHome, payments: paymentsView },
    teacher: { home: teacherHome, attendance: registerView, marks: marksView, timetable: teacherTimetable },
    parent: { home: parentHome, fees: parentFees, results: parentResults, attendance: parentAttendance },
    student: { home: studentHome, timetable: studentTimetable, assignments: studentAssignments, results: studentResults },
  };

  // ------------------------------------------------------------------ sheets & flows

  function learnerOptions(selected) {
    return ALL.map(function (l) { return '<option value="' + l.adm + '"' + (l.adm === selected ? " selected" : "") + ">" + esc(l.name) + " · " + l.adm + " · " + esc(clsName(l)) + "</option>"; }).join("");
  }
  function mpesaCode() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var s = "S";
    for (var i = 0; i < 9; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /** Records a payment, updates the balance and notifies the right people. */
  function addPayment(adm, amount, method, code) {
    var l = learner(adm);
    var p = { receipt: "RCT-" + pad(S.receiptNo++, 6), adm: adm, name: l.name, cls: clsName(l), amount: amount, method: method, code: code || "—", at: Date.now() };
    S.payments.push(p);
    var bal = balance(adm);
    if (D.CHILDREN.indexOf(adm) >= 0) addNote(["parent"], "Payment received", kes(amount) + " for " + l.name + ". Receipt " + p.receipt + ". New balance " + kes(Math.max(0, bal)) + ".");
    addNote(["bursar", "principal"], method === "M-Pesa" ? "M-Pesa payment received" : "Payment recorded", kes(amount) + " for " + l.name + " (" + clsName(l) + "). Receipt " + p.receipt + ".");
    save();
    return p;
  }
  function findPayment(receipt) {
    for (var i = 0; i < S.payments.length; i++) if (S.payments[i].receipt === receipt) return S.payments[i];
    for (var k in D.STATEMENTS) {
      var st = D.STATEMENTS[k];
      for (var j = 0; j < st.length; j++) if (st[j].ref === receipt) { var l = learner(k); return { receipt: receipt, adm: k, name: l.name, cls: clsName(l), amount: st[j].amount, method: st[j].method, code: st[j].label.replace(/^M-Pesa /, ""), at: parseISO(st[j].date).getTime() }; }
    }
    return null;
  }
  function receiptHtml(p) {
    var bal = balance(p.adm);
    return '<div class="doc"><div class="doc-head"><div class="crest">MA</div><div><strong>' + esc(SCHOOL.name.toUpperCase()) + "</strong><span>" + esc(SCHOOL.postal) + "</span><span>Tel " + esc(SCHOOL.phone) + " · " + esc(SCHOOL.email) + "</span></div></div>" +
      '<div class="doc-title">OFFICIAL RECEIPT</div><div class="kv"><div><span>Receipt no.</span><b>' + p.receipt + "</b></div><div><span>Date</span><b>" + fmtDay(new Date(p.at)) + "</b></div><div><span>Learner</span><b>" + esc(p.name) + "</b></div><div><span>Adm no. · Class</span><b>" + p.adm + " · " + esc(p.cls) + "</b></div><div><span>Paid by</span><b>" + esc(p.method) + '</b></div><div><span>Reference</span><b class="mono">' + esc(p.code) + "</b></div></div>" +
      '<div class="totals" style="grid-template-columns:1fr 1fr"><div><span>Amount paid</span><b class="green">' + kes(p.amount) + "</b></div><div><span>Balance now</span><b class=\"" + (bal > 0 ? "red" : "green") + '">' + kes(Math.max(0, bal)) + "</b></div></div>" +
      '<p class="muted small center">Thank you. This receipt was generated by Elimuhub.</p></div>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-act="shareReceipt" data-receipt="' + p.receipt + '">' + ico("share", "ico-sm") + 'Share</button><button class="btn" data-act="closeSheet">Done</button></div>';
  }
  function showReceipt(p) { openSheet("Receipt", receiptHtml(p)); }

  function reportCardHtml(adm, examKey) {
    var l = learner(adm);
    var s = summary(examKey, adm);
    var subs = subjectsOf(l);
    var rank = rankOf(examKey, adm);
    var att = attendanceStats(adm);
    var overall = s.level || "";
    var good = /^(EE|ME1|ME$)/.test(overall);
    var ok = /^(ME2|AE1)$/.test(overall) || overall === "ME";
    var teacherRemark = good ? firstName(l) + " has worked well this term. Keep it up!" : ok ? firstName(l) + " is making steady progress. More effort in weaker areas will lift the results." : firstName(l) + " needs more support. Let us work together at home and in school.";
    return '<div class="doc"><div class="doc-head"><div class="crest">MA</div><div><strong>' + esc(SCHOOL.name.toUpperCase()) + '</strong><span>"' + esc(SCHOOL.motto) + '"</span><span>' + esc(SCHOOL.postal) + "</span></div></div>" +
      '<div class="doc-title">LEARNER\'S PROGRESS REPORT</div><div class="kv"><div><span>Name</span><b>' + esc(l.name) + "</b></div><div><span>Adm no.</span><b>" + l.adm + "</b></div><div><span>Class</span><b>" + esc(clsName(l)) + "</b></div><div><span>Exam</span><b>" + esc(examByKey(examKey).name) + "</b></div></div>" +
      '<table class="tbl"><thead><tr><th>Learning area</th><th class="num">Score</th><th class="num">Level</th></tr></thead><tbody>' +
      subs.map(function (sub, i) { var v = s.scores[i]; var code = level(v, scaleOf(l)); return "<tr><td>" + esc(sub) + '<div class="muted" style="font-size:11.5px">' + esc(code ? D.REMARKS[code] : "Not entered") + '</div></td><td class="num">' + (v == null ? "—" : v) + '</td><td class="num">' + lv(code) + "</td></tr>"; }).join("") +
      "</tbody></table>" +
      '<div class="totals"><div><span>Total</span><b>' + s.total + "</b></div><div><span>Average</span><b>" + (s.count ? s.mean.toFixed(1) + "%" : "—") + "</b></div><div><span>" + (rank ? "Position" : "Level") + "</span><b>" + (rank || overall || "—") + "</b></div></div>" +
      '<div class="remark"><b>Attendance</b>' + att.pct + "% this month</div>" +
      '<div class="remark"><b>Class teacher</b>' + esc(teacherRemark) + " — " + esc(D.CLASSES[l.cls].teacher) + "</div>" +
      '<div class="remark"><b>Principal</b>' + (good ? "Excellent. We are proud of you." : "Keep working hard; we believe in you.") + " — Dr. Grace Wanjiku</div></div>" +
      '<div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-act="shareReport" data-adm="' + adm + '" data-exam="' + examKey + '">' + ico("share", "ico-sm") + 'Share</button><button class="btn" data-act="closeSheet">Done</button></div>';
  }

  function stkFlow(adm) {
    var l = learner(adm);
    var bal = Math.max(0, balance(adm));
    function step1() {
      setSheet("Pay with M-Pesa", '<div class="field"><label for="stkChild">Pay for</label><select class="input" id="stkChild">' + D.CHILDREN.map(function (a) { var c = learner(a); return '<option value="' + a + '"' + (a === adm ? " selected" : "") + ">" + esc(c.name) + " · " + a + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label for="stkAmount">Amount (KES)</label><input class="input" id="stkAmount" type="number" inputmode="numeric" min="10" value="' + (bal > 0 ? Math.min(bal, 5000) : 1000) + '"><div class="hint" id="stkBal">Balance ' + kes(bal) + "</div></div>" +
        '<div class="field"><label for="stkPhone">M-Pesa phone number</label><input class="input" id="stkPhone" type="tel" inputmode="tel" value="' + D.GUARDIAN.phone + '"></div>' +
        '<div class="note blue" style="margin-top:14px">' + ico("info") + "<span>Paybill <b>" + SCHOOL.paybill + "</b>, account <b id=\"stkAcc\">" + adm + "</b>. This is a demo: no money moves.</span></div>" +
        '<button class="btn block" style="margin-top:16px" id="stkSend">' + ico("send", "ico-sm") + "Send payment request</button>", function (body) {
        var sel = body.querySelector("#stkChild");
        sel.addEventListener("change", function () {
          adm = sel.value; l = learner(adm); bal = Math.max(0, balance(adm));
          body.querySelector("#stkBal").textContent = "Balance " + kes(bal);
          body.querySelector("#stkAcc").textContent = adm;
          body.querySelector("#stkAmount").value = bal > 0 ? Math.min(bal, 5000) : 1000;
        });
        body.querySelector("#stkSend").addEventListener("click", function () {
          var amount = Math.round(Number(body.querySelector("#stkAmount").value));
          var phone = body.querySelector("#stkPhone").value.replace(/\s+/g, "");
          if (!(amount >= 10)) { toast("Enter an amount of at least KES 10"); return; }
          if (!/^(\+?254|0)(7|1)\d{8}$/.test(phone)) { toast("Enter a Kenyan phone number, e.g. 0722 000 001"); return; }
          step2(amount);
        });
      });
    }
    function step2(amount) {
      setSheet("Check your phone", '<div class="center"><div class="spinner"></div><p><b>Sending an M-Pesa request…</b></p><p class="muted small">In real life a prompt pops up on the parent\'s phone.</p></div>');
      setTimeout(function () {
        if (!sheet) return;
        setSheet("M-Pesa", '<div class="stk"><p>Do you want to pay <b>KES ' + amount.toLocaleString("en-KE") + ".00</b> to <b>" + esc(SCHOOL.name.toUpperCase()) + "</b> for account <b>" + adm + '</b>?</p><input class="pin" id="pin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN" aria-label="M-Pesa PIN" autocomplete="off"><div class="stk-actions"><button data-act="closeSheet">CANCEL</button><button id="pinOk">SEND</button></div></div><p class="hint center">Demo: type any 4 digits.</p>', function (body) {
          var pin = body.querySelector("#pin");
          setTimeout(function () { pin.focus(); }, 300);
          body.querySelector("#pinOk").addEventListener("click", function () {
            if (!/^\d{4}$/.test(pin.value)) { toast("Enter a 4-digit PIN (any digits)"); return; }
            step3(amount);
          });
        });
      }, 1600);
    }
    function step3(amount) {
      setSheet("Processing", '<div class="center"><div class="spinner"></div><p><b>Confirming with M-Pesa…</b></p></div>');
      setTimeout(function () {
        var p = addPayment(adm, amount, "M-Pesa", mpesaCode());
        var bal2 = Math.max(0, balance(adm));
        phoneNotify("Payment received · " + kes(amount), l.name + " · receipt " + p.receipt + ". New balance " + kes(bal2) + ".");
        if (!sheet) { toast("Payment received · receipt " + p.receipt); refresh(); return; }
        setSheet("Payment received", '<div class="center"><div class="success-ico">' + ico("check") + '</div><h2 style="font-size:22px">' + kes(amount) + '</h2><p class="muted">' + esc(l.name) + ' · <span class="mono">' + p.code + '</span></p></div>' +
          '<div class="totals" style="grid-template-columns:1fr 1fr"><div><span>Receipt</span><b style="font-size:14px">' + p.receipt + '</b></div><div><span>New balance</span><b style="font-size:14px" class="' + (bal2 > 0 ? "red" : "green") + '">' + kes(bal2) + "</b></div></div>" +
          '<div class="note green">' + ico("check") + "<span>Matched automatically by admission number. The bursar sees it instantly and the receipt is in your statement.</span></div>" +
          '<div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-act="receipt" data-receipt="' + p.receipt + '">View receipt</button><button class="btn" data-act="closeSheet">Done</button></div>');
        rerenderBehindSheet();
      }, 1400);
    }
    openSheet("Pay with M-Pesa", "");
    step1();
  }

  /** Refreshes the page under an open sheet (e.g. a new balance) without closing it. */
  function rerenderBehindSheet() {
    var r = route();
    if (!r.role || !D.ROLES[r.role]) return;
    var view = (VIEWS[r.role] && VIEWS[r.role][r.tab]) || SHARED[r.tab];
    if (view) renderShell(r.role, r.tab, view(r.role, r.arg) || {});
  }

  function recordPaymentSheet(adm) {
    openSheet("Record a payment", '<div class="field"><label for="rpL">Learner</label><select class="input" id="rpL">' + learnerOptions(adm || "MA0120") + '</select><div class="hint" id="rpBal"></div></div>' +
      '<div class="field"><label for="rpAmount">Amount (KES)</label><input class="input" id="rpAmount" type="number" inputmode="numeric" min="1" placeholder="e.g. 10000"></div>' +
      '<div class="field"><label for="rpMethod">Method</label><select class="input" id="rpMethod"><option>Cash</option><option>Bank</option><option>Cheque</option><option>M-Pesa</option></select></div>' +
      '<div class="field"><label for="rpRef">Reference</label><input class="input" id="rpRef" placeholder="Bank slip, cheque or M-Pesa code (optional)"></div>' +
      '<button class="btn block" style="margin-top:16px" id="rpSave">' + ico("check", "ico-sm") + "Save & print receipt</button>", function (body) {
      var sel = body.querySelector("#rpL");
      function upd() { var b = balance(sel.value); body.querySelector("#rpBal").textContent = b > 0 ? "Balance " + kes(b) : "No balance: a payment becomes a credit"; }
      sel.addEventListener("change", upd);
      upd();
      body.querySelector("#rpSave").addEventListener("click", function () {
        var amount = Math.round(Number(body.querySelector("#rpAmount").value));
        if (!(amount > 0)) { toast("Enter the amount received"); return; }
        var method = body.querySelector("#rpMethod").value;
        var ref = body.querySelector("#rpRef").value.trim() || (method === "M-Pesa" ? mpesaCode() : method === "Cash" ? "CASH" : "—");
        var p = addPayment(sel.value, amount, method, ref.toUpperCase());
        phoneNotify("Receipt " + p.receipt, kes(amount) + " for " + p.name + ". The parent has been notified.");
        rerenderBehindSheet();
        setSheet("Receipt", receiptHtml(p));
      });
    });
  }

  function matchSheet(id) {
    var u = D.UNMATCHED.filter(function (x) { return x.id === id; })[0];
    if (!u || S.matched[id]) return;
    function draw(q) {
      q = (q || "").toLowerCase();
      var rows = ALL.filter(function (l) { return !q || l.name.toLowerCase().indexOf(q) >= 0 || l.adm.toLowerCase().indexOf(q) >= 0; });
      rows.sort(function (a, b) { return (b.adm === u.suggest) - (a.adm === u.suggest); }); // suggested learner first
      return rows.slice(0, 25).map(function (l) {
        return item({ avatar: initials(l.name), gender: l.gender.toLowerCase(), t: esc(l.name), s: l.adm + " · " + esc(clsName(l)), act: "doMatch", data: ' data-id="' + id + '" data-adm="' + l.adm + '"', cls: u.suggest === l.adm ? "unread" : "" });
      }).join("");
    }
    var sug = u.suggest ? learner(u.suggest) : null;
    openSheet("Match M-Pesa payment", '<div class="card" style="box-shadow:none;background:#f8fafc"><div class="row"><span class="lead-ico amber">' + ico("phone") + '</span><div class="spacer"><h3>' + esc(u.payer) + " · " + kes(u.amount) + '</h3><div class="muted small">' + esc(u.phone) + ' · <span class="mono">' + u.code + "</span> · account “" + esc(u.account) + "”</div></div></div></div>" +
      (sug ? '<div class="note green" style="margin-top:12px">' + ico("star") + "<span>Suggested: <b>" + esc(sug.name) + "</b> (" + sug.adm + "). The account “" + esc(u.account) + "” looks like this admission number.</span></div>" : "") +
      '<div class="search" style="margin-top:12px">' + ico("search") + '<input class="input" id="mq" type="search" placeholder="Search learner"></div><div class="list" id="ml" style="margin-top:10px;box-shadow:none;border:1px solid var(--line)">' + draw("") + "</div>", function (body) {
      body.querySelector("#mq").addEventListener("input", function (e) { body.querySelector("#ml").innerHTML = draw(e.target.value); });
    });
  }

  function notificationsSheet() {
    var role = route().role;
    var read = S.readN[role] || {};
    var list = notesFor(role);
    openSheet("Notifications", list.length ? '<div class="list" style="box-shadow:none;border:1px solid var(--line)">' + list.map(function (n) {
      return item({ icon: "bell", tone: read[n.id] ? "grey" : "", t: esc(n.title), s: esc(n.body) + " · " + ago(n.at), cls: read[n.id] ? "" : "unread" });
    }).join("") + "</div>" : '<div class="empty">No notifications yet.</div>');
    S.readN[role] = read;
    list.forEach(function (n) { read[n.id] = true; });
    save();
    var dot = document.querySelector(".topbar .dot");
    if (dot) dot.remove();
  }

  function roleMenuSheet() {
    var current = route().role;
    openSheet("Switch role", '<p class="muted small" style="margin-bottom:12px">See the same school from another person\'s point of view. What you do in one role shows up in the others.</p><div class="list" style="box-shadow:none;border:1px solid var(--line)">' +
      ["principal", "bursar", "teacher", "parent", "student"].map(function (k) {
        var p = D.ROLES[k];
        return item({ avatar: p.initials, t: esc(p.label) + (k === current ? ' <span class="badge green">Current</span>' : ""), s: esc(p.name), act: "switchRole", data: ' data-role="' + k + '"' });
      }).join("") + '</div><button class="btn ghost block" style="margin-top:14px" data-act="toWelcome">' + ico("home", "ico-sm") + "Back to start</button>");
  }

  function noticeComposer() {
    openSheet("New notice", '<div class="field"><label for="nt">Title</label><input class="input" id="nt" placeholder="e.g. Closing day arrangements"></div>' +
      '<div class="field"><label for="nb">Message</label><textarea class="input" id="nb" placeholder="Write the notice…"></textarea></div>' +
      '<div class="field"><label for="na">Send to</label><select class="input" id="na"><option value="all">Everyone</option><option value="parents">Parents</option><option value="staff">Staff</option><option value="students">Students</option></select></div>' +
      '<label class="row" style="margin-top:14px;font-size:14px"><input type="checkbox" id="nsms" checked style="width:20px;height:20px;accent-color:var(--brand)"> Also send as SMS to parents without the app</label>' +
      '<button class="btn block" style="margin-top:16px" id="nsend">' + ico("send", "ico-sm") + "Publish notice</button>", function (body) {
      body.querySelector("#nsend").addEventListener("click", function () {
        var title = body.querySelector("#nt").value.trim();
        var text = body.querySelector("#nb").value.trim();
        var aud = body.querySelector("#na").value;
        if (!title || !text) { toast("Add a title and a message"); return; }
        S.notices.unshift({ id: "c" + Date.now(), title: title, body: text, audience: aud, at: Date.now() });
        var roles = { all: ["parent", "student", "teacher", "bursar"], parents: ["parent"], staff: ["teacher", "bursar"], students: ["student"] }[aud];
        addNote(roles, "New notice: " + title, text.length > 90 ? text.slice(0, 88) + "…" : text);
        save();
        phoneNotify("Notice sent to " + AUDIENCE[aud].toLowerCase(), title);
        closeSheet();
        toast("Notice published" + (body.querySelector("#nsms").checked && aud !== "staff" && aud !== "students" ? " and queued as SMS" : ""));
        refresh();
      });
    });
  }

  function connectSheet() {
    var saved = "";
    try { saved = Native ? Native.liveUrl() : ""; } catch (e) { /* none */ }
    openSheet("Connect to your school", '<p class="muted small" style="margin-bottom:12px">If your school already uses Elimuhub, enter its web address to open it in this app. Sign in with the account your school gave you.</p>' +
      '<div class="field"><label for="url">School\'s Elimuhub address</label><input class="input" id="url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="https://app.yourschool.ac.ke" value="' + esc(saved) + '"></div>' +
      '<button class="btn block" style="margin-top:16px" id="open">' + ico("link", "ico-sm") + "Open my school</button><p class=\"hint center\">Use the phone's back button to return to the demo.</p>", function (body) {
      body.querySelector("#open").addEventListener("click", function () {
        var url = body.querySelector("#url").value.trim();
        if (!url) { toast("Enter your school's Elimuhub address"); return; }
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        if (!/^https?:\/\/[^\s/.]+\.[^\s/]+/i.test(url)) { toast("That doesn't look like a web address"); return; }
        closeSheet(true);
        if (Native) Native.openLive(url);
        else location.href = url;
      });
    });
  }

  function aboutSheet() {
    openSheet("About", '<div class="center"><img src="img/elimuhub.svg" alt="" style="width:72px;height:72px;border-radius:18px;margin:4px auto 10px;display:block"><h2 style="font-size:24px;font-weight:800">Elimu<span style="color:#f79009">hub</span></h2><p class="muted small">Demo app ' + esc(version()) + ' · A better education for all</p></div>' +
      '<p style="margin-top:14px">Elimuhub is the school management system for Kenyan primary and secondary schools: fees and M-Pesa, CBC and KCSE exams, report cards, payroll, parent communication and a school website builder.</p>' +
      '<div class="pt-foot" style="margin-top:18px"><span>A product of</span><div class="pt"><img src="img/pizza-emblem.png" alt=""><span>Pizza <span>Technologies</span></span></div></div>' +
      '<div class="btn-row" style="margin-top:18px"><button class="btn ghost" data-act="openSite">' + ico("globe", "ico-sm") + 'Website</button><button class="btn" data-act="shareApp">' + ico("share", "ico-sm") + "Share</button></div>");
  }

  function openExternal(url) {
    if (Native) Native.openExternal(url);
    else window.open(url, "_blank", "noopener");
  }
  function share(text) {
    if (Native) Native.share(text);
    else if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else toast("Sharing works in the Android app");
  }

  // ------------------------------------------------------------------ actions

  var ACTIONS = {
    closeSheet: function () { closeSheet(); },
    notifications: notificationsSheet,
    roleMenu: roleMenuSheet,
    switchRole: function (el) { closeSheet(true); go(el.dataset.role + "/home"); },
    toWelcome: function () { closeSheet(true); S.role = null; save(); go("welcome"); },
    connect: connectSheet,
    about: aboutSheet,
    openSite: function () { openExternal(SCHOOL.website); },
    shareApp: function () { share("Elimuhub: school management for Kenyan schools. Fees & M-Pesa, CBC and KCSE report cards, a parent app and more. " + SCHOOL.website); },
    reset: function () {
      openSheet("Reset demo?", '<p>This clears payments, registers, marks and notices you added, and starts again with the original sample data.</p><div class="btn-row" style="margin-top:16px"><button class="btn ghost" data-act="closeSheet">Cancel</button><button class="btn danger" data-act="doReset">Reset</button></div>');
    },
    doReset: function () {
      S = freshState(); save(); draftRegister = null; draftMarks = null; resultsExam = {};
      closeSheet(true); go("welcome"); toast("Demo reset");
    },
    enableNotify: function () {
      if (!Native) return;
      S.notifyAsked = true; save();
      if (canNotify()) { phoneNotify("Notifications are on", "You'll get receipts, results and school notices here."); toast("Notifications are already on. Test sent."); return; }
      Native.requestNotify();
    },
    locked: function (el) {
      openSheet(el.dataset.name, '<div class="center"><span class="lead-ico" style="margin:0 auto 12px;width:56px;height:56px">' + ico("lock") + '</span></div><p class="center">' + esc(el.dataset.name) + " is part of the full Elimuhub system, used by schools every day.</p>" +
        '<button class="btn block" style="margin-top:16px" data-act="openSite">' + ico("globe", "ico-sm") + "See everything Elimuhub does</button>");
    },
    notice: function (el) {
      var n = notices(route().role).filter(function (x) { return x.id === el.dataset.id; })[0];
      if (n) openSheet(n.title, '<p class="muted small" style="margin-bottom:10px">' + esc(AUDIENCE[n.audience]) + " · " + ago(n.at) + " · " + esc(SCHOOL.name) + '</p><p style="white-space:pre-wrap">' + esc(n.body) + "</p>");
    },
    newNotice: noticeComposer,
    install: installApp,
    recordPayment: function (el) { recordPaymentSheet(el.dataset.adm); },
    receipt: function (el) { var p = findPayment(el.dataset.receipt); if (p) { if (sheet) setSheet("Receipt", receiptHtml(p)); else showReceipt(p); } },
    shareReceipt: function (el) {
      var p = findPayment(el.dataset.receipt);
      if (p) share(SCHOOL.name + " receipt " + p.receipt + "\n" + p.name + " (" + p.adm + ")\n" + kes(p.amount) + " by " + p.method + " (" + p.code + ")\n" + fmtDay(new Date(p.at)) + "\nBalance: " + kes(Math.max(0, balance(p.adm))));
    },
    statement: function (el) { openSheet("Fee statement", '<p class="muted small" style="margin-bottom:10px">' + esc(learner(el.dataset.adm).name) + " · balance " + kes(Math.max(0, balance(el.dataset.adm))) + "</p>" + statementHtml(el.dataset.adm)); },
    reportCard: function (el) { openSheet("Report card", reportCardHtml(el.dataset.adm, el.dataset.exam)); },
    shareReport: function (el) {
      var s = summary(el.dataset.exam, el.dataset.adm);
      var l = learner(el.dataset.adm);
      share(l.name + " · " + examByKey(el.dataset.exam).name + "\n" + subjectsOf(l).map(function (sub, i) { return sub + ": " + (s.scores[i] == null ? "—" : s.scores[i] + " (" + level(s.scores[i], scaleOf(l)) + ")"); }).join("\n") + "\nAverage " + s.mean.toFixed(1) + "% · " + s.level + "\n" + SCHOOL.name);
    },
    messageParent: function (el) {
      var l = learner(el.dataset.adm);
      var g = guardianOf(l);
      openSheet("Message parent", '<p class="muted small" style="margin-bottom:10px">To ' + esc(g.name) + " · " + esc(g.phone) + '</p><textarea class="input" id="msg">Dear parent, kindly note that ' + esc(firstName(l)) + '\'s fee balance is ' + kes(Math.max(0, balance(l.adm))) + ". Pay via M-Pesa Paybill " + SCHOOL.paybill + ", account " + l.adm + ". Thank you. " + esc(SCHOOL.name) + '</textarea><button class="btn block" style="margin-top:14px" data-act="sendSms">' + ico("send", "ico-sm") + "Send SMS</button>");
    },
    sendSms: function () { S.sms++; save(); closeSheet(); toast("SMS sent (demo: no real message was sent)"); },
    smsReminders: function () {
      var owing = ALL.filter(function (l) { return balance(l.adm) > 0; });
      var l = owing[0] || ALL[0];
      openSheet("SMS reminders", '<p class="muted small" style="margin-bottom:10px">' + owing.length + " parents with a balance. Each message is personalised:</p><div class=\"remark\" style=\"font-size:14px\">Dear parent, " + esc(firstName(l)) + "'s fee balance is " + kes(balance(l.adm)) + ". Pay via M-Pesa Paybill " + SCHOOL.paybill + ", account " + l.adm + ". Thank you. " + esc(SCHOOL.name) + '</div><button class="btn block" style="margin-top:14px" data-act="sendReminders" data-n="' + owing.length + '">' + ico("send", "ico-sm") + "Send " + owing.length + " SMS</button>");
    },
    sendReminders: function (el) { S.sms += Number(el.dataset.n); save(); closeSheet(); toast(el.dataset.n + " reminders sent (demo: no real SMS)"); },
    payMpesa: function (el) { stkFlow(el.dataset.adm || S.child); },
    pickChild: function (el) { S.child = el.dataset.adm; save(); refresh(); },
    openChild: function (el) { S.child = el.dataset.adm; save(); go("parent/" + el.dataset.tab); },
    pickExam: function (el) { resultsExam[el.dataset.adm] = el.dataset.exam; refresh(); },
    ttDay: function (el) { ttDay = Number(el.dataset.day); refresh(); },
    balFilter: function (el) { viewBalances.filter = el.dataset.f; refresh(); },
    payMode: function (el) { paymentsView.mode = el.dataset.m; refresh(); },
    hwMode: function (el) { studentAssignments.mode = el.dataset.m; refresh(); },
    match: function (el) { matchSheet(el.dataset.id); },
    doMatch: function (el) {
      var u = D.UNMATCHED.filter(function (x) { return x.id === el.dataset.id; })[0];
      S.matched[u.id] = el.dataset.adm;
      var p = addPayment(el.dataset.adm, u.amount, "M-Pesa", u.code);
      phoneNotify("M-Pesa payment matched", kes(u.amount) + " from " + u.payer + " → " + p.name + ". Receipt " + p.receipt + ".");
      rerenderBehindSheet();
      setSheet("Receipt", '<div class="note green" style="margin-bottom:12px">' + ico("check") + "<span>Matched. Next time, payments from " + esc(u.phone) + " are matched to " + esc(firstName(learner(el.dataset.adm))) + " automatically.</span></div>" + receiptHtml(p));
    },
    regMark: function (el) { draftRegister.marks[el.dataset.adm] = el.dataset.s; refresh(); },
    allPresent: function () { Object.keys(draftRegister.marks).forEach(function (k) { draftRegister.marks[k] = "P"; }); refresh(); },
    saveRegister: function () {
      var key = draftRegister.key;
      var first = !S.attendance[key];
      S.attendance[key] = Object.assign({}, draftRegister.marks);
      var absent = D.G7E.filter(function (l) { return draftRegister.marks[l.adm] === "A"; });
      var late = D.G7E.filter(function (l) { return draftRegister.marks[l.adm] === "L"; });
      if (draftRegister.marks[BRIAN] === "A") addNote(["parent"], "Absence alert", "Brian Mwangi Kamau was marked absent today (Grade 7 East register). Please contact the class teacher.");
      else if (draftRegister.marks[BRIAN] === "L") addNote(["parent"], "Late arrival", "Brian Mwangi Kamau arrived late today.");
      addNote(["principal"], "Grade 7 East register " + (first ? "taken" : "updated"), (D.G7E.length - absent.length) + " present · " + absent.length + " absent · " + late.length + " late. By Mr. James Kiprono.");
      save();
      if (absent.length) {
        phoneNotify("Absence alerts sent", "Parents of " + absent.length + " absent learner" + (absent.length > 1 ? "s were" : " was") + " notified by SMS and the app.");
        toast("Register saved · " + absent.length + " parent" + (absent.length > 1 ? "s" : "") + " alerted");
      } else toast("Register saved · everyone is present");
      go("teacher/home");
    },
    fillMarks: function () {
      D.G7E.forEach(function (l) { if (draftMarks[l.adm] == null) { var o = scores("opener", l.adm)[2]; draftMarks[l.adm] = clamp(Math.round(o + (rng(hash(l.adm + "m3"))() - 0.4) * 16), 12, 97); } });
      refresh();
    },
    saveMarks: function () {
      var clean = {};
      Object.keys(draftMarks).forEach(function (k) { if (draftMarks[k] != null && !isNaN(draftMarks[k])) clean[k] = draftMarks[k]; });
      S.marks["midterm3:Mathematics"] = clean;
      var n = Object.keys(clean).length;
      addNote(["principal"], "Mathematics marks entered", "Grade 7 East · T3 Mid-Term: " + n + "/" + D.G7E.length + " learners, by Mr. James Kiprono.");
      save();
      toast("Marks saved · " + n + "/" + D.G7E.length + " entered");
      if (n === D.G7E.length) setTimeout(function () { toast("All marks in. The principal can now publish the results."); }, 3300);
      refresh();
    },
    publish: function (el) {
      var key = el.dataset.exam;
      var n = mathsEntered();
      function doPublish() {
        S.published[key] = true;
        addNote(["parent", "student"], examByKey(key).name + " results are out", "Report cards for Brian and Wanjiru are ready in the app.");
        addNote(["teacher"], "Results published", examByKey(key).name + " is now visible to parents.");
        save();
        phoneNotify("Results published", "Parents of " + SCHOOL.learners + " learners have been notified.");
        closeSheet(true);
        toast("Results published · parents notified");
        refresh();
      }
      if (n < D.G7E.length) {
        openSheet("Publish results?", "<p>Mathematics marks for Grade 7 East are not complete (" + n + "/" + D.G7E.length + "). Learners without a mark will show “—”.</p><p class=\"hint\">Tip: switch to the Teacher role to enter them.</p><div class=\"btn-row\" style=\"margin-top:16px\"><button class=\"btn ghost\" data-act=\"closeSheet\">Wait</button><button class=\"btn\" id=\"pubAnyway\">Publish anyway</button></div>", function (body) {
          body.querySelector("#pubAnyway").addEventListener("click", doPublish);
        });
      } else doPublish();
    },
    assignment: function (el) {
      var a = D.ASSIGNMENTS.filter(function (x) { return x.id === el.dataset.id; })[0];
      var done = isDone(a);
      openSheet(a.subject, "<h3 style=\"font-size:17px\">" + esc(a.title) + '</h3><p class="muted small" style="margin:4px 0 12px">' + esc(a.teacher) + " · " + (done ? "Done" : dueLabel(a)) + "</p><p>" + esc(a.details) + "</p>" +
        '<button class="btn block' + (done ? " ghost" : "") + '" style="margin-top:16px" data-act="toggleDone" data-id="' + a.id + '">' + (done ? "Mark as not done" : ico("check", "ico-sm") + "Mark as done") + "</button>");
    },
    toggleDone: function (el) {
      var a = D.ASSIGNMENTS.filter(function (x) { return x.id === el.dataset.id; })[0];
      S.done[a.id] = !isDone(a);
      save();
      closeSheet(true);
      toast(S.done[a.id] ? "Nice work! Marked as done" : "Moved back to To do");
      refresh();
    },
  };

  function onClick(e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn(el);
  }
  app.addEventListener("click", onClick);

  // ------------------------------------------------------------------ start

  window.addEventListener("hashchange", function () { app.classList.remove("still"); render(); });
  if (!location.hash && S.role && D.ROLES[S.role]) location.replace("#/" + S.role + "/home");
  render();
  var splash = document.getElementById("splash");
  setTimeout(function () {
    splash.classList.add("hide");
    setTimeout(function () { splash.remove(); }, 500);
  }, IN_APP || STANDALONE ? 1900 : 1200);

  // Offline support and installability in the browser.
  if (IS_WEB && !IN_APP && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* the demo still works online */ });
    });
  }
})();
