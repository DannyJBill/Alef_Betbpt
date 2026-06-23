/**
 * Send a message history to our /api/chat proxy.
 * The proxy forwards to Anthropic — API key stays server-side.
 * @param {{ role: "user"|"assistant", content: string }[]} messages
 * @returns {Promise<string>}
 */
export async function askAI(messages) {
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
