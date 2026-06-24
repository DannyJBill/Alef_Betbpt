import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, ALL_LETTERS, LETTER_GROUPS } from "../data/alphabet";
import { levelProgress } from "../data/constants";
import { getGroupLetters, GROUP_COLORS } from "../helpers/groupHelpers";
import ProgressBar from "../components/ui/ProgressBar";

// ── Описания групп для аккордеона ─────────────────────────────────────────────
const GROUP_INFO = [
  { id:1, emoji:"🌱", color:"emerald", title:"Первые шаги",    letters:"א ב ג ד ה ו", desc:"Шесть самых частых букв иврита. Алеф молчит, Бет говорит «б» или «в», Вав может быть гласной. С этих букв написана половина любого текста." },
  { id:2, emoji:"🔊", color:"blue",    title:"Звуки и формы",  letters:"ז ח ט י כ ל", desc:"Здесь появляются звуки без аналогов в русском: Хэт — глубокий «х», Айин — почти беззвучный. Йод — самая маленькая буква, Ламед — самая высокая." },
  { id:3, emoji:"👯", color:"amber",   title:"Похожие буквы",  letters:"מ נ ס ע פ",   desc:"Самая каверзная группа — буквы легко перепутать. Мем и Нун, Самех и Тэт похожи визуально. Айин беззвучен, как Алеф." },
  { id:4, emoji:"💎", color:"rose",    title:"Редкие буквы",   letters:"צ ק ר ש ת",   desc:"Завершение алфавита. Шин с тремя зубцами, Тав — последняя буква. Рэйш произносится картаво. Цади даёт звук «ц»." },
  { id:5, emoji:"✨", color:"purple",  title:"Финальные формы",letters:"ך ם ן ף ץ",   desc:"Пять букв меняют облик в конце слова. Каф становится Каф-Софит, Мем закрывается в квадрат. Та же буква — другое написание." },
];

const GROUP_COLORS_INFO = {
  emerald:{ bg:"bg-emerald-50 dark:bg-emerald-950", text:"text-emerald-700 dark:text-emerald-300", border:"border-emerald-200 dark:border-emerald-800", dot:"bg-emerald-500" },
  blue:   { bg:"bg-blue-50 dark:bg-blue-950",       text:"text-blue-700 dark:text-blue-300",       border:"border-blue-200 dark:border-blue-800",       dot:"bg-blue-500" },
  amber:  { bg:"bg-amber-50 dark:bg-amber-950",     text:"text-amber-700 dark:text-amber-300",     border:"border-amber-200 dark:border-amber-800",     dot:"bg-amber-500" },
  rose:   { bg:"bg-rose-50 dark:bg-rose-950",       text:"text-rose-700 dark:text-rose-300",       border:"border-rose-200 dark:border-rose-800",       dot:"bg-rose-500" },
  purple: { bg:"bg-purple-50 dark:bg-purple-950",   text:"text-purple-700 dark:text-purple-300",   border:"border-purple-200 dark:border-purple-800",   dot:"bg-purple-500" },
};

export default function HomeScreen({ onNavigate }) {
  const { dark } = useTheme();
  const { stats, getDueCards } = useStats();
  const [groupsOpen, setGroupsOpen] = useState(false);

  const { level, pct: lvlPct } = levelProgress(stats.xp);
  const dueCount        = getDueCards(ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== "locked")
  )).length;
  const unlockedLetters = ALPHABET.filter(l => stats.groupProgress?.[l.group] !== "locked");
  const completedGroups = Object.values(stats.groupProgress || {}).filter(v => v === "completed").length;
  const activeGroup     = [...LETTER_GROUPS].reverse().find(g => stats.groupProgress?.[g.id] === "available");
  const topWeak         = Object.keys(stats.weakLetters || {}).sort((a,b)=>(stats.weakLetters[b]||0)-(stats.weakLetters[a]||0))[0];
  const weakLetter      = topWeak ? ALL_LETTERS.find(l => l.id === Number(topWeak)) : null;

  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto flex flex-col gap-4">

      {/* ── Приветствие + уровень ──────────────────────────────────────────── */}
      <div className={`rounded-2xl p-5 ${dark ? "bg-indigo-900/40 border border-indigo-700/40" : "bg-indigo-50"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Добро пожаловать!</p>
        <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Учим иврит 🇮🇱</h2>
        <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Уровень {level} · {unlockedLetters.length}/{ALPHABET.length} букв открыто
        </p>
        <div className={`mt-2 h-1.5 rounded-full ${dark ? "bg-indigo-900" : "bg-indigo-200"}`}>
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lvlPct}%` }} />
        </div>
      </div>

      {/* ── Рекомендация дня ──────────────────────────────────────────────── */}
      {dueCount > 0 && (
        <div onClick={() => onNavigate('cards')}
          className={`rounded-2xl p-4 border cursor-pointer active:scale-[0.98] transition-all
            ${dark ? "bg-blue-900/30 border-blue-700/40" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold text-sm ${dark ? "text-blue-300" : "text-blue-700"}`}>⏰ Сегодня нужно повторить</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-blue-400" : "text-blue-500"}`}>{dueCount} букв ждут повторения</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${dark ? "bg-blue-800 text-blue-300" : "bg-blue-500 text-white"}`}>
              Открыть →
            </span>
          </div>
        </div>
      )}
      {weakLetter && dueCount === 0 && (
        <div className={`rounded-2xl p-4 border ${dark ? "bg-amber-900/20 border-amber-700/30" : "bg-amber-50 border-amber-200"}`}>
          <p className={`font-semibold text-sm ${dark ? "text-amber-300" : "text-amber-700"}`}>
            💡 Поработай над буквой {weakLetter.symbol} ({weakLetter.name})
          </p>
          <p className={`text-xs mt-0.5 ${dark ? "text-amber-400" : "text-amber-500"}`}>Ты часто её путаешь — попробуй карточки</p>
        </div>
      )}

      {/* ── Модуль: Алфавит ───────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <p className={`font-bold ${dark ? "text-white" : "text-gray-900"}`}>🔤 Алфавит</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{completedGroups}/5 групп · {unlockedLetters.length} букв открыто</p>
          </div>
          <button onClick={() => onNavigate('learn')}
            className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-indigo-500 text-white active:scale-95 transition-all">
            Открыть →
          </button>
        </div>

        {/* Активности */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {[
            { icon:"📚", label:"Учиться",  mode:"learn", sub: activeGroup ? activeGroup.name : "Всё пройдено",  color:"from-indigo-500 to-purple-600" },
            { icon:"🃏", label:"Карточки", mode:"cards", sub: dueCount > 0 ? `${dueCount} сегодня` : "Повторено ✓", color:"from-emerald-500 to-teal-600" },
            { icon:"⚡", label:"Игра",     mode:"game",  sub:"60 секунд",                                          color:"from-orange-500 to-red-500" },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.mode)}
              className={`bg-gradient-to-br ${a.color} text-white rounded-xl p-3 text-left active:scale-95 transition-all`}>
              <div className="text-xl mb-1">{a.icon}</div>
              <div className="font-bold text-xs">{a.label}</div>
              <div className="text-[10px] opacity-80 mt-0.5 leading-tight">{a.sub}</div>
            </button>
          ))}
        </div>

        {/* Прогресс по группам */}
        <div className={`px-4 pb-3 border-t pt-3 ${dark ? "border-gray-700" : "border-gray-100"}`}>
          {LETTER_GROUPS.map(g => {
            const status = stats.groupProgress?.[g.id] || "locked";
            const score  = stats.groupTestScores?.[g.id]?.score;
            const c      = GROUP_COLORS[g.color];
            return (
              <div key={g.id} className="flex items-center gap-2 py-1">
                <span className="text-sm w-4">{status === "completed" ? "✅" : status === "locked" ? "🔒" : "▶️"}</span>
                <span className={`text-xs flex-1 ${status === "locked" ? dark ? "text-gray-600" : "text-gray-300" : dark ? "text-gray-200" : "text-gray-700"}`}>
                  {g.name}
                </span>
                {status === "completed" && score != null && (
                  <span className={`text-xs font-bold ${dark ? "text-gray-400" : "text-gray-500"}`}>{score}%</span>
                )}
                {status === "available" && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>активна</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Аккордеон — про группы */}
        <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"}`}>
          <button onClick={() => setGroupsOpen(o => !o)}
            className={`w-full flex items-center justify-between px-4 py-2.5 transition-all ${dark ? "hover:bg-gray-750" : "hover:bg-gray-50"}`}>
            <span className={`text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>📖 Про группы букв</span>
            <span className={`text-xs transition-transform duration-200 ${groupsOpen ? "rotate-180" : ""} ${dark ? "text-gray-500" : "text-gray-400"}`}>▼</span>
          </button>
          {groupsOpen && (
            <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"}`}>
              {GROUP_INFO.map((g, i) => {
                const c = GROUP_COLORS_INFO[g.color];
                return (
                  <div key={g.id} className={`px-4 py-3 ${i < GROUP_INFO.length - 1 ? dark ? "border-b border-gray-700" : "border-b border-gray-50" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span className="text-sm">{g.emoji}</span>
                      <span className={`font-semibold text-xs ${c.text}`}>{g.title}</span>
                      <span className={`ml-auto font-bold text-base ${c.text}`} style={{ fontFamily:"serif", direction:"rtl" }}>{g.letters}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${dark ? "text-gray-400" : "text-gray-500"}`}>{g.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Сетка алфавита ────────────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="flex justify-between items-center mb-3">
          <span className={`font-bold text-sm ${dark ? "text-white" : "text-gray-800"}`}>Все буквы</span>
          <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{unlockedLetters.length}/{ALPHABET.length} открыто</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {ALPHABET.map(l => {
            const open = stats.groupProgress?.[l.group] !== "locked";
            return (
              <div key={l.id}
                className={`aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all
                  ${open ? dark ? "bg-indigo-900/60 text-indigo-200" : "bg-indigo-50 text-indigo-700"
                          : dark ? "bg-gray-700 text-gray-600" : "bg-gray-100 text-gray-300"}`}
                style={{ fontFamily:"serif" }}>
                {open ? l.symbol : "🔒"}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Модуль: Огласовки (заглушка) ─────────────────────────────────── */}
      <div className={`rounded-2xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <p className={`font-bold ${dark ? "text-white" : "text-gray-900"}`}>📖 Огласовки (Никуд)</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Следующий раздел после алфавита</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            🚧 Скоро
          </span>
        </div>
        <div className={`mx-4 mb-4 rounded-xl p-3 border-2 border-dashed ${dark ? "border-gray-600" : "border-gray-200"}`}>
          <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Знаки огласовок, чтение с никудом, карточки и упражнения — в разработке.
          </p>
        </div>
      </div>

      {/* ── Стрик ────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 border
        ${dark ? "bg-orange-900/30 border-orange-700/30" : "bg-orange-50 border-orange-100"}`}>
        <span className="text-3xl">🔥</span>
        <div>
          <p className={`font-bold ${dark ? "text-orange-300" : "text-orange-700"}`}>{stats.streak} дней подряд!</p>
          <p className={`text-xs ${dark ? "text-orange-400" : "text-orange-500"}`}>Занимайтесь каждый день</p>
        </div>
      </div>

    </div>
  );
}
