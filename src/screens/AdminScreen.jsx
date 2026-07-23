/**
 * AdminScreen — админка внутри мини-аппа (только для владельца).
 *
 * Данные берём из того же `/api/admin` (без view=1 он отдаёт JSON).
 * Секрет спрашиваем один раз и держим в localStorage устройства —
 * в бандл он не попадает.
 */
import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const SECRET_KEY = "ab_admin_secret";

export default function AdminScreen({ onBack }) {
  const { dark } = useTheme();
  const [secret, setSecret] = useState(() => localStorage.getItem(SECRET_KEY) || "");
  const [input, setInput]   = useState("");
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState("");
  const [tab, setTab]       = useState("over");
  const [q, setQ]           = useState("");
  const [seg, setSeg]       = useState("all");
  const [user, setUser]     = useState(null);
  const [msg, setMsg]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [toast, setToast]   = useState("");

  const card = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const txt  = dark ? "text-white" : "text-gray-900";
  const soft = dark ? "text-gray-400" : "text-gray-500";

  useEffect(() => { if (secret) load(secret); }, [secret]);

  async function load(s) {
    setErr("");
    try {
      const r = await fetch(`/api/admin?secret=${encodeURIComponent(s)}`);
      if (r.status === 401) { setErr("Неверный секрет"); localStorage.removeItem(SECRET_KEY); setSecret(""); return; }
      setData(await r.json());
    } catch (e) { setErr("Сеть недоступна"); }
  }

  async function api(body) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin?secret=${encodeURIComponent(secret)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      return await r.json();
    } finally { setBusy(false); }
  }

  function flash(t) { setToast(t); setTimeout(() => setToast(""), 2200); }

  // ── Ввод секрета ──
  if (!secret) {
    return (
      <div className="px-4 pt-6 max-w-md mx-auto">
        <button onClick={onBack} className={`text-sm mb-4 ${soft}`}>← Профиль</button>
        <h2 className={`text-xl font-bold mb-3 ${txt}`}>🛠 Админ-панель</h2>
        <input type="password" value={input} onChange={e => setInput(e.target.value)}
          placeholder="ADMIN_SECRET"
          className={`w-full rounded-xl border p-3 mb-2 ${card} ${txt}`} />
        {err && <p className="text-sm text-rose-500 mb-2">{err}</p>}
        <button onClick={() => { localStorage.setItem(SECRET_KEY, input); setSecret(input); }}
          className="w-full py-3 rounded-xl font-bold text-white bg-indigo-500">Войти</button>
      </div>
    );
  }

  if (!data) return (
    <div className="px-4 pt-6 max-w-md mx-auto">
      <button onClick={onBack} className={`text-sm mb-4 ${soft}`}>← Профиль</button>
      <p className={soft}>{err || "Загрузка…"}</p>
    </div>
  );

  const SEGF = {
    all:      () => true,
    active7:  u => u.idle_days !== null && u.idle_days <= 7,
    idle7:    u => u.idle_days > 7 && u.idle_days <= 30,
    churned:  u => u.idle_days > 30,
    premium:  u => u.premium,
    free:     u => !u.premium,
    starters: u => u.lessons < 5,
    advanced: u => u.lessons >= 20,
  };
  const SEG_LABEL = {
    all: "Все", active7: "Активные 7д", idle7: "Спят 7–30д", churned: "Ушли 30+д",
    premium: "Premium", free: "Без premium", starters: "Начали <5", advanced: "20+ уроков",
  };

  const list = data.users.filter(SEGF[seg]).filter(u =>
    !q || `${u.name} ${u.username} ${u.telegram_id}`.toLowerCase().includes(q.toLowerCase()));

  const K = ({ v, l }) => (
    <div className={`rounded-xl border p-3 ${card}`}>
      <div className={`text-xl font-extrabold ${txt}`}>{v}</div>
      <div className={`text-[11px] ${soft}`}>{l}</div>
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className={`text-sm ${soft}`}>← Профиль</button>
        <button onClick={() => load(secret)} className={`text-sm ${soft}`}>↻ Обновить</button>
      </div>

      <div className="flex gap-2 mb-4">
        {[["over", "📊"], ["users", "👥"], ["mkt", "📣"]].map(([id, ic]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold ${tab === id ? "bg-indigo-500 text-white" : `border ${card} ${txt}`}`}>
            {ic}
          </button>
        ))}
      </div>

      {/* ── Обзор ── */}
      {tab === "over" && (
        <div className="grid grid-cols-3 gap-2">
          <K v={data.kpi.total} l="всего" />
          <K v={data.kpi.dau} l="DAU" />
          <K v={data.kpi.wau} l="WAU" />
          <K v={data.kpi.mau} l="MAU" />
          <K v={data.kpi.new7} l="новых 7д" />
          <K v={data.kpi.new30} l="новых 30д" />
          <K v={`${data.kpi.premium}`} l={`premium ${data.kpi.premium_pct}%`} />
          <K v={data.kpi.streak_alive} l="серия жива" />
          <K v={data.kpi.referrals} l="рефералов" />
          <K v={data.kpi.avg_xp} l="ср. XP" />
          <K v={data.kpi.avg_lessons} l="ср. уроков" />
          <K v={data.kpi.avg_words} l="ср. слов" />
          <div className="col-span-3 mt-2">
            <p className={`text-xs font-bold mb-2 ${soft}`}>УДЕРЖАНИЕ</p>
            {[["Активны ≤7д", data.churn.active7], ["Спят 7–14д", data.churn.idle7_14],
              ["Спят 14–30д", data.churn.idle14_30], ["Ушли 30+д", data.churn.idle30]].map(([l, v]) => (
              <div key={l} className={`flex justify-between py-1.5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
                <span className={`text-sm ${soft}`}>{l}</span><b className={`text-sm ${txt}`}>{v}</b>
              </div>
            ))}
          </div>
          <div className="col-span-3 mt-3">
            <p className={`text-xs font-bold mb-2 ${soft}`}>ВОРОНКА КУРСА</p>
            {data.funnel.map(f => {
              const pct = data.kpi.total ? Math.round(f.count / data.kpi.total * 100) : 0;
              return (
                <div key={f.mark} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={soft}>{f.mark}+ уроков</span><span className={soft}>{f.count} · {pct}%</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Пользователи ── */}
      {tab === "users" && (
        <div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="поиск"
            className={`w-full rounded-xl border p-2.5 mb-2 text-sm ${card} ${txt}`} />
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {Object.keys(SEGF).map(k => (
              <button key={k} onClick={() => setSeg(k)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap
                  ${seg === k ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`}>
                {SEG_LABEL[k]}
              </button>
            ))}
          </div>
          <p className={`text-xs mb-2 ${soft}`}>{list.length} из {data.users.length}</p>
          {list.map(u => (
            <button key={u.telegram_id} onClick={() => { setUser(u); setMsg(""); }}
              className={`w-full text-left rounded-xl border p-3 mb-2 ${card}`}>
              <div className="flex justify-between items-center">
                <span className={`font-bold text-sm ${txt}`}>{u.name} {u.premium && "⭐"}</span>
                <span className={`text-[11px] ${soft}`}>{u.idle_days === null ? "—" : `${u.idle_days}д`}</span>
              </div>
              <div className={`text-[11px] ${soft}`}>
                {u.username || u.telegram_id} · {u.xp} XP · {u.lessons} ур. · {u.words} слов
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Маркетинг ── */}
      {tab === "mkt" && (
        <div>
          <p className={`text-xs font-bold mb-2 ${soft}`}>РАССЫЛКА ПО СЕГМЕНТУ</p>
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {Object.keys(SEGF).map(k => (
              <button key={k} onClick={() => setSeg(k)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap
                  ${seg === k ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`}>
                {SEG_LABEL[k]}
              </button>
            ))}
          </div>
          <p className={`text-xs mb-2 ${soft}`}>получателей: {data.users.filter(SEGF[seg]).length}</p>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
            placeholder="Текст рассылки (HTML: <b>жирный</b>)"
            className={`w-full rounded-xl border p-3 text-sm mb-2 ${card} ${txt}`} />
          <button disabled={busy || !msg.trim()}
            onClick={async () => {
              const n = data.users.filter(SEGF[seg]).length;
              if (!window.confirm(`Отправить ${n} пользователям?`)) return;
              const r = await api({ action: "broadcast", segment: seg, message: msg });
              r.ok ? (flash(`Доставлено ${r.sent}, ошибок ${r.failed}`), setMsg("")) : flash(r.error || "Ошибка");
            }}
            className="w-full py-3 rounded-xl font-bold text-white bg-indigo-500 disabled:opacity-40">
            {busy ? "Отправляю…" : "📣 Отправить"}
          </button>

          <p className={`text-xs font-bold mt-5 mb-2 ${soft}`}>ЯЗЫКИ</p>
          {Object.entries(data.langs).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className={`flex justify-between py-1 text-sm ${soft}`}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
      )}

      {/* ── Карточка пользователя ── */}
      {user && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setUser(null)}>
          <div onClick={e => e.stopPropagation()}
            className={`w-full rounded-t-3xl p-5 max-h-[85vh] overflow-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`font-bold ${txt}`}>{user.name} {user.username}</h3>
              <button onClick={() => setUser(null)} className={soft}>✕</button>
            </div>
            <p className={`text-xs mb-3 ${soft}`}>
              ID {user.telegram_id} · схема v{user.schema} · {user.lang}<br />
              {user.xp} XP · уровень {user.level} · серия {user.streak}<br />
              уроков {user.lessons} · слов {user.words}<br />
              первый заход: {user.first_seen ? new Date(user.first_seen).toLocaleDateString("ru") : "—"}<br />
              последний: {user.last_seen ? new Date(user.last_seen).toLocaleString("ru") : "—"}
            </p>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              placeholder="Личное сообщение…"
              className={`w-full rounded-xl border p-3 text-sm mb-2 ${card} ${txt}`} />
            <div className="flex gap-2 mb-2">
              <button disabled={busy || !msg.trim()}
                onClick={async () => {
                  const r = await api({ action: "message", telegram_id: user.telegram_id, message: msg });
                  r.ok ? (flash("Отправлено"), setMsg(""), setUser(null)) : flash(r.error || "Ошибка");
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-indigo-500 disabled:opacity-40">
                ✉️ Написать
              </button>
            </div>
            <div className="flex gap-2">
              {[["lifetime", "⭐ Навсегда"], ["days", "30 дней"], ["revoke", "Отозвать"]].map(([t, l]) => (
                <button key={t} disabled={busy}
                  onClick={async () => {
                    const r = await api({ action: "grant_premium", telegram_id: user.telegram_id, premium_type: t, days: 30 });
                    r.ok ? (flash(t === "revoke" ? "Отозван" : "Выдан"), setUser(null), load(secret)) : flash(r.error || "Ошибка");
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${t === "revoke" ? "border-rose-500 text-rose-500" : `${card} ${txt}`}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
