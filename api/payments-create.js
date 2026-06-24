/**
 * POST /api/payments/create
 * Создаёт Telegram Stars invoice link
 */
import { supabase, TG_API, PRODUCTS } from "./_paymentsLib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { productId = "nikud_lifetime", telegramId } = req.body || {};
  const product = PRODUCTS[productId];
  if (!product)    return res.status(400).json({ error: "Unknown product" });
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  // Уже купил?
  const { data: existing } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existing?.stats?.isPremium) {
    return res.status(200).json({ alreadyPurchased: true });
  }

  // Создать invoice link
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
    console.error("Telegram createInvoiceLink error:", tgData);
    return res.status(500).json({ error: "Failed to create invoice", details: tgData });
  }

  return res.status(200).json({ invoiceLink: tgData.result });
}
