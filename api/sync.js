/**
 * POST /api/sync
 * Save/load user progress to Supabase using Telegram initData as auth.
 */

import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyTelegramData(initData, botToken) {
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
  try { return JSON.parse(params.get("user")); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { initData, stats, action } = req.body;
  if (!initData) return res.status(400).json({ error: "initData required" });

  const user = verifyTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!user) return res.status(403).json({ error: "Invalid Telegram signature" });

  if (action === "save") {
    const { error } = await supabase
      .from("user_stats")
      .upsert({
        telegram_id: user.id,
        username:    user.username || null,
        first_name:  user.first_name || null,
        stats:       { ...stats, telegramId: user.id },
      }, { onConflict: "telegram_id" });

    if (error) { console.error(error); return res.status(500).json({ error: "DB error" }); }
    return res.status(200).json({ ok: true });
  }

  if (action === "load") {
    const { data, error } = await supabase
      .from("user_stats")
      .select("stats, updated_at")
      .eq("telegram_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = not found
      console.error(error);
      return res.status(500).json({ error: "DB error" });
    }
    return res.status(200).json({
      stats: data ? { ...data.stats, updatedAt: new Date(data.updated_at).getTime() } : null
    });
  }

  return res.status(400).json({ error: "action must be save or load" });
}
