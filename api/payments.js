/**
 * api/payments.js
 * 
 * POST /api/payments/create  — создать ссылку на инвойс Stars
 * POST /api/payments/webhook — обработать successful_payment от Telegram
 * GET  /api/payments/status  — проверить статус premium по telegram_id
 */

import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TG_API      = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Конфигурация продуктов
const PRODUCTS = {
  nikud_lifetime: {
    title: "Огласовки (никуд) — навсегда",
    description: "Полный раздел огласовок + безлимитный AI-ассистент. Доступ навсегда.",
    payload: "nikud_lifetime",
    currency: "XTR",          // XTR = Telegram Stars
    prices: [{ label: "Никуд + AI Premium", amount: 99 }], // 99 Stars (предзаказ)
  },
};

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  const action = pathname.split("/").pop(); // create | webhook | status

  if (action === "create") return handleCreate(req, res);
  if (action === "webhook") return handleWebhook(req, res);
  if (action === "status")  return handleStatus(req, res);

  return res.status(404).json({ error: "Not found" });
}

// ─── POST /api/payments/create ────────────────────────────────────────────────
async function handleCreate(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { productId = "nikud_lifetime", telegramId } = req.body || {};
  const product = PRODUCTS[productId];
  if (!product) return res.status(400).json({ error: "Unknown product" });
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  // Проверить — не купил ли уже
  const { data: existing } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existing?.stats?.isPremium) {
    return res.status(200).json({ alreadyPurchased: true });
  }

  // Создать invoice link через Bot API
  const tgRes = await fetch(`${TG_API}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title:         product.title,
      description:   product.description,
      payload:       `${product.payload}:${telegramId}`, // payload для идентификации
      currency:      product.currency,
      prices:        product.prices,
      // Для Stars не нужен provider_token
    }),
  });

  const tgData = await tgRes.json();
  if (!tgData.ok) {
    console.error("Telegram createInvoiceLink error:", tgData);
    return res.status(500).json({ error: "Failed to create invoice", details: tgData });
  }

  return res.status(200).json({ invoiceLink: tgData.result });
}

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Вызывается из api/bot.js при получении successful_payment
export async function handleSuccessfulPayment(telegramId, payment) {
  const payload = payment.invoice_payload || "";
  console.log(`[payments] successful_payment: telegramId=${telegramId}, payload=${payload}`);

  // Парсим payload: "nikud_lifetime:123456789"
  const [productId, payloadUserId] = payload.split(":");

  // Дополнительная проверка: userId из payload должен совпадать с отправителем
  if (String(payloadUserId) !== String(telegramId)) {
    console.warn(`[payments] userId mismatch: payload=${payloadUserId}, sender=${telegramId}`);
    // Всё равно обрабатываем — Stars уже списаны
  }

  if (productId === "nikud_lifetime") {
    // Обновить isPremium в Supabase
    const { data: row } = await supabase
      .from("user_stats")
      .select("stats")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    const existingStats = row?.stats || {};
    const updatedStats = {
      ...existingStats,
      isPremium:          true,
      premiumPurchasedAt: Date.now(),
      premiumType:        "lifetime",
      // Бонус XP за предзаказ
      xp: (existingStats.xp || 0) + 200,
    };

    await supabase
      .from("user_stats")
      .upsert({
        telegram_id: telegramId,
        stats:       updatedStats,
        updated_at:  new Date().toISOString(),
      }, { onConflict: "telegram_id" });

    console.log(`[payments] isPremium set for user ${telegramId}`);
    return true;
  }

  return false;
}

async function handleWebhook(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { telegramId, payment } = req.body || {};
  if (!telegramId || !payment) return res.status(400).json({ error: "Missing fields" });

  const ok = await handleSuccessfulPayment(telegramId, payment);
  return res.status(200).json({ ok });
}

// ─── GET /api/payments/status ─────────────────────────────────────────────────
async function handleStatus(req, res) {
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
