/**
 * GET /api/cron — called by Vercel Cron Jobs
 */
import { sendDailyReminders, sendSmartReminders } from "./bot.js";

export default async function handler(req, res) {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET)
    return res.status(401).end();

  const type = req.query.type || "daily";
  const sent = type === "smart"
    ? await sendSmartReminders()
    : await sendDailyReminders();

  return res.status(200).json({ ok: true, sent, type });
}
