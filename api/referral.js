/**
 * POST /api/referral         — регистрация реферальной связи
 * POST /api/referral/reward  — выдача XP рефереру после прохождения группы 1
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();
  return createClient(url, key);
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.APP_URL || "https://alef-betbpt.vercel.app";

async function sendMessage(chatId, text) {
  try {
    await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch { /* silent */ }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const url = req.url || "";
  const supabase = getSupabase();

  // ── POST /api/referral/reward ──────────────────────────────────────────────
  if (url.includes("/reward")) {
    const { referrerId, refereeName } = req.body || {};
    if (!referrerId) return res.status(400).json({ error: "referrerId required" });

    // 1. Обновить referrals таблицу — проставить rewarded_at
    await supabase
      .from("referrals")
      .update({ rewarded_at: new Date().toISOString() })
      .eq("referrer_id", referrerId)
      .is("rewarded_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // 2. Начислить +100 XP рефереру
    const { data: row } = await supabase
      .from("user_stats")
      .select("stats")
      .eq("telegram_id", referrerId)
      .maybeSingle();

    if (row?.stats) {
      const s = row.stats;
      const updated = {
        ...s,
        xp: (s.xp || 0) + 100,
        referralsXpEarned: (s.referralsXpEarned || 0) + 100,
      };
      await supabase
        .from("user_stats")
        .update({ stats: updated })
        .eq("telegram_id", referrerId);

      // 3. Уведомить реферера в Telegram
      const friendName = refereeName || "Твой друг";
      await sendMessage(referrerId,
        `🎉 <b>${friendName}</b> прошёл первую группу алфавита!\n\n` +
        `Тебе начислено <b>+100 XP</b> за приглашение 🏆`
      );
    }

    return res.status(200).json({ ok: true });
  }

  // ── POST /api/referral — регистрация связи ─────────────────────────────────
  const { newUserId, referralCode } = req.body || {};
  if (!newUserId || !referralCode) return res.status(400).json({ error: "newUserId and referralCode required" });

  // Достать referrerId из кода вида "ref_12345678"
  if (!referralCode.startsWith("ref_")) return res.status(400).json({ error: "Invalid referral code" });
  const referrerId = Number(referralCode.replace("ref_", ""));

  if (!referrerId || referrerId === newUserId) return res.status(400).json({ error: "Invalid referral" });

  // Проверить что referrer существует
  const { data: referrer } = await supabase
    .from("user_stats")
    .select("telegram_id")
    .eq("telegram_id", referrerId)
    .maybeSingle();

  if (!referrer) return res.status(404).json({ error: "Referrer not found" });

  // Записать связь (UNIQUE referee_id — повторно не запишет)
  const { error } = await supabase
    .from("referrals")
    .insert({ referrer_id: referrerId, referee_id: newUserId })
    .select();

  if (error) {
    // Дубликат — уже был приглашён
    if (error.code === "23505") return res.status(200).json({ ok: true, duplicate: true });
    console.error("Referral insert error:", error);
    return res.status(500).json({ error: error.message });
  }

  // Обновить stats реферера — увеличить referralsCount
  const { data: refRow } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", referrerId)
    .maybeSingle();

  if (refRow?.stats) {
    await supabase
      .from("user_stats")
      .update({ stats: { ...refRow.stats, referralsCount: (refRow.stats.referralsCount || 0) + 1 } })
      .eq("telegram_id", referrerId);
  }

  return res.status(200).json({ ok: true });
}
