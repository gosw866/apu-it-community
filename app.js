/* =====================================================================
   app.js — APU কমিউনিটির কাজ করার কোড
   সাধারণত এই ফাইল বদলানোর দরকার নেই। সেটিং বদলাতে config.js খুলুন।
   গঠন: (১) সাহায্যকারী ফাংশন  (২) ডেমো ব্যাকএন্ড  (৩) Firebase ব্যাকএন্ড  (৪) পর্দা ও ফিচার
   ===================================================================== */
(function () {
"use strict";
var C = window.APU_COMMUNITY;
var $ = function (s, r) { return (r || document).querySelector(s); };
var LIVE = C.firebase && C.firebase.apiKey && C.firebase.apiKey.indexOf("PASTE") < 0;

/* ---------- ১. সাহায্যকারী ফাংশন ---------- */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function bn(n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); }
function ago(t) {
  var s = (Date.now() - t) / 1000;
  if (s < 60) return "এইমাত্র"; if (s < 3600) return bn(Math.floor(s / 60)) + " মিনিট আগে";
  if (s < 86400) return bn(Math.floor(s / 3600)) + " ঘণ্টা আগে"; return bn(Math.floor(s / 86400)) + " দিন আগে";
}
function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 3000); }
function okImg(s) { return typeof s === "string" && s.indexOf("data:image/jpeg;base64,") === 0; }
var COLORS = ["#1565e8", "#7c3aed", "#e11d48", "#059669", "#d97706", "#0891b2", "#be185d"];
function av(u, z) {
  var st = "--z:" + (z || 42) + "px;background:" + COLORS[(u.id || "x").split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % COLORS.length];
  return '<div class="av" style="' + st + '">' + (okImg(u.pic) ? '<img src="' + u.pic + '" alt="">' : esc((u.name || "?").trim().charAt(0).toUpperCase())) + '</div>';
}
function shrink(file, max, q, cb) {
  var r = new FileReader();
  r.onload = function () {
    var i = new Image();
    i.onload = function () {
      var s = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement("canvas");
      c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
      c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL("image/jpeg", q));
    };
    i.src = r.result;
  };
  r.readAsDataURL(file);
}
function authErr(e) {
  var m = { "auth/email-already-in-use": "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে", "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড ভুল",
    "auth/wrong-password": "পাসওয়ার্ড ভুল", "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট নেই", "auth/weak-password": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন",
    "auth/invalid-email": "ইমেইলটি সঠিক নয়", "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পরে আবার চেষ্টা করুন",
    "auth/network-request-failed": "ইন্টারনেট সংযোগ দেখুন", "auth/unauthorized-domain": "এই ওয়েবসাইটের ঠিকানা Firebase-এর Authorized domains-এ যোগ করা হয়নি",
    "permission-denied": "অনুমতি নেই — Firestore Rules ঠিকমতো Publish করা হয়েছে কিনা দেখুন" };
  return m[e.code] || e.message || "কিছু একটা সমস্যা হয়েছে";
}

/* ---------- ২. ডেমো ব্যাকএন্ড (Firebase ছাড়া, শুধু এই ব্রাউজারে চলে) ---------- */
function Demo() {
  var S, subs = [], meId = null;
  function load() { try { S = JSON.parse(localStorage.getItem("apu-demo")) || {}; } catch (e) { S = {}; } S.users = S.users || {}; S.posts = S.posts || {}; S.comments = S.comments || {}; meId = S.session || null; }
  function save() { S.session = meId; localStorage.setItem("apu-demo", JSON.stringify(S)); ping(); }
  function ping() { subs.slice().forEach(function (f) { f(); }); }
  function arr(o) { return Object.keys(o).map(function (k) { return Object.assign({ id: k }, o[k]); }); }
  function watch(fn) { subs.push(fn); fn(); return function () { subs = subs.filter(function (x) { return x !== fn; }); }; }
  function uid() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  load(); addEventListener("storage", function () { load(); ping(); });
  return {
    live: false,
    watchMe: function (cb) { return watch(function () { var u = meId && S.users[meId]; cb(u ? Object.assign({ id: meId }, u) : null); }); },
    register: function (d) {
      return new Promise(function (ok, no) {
        if (arr(S.users).some(function (u) { return u.email === d.email; })) return no({ code: "auth/email-already-in-use" });
        if (d.pass.length < 6) return no({ code: "auth/weak-password" });
        var first = !arr(S.users).length, id = uid();
        S.users[id] = { name: d.name, email: d.email, pass: btoa(unescape(encodeURIComponent(d.pass))), course: d.course, batch: d.batch, status: first ? "approved" : "pending", role: first ? "admin" : "student", t: Date.now() };
        meId = id; save(); ok();
      });
    },
    login: function (email, pass) {
      return new Promise(function (ok, no) {
        var u = arr(S.users).filter(function (x) { return x.email === email && x.pass === btoa(unescape(encodeURIComponent(pass))); })[0];
        if (!u) return no({ code: "auth/invalid-credential" }); meId = u.id; save(); ok();
      });
    },
    logout: function () { meId = null; save(); return Promise.resolve(); },
    watchUsers: function (cb) { return watch(function () { cb(arr(S.users)); }); },
    setUser: function (id, o) { Object.assign(S.users[id], o); save(); return Promise.resolve(); },
    watchPosts: function (ch, cb) { return watch(function () { cb(arr(S.posts).filter(function (p) { return p.ch === ch; })); }); },
    addPost: function (p) { S.posts[uid()] = p; save(); return Promise.resolve(); },
    delPost: function (id) { delete S.posts[id]; save(); return Promise.resolve(); },
    like: function (id, u, on) { var p = S.posts[id]; p.likes = (p.likes || []).filter(function (x) { return x !== u; }); if (on) p.likes.push(u); save(); return Promise.resolve(); },
    watchComments: function (pid, cb) { return watch(function () { cb(arr(S.comments).filter(function (c) { return c.pid === pid; })); }); },
    addComment: function (c) { S.comments[uid()] = c; save(); return Promise.resolve(); },
    delComment: function (id) { delete S.comments[id]; save(); return Promise.resolve(); }
  };
}

/* ---------- ৩. Firebase ব্যাকএন্ড (সবার মধ্যে শেয়ার হওয়া আসল ডেটা) ---------- */
function Fire() {
  firebase.initializeApp(C.firebase);
  var auth = firebase.auth(), db = firebase.firestore(), FV = firebase.firestore.FieldValue;
  function docs(s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }
  return {
    live: true,
    watchMe: function (cb) {
      var un2 = function () {};
      var un1 = auth.onAuthStateChanged(function (u) {
        un2(); if (!u) return cb(null);
        un2 = db.collection("users").doc(u.uid).onSnapshot(function (d) { cb(d.exists ? Object.assign({ id: u.uid }, d.data()) : null); },
          function (e) { toast(authErr(e)); cb(null); });
      });
      return function () { un1(); un2(); };
    },
    /* ★ প্রথম যে নিবন্ধন করবে সে অ্যাডমিন (অনুমোদিত) হবে; বাকিরা "অপেক্ষায়" থাকবে।
         "meta/admin" ডকুমেন্টটি একবার তৈরি হয়ে গেলে Rules আর কাউকে অ্যাডমিন হতে দেয় না। */
    register: function (d) {
      var made = null;
      return auth.createUserWithEmailAndPassword(d.email, d.pass).then(function (c) {
        made = c.user;
        var uref = db.collection("users").doc(c.user.uid), mref = db.collection("meta").doc("admin");
        var base = { name: d.name, email: d.email, course: d.course, batch: d.batch, t: Date.now() };
        function asStudent() { return uref.set(Object.assign({}, base, { status: "pending", role: "student" })); }
        return mref.get().then(function (m) {
          if (m.exists) return asStudent();
          var b = db.batch();
          b.set(uref, Object.assign({}, base, { status: "approved", role: "admin" }));
          b.set(mref, { uid: c.user.uid, t: Date.now() });
          return b.commit().catch(asStudent);   /* অন্য কেউ আগে অ্যাডমিন হয়ে গেলে সাধারণ সদস্য হিসেবে নিবন্ধন হবে */
        });
      }).catch(function (e) { if (made) made.delete().catch(function () {}); throw e; });   /* ব্যর্থ হলে আধা-তৈরি অ্যাকাউন্ট মুছে ফেলা হয় */
    },
    login: function (e, p) { return auth.signInWithEmailAndPassword(e, p); },
    logout: function () { return auth.signOut(); },
    watchUsers: function (cb) { return db.collection("users").onSnapshot(function (s) { cb(docs(s)); }, function (e) { toast(e.message); }); },
    setUser: function (id, o) { return db.collection("users").doc(id).update(o); },
    watchPosts: function (ch, cb) { return db.collection("posts").where("ch", "==", ch).onSnapshot(function (s) { cb(docs(s)); }, function (e) { toast(e.message); }); },
    addPost: function (p) { return db.collection("posts").add(p); },
    delPost: function (id) { return db.collection("posts").doc(id).delete(); },
    like: function (id, u, on) { return db.collection("posts").doc(id).update({ likes: on ? FV.arrayUnion(u) : FV.arrayRemove(u) }); },
    watchComments: function (pid, cb) { return db.collection("comments").where("pid", "==", pid).onSnapshot(function (s) { cb(docs(s)); }); },
    addComment: function (c) { return db.collection("comments").add(c); },
    delComment: function (id) { return db.collection("comments").doc(id).delete(); }
  };
}

/* ---------- ৪. পর্দা ও ফিচার ---------- */
var B, me = null, ch = C.channels[0].id, view = "feed", unsubs = [], users = [], posts = [], cmOpen = {}, cmCache = {}, cmUn = {}, draftImg = "", tab = "login";
function clearSubs() { unsubs.forEach(function (u) { u(); }); unsubs = []; Object.keys(cmUn).forEach(function (k) { cmUn[k](); }); cmUn = {}; cmOpen = {}; cmCache = {}; }
function chan(id) { return C.channels.filter(function (c) { return c.id === id; })[0] || C.channels[0]; }
function isAdmin() { return me && me.role === "admin"; }

function route() {
  if (!me) { clearSubs(); return showAuth(); }
  if (me.status !== "approved") { clearSubs(); return showWait(); }
  if (!$("#app")) { build(); }
  else { $("#meBox").innerHTML = meHTML(); $("#nav").innerHTML = navHTML(); $("#bn").innerHTML = bnHTML(); }
}

/* --- লগইন / নিবন্ধন --- */
function showAuth() {
  var px = [["26px", "#1565e8", "8%", "12%", "0s"], ["14px", "#ffb703", "80%", "20%", "1s"], ["34px", "#fff", "60%", "70%", "2s"], ["18px", "#ffb703", "14%", "80%", "3s"]]
    .map(function (p) { return '<i class="px" style="--s:' + p[0] + ';--c:' + p[1] + ';--x:' + p[2] + ';--y:' + p[3] + ';--d:' + p[4] + '"></i>'; }).join("");
  $("#root").innerHTML = '<div class="auth"><div class="ah">' + px + '<img src="logo.png" alt=""><h1>' + esc(C.name).replace("APU", '<span>APU</span>') + '</h1><p>' + esc(C.tagline) + '। ' + esc(C.welcome) + '</p>' +
    '<div class="chipsx"><span>💬 আলোচনা</span><span>🙋 প্রশ্ন ও সাহায্য</span><span>🏆 নিজের কাজ দেখান</span><span>📢 নোটিশ</span></div></div>' +
    '<div class="af"><div class="box">' + (B.live ? "" : '<div class="demo">⚠️ ডেমো মোড: ডেটা শুধু এই ব্রাউজারেই থাকবে। সবার জন্য চালু করতে config.js-এ Firebase সেটিং দিন। প্রথম যে নিবন্ধন করবে সে অ্যাডমিন হবে।</div>') +
    '<div class="tabs"><button data-t="login" class="' + (tab === "login" ? "on" : "") + '">লগইন</button><button data-t="reg" class="' + (tab === "reg" ? "on" : "") + '">নতুন অ্যাকাউন্ট</button></div><form id="af">' +
    (tab === "reg" ? '<label>আপনার নাম</label><input id="n" required placeholder="পূর্ণ নাম">' : "") +
    '<label>ইমেইল</label><input id="e" type="email" required placeholder="you@example.com"><label>পাসওয়ার্ড</label><input id="p" type="password" required minlength="6" placeholder="কমপক্ষে ৬ অক্ষর">' +
    (tab === "reg" ? '<label>কোর্স</label><select id="c">' + C.courses.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + '</select><label>ব্যাচ</label><input id="b" placeholder="যেমন: ব্যাচ ০১">' : "") +
    '<button class="btn full">' + (tab === "reg" ? "অ্যাকাউন্ট খুলুন" : "লগইন করুন") + '</button></form>' +
    (tab === "reg" ? '<p style="color:var(--mute);font-size:14px;margin-top:12px">নিবন্ধনের পর একাডেমির অ্যাডমিন অনুমোদন দিলে আপনি কমিউনিটিতে ঢুকতে পারবেন।</p>' : "") +
    '<p style="margin-top:14px;text-align:center"><a href="' + esc(C.website) + '">← মূল ওয়েবসাইটে ফিরুন</a></p></div></div></div>';
  $(".tabs").onclick = function (e) { if (e.target.dataset.t) { tab = e.target.dataset.t; showAuth(); } };
  $("#af").onsubmit = function (e) {
    e.preventDefault(); var em = $("#e").value.trim(), pw = $("#p").value, bt = $("#af .btn"); bt.disabled = true;
    var job = tab === "reg" ? B.register({ name: $("#n").value.trim(), email: em, pass: pw, course: $("#c").value, batch: $("#b").value.trim() }) : B.login(em, pw);
    job.catch(function (er) { toast(authErr(er)); bt.disabled = false; });
  };
}
function showWait() {
  $("#root").innerHTML = '<div class="wait"><div class="em">⏳</div><h2>অনুমোদনের অপেক্ষায়</h2><p style="color:var(--mute);margin:10px 0 20px">' +
    (me.status === "rejected" ? "দুঃখিত, আপনার অনুরোধ গ্রহণ করা হয়নি। বিস্তারিত জানতে একাডেমির অফিসে যোগাযোগ করুন।" : "আপনার অ্যাকাউন্ট তৈরি হয়েছে। একাডেমির অ্যাডমিন অনুমোদন দিলেই আপনি কমিউনিটিতে ঢুকতে পারবেন। অনুমোদন হলে এই পর্দা নিজে থেকেই বদলে যাবে।") +
    '</p><button class="btn gray" id="lo">লগআউট</button></div>';
  $("#lo").onclick = function () { B.logout(); };
}

/* --- মূল কাঠামো --- */
function meHTML() { return '<div class="me">' + av(me, 48) + '<div><b>' + esc(me.name) + (isAdmin() ? '<span class="bdg">অ্যাডমিন</span>' : "") + '</b><small>' + esc(me.course) + " · " + esc(me.batch || "") + '</small></div></div>'; }
function navHTML() { return [["feed", "🏠 ফিড"], ["members", "👥 সদস্য"]].concat(isAdmin() ? [["admin", "🛡️ অ্যাডমিন"]] : []).map(function (v) { return '<button data-v="' + v[0] + '" class="' + (view === v[0] ? "on" : "") + '">' + v[1] + "</button>"; }).join(""); }
function bnHTML() { return [["feed", "🏠", "ফিড"], ["members", "👥", "সদস্য"]].concat(isAdmin() ? [["admin", "🛡️", "অ্যাডমিন"]] : []).concat([["me", "👤", "আমি"]]).map(function (v) { return '<button data-v="' + v[0] + '" class="' + (view === v[0] ? "on" : "") + '"><i>' + v[1] + "</i>" + v[2] + "</button>"; }).join(""); }
function build() {
  $("#root").innerHTML = '<div id="app"><div class="top"><a class="lg" href="#" id="home"><img src="logo.png" alt="">' + esc(C.name) + '</a><nav id="nav">' + navHTML() + '</nav><div class="r"><button class="ib" id="th" title="ডার্ক মোড">🌓</button><button class="ib" id="meBtn" title="আমার প্রোফাইল">👤</button></div></div>' +
    '<div class="layout"><aside class="side left"><div class="card" id="meBox">' + meHTML() + '</div><div class="card chl"><h3>চ্যানেল</h3><div id="chl"></div></div></aside>' +
    '<main id="main"></main><aside class="side right"><div class="card"><h3>📢 সর্বশেষ নোটিশ</h3><div id="notes"></div></div><div class="card"><h3>📜 কমিউনিটির নিয়ম</h3><ul class="rules">' + C.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + '</ul></div>' +
    '<p style="text-align:center;font-size:14px"><a href="' + esc(C.website) + '">← APU IT Academy ওয়েবসাইট</a></p></aside></div><nav class="bn" id="bn">' + bnHTML() + '</nav></div>';
  $("#nav").onclick = $("#bn").onclick = function (e) { var b = e.target.closest("button"); if (b && b.dataset.v) { view = b.dataset.v; draw(); route(); } };
  $("#meBtn").onclick = function () { view = "me"; draw(); route(); };
  $("#home").onclick = function (e) { e.preventDefault(); view = "feed"; draw(); route(); };
  $("#th").onclick = theme;
  unsubs.push(B.watchUsers(function (u) { users = u; if (view === "members" || view === "admin") draw(); }));
  unsubs.push(B.watchPosts("notice", function (p) {
    p.sort(function (a, b) { return b.t - a.t; });
    $("#notes").innerHTML = p.slice(0, 3).map(function (n) { return '<div style="margin-bottom:10px"><small style="color:var(--mute)">' + ago(n.t) + '</small><p style="font-size:15px">' + esc(n.text.slice(0, 110)) + (n.text.length > 110 ? "…" : "") + "</p></div>"; }).join("") || '<p class="empty" style="padding:6px">এখনো কোনো নোটিশ নেই</p>';
  }));
  draw();
}

/* --- ভিউ আঁকা --- */
function draw() {
  if (!$("#main")) return;
  var chs = C.channels.map(function (c) { return '<button data-c="' + c.id + '" class="' + (c.id === ch && view === "feed" ? "on" : "") + '"><span>' + c.ic + "</span>" + esc(c.n) + "</button>"; }).join("");
  $("#chl").innerHTML = chs;
  $("#chl").onclick = function (e) { var b = e.target.closest("button"); if (b) { ch = b.dataset.c; view = "feed"; draw(); route(); } };
  if (view === "feed") return feed();
  Object.keys(cmUn).forEach(function (k) { cmUn[k](); }); cmUn = {};
  if (feedUn) { feedUn(); feedUn = null; }
  if (view === "members") return members();
  if (view === "admin") return admin();
  return profile();
}
var feedUn = null;
function feed() {
  var c = chan(ch), can = !c.adminOnly || isAdmin();
  $("#main").innerHTML = '<div class="cch">' + C.channels.map(function (x) { return '<button data-c="' + x.id + '" class="' + (x.id === ch ? "on" : "") + '">' + x.ic + " " + esc(x.n) + "</button>"; }).join("") + '</div>' +
    '<div class="card hd"><h2>' + c.ic + " " + esc(c.n) + '</h2><p>' + (c.adminOnly ? "শুধু অ্যাডমিন এখানে পোস্ট করতে পারেন" : "এখানে নিজের কথা, প্রশ্ন বা কাজ শেয়ার করুন") + '</p></div>' +
    (can ? '<div class="card comp"><div style="display:flex;gap:12px">' + av(me, 44) + '<div style="flex:1"><textarea id="tx" placeholder="' + esc(me.name.split(" ")[0]) + ', আপনার মনে কী চলছে?"></textarea><div id="pv"></div><div class="bar"><label class="btn gray" style="margin:0;cursor:pointer">📷 ছবি<input id="fi" type="file" accept="image/*" hidden></label><span class="sp"></span><button class="btn" id="pb">পোস্ট করুন</button></div></div></div></div>' : "") +
    '<div id="feed"><div class="empty">লোড হচ্ছে…</div></div>';
  $(".cch").onclick = function (e) { var b = e.target.closest("button"); if (b) { ch = b.dataset.c; draw(); } };
  if (can) {
    draftImg = "";
    $("#fi").onchange = function () {
      var f = this.files[0]; if (!f) return;
      shrink(f, 900, 0.72, function (d) { if (d.length > 700000) return toast("ছবিটি অনেক বড়, ছোট ছবি দিন"); draftImg = d; $("#pv").innerHTML = '<div class="pv"><img src="' + d + '" alt=""><button id="px">✕</button></div>'; $("#px").onclick = function () { draftImg = ""; $("#pv").innerHTML = ""; $("#fi").value = ""; }; });
    };
    $("#pb").onclick = function () {
      var t = $("#tx").value.trim(); if (!t && !draftImg) return toast("কিছু লিখুন বা ছবি দিন");
      this.disabled = true; var btn = this;
      B.addPost({ ch: ch, uid: me.id, name: me.name, course: me.course, role: me.role, pic: okImg(me.pic) ? me.pic : "", text: t, img: draftImg, likes: [], t: Date.now() })
        .then(function () { $("#tx").value = ""; draftImg = ""; $("#pv").innerHTML = ""; btn.disabled = false; toast("পোস্ট হয়েছে ✅"); }).catch(function (e) { btn.disabled = false; toast(e.message); });
    };
  }
  if (feedUn) feedUn();
  feedUn = B.watchPosts(ch, function (p) { posts = p.sort(function (a, b) { return b.t - a.t; }); renderPosts(); });
  $("#feed").onclick = feedClick;
}
function renderPosts() {
  var f = $("#feed"); if (!f) return;
  f.innerHTML = posts.map(postHTML).join("") || '<div class="empty card">এখনো কোনো পোস্ট নেই। আপনিই প্রথম পোস্টটি করুন! 🎉</div>';
  posts.forEach(function (p) { if (cmOpen[p.id]) cmDraw(p.id); });
}
function postHTML(p) {
  var liked = (p.likes || []).indexOf(me.id) > -1, n = (p.likes || []).length;
  return '<article class="card post" data-id="' + p.id + '"><header>' + av({ id: p.uid, name: p.name, pic: p.pic }) + '<div><b>' + esc(p.name) + (p.role === "admin" ? '<span class="bdg">অ্যাডমিন</span>' : "") + '</b><small>' + esc(p.course || "") + " · " + ago(p.t) + '</small></div>' +
    ((p.uid === me.id || isAdmin()) ? '<button class="x" data-a="del" title="মুছুন">🗑️</button>' : "") + '</header>' + (p.text ? '<p class="tx">' + esc(p.text) + "</p>" : "") + (okImg(p.img) ? '<img class="im" src="' + p.img + '" alt="">' : "") +
    '<div class="cnt">' + (n ? "👍 " + bn(n) + " জন পছন্দ করেছেন" : "") + '</div><footer><button data-a="like" class="' + (liked ? "on" : "") + '"><span>👍</span> পছন্দ</button><button data-a="cm">💬 মন্তব্য</button></footer><div class="cms" id="cm-' + p.id + '"></div></article>';
}
function feedClick(e) {
  var b = e.target.closest("[data-a]"); if (!b) return; var art = b.closest(".post"), id = art.dataset.id, p = posts.filter(function (x) { return x.id === id; })[0], a = b.dataset.a;
  if (a === "like") B.like(id, me.id, (p.likes || []).indexOf(me.id) < 0);
  if (a === "del" && confirm("এই পোস্টটি মুছে ফেলবেন?")) B.delPost(id);
  if (a === "cm") { if (cmOpen[id]) { cmOpen[id] = false; if (cmUn[id]) cmUn[id](); delete cmUn[id]; $("#cm-" + id).innerHTML = ""; } else { cmOpen[id] = true; cmUn[id] = B.watchComments(id, function (c) { cmCache[id] = c.sort(function (x, y) { return x.t - y.t; }); cmDraw(id); }); cmDraw(id); } }
  if (a === "cdel") B.delComment(b.dataset.id);
  if (a === "csend") { var inp = $("#ci-" + id); var t = inp.value.trim(); if (t) { B.addComment({ pid: id, uid: me.id, name: me.name, pic: okImg(me.pic) ? me.pic : "", text: t, t: Date.now() }); inp.value = ""; } }
}
function cmDraw(id) {
  var box = $("#cm-" + id); if (!box) return; var keep = $("#ci-" + id), val = keep ? keep.value : "";
  box.innerHTML = (cmCache[id] || []).map(function (c) { return '<div class="cm">' + av({ id: c.uid, name: c.name, pic: c.pic }, 34) + '<div class="b"><b>' + esc(c.name) + "</b><small>" + ago(c.t) + "</small><p>" + esc(c.text) + "</p></div>" + ((c.uid === me.id || isAdmin()) ? '<button class="x" data-a="cdel" data-id="' + c.id + '">✕</button>' : "") + "</div>"; }).join("") +
    '<div class="cin"><input id="ci-' + id + '" placeholder="মন্তব্য লিখুন…" value="' + esc(val) + '"><button class="btn" data-a="csend">➤</button></div>';
  var i = $("#ci-" + id); i.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); i.nextSibling.click(); } };
  if (keep && document.activeElement === keep) { i.focus(); }
}

/* --- সদস্য তালিকা --- */
function members() {
  var list = users.filter(function (u) { return u.status === "approved"; }), q = "";
  $("#main").innerHTML = '<div class="card hd"><h2>👥 সদস্যবৃন্দ</h2><p>মোট ' + bn(list.length) + ' জন শিক্ষার্থী ও অ্যাডমিন</p></div><input id="mq" placeholder="🔍 নাম বা কোর্স দিয়ে খুঁজুন"><div class="mem" id="ml"></div>';
  function show() { $("#ml").innerHTML = list.filter(function (u) { return (u.name + u.course).toLowerCase().indexOf(q) > -1; }).map(function (u) { return '<div class="card">' + av(u, 64) + "<b>" + esc(u.name) + (u.role === "admin" ? '<span class="bdg">অ্যাডমিন</span>' : "") + "</b><small>" + esc(u.course) + "</small><small>" + esc(u.batch || "") + "</small></div>"; }).join(""); }
  $("#mq").oninput = function () { q = this.value.toLowerCase(); show(); }; show();
}

/* --- অ্যাডমিন প্যানেল --- */
function admin() {
  if (!isAdmin()) { view = "feed"; return draw(); }
  var pend = users.filter(function (u) { return u.status === "pending"; }), ok = users.filter(function (u) { return u.status === "approved"; });
  function row(u, btns) { return '<div class="row">' + av(u) + '<div class="g"><b>' + esc(u.name) + "</b><small>" + esc(u.email) + " · " + esc(u.course) + " · " + esc(u.batch || "") + "</small></div>" + btns + "</div>"; }
  $("#main").innerHTML = '<div class="card hd"><h2>🛡️ অ্যাডমিন প্যানেল</h2><p>নতুন সদস্য অনুমোদন ও সদস্য ব্যবস্থাপনা</p></div><div class="card"><div class="stat"><div><b>' + bn(ok.length) + '</b>সদস্য</div><div><b>' + bn(pend.length) + '</b>অপেক্ষায়</div></div></div>' +
    '<div class="card"><h3>⏳ অনুমোদনের অপেক্ষায়</h3>' + (pend.map(function (u) { return row(u, '<button class="btn" data-ok="' + u.id + '">অনুমোদন</button><button class="btn red" data-no="' + u.id + '">বাতিল</button>'); }).join("") || '<p class="empty">কোনো নতুন অনুরোধ নেই</p>') + "</div>" +
    '<div class="card"><h3>✅ সদস্য তালিকা</h3>' + ok.map(function (u) { return row(u, u.id === me.id ? "" : '<button class="btn gray" data-no="' + u.id + '">সরান</button>'); }).join("") + "</div>";
  $("#main").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; if (b.dataset.ok) B.setUser(b.dataset.ok, { status: "approved" }).then(function () { toast("অনুমোদন হয়েছে ✅"); }); if (b.dataset.no && confirm("নিশ্চিত?")) B.setUser(b.dataset.no, { status: "rejected" }); };
}

/* --- আমার প্রোফাইল --- */
function profile() {
  $("#main").innerHTML = '<div class="card hd"><h2>👤 আমার প্রোফাইল</h2></div><div class="card" style="text-align:center">' + av(me, 96) + '<h2 style="margin-top:10px">' + esc(me.name) + '</h2><p style="color:var(--mute)">' + esc(me.email) + "<br>" + esc(me.course) + " · " + esc(me.batch || "") + '</p><br>' +
    '<label class="btn gray" style="cursor:pointer">📷 ছবি বদলান<input id="pf" type="file" accept="image/*" hidden></label> <button class="btn" id="th2">🌓 ডার্ক/লাইট মোড</button> <button class="btn red" id="lo">লগআউট</button></div>';
  $("#pf").onchange = function () { var f = this.files[0]; if (f) shrink(f, 160, 0.8, function (d) { B.setUser(me.id, { pic: d }).then(function () { toast("ছবি বদলেছে ✅"); }); }); };
  $("#th2").onclick = theme; $("#lo").onclick = function () { clearSubs(); B.logout(); };
}
function theme() { var d = document.documentElement.dataset.t === "dark" ? "light" : "dark"; document.documentElement.dataset.t = d; try { localStorage.setItem("apu-c-t", d); } catch (e) {} }
try { document.documentElement.dataset.t = localStorage.getItem("apu-c-t") || "light"; } catch (e) {}

/* ---------- চালু করা ---------- */
function start() { B.watchMe(function (u) { me = u; route(); }); }
function loadFire(i) {
  var f = ["app", "auth", "firestore"]; if (i >= f.length) { B = Fire(); return start(); }
  var s = document.createElement("script"); s.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-" + f[i] + "-compat.js"; s.onload = function () { loadFire(i + 1); };
  s.onerror = function () { $("#root").innerHTML = '<div class="wait"><div class="em">📡</div><h2>সংযোগ হচ্ছে না</h2><p>ইন্টারনেট সংযোগ দেখে পেজটি রিফ্রেশ করুন।</p></div>'; }; document.head.appendChild(s);
}
if (LIVE) loadFire(0); else { B = Demo(); start(); }
})();
