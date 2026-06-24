/**
 * POST /api/events — логирование событий
 * Вызывается клиентом при ключевых действиях пользователя
 */
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();
  return createClient(url, key);
}

function verifyTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const str = [...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
    const secret = createHmac("sha256","WebAppData").update(botToken).digest();
    const expected = createHmac("sha256",secret).update(str).digest("hex");
    if (expected !== hash) return null;
    return JSON.parse(params.get("user"));
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { initData, event_type, payload = {} } = req.body || {};
  if (!event_type) return res.status(400).json({ error: "event_type required" });

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const user = initData ? verifyTelegramData(initData, botToken) : null;
  const telegramId = user?.id || null;

  const supabase = getSupabase();

  // Записать событие
  await supabase.from("events").insert({
    telegram_id: telegramId,
    event_type,
    payload,
  });

  // Записать ежедневную сессию
  if (telegramId) {
    await supabase.from("daily_sessions")
      .upsert({ telegram_id: telegramId, date: new Date().toISOString().split("T")[0] },
        { onConflict: "telegram_id,date", ignoreDuplicates: true });
  }

  return res.status(200).json({ ok: true });
}
