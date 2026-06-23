import { useTheme } from "../../context/ThemeContext";
import { useStats } from "../../context/StatsContext";
import { levelProgress } from "../../data/constants";

export default function TopBar({ onToggleTheme }) {
  const { dark } = useTheme();
  const { stats } = useStats();

  const { level, pct: lvlPct } = levelProgress(stats.xp);

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40
      ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      <div className="flex items-center gap-2">
        <span className="text-yellow-500 font-bold text-sm">⚡ {stats.xp} XP</span>
        <div className={`w-20 h-1.5 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${lvlPct}%` }} />
        </div>
        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Ур. {level}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-orange-500 font-bold text-sm">🔥 {stats.streak}</span>
        <span className="text-yellow-600 font-bold text-sm">💰 {stats.coins}</span>
        <button
          onClick={onToggleTheme}
          aria-label={dark ? "Светлая тема" : "Тёмная тема"}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-base
            ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  );
}
