/**
 * GET /api/payments-status?telegramId=123
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_KEY?.trim()
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const telegramId = req.query?.telegramId;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  const { data, error } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("payments-status error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    isPremium:          data?.stats?.isPremium          || false,
    premiumPurchasedAt: data?.stats?.premiumPurchasedAt || null,
    premiumType:        data?.stats?.premiumType        || null,
  });
}
