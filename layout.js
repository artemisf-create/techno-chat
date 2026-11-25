// Исправление «не той раскладки» прямо в браузере (порт layout.py).
//   "lfdfq tuj yfexbv"  ->  "давай его научим"     (русский текст, набранный на английской раскладке)
//   "рудщ"              ->  "hello"                 (английский, набранный на русской раскладке)
// Как понимаем, что раскладка не та: каждое слово «переводим» в другую раскладку и смотрим, чьё оно по частоте (словарь web/words.json,
// собран из wordfreq скриптом tests/make_words.py). Настоящие английские слова (github, ok, Bali) остаются как были.

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>~";
const RU = "йцукенгшщзхъфывапролджэячсмитьбюёЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮЁ";
const EN2RU = new Map();
const RU2EN = new Map();
Array.from(EN).forEach((c, i) => { EN2RU.set(c, Array.from(RU)[i]); RU2EN.set(Array.from(RU)[i], c); });

const LAT_WORD = /^[A-Za-z\[\];',.`{}:"<>~]+$/;
const CYR_WORD = /^[А-Яа-яЁё]+$/;
const ZIPF = { ru: new Map(), en: new Map() };
let loaded = false;

// Слова, которых нет в словаре частот, но которые люди пишут по-английски (названия сервисов и игр): их не трогаем.
const KEEP = new Set(("chatgpt ollama cs2 tiktok roblox claude gemini openai gpt llm ai api usb wifi vpn pc ps5 ps4 xbox dota csgo lol pubg apk " +
  "http https www com org net html css js json sql ide gui cli ssd hdd cpu gpu ram rgb led lcd oled hdmi bios ios macos").split(" "));

export function isLoaded() { return loaded; }

// data = {"ru": {"6": [слова], "5": [...]}, "en": {...}}: ключ группы = нижняя граница частоты слова
export function setData(data) {
  for (const lang of ["ru", "en"]) {
    for (const [b, words] of Object.entries(data[lang] || {})) {
      const z = Number(b);
      for (const w of words) { ZIPF[lang].set(w, z); }
    }
  }
  loaded = true;
}

function zipf(word, lang) {
  const w = word.toLowerCase();
  if (lang === "en" && KEEP.has(w)) { return 4.0; }
  return ZIPF[lang].get(w) || 0;
}
const toRu = (tok) => Array.from(tok).map((c) => EN2RU.get(c) || c).join("");
const toEn = (tok) => Array.from(tok).map((c) => RU2EN.get(c) || c).join("");

function splitPunct(tok) {                      // 'ghbdtn?' -> ['ghbdtn', '?']
  let core = tok, tail = "";
  while (core && ".,?!;:".includes(core[core.length - 1])) { tail = core[core.length - 1] + tail; core = core.slice(0, -1); }
  return [core, tail];
}
function strip(s, chars) {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) { a++; }
  while (b > a && chars.includes(s[b - 1])) { b--; }
  return s.slice(a, b);
}

function ruCandidate(tok) {                     // лучший русский вариант слова с английской раскладкой: [слово, хвост, частота] или null
  let best = null;
  for (const [c, tail] of [[tok, ""], splitPunct(tok)]) {
    const core = strip(c, "'\"");
    if (!core || !/[A-Za-z\[\];',.`]/.test(core)) { continue; }
    const ru = toRu(core);
    if (!CYR_WORD.test(ru)) { continue; }
    const z = zipf(ru, "ru");
    if (best === null || z > best[2]) { best = [ru, tail, z]; }
  }
  return best;
}

// -> [исправленный текст, изменился ли он]
export function fix(text) {
  if (!loaded) { return [text, false]; }
  function ruPass(strictLen, loose) {
    const out = [];
    let n = 0;
    for (const m of text.split(/(\s+)/)) {
      if (!m || /^\s+$/.test(m)) { out.push(m); continue; }
      const sp = splitPunct(m);
      const cand = (LAT_WORD.test(m) || (sp[0] && LAT_WORD.test(sp[0]))) ? ruCandidate(m) : null;
      if (cand) {
        const [ru, tail, z] = cand;
        const core = tail ? m.slice(0, m.length - tail.length) : m;
        const en = /^[A-Za-z']+$/.test(core) ? zipf(strip(core, "'\""), "en") : 0.0;
        const longEnough = ru.length >= 3;
        // «мягкое» правило включается, только когда в сообщении уже нашлись настоящие русские слова: тогда непонятное латинское слово
        // (с опечаткой или редкое) почти наверняка тоже русское
        const plausible = loose && en < 1.5 && /[аеёиоуыэюя]/.test(ru.toLowerCase());
        if ((z >= 2.5 && z > en + 0.7 && (longEnough || !strictLen)) || plausible) { out.push(ru + tail); n++; continue; }
      }
      out.push(m);
    }
    return [out.join(""), n];
  }
  let [fixed, n] = ruPass(true, false);
  if (n) {                                      // нашли настоящие русские слова: короткие и редкие тоже можно («b» -> «и»)
    fixed = ruPass(false, true)[0];
    return [fixed, true];
  }
  // английский, набранный на русской раскладке
  const out = [];
  let k = 0;
  for (const m of text.split(/(\s+)/)) {
    const core = m.replace(/[.,?!]+$/, "");
    if (m && !/^\s+$/.test(m) && CYR_WORD.test(core)) {
      const en = toEn(core);
      if (/^[A-Za-z]{3,}$/.test(en) && zipf(en, "en") >= 3.0 && zipf(core, "ru") < 2.0) { out.push(en + m.slice(core.length)); k++; continue; }
    }
    out.push(m);
  }
  return k ? [out.join(""), true] : [text, false];
}
