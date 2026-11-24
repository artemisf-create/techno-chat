(function () {
  "use strict";

  var API = (window.TECHNO_API || "").replace(/\/$/, "");
  var apiReady = Promise.resolve();
  // Страница лежит на GitHub Pages, а «мозг» на ноутбуке: его адрес (он меняется при каждом запуске туннеля) берём из backend.json рядом со страницей.
  // Адрес из чужой ссылки не принимаем: иначе можно было бы подсунуть человеку страницу, которая шлёт его сообщения на чужой сервер.
  if (!API && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    apiReady = fetch("backend.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && typeof j.api === "string" && /^https:\/\/[a-z0-9.-]+$/i.test(j.api.replace(/\/$/, ""))) { API = j.api.replace(/\/$/, ""); }
    }).catch(function () {});
  }

  // ---------- тексты интерфейса (английский по умолчанию) ----------
  var UI = {
    en: {
      tagline: "Ask me anything, in any language", placeholder: "Type a message...", lang: "Language for the microphone",
      speak: "Read answers aloud", code: "Unlimited code", name: "Name", pass: "Password", login: "Log in", signup: "Sign up", logout: "Log out",
      redeem: "Use code", admin: "Admin panel", whoami: "You are ", unl: "unlimited messages", leftNow: "messages left today: ",
      hello: "Hi! I am Techno. Ask me anything: type it or press the microphone. I answer in your language.",
      foot: "Techno is a student project. It can make mistakes, check important facts.", thinking: "thinking",
      left: "Messages left today: ", nomic: "Your browser cannot listen. Use Chrome, Edge or Safari, or just type.",
      micerr: "I could not hear you. Allow the microphone and try again.", neterr: "No connection to Techno. Is the server running?",
      brainLlm: "AI brain is on", brainWiki: "Simple mode (no AI model)", brainOff: "Offline", needLogin: "Enter name and password.",
      done: "Done.", game: "Game", close: "Close", copy: "Copy", play: "Play"
    },
    ru: {
      tagline: "Спроси меня о чём угодно на любом языке", placeholder: "Напиши сообщение...", lang: "Язык для микрофона",
      speak: "Читать ответы вслух", code: "Код безлимита", name: "Имя", pass: "Пароль", login: "Войти", signup: "Регистрация", logout: "Выйти",
      redeem: "Применить код", admin: "Админка", whoami: "Ты: ", unl: "сообщения без лимита", leftNow: "сообщений на сегодня осталось: ",
      hello: "Привет! Я Techno. Спрашивай о чём угодно: напиши или нажми на микрофон. Отвечаю на твоём языке.",
      foot: "Techno — школьный проект. Он может ошибаться, важное проверяй.", thinking: "думаю",
      left: "Сообщений на сегодня осталось: ", nomic: "Этот браузер не умеет слушать. Открой Chrome, Edge или Safari, либо пиши текстом.",
      micerr: "Не расслышал. Разреши микрофон и попробуй ещё раз.", neterr: "Нет связи с Techno. Запущен ли сервер?",
      brainLlm: "ИИ-мозг включён", brainWiki: "Простой режим (без ИИ-модели)", brainOff: "Не в сети", needLogin: "Введи имя и пароль.",
      done: "Готово.", game: "Игра", close: "Закрыть", copy: "Копировать", play: "Играть"
    },
    id: {
      tagline: "Tanya apa saja, dalam bahasa apa pun", placeholder: "Ketik pesan...", lang: "Bahasa untuk mikrofon",
      speak: "Bacakan jawaban", code: "Kode tanpa batas", name: "Nama", pass: "Kata sandi", login: "Masuk", signup: "Daftar", logout: "Keluar",
      redeem: "Pakai kode", admin: "Panel admin", whoami: "Kamu: ", unl: "pesan tanpa batas", leftNow: "sisa pesan hari ini: ",
      hello: "Halo! Saya Techno. Tanya apa saja: ketik atau tekan mikrofon. Saya menjawab dalam bahasamu.",
      foot: "Techno adalah proyek pelajar. Bisa salah, cek fakta penting.", thinking: "berpikir",
      left: "Sisa pesan hari ini: ", nomic: "Browser ini tidak bisa mendengar. Pakai Chrome, Edge, atau Safari, atau ketik saja.",
      micerr: "Saya tidak mendengar. Izinkan mikrofon lalu coba lagi.", neterr: "Tidak terhubung ke Techno. Apakah server berjalan?",
      brainLlm: "Otak AI aktif", brainWiki: "Mode sederhana (tanpa model AI)", brainOff: "Offline", needLogin: "Isi nama dan kata sandi.",
      done: "Selesai.", game: "Game", close: "Tutup", copy: "Salin", play: "Main"
    }
  };
  var LANGS = [
    ["en-US", "English"], ["ru-RU", "Русский"], ["id-ID", "Bahasa Indonesia"], ["es-ES", "Español"], ["fr-FR", "Français"],
    ["de-DE", "Deutsch"], ["pt-BR", "Português"], ["it-IT", "Italiano"], ["tr-TR", "Türkçe"], ["uk-UA", "Українська"],
    ["pl-PL", "Polski"], ["nl-NL", "Nederlands"], ["ar-SA", "العربية"], ["hi-IN", "हिन्दी"], ["zh-CN", "中文"],
    ["ja-JP", "日本語"], ["ko-KR", "한국어"], ["vi-VN", "Tiếng Việt"], ["th-TH", "ไทย"], ["ms-MY", "Bahasa Melayu"]
  ];

  var $ = function (id) { return document.getElementById(id); };
  var chat = $("chat"), msgIn = $("msg"), form = $("form"), micBtn = $("micBtn"), quiz = $("quiz");
  var settings = $("settings"), langSel = $("langSel"), speakChk = $("speakChk"), codeIn = $("codeIn");
  var history = [];             // последние реплики: ["user"|"bot", текст]
  var busy = false;
  var rec = null, listening = false;
  var me = null;                // вошедший человек или null

  function store(key, val) {
    try { if (val === undefined) { return localStorage.getItem(key); } if (val === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, val); } } catch (e) { return null; }
    return null;
  }

  var uiLang = (navigator.language || "en").slice(0, 2);
  var T = UI[uiLang] || UI.en;
  var speechLang = store("techno.lang") || ((LANGS.filter(function (l) { return l[0].slice(0, 2) === uiLang; })[0] || LANGS[0])[0]);

  // ---------- подписи ----------
  function applyTexts() {
    document.documentElement.lang = uiLang in UI ? uiLang : "en";
    $("tagline").textContent = T.tagline;
    msgIn.placeholder = T.placeholder;
    $("lblLang").textContent = T.lang;
    $("lblSpeak").textContent = T.speak;
    $("lblCode").textContent = T.code;
    $("lblName").textContent = T.name;
    $("lblPass").textContent = T.pass;
    $("loginBtn").textContent = T.login;
    $("signupBtn").textContent = T.signup;
    $("logoutBtn").textContent = T.logout;
    $("redeemBtn").textContent = T.redeem;
    $("adminLink").textContent = T.admin;
    $("foot").textContent = T.foot;
  }
  applyTexts();
  LANGS.forEach(function (l) {
    var o = document.createElement("option");
    o.value = l[0]; o.textContent = l[1];
    langSel.appendChild(o);
  });
  langSel.value = speechLang;
  speakChk.checked = store("techno.speak") === "1";
  langSel.addEventListener("change", function () { speechLang = langSel.value; store("techno.lang", speechLang); });
  speakChk.addEventListener("change", function () { store("techno.speak", speakChk.checked ? "1" : "0"); if (!speakChk.checked && window.speechSynthesis) { speechSynthesis.cancel(); } });
  $("settingsBtn").addEventListener("click", function () {
    var open = settings.hidden;
    settings.hidden = !open;
    this.setAttribute("aria-expanded", String(open));
  });

  // ---------- запросы к серверу (токен входа лежит в localStorage и уходит в заголовке) ----------
  function api(path, body) {
    return apiReady.then(function () {
      var headers = { "Content-Type": "application/json" };
      var tok = store("techno.token");
      if (tok) { headers.Authorization = "Bearer " + tok; }
      return fetch(API + path, { method: body === undefined ? "GET" : "POST", headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }

  // ---------- аккаунт ----------
  function showAuth(msg, bad) {
    var m = $("authMsg");
    m.textContent = msg || "";
    m.className = "hint" + (bad ? " bad" : "");
  }
  function renderMe() {
    $("authOut").hidden = !!me;
    $("authIn").hidden = !me;
    $("whoTop").textContent = me ? me.name : "";
    if (me) {
      $("whoami").textContent = T.whoami + me.name + (me.role === "admin" ? " (admin)" : "") + " · " + (me.unlimited ? T.unl : T.leftNow + me.left);
      $("adminLink").hidden = me.role !== "admin";
      $("codeIn").parentNode.hidden = me.unlimited;
      $("redeemBtn").hidden = me.unlimited;
    }
  }
  function loadMe() {
    return api("/api/me").then(function (r) {
      me = r.j && r.j.user ? r.j.user : null;
      if (!me && store("techno.token")) { store("techno.token", null); }
      renderMe();
    }).catch(function () {});
  }
  function authDone(r) {
    if (r.ok && r.j.token) {
      store("techno.token", r.j.token);
      me = r.j.user;
      $("passIn").value = "";
      showAuth("");
      renderMe();
    } else {
      showAuth((r.j && r.j.text) || T.neterr, true);
    }
  }
  function credentials() {
    var n = $("nameIn").value.trim(), p = $("passIn").value;
    if (!n || !p) { showAuth(T.needLogin, true); return null; }
    return { name: n, password: p };
  }
  $("loginBtn").addEventListener("click", function () { var c = credentials(); if (c) { api("/api/login", c).then(authDone).catch(function () { showAuth(T.neterr, true); }); } });
  $("signupBtn").addEventListener("click", function () { var c = credentials(); if (c) { api("/api/register", c).then(authDone).catch(function () { showAuth(T.neterr, true); }); } });
  $("logoutBtn").addEventListener("click", function () {
    api("/api/logout", {}).catch(function () {}).then(function () { store("techno.token", null); me = null; renderMe(); });
  });
  $("redeemBtn").addEventListener("click", function () {
    api("/api/redeem", { code: codeIn.value.trim() }).then(function (r) {
      if (r.ok) { me = r.j.user; codeIn.value = ""; showAuth(T.done); renderMe(); } else { showAuth(r.j.text || T.neterr, true); }
    }).catch(function () { showAuth(T.neterr, true); });
  });
  $("passIn").addEventListener("keydown", function (e) { if (e.key === "Enter") { $("loginBtn").click(); } });

  // ---------- сообщения ----------
  function addCode(parent, lang, code) {
    var pre = document.createElement("pre");
    var c = document.createElement("code");
    c.textContent = code;
    pre.appendChild(c);
    parent.appendChild(pre);
    var row = document.createElement("div");
    row.className = "row";
    var copy = document.createElement("button");
    copy.type = "button"; copy.className = "btn ghost small"; copy.textContent = T.copy;
    copy.addEventListener("click", function () { try { navigator.clipboard.writeText(code); } catch (e) { } });
    row.appendChild(copy);
    if (/^html?$/i.test(lang)) {
      var play = document.createElement("button");
      play.type = "button"; play.className = "btn small"; play.textContent = "▶ " + T.play;
      play.addEventListener("click", function () { addGame(parent, T.game, code); play.disabled = true; });
      row.appendChild(play);
    }
    parent.appendChild(row);
  }
  // игра или страница запускается в «песочнице»: у неё нет доступа ни к этой странице, ни к твоим данным
  function addGame(parent, title, html) {
    var box = document.createElement("div");
    box.className = "game";
    var f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("referrerpolicy", "no-referrer");
    f.title = title;
    f.srcdoc = html;
    box.appendChild(f);
    parent.appendChild(box);
  }
  function renderBot(d, text) {
    var re = /```(\w*)\n([\s\S]*?)```/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) { var t = document.createElement("div"); t.textContent = text.slice(last, m.index).trim(); if (t.textContent) { d.appendChild(t); } }
      addCode(d, m[1], m[2].replace(/\n$/, ""));
      last = re.lastIndex;
    }
    var rest = text.slice(last).trim();
    if (rest) { var tt = document.createElement("div"); tt.textContent = rest; d.appendChild(tt); }
  }
  function add(role, text, extra, game) {
    var d = document.createElement("div");
    d.className = "msg " + role;
    if (role === "bot" && text.indexOf("```") !== -1) { renderBot(d, text); } else { d.textContent = text; }
    if (game && game.html) { addGame(d, game.name || T.game, game.html); }
    if (extra) {
      var s = document.createElement("span");
      s.className = "src";
      s.textContent = extra;
      d.appendChild(s);
    }
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }
  function showQuiz(options) {
    quiz.textContent = "";
    if (!options || !options.length) { quiz.hidden = true; return; }
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = o;
      b.addEventListener("click", function () { send(o); });
      quiz.appendChild(b);
    });
    quiz.hidden = false;
  }

  // ---------- озвучка ответа в браузере (код вслух не читаем) ----------
  function speak(text, lang) {
    text = (text || "").replace(/```[\s\S]*?```/g, " ").trim();
    if (!speakChk.checked || !window.speechSynthesis || !text) { return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var want = (lang || "en").slice(0, 2);
    var v = speechSynthesis.getVoices().filter(function (x) { return x.lang.slice(0, 2) === want; })[0];
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = want; }
    speechSynthesis.speak(u);
  }

  // ---------- отправка ----------
  function send(text) {
    text = (text || "").trim();
    if (!text || busy) { return; }
    busy = true;
    showQuiz([]);
    if (window.speechSynthesis) { speechSynthesis.cancel(); }
    var userMsg = add("user", text);
    msgIn.value = "";
    var wait = document.createElement("div");
    wait.className = "msg bot";
    wait.setAttribute("aria-label", T.thinking);
    var tp = document.createElement("span");
    tp.className = "typing";
    tp.innerHTML = "<i></i><i></i><i></i>";            // фиксированная разметка без чужих данных
    wait.appendChild(tp);
    chat.appendChild(wait);
    chat.scrollTop = chat.scrollHeight;
    api("/api/chat", { message: text, history: history }).then(function (res) {
      chat.removeChild(wait);
      var j = res.j || {};
      if (!j.text) { add("err", T.neterr); return; }
      if (!res.ok) { add("err", j.text); return; }
      if (j.fixed) {
        var fx = document.createElement("span");
        fx.className = "src";
        fx.textContent = "→ " + j.fixed;
        userMsg.appendChild(fx);
      }
      history.push(["user", j.fixed || text]);
      history.push(["bot", j.text.slice(0, 500)]);
      history = history.slice(-8);
      var extra = j.sources && j.sources.length ? "Wikipedia: " + j.sources.slice(0, 2).join(", ") : "";
      if (typeof j.left === "number") { extra += (extra ? "\n" : "") + T.left + j.left; if (me) { me.left = j.left; renderMe(); } }
      add("bot", j.text, extra, j.game);
      showQuiz(j.options);
      speak(j.text, j.lang);
    }).catch(function () {
      if (wait.parentNode) { chat.removeChild(wait); }
      add("err", T.neterr);
    }).then(function () { busy = false; msgIn.focus(); });
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); send(msgIn.value); });

  // ---------- микрофон: распознавание речи встроено в браузер, звук на наш сервер не уходит ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    micBtn.hidden = true;
  } else {
    micBtn.addEventListener("click", function () {
      if (listening) { rec.stop(); return; }
      if (window.speechSynthesis) { speechSynthesis.cancel(); }
      rec = new SR();
      rec.lang = speechLang;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      var finalText = "";
      rec.onresult = function (e) {
        var interim = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; } else { interim += e.results[i][0].transcript; }
        }
        msgIn.value = (finalText + interim).trim();
      };
      rec.onerror = function (e) {
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") { add("err", T.micerr); }
      };
      rec.onend = function () {
        listening = false;
        micBtn.setAttribute("aria-pressed", "false");
        if (finalText.trim()) { send(finalText); }
      };
      try { rec.start(); listening = true; micBtn.setAttribute("aria-pressed", "true"); } catch (e) { add("err", T.nomic); }
    });
  }

  // ---------- состояние мозга ----------
  api("/api/health").then(function (r) {
    var h = r.j, d = $("dot");
    if (h.brain === "llm") { d.className = "dot ok"; d.title = T.brainLlm; } else { d.className = "dot warn"; d.title = T.brainWiki; }
  }).catch(function () { var d = $("dot"); d.className = "dot bad"; d.title = T.brainOff; });
  if (window.speechSynthesis) { speechSynthesis.getVoices(); }

  loadMe();
  add("bot", T.hello);
  msgIn.focus();
})();
