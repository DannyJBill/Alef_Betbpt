/**
 * LessonScreen — универсальный шаблон грамматического урока.
 *
 * Принимает объект урока РОВНО в форме GRAMMAR_LESSONS[i] (схема мастерской,
 * см. grammarLessons.js) — схема НЕ меняется, переносы остаются copy-paste.
 *
 * Сцены: rule → examples → dialogue (если есть) → practice (если есть) → result
 *  - practiceItems пустой → урок завершается после примеров без теста (score=null)
 *  - threshold null → нет числового порога, урок засчитывается по завершении
 *  - dialogueCards есть → отдельная сцена диалоговых карточек перед практикой
 *
 * ── Читаемость (v2) ─────────────────────────────────────────────────────────
 * Текст `rule` (и `prompt` практики) прогоняется через <RichText>, который
 * понимает лёгкую разметку прямо в строке:
 *   • пустая строка (\n\n)        → абзац
 *   • **термин**                  → акцент (полужирный)
 *   • строка "> ..."              → callout «💡 суть» (цвет модуля)
 *   • строка "- ..." / "• ..."    → пункт списка
 *   • иврит [\u0590-\u05FF]        → авто-подсветка + dir="rtl", РАЗМЕЧАТЬ НЕ НАДО
 * Старый плоский контент рендерится как абзацы с бо́льшим кеглем — улучшается
 * сразу, без переписывания. Типографика собрана в TYPO (менять в одном месте).
 */
import { READING_BLOCKS, getBlockCards } from "../data/reading";
import { getKnownLetters, filterReadable } from "../helpers/vocab";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { shuffle } from "../helpers/utils";

const MODULE_COLORS = {
  syntax:     { grad: "from-violet-500 to-purple-600", text: "text-violet-700", soft: "bg-violet-50", border: "border-violet-200", bar: "bg-violet-500", fill: "bg-violet-500" },
  morphology: { grad: "from-teal-500 to-emerald-600",  text: "text-teal-700",   soft: "bg-teal-50",   border: "border-teal-200",   bar: "bg-teal-500",   fill: "bg-teal-500" },
  verb:       { grad: "from-orange-500 to-amber-600",  text: "text-orange-700", soft: "bg-orange-50", border: "border-orange-200", bar: "bg-orange-500", fill: "bg-orange-500" },
  numbers:    { grad: "from-sky-500 to-blue-600",      text: "text-sky-700",    soft: "bg-sky-50",    border: "border-sky-200",    bar: "bg-sky-500",    fill: "bg-sky-500" },
};

// Вся типографика контента — одно место. Меняешь тут → меняется во всех уроках.
const TYPO = {
  ruleText:    "text-[17px] leading-[1.75]",   // основной текст правила
  ruleH1:      "text-xl font-bold leading-snug",
  hebrewBig:   "text-4xl",                      // слово-цель в примерах
  translit:    "text-base font-semibold",
  ru:          "text-[15px]",
  prompt:      "text-[17px] leading-snug font-semibold",
  option:      "text-base",
  btn:         "py-3.5 text-base font-bold",
};

const HE = /[\u0590-\u05FF]/;
const HEB_FONT = { fontFamily: "'Noto Sans Hebrew', sans-serif" };

// Озвучка TTS-файла из /public/reading. Кнопка появляется только если у записи есть audio.
function playAudio(file) {
  if (!file) return;
  new Audio(`/reading/${file}`).play().catch(() => {});
}
function SpeakBtn({ file, className = "" }) {
  if (!file) return null;
  return (
    <button onClick={e => { e.stopPropagation(); playAudio(file); }}
      aria-label="Озвучить" className={`active:scale-95 ${className}`}>🔊</button>
  );
}

// Иконка callout по лейблу. "> важно: ..." → ⚠️ важно. Дефолт — 💡 суть.
const LABEL_ICON = { "суть": "💡", "важно": "⚠️", "внимание": "⚠️", "запомни": "📌", "пример": "📝", "совет": "💬", "исключение": "❗" };

// ── Инлайн: подсветка иврита + **жирный** ─────────────────────────────────────
function renderSegment(text, c, keyBase) {
  const tokens = text.split(/(\s+)/);
  const nodes = [];
  let buf = [];
  const flushHe = () => {
    if (!buf.length) return;
    nodes.push(
      <span key={`${keyBase}-h${nodes.length}`} dir="rtl"
        className={`font-semibold ${c.text}`} style={{ ...HEB_FONT, fontSize: "1.08em" }}>
        {buf.join("")}
      </span>
    );
    buf = [];
  };
  tokens.forEach((tok, i) => {
    if (tok.trim() === "") { buf.length ? buf.push(tok) : nodes.push(tok); }
    else if (HE.test(tok)) { buf.push(tok); }
    else { flushHe(); nodes.push(<span key={`${keyBase}-t${i}`}>{tok}</span>); }
  });
  flushHe();
  return nodes;
}

function renderInline(text, c, keyBase) {
  return text.split(/(\*\*[^*]+\*\*)/).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <span key={`${keyBase}-b${i}`} className="font-bold text-gray-900">
          {renderSegment(seg.slice(2, -2), c, `${keyBase}-b${i}`)}
        </span>
      );
    }
    return <span key={`${keyBase}-s${i}`}>{renderSegment(seg, c, `${keyBase}-s${i}`)}</span>;
  });
}

// ── Блочный парсер: абзацы / callout / список ─────────────────────────────────
function parseBlocks(raw = "") {
  const blocks = [];
  let bullets = null, callout = null;
  const flush = () => {
    if (bullets) { blocks.push({ type: "list", items: bullets }); bullets = null; }
    if (callout) { blocks.push({ type: "callout", lines: callout }); callout = null; }
  };
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (t.startsWith(">")) { if (bullets) flush(); (callout ||= []).push(t.replace(/^>\s?/, "")); }
    else if (/^[-•]\s/.test(t)) { if (callout) flush(); (bullets ||= []).push(t.replace(/^[-•]\s+/, "")); }
    else { flush(); blocks.push({ type: "p", text: t }); }
  }
  flush();
  return blocks;
}

function RichText({ text, c }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        if (b.type === "callout") {
          const m = b.lines[0].match(/^([^:]{1,20}):\s+(.+)$/);
          const label = (m ? m[1] : "суть").trim().toLowerCase();
          const body = m ? [m[2], ...b.lines.slice(1)] : b.lines;
          const icon = LABEL_ICON[label] || "💡";
          return (
            <div key={i} className={`flex gap-3 rounded-xl p-3.5 ${c.soft}`}>
              <div className={`w-1 rounded-full flex-shrink-0 ${c.bar}`} />
              <div className="flex-1">
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${c.text}`}>{icon} {label}</div>
                {body.map((ln, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-gray-800">{renderInline(ln, c, `c${i}-${j}`)}</p>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "list") return (
          <ul key={i} className="flex flex-col gap-1.5 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className={`flex gap-2.5 ${TYPO.ruleText} text-gray-800`}>
                <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.bar}`} />
                <span className="flex-1">{renderInline(it, c, `l${i}-${j}`)}</span>
              </li>
            ))}
          </ul>
        );
        return (
          <p key={i} className={`${TYPO.ruleText} text-gray-800`}>{renderInline(b.text, c, `p${i}`)}</p>
        );
      })}
    </div>
  );
}

// Точки прогресса по сценам (кроме result) — ориентир «где я»
function StepDots({ total, idx, c }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i <= idx ? `w-6 ${c.bar}` : "w-3 bg-gray-300 dark:bg-gray-700"}`} />
      ))}
    </div>
  );
}

export default function LessonScreen({ lesson, onBack, onOpenReading }) {
  const { dark } = useTheme();
  const { completeLesson, stats } = useStats();
  const c = MODULE_COLORS[lesson.module] || MODULE_COLORS.syntax;

  const hasExamples = lesson.examples?.length > 0;
  const hasDialogue = lesson.dialogueCards?.length > 0;
  const hasPractice = lesson.practiceItems?.length > 0;

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

  const questions = useMemo(
    () => (hasPractice ? shuffle([...lesson.practiceItems]) : []),
    [lesson.id] // eslint-disable-line
  );
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const scene = scenes[sceneIdx];
  const stepTotal = scenes.length - 1; // без result

  function next() {
    const ni = sceneIdx + 1;
    if (scenes[ni] === "result") finish();
    setSceneIdx(ni);
  }

  function finish(scorePct) {
    const score = hasPractice ? scorePct : null;
    if (!finished) {
      completeLesson(lesson.id, score);
      setFinished(true);
    }
  }

  const header = (
    <div className="flex items-center gap-3 mb-3">
      <button onClick={onBack} aria-label="Назад"
        className={`text-2xl leading-none ${dark ? "text-gray-400" : "text-gray-500"}`}>‹</button>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wide ${dark ? "text-gray-500" : "text-gray-400"}`}>
          {lesson.moduleName} · {lesson.id}
        </p>
        <h2 className={`font-bold text-base leading-snug ${dark ? "text-white" : "text-gray-900"}`}>{lesson.title}</h2>
      </div>
    </div>
  );

  // ── Сцена: правило ──────────────────────────────────────────────────────────
  if (scene === "rule") return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      {header}
      <StepDots total={stepTotal} idx={sceneIdx} c={c} />
      <div className="rounded-2xl p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <RichText text={lesson.rule} c={c} />
      </div>
      {lesson.notes && (
        <div className={`flex gap-2 text-[13px] mt-3 px-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <span>📝</span><span className="flex-1 leading-relaxed">{lesson.notes}</span>
        </div>
      )}
      <button onClick={next}
        className={`mt-5 w-full rounded-xl text-white bg-gradient-to-r ${c.grad} active:scale-[0.98] ${TYPO.btn}`}>
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
        <StepDots total={stepTotal} idx={sceneIdx} c={c} />
        <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Пример {exIdx + 1} из {lesson.examples.length}
        </p>
        <div className={`rounded-2xl p-7 border text-center ${c.soft} ${c.border}`}>
          <p className={`${TYPO.hebrewBig} font-bold mb-3 text-gray-900`} dir="rtl" style={HEB_FONT}>
            {ex.hebrew}
          </p>
          <SpeakBtn file={ex.audio} className="text-2xl mb-2" />
          <p className={`${TYPO.translit} mb-2 ${c.text}`}>{ex.translit}</p>
          <p className={`${TYPO.ru} text-gray-600`}>{ex.ru}</p>
          {ex.isNew && <span className="inline-block mt-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">новое слово</span>}
        </div>
        <div className="flex gap-2 mt-5">
          {exIdx > 0 && (
            <button onClick={() => setExIdx(i => i - 1)}
              className={`flex-1 rounded-xl border ${TYPO.btn} ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
              ← Назад
            </button>
          )}
          <button onClick={() => (last ? next() : setExIdx(i => i + 1))}
            className={`flex-[2] rounded-xl text-white bg-gradient-to-r ${c.grad} active:scale-[0.98] ${TYPO.btn}`}>
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
        <StepDots total={stepTotal} idx={sceneIdx} c={c} />
        <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Диалог {dlgIdx + 1} из {lesson.dialogueCards.length} · нажми, чтобы увидеть ответ
        </p>
        <button onClick={() => setDlgFlipped(f => !f)}
          className={`w-full rounded-2xl p-7 border text-center ${c.soft} ${c.border} active:scale-[0.99]`}>
          {!dlgFlipped ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-3xl font-bold text-gray-900" dir="rtl" style={HEB_FONT}>{d.question}</p>
                <SpeakBtn file={d.qAudio} className="text-xl" />
              </div>
              <p className={`${TYPO.ru} text-gray-600`}>{d.questionRu}</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-3xl font-bold text-gray-900" dir="rtl" style={HEB_FONT}>{d.answer}</p>
                <SpeakBtn file={d.aAudio} className="text-xl" />
              </div>
              <p className={`${TYPO.ru} text-gray-600`}>{d.answerRu}</p>
            </>
          )}
        </button>
        <button onClick={() => { setDlgFlipped(false); last ? next() : setDlgIdx(i => i + 1); }}
          className={`mt-5 w-full rounded-xl text-white bg-gradient-to-r ${c.grad} active:scale-[0.98] ${TYPO.btn}`}>
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
        <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Вопрос {qIdx + 1} из {questions.length}
        </p>
        <div className={`${TYPO.prompt} mb-5 ${dark ? "text-white" : "text-gray-900"}`}>
          {renderInline(q.prompt, c, "prompt")}
        </div>
        <div className="flex flex-col gap-2.5">
          {q.options.map(opt => {
            const isPicked = picked === opt;
            const isRight = opt === q.answer;
            let cls = dark ? "border-gray-700 bg-gray-800 text-gray-200" : "border-gray-200 bg-white text-gray-800";
            let mark = null;
            if (answered && isRight) { cls = "border-emerald-400 bg-emerald-50 text-emerald-800"; mark = "✓"; }
            else if (answered && isPicked) { cls = "border-rose-400 bg-rose-50 text-rose-800"; mark = "✗"; }
            return (
              <button key={opt} disabled={answered}
                onClick={() => { setPicked(opt); if (opt === q.answer) setCorrect(n => n + 1); }}
                className={`rounded-xl border-2 p-4 min-h-[52px] flex items-center justify-between gap-3 text-left transition-all ${TYPO.option} ${cls}`}
                dir="auto">
                <span className="flex-1" style={HE.test(opt) ? HEB_FONT : undefined}>{opt}</span>
                {mark && <span className="text-lg font-bold flex-shrink-0">{mark}</span>}
              </button>
            );
          })}
        </div>
        {answered && (
          <button onClick={() => {
              if (lastQ) {
                const score = Math.round((correct / questions.length) * 100);
                finish(score);
                setSceneIdx(scenes.length - 1);
              } else { setQIdx(i => i + 1); setPicked(null); }
            }}
            className={`mt-5 w-full rounded-xl text-white bg-gradient-to-r ${c.grad} active:scale-[0.98] ${TYPO.btn}`}>
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
        if (!passed || !onOpenReading) return null;
        const block = READING_BLOCKS.find(b => b.lesson === lesson.id);
        if (!block) return null;
        const known = getKnownLetters(stats.progress?.letters, ALPHABET, LETTER_GROUPS);
        const fresh = filterReadable(getBlockCards(block), known)
          .filter(i => !(stats.readingProgress?.studied || []).includes(i.id));
        if (fresh.length === 0) return null;
        return (
          <button onClick={() => onOpenReading(block.id)}
            className={`mt-4 w-full rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 ${TYPO.btn}`}>
            📖 Изучить {fresh.length} новых слов →
          </button>
        );
      })()}
      <button onClick={onBack}
        className={`mt-4 w-full rounded-xl text-white bg-gradient-to-r ${c.grad} ${TYPO.btn}`}>
        {passed ? "К урокам →" : "Вернуться"}
      </button>
    </div>
  );
}
