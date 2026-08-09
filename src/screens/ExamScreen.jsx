/**
 * ExamScreen — сводный экзамен подгруппы (или всего алфавита) пути.
 *
 * Не новый контент: вопросы собираются из уже авторского материала —
 *  - грамматические уроки (id вида 'C0'/'M1.2'/…) → их practiceItems через
 *    choice4, как в LessonScreen;
 *  - буквы/огласовки (id вида 'L1.x'/'N1.x' в examNode.sourceLessons) →
 *    адаптер {he:symbol, ru:name} через word_ru/word_he ("буква→название" и
 *    обратно) — тот же движок упражнений, просто другой генератор.
 * Смешивать слои безопасно: buildSession принимает несколько layer'ов и сам
 * шафлит итог. Рендер сессии — общий ExerciseSession (тот же, что у Decks/
 * ReadingScreen), не дублируем практику/тайпинг/озвучку заново.
 * Результат пишется completeLesson(examNode.id, score) — та же функция,
 * что и для обычного урока (она агностична к типу узла).
 */
import { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { buildSession } from "../helpers/exercises";
import { GRAMMAR_LESSONS_BY_ID } from "../data/grammarLessons";
import { ALL_LETTERS, LETTER_GROUPS, NIKUD } from "../data/alphabet";
import ExerciseSession from "../components/ui/ExerciseSession";

const MAX_QUESTIONS = 10;
const ACCENT = { grad: "from-amber-500 to-orange-600", fill: "bg-amber-500" };

/** examNode.sourceLessons → сессия вопросов, автоматически смешивая типы источников. */
function buildExamQuestions(examNode) {
  const ids = examNode.sourceLessons || [];
  const layers = [];

  const grammarItems = ids
    .map(id => GRAMMAR_LESSONS_BY_ID[id])
    .filter(Boolean)
    .flatMap(l => l.practiceItems || []);
  if (grammarItems.length) layers.push({ gen: 'choice4', sources: grammarItems, take: Math.min(6, grammarItems.length) });

  const letterGroupNums = ids.filter(id => id.startsWith('L1.')).map(id => Number(id.split('.')[1]));
  if (letterGroupNums.length) {
    const letterIds = LETTER_GROUPS.filter(g => letterGroupNums.includes(g.id)).flatMap(g => g.letterIds);
    const asWords = ALL_LETTERS.filter(l => letterIds.includes(l.id)).map(l => ({ id: 'l:' + l.id, he: l.symbol, ru: l.name }));
    if (asWords.length) {
      layers.push({ gen: 'word_ru', sources: asWords, pool: asWords, take: Math.min(4, asWords.length) });
      layers.push({ gen: 'word_he', sources: asWords, pool: asWords, take: Math.min(3, asWords.length) });
    }
  }

  const soundGroupNums = ids.filter(id => id.startsWith('N1.')).map(id => Number(id.split('.')[1]));
  if (soundGroupNums.length) {
    const asWords = NIKUD.filter(v => soundGroupNums.includes(v.groupId)).map(v => ({ id: 'v:' + v.id, he: v.symbol, ru: v.name }));
    if (asWords.length) layers.push({ gen: 'word_ru', sources: asWords, pool: asWords, take: Math.min(4, asWords.length) });
  }

  return buildSession(layers).slice(0, MAX_QUESTIONS);
}

export default function ExamScreen({ examNode, onBack }) {
  const { dark } = useTheme();
  const { completeLesson } = useStats();
  const [started, setStarted] = useState(false);

  const threshold = examNode.done?.threshold ?? 80;
  const topicCount = examNode.sourceLessons?.length || 0;
  // Вопросы фиксируются на маунт экрана: пересдать — значит выйти и открыть
  // экзамен заново (кнопка на карточке пути доступна сразу же, без задержки),
  // тогда вопросы соберутся заново со свежим шафлом.
  const questions = useMemo(
    () => buildExamQuestions(examNode),
    [examNode.id] // eslint-disable-line
  );

  const header = (
    <div className="flex items-center gap-3 mb-3">
      <button onClick={onBack} aria-label="Назад"
        className={`text-2xl leading-none ${dark ? "text-gray-400" : "text-gray-500"}`}>‹</button>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wide font-bold ${dark ? "text-amber-400" : "text-amber-600"}`}>
          🏁 Экзамен подгруппы
        </p>
        <h2 className={`font-bold text-base leading-snug ${dark ? "text-white" : "text-gray-900"}`}>{examNode.examTitle}</h2>
      </div>
    </div>
  );

  if (!started) {
    return (
      <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
        {header}
        <div className={`rounded-2xl border p-5 text-center mt-6
          ${dark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
          <div className="text-4xl mb-3">🏁</div>
          <p className={`text-sm mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            {questions.length} вопросов по материалу подгруппы ({topicCount} {topicCount === 1 ? "теме" : "темам"})
          </p>
          <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Нужно набрать ≥{threshold}%, чтобы открыть следующую подгруппу</p>
        </div>
        <button onClick={() => setStarted(true)}
          className={`mt-5 w-full rounded-xl text-white bg-gradient-to-r ${ACCENT.grad} active:scale-[0.98] py-3.5 text-base font-bold`}>
          Начать →
        </button>
      </div>
    );
  }

  return (
    <ExerciseSession
      questions={questions}
      dark={dark}
      title={examNode.examTitle}
      accent={ACCENT}
      onFinish={(pct) => completeLesson(examNode.id, pct)}
      onBack={onBack}
    />
  );
}
