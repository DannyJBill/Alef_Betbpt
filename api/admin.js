/**
 * GET /api/admin        — JSON данные
 * GET /api/admin?view=1 — HTML дашборд
 */
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
    process.env.SUPABASE_SERVICE_KEY?.trim()
  );
}

async function getData(supabase) {
  const now = new Date();
  const today     = now.toISOString().split("T")[0];
  const week_ago  = new Date(now - 7  * 86400000).toISOString().split("T")[0];
  const month_ago = new Date(now - 30 * 86400000).toISOString().split("T")[0];

  const [
    { count: total },
    { count: dau },
    { count: wau },
    { count: mau },
    { data: all_stats },
    { data: events7d },
    { data: sessions14d },
    { count: referrals_total },
  ] = await Promise.all([
    supabase.from("user_stats").select("*", { count: "exact", head: true }),
    supabase.from("daily_sessions").select("*", { count: "exact", head: true }).eq("date", today),
    supabase.from("daily_sessions").select("telegram_id", { count: "exact", head: true }).gte("date", week_ago),
    supabase.from("daily_sessions").select("telegram_id", { count: "exact", head: true }).gte("date", month_ago),
    supabase.from("user_stats").select("stats, first_name, username, last_seen_at").order("last_seen_at", { ascending: false }),
    supabase.from("events").select("event_type").gte("created_at", new Date(now - 7 * 86400000).toISOString()),
    supabase.from("daily_sessions").select("date, telegram_id").gte("date", new Date(now - 14 * 86400000).toISOString().split("T")[0]).order("date"),
    supabase.from("referrals").select("*", { count: "exact", head: true }),
  ]);

  const stats_list = (all_stats || []).map(r => r.stats).filter(Boolean);
  const avg_xp     = stats_list.length ? Math.round(stats_list.reduce((s,r)=>s+(r.xp||0),0)/stats_list.length) : 0;
  const avg_streak = stats_list.length ? (stats_list.reduce((s,r)=>s+(r.streak||0),0)/stats_list.length).toFixed(1) : 0;
  const premium    = stats_list.filter(r=>r.is_premium).length;
  const ru_users   = stats_list.filter(r=>r.language_code==="ru").length;

  const group_funnel = [1,2,3,4,5].map(gid => ({
    id: gid,
    completed: stats_list.filter(r=>r.groupProgress?.[gid]==="completed").length,
  }));

  const event_counts = {};
  (events7d||[]).forEach(e => { event_counts[e.event_type] = (event_counts[e.event_type]||0)+1; });

  // DAU по дням
  const dau_map = {};
  (sessions14d||[]).forEach(r => {
    if (!dau_map[r.date]) dau_map[r.date] = new Set();
    dau_map[r.date].add(r.telegram_id);
  });
  const dau_chart = Object.entries(dau_map)
    .map(([date, set]) => ({ date: date.slice(5), count: set.size }))
    .sort((a,b) => a.date.localeCompare(b.date));

  const top10 = (all_stats||[])
    .filter(r => r.stats?.xp > 0)
    .sort((a,b) => (b.stats?.xp||0) - (a.stats?.xp||0))
    .slice(0,10)
    .map(r => ({
      name: r.first_name || r.username || "—",
      xp: r.stats?.xp || 0,
      streak: r.stats?.streak || 0,
      groups: Object.values(r.stats?.groupProgress||{}).filter(v=>v==="completed").length,
      last: r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("ru") : "—",
    }));

  return { total, dau, wau, mau, avg_xp, avg_streak, premium, ru_users,
           group_funnel, event_counts, dau_chart, top10,
           referrals_total, generated_at: now.toISOString() };
}

function renderHTML(d) {
  const bar = (val, max, color="#6366f1") =>
    `<div style="background:#e5e7eb;border-radius:4px;height:8px;margin-top:4px">
       <div style="background:${color};height:8px;border-radius:4px;width:${Math.round((val/Math.max(max,1))*100)}%"></div>
     </div>`;

  const maxDau = Math.max(...d.dau_chart.map(r=>r.count), 1);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alef Bet — Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:20px}
  h1{font-size:22px;font-weight:800;margin-bottom:4px}
  .sub{color:#64748b;font-size:13px;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
  .card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .card .val{font-size:28px;font-weight:800;color:#6366f1}
  .card .lbl{font-size:12px;color:#64748b;margin-top:2px}
  .section{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:16px}
  .section h2{font-size:14px;font-weight:700;margin-bottom:12px;color:#475569}
  .chart{display:flex;align-items:flex-end;gap:4px;height:60px}
  .bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1}
  .bar-fill{background:#6366f1;border-radius:3px 3px 0 0;width:100%;min-height:2px}
  .bar-lbl{font-size:9px;color:#94a3b8;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:#94a3b8;font-weight:600;padding:6px 8px;border-bottom:1px solid #f1f5f9}
  td{padding:6px 8px;border-bottom:1px solid #f8fafc}
  .tag{display:inline-block;background:#ede9fe;color:#7c3aed;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600}
  .refresh{position:fixed;top:16px;right:16px;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600}
</style>
</head>
<body>
<button class="refresh" onclick="location.reload()">↻ Обновить</button>
<h1>📊 Alef Bet — Аналитика</h1>
<div class="sub">Обновлено: ${new Date(d.generated_at).toLocaleString("ru")}</div>

<div class="grid">
  <div class="card"><div class="val">${d.total}</div><div class="lbl">Всего пользователей</div></div>
  <div class="card"><div class="val" style="color:#10b981">${d.dau}</div><div class="lbl">DAU (сегодня)</div></div>
  <div class="card"><div class="val" style="color:#3b82f6">${d.wau}</div><div class="lbl">WAU (7 дней)</div></div>
  <div class="card"><div class="val" style="color:#8b5cf6">${d.mau}</div><div class="lbl">MAU (30 дней)</div></div>
  <div class="card"><div class="val" style="color:#f59e0b">${d.avg_xp}</div><div class="lbl">Средний XP</div></div>
  <div class="card"><div class="val" style="color:#ef4444">${d.avg_streak}</div><div class="lbl">Средний стрик</div></div>
  <div class="card"><div class="val" style="color:#06b6d4">${d.referrals_total}</div><div class="lbl">Рефералов</div></div>
  <div class="card"><div class="val" style="color:#84cc16">${d.premium}</div><div class="lbl">TG Premium</div></div>
</div>

<div class="section">
  <h2>📈 DAU — последние 14 дней</h2>
  <div class="chart">
    ${d.dau_chart.map(r=>`
      <div class="bar-wrap">
        <div class="bar-fill" style="height:${Math.round((r.count/maxDau)*56)+4}px"></div>
        <div class="bar-lbl">${r.date}</div>
      </div>`).join("")}
  </div>
</div>

<div class="section">
  <h2>🏆 Воронка по группам</h2>
  ${["Первые шаги","Звуки и формы","Похожие буквы","Редкие буквы","Финальные формы"].map((name,i)=>{
    const g = d.group_funnel[i];
    const pct = d.total > 0 ? Math.round((g.completed/d.total)*100) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span>${i+1}. ${name}</span>
        <span style="font-weight:700;color:#6366f1">${g.completed} (${pct}%)</span>
      </div>
      ${bar(g.completed, d.total)}
    </div>`;
  }).join("")}
</div>

<div class="section">
  <h2>⚡ События за 7 дней</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${Object.entries(d.event_counts).map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;padding:8px;background:#f8fafc;border-radius:8px;font-size:13px">
        <span>${k}</span><span class="tag">${v}</span>
      </div>`).join("")}
  </div>
</div>

<div class="section">
  <h2>👑 Топ-10 по XP</h2>
  <table>
    <tr><th>Имя</th><th>XP</th><th>Стрик</th><th>Групп</th><th>Был</th></tr>
    ${d.top10.map(r=>`<tr>
      <td>${r.name}</td>
      <td><b>${r.xp}</b></td>
      <td>${r.streak > 0 ? "🔥"+r.streak : "—"}</td>
      <td>${r.groups}/5</td>
      <td style="color:#94a3b8">${r.last}</td>
    </tr>`).join("")}
  </table>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const supabase = getSupabase();
  const data = await getData(supabase);

  if (req.query.view === "1") {
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(renderHTML(data));
  }

  return res.status(200).json(data);
}
