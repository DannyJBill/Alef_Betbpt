/**
 * ⏸ ИИ-помощник временно отключён (в разработке).
 * Ввод и кнопка работают как обычно — вместо ответа модели возвращаем анонс.
 * Чтобы включить обратно: поставить AI_ENABLED = true.
 */
export const AI_ENABLED = false;

const AI_STUB = [
  "🤖 Бот пока в разработке.",
  "",
  "Скоро он будет:",
  "• консультировать по любому вопросу об иврите",
  "• знать всю теорию курса",
  "• видеть твой прогресс и подсказывать, что повторить",
  "• работать собеседником-репетитором — голосом и текстом",
  "",
  "Спасибо за терпение! 🙏",
].join("\n");

/**
 * Send a message history to our /api/chat proxy.
 * The proxy forwards to Anthropic — API key stays server-side.
 * @param {{ role: "user"|"assistant", content: string }[]} messages
 * @returns {Promise<string>}
 */
export async function askAI(messages) {
  if (!AI_ENABLED) {
    await new Promise(r => setTimeout(r, 400)); // лёгкая пауза — как будто думает
    return AI_STUB;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.text ?? "Пустой ответ 🤔";

  } catch (err) {
    if (err.name === "AbortError") throw new Error("Превышено время ожидания ⏱️");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
