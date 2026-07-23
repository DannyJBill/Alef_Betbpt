/**
 * api/admin.js — админ-панель Alef Bet (плоский, самодостаточный файл).
 *
 * GET  ?secret=…&view=1   → HTML-дашборд
 * GET  ?secret=…          → JSON тех же данных
 * POST { action, … }      → действия (см. handler)
 *
 * ВАЖНО о схеме: прогресс хранится либо в v8 (stats.facts.{nodes,items}),
 * либо в старом зеркале (stats.scores / stats.readingProgress). Все выборки
 * ниже читают ОБА формата — иначе цифры врут (старая админка считала по
 * stats.groupProgress, которого в v8 нет вовсе, и показывала нули).
 */

const PASS_SCORE = 70;

function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function sendMessage(chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return r.json();
}

// ── Чтение прогресса из обеих схем ────────────────────────────────────────────
function nodesDone(st) {
  if (!st) return 0;
  if (st.facts?.nodes) {
    return Object.values(st.facts.nodes).filter(n => (n?.score || 0) >= PASS_SCORE).length;
  }
  return Object.values(st.scores || {}).filter(v => (v || 0) >= PASS_SCORE).length;
}
function wordsKnown(st) {
  if (!st) return 0;
  if (st.facts?.items) {
    return Object.entries(st.facts.items)
      .filter(([k, v]) => k.startsWith("w:") && v?.introduced).length;
  }
  return (st.readingProgress?.studied || []).length;
}
function schemaVer(st) { return st?.facts ? 8 : (st?.version || 1); }

// ── Сбор данных ───────────────────────────────────────────────────────────────
async function getData(supabase) {
  const now = Date.now();
  const dayAgo   = d => new Date(now - d * 86400000).toISOString().split("T")[0];
  const today    = dayAgo(0);

  const [
    { data: rows },
    { data: sessions },
    { data: events },
    { data: refs },
    { data: deckProg },
  ] = await Promise.all([
    supabase.from("user_stats").select("telegram_id, first_name, username, last_seen_at, is_premium, language_code, updated_at, stats"),
    supabase.from("daily_sessions").select("telegram_id, date").gte("date", dayAgo(60)),
    supabase.from("events").select("telegram_id, event_type, created_at").gte("created_at", new Date(now - 30 * 86400000).toISOString()),
    supabase.from("referrals").select("referrer_id, referee_id, created_at"),
    supabase.from("user_word_progress").select("telegram_id, introduced"),
  ]);

  const all = rows || [];
  const sess = sessions || [];
  const evts = events || [];

  // Активность по дням
  const byDate = {};
  sess.forEach(s => { (byDate[s.date] ||= new Set()).add(s.telegram_id); });
  const activeSince = days => {
    const from = dayAgo(days);
    const set = new Set();
    sess.forEach(s => { if (s.date >= from) set.add(s.telegram_id); });
    return set;
  };
  const dau = (byDate[today] || new Set()).size;
  const wau = activeSince(7).size;
  const mau = activeSince(30).size;

  // Первое появление — из событий (в user_stats нет created_at)
  const firstSeen = {};
  evts.forEach(e => {
    if (!e.telegram_id) return;
    const t = new Date(e.created_at).getTime();
    if (!firstSeen[e.telegram_id] || t < firstSeen[e.telegram_id]) firstSeen[e.telegram_id] = t;
  });
  const newIn = days => Object.values(firstSeen).filter(t => t > now - days * 86400000).length;

  // Колоды
  const deckUsers = new Set();
  let deckWordsLearned = 0;
  (deckProg || []).forEach(p => { deckUsers.add(p.telegram_id); if (p.introduced) deckWordsLearned++; });

  // Пользователи
  const users = all.map(r => {
    const st = r.stats || {};
    const last = r.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
    return {
      telegram_id: r.telegram_id,
      name: r.first_name || "—",
      username: r.username ? "@" + r.username : "",
      xp: st.xp || 0,
      level: st.level || 0,
      streak: st.streak || 0,
      lessons: nodesDone(st),
      words: wordsKnown(st),
      premium: !!r.is_premium,
      premium_type: st.premiumType || "",
      lang: r.language_code || "—",
      schema: schemaVer(st),
      first_seen: firstSeen[r.telegram_id] || null,
      last_seen: last,
      idle_days: last ? Math.floor((now - last) / 86400000) : null,
    };
  }).sort((a, b) => (b.last_seen || 0) - (a.last_seen || 0));

  const premium = users.filter(u => u.premium).length;
  const avg = (arr, f) => arr.length ? Math.round(arr.reduce((s, x) => s + f(x), 0) / arr.length) : 0;

  // Воронка курса: сколько пользователей дошли до N уроков
  const marks = [1, 5, 10, 20, 30, 40, 50, 58];
  const funnel = marks.map(m => ({ mark: m, count: users.filter(u => u.lessons >= m).length }));

  // Отток
  const churn = {
    active7:  users.filter(u => u.idle_days !== null && u.idle_days <= 7).length,
    idle7_14: users.filter(u => u.idle_days > 7 && u.idle_days <= 14).length,
    idle14_30:users.filter(u => u.idle_days > 14 && u.idle_days <= 30).length,
    idle30:   users.filter(u => u.idle_days > 30).length,
    never:    users.filter(u => u.idle_days === null).length,
  };

  // События за 7 дней
  const ev7 = {};
  evts.filter(e => new Date(e.created_at).getTime() > now - 7 * 86400000)
      .forEach(e => { ev7[e.event_type] = (ev7[e.event_type] || 0) + 1; });

  // График DAU 30 дней
  const chart = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayAgo(i);
    chart.push({ date: d.slice(5), count: (byDate[d] || new Set()).size });
  }

  // Языки
  const langs = {};
  users.forEach(u => { langs[u.lang] = (langs[u.lang] || 0) + 1; });

  // Рефералы
  const refCount = {};
  (refs || []).forEach(r => { refCount[r.referrer_id] = (refCount[r.referrer_id] || 0) + 1; });
  const topRefs = Object.entries(refCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => ({ id, n, name: users.find(u => String(u.telegram_id) === String(id))?.name || id }));

  return {
    kpi: {
      total: users.length, dau, wau, mau, premium,
      premium_pct: users.length ? Math.round(premium / users.length * 100) : 0,
      new7: newIn(7), new30: newIn(30),
      avg_xp: avg(users, u => u.xp), avg_lessons: avg(users, u => u.lessons),
      avg_words: avg(users, u => u.words),
      streak_alive: users.filter(u => u.streak > 0).length,
      referrals: (refs || []).length,
      deck_users: deckUsers.size, deck_words: deckWordsLearned,
    },
    funnel, churn, ev7, chart, langs, topRefs, users,
    generated_at: new Date().toISOString(),
  };
}

// ── Сегменты для рассылки ─────────────────────────────────────────────────────
const SEGMENTS = {
  all:       { label: "Все пользователи",        fn: u => true },
  active7:   { label: "Активные (7 дней)",       fn: u => u.idle_days !== null && u.idle_days <= 7 },
  idle7:     { label: "Уснувшие (7–30 дней)",    fn: u => u.idle_days > 7 && u.idle_days <= 30 },
  churned:   { label: "Ушедшие (30+ дней)",      fn: u => u.idle_days > 30 },
  premium:   { label: "С Premium",               fn: u => u.premium },
  free:      { label: "Без Premium",             fn: u => !u.premium },
  starters:  { label: "Начали, но <5 уроков",    fn: u => u.lessons < 5 },
  advanced:  { label: "Прошли 20+ уроков",       fn: u => u.lessons >= 20 },
  streak:    { label: "С активной серией",       fn: u => u.streak > 0 },
};

function renderHTML(d, secret) {
  const j = JSON.stringify;
  const segOpts = Object.entries(SEGMENTS)
    .map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alef Bet · админка</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;background:#0f1115;color:#e6e8ec;padding:16px}
h1{font-size:20px;margin-bottom:4px}.muted{color:#8b93a7;font-size:12px}
.tabs{display:flex;gap:6px;margin:16px 0}
.tab{padding:8px 14px;border-radius:10px;background:#1a1d24;cursor:pointer;font-weight:600;font-size:13px}
.tab.on{background:#4f46e5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.card{background:#1a1d24;border-radius:12px;padding:12px}
.card .v{font-size:22px;font-weight:800}.card .l{font-size:11px;color:#8b93a7;margin-top:2px}
.panel{background:#1a1d24;border-radius:12px;padding:14px;margin-bottom:14px}
.panel h3{font-size:13px;margin-bottom:10px;color:#b9c0d0}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:7px 6px;text-align:left;border-bottom:1px solid #262a33;white-space:nowrap}
th{color:#8b93a7;font-weight:600;cursor:pointer;user-select:none}
tr:hover td{background:#20242c}
input,select,textarea{background:#0f1115;border:1px solid #2c313c;color:#e6e8ec;border-radius:8px;padding:8px 10px;font:inherit;width:100%}
textarea{min-height:90px;resize:vertical}
button{background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:9px 14px;font-weight:600;cursor:pointer;font-size:13px}
button.ghost{background:#262a33}button.danger{background:#b91c1c}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bar{height:8px;background:#262a33;border-radius:4px;overflow:hidden}
.bar>i{display:block;height:100%;background:#4f46e5}
.chart{display:flex;align-items:flex-end;gap:2px;height:90px}
.chart>i{flex:1;background:#4f46e5;border-radius:2px 2px 0 0;min-height:2px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;padding:16px;z-index:9}
.modal.on{display:flex}
.modal .box{background:#1a1d24;border-radius:14px;padding:18px;max-width:520px;width:100%;max-height:90vh;overflow:auto}
.pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;background:#262a33}
.pill.gold{background:#7c5e10;color:#ffd76e}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#22c55e;color:#04210f;padding:10px 18px;border-radius:10px;font-weight:700;display:none}
</style></head><body>

<h1>Alef Bet · админка</h1>
<div class="muted">обновлено ${new Date(d.generated_at).toLocaleString("ru")}</div>

<div class="tabs">
  <div class="tab on" data-t="over">📊 Обзор</div>
  <div class="tab" data-t="users">👥 Пользователи</div>
  <div class="tab" data-t="mkt">📣 Маркетинг</div>
</div>

<!-- ОБЗОР -->
<div id="over">
  <div class="grid">
    ${[
      ["Всего", d.kpi.total], ["DAU", d.kpi.dau], ["WAU", d.kpi.wau], ["MAU", d.kpi.mau],
      ["Новых за 7д", d.kpi.new7], ["Новых за 30д", d.kpi.new30],
      ["Premium", d.kpi.premium + " (" + d.kpi.premium_pct + "%)"],
      ["Серия жива", d.kpi.streak_alive],
      ["Ср. XP", d.kpi.avg_xp], ["Ср. уроков", d.kpi.avg_lessons], ["Ср. слов", d.kpi.avg_words],
      ["Рефералов", d.kpi.referrals],
      ["Юзеров колод", d.kpi.deck_users], ["Слов в колодах", d.kpi.deck_words],
    ].map(([l, v]) => '<div class="card"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>').join("")}
  </div>

  <div class="panel"><h3>Активность за 30 дней</h3>
    <div class="chart">${d.chart.map(c => '<i style="height:' + Math.max(2, c.count / Math.max(1, Math.max(...d.chart.map(x => x.count))) * 100) + '%" title="' + c.date + ": " + c.count + '"></i>').join("")}</div>
  </div>

  <div class="panel"><h3>Воронка курса — дошли до N уроков</h3>
    ${d.funnel.map(f => {
      const pct = d.kpi.total ? Math.round(f.count / d.kpi.total * 100) : 0;
      return '<div style="margin-bottom:8px"><div class="row" style="justify-content:space-between"><span>' + f.mark + '+ уроков</span><span class="muted">' + f.count + ' · ' + pct + '%</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join("")}
  </div>

  <div class="panel"><h3>Удержание</h3>
    <div class="row">
      ${[["Активны ≤7д", d.churn.active7], ["Спят 7–14д", d.churn.idle7_14], ["Спят 14–30д", d.churn.idle14_30], ["Ушли 30+д", d.churn.idle30], ["Ни разу", d.churn.never]]
        .map(([l, v]) => '<div class="card" style="flex:1"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>').join("")}
    </div>
  </div>

  <div class="panel"><h3>События за 7 дней</h3>
    ${Object.entries(d.ev7).sort((a,b)=>b[1]-a[1]).map(([k,v]) => '<div class="row" style="justify-content:space-between;border-bottom:1px solid #262a33;padding:5px 0"><span>' + k + '</span><b>' + v + '</b></div>').join("") || '<div class="muted">нет данных</div>'}
  </div>

  <div class="panel"><h3>Топ рефереров</h3>
    ${d.topRefs.map(r => '<div class="row" style="justify-content:space-between;padding:4px 0"><span>' + r.name + '</span><b>' + r.n + '</b></div>').join("") || '<div class="muted">пока никого</div>'}
  </div>
</div>

<!-- ПОЛЬЗОВАТЕЛИ -->
<div id="users" style="display:none">
  <div class="panel">
    <div class="row" style="margin-bottom:10px">
      <input id="q" placeholder="поиск: имя, @username, id" style="flex:2" oninput="draw()">
      <select id="seg" style="flex:1" onchange="draw()">
        ${segOpts}
      </select>
      <button class="ghost" onclick="exportCsv()">⤓ CSV</button>
    </div>
    <div class="muted" id="cnt"></div>
    <div style="overflow:auto;max-height:70vh">
      <table><thead><tr>
        ${["name","username","xp","lessons","words","streak","premium","lang","idle_days"]
          .map(c => '<th onclick="sortBy(&#39;' + c + '&#39;)">' + ({name:"Имя",username:"Username",xp:"XP",lessons:"Уроки",words:"Слова",streak:"Серия",premium:"Prem",lang:"Яз",idle_days:"Не был, дн"})[c] + '</th>').join("")}
      </tr></thead><tbody id="tb"></tbody></table>
    </div>
  </div>
</div>

<!-- МАРКЕТИНГ -->
<div id="mkt" style="display:none">
  <div class="panel"><h3>Рассылка по сегменту</h3>
    <div class="row" style="margin-bottom:8px">
      <select id="bseg" onchange="segCount()" style="flex:1">
        ${segOpts}
      </select>
      <span class="pill" id="bcount">—</span>
    </div>
    <textarea id="btext" placeholder="Текст рассылки (HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;)"></textarea>
    <div class="row" style="margin-top:10px;justify-content:space-between">
      <span class="muted">Отправляется пачками, ~20 сообщений/сек</span>
      <button onclick="broadcast()">📣 Отправить</button>
    </div>
  </div>

  <div class="panel"><h3>Deep-link с меткой источника</h3>
    <div class="row">
      <input id="utm" placeholder="метка: instagram, chat, blog…" style="flex:1">
      <button class="ghost" onclick="makeLink()">Собрать</button>
    </div>
    <div id="linkout" class="muted" style="margin-top:8px"></div>
  </div>

  <div class="panel"><h3>Языки аудитории</h3>
    ${Object.entries(d.langs).sort((a,b)=>b[1]-a[1]).map(([k,v]) => '<div class="row" style="justify-content:space-between;padding:3px 0"><span>' + k + '</span><b>' + v + '</b></div>').join("")}
  </div>
</div>

<!-- МОДАЛКА ЮЗЕРА -->
<div class="modal" id="um"><div class="box">
  <div class="row" style="justify-content:space-between;margin-bottom:10px">
    <h3 id="uname"></h3><button class="ghost" onclick="closeU()">✕</button>
  </div>
  <div id="ubody" class="muted" style="margin-bottom:12px"></div>
  <textarea id="umsg" placeholder="Личное сообщение…"></textarea>
  <div class="row" style="margin-top:10px">
    <button onclick="sendOne()">✉️ Отправить</button>
    <button class="ghost" onclick="prem('lifetime')">⭐ Premium навсегда</button>
    <button class="ghost" onclick="prem('days',30)">30 дней</button>
    <button class="danger" onclick="prem('revoke')">Отозвать</button>
  </div>
</div></div>

<div id="toast"></div>

<script>
var SECRET = ${j(secret)};
var USERS  = ${j(d.users)};
var SEGF = {
  all:       function(u){return true},
  active7:   function(u){return u.idle_days!==null&&u.idle_days<=7},
  idle7:     function(u){return u.idle_days>7&&u.idle_days<=30},
  churned:   function(u){return u.idle_days>30},
  premium:   function(u){return u.premium},
  free:      function(u){return !u.premium},
  starters:  function(u){return u.lessons<5},
  advanced:  function(u){return u.lessons>=20},
  streak:    function(u){return u.streak>0}
};
var sortKey='last_seen', sortDir=-1, cur=null;

document.querySelectorAll('.tab').forEach(function(t){
  t.onclick=function(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on')});
    t.classList.add('on');
    ['over','users','mkt'].forEach(function(id){ document.getElementById(id).style.display='none'; });
    document.getElementById(t.dataset.t).style.display='';
  };
});

function filtered(){
  var q=(document.getElementById('q').value||'').toLowerCase();
  var seg=document.getElementById('seg').value;
  return USERS.filter(SEGF[seg]).filter(function(u){
    if(!q) return true;
    return (u.name+' '+u.username+' '+u.telegram_id).toLowerCase().indexOf(q)>=0;
  });
}
function sortBy(k){ sortDir = (sortKey===k)? -sortDir : -1; sortKey=k; draw(); }
function draw(){
  var list=filtered().slice().sort(function(a,b){
    var x=a[sortKey], y=b[sortKey];
    if(typeof x==='string') return sortDir*String(y).localeCompare(String(x));
    return sortDir*(((y===null?-1:y))-((x===null?-1:x)));
  });
  document.getElementById('cnt').textContent='показано: '+list.length+' из '+USERS.length;
  document.getElementById('tb').innerHTML=list.map(function(u){
    return '<tr onclick="openU('+u.telegram_id+')">'+
      '<td>'+u.name+'</td><td>'+(u.username||'—')+'</td><td>'+u.xp+'</td>'+
      '<td>'+u.lessons+'</td><td>'+u.words+'</td><td>'+u.streak+'</td>'+
      '<td>'+(u.premium?'<span class="pill gold">'+(u.premium_type||'prem')+'</span>':'')+'</td>'+
      '<td>'+u.lang+'</td><td>'+(u.idle_days===null?'—':u.idle_days)+'</td></tr>';
  }).join('');
}
function openU(id){
  cur=USERS.filter(function(u){return u.telegram_id===id})[0];
  document.getElementById('uname').textContent=cur.name+' '+(cur.username||'');
  document.getElementById('ubody').innerHTML=
    'ID: '+cur.telegram_id+' · схема v'+cur.schema+'<br>'+
    'XP '+cur.xp+' · уровень '+cur.level+' · серия '+cur.streak+'<br>'+
    'уроков пройдено: '+cur.lessons+' · слов в словаре: '+cur.words+'<br>'+
    'первый заход: '+(cur.first_seen?new Date(cur.first_seen).toLocaleDateString('ru'):'—')+
    ' · последний: '+(cur.last_seen?new Date(cur.last_seen).toLocaleString('ru'):'—');
  document.getElementById('um').classList.add('on');
}
function closeU(){ document.getElementById('um').classList.remove('on'); }
function toast(m,ok){ var t=document.getElementById('toast'); t.textContent=m;
  t.style.background=ok===false?'#ef4444':'#22c55e'; t.style.display='block';
  setTimeout(function(){t.style.display='none'},2500); }

async function api(body){
  var r=await fetch('/api/admin?secret='+encodeURIComponent(SECRET),{
    method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':SECRET},
    body:JSON.stringify(body)});
  return r.json();
}
async function sendOne(){
  var m=document.getElementById('umsg').value.trim(); if(!m||!cur) return;
  var r=await api({action:'message',telegram_id:cur.telegram_id,message:m});
  if(r.ok){ toast('Отправлено'); document.getElementById('umsg').value=''; closeU(); }
  else toast(r.error||'Ошибка',false);
}
async function prem(type,days){
  if(!cur) return;
  var r=await api({action:'grant_premium',telegram_id:cur.telegram_id,premium_type:type,days:days});
  if(r.ok){ toast(type==='revoke'?'Premium отозван':'Premium выдан'); closeU(); }
  else toast(r.error||'Ошибка',false);
}
function segCount(){
  var s=document.getElementById('bseg').value;
  document.getElementById('bcount').textContent=USERS.filter(SEGF[s]).length+' чел.';
}
segCount();
async function broadcast(){
  var seg=document.getElementById('bseg').value;
  var text=document.getElementById('btext').value.trim();
  if(!text) return toast('Пустой текст',false);
  var n=USERS.filter(SEGF[seg]).length;
  if(!confirm('Отправить '+n+' пользователям?')) return;
  toast('Отправляю…');
  var r=await api({action:'broadcast',segment:seg,message:text});
  if(r.ok) toast('Доставлено: '+r.sent+' / ошибок: '+r.failed);
  else toast(r.error||'Ошибка',false);
}
function makeLink(){
  var u=(document.getElementById('utm').value||'src').replace(/[^a-zA-Z0-9_]/g,'');
  document.getElementById('linkout').innerHTML=
    'https://t.me/AlefBetBot?start='+u+'<br><span class="muted">Метка придёт боту в /start — по ней считаем источник.</span>';
}
function exportCsv(){
  var rows=[['id','name','username','xp','level','lessons','words','streak','premium','lang','idle_days']];
  filtered().forEach(function(u){ rows.push([u.telegram_id,u.name,u.username,u.xp,u.level,u.lessons,u.words,u.streak,u.premium?1:0,u.lang,u.idle_days]); });
  var csv=rows.map(function(r){return r.join(',')}).join('\\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='alefbet_users.csv'; a.click();
}
draw();
</script></body></html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).send("Unauthorized");

  const supabase = getSupabase();

  if (req.method === "POST") {
    const { action, telegram_id, message, premium_type, days, segment } = req.body || {};

    // Рассылка по сегменту
    if (action === "broadcast") {
      if (!message || !segment) return res.status(400).json({ error: "segment + message required" });
      const seg = SEGMENTS[segment];
      if (!seg) return res.status(400).json({ error: "unknown segment" });

      const data = await getData(supabase);
      const targets = data.users.filter(seg.fn);
      let sent = 0, failed = 0;
      for (const u of targets) {
        const r = await sendMessage(u.telegram_id, message);
        r?.ok ? sent++ : failed++;
        await new Promise(r => setTimeout(r, 55)); // ~18 msg/s, лимит Telegram 30
      }
      await supabase.from("events").insert({
        telegram_id: null, event_type: "admin_broadcast",
        payload: { segment, sent, failed, preview: message.slice(0, 60) },
      });
      return res.status(200).json({ ok: true, sent, failed });
    }

    // Premium
    if (action === "grant_premium") {
      if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });
      const { data: row } = await supabase.from("user_stats").select("stats").eq("telegram_id", telegram_id).maybeSingle();
      const existing = row?.stats || {};
      let updated;
      if (premium_type === "revoke") {
        updated = { ...existing, isPremium: false, premiumPurchasedAt: null, premiumType: null, premiumExpiresAt: null };
      } else if (premium_type === "lifetime") {
        updated = { ...existing, isPremium: true, premiumPurchasedAt: Date.now(), premiumType: "lifetime", premiumExpiresAt: null };
      } else if (premium_type === "days") {
        updated = { ...existing, isPremium: true, premiumPurchasedAt: Date.now(), premiumType: "days", premiumExpiresAt: Date.now() + days * 86400000 };
      } else return res.status(400).json({ error: "bad premium_type" });

      const { error } = await supabase.from("user_stats")
        .upsert({ telegram_id, stats: updated, is_premium: premium_type !== "revoke" }, { onConflict: "telegram_id" });
      if (error) return res.status(500).json({ error: error.message });

      await sendMessage(telegram_id, premium_type === "revoke"
        ? "ℹ️ Ваш Premium-доступ был отозван администратором."
        : "🎉 Вам выдан <b>Premium</b>!\n\n⭐ Спасибо, что вы с нами.");
      await supabase.from("events").insert({
        telegram_id: null, event_type: "admin_grant_premium",
        payload: { to: telegram_id, premium_type, days: days || null },
      });
      return res.status(200).json({ ok: true });
    }

    // Личное сообщение
    if (action === "message" || (telegram_id && message)) {
      if (!telegram_id || !message) return res.status(400).json({ error: "telegram_id + message required" });
      const r = await sendMessage(telegram_id, message);
      if (!r.ok) return res.status(500).json({ error: r.description || "Telegram error" });
      await supabase.from("events").insert({
        telegram_id: null, event_type: "admin_message",
        payload: { to: telegram_id, preview: message.slice(0, 50) },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "unknown action" });
  }

  if (req.method !== "GET") return res.status(405).end();

  const data = await getData(supabase);
  if (req.query.view === "1") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(renderHTML(data, secret));
  }
  return res.status(200).json(data);
}
