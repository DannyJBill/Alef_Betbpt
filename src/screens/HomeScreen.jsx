import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import { READING_ITEMS } from "../data/reading";
import { levelProgress } from "../data/constants";
import { ALL_LETTERS } from "../data/alphabet";

// ── Путь обучения ─────────────────────────────────────────────────────────────
// Этап 4 (beta.V1.1.4): секция «Разговор» (легаси-узлы W1-5) удалена вместе с
// узлами. «Словарь» считается из единого потока (readingProgress.studied).
const PATH_SECTIONS = [
  { id:"alphabet", icon:"🔤", label:"Буквы",     color:"indigo",  target:"alphabet" },
  { id:"nikud",    icon:"🎵", label:"Огласовки", color:"blue",    target:"nikud"    },
  { id:"reading",  icon:"📚", label:"Словарь",   color:"emerald", target:"reading"  },
];

const SECTION_COLORS = {
  indigo:  { active:"bg-indigo-500",  inactive:"bg-indigo-100 dark:bg-indigo-900/30",  text:"text-indigo-600 dark:text-indigo-400",  ring:"ring-indigo-400",  bar:"bg-indigo-500" },
  blue:    { active:"bg-blue-500",    inactive:"bg-blue-100 dark:bg-blue-900/30",      text:"text-blue-600 dark:text-blue-400",      ring:"ring-blue-400",    bar:"bg-blue-500" },
  emerald: { active:"bg-emerald-500", inactive:"bg-emerald-100 dark:bg-emerald-900/30",text:"text-emerald-600 dark:text-emerald-400",ring:"ring-emerald-400", bar:"bg-emerald-500" },
  amber:   { active:"bg-amber-500",   inactive:"bg-amber-100 dark:bg-amber-900/30",    text:"text-amber-600 dark:text-amber-400",    ring:"ring-amber-400",   bar:"bg-amber-500" },
};

function useSectionProgress(stats) {
  const p = stats.progress || {};

  const pct = (sectionP) => {
    const done = [1,2,3,4,5].filter(n => sectionP?.[n] === "done").length;
    return Math.round((done / 5) * 100);
  };
  const isDone = (sectionP, n) => sectionP?.[n] === "done";

  // Словарь — единый поток слов (readingProgress), не легаси WORD_CATEGORIES
  // Словарь — единый поток СЛОВ (не фраз), только реально существующие в контенте
  const dictWords     = READING_ITEMS.filter(i => i.type !== 'phrase');
  const studiedSet    = new Set(stats.readingProgress?.studied || []);
  const studiedStream = dictWords.filter(i => studiedSet.has(i.id)).length;
  const totalStream   = dictWords.length;
  const readingPct    = totalStream ? Math.round((studiedStream / totalStream) * 100) : 0;

  return {
    alphabet: { pct: pct(p.letters), done: [1,2,3,4,5].filter(n=>isDone(p.letters,n)).length, total:5, unlocked: true },
    nikud:    { pct: pct(p.sounds),  done: [1,2,3,4,5].filter(n=>isDone(p.sounds,n)).length,  total:5, unlocked: isDone(p.letters,1) && isDone(p.letters,2) },
    reading:  { pct: readingPct, done: studiedStream, total: totalStream, unlocked: true },
  };
}

export default function HomeScreen({ onOpenProfile, onNavigateStudy }) {
  const { dark } = useTheme();
  const { stats, getDueCards } = useStats();

  const { level, pct: lvlPct, xpToNext } = levelProgress(stats.xp);
  const tgUser  = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const name    = tgUser?.first_name || "Привет";
  const progress = useSectionProgress(stats);

  const p = stats.progress || {};
  const dueCount = getDueCards(ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && p.letters?.[g.id] !== "locked")
  )).length;

  const completedGroups = [1,2,3,4,5].filter(n => p.letters?.[n] === "done").length;
  const activeAlphaGroup = LETTER_GROUPS.find(g => p.letters?.[g.id] === "available");

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto flex flex-col gap-4">

      {/* ── Профиль компактно ───────────────────────────────────────────────── */}
      <button onClick={onOpenProfile}
        className={`rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all border
          ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        {/* Аватар */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-xl flex-shrink-0">
          {tgUser?.photo_url
            ? <img src={tgUser.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
            : "😊"}
        </div>
        {/* Инфо */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{name}</div>
          <div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Уровень {level} · {stats.xp} XP</div>
          {/* Прогресс-бар уровня */}
          <div className={`mt-1.5 h-1 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lvlPct}%` }} />
          </div>
        </div>
        {/* Стрик + стрелка */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-orange-500 text-sm font-bold">🔥 {stats.streak}</span>
          </div>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Профиль →</span>
        </div>
      </button>

      {/* ── Быстрое действие ────────────────────────────────────────────────── */}
      {dueCount > 0 && (
        <button onClick={() => onNavigateStudy("cards")}
          className={`rounded-2xl p-4 border flex items-center justify-between active:scale-[0.98] transition-all
            ${dark ? "bg-blue-900/30 border-blue-700/40" : "bg-blue-50 border-blue-200"}`}>
          <div>
            <p className={`font-semibold text-sm ${dark ? "text-blue-300" : "text-blue-700"}`}>⏰ Повторить буквы</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-blue-400" : "text-blue-500"}`}>{dueCount} карточек ждут</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${dark ? "bg-blue-800 text-blue-300" : "bg-blue-500 text-white"}`}>
            Открыть →
          </span>
        </button>
      )}

      {/* ── Путь обучения ───────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="px-4 pt-4 pb-3">
          <p className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>Путь обучения</p>
          <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>Проходи этапы последовательно</p>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          {PATH_SECTIONS.map((section, i) => {
            const prog  = progress[section.id];
            const c     = SECTION_COLORS[section.color];
            const locked = !prog.unlocked;
            const done  = prog.pct >= 100;

            return (
              <button key={section.id}
                onClick={() => !locked && onNavigateStudy(section.id)}
                disabled={locked}
                className={`flex items-center gap-3 rounded-xl p-3 transition-all text-left
                  ${locked
                    ? dark ? "opacity-40 bg-gray-700/50" : "opacity-40 bg-gray-50"
                    : "active:scale-[0.98] " + (dark ? "bg-gray-700/50 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100")
                  }`}>
                {/* Иконка / статус */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                  ${done ? c.active : locked ? (dark ? "bg-gray-600" : "bg-gray-200") : c.inactive}`}>
                  {locked ? "🔒" : done ? "✅" : section.icon}
                </div>
                {/* Текст + прогресс */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${locked ? "text-gray-400" : "text-gray-800"}`}>
                      {section.label}
                    </span>
                    <span className={`text-xs font-bold ${locked ? "text-gray-400" : c.text}`}>
                      {locked ? "🔒" : done ? "Готово" : `${prog.pct}%`}
                    </span>
                  </div>
                  {!locked && (
                    <div className={`h-1.5 rounded-full ${dark ? "bg-gray-600" : "bg-gray-200"}`}>
                      <div className={`h-full rounded-full transition-all ${c.bar}`}
                        style={{ width: `${prog.pct}%` }} />
                    </div>
                  )}
                </div>
                {/* Стрелка */}
                {!locked && (
                  <span className={`text-sm flex-shrink-0 ${dark ? "text-gray-500" : "text-gray-400"}`}>›</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Быстрая статистика ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon:"⚡", val: stats.xp,      label:"XP",    color:"text-yellow-500" },
          { icon:"🔥", val: stats.streak,  label:"Дней",  color:"text-orange-500" },
          { icon:"✅", val: completedGroups + [1,2,3,4,5].filter(n=>p.sounds?.[n]==="done").length,
                        label:"Групп",  color:"text-emerald-500" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-3 text-center border
            ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
            <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
            <div className={`text-[10px] font-medium mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Достижения ──────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="px-4 pt-4 pb-2">
          <p className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>Достижения</p>
        </div>
        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
          {[
            { icon:"🌟", name:"Старт",       done: stats.xp >= 20 },
            { icon:"🔥", name:"3 дня",       done: stats.streak >= 3 },
            { icon:"⚡", name:"100 XP",      done: stats.xp >= 100 },
            { icon:"🔤", name:"Алфавит",     done: completedGroups >= 5 },
            { icon:"📖", name:"Огласовки",   done: [1,2,3,4,5].filter(n=>stats.progress?.sounds?.[n]==="done").length >= 5 },
            { icon:"💬", name:"50 слов",     done: Object.keys(stats.wordsCorrect||{}).length >= 50 },
            { icon:"🎯", name:"Точность",    done: stats.totalAnswers > 10 && (stats.correctAnswers / stats.totalAnswers) >= 0.8 },
            { icon:"👥", name:"Друг",        done: (stats.referralsCount||0) >= 1 },
          ].map(a => (
            <div key={a.name} className={`flex flex-col items-center gap-1 p-2 rounded-xl
              ${a.done
                ? dark ? "bg-indigo-900/40" : "bg-indigo-50"
                : dark ? "bg-gray-700/40 opacity-40" : "bg-gray-50 opacity-40"}`}>
              <span className="text-xl">{a.icon}</span>
              <span className={`text-[9px] text-center leading-tight font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
