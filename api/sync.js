import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, ""); // remove trailing slash
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key);
}

function verifyTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expected  = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (expected !== hash) return null;
    return JSON.parse(params.get("user"));
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { initData, stats, action } = req.body || {};
  if (!initData) return res.status(400).json({ error: "initData required" });

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return res.status(500).json({ error: "Bot token not configured" });

  // In development (no real initData) — skip verification
  let user;
  if (process.env.NODE_ENV === "development" || initData === "dev") {
    user = { id: 0, username: "dev", first_name: "Dev" };
  } else {
    user = verifyTelegramData(initData, botToken);
    if (!user) return res.status(403).json({ error: "Invalid Telegram signature" });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    console.error("Supabase init error:", e.message);
    return res.status(500).json({ error: e.message });
  }

  if (action === "save") {
    if (!stats) return res.status(400).json({ error: "stats required" });

    // Rate limit: skip save if last save was less than 30s ago
    const { data: existing } = await supabase
      .from("user_stats")
      .select("updated_at")
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (existing?.updated_at) {
      const lastSave = new Date(existing.updated_at).getTime();
      if (Date.now() - lastSave < 30000) {
        return res.status(200).json({ ok: true, skipped: true });
      }
    }

    const { error } = await supabase
      .from("user_stats")
      .upsert({
        telegram_id:   user.id,
        username:      user.username      || null,
        first_name:    user.first_name    || null,
        language_code: user.language_code || null,
        is_premium:    user.is_premium    ?? false,
        last_seen_at:  new Date().toISOString(),
        stats:         { ...stats, telegramId: user.id },
      }, { onConflict: "telegram_id" });

    if (error) {
      console.error("Supabase upsert error:", JSON.stringify(error));
      return res.status(500).json({ error: error.message, code: error.code });
    }
    return res.status(200).json({ ok: true });
  }

  if (action === "load") {
    const { data, error } = await supabase
      .from("user_stats")
      .select("stats, updated_at")
      .eq("telegram_id", user.id)
      .maybeSingle(); // maybeSingle returns null instead of error when not found

    if (error) {
      console.error("Supabase select error:", JSON.stringify(error));
      return res.status(500).json({ error: error.message, code: error.code });
    }
    return res.status(200).json({
      stats: data ? { ...data.stats, updatedAt: new Date(data.updated_at).getTime() } : null
    });
  }

  return res.status(400).json({ error: "action must be save or load" });
}
