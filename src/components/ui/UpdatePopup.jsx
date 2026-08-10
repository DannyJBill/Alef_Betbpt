import { useState } from "react";
import { useStats } from "../../context/StatsContext";

const BOT_USERNAME = "alef_betbot";
const APP_SHORT    = "learn";

/**
 * UpdatePopup — одноразовый анонс обновления при открытии приложения.
 *
 * Персист вынесен в отдельный localStorage-ключ (НЕ в stats/facts — чтобы не
 * влиять на схему прогресса и синк). Ключ версионирован: чтобы показать новый
 * анонс в будущем — просто подними ANNOUNCE_ID.
 *
 * Поведение кнопок:
 *   ✕ (в углу) / клик по фону — закрыть на этот раз (покажется при следующем открытии);
 *   «Пригласить друга» — реферальная ссылка, как в ProfileScreen;
 *   «Не показывать снова» — пометить и больше не показывать никогда.
 */
const ANNOUNCE_ID  = "v1.2.1";
const ANNOUNCE_KEY = `hebrew-app-announce-${ANNOUNCE_ID}`;
const CHAT_URL     = "https://t.me/alefbetchannel";

// Багфикс-записи — новая сверху. Все спрятаны за одной кнопкой-строкой
// «Последние обновления» (см. <UpdatesSection> ниже): 5-7 записей,
// по объёму нововведений — старые просто выпадают сверху при добавлении новых.
const CHANGELOG = [
  {
    version: "v1.2.1",
    date: "09.08.2026",
    text: `«Мой словарь» - слова, колоды и буквы теперь на одном экране, с
      переключателем «Все слова / По урокам / По темам» · починен баг: слова
      из колод иногда пропадали из словаря после перезапуска.`,
  },
  {
    version: "v1.2",
    date: "09.08.2026",
    text: `Путь курса разбит на 5 модулей с экзаменом на каждый · обновлён
      главный экран: наглядная тропа прогресса, кнопка «Продолжить» открывает
      урок сразу · починены мелкие визуальные огрехи.`,
  },
  {
    version: "v1.15.2",
    date: "08.08.2026",
    text: `Озвучены диалоги во всех уроках 1-4, новые слова уровня 4 и все 462
      слова тематических колод · починены фразы, где озвучка не совпадала с
      текстом.`,
  },
  {
    version: "v1.15",
    date: "07.08.2026",
    text: `Полноэкранный режим на iPad · тема больше не сбрасывается на тёмную
      · прогресс не теряется при быстром выходе · числа 13-19 расписаны
      подробно · опечатка в переводе слова «следующий».`,
  },
];

function dismissedForever() {
  try { return localStorage.getItem(ANNOUNCE_KEY) === "off"; } catch { return false; }
}

function UpdatesSection({ soft, border }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 border-t" style={{ borderColor: border }}>
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className={`w-full py-3 flex items-center justify-between gap-2 text-xs font-semibold ${soft}`}
      >
        <span>🕓 Последние обновления</span>
        <span
          style={{ transition: "transform .2s ease", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {expanded && (
        <div className="pb-3" style={{ animation: "annFade .15s ease" }}>
          {CHANGELOG.map(({ version, date, text }, i) => (
            <div key={version} className={i > 0 ? "pt-2.5 mt-2.5 border-t border-dashed" : ""} style={{ borderColor: border }}>
              <span className={`text-[11px] font-bold ${soft}`}>{version} · {date}</span>
              <p className={`mt-1 text-xs leading-relaxed ${soft}`}>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UpdatePopup({ dark }) {
  const { stats } = useStats();
  const [open, setOpen] = useState(() => !dismissedForever());
  if (!open) return null;

  const close = () => setOpen(false);

  const neverShowAgain = () => {
    try { localStorage.setItem(ANNOUNCE_KEY, "off"); } catch { /* ignore */ }
    setOpen(false);
  };

  const tg = window.Telegram?.WebApp;

  const joinChat = () => {
    if (tg?.openTelegramLink) tg.openTelegramLink(CHAT_URL);
    else window.open(CHAT_URL, "_blank");
  };

  const inviteFriend = () => {
    const refLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT}?startapp=${stats.referralCode || ""}`;
    const shareText = "Учу иврит по приложению Alef Bet 🇮🇱, присоединяйся →";
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
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
        className={`relative w-full max-w-sm rounded-3xl shadow-2xl p-6 my-auto ${card}`}
        style={{ animation: "annPop .25s cubic-bezier(.2,.9,.3,1.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Закрыть"
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-base leading-none ${secondaryBtn}`}
        >
          ✕
        </button>

        <div className="text-center">
          <img
            src="/mascot/mskt-2-heyy.png"
            alt=""
            className="mx-auto w-24 h-24 object-contain"
            style={{ marginTop: -8 }}
          />
          <h2 className="mt-1 text-xl font-bold">Alef Bet v1.2.1</h2>
          <p className={`mt-1 text-sm ${sub}`}>Коротко о том, что внутри:</p>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          <ul className="space-y-2">
            <li>🔤 <b>Алфавит</b> - 22 буквы, огласовки, дагеш и шва</li>
            <li>🗺️ <b>Путь курса</b> - 5 модулей с уроками, тренажёрами, заданиями</li>
            <li>📖 <b>58 уроков грамматики</b> - от Алеф и Бет до Построения фраз</li>
            <li>🧬 <b>Система слова</b> - понимай новые слова по корню, без словаря</li>
            <li>📚 <b>Словарь</b> - 500 слов и 160 фраз с умным повторением</li>
            <li>📦 <b>Колоды</b> - тысячи слов, 19 тем и частей речи</li>
            <li>⚡ <b>Игра на скорость</b> и другие тренажёры</li>
            <li>🤖 <b>ИИ-помощник</b> - спроси что угодно на иврите</li>
          </ul>
        </div>

        <div className={`mt-4 text-[15px] leading-relaxed ${sub}`}>
          Есть идея или баг? Пиши нам 👇
        </div>

        <UpdatesSection soft={soft} border="rgba(127,127,127,0.25)" />

        <button
          onClick={joinChat}
          className="mt-4 w-full rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.99] transition text-white font-semibold py-3"
          style={{ minHeight: 48 }}
        >
          💬 Вступить в чат
        </button>

        <button
          onClick={inviteFriend}
          className={`mt-2 w-full rounded-2xl ${secondaryBtn} active:scale-[0.99] transition font-semibold py-3`}
          style={{ minHeight: 48 }}
        >
          👥 Пригласить друга
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
