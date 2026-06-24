/**
 * GET /api/payments/status?telegramId=123
 * Проверить isPremium по telegram_id
 */
import { supabase } from "./_paymentsLib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const telegramId = req.query?.telegramId;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  const { data } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return res.status(200).json({
    isPremium:          data?.stats?.isPremium          || false,
    premiumPurchasedAt: data?.stats?.premiumPurchasedAt || null,
    premiumType:        data?.stats?.premiumType        || null,
  });
}
