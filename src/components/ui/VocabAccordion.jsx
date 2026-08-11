/**
 * VocabAccordion.jsx — общие презентационные блоки для «Мой словарь»
 * (VocabularyScreen) и «Бонус» (DecksScreen), вынесены сюда, чтобы оба
 * экрана могли их использовать без цикличного импорта друг друга.
 */
import { useState } from "react";

/** Плашка «Всего / Знаешь / Предстоит». Предстоит = total - known (не
 * total - studied) — иначе три числа не сходятся друг с другом на экране. */
export function StatBar({ dark, total, known, upcoming }) {
  return (
    <div className="flex justify-around text-center mb-3">
      <div><p className={`text-xl font-black ${dark ? "text-white" : "text-gray-900"}`}>{total}</p><p className="text-xs text-gray-400">всего</p></div>
      <div><p className="text-xl font-black text-emerald-500">{known}</p><p className="text-xs text-gray-400">знаешь</p></div>
      <div><p className="text-xl font-black text-rose-400">{upcoming}</p><p className="text-xs text-gray-400">предстоит</p></div>
    </div>
  );
}

export function RepeatButton({ dark, onClick, disabled }) {
  if (disabled) {
    return (
      <button disabled className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-between
        ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"} cursor-not-allowed`}>
        <span>🔄 Повторить</span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">🔒 в разработке</span>
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
      🔄 Повторить
    </button>
  );
}

export function Accordion({ dark, icon, iconCls, title, sub, defaultOpen = false, onToggle, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
      <button onClick={() => setOpen(o => { onToggle?.(!o); return !o; })} aria-expanded={open}
        className="w-full p-3.5 flex items-center gap-3 text-left">
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${iconCls}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{title}</p>
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        </div>
        <span className="shrink-0 text-gray-400 text-xs">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

export function SearchInput({ dark, q, setQ, placeholder }) {
  return (
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none
        ${dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`} />
  );
}
