// ИИ-модель, которая запускается ПРЯМО В БРАУЗЕРЕ на устройстве человека (WebLLM + WebGPU).
// Зачем так: ответы считает не мой ноутбук и не чужой сервер, а телефон или компьютер того, кто открыл сайт. Поэтому лимитов нет,
// а вопросы никуда не уходят. Модель скачивается один раз (сотни мегабайт) и дальше лежит в памяти браузера.
//
// Движок и веса берутся из интернета (скрипт с jsDelivr, веса с Hugging Face) — на GitHub лежат только наши страницы.

const WEBLLM = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.88/+esm";

// Три размера одной семьи Qwen3 (хорошо знает много языков). f16 — быстрее, но нужна видеокарта с поддержкой shader-f16; f32 — для остальных.
export const MODELS = {
  tiny: { name: "Qwen3 0.6B", mb: 350, f16: "Qwen3-0.6B-q4f16_1-MLC", f32: "Qwen3-0.6B-q4f32_1-MLC" },
  medium: { name: "Qwen3 1.7B", mb: 980, f16: "Qwen3-1.7B-q4f16_1-MLC", f32: "Qwen3-1.7B-q4f32_1-MLC" },
  big: { name: "Qwen3 4B", mb: 2280, f16: "Qwen3-4B-q4f16_1-MLC", f32: "Qwen3-4B-q4f32_1-MLC" },
};

let lib = null;
const getLib = async () => lib || (lib = await import(WEBLLM));

// Что умеет это устройство: есть ли WebGPU, сколько памяти, телефон ли это
export async function probe() {
  const nav = navigator;
  const info = {
    gpu: false, f16: false, maxBuffer: 0, adapter: "",
    mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || !!(nav.userAgentData && nav.userAgentData.mobile),
    mem: nav.deviceMemory || 0,
    metered: !!(nav.connection && (nav.connection.saveData || nav.connection.type === "cellular")),
  };
  if (!nav.gpu) { return info; }
  try {
    const ad = await nav.gpu.requestAdapter();
    if (!ad) { return info; }
    info.gpu = true;
    info.f16 = ad.features.has("shader-f16");
    info.maxBuffer = ad.limits.maxBufferSize || 0;
    const ai = ad.info || (ad.requestAdapterInfo ? await ad.requestAdapterInfo() : null);
    info.adapter = ai ? [ai.vendor, ai.architecture, ai.description].filter(Boolean).join(" ") : "";
  } catch (e) { /* без WebGPU работаем в простом режиме */ }
  return info;
}

// Какую модель брать самому: телефонам и слабым устройствам маленькую, остальным среднюю. Большую человек выбирает вручную.
// Видеокарта без fp16 (старые Nvidia/Intel) считает в f32: это вдвое тяжелее, и на ноутбуке с GTX 1060 модель 1,7B «вешала» драйвер (Windows сбрасывал видеокарту).
export function autoTier(info) {
  if (!info.gpu) { return null; }
  if (info.mobile || !info.f16 || (info.mem && info.mem < 4) || info.maxBuffer < 1.5 * 1024 * 1024 * 1024) { return "tiny"; }
  return "medium";
}
// Похоже ли, что видеокарта «потерялась» (нехватка памяти или зависание): тогда модель больше работать не будет, нужна другая, поменьше
export const isGpuLost = (e) => /device was lost|device_hung|disposed|out of memory|OperationError|GPUDevice|lost/i.test(String((e && (e.message || e)) || ""));
export const modelId = (tier, info) => (info.f16 ? MODELS[tier].f16 : MODELS[tier].f32);

export async function isCached(tier, info) {
  try { return await (await getLib()).hasModelInCache(modelId(tier, info)); } catch (e) { return false; }
}
export async function removeModel(tier, info) {
  try { await (await getLib()).deleteModelAllInfoInCache(modelId(tier, info)); } catch (e) { /* нечего удалять */ }
}

const stripThink = (s) => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();

// Загружает модель (из памяти браузера или скачивая) и возвращает объект с chat(). onProgress({progress: 0..1, text})
export async function load(tier, info, onProgress, opts = {}) {
  const L = await getLib();
  const id = modelId(tier, info);
  const cfg = { initProgressCallback: (p) => { if (onProgress) { onProgress(p); } } };
  let engine;
  let worker = null;
  try {
    worker = new Worker(new URL("./llm-worker.js", import.meta.url), { type: "module" });
    engine = await new Promise((resolve, reject) => {
      worker.addEventListener("error", (e) => reject(new Error("worker: " + (e.message || "failed"))), { once: true });
      L.CreateWebWorkerMLCEngine(worker, id, cfg).then(resolve, reject);
    });
  } catch (e) {
    if (worker) { worker.terminate(); }
    if (!/worker/i.test(String(e && e.message))) { throw e; }               // настоящая ошибка загрузки модели, а не сбой потока
    engine = await L.CreateMLCEngine(id, cfg);                              // поток не запустился: считаем в основном потоке
  }
  try { if (navigator.storage && navigator.storage.persist) { navigator.storage.persist(); } } catch (e) { /* не страшно */ }

  // Сколько текста можно давать модели за раз. Windows сбрасывает видеокарту, если одна операция идёт дольше ~2 секунд (на GTX 1060 длинный запрос
  // с тремя статьями Википедии на русском её «вешал»), поэтому слабым видеокартам (без fp16) и после сбоя даём совсем короткие запросы.
  const safe = !!opts.safe;
  const budget = safe ? { docs: 1, chars: 220, hist: 0, short: true }
    : !info.f16 ? { docs: 1, chars: 300, hist: 1, short: true }
    : tier === "tiny" ? { docs: 2, chars: 700, hist: 3 } : tier === "medium" ? { docs: 2, chars: 800, hist: 4 } : { docs: 3, chars: 1000, hist: 6 };

  return {
    name: MODELS[tier].name,
    tier,
    budget,
    // первый запрос к модели занимает ~30 секунд (видеокарта один раз компилирует свои программы): делаем его заранее, пока человек читает приветствие
    async warmup() { await this.chat([{ role: "user", content: "Hi" }], { max: 2, temperature: 0 }); },
    // messages -> текст. opts: {max, temperature, onToken(частичный текст)}
    async chat(messages, opts = {}) {
      const req = {
        messages, max_tokens: opts.max || 170, temperature: opts.temperature === undefined ? 0.2 : opts.temperature,
        repetition_penalty: 1.1, extra_body: { enable_thinking: false },    // у Qwen3 есть режим долгих раздумий: для чата он слишком медленный
      };
      if (opts.onToken) {
        const stream = await engine.chat.completions.create({ ...req, stream: true });
        let acc = "";
        for await (const ch of stream) {
          const d = (ch.choices[0] && ch.choices[0].delta && ch.choices[0].delta.content) || "";
          if (d) { acc += d; opts.onToken(stripThink(acc)); }
        }
        return stripThink(acc);
      }
      const r = await engine.chat.completions.create(req);
      return stripThink((r.choices[0].message && r.choices[0].message.content) || "");
    },
    async unload() { try { await engine.unload(); } catch (e) { /* уже выгружена */ } if (worker) { worker.terminate(); } },
  };
}
