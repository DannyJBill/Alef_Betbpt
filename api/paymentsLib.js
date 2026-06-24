/**
 * api/_paymentsLib.js
 * Общая логика — импортируется из create.js, status.js, bot.js
 */
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export const supabase = createClient(
  process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_KEY?.trim()
);

export const PRODUCTS = {
  nikud_lifetime: {
    title:       "Огласовки (никуд) — навсегда",
    description: "Полный раздел огласовок + безлимитный AI-ассистент. Доступ навсегда.",
    payload:     "nikud_lifetime",
    currency:    "XTR",
    prices:      [{ label: "Никуд + AI Premium", amount: 99 }],
  },
};

export async function handleSuccessfulPayment(telegramId, payment) {
  const payload = payment.invoice_payload || "";
  const [productId] = payload.split(":");

  if (productId !== "nikud_lifetime") return false;

  const { data: row } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const existing = row?.stats || {};
  await supabase
    .from("user_stats")
    .upsert({
      telegram_id: telegramId,
      stats: {
        ...existing,
        isPremium:          true,
        premiumPurchasedAt: Date.now(),
        premiumType:        "lifetime",
        xp:                 (existing.xp || 0) + 200,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "telegram_id" });

  console.log(`[payments] isPremium set for user ${telegramId}`);
  return true;
}
