import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, ALL_LETTERS, LETTER_GROUPS } from "../data/alphabet";
import { levelProgress } from "../data/constants";
import { getGroupLetters, GROUP_COLORS } from "../helpers/groupHelpers";
import ProgressBar from "../components/ui/ProgressBar";

export default function HomeScreen({ onStart, onCards }) {
  const { dark } = useTheme();
  const { stats, getDueCards } = useStats();

  const todayPct   = Math.min(100, (stats.dailyDone / stats.dailyGoal) * 100);
  const { level, pct: lvlPct } = levelProgress(stats.xp);
  // Only letters from unlocked groups
  const UNLOCKED_LETTERS = ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== 'locked')
  );
  const dueCount = getDueCards(UNLOCKED_LETTERS).length;

  // Буквы открыты если их группа не locked
  const unlockedLetters = ALPHABET.filter(l => stats.groupProgress?.[l.group] !== 'locked');

  // Рекомендация дня
  const topWeak = Object.keys(stats.weakLetters || {})
    .sort((a,b) => (stats.weakLetters[b]||0)-(stats.weakLetters[a]||0))[0];
  const weakLetter = topWeak ? ALL_LETTERS.find(l => l.id === Number(topWeak)) : null;

  // Текущая активная группа
  const activeGroup = [...LETTER_GROUPS].reverse()
    .find(g => stats.groupProgress?.[g.id] === 'available' || stats.groupProgress?.[g.id] === 'learning');

  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">

      {/* Greeting */}
      <div className={`rounded-2xl p-5 mb-4 ${dark ? "bg-indigo-900/40 border border-indigo-700/40" : "bg-indigo-50"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Добро пожаловать!</p>
        <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Учим алфавит иврита 🇮🇱</h2>
        <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Уровень {level} · {unlockedLetters.length}/{ALPHABET.length} букв открыто
        </p>
        <div className={`mt-2 h-1.5 rounded-full ${dark?'bg-indigo-900':'bg-indigo-200'}`}>
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${lvlPct}%`}}/>
        </div>
      </div>

      {/* Recommendation */}
      {dueCount > 0 && (
        <div onClick={onCards}
          className={`rounded-2xl p-4 mb-4 border cursor-pointer active:scale-[0.98] transition-all
            ${dark ? "bg-blue-900/30 border-blue-700/40" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold text-sm ${dark?"text-blue-300":"text-blue-700"}`}>⏰ Сегодня нужно повторить</p>
              <p className={`text-xs mt-0.5 ${dark?"text-blue-400":"text-blue-500"}`}>{dueCount} букв ждут повторения</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${dark?"bg-blue-800 text-blue-300":"bg-blue-500 text-white"}`}>
              Открыть →
            </span>
          </div>
        </div>
      )}
      {weakLetter && dueCount === 0 && (
        <div className={`rounded-2xl p-4 mb-4 border ${dark?"bg-amber-900/20 border-amber-700/30":"bg-amber-50 border-amber-200"}`}>
          <p className={`font-semibold text-sm ${dark?"text-amber-300":"text-amber-700"}`}>
            💡 Поработай над буквой {weakLetter.symbol} ({weakLetter.name})
          </p>
          <p className={`text-xs mt-0.5 ${dark?"text-amber-400":"text-amber-500"}`}>
            Ты часто её путаешь — попробуй карточки
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={onStart}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-4 text-left shadow-lg active:scale-95 transition-all">
          <div className="text-2xl mb-2">📖</div>
          <div className="font-bold text-sm">Учиться</div>
          <div className="text-xs opacity-80 mt-0.5">
            {activeGroup ? activeGroup.name : 'Все группы пройдены 🏆'}
          </div>
        </button>
        <button onClick={onCards}
          className={`rounded-2xl p-4 text-left shadow-sm active:scale-95 transition-all border
            ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-800"}`}>
          <div className="text-2xl mb-2">🃏</div>
          <div className="font-bold text-sm">Карточки</div>
          <div className={`text-xs mt-0.5 ${dark?"text-gray-400":"text-gray-400"}`}>
            {dueCount > 0 ? `${dueCount} на сегодня` : 'Всё повторено ✓'}
          </div>
        </button>
      </div>

      {/* Group progress */}
      <div className={`rounded-2xl p-4 border mb-4 ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
        <p className={`font-bold text-sm mb-3 ${dark?"text-white":"text-gray-800"}`}>Прогресс по группам</p>
        <div className="flex flex-col gap-2">
          {LETTER_GROUPS.map(g => {
            const status = stats.groupProgress?.[g.id] || 'locked';
            const score  = stats.groupTestScores?.[g.id]?.score;
            const c      = GROUP_COLORS[g.color];
            return (
              <div key={g.id} className="flex items-center gap-3">
                <span className="text-base w-5 text-center">
                  {status==='completed'?'✅':status==='locked'?'🔒':'▶️'}
                </span>
                <span className={`text-sm flex-1 ${status==='locked'?(dark?'text-gray-600':'text-gray-300'):(dark?'text-white':'text-gray-700')}`}>
                  {g.name}
                </span>
                {status==='completed' && score!=null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>{score}%</span>
                )}
                {status==='available' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>активна</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alphabet grid — show unlocked letters */}
      <div className={`rounded-2xl p-4 border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
        <div className="flex justify-between items-center mb-3">
          <span className={`font-bold text-sm ${dark?"text-white":"text-gray-800"}`}>Алфавит</span>
          <span className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{unlockedLetters.length}/{ALPHABET.length} открыто</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {ALPHABET.map(l => {
            const open = stats.groupProgress?.[l.group] !== 'locked';
            return (
              <div key={l.id} aria-label={open?l.name:"Закрыто"}
                className={`aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all
                  ${open ? (dark?"bg-indigo-900/60 text-indigo-200":"bg-indigo-50 text-indigo-700")
                          : (dark?"bg-gray-700 text-gray-600":"bg-gray-100 text-gray-300")}`}
                style={{fontFamily:'serif'}}>
                {open ? l.symbol : "🔒"}
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak */}
      <div className={`mt-4 rounded-2xl p-4 flex items-center gap-3 border
        ${dark?"bg-orange-900/30 border-orange-700/30":"bg-orange-50 border-orange-100"}`}>
        <span className="text-3xl">🔥</span>
        <div>
          <p className={`font-bold ${dark?"text-orange-300":"text-orange-700"}`}>{stats.streak} дней подряд!</p>
          <p className={`text-xs ${dark?"text-orange-400":"text-orange-500"}`}>Занимайтесь каждый день</p>
        </div>
      </div>
    </div>
  );
}
