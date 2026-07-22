import { useRef, useState } from "react";
import HebrewKeyboard from "./HebrewKeyboard";

/**
 * ExerciseSession — единый рендерер сессии вопросов ДВИЖКА УПРАЖНЕНИЙ.
 *
 * Принимает готовые Question[] (см. helpers/exercises.js) и НЕ содержит ни
 * одного правила генерации — только рендер и сбор ответов. Новый тип задания =
 * новый генератор в реестре; этот компонент не меняется (кроме новых mode).
 *
 * props:
 *   questions  — Question[] из buildSession/buildQuestion
 *   dark       — тема
 *   onAnswer?  — (itemId, ok) после каждого ответа (для facts; itemId может быть null)
 *   onFinish   — (score0to100, correctCount, total) в конце
 *   onBack     — выход
 *   accent?    — { grad, fill } tailwind-классы градиента/заливки (по умолчанию indigo)
 *   title?     — подпись сессии
 */
const HEB_FONT = { fontFamily: "'Frank Ruhl Libre','Arial Hebrew','David',serif" };

function speakText(he) {
  try {
    const u = new SpeechSynthesisUtterance(he);
    u.lang = "he-IL"; u.rate = 0.85;
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(u);
  } catch { /* ignore */ }
}

export default function ExerciseSession({
  questions, dark, onAnswer, onFinish, onBack,
  accent = { grad: "from-indigo-500 to-violet-500", fill: "bg-indigo-500" },
  title = "Тренировка",
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);   // choice: id выбранного
  const [typed, setTyped] = useState("");       // typing: набранное
  const [typedOk, setTypedOk] = useState(null); // typing: результат проверки
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const reported = useRef(false);

  const total = questions.length;
  const q = questions[idx];

  if (!total) return (
    <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
      <div className="text-5xl mb-3">🤷</div>
      <p className={`mb-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>Пока нет материала для тренировки.</p>
      <button onClick={onBack} className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${accent.grad}`}>Назад</button>
    </div>
  );

  if (finished) {
    const pct = Math.round((correct / total) * 100);
    if (!reported.current) { reported.current = true; onFinish?.(pct, correct, total); }
    return (
      <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-5xl mb-3">{pct >= 80 ? "🎉" : "💪"}</div>
        <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>{pct >= 80 ? "Отлично!" : "Продолжай!"}</h2>
        <p className={`text-4xl font-black mb-1 ${dark ? "text-indigo-400" : "text-indigo-600"}`}>{pct}%</p>
        <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>{correct}/{total} правильных</p>
        <button onClick={onBack} className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${accent.grad}`}>Назад</button>
      </div>
    );
  }

  const answered = q.mode === "typing" ? typedOk !== null : picked !== null;

  function next() {
    setPicked(null); setTyped(""); setTypedOk(null);
    if (idx + 1 >= total) setFinished(true);
    else setIdx(i => i + 1);
  }

  function pick(optId) {
    if (answered) return;
    setPicked(optId);
    const ok = optId === q.answerId;
    if (ok) setCorrect(n => n + 1);
    onAnswer?.(q.itemId ?? null, ok);
  }

  function submitTyped() {
    if (answered || !typed) return;
    const norm = s => s.replace(/[\u0591-\u05C7\s]/g, "");
    const ok = norm(typed) === norm(q.answerId);
    setTypedOk(ok);
    if (ok) setCorrect(n => n + 1);
    onAnswer?.(q.itemId ?? null, ok);
  }

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>← Назад</button>
        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{title} · {idx + 1}/{total}</span>
        <span className={`text-sm font-bold ${dark ? "text-yellow-400" : "text-yellow-600"}`}>⚡{correct}</span>
      </div>
      <div className={`h-1.5 rounded-full mb-5 ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
        <div className={`h-full rounded-full ${accent.fill} transition-all`} style={{ width: `${Math.round(((idx + 1) / total) * 100)}%` }} />
      </div>

      <p className={`text-base font-semibold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>{q.prompt}</p>

      {q.hebrew && (
        <div className="flex items-center justify-center gap-3 mb-5">
          <p className="text-4xl font-bold text-center" dir="rtl" style={HEB_FONT}>{q.hebrew}</p>
          {q.speak && (
            <button onClick={() => speakText(q.speak)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${dark ? "bg-gray-800" : "bg-gray-100"}`}>🔊</button>
          )}
        </div>
      )}
      {!q.hebrew && q.speak && (
        <div className="flex justify-center mb-4">
          <button onClick={() => speakText(q.speak)}
            className={`px-4 h-10 rounded-full flex items-center gap-2 text-sm font-medium ${dark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
            🔊 Послушать
          </button>
        </div>
      )}

      {q.mode === "choice" && (
        <div className="flex flex-col gap-2.5">
          {q.options.map(opt => {
            const isPicked = picked === opt.id;
            const isRight = opt.id === q.answerId;
            let cls = dark ? "border-gray-700 bg-gray-800 text-gray-200" : "border-gray-200 bg-white text-gray-800";
            let mark = null;
            if (answered && isRight) { cls = "border-emerald-400 bg-emerald-50 text-emerald-800"; mark = "✓"; }
            else if (answered && isPicked) { cls = "border-rose-400 bg-rose-50 text-rose-800"; mark = "✗"; }
            return (
              <button key={opt.id} disabled={answered} onClick={() => pick(opt.id)}
                className={`rounded-xl border-2 p-4 min-h-[52px] flex items-center justify-between gap-3 text-left transition-all ${cls}`}
                dir="auto">
                <span className="flex-1 text-[15px] font-medium" style={opt.labelHe ? { ...HEB_FONT, fontSize: 20 } : undefined}
                  dir={opt.labelHe ? "rtl" : "auto"}>{opt.label}</span>
                {mark && <span className="text-lg font-bold flex-shrink-0">{mark}</span>}
              </button>
            );
          })}
        </div>
      )}

      {q.mode === "typing" && (
        <div>
          <div className={`min-h-[56px] rounded-xl border-2 p-4 mb-3 text-2xl text-right ${
            typedOk === null ? (dark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-900")
            : typedOk ? "border-emerald-400 bg-emerald-50 text-emerald-800"
            : "border-rose-400 bg-rose-50 text-rose-800"}`}
            dir="rtl" style={HEB_FONT}>
            {typed || <span className={`text-base ${dark ? "text-gray-500" : "text-gray-400"}`}>הקלד כאן…</span>}
          </div>
          {typedOk === false && (
            <p className={`text-sm mb-2 ${dark ? "text-gray-300" : "text-gray-600"}`}>
              Правильно: <span className="text-xl font-bold" dir="rtl" style={HEB_FONT}>{q.answerId}</span>
            </p>
          )}
          <HebrewKeyboard
            disabled={answered}
            onKey={sym => setTyped(t => t + sym)}
            onDelete={() => setTyped(t => t.slice(0, -1))}
            onSubmit={submitTyped}
          />
        </div>
      )}

      {answered && (
        <button onClick={next}
          className={`mt-5 w-full py-3.5 rounded-xl text-white font-bold bg-gradient-to-r ${accent.grad} active:scale-[0.98]`}>
          {idx + 1 >= total ? "Результат →" : "Дальше →"}
        </button>
      )}
    </div>
  );
}
