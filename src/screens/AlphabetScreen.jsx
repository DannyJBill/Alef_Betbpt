/**
 * AlphabetScreen — вкладка 🔤
 * Хаб для: Учиться / Карточки / Игра
 * Показывает список активностей, при выборе рендерит экран поверх
 */
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALL_LETTERS } from "../data/alphabet";
import LearnScreen  from "./LearnScreen";
import CardsScreen  from "./CardsScreen";

export default function AlphabetScreen({ activeMode, setActiveMode, onBack }) {
  const { dark } = useTheme();
  const { stats, getDueCards } = useStats();
  const active = activeMode;
  const setActive = setActiveMode;

  // Если выбрана активность — показать её с кнопкой «Назад»
  if (active) return (
    <div>
      {/* Back bar */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <button onClick={() => setActive(null)}
          className={`text-sm font-semibold flex items-center gap-1.5 ${dark ? "text-indigo-400" : "text-indigo-600"}`}>
          ← Назад
        </button>
        <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-800"}`}>
          {{ learn: "Учиться", cards: "Карточки", game: "Игра" }[active]}
        </span>
      </div>
      {active === "learn"  && <LearnScreen />}
      {active === "cards"  && <CardsScreen />}
    </div>
  );

  // Метрики для карточек активностей
  const completedGroups = Object.values(stats.progress?.letters || {}).filter(v => v === "done").length;
  const activeGroup = [1,2,3,4,5].find(id => stats.progress?.letters?.[id] === "available");

  const UNLOCKED = ALL_LETTERS.filter(l =>
    [1,2,3,4,5].find(gid =>
      [1,2,3,4,5].includes(gid) &&
      stats.progress?.letters?.[gid] !== "locked"
    )
  );
  const dueCount = getDueCards(ALL_LETTERS.filter(l =>
    Object.entries(stats.progress?.letters || {}).some(([gid, v]) =>
      v !== "locked" && [1,2,3,4,5].map(Number).includes(Number(gid))
    )
  )).length;

  const activities = [
    {
      id: "learn",
      icon: "📚",
      title: "Учиться",
      desc: activeGroup
        ? `Группа ${activeGroup} · Уроки по группам с тестом`
        : completedGroups >= 5
          ? "Все группы пройдены 🏆"
          : "Начни с первой группы",
      badge: activeGroup ? `Группа ${activeGroup}` : null,
      badgeColor: "bg-indigo-500",
      cta: "Начать урок →",
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      id: "cards",
      icon: "🃏",
      title: "Карточки",
      desc: dueCount > 0
        ? `${dueCount} букв на повторение сегодня`
        : "Все карточки повторены ✓",
      badge: dueCount > 0 ? `${dueCount} сегодня` : null,
      badgeColor: "bg-emerald-500",
      cta: "Открыть карточки →",
      gradient: "from-emerald-500 to-teal-600",
    },

  ];

  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">
      {onBack && (
        <button onClick={onBack} className={`flex items-center gap-1 mb-3 text-sm font-medium ${dark ? "text-indigo-400" : "text-indigo-600"}`}>
          ← Учиться
        </button>
      )}
      <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Алфавит</h2>
      <p className={`text-sm mb-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        {completedGroups}/5 групп пройдено
      </p>

      <div className="flex flex-col gap-3">
        {activities.map(a => (
          <button key={a.id} onClick={() => setActive(a.id)}
            className={`w-full text-left rounded-2xl p-5 bg-gradient-to-r ${a.gradient} text-white shadow-lg active:scale-[0.98] transition-all`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-lg font-bold">{a.title}</span>
              </div>
              {a.badge && (
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                  {a.badge}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90 mb-3">{a.desc}</p>
            <span className="text-sm font-semibold opacity-80">{a.cta}</span>
          </button>
        ))}
      </div>

      {/* Progress summary */}
      <div className={`mt-5 rounded-2xl p-4 border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Прогресс по группам
        </p>
        {[
          { id:1, name:"Первые шаги",    color:"bg-emerald-500" },
          { id:2, name:"Звуки и формы",  color:"bg-blue-500" },
          { id:3, name:"Похожие буквы",  color:"bg-amber-500" },
          { id:4, name:"Редкие буквы",   color:"bg-rose-500" },
          { id:5, name:"Финальные формы",color:"bg-purple-500" },
        ].map(g => {
          const status = stats.progress?.letters?.[g.id] || "locked";
          const score  = stats.groupTestScores?.[g.id]?.score;
          return (
            <div key={g.id} className="flex items-center gap-3 py-1.5">
              <span className="text-sm w-4">
                {status === "done" ? "✅" : status === "locked" ? "🔒" : "▶️"}
              </span>
              <span className={`text-sm flex-1 ${status === "locked" ? dark ? "text-gray-600" : "text-gray-300" : dark ? "text-gray-200" : "text-gray-700"}`}>
                {g.name}
              </span>
              {status === "done" && score != null && (
                <span className={`text-xs font-bold ${dark ? "text-gray-400" : "text-gray-500"}`}>{score}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
