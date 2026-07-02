/**
 * GrammarScreen — 🧩 Грамматика (хаб уроков уровня 1+)
 *
 * Список уроков из grammarLessons.js со статусами locked/available/done.
 * Разблокировка — data/curriculum.js (единый граф курса), прохождение — LessonScreen.
 */
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { GRAMMAR_LESSONS } from "../data/grammarLessons";
import { getLessonStatus } from "../helpers/progressHelpers";
import LessonScreen from "./LessonScreen";

const MODULE_META = {
  syntax:     { icon: "🧩", grad: "from-violet-500 to-purple-600" },
  morphology: { icon: "🔡", grad: "from-teal-500 to-emerald-600" },
  verb:       { icon: "🏃", grad: "from-orange-500 to-amber-600" },
  numbers:    { icon: "🔢", grad: "from-sky-500 to-blue-600" },
};

export default function GrammarScreen({ onBack, onOpenReading }) {
  const { dark } = useTheme();
  const { stats } = useStats();
  const [activeLesson, setActiveLesson] = useState(null);

  if (activeLesson) {
    return <LessonScreen lesson={activeLesson} onBack={() => setActiveLesson(null)} onOpenReading={onOpenReading} />;
  }

  // Уроки в порядке seq (сквозная последовательность курса)
  const lessons = [...GRAMMAR_LESSONS].sort((a, b) => a.seq - b.seq).map(l => ({
    lesson: l,
    status: getLessonStatus(l.id, stats),
  }));
  const doneCount = lessons.filter(x => x.status === "done").length;

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack} className={`text-xl ${dark ? "text-gray-400" : "text-gray-500"}`}>‹</button>
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Грамматика</h2>
      </div>
      <p className={`text-xs mb-4 ml-8 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Уровень 1 · {doneCount}/{lessons.length} уроков
      </p>

      <div className="flex flex-col gap-3">
        {lessons.map(({ lesson, status }) => {
          const m = MODULE_META[lesson.module] || MODULE_META.syntax;
          const locked = status === "locked";
          const done = status === "done";
          return (
            <button key={lesson.id} disabled={locked}
              onClick={() => setActiveLesson(lesson)}
              className={`rounded-2xl p-4 border text-left w-full transition-all
                ${locked
                  ? dark ? "opacity-40 bg-gray-800 border-gray-700" : "opacity-40 bg-gray-50 border-gray-200"
                  : dark ? "bg-gray-800 border-gray-700 active:scale-[0.98]" : "bg-white border-gray-200 active:scale-[0.98]"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center text-xl flex-shrink-0 ${locked ? "opacity-50 grayscale" : ""}`}>
                  {locked ? "🔒" : done ? "✅" : m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-wide ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {lesson.moduleName} · {lesson.id}
                    </span>
                    {done && stats.scores?.[lesson.id] != null && (
                      <span className="text-xs font-bold text-emerald-500">{stats.scores[lesson.id]}%</span>
                    )}
                  </div>
                  <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{lesson.title}</p>
                  <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {locked ? `Откроется: ${lesson.unlockCondition}` : lesson.generatesReading ? "📖 откроет блок чтения" : " "}
                  </p>
                </div>
                {!locked && <span className="text-lg flex-shrink-0 text-gray-400">›</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
