/**
 * GET  /api/admin?view=1&secret=X  — HTML дашборд
 * GET  /api/admin?secret=X          — JSON данные
 * POST /api/admin?secret=X          — отправить сообщение пользователю
 *   body: { telegram_id, message }
 */
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
    process.env.SUPABASE_SERVICE_KEY?.trim()
  );
}

const BOT_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  const r = await fetch(`${BOT_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return r.json();
}

async function getData(supabase) {
  const now       = new Date();
  const today     = now.toISOString().split("T")[0];
  const week_ago  = new Date(now - 7  * 86400000).toISOString().split("T")[0];
  const month_ago = new Date(now - 30 * 86400000).toISOString().split("T")[0];

  const [
    { count: total },
    { count: dau },
    { count: wau },
    { count: mau },
    { data: all_rows },
    { data: events7d },
    { data: sessions14d },
    { count: referrals_total },
  ] = await Promise.all([
    supabase.from("user_stats").select("*", { count: "exact", head: true }),
    supabase.from("daily_sessions").select("*", { count: "exact", head: true }).eq("date", today),
    supabase.from("daily_sessions").select("telegram_id", { count: "exact", head: true }).gte("date", week_ago),
    supabase.from("daily_sessions").select("telegram_id", { count: "exact", head: true }).gte("date", month_ago),
    supabase.from("user_stats").select("telegram_id, first_name, username, last_seen_at, is_premium, language_code, stats").order("last_seen_at", { ascending: false }),
    supabase.from("events").select("event_type").gte("created_at", new Date(now - 7 * 86400000).toISOString()),
    supabase.from("daily_sessions").select("date, telegram_id").gte("date", new Date(now - 14 * 86400000).toISOString().split("T")[0]).order("date"),
    supabase.from("referrals").select("*", { count: "exact", head: true }),
  ]);

  const stats_list = (all_rows || []).map(r => r.stats).filter(Boolean);
  const avg_xp     = stats_list.length ? Math.round(stats_list.reduce((s,r)=>s+(r.xp||0),0)/stats_list.length) : 0;
  const avg_streak = stats_list.length ? (stats_list.reduce((s,r)=>s+(r.streak||0),0)/stats_list.length).toFixed(1) : 0;
  const premium    = (all_rows||[]).filter(r=>r.is_premium).length;

  const group_funnel = [1,2,3,4,5].map(gid => ({
    id: gid,
    completed: stats_list.filter(r=>r.groupProgress?.[gid]==="completed").length,
  }));

  const event_counts = {};
  (events7d||[]).forEach(e => { event_counts[e.event_type] = (event_counts[e.event_type]||0)+1; });

  const dau_map = {};
  (sessions14d||[]).forEach(r => {
    if (!dau_map[r.date]) dau_map[r.date] = new Set();
    dau_map[r.date].add(r.telegram_id);
  });
  const dau_chart = Object.entries(dau_map)
    .map(([date, set]) => ({ date: date.slice(5), count: set.size }))
    .sort((a,b) => a.date.localeCompare(b.date));

  // Полный список юзеров
  const users = (all_rows||[]).map(r => ({
    telegram_id: r.telegram_id,
    name:        r.first_name || "—",
    username:    r.username ? `@${r.username}` : "—",
    xp:          r.stats?.xp || 0,
    streak:      r.stats?.streak || 0,
    groups:      Object.values(r.stats?.groupProgress||{}).filter(v=>v==="completed").length,
    premium:     r.is_premium ? "✓" : "",
    lang:        r.language_code || "—",
    last_seen:   r.last_seen_at ? new Date(r.last_seen_at).toLocaleString("ru") : "—",
  }));

  const top10 = [...users].sort((a,b)=>b.xp-a.xp).slice(0,10);

  return { total, dau, wau, mau, avg_xp, avg_streak, premium,
           group_funnel, event_counts, dau_chart, top10, users,
           referrals_total, generated_at: now.toISOString() };
}

function renderHTML(d, secret) {
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
  .sub{color:#64748b;font-size:13px;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px}
  .card{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .card .val{font-size:26px;font-weight:800;color:#6366f1}
  .card .lbl{font-size:11px;color:#64748b;margin-top:2px}
  .section{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:14px}
  .section h2{font-size:14px;font-weight:700;margin-bottom:12px;color:#475569}
  .chart{display:flex;align-items:flex-end;gap:3px;height:60px}
  .bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1;min-width:0}
  .bar-fill{background:#6366f1;border-radius:3px 3px 0 0;width:100%;min-height:2px}
  .bar-lbl{font-size:8px;color:#94a3b8;margin-top:2px;white-space:nowrap}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;color:#94a3b8;font-weight:600;padding:6px 6px;border-bottom:2px solid #f1f5f9;white-space:nowrap}
  td{padding:5px 6px;border-bottom:1px solid #f8fafc;vertical-align:middle}
  tr:hover td{background:#f8fafc}
  .tag{display:inline-block;background:#ede9fe;color:#7c3aed;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:600}
  .btn{background:#6366f1;color:#fff;border:none;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap}
  .btn:hover{background:#4f46e5}
  .btn-sm{background:#10b981;font-size:11px;padding:3px 8px}
  .refresh{position:fixed;top:16px;right:16px;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;z-index:100}
  .modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center}
  .modal.show{display:flex}
  .modal-box{background:#fff;border-radius:16px;padding:24px;width:90%;max-width:420px}
  .modal-box h3{font-size:16px;font-weight:700;margin-bottom:4px}
  .modal-box .uid{font-size:12px;color:#64748b;margin-bottom:12px}
  textarea{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:13px;resize:vertical;min-height:80px;outline:none;font-family:inherit}
  textarea:focus{border-color:#6366f1}
  .modal-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}
  .btn-cancel{background:#f1f5f9;color:#64748b}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;z-index:300;display:none}
  input[type=text]{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;margin-bottom:10px}
  input[type=text]:focus{border-color:#6366f1}
  .users-count{font-size:12px;color:#64748b;margin-bottom:8px}
</style>
</head>
<body>
<button class="refresh" onclick="location.reload()">↻ Обновить</button>
<h1>📊 Alef Bet — Админка</h1>
<div class="sub">Обновлено: ${new Date(d.generated_at).toLocaleString("ru")}</div>

<!-- Метрики -->
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

<!-- DAU chart -->
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

<!-- Воронка -->
<div class="section">
  <h2>🏆 Воронка по группам</h2>
  ${["Первые шаги","Звуки и формы","Похожие буквы","Редкие буквы","Финальные формы"].map((name,i)=>{
    const g = d.group_funnel[i];
    const pct = d.total > 0 ? Math.round((g.completed/d.total)*100) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span>${i+1}. ${name}</span>
        <span style="font-weight:700;color:#6366f1">${g.completed} (${pct}%)</span>
      </div>${bar(g.completed, d.total)}</div>`;
  }).join("")}
</div>

<!-- События -->
<div class="section">
  <h2>⚡ События за 7 дней</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${Object.entries(d.event_counts).map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;padding:8px;background:#f8fafc;border-radius:8px;font-size:13px">
        <span>${k}</span><span class="tag">${v}</span>
      </div>`).join("")}
  </div>
</div>

<!-- Все пользователи -->
<div class="section">
  <h2>👥 Все пользователи</h2>
  <input type="text" id="search" placeholder="🔍 Поиск по имени, @username или ID..." oninput="filterUsers()">
  <div class="users-count" id="usersCount">Показано: ${d.users.length} из ${d.users.length}</div>
  <div style="overflow-x:auto">
  <table id="usersTable">
    <thead>
      <tr>
        <th>ID</th>
        <th>Имя</th>
        <th>Username</th>
        <th>XP</th>
        <th>Стрик</th>
        <th>Групп</th>
        <th>Язык</th>
        <th>Premium</th>
        <th>Последний вход</th>
        <th>Действия</th>
      </tr>
    </thead>
    <tbody id="usersBody">
    ${d.users.map(u=>`
      <tr data-search="${(u.name+u.username+u.telegram_id).toLowerCase()}">
        <td style="font-family:monospace;color:#64748b;font-size:11px">${u.telegram_id}</td>
        <td><b>${u.name}</b></td>
        <td style="color:#6366f1">${u.username}</td>
        <td><b>${u.xp}</b></td>
        <td>${u.streak > 0 ? "🔥"+u.streak : "—"}</td>
        <td>${u.groups}/5</td>
        <td>${u.lang}</td>
        <td style="text-align:center">${u.premium}</td>
        <td style="color:#94a3b8;font-size:11px">${u.last_seen}</td>
        <td style="white-space:nowrap"><button class="btn btn-sm" onclick="openMsg('${u.telegram_id}','${u.name.replace(/\'\'/g,\"\\'\")}')">✉️</button> <button class="btn btn-sm" style="background:${u.premium?'#10b981':'#f59e0b'}" onclick="openPremium('${u.telegram_id}','${u.name.replace(/\'/g,\"\\'\")}',${u.premium?'true':'false'})">⭐</button></td>
      </tr>`).join("")}
    </tbody>
  </table>
  </div>
</div>

<!-- Модальное окно -->
<div class="modal" id="msgModal">
  <div class="modal-box">
    <h3>✉️ Сообщение пользователю</h3>
    <div class="uid" id="msgTarget">—</div>
    <textarea id="msgText" placeholder="Текст сообщения (поддерживается HTML: <b>, <i>, <a>)..."></textarea>
    <div class="modal-actions">
      <button class="btn btn-cancel" onclick="closeMsg()">Отмена</button>
      <button class="btn" onclick="sendMsg()">Отправить →</button>
    </div>
  </div>
</div>


<!-- Premium modal -->
<div class="modal" id="premiumModal">
  <div class="modal-box">
    <h3>⭐ Управление Premium</h3>
    <div class="uid" id="premiumTarget">—</div>
    <div style="margin-bottom:10px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Тип доступа:</label>
      <div style="display:flex;gap:8px">
        <button id="btnLifetime" class="btn" onclick="setPremiumType('lifetime')" style="flex:1">Навсегда ♾️</button>
        <button id="btnDays" class="btn btn-cancel" onclick="setPremiumType('days')" style="flex:1;color:#1e293b">На дни 📅</button>
      </div>
    </div>
    <div id="daysInput" style="display:none;margin-bottom:10px">
      <input type="number" id="premiumDays" min="1" max="3650" value="30" placeholder="Кол-во дней" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;outline:none">
    </div>
    <div id="revokeSection" style="display:none;margin-bottom:10px">
      <button class="btn" style="width:100%;background:#ef4444" onclick="grantPremium('revoke')">🚫 Отозвать Premium</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-cancel" onclick="closePremium()">Отмена</button>
      <button class="btn" id="premiumGrantBtn" onclick="grantPremium()">Выдать ⭐</button>
    </div>
  </div>
</div>
<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
  let currentUserId = null;
  const SECRET = "${secret}";

  function openMsg(id, name) {
    currentUserId = id;
    document.getElementById('msgTarget').textContent = name + ' · ID: ' + id;
    document.getElementById('msgText').value = '';
    document.getElementById('msgModal').classList.add('show');
    document.getElementById('msgText').focus();
  }

  function closeMsg() {
    document.getElementById('msgModal').classList.remove('show');
    currentUserId = null;
  }

  function showToast(msg, ok = true) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    t.style.background = ok ? '#1e293b' : '#ef4444';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  }

  async function sendMsg() {
    const text = document.getElementById('msgText').value.trim();
    if (!text || !currentUserId) return;
    try {
      const r = await fetch('/api/admin?secret=' + SECRET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: currentUserId, message: text })
      });
      const data = await r.json();
      if (data.ok) {
        showToast('✅ Сообщение отправлено!');
        closeMsg();
      } else {
        showToast('❌ Ошибка: ' + (data.error || 'неизвестно'), false);
      }
    } catch(e) {
      showToast('❌ Ошибка соединения', false);
    }
  }

  function filterUsers() {
    const q = document.getElementById('search').value.toLowerCase();
    const rows = document.querySelectorAll('#usersBody tr');
    let visible = 0;
    rows.forEach(row => {
      const match = !q || row.dataset.search.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    document.getElementById('usersCount').textContent =
      'Показано: ' + visible + ' из ' + rows.length;
  }


  let currentPremiumId = null;
  let premiumType = 'lifetime';

  function openPremium(id, name, hasPremium) {
    currentPremiumId = id;
    document.getElementById('premiumTarget').textContent = name + ' · ID: ' + id;
    document.getElementById('revokeSection').style.display = hasPremium === 'true' ? 'block' : 'none';
    setPremiumType('lifetime');
    document.getElementById('premiumModal').classList.add('show');
  }

  function closePremium() {
    document.getElementById('premiumModal').classList.remove('show');
    currentPremiumId = null;
  }

  function setPremiumType(type) {
    premiumType = type;
    document.getElementById('daysInput').style.display = type === 'days' ? 'block' : 'none';
    document.getElementById('btnLifetime').className = 'btn' + (type === 'lifetime' ? '' : ' btn-cancel');
    document.getElementById('btnDays').className = 'btn' + (type === 'days' ? '' : ' btn-cancel');
    document.getElementById('btnLifetime').style.color = type === 'lifetime' ? '' : '#1e293b';
    document.getElementById('btnDays').style.color = type === 'days' ? '' : '#1e293b';
  }

  async function grantPremium(action) {
    if (!currentPremiumId) return;
    const days = premiumType === 'days' ? parseInt(document.getElementById('premiumDays').value) : null;
    if (premiumType === 'days' && (!days || days < 1)) { showToast('Укажи кол-во дней', false); return; }

    try {
      const r = await fetch('/api/admin?secret=' + SECRET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_premium',
          telegram_id: currentPremiumId,
          premium_type: action === 'revoke' ? 'revoke' : premiumType,
          days: days
        })
      });
      const data = await r.json();
      if (data.ok) {
        showToast(action === 'revoke' ? '🚫 Premium отозван' : '⭐ Premium выдан!');
        closePremium();
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('❌ Ошибка: ' + (data.error || 'неизвестно'), false);
      }
    } catch(e) {
      showToast('❌ Ошибка соединения', false);
    }
  }

  document.getElementById('premiumModal').addEventListener('click', function(e) {
    if (e.target === this) closePremium();
  });
  // Закрыть модал по клику на фон
  document.getElementById('msgModal').addEventListener('click', function(e) {
    if (e.target === this) closeMsg();
  });

  // Отправить по Ctrl+Enter
  document.getElementById('msgText').addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') sendMsg();
  });
</script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const supabase = getSupabase();

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { action, telegram_id, message, premium_type, days } = req.body || {};

    // Grant / revoke premium
    if (action === "grant_premium") {
      if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

      const { data: row } = await supabase
        .from("user_stats").select("stats")
        .eq("telegram_id", telegram_id).maybeSingle();
      const existing = row?.stats || {};

      let updatedStats;
      if (premium_type === "revoke") {
        updatedStats = { ...existing, isPremium: false, premiumPurchasedAt: null, premiumType: null, premiumExpiresAt: null };
      } else if (premium_type === "lifetime") {
        updatedStats = { ...existing, isPremium: true, premiumPurchasedAt: Date.now(), premiumType: "lifetime", premiumExpiresAt: null };
      } else if (premium_type === "days") {
        const expiresAt = Date.now() + (days * 86400000);
        updatedStats = { ...existing, isPremium: true, premiumPurchasedAt: Date.now(), premiumType: "days", premiumExpiresAt: expiresAt };
      } else {
        return res.status(400).json({ error: "Invalid premium_type" });
      }

      const { error } = await supabase.from("user_stats")
        .upsert({ telegram_id, stats: updatedStats }, { onConflict: "telegram_id" });
      if (error) return res.status(500).json({ error: error.message });

      const notifyText = premium_type === "revoke"
        ? "\u2139\uFE0F Ваш Premium-доступ был отозван администратором."
        : premium_type === "lifetime"
          ? "\uD83C\uDF89 Вам выдан <b>Premium-доступ навсегда</b>!\n\n\u2B50 Безлимитный AI и ранний доступ к огласовкам."
          : "\uD83C\uDF89 Вам выдан <b>Premium на " + days + " дней</b>!\n\n\u2B50 Безлимитный AI и ранний доступ к огласовкам.";

      await sendMessage(telegram_id, notifyText);
      await supabase.from("events").insert({
        telegram_id: null, event_type: "admin_grant_premium",
        payload: { to: telegram_id, premium_type, days: days || null },
      });
      return res.status(200).json({ ok: true });
    }

    // Send message
    if (!telegram_id || !message) return res.status(400).json({ error: "telegram_id and message required" });
    const result = await sendMessage(telegram_id, message);
    if (!result.ok) return res.status(500).json({ error: result.description || "Telegram error" });
    await supabase.from("events").insert({
      telegram_id: null, event_type: "admin_message",
      payload: { to: telegram_id, preview: message.slice(0, 50) },
    });
    return res.status(200).json({ ok: true });
  }

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method !== "GET") return res.status(405).end();

  const data = await getData(supabase);

  if (req.query.view === "1") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(renderHTML(data, secret));
  }

  return res.status(200).json(data);
}
