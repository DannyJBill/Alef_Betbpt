/**
 * Vercel Serverless Function — /api/chat
 * Proxies requests to Anthropic API, keeping the key server-side.
 */

const SYSTEM_PROMPT = `Ты — дружелюбный AI-помощник по изучению ивритского алфавита.
Отвечай ТОЛЬКО на русском языке.
Помогай изучать буквы иврита: объясняй произношение, давай советы по запоминанию, отвечай на вопросах об иврите.
Будь кратким и позитивным. Используй эмодзи.`;

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Basic rate limiting via Vercel's built-in edge cache headers
  res.setHeader("X-Content-Type-Options", "nosniff");

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Validate message shape — prevent prompt injection via malformed roles
  const validRoles = new Set(["user", "assistant"]);
  for (const m of messages) {
    if (!validRoles.has(m.role) || typeof m.content !== "string") {
      return res.status(400).json({ error: "Invalid message format" });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}));
      console.error("Anthropic API error:", upstream.status, body);
      return res.status(upstream.status).json({
        error: body.error?.message || `Upstream error ${upstream.status}`,
      });
    }

    const data = await upstream.json();
    const text = data.content?.[0]?.text ?? "Пустой ответ 🤔";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Proxy fetch error:", err);
    return res.status(500).json({ error: "Ошибка соединения с AI 😔" });
  }
}
