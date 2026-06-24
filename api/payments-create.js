/**
 * POST /api/payments-create
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_KEY?.trim()
);

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const PRODUCTS = {
  nikud_lifetime: {
    title:       "Огласовки (никуд) — навсегда",
    description: "Полный раздел огласовок + безлимитный AI-ассистент. Доступ навсегда.",
    payload:     "nikud_lifetime",
    currency:    "XTR",
    prices:      [{ label: "Никуд + AI Premium", amount: 99 }],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { productId = "nikud_lifetime", telegramId } = req.body || {};
  const product = PRODUCTS[productId];
  if (!product)    return res.status(400).json({ error: "Unknown product" });
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  const { data: existing } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existing?.stats?.isPremium) {
    return res.status(200).json({ alreadyPurchased: true });
  }

  const tgRes = await fetch(`${TG_API}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title:       product.title,
      description: product.description,
      payload:     `${product.payload}:${telegramId}`,
      currency:    product.currency,
      prices:      product.prices,
    }),
  });

  const tgData = await tgRes.json();
  if (!tgData.ok) {
    console.error("createInvoiceLink error:", tgData);
    return res.status(500).json({ error: "Failed to create invoice", details: tgData });
  }

  return res.status(200).json({ invoiceLink: tgData.result });
}
