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
const ANNOUNCE_ID  = "v1.2";
const ANNOUNCE_KEY = `hebrew-app-announce-${ANNOUNCE_ID}`;
const CHAT_URL     = "https://t.me/alefbetchannel";

// Багфикс-записи — новая сверху. Каждая скрыта за датой/названием и
// разворачивается по клику (см. <ChangelogEntry> ниже).
const CHANGELOG = [
  {
    version: "v1.2.1",
    date: "09.08.2026",
    text: `«Мой словарь» собран в один экран вместо трёх разных: слова, тематические
      колоды и буквы теперь в одном месте, с переключателем «Все слова / По
      урокам / По темам» — раньше за колодами и буквами надо было выходить на
      отдельные экраны · починен баг: слова, выученные через тематические
      колоды, иногда пропадали из словаря после перезапуска приложения — теперь
      сохраняются надёжно и сразу видны в общем списке.`,
  },
  {
    version: "v1.2",
    date: "09.08.2026",
    text: `Путь курса теперь разбит на 5 модулей (алфавит + уровни 1–4) с подгруппами
      и итоговым экзаменом на каждую — вместо одной длинной ленты · главный экран
      обновлён: наглядная тропа «что пройдено — что сейчас — что дальше», кнопка
      «Продолжить» открывает урок сразу (раньше иногда вместо этого открывался
      список уроков) · подсказка под текущей темой теперь всегда по делу ·
      починены мелкие визуальные огрехи (перенос строк в названиях уроков,
      цвета этапов пути).`,
  },
  {
    version: "v1.15.2",
    date: "08.08.2026",
    text: `Диалоговые карточки во всех уроках уровней 1–4 теперь озвучены (кнопка 🔊
      появляется у вопроса и ответа) · озвучены новые слова и примеры уровня 4 ·
      озвучены все 462 слова тематических колод · карточки колод при просмотре
      («Изучить») больше не показывают пустое слово и пустой перевод · починены
      несколько фраз, где озвучка говорила не то слово, что написано на экране.`,
  },
  {
    version: "v1.15",
    date: "07.08.2026",
    text: `на iPad приложение теперь открывается на весь экран · тема больше не
      сбрасывается на тёмную при переключении окон · прогресс не теряется при
      быстром выходе сразу после ответа · в карточках не мелькает ответ
      следующей · числа 13–19 расписаны подробно с транскрипцией · варианты
      ответов с ивритом и русским вперемешку больше не выглядят одинаково ·
      опечатка в переводе слова «следующий».`,
  },
];

function dismissedForever() {
  try { return localStorage.getItem(ANNOUNCE_KEY) === "off"; } catch { return false; }
}

function ChangelogEntry({ version, date, text, soft, border }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-t" style={{ borderColor: border }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full py-3 flex items-center justify-between gap-2 text-xs font-semibold ${soft}`}
      >
        <span>🛠 Багфиксы {version} · {date}</span>
        <span
          style={{ transition: "transform .2s ease", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {expanded && (
        <div className={`pb-3 text-xs leading-relaxed ${soft}`} style={{ animation: "annFade .15s ease" }}>
          {text}
        </div>
      )}
    </div>
  );
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
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 py-8"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", animation: "annFade .2s ease" }}
      onClick={close}
    >
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 my-auto ${card}`}
        style={{ animation: "annPop .25s cubic-bezier(.2,.9,.3,1.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div style={{ fontSize: 52, lineHeight: 1 }}>🚀</div>
          <h2 className="mt-3 text-xl font-bold">Alef Bet v1.2</h2>
          <p className={`mt-1 text-sm ${sub}`}>Всё, что уже умеет приложение:</p>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          <ul className="space-y-2">
            <li>🔤 <b>Алфавит и огласовки</b> — 22 буквы, 5 групп, финальные формы</li>
            <li>🔊 <b>Фонетика</b> — дагеш и шва</li>
            <li>🗺️ <b>Путь курса</b> — 5 модулей, подгруппы, итоговый экзамен на каждую</li>
            <li>📖 <b>58 уроков грамматики</b> — от «это дом» до прошедшего времени</li>
            <li>🧬 <b>Система слова</b> — корень и модель: понимай незнакомое без словаря</li>
            <li>📚 <b>Словарь</b> — 216 слов и 73 фразы, темы и буквы одним экраном, умное повторение</li>
            <li>📦 <b>Колоды</b> — ещё 460 слов по 15 темам</li>
            <li>✨ <b>«Ты уже можешь сказать»</b> — фразы из выученных слов</li>
            <li>⚡ <b>Игра</b> — на скорость, рейтинг и тренировка</li>
            <li>🤖 <b>ИИ-помощник</b> — спроси что угодно на иврите</li>
          </ul>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          Помоги нам стать лучше — залетай в чат ранних пользователей 👇
        </div>

        <div className="mt-4">
          {CHANGELOG.map(entry => (
            <ChangelogEntry key={entry.version} {...entry} soft={soft} border="rgba(127,127,127,0.25)" />
          ))}
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
