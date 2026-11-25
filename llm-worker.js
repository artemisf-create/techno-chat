// Фоновый поток для ИИ-модели: тяжёлые вычисления идут здесь, чтобы страница не зависала, пока Techno думает.
import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.88/+esm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
