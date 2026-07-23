import { useState } from "react";

/**
 * UpdatePopup — одноразовый анонс обновления при открытии приложения.
 *
 * Персист вынесен в отдельный localStorage-ключ (НЕ в stats/facts — чтобы не
 * влиять на схему прогресса и синк). Ключ версионирован: чтобы показать новый
 * анонс в будущем — просто подними ANNOUNCE_ID.
 *
 * Поведение кнопок:
 *   «Круто» — закрыть на этот раз (покажется при следующем открытии);
 *   «Не показывать снова» — пометить и больше не показывать никогда.
 */
const ANNOUNCE_ID  = "v2";
const ANNOUNCE_KEY = `hebrew-app-announce-${ANNOUNCE_ID}`;
const CHAT_URL     = "https://t.me/+acN50m9_IjhjM2I0";

function dismissedForever() {
  try { return localStorage.getItem(ANNOUNCE_KEY) === "off"; } catch { return false; }
}

export default function UpdatePopup({ dark }) {
  const [open, setOpen] = useState(() => !dismissedForever());
  if (!open) return null;

  const close = () => setOpen(false);

  const neverShowAgain = () => {
    try { localStorage.setItem(ANNOUNCE_KEY, "off"); } catch { /* ignore */ }
    setOpen(false);
  };

  const joinChat = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(CHAT_URL);
    else window.open(CHAT_URL, "_blank");
  };

  const card = dark ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const sub  = dark ? "text-gray-300" : "text-gray-600";
  const soft = dark ? "text-gray-500" : "text-gray-400";
  const secondaryBtn = dark
    ? "bg-gray-800 text-gray-100 hover:bg-gray-700"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", animation: "annFade .2s ease" }}
      onClick={close}
    >
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 ${card}`}
        style={{ animation: "annPop .25s cubic-bezier(.2,.9,.3,1.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div style={{ fontSize: 52, lineHeight: 1 }}>🚀</div>
          <h2 className="mt-3 text-xl font-bold">Большой апдейт!</h2>
          <p className={`mt-1 text-sm ${sub}`}>Теперь в Alef Bet есть:</p>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          <ul className="space-y-2">
            <li>🔤 <b>Алфавит и огласовки</b> — 22 буквы, 5 групп, финальные формы</li>
            <li>🔊 <b>Фонетика</b> — дагеш и шва</li>
            <li>📖 <b>58 уроков грамматики</b> — от «это дом» до прошедшего времени</li>
            <li>🧬 <b>Система слова</b> — корень и модель: понимай незнакомое без словаря</li>
            <li>📚 <b>Словарь</b> — 216 слов и 73 фразы, умное повторение</li>
            <li>📦 <b>Колоды</b> — ещё 460 слов по 15 темам</li>
            <li>✨ <b>«Ты уже можешь сказать»</b> — фразы из выученных слов</li>
            <li>⚡ <b>Игра</b> — на скорость, рейтинг и тренировка</li>
            <li>🤖 <b>ИИ-помощник</b> — спроси что угодно на иврите</li>
          </ul>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          Помоги нам стать лучше — залетай в чат ранних пользователей 👇
        </div>

        <button
          onClick={joinChat}
          className="mt-4 w-full rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.99] transition text-white font-semibold py-3"
          style={{ minHeight: 48 }}
        >
          💬 Вступить в чат
        </button>

        <button
          onClick={close}
          className={`mt-2 w-full rounded-2xl ${secondaryBtn} active:scale-[0.99] transition font-semibold py-3`}
          style={{ minHeight: 48 }}
        >
          Круто 🙌
        </button>

        <button
          onClick={neverShowAgain}
          className={`mt-3 mx-auto block text-xs underline underline-offset-2 ${soft} hover:opacity-80`}
        >
          Не показывать снова
        </button>
      </div>

      <style>{`
        @keyframes annFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes annPop  { from { opacity: 0; transform: translateY(8px) scale(.96) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}
