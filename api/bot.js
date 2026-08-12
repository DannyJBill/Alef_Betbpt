/**
 * POST /api/bot — Telegram webhook
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_KEY?.trim()
);
const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.APP_URL || "https://alef-betbpt.vercel.app";

// Инлайн — обработка успешного платежа Stars
async function handleSuccessfulPayment(telegramId, payment) {
  const payload = payment.invoice_payload || "";
  const [productId] = payload.split(":");
  if (productId !== "nikud_lifetime") return false;

  const { data: row } = await supabase
    .from("user_stats").select("stats")
    .eq("telegram_id", telegramId).maybeSingle();

  const existing = row?.stats || {};
  await supabase.from("user_stats").upsert({
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
    .maybeSingle();
  return data?.stats || null;
}

// ── Commands ──────────────────────────────────────────────────────────────────

// Strip invisible unicode chars (некоторые клиенты шлют first_name с ними),
// fallback на username/«друг». Общий хелпер — используется и в /start, и в
// персонализированных напоминаниях.
function cleanName(rawName, username) {
  return (rawName || "").replace(/[\u1160-\u11FF\uFFA0-\uFFDC\u3164]/g, "").trim()
    || username || "друг";
}

async function cmdStart(chatId, user, startPayload) {
  const name = cleanName(user.first_name, user.username);

  // Регистрируем факт /start сразу в user_stats — иначе пользователи, которые
  // жмут /start, но не доходят до сохранения прогресса (/api/sync save),
  // невидимы для рассылок в админке (сегмент "Все пользователи" строится по
  // user_stats). Не трогаем stats существующих пользователей — только
  // обновляем контактные поля и last_seen_at.
  const { data: existing } = await supabase
    .from("user_stats").select("stats, utm_source")
    .eq("telegram_id", user.id).maybeSingle();
  const now = new Date().toISOString();

  // Метка источника (Deep-link из админки, ?start=fb-sp-1-t). ref_<id> —
  // отдельная ветка (реферальная программа, читается на фронте из startapp,
  // см. StatsContext.jsx) — сюда не попадает, чтобы не путать источники.
  const clickSource = startPayload && !startPayload.startsWith("ref_") ? startPayload.slice(0, 64) : null;

  // "Первое касание" — если utm_source уже проставлен, повторные /start
  // (в т.ч. просто открытие приложения заново) его не перезаписывают.
  const utmSource = !existing?.utm_source && clickSource ? clickSource : undefined;

  await supabase.from("user_stats").upsert({
    telegram_id:   user.id,
    username:      user.username      || null,
    first_name:    user.first_name    || null,
    language_code: user.language_code || null,
    last_seen_at:  now,
    updated_at:    now,
    stats:         existing?.stats || {},
    ...(utmSource ? { utm_source: utmSource } : {}),
  }, { onConflict: "telegram_id" });

  // Лог КАЖДОГО перехода по deep-link'у (не только первого) — utm_source
  // выше даёт атрибуцию "кто пришёл откуда" (первое касание, 1 юзер = 1
  // значение), а events здесь даёт статистику по самой ссылке: сколько раз
  // по ней вообще кликали и сколько это уникальных людей (см. api/admin.js:
  // getData() считает total/unique по event_type="deep_link_click").
  if (clickSource) {
    await supabase.from("events").insert({
      telegram_id: user.id,
      event_type: "deep_link_click",
      payload: { source: clickSource },
    });
  }

  await send(chatId,
    `👋 Шалом, <b>${name}</b>!\n\n` +
    `Учи ивритский алфавит — 22 буквы, игры, SM-2 повторения и AI-помощник 🇮🇱\n\n` +
    `Нажми кнопку ниже 👇`,
    { reply_markup: { inline_keyboard: [[
      { text: "📖 Открыть Alef Bet", web_app: { url: APP_URL } }
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

async function cmdReset(chatId) {
  await send(chatId,
    "⚠️ Чтобы сбросить прогресс — открой приложение и используй кнопку сброса в профиле.\n\n" +
    "Это необходимо чтобы очистить все локальные данные на устройстве.",
    { reply_markup: { inline_keyboard: [[
      { text: "📖 Открыть Alef Bet", web_app: { url: APP_URL } }
    ]]}}
  );
}

// ── Push senders (called by cron) ─────────────────────────────────────────────

// Send in batches to avoid Vercel function timeout (10s on free plan)
async function sendBatch(rows, textFn, filterFn) {
  const BATCH_SIZE = 30;
  const BATCH_DELAY = 1000; // 1s between batches
  let sent = 0;

  const eligible = rows.filter(filterFn);

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async ({ telegram_id, stats: s }) => {
      const text = textFn(s);
      if (!text) return;
      await send(telegram_id, text, { reply_markup: { inline_keyboard: [[
        { text: "📖 Открыть Alef Bet", web_app: { url: APP_URL } }
      ]]}});
      sent++;
    }));
    if (i + BATCH_SIZE < eligible.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }
  return sent;
}

export async function sendDailyReminders() {
  const { data: rows } = await supabase.from("user_stats").select("telegram_id, stats");
  if (!rows) return 0;

  const today = new Date().toDateString();
  const now = Date.now();

  return sendBatch(
    rows,
    (s) => {
      const due = Object.values(s?.cardReviews || {}).filter(r => r.nextReview <= now).length;
      return due > 0
        ? `⏰ <b>Время повторить!</b>\n\n${due} букв ждут повторения.\n🔥 Серия: ${s?.streak || 0} дней — не прерывай!`
        : `📖 <b>Учись каждый день!</b>\n\n🔥 Серия: ${s?.streak || 0} дней\nЗайди и пройди новую группу!`;
    },
    ({ stats: s }) => s?.lastStudiedDate !== today
  );
}

export async function sendSmartReminders() {
  const { data: rows } = await supabase.from("user_stats").select("telegram_id, stats");
  if (!rows) return 0;

  const now = Date.now();

  return sendBatch(
    rows,
    (s) => {
      const due = Object.values(s?.cardReviews || {}).filter(r => r.nextReview <= now).length;
      return due > 0
        ? `🧠 <b>${due} букв</b> готовы к повторению!\n\nЗакрепи знания — займёт пару минут.`
        : null;
    },
    ({ stats: s }) => Object.values(s?.cardReviews || {}).some(r => r.nextReview <= now)
  );
}

// ── Персонализированные напоминания (раз в N дней, период задаёт админка) ──────
//
// В отличие от sendDailyReminders/sendSmartReminders (шлют всем сразу по
// расписанию cron), этот сендер per-user: у каждого юзера в stats лежит
// lastReminderSentAt, и раз в сутки cron (?type=periodic) отбирает только
// тех, у кого с последней отправки прошло >= reminder_period_days из
// app_settings. Так «период» получается настоящим per-user интервалом, а не
// просто ещё одним фиксированным временем рассылки.

function ruPlural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// Несколько вариантов приветствия, чтобы не слать один и тот же текст каждый
// раз — выбираем по telegram_id, детерминированно (не рандом на каждый прогон).
const REMINDER_GREETINGS = [
  (name) => `👋 Привет, <b>${name}</b>!`,
  (name) => `🇮🇱 ${name}, есть минутка на иврит?`,
  (name) => `✨ <b>${name}</b>, не теряй темп!`,
  (name) => `📖 Здравствуй, ${name}!`,
];

function buildReminderText(name, s, seed) {
  const now = Date.now();
  const due = Object.values(s?.cardReviews || {}).filter(r => r.nextReview <= now).length;
  const weak = Object.keys(s?.weakLetters || {}).length;
  const streak = s?.streak || 0;

  const lines = [];
  if (due > 0) lines.push(`⏰ ${due} ${ruPlural(due, "карточка", "карточки", "карточек")} ждут повторения`);
  if (weak > 0) lines.push(`🔴 ${weak} ${ruPlural(weak, "буква", "буквы", "букв")} даются тяжелее остальных — самое время закрепить`);
  if (streak > 0) lines.push(`🔥 Серия ${streak} ${ruPlural(streak, "день", "дня", "дней")} — не дай ей прерваться`);
  if (!lines.length) lines.push("Загляни в приложение и пройди новую тему 📖");

  const greet = REMINDER_GREETINGS[seed % REMINDER_GREETINGS.length](name);
  return `${greet}\n\n${lines.join("\n")}`;
}

async function getReminderSettings() {
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return {
    enabled:    data?.reminder_enabled ?? true,
    periodDays: data?.reminder_period_days ?? 1,
    segment:    data?.reminder_segment ?? "all",
  };
}

// Сегменты, вычислимые прямо из user_stats (без джойнов на daily_sessions/events,
// как в api/admin.js — там сегменты богаче, но это отдельный, более тяжёлый путь).
const REMINDER_SEGMENTS = {
  all:      () => true,
  active7:  (u) => u.idleDays !== null && u.idleDays <= 7,
  idle7:    (u) => u.idleDays !== null && u.idleDays > 7 && u.idleDays <= 30,
  churned:  (u) => u.idleDays !== null && u.idleDays > 30,
  premium:  (u) => u.isPremium,
  free:     (u) => !u.isPremium,
  streak:   (u) => u.streak > 0,
};

export async function sendPeriodicReminders() {
  const settings = await getReminderSettings();
  if (!settings.enabled) return 0;

  const { data: rows } = await supabase
    .from("user_stats")
    .select("telegram_id, first_name, username, is_premium, last_seen_at, stats");
  if (!rows) return 0;

  const now = Date.now();
  const periodMs = settings.periodDays * 86400000;
  const segFn = REMINDER_SEGMENTS[settings.segment] || REMINDER_SEGMENTS.all;

  const eligible = rows.filter((r) => {
    const s = r.stats || {};
    const lastSent = s.lastReminderSentAt || 0;
    if (now - lastSent < periodMs) return false;
    const idleDays = r.last_seen_at
      ? Math.floor((now - new Date(r.last_seen_at).getTime()) / 86400000)
      : null;
    return segFn({ idleDays, isPremium: !!r.is_premium, streak: s.streak || 0 });
  });

  const BATCH_SIZE = 30;
  const BATCH_DELAY = 1000;
  let sent = 0;

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (r) => {
      const s = r.stats || {};
      const name = cleanName(r.first_name, r.username);
      const text = buildReminderText(name, s, r.telegram_id);
      await send(r.telegram_id, text, { reply_markup: { inline_keyboard: [[
        { text: "📖 Открыть Alef Bet", web_app: { url: APP_URL } }
      ]]}});
      await supabase.from("user_stats")
        .update({ stats: { ...s, lastReminderSentAt: now } })
        .eq("telegram_id", r.telegram_id);
      sent++;
    }));
    if (i + BATCH_SIZE < eligible.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY));
    }
  }
  return sent;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = req.body;

  // Inline button press
  if (body.callback_query) {
    const { id, message } = body.callback_query;
    await fetch(`${API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id }),
    });
    await send(message.chat.id, "Используй кнопку сброса в профиле приложения.");
    return res.status(200).end();
  }

  // Stars: подтверждение pre_checkout (обязательно в течение 10 секунд)
  if (body.pre_checkout_query) {
    await fetch(`${API}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: body.pre_checkout_query.id,
        ok: true,
      }),
    });
    return res.status(200).end();
  }

  // Stars: успешный платёж
  if (body.message?.successful_payment) {
    const telegramId = body.message.from?.id;
    const payment    = body.message.successful_payment;
    if (telegramId) {
      const ok = await handleSuccessfulPayment(telegramId, payment);
      if (ok) {
        await send(telegramId,
          "🎉 <b>Предзаказ оформлен!</b>\n\n" +
          "Ты в числе первых — раздел огласовок откроется автоматически как только выйдет.\n\n" +
          "🎁 Бонус: +200 XP начислено"
        );
      }
    }
    return res.status(200).end();
  }

  const msg = body.message;
  if (!msg?.text) return res.status(200).end();

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  // Разбираем ТОЛЬКО первый токен: было .split("@")[0], но у /start с
  // deep-link payload'ом текст выглядит как "/start fb-sp-1-t" — split по "@"
  // такое не резал (пробел, не @), и весь текст целиком не совпадал ни с
  // одним case ниже — /start с меткой источника молча улетал в default.
  const cmd = msg.text.split(/[\s@]/)[0];
  const startPayload = cmd === "/start"
    ? msg.text.replace(/^\/start(@\S+)?\s*/, "")
    : "";

  switch (cmd) {
    case "/start":  await cmdStart(chatId, msg.from, startPayload); break;
    case "/stats":  await cmdStats(chatId, userId); break;
    case "/streak": await cmdStreak(chatId, userId); break;
    case "/reset":  await cmdReset(chatId); break;
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
