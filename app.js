// Страница Techno: чат, микрофон, озвучка и запуск ИИ-модели прямо на устройстве (см. llm.js и brain.js).
// Сервера нет: страница лежит на GitHub Pages, ответы считает само устройство, факты берутся из Википедии.
import * as Brain from "./brain.js";
import * as Layout from "./layout.js";
import * as LLM from "./llm.js";

// ---------- тексты интерфейса (английский по умолчанию) ----------
const UI = {
  en: {
    tagline: "Ask me anything, in any language", placeholder: "Type a message...", lang: "Language for the microphone",
    speak: "Read answers aloud", model: "AI model on this device", auto: "Automatic", remove: "Delete the downloaded model",
    hello: "Hi! I am Techno. Ask me anything: type it or press the microphone. I answer in your language.",
    foot: "Techno is a student project. It runs on your device and can make mistakes, check important facts.",
    thinking: "thinking", nomic: "Your browser cannot listen. Use Chrome, Edge or Safari, or just type.",
    micerr: "I could not hear you. Allow the microphone and try again.", error: "Something went wrong. Please try again.",
    game: "Game", copy: "Copy", play: "Play", enable: "Enable AI",
    dotAi: "AI is on (it runs on your device)", dotSimple: "Simple mode (no AI model)", dotLoad: "Loading the AI model...",
    noGpu: "This browser cannot run the AI model (it needs WebGPU: Chrome or Edge on a computer or an Android phone). Simple mode works: Wikipedia, games and maths.",
    loading: "Loading the AI model", ready: "The AI model is ready: it runs on your device.", failed: "The AI model did not start on this device. Simple mode is on.",
    readyMsg: "The AI model is ready. Now I can chat and translate too!",
    offer: "My AI runs on YOUR device, not on a server: no limits, and your questions stay with you. For that I need to download the model once ({name}, about {size}). It stays in your browser. Until then I work in simple mode.",
    metered: " You seem to be on mobile data: this will use about {size} of traffic.", dl: "Download", later: "Not now",
    removed: "The model was deleted from this device.", device: "Device: ", noGpuShort: "no WebGPU",
    warm: "Warming up the AI (the first time can take up to a minute)",
    gpuLost: "The graphics card stopped (the model was too heavy for it). I switched to simple mode: you can enable a smaller model with the button above, or reload the page.",
  },
  ru: {
    tagline: "Спроси меня о чём угодно на любом языке", placeholder: "Напиши сообщение...", lang: "Язык для микрофона",
    speak: "Читать ответы вслух", model: "ИИ-модель на этом устройстве", auto: "Автоматически", remove: "Удалить скачанную модель",
    hello: "Привет! Я Techno. Спрашивай о чём угодно: напиши или нажми на микрофон. Отвечаю на твоём языке.",
    foot: "Techno — школьный проект. Он работает на твоём устройстве и может ошибаться, важное проверяй.",
    thinking: "думаю", nomic: "Этот браузер не умеет слушать. Открой Chrome, Edge или Safari, либо пиши текстом.",
    micerr: "Не расслышал. Разреши микрофон и попробуй ещё раз.", error: "Что-то пошло не так. Попробуй ещё раз.",
    game: "Игра", copy: "Копировать", play: "Играть", enable: "Включить ИИ",
    dotAi: "ИИ включён (работает на твоём устройстве)", dotSimple: "Простой режим (без ИИ-модели)", dotLoad: "Загружается ИИ-модель...",
    noGpu: "Этот браузер не может запустить ИИ-модель (нужен WebGPU: Chrome или Edge на компьютере или Android-телефоне). Простой режим работает: Википедия, игры и счёт.",
    loading: "Загружаю ИИ-модель", ready: "ИИ-модель готова: она работает на твоём устройстве.", failed: "ИИ-модель не запустилась на этом устройстве. Включён простой режим.",
    readyMsg: "ИИ-модель готова. Теперь я умею и болтать, и переводить!",
    offer: "Мой ИИ работает на ТВОЁМ устройстве, а не на сервере: поэтому лимитов нет, и твои вопросы остаются у тебя. Для этого нужно один раз скачать модель ({name}, около {size}). Она останется в браузере. Пока я в простом режиме.",
    metered: " Похоже, у тебя мобильный интернет: это потратит около {size} трафика.", dl: "Скачать", later: "Не сейчас",
    removed: "Модель удалена с этого устройства.", device: "Устройство: ", noGpuShort: "нет WebGPU",
    warm: "Разогреваю ИИ (в первый раз это может занять до минуты)",
    gpuLost: "Видеокарта остановилась (модель оказалась ей тяжела). Я перешёл в простой режим: можно включить модель поменьше кнопкой сверху или перезагрузить страницу.",
  },
  id: {
    tagline: "Tanya apa saja, dalam bahasa apa pun", placeholder: "Ketik pesan...", lang: "Bahasa untuk mikrofon",
    speak: "Bacakan jawaban", model: "Model AI di perangkat ini", auto: "Otomatis", remove: "Hapus model yang diunduh",
    hello: "Halo! Saya Techno. Tanya apa saja: ketik atau tekan mikrofon. Saya menjawab dalam bahasamu.",
    foot: "Techno adalah proyek pelajar. Berjalan di perangkatmu dan bisa salah, cek fakta penting.",
    thinking: "berpikir", nomic: "Browser ini tidak bisa mendengar. Pakai Chrome, Edge, atau Safari, atau ketik saja.",
    micerr: "Saya tidak mendengar. Izinkan mikrofon lalu coba lagi.", error: "Terjadi kesalahan. Coba lagi.",
    game: "Game", copy: "Salin", play: "Main", enable: "Aktifkan AI",
    dotAi: "AI aktif (berjalan di perangkatmu)", dotSimple: "Mode sederhana (tanpa model AI)", dotLoad: "Memuat model AI...",
    noGpu: "Browser ini tidak bisa menjalankan model AI (perlu WebGPU: Chrome atau Edge di komputer atau ponsel Android). Mode sederhana tetap jalan: Wikipedia, game, dan hitungan.",
    loading: "Memuat model AI", ready: "Model AI siap: berjalan di perangkatmu.", failed: "Model AI tidak bisa jalan di perangkat ini. Mode sederhana aktif.",
    readyMsg: "Model AI siap. Sekarang saya bisa mengobrol dan menerjemahkan juga!",
    offer: "AI saya berjalan di perangkatMU, bukan di server: tanpa batas, dan pertanyaanmu tetap bersamamu. Untuk itu model perlu diunduh sekali ({name}, sekitar {size}). Model tersimpan di browser. Sementara itu saya di mode sederhana.",
    metered: " Sepertinya kamu memakai data seluler: ini memakai sekitar {size} kuota.", dl: "Unduh", later: "Nanti",
    removed: "Model dihapus dari perangkat ini.", device: "Perangkat: ", noGpuShort: "tanpa WebGPU",
    warm: "Memanaskan AI (pertama kali bisa sampai satu menit)",
    gpuLost: "Kartu grafis berhenti (model terlalu berat). Saya pindah ke mode sederhana: aktifkan model yang lebih kecil dengan tombol di atas, atau muat ulang halaman.",
  },
};
const LANGS = [
  ["en-US", "English"], ["ru-RU", "Русский"], ["id-ID", "Bahasa Indonesia"], ["es-ES", "Español"], ["fr-FR", "Français"],
  ["de-DE", "Deutsch"], ["pt-BR", "Português"], ["it-IT", "Italiano"], ["tr-TR", "Türkçe"], ["uk-UA", "Українська"],
  ["pl-PL", "Polski"], ["nl-NL", "Nederlands"], ["ar-SA", "العربية"], ["hi-IN", "हिन्दी"], ["zh-CN", "中文"],
  ["ja-JP", "日本語"], ["ko-KR", "한국어"], ["vi-VN", "Tiếng Việt"], ["th-TH", "ไทย"], ["ms-MY", "Bahasa Melayu"],
];

const $ = (id) => document.getElementById(id);
const chat = $("chat"), msgIn = $("msg"), form = $("form"), micBtn = $("micBtn"), quiz = $("quiz");
const settings = $("settings"), langSel = $("langSel"), speakChk = $("speakChk"), modelSel = $("modelSel");
let history = [];             // последние реплики: ["user"|"bot", текст]
let busy = false;
let rec = null, listening = false;
let engine = null;            // запущенная ИИ-модель или null (простой режим)
let device = null;            // что умеет устройство (llm.probe)
let loading = false;

function store(key, val) {
  try { if (val === undefined) { return localStorage.getItem(key); } if (val === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, val); } } catch (e) { return null; }
  return null;
}
const uiLang = (navigator.language || "en").slice(0, 2);
const T = UI[uiLang] || UI.en;
let speechLang = store("techno.lang") || ((LANGS.filter((l) => l[0].slice(0, 2) === uiLang)[0] || LANGS[0])[0]);
const fmtSize = (mb) => (mb >= 1000 ? (mb / 1000).toFixed(1) + " GB" : mb + " MB");

// ---------- подписи и настройки ----------
document.documentElement.lang = uiLang in UI ? uiLang : "en";
$("tagline").textContent = T.tagline;
msgIn.placeholder = T.placeholder;
$("lblLang").textContent = T.lang;
$("lblSpeak").textContent = T.speak;
$("lblModel").textContent = T.model;
$("removeBtn").textContent = T.remove;
$("enableBtn").textContent = T.enable;
$("foot").textContent = T.foot;
LANGS.forEach((l) => { const o = document.createElement("option"); o.value = l[0]; o.textContent = l[1]; langSel.appendChild(o); });
langSel.value = speechLang;
speakChk.checked = store("techno.speak") === "1";
langSel.addEventListener("change", () => { speechLang = langSel.value; store("techno.lang", speechLang); });
speakChk.addEventListener("change", () => { store("techno.speak", speakChk.checked ? "1" : "0"); if (!speakChk.checked && window.speechSynthesis) { speechSynthesis.cancel(); } });
$("settingsBtn").addEventListener("click", function () {
  const open = settings.hidden;
  settings.hidden = !open;
  this.setAttribute("aria-expanded", String(open));
});
[["auto", T.auto], ...Object.entries(LLM.MODELS).map(([k, m]) => [k, `${m.name} (${fmtSize(m.mb)})`])].forEach(([k, label]) => {
  const o = document.createElement("option"); o.value = k; o.textContent = label; modelSel.appendChild(o);
});
modelSel.value = store("techno.model") || "auto";

// ---------- сообщения ----------
function addCode(parent, lang, code) {
  const pre = document.createElement("pre");
  const c = document.createElement("code");
  c.textContent = code;
  pre.appendChild(c);
  parent.appendChild(pre);
  const row = document.createElement("div");
  row.className = "row";
  const copy = document.createElement("button");
  copy.type = "button"; copy.className = "btn ghost small"; copy.textContent = T.copy;
  copy.addEventListener("click", () => { try { navigator.clipboard.writeText(code); } catch (e) { /* нет доступа к буферу */ } });
  row.appendChild(copy);
  if (/^html?$/i.test(lang)) {
    const play = document.createElement("button");
    play.type = "button"; play.className = "btn small"; play.textContent = "▶ " + T.play;
    play.addEventListener("click", () => { addGame(parent, T.game, code); play.disabled = true; });
    row.appendChild(play);
  }
  parent.appendChild(row);
}
// игра или страница запускается в «песочнице»: у неё нет доступа ни к этой странице, ни к твоим данным
function addGame(parent, title, html) {
  const box = document.createElement("div");
  box.className = "game";
  const f = document.createElement("iframe");
  f.setAttribute("sandbox", "allow-scripts");
  f.setAttribute("referrerpolicy", "no-referrer");
  f.title = title;
  f.srcdoc = html;
  box.appendChild(f);
  parent.appendChild(box);
}
function renderBot(d, text) {
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) { const t = document.createElement("div"); t.textContent = text.slice(last, m.index).trim(); if (t.textContent) { d.appendChild(t); } }
    addCode(d, m[1], m[2].replace(/\n$/, ""));
    last = re.lastIndex;
  }
  const rest = text.slice(last).trim();
  if (rest) { const tt = document.createElement("div"); tt.textContent = rest; d.appendChild(tt); }
}
function add(role, text, extra, game) {
  const d = document.createElement("div");
  d.className = "msg " + role;
  if (role === "bot" && text.indexOf("```") !== -1) { renderBot(d, text); } else { d.textContent = text; }
  if (game && game.html) { addGame(d, game.name || T.game, game.html); }
  if (extra) { const s = document.createElement("span"); s.className = "src"; s.textContent = extra; d.appendChild(s); }
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}
function showQuiz(options) {
  quiz.textContent = "";
  if (!options || !options.length) { quiz.hidden = true; return; }
  options.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = o;
    b.addEventListener("click", () => send(o));
    quiz.appendChild(b);
  });
  quiz.hidden = false;
}

// ---------- озвучка ответа в браузере (код вслух не читаем) ----------
function speak(text, lang) {
  text = (text || "").replace(/```[\s\S]*?```/g, " ").trim();
  if (!speakChk.checked || !window.speechSynthesis || !text) { return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const want = (lang || "en").slice(0, 2);
  const v = speechSynthesis.getVoices().filter((x) => x.lang.slice(0, 2) === want)[0];
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = want; }
  speechSynthesis.speak(u);
}

// ---------- состояние ИИ-модели ----------
function setDot(kind) {
  const d = $("dot");
  d.className = "dot " + kind;
  d.title = kind === "ok" ? T.dotAi : kind === "load" ? T.dotLoad : T.dotSimple;
}
function showStatus(text, progress, enableTier) {
  $("status").hidden = !text;
  $("statusText").textContent = text || "";
  $("progress").hidden = typeof progress !== "number" && progress !== null;
  if (typeof progress === "number") { $("progress").value = progress; } else if (progress === null) { $("progress").removeAttribute("value"); }
  $("enableBtn").hidden = !enableTier;
  $("enableBtn").onclick = enableTier ? () => startModel(enableTier) : null;
}
function chosenTier() {
  const c = store("techno.model") || "auto";
  return c === "auto" ? LLM.autoTier(device) : c;
}
function describeDevice() {
  if (!device) { return; }
  const parts = [device.gpu ? (device.adapter || "WebGPU") + (device.f16 ? "" : " (f32)") : T.noGpuShort];
  if (device.mobile) { parts.push("mobile"); }
  if (device.mem) { parts.push("~" + device.mem + " GB RAM"); }
  $("deviceInfo").textContent = T.device + parts.join(", ");
}

// Спрашиваем, прежде чем качать сотни мегабайт: у друзей может быть дорогой мобильный интернет
function offerDownload(tier) {
  const m = LLM.MODELS[tier];
  const size = fmtSize(m.mb);
  const d = add("bot", T.offer.replace("{name}", m.name).replace("{size}", size) + (device.metered ? T.metered.replace("{size}", size) : ""));
  const row = document.createElement("div");
  row.className = "row";
  const yes = document.createElement("button");
  yes.type = "button"; yes.className = "btn small"; yes.textContent = `${T.dl} (${size})`;
  const no = document.createElement("button");
  no.type = "button"; no.className = "btn ghost small"; no.textContent = T.later;
  yes.addEventListener("click", () => { row.remove(); startModel(tier); });
  no.addEventListener("click", () => { row.remove(); showStatus(T.dotSimple, undefined, tier); });
  row.appendChild(yes); row.appendChild(no);
  d.appendChild(row);
  showStatus(T.dotSimple, undefined, tier);
}

async function startModel(tier) {
  if (loading) { return; }
  loading = true;
  if (engine) { await engine.unload(); engine = null; }
  setDot("load");
  showStatus(T.loading + " 0%", 0);
  try {
    const fresh = await LLM.load(tier, device, (p) => {
      const pr = p && typeof p.progress === "number" ? p.progress : 0;
      showStatus(T.loading + " " + Math.round(pr * 100) + "%", pr);
    }, { safe: store("techno.safe") === "1" });
    showStatus(T.warm, null);
    await fresh.warmup();                                               // первый запрос долгий (видеокарта компилирует программы): делаем его заранее
    engine = fresh;                                                     // только теперь чат может пользоваться моделью
    store("techno.loaded", tier);
    setDot("ok");
    showStatus(T.ready);
    setTimeout(() => { if (engine) { showStatus(""); } }, 5000);
    add("bot", T.readyMsg);
  } catch (e) {
    console.warn("model failed", e);
    engine = null;
    setDot("warn");
    const small = tier !== "tiny" ? "tiny" : undefined;                 // не хватило памяти: предложим модель поменьше
    showStatus(T.failed + " (" + String((e && e.message) || e).slice(0, 100) + ")", undefined, small);
  }
  loading = false;
}

// После зависания видеокарта несколько секунд недоступна («No available adapters»): ждём и пробуем поднять модель снова, до трёх раз
async function restartAfterLoss(tier, attempt = 1) {
  showStatus(T.warm, null);
  await new Promise((r) => setTimeout(r, 6000 * attempt));
  await startModel(tier);
  if (!engine && attempt < 3) { return restartAfterLoss(tier, attempt + 1); }
  if (!engine) { showStatus(T.failed, undefined, tier === "big" ? "medium" : tier === "medium" ? "tiny" : undefined); }
}

async function boot() {
  device = await LLM.probe();
  describeDevice();
  if (!device.gpu) { setDot("warn"); showStatus(T.noGpu); return; }
  const tier = chosenTier();
  setDot("warn");
  if (store("techno.loaded") === tier && await LLM.isCached(tier, device)) { startModel(tier); } else { offerDownload(tier); }
}

modelSel.addEventListener("change", async () => {
  store("techno.model", modelSel.value);
  if (!device || !device.gpu) { return; }
  const tier = chosenTier();
  if (engine && engine.tier === tier) { return; }
  if (await LLM.isCached(tier, device)) { startModel(tier); } else { offerDownload(tier); }
});
$("removeBtn").addEventListener("click", async () => {
  if (!device || !device.gpu) { return; }
  if (engine) { await engine.unload(); engine = null; }
  for (const tier of Object.keys(LLM.MODELS)) { await LLM.removeModel(tier, device); }
  store("techno.loaded", null);
  store("techno.safe", null);
  setDot("warn");
  showStatus(T.removed, undefined, chosenTier());
});

// ---------- отправка ----------
async function send(text) {
  text = (text || "").trim();
  if (!text || busy) { return; }
  busy = true;
  showQuiz([]);
  if (window.speechSynthesis) { speechSynthesis.cancel(); }
  const userMsg = add("user", text);
  msgIn.value = "";
  const wait = document.createElement("div");
  wait.className = "msg bot";
  wait.setAttribute("aria-label", T.thinking);
  const tp = document.createElement("span");
  tp.className = "typing";
  tp.innerHTML = "<i></i><i></i><i></i>";            // фиксированная разметка без чужих данных
  wait.appendChild(tp);
  chat.appendChild(wait);
  chat.scrollTop = chat.scrollHeight;
  let live = null;                                    // пузырь, в котором ответ появляется по словам
  const onToken = (partial) => {
    if (!live) { if (wait.parentNode) { chat.removeChild(wait); } live = add("bot", partial); } else { live.textContent = partial; }
    chat.scrollTop = chat.scrollHeight;
  };
  try {
    const j = await Brain.reply(text, { llm: engine, history, onToken: engine ? onToken : undefined });
    if (wait.parentNode) { chat.removeChild(wait); }
    if (live) { chat.removeChild(live); }
    if (j.fixed) {
      const fx = document.createElement("span");
      fx.className = "src";
      fx.textContent = "→ " + j.fixed;
      userMsg.appendChild(fx);
    }
    history.push(["user", j.fixed || text]);
    history.push(["bot", j.text.slice(0, 500)]);
    history = history.slice(-8);
    add("bot", j.text, j.sources && j.sources.length ? "Wikipedia: " + j.sources.slice(0, 2).join(", ") : "", j.game);
    showQuiz(j.options);
    speak(j.text, j.lang);
  } catch (e) {
    console.error(e);
    if (wait.parentNode) { chat.removeChild(wait); }
    if (live && live.parentNode) { chat.removeChild(live); }
    if (engine && LLM.isGpuLost(e)) {                                   // видеокарта «потерялась»
      const tier = engine.tier;
      const wasSafe = store("techno.safe") === "1";
      engine = null;
      setDot("warn");
      add("err", T.gpuLost);
      if (!wasSafe) { store("techno.safe", "1"); }                         // дальше эта модель получает совсем короткие запросы
      restartAfterLoss(tier);
    } else {
      add("err", T.error);
    }
  }
  busy = false;
  msgIn.focus();
}
form.addEventListener("submit", (e) => { e.preventDefault(); send(msgIn.value); });

// ---------- микрофон: распознавание речи встроено в браузер, звук никуда не отправляется нами ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  micBtn.hidden = true;
} else {
  micBtn.addEventListener("click", () => {
    if (listening) { rec.stop(); return; }
    if (window.speechSynthesis) { speechSynthesis.cancel(); }
    rec = new SR();
    rec.lang = speechLang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; } else { interim += e.results[i][0].transcript; }
      }
      msgIn.value = (finalText + interim).trim();
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") { add("err", T.micerr); } };
    rec.onend = () => {
      listening = false;
      micBtn.setAttribute("aria-pressed", "false");
      if (finalText.trim()) { send(finalText); }
    };
    try { rec.start(); listening = true; micBtn.setAttribute("aria-pressed", "true"); } catch (e) { add("err", T.nomic); }
  });
}

// ---------- запуск ----------
if (window.speechSynthesis) { speechSynthesis.getVoices(); }
fetch("words.json").then((r) => r.json()).then(Layout.setData).catch(() => { /* без словаря раскладку просто не исправляем */ });
add("bot", T.hello);
setDot("warn");
msgIn.focus();
boot();
window.techno = { Brain, LLM, Layout, state: () => ({ engine, device }) };       // для отладки в консоли
