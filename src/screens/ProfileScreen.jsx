import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { levelProgress } from "../data/constants";
import ProgressBar from "../components/ui/ProgressBar";

export default function ProfileScreen() {
  const { dark } = useTheme();
  const { stats } = useStats();

  const { level, pct: levelPct, xpToNext } = levelProgress(stats.xp);

  const achievements = [
    { icon: "🌟", name: "Первая буква",  done: stats.xp >= 20 },
    { icon: "📚", name: "5 уроков",      done: stats.dailyDone >= 5 },
    { icon: "🔥", name: "3 дня подряд",  done: stats.streak >= 3 },
    { icon: "⚡", name: "100 XP",        done: stats.xp >= 100 },
    { icon: "🎯", name: "Точность 80%",  done: false },
    { icon: "🏆", name: "Весь алфавит",  done: false },
  ];

  const statCards = [
    { icon: "⚡", val: stats.xp,              label: "XP" },
    { icon: "🔥", val: stats.streak,           label: "Дней" },
    { icon: "💰", val: stats.coins,            label: "Монет" },
    { icon: "📖", val: stats.dailyDone,        label: "Уроков" },
    { icon: "⏱️", val: `${stats.totalTime}м`, label: "Времени" },
  ];

  return (
    <div className="pb-20 px-4 pt-6 max-w-md mx-auto">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-3xl mb-3">
          😊
        </div>
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Мой профиль</h2>
        <div className={`text-sm mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>Уровень {level}</div>
        <div className="w-40 mb-1">
          <ProgressBar pct={levelPct} color="bg-indigo-500" height="h-2" />
        </div>
        <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
          {xpToNext} XP до следующего уровня
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-2xl p-3 text-center ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
            <div className="text-xl">{s.icon}</div>
            <div className={`font-bold text-lg ${dark ? "text-white" : "text-gray-900"}`}>{s.val}</div>
            <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className={`rounded-2xl p-4 border shadow-sm ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <p className={`font-bold text-sm mb-3 ${dark ? "text-white" : "text-gray-800"}`}>Достижения</p>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a, i) => (
            <div key={i} className={`flex flex-col items-center p-2 rounded-xl text-center transition-all
              ${a.done
                ? dark ? "bg-indigo-900/50" : "bg-indigo-50"
                : `opacity-40 ${dark ? "bg-gray-700/50" : "bg-gray-50"}`
              }`}>
              <span className="text-2xl">{a.icon}</span>
              <span className={`text-[10px] mt-1 ${dark ? "text-gray-300" : "text-gray-600"}`}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
