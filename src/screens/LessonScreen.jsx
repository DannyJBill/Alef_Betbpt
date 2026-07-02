/**
 * LessonScreen — универсальный шаблон грамматического урока.
 *
 * Принимает объект урока РОВНО в форме GRAMMAR_LESSONS[i] (схема мастерской,
 * см. grammarLessons.js) — не менять схему, чтобы переносы оставались copy-paste.
 *
 * Сцены: rule → examples → dialogue (если есть) → practice (если есть) → result
 *  - practiceItems пустой → урок завершается после примеров без теста (score=null)
 *  - threshold null → нет числового порога, урок засчитывается по завершении
 *  - dialogueCards есть → отдельная сцена диалоговых карточек перед практикой
 */
import { READING_BLOCKS, getBlockCards } from "../data/reading";
import { getKnownLetters, filterReadable } from "../helpers/vocab";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { shuffle } from "../helpers/utils";

const MODULE_COLORS = {
  syntax:     { grad: "from-violet-500 to-purple-600",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  fill: "bg-violet-500" },
  morphology: { grad: "from-teal-500 to-emerald-600",   text: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200",    fill: "bg-teal-500" },
  verb:       { grad: "from-orange-500 to-amber-600",   text: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200",  fill: "bg-orange-500" },
  numbers:    { grad: "from-sky-500 to-blue-600",       text: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",     fill: "bg-sky-500" },
};

export default function LessonScreen({ lesson, onBack, onOpenReading }) {
  const { dark } = useTheme();
  const { completeLesson, stats } = useStats();
  const c = MODULE_COLORS[lesson.module] || MODULE_COLORS.syntax;

  const hasExamples = lesson.examples?.length > 0;
  const hasDialogue = lesson.dialogueCards?.length > 0;
  const hasPractice = lesson.practiceItems?.length > 0;

  // rule → examples → dialogue → practice → result
  const scenes = useMemo(() => {
    const s = ["rule"];
    if (hasExamples) s.push("examples");
    if (hasDialogue) s.push("dialogue");
    if (hasPractice) s.push("practice");
    s.push("result");
    return s;
  }, [hasExamples, hasDialogue, hasPractice]);

  const [sceneIdx, setSceneIdx] = useState(0);
  const [exIdx, setExIdx] = useState(0);
  const [dlgIdx, setDlgIdx] = useState(0);
  const [dlgFlipped, setDlgFlipped] = useState(false);

  // практика
  const questions = useMemo(
    () => (hasPractice ? shuffle([...lesson.practiceItems]) : []),
    [lesson.id] // eslint-disable-line
  );
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const scene = scenes[sceneIdx];

  function next() {
    const ni = sceneIdx + 1;
    if (scenes[ni] === "result") finish();
    setSceneIdx(ni);
  }

  function finish(scorePct) {
    // без практики — score=null (урок без теста)
    const score = hasPractice ? scorePct : null;
    if (!finished) {
      completeLesson(lesson.id, score);
      setFinished(true);
    }
  }

  const header = (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={onBack} className={`text-xl ${dark ? "text-gray-400" : "text-gray-500"}`}>‹</button>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wide ${dark ? "text-gray-500" : "text-gray-400"}`}>
          {lesson.moduleName} · {lesson.id}
        </p>
        <h2 className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{lesson.title}</h2>
      </div>
    </div>
  );

  // ── Сцена: правило ──────────────────────────────────────────────────────────
  if (scene === "rule") return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      {header}
      <div className={`rounded-2xl p-5 border ${c.bg} ${c.border}`}>
        <p className="text-2xl mb-3">💡</p>
        <p className="text-sm leading-relaxed text-gray-800" style={{ whiteSpace: "pre-line" }}>{lesson.rule}</p>
      </div>
      {lesson.notes && (
        <p className={`text-xs mt-3 px-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>📝 {lesson.notes}</p>
      )}
      <button onClick={next}
        className={`mt-5 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${c.grad} active:scale-[0.98]`}>
        {hasExamples ? "К примерам →" : hasPractice ? "К практике →" : "Понятно ✓"}
      </button>
    </div>
  );

  // ── Сцена: примеры ──────────────────────────────────────────────────────────
  if (scene === "examples") {
    const ex = lesson.examples[exIdx];
    const last = exIdx === lesson.examples.length - 1;
    return (
      <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
        {header}
        <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Пример {exIdx + 1} из {lesson.examples.length}
        </p>
        <div className={`rounded-2xl p-6 border text-center ${c.bg} ${c.border}`}>
          <p className="text-3xl font-bold mb-3 text-gray-900" dir="rtl" style={{ fontFamily: "'Noto Sans Hebrew', sans-serif" }}>
            {ex.hebrew}
          </p>
          <p className={`text-sm font-semibold mb-2 ${c.text}`}>{ex.translit}</p>
          <p className="text-sm text-gray-600">{ex.ru}</p>
          {ex.isNew && <span className="inline-block mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">новое слово</span>}
        </div>
        <div className="flex gap-2 mt-5">
          {exIdx > 0 && (
            <button onClick={() => setExIdx(i => i - 1)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
              ← Назад
            </button>
          )}
          <button onClick={() => (last ? next() : setExIdx(i => i + 1))}
            className={`flex-[2] py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${c.grad} active:scale-[0.98]`}>
            {last ? (hasDialogue ? "К диалогам →" : hasPractice ? "К практике →" : "Завершить ✓") : "Дальше →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Сцена: диалоговые карточки ──────────────────────────────────────────────
  if (scene === "dialogue") {
    const d = lesson.dialogueCards[dlgIdx];
    const last = dlgIdx === lesson.dialogueCards.length - 1;
    return (
      <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
        {header}
        <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Диалог {dlgIdx + 1} из {lesson.dialogueCards.length} · нажми чтобы увидеть ответ
        </p>
        <button onClick={() => setDlgFlipped(f => !f)}
          className={`w-full rounded-2xl p-6 border text-center ${c.bg} ${c.border} active:scale-[0.99]`}>
          {!dlgFlipped ? (
            <>
              <p className="text-2xl font-bold mb-2 text-gray-900" dir="rtl">{d.question}</p>
              <p className="text-sm text-gray-600">{d.questionRu}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold mb-2 text-gray-900" dir="rtl">{d.answer}</p>
              <p className="text-sm text-gray-600">{d.answerRu}</p>
            </>
          )}
        </button>
        <button onClick={() => { setDlgFlipped(false); last ? next() : setDlgIdx(i => i + 1); }}
          className={`mt-5 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${c.grad} active:scale-[0.98]`}>
          {last ? (hasPractice ? "К практике →" : "Завершить ✓") : "Следующий →"}
        </button>
      </div>
    );
  }

  // ── Сцена: практика ─────────────────────────────────────────────────────────
  if (scene === "practice") {
    const q = questions[qIdx];
    const lastQ = qIdx === questions.length - 1;
    const answered = picked !== null;
    return (
      <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
        {header}
        <div className={`h-1.5 rounded-full mb-4 ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
          <div className={`h-full rounded-full transition-all ${c.fill}`} style={{ width: `${(qIdx / questions.length) * 100}%` }} />
        </div>
        <p className={`text-sm font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>{q.prompt}</p>
        <div className="flex flex-col gap-2">
          {q.options.map(opt => {
            const isPicked = picked === opt;
            const isRight = opt === q.answer;
            let cls = dark ? "border-gray-700 bg-gray-800 text-gray-200" : "border-gray-200 bg-white text-gray-800";
            if (answered && isRight) cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
            else if (answered && isPicked) cls = "border-rose-400 bg-rose-50 text-rose-800";
            return (
              <button key={opt} disabled={answered}
                onClick={() => { setPicked(opt); if (opt === q.answer) setCorrect(n => n + 1); }}
                className={`rounded-xl border p-3 text-sm text-left transition-all ${cls}`} dir="auto">
                {opt}
              </button>
            );
          })}
        </div>
        {answered && (
          <button onClick={() => {
              if (lastQ) {
                const score = Math.round(((correct) / questions.length) * 100);
                finish(score);
                setSceneIdx(scenes.length - 1);
              } else { setQIdx(i => i + 1); setPicked(null); }
            }}
            className={`mt-5 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${c.grad} active:scale-[0.98]`}>
            {lastQ ? "Результат →" : "Дальше →"}
          </button>
        )}
      </div>
    );
  }

  // ── Сцена: результат ────────────────────────────────────────────────────────
  const score = hasPractice ? Math.round((correct / questions.length) * 100) : null;
  const passed = lesson.threshold == null || score == null || score >= lesson.threshold;
  return (
    <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
      <div className="text-5xl mb-4">{passed ? "🎉" : "💪"}</div>
      <h2 className={`text-xl font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
        {passed ? "Урок пройден!" : "Почти получилось"}
      </h2>
      {score != null && (
        <p className={`text-sm mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Результат: {score}%{lesson.threshold != null ? ` · нужно ≥${lesson.threshold}%` : ""}
        </p>
      )}
      {(() => {
        // Порция новых слов этого урока — прямой переход в словарь
        if (!passed || !onOpenReading) return null;
        const block = READING_BLOCKS.find(b => b.lesson === lesson.id);
        if (!block) return null;
        const known = getKnownLetters(stats.progress?.letters, ALPHABET, LETTER_GROUPS);
        const fresh = filterReadable(getBlockCards(block), known)
          .filter(i => !(stats.readingProgress?.studied || []).includes(i.id));
        if (fresh.length === 0) return null;
        return (
          <button onClick={() => onOpenReading(block.id)}
            className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
            📖 Изучить {fresh.length} новых слов →
          </button>
        );
      })()}
      <button onClick={onBack}
        className={`mt-4 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${c.grad}`}>
        {passed ? "К урокам →" : "Вернуться"}
      </button>
    </div>
  );
}
