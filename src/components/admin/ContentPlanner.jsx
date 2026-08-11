/**
 * ContentPlanner — вкладка «📅 Контент-план» в админке.
 *
 * Простой таймлайн-планировщик постов для соцсетей: площадка + дата +
 * готовый текст + ссылка на группу/канал, куда выставить. После публикации
 * сюда же добавляется ссылка на сам пост — статус переключается на
 * «опубликован» автоматически. Никакой автопубликации — это записная
 * книжка/чек-лист, не бот для постинга.
 *
 * Хранится в Supabase (`content_plan`, доступ только через service role —
 * см. `api/admin.js`, действия `content_plan_save`/`content_plan_delete`).
 */
import { useState } from "react";

const PLATFORMS = [
  { key: "telegram_channel", label: "📢 TG-канал" },
  { key: "telegram_chat",    label: "💬 TG-чат" },
  { key: "instagram",        label: "📸 Instagram" },
  { key: "tiktok",           label: "🎵 TikTok" },
  { key: "vk",                label: "🔵 VK" },
  { key: "facebook",         label: "📘 Facebook" },
  { key: "youtube",          label: "▶️ YouTube" },
  { key: "other",            label: "🔗 Другое" },
];
const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map(p => [p.key, p.label]));

const STATUS_LABEL = { planned: "📅 План", posted: "✅ Вышел", skipped: "⏭ Пропущен" };

const todayStr = () => new Date().toISOString().slice(0, 10);
const EMPTY = () => ({
  id: null, platform: "telegram_channel", scheduled_date: todayStr(),
  title: "", content: "", group_link: "", post_link: "", status: "planned", notes: "",
});

export default function ContentPlanner({ items, api, reload, card, txt, soft, dark }) {
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  function flash(t) { setToast(t); setTimeout(() => setToast(""), 2200); }

  const list = (items || [])
    .filter(p => filter === "all" || p.status === filter)
    .slice()
    .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : a.scheduled_date > b.scheduled_date ? 1 : 0));

  const today = todayStr();

  async function save(form) {
    setBusy(true);
    try {
      const r = await api({ action: "content_plan_save", ...form });
      if (r.ok) { flash(form.id ? "Сохранено" : "Добавлено в план"); setEdit(null); reload(); }
      else flash(r.error || "Ошибка");
    } finally { setBusy(false); }
  }

  async function remove(id) {
    if (!window.confirm("Удалить пост из плана?")) return;
    setBusy(true);
    try {
      const r = await api({ action: "content_plan_delete", id });
      if (r.ok) { flash("Удалено"); setEdit(null); reload(); }
      else flash(r.error || "Ошибка");
    } finally { setBusy(false); }
  }

  async function markPosted(item) {
    const link = window.prompt("Ссылка на опубликованный пост:", item.post_link || "");
    if (link === null) return; // отмена
    setBusy(true);
    try {
      const r = await api({
        action: "content_plan_save", id: item.id, platform: item.platform,
        scheduled_date: item.scheduled_date, title: item.title, content: item.content,
        group_link: item.group_link, notes: item.notes,
        post_link: link.trim(), status: link.trim() ? "posted" : item.status,
      });
      if (r.ok) { flash(link.trim() ? "Отмечено опубликованным" : "Сохранено"); reload(); }
      else flash(r.error || "Ошибка");
    } finally { setBusy(false); }
  }

  const segBtn = (active) =>
    `px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${active ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`;

  return (
    <div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {[["all", "Все"], ["planned", "📅 План"], ["posted", "✅ Вышли"], ["skipped", "⏭ Пропущены"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={segBtn(filter === k)}>{l}</button>
        ))}
      </div>

      <button onClick={() => setEdit(EMPTY())}
        className="w-full py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 mb-3">
        + Запланировать пост
      </button>

      {list.length === 0 && (
        <p className={`text-sm text-center py-8 ${soft}`}>Пока пусто — добавь первый пост в план.</p>
      )}

      {list.map(item => {
        const overdue = item.status === "planned" && item.scheduled_date < today;
        return (
          <div key={item.id} className={`rounded-xl border p-3 mb-2 ${card} ${overdue ? "border-amber-500" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <button className="text-left flex-1" onClick={() => setEdit(item)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                    {PLATFORM_LABEL[item.platform] || item.platform}
                  </span>
                  <span className={`text-[11px] ${overdue ? "text-amber-500 font-bold" : soft}`}>
                    {new Date(item.scheduled_date + "T00:00:00").toLocaleDateString("ru", { weekday: "short", day: "numeric", month: "short" })}
                    {overdue ? " · просрочен" : ""}
                  </span>
                </div>
                <div className={`font-bold text-sm mt-1 ${txt}`}>{item.title || "(без названия)"}</div>
                {item.content && <div className={`text-xs mt-0.5 line-clamp-2 ${soft}`}>{item.content}</div>}
              </button>
              <span className={`text-[11px] whitespace-nowrap ${soft}`}>{STATUS_LABEL[item.status] || item.status}</span>
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              {item.group_link && (
                <a href={item.group_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${card} ${txt}`}>
                  📎 Открыть группу
                </a>
              )}
              {item.post_link ? (
                <a href={item.post_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold">
                  ✅ Открыть пост
                </a>
              ) : (
                <button disabled={busy} onClick={() => markPosted(item)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-500 font-semibold">
                  ➕ Добавить ссылку на пост
                </button>
              )}
            </div>
          </div>
        );
      })}

      {edit && (
        <EditModal item={edit} onClose={() => setEdit(null)} onSave={save} onDelete={remove} busy={busy}
          card={card} txt={txt} soft={soft} dark={dark} />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function EditModal({ item, onClose, onSave, onDelete, busy, card, txt, soft, dark }) {
  const [form, setForm] = useState(item);
  const inputCls = `w-full rounded-lg border p-2.5 text-sm ${card} ${txt}`;
  const labelCls = `text-[11px] font-semibold ${soft} mt-3 mb-1 block`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`w-full rounded-t-3xl p-5 max-h-[85vh] overflow-auto ${dark ? "bg-gray-900" : "bg-white"}`}>
        <div className="flex justify-between items-center mb-1">
          <h3 className={`font-bold ${txt}`}>{form.id ? "Редактировать пост" : "Новый пост в план"}</h3>
          <button onClick={onClose} className={soft}>✕</button>
        </div>

        <p className={labelCls} style={{ marginTop: 8 }}>ПЛОЩАДКА</p>
        <div className="flex gap-1.5 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.key} onClick={() => setForm({ ...form, platform: p.key })}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${form.platform === p.key ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`}>
              {p.label}
            </button>
          ))}
        </div>

        <p className={labelCls}>ДАТА ПУБЛИКАЦИИ</p>
        <input type="date" value={form.scheduled_date}
          onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className={inputCls} />

        <p className={labelCls}>НАЗВАНИЕ (для себя)</p>
        <input type="text" value={form.title} placeholder="Например: Слово дня — שלום"
          onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} />

        <p className={labelCls}>ТЕКСТ ПОСТА</p>
        <textarea rows={5} value={form.content} placeholder="Готовый текст поста…"
          onChange={e => setForm({ ...form, content: e.target.value })} className={inputCls} />

        <p className={labelCls}>ССЫЛКА НА ГРУППУ/КАНАЛ (куда выставить)</p>
        <input type="text" value={form.group_link || ""} placeholder="https://t.me/..."
          onChange={e => setForm({ ...form, group_link: e.target.value })} className={inputCls} />

        <p className={labelCls}>ССЫЛКА НА ОПУБЛИКОВАННЫЙ ПОСТ (заполнить после)</p>
        <input type="text" value={form.post_link || ""} placeholder="Появится после публикации"
          onChange={e => setForm({ ...form, post_link: e.target.value })} className={inputCls} />

        <p className={labelCls}>СТАТУС</p>
        <div className="flex gap-1.5">
          {Object.entries(STATUS_LABEL).map(([k, l]) => (
            <button key={k} onClick={() => setForm({ ...form, status: k })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold ${form.status === k ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`}>
              {l}
            </button>
          ))}
        </div>

        <p className={labelCls}>ЗАМЕТКИ</p>
        <textarea rows={2} value={form.notes || ""} placeholder="Необязательно"
          onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} />

        <div className="flex gap-2 mt-4 mb-1">
          <button disabled={busy || !form.scheduled_date} onClick={() => onSave(form)}
            className="flex-1 py-2.5 rounded-xl font-bold text-white bg-indigo-500 disabled:opacity-40">
            {busy ? "…" : "Сохранить"}
          </button>
          {form.id && (
            <button disabled={busy} onClick={() => onDelete(form.id)}
              className="px-4 py-2.5 rounded-xl font-bold border border-rose-500 text-rose-500">
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
