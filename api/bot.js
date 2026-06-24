/**
 * POST /api/bot — Telegram webhook
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.APP_URL || "https://alef-betbpt.vercel.app";

async function send(chatId, text, extra = {}) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function getStats(telegramId) {
  const { data } = await supabase
    .from("user_stats")
    .select("stats")
    .eq("telegram_id", telegramId)
    .single();
  return data?.stats || null;
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdStart(chatId, user) {
  await send(chatId,
    `👋 Шалом, <b>${user.first_name || "друг"}</b>!\n\n` +
    `Учи алфавит — карточки, игры и AI-помощник 🇮🇱\n\n` +
    `Нажми ниже 👇`,
    { reply_markup: { inline_keyboard: [[
      { text: "📖 Открыть AlefBet", web_app: { url: APP_URL } }
    ]]}}
  );
}

async function cmdStats(chatId, telegramId) {
  const s = await getStats(telegramId);
  if (!s) return send(chatId, "📊 Нет данных. Открой приложение и начни учиться!");

  const level    = Math.floor((s.xp || 0) / 100) + 1;
  const completed = Object.values(s.groupProgress || {}).filter(v => v === "completed").length;
  const accuracy  = s.totalAnswers > 0
    ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0;
  const due = Object.values(s.cardReviews || {})
    .filter(r => r.nextReview <= Date.now()).length;

  await send(chatId,
    `📊 <b>Прогресс</b>\n\n` +
    `⚡ XP: <b>${s.xp || 0}</b> · Уровень <b>${level}</b>\n` +
    `🔥 Серия: <b>${s.streak || 0} дней</b>\n` +
    `✅ Групп: <b>${completed}/5</b>\n` +
    `🎯 Точность: <b>${accuracy}%</b>\n` +
    `🔴 Слабых букв: <b>${Object.keys(s.weakLetters || {}).length}</b>\n` +
    (due > 0 ? `⏰ На повторение: <b>${due} букв</b>` : `✨ Все карточки повторены!`)
  );
}

async function cmdStreak(chatId, telegramId) {
  const s = await getStats(telegramId);
  if (!s) return send(chatId, "Нет данных. Открой приложение!");

  const streak    = s.streak || 0;
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const msg = s.lastStudiedDate === today
    ? `🔥 Серия: <b>${streak} дней</b>\n\n✅ Сегодня уже занимался — отлично!`
    : s.lastStudiedDate === yesterday
      ? `🔥 Серия: <b>${streak} дней</b>\n\n⚠️ Серия под угрозой! Зайди сегодня.`
      : `🔥 Серия: <b>${streak} дней</b>\n\n📅 Займись сегодня, чтобы не прерывать.`;
  await send(chatId, msg);
}

async function cmdReset(chatId, telegramId) {
  await send(chatId,
    "⚠️ Сбросить <b>весь прогресс</b>?\n\nЭто нельзя отменить.",
    { reply_markup: { inline_keyboard: [[
      { text: "✅ Да, сбросить", callback_data: `reset:${telegramId}` },
      { text: "❌ Отмена",       callback_data: "cancel" },
    ]]}}
  );
}

// ── Push senders (called by cron) ─────────────────────────────────────────────

export async function sendDailyReminders() {
  const { data: rows } = await supabase.from("user_stats").select("telegram_id, stats");
  if (!rows) return 0;

  const today = new Date().toDateString();
  let sent = 0;

  for (const { telegram_id, stats: s } of rows) {
    if (s?.lastStudiedDate === today) continue;
    const due = Object.values(s?.cardReviews || {})
      .filter(r => r.nextReview <= Date.now()).length;

    const text = due > 0
      ? `⏰ <b>Время повторить!</b>\n\n${due} букв ждут повторения.\n🔥 Серия: ${s?.streak || 0} дней — не прерывай!`
      : `📖 <b>Учись каждый день!</b>\n\n🔥 Серия: ${s?.streak || 0} дней\nЗайди и пройди новую группу!`;

    await send(telegram_id, text, { reply_markup: { inline_keyboard: [[
      { text: "📖 Открыть AlefBet", web_app: { url: APP_URL } }
    ]]}});
    sent++;
    await new Promise(r => setTimeout(r, 50));
  }
  return sent;
}

export async function sendSmartReminders() {
  const { data: rows } = await supabase.from("user_stats").select("telegram_id, stats");
  if (!rows) return 0;

  const now = Date.now();
  let sent = 0;

  for (const { telegram_id, stats: s } of rows) {
    const due = Object.values(s?.cardReviews || {})
      .filter(r => r.nextReview <= now).length;
    if (!due) continue;

    await send(telegram_id,
      `🧠 <b>${due} букв</b> готовы к повторению!\n\nЗакрепи знания — займёт пару минут.`,
      { reply_markup: { inline_keyboard: [[
        { text: "🃏 Повторить сейчас", web_app: { url: APP_URL } }
      ]]}}
    );
    sent++;
    await new Promise(r => setTimeout(r, 50));
  }
  return sent;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = req.body;

  // Inline button press
  if (body.callback_query) {
    const { id, data, from, message } = body.callback_query;
    await fetch(`${API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id }),
    });
    if (data?.startsWith("reset:")) {
      const tid = data.split(":")[1];
      await supabase.from("user_stats").delete().eq("telegram_id", tid);
      await send(message.chat.id, "✅ Прогресс сброшен. Начинаем с чистого листа! 🌱");
    } else if (data === "cancel") {
      await send(message.chat.id, "❌ Отменено. Прогресс сохранён.");
    }
    return res.status(200).end();
  }

  const msg = body.message;
  if (!msg?.text) return res.status(200).end();

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const cmd    = msg.text.split("@")[0];

  switch (cmd) {
    case "/start":  await cmdStart(chatId, msg.from); break;
    case "/stats":  await cmdStats(chatId, userId); break;
    case "/streak": await cmdStreak(chatId, userId); break;
    case "/reset":  await cmdReset(chatId, userId); break;
    case "/help":
      await send(chatId,
        "📋 <b>Команды</b>\n\n" +
        "/start — открыть приложение\n" +
        "/stats — твоя статистика\n" +
        "/streak — серия дней\n" +
        "/reset — сбросить прогресс\n" +
        "/help — этот список"
      );
      break;
    default:
      await send(chatId, "Используй /help или открой приложение 📖");
  }

  return res.status(200).end();
}
