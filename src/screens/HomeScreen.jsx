import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, LETTER_GROUPS, NIKUD, NIKUD_GROUPS, ALL_LETTERS } from "../data/alphabet";
import { READING_BLOCKS } from "../data/reading";
import { levelProgress } from "../data/constants";
import { COURSE_PATH, getContinueNode } from "../data/curriculum";
import { GRAMMAR_LESSONS_BY_ID } from "../data/grammarLessons";
import { nodeView } from "./StudyScreen";

// ── Дизайн-редизайн Home (вариант 1b, наполнение 08.08.2026) ──────────────────
// Тропа берётся из канонического COURSE_PATH/getContinueNode (StudyScreen) —
// не из старой плоской матрицы «Буквы/Огласовки/Словарь», чтобы не расходиться
// с реальным курсом (грамматика уровней 1-4). На тропе — тех. id узла («M3.1»,
// «CH1.2») вместо придуманной сквозной нумерации: реальный граф не линеен,
// показывать «урок 87 из ...» было бы и бессмысленно, и нечестно.

// Первое предложение (до точки/!/?) — используется и для факта, и чтобы не
// тащить в подсказку весь абзац объяснения грамматики.
function firstPhrase(text, maxLen = 140) {
  if (!text) return null;
  const cut = text.split(/(?<=[.!?])\s+/)[0] || text;
  return cut.length > maxLen ? cut.slice(0, maxLen - 1).trimEnd() + "…" : cut;
}

// ── Достижения (критерии зеркалят ProfileScreen) ───────────────────────────────
// progress: 0..1 для линейных критериев, null — для небинарных (точность/реферал),
// у них тизер просто не рисует прогресс-бар вместо того чтобы врать цифрой.
function buildAchievements(stats) {
  const p = stats.progress || {};
  const completedLetterGroups = [1,2,3,4,5].filter(n => p.letters?.[n] === "done").length;
  const completedSoundGroups  = [1,2,3,4,5].filter(n => p.sounds?.[n]  === "done").length;
  const wordsCorrectCount     = Object.keys(stats.wordsCorrect || {}).length;
  const accuracy              = stats.totalAnswers > 0 ? stats.correctAnswers / stats.totalAnswers : 0;

  return [
    { icon:"🌟", name:"Старт",     done: stats.xp >= 20,  progress: stats.xp / 20 },
    { icon:"🔥", name:"3 дня",     done: stats.streak >= 3, progress: stats.streak / 3 },
    { icon:"⚡", name:"100 XP",    done: stats.xp >= 100, progress: stats.xp / 100 },
    { icon:"🔤", name:"Алфавит",   done: completedLetterGroups >= 5, progress: completedLetterGroups / 5 },
    { icon:"📖", name:"Огласовки", done: completedSoundGroups >= 5,  progress: completedSoundGroups / 5 },
    { icon:"💬", name:"50 слов",   done: wordsCorrectCount >= 50, progress: wordsCorrectCount / 50 },
    { icon:"🎯", name:"Точность",  done: stats.totalAnswers > 10 && accuracy >= 0.8, progress: null },
    { icon:"👥", name:"Друг",      done: (stats.referralsCount || 0) >= 1, progress: null },
  ];
}

function nextAchievement(stats) {
  const list = buildAchievements(stats).filter(a => !a.done);
  if (list.length === 0) return null;
  const withProgress = list.filter(a => a.progress != null).sort((a, b) => b.progress - a.progress);
  return withProgress[0] || list[0];
}

// ── Тропа: пред./тек./след. узел + сколько пройдено/впереди всего ──────────────
// doneTotal   — все узлы курса со статусом done (не только соседний prevNode).
// remainingAhead — сколько узлов ЕЩЁ впереди ЗА next (тот уже показан отдельно);
// «уроки и экзамены общим числом» — считаем все виды узлов (letters/sounds/
// reading/grammar) без разделения, как и попросили.
function buildTrail(stats) {
  const continueId = getContinueNode(stats);
  const flatViews = COURSE_PATH
    .flatMap(ch => ch.items)
    .filter(it => !it.inDev)
    .map(it => nodeView(it, stats))
    .filter(Boolean);
  const doneTotal = flatViews.filter(v => v.status === "done").length;
  const idx = flatViews.findIndex(v => v.id === continueId);
  if (idx === -1) {
    return { continueId, continueView: null, prevNode: null, nextNode: null, doneTotal, remainingAhead: 0 };
  }
  return {
    continueId,
    continueView: flatViews[idx],
    prevNode: flatViews[idx - 1] || null,
    nextNode: flatViews[idx + 1] || null,
    doneTotal,
    remainingAhead: Math.max(0, flatViews.length - idx - 2),
  };
}

// ── Тропа «Твой путь» — 5 остановок сверху вниз (схема от 09.08.2026) ──────────
// 1) сколько всего пройдено (число+✓) 2) последний пройденный урок 3) текущий
// 4) следующий 5) сколько ещё впереди (число+🔒, уроки и экзамены общим счётом).
// Раскраска по СТАТУСУ (зелёный=пройден, индиго=текущий, тёмный=закрыт), не по
// типу узла — так прогресс читается однозначно с одного взгляда.
// viewBox 300×500 = координатная система тропы; контейнер держит те же
// пропорции через aspect-ratio, поэтому проценты = px-координата/300 или /500,
// без искажений при любой ширине экрана.
const TRAIL_VB = { w: 300, h: 350 };
const xPct = px => `${(px / TRAIL_VB.w * 100).toFixed(3)}%`;
const yPct = px => `${(px / TRAIL_VB.h * 100).toFixed(3)}%`;

// Вертикальные зазоры между остановками сжаты ~на 30% относительно исходной
// схемы (500→350 по высоте) — узлы стояли слишком далеко друг от друга.
// Кружки те же (size не трогаем), меняются только cy и кривые пунктира ниже.
const TRAIL_POS = {
  doneBadge:  { cx: 132, cy: 40,  size: 52 },
  prev:       { cx: 88,  cy: 105, size: 54 },
  current:    { cx: 206, cy: 182, size: 80 },
  next:       { cx: 88,  cy: 259, size: 54 },
  aheadBadge: { cx: 132, cy: 319, size: 52 },
};
// left/width — горизонтальная зона подписи; cy взят от самого узла (см.
// TRAIL_POS), текст центрируется по вертикали через translateY(-50%), так
// заголовок в 2-3 строки растёт симметрично, не наезжая на пунктир снизу.
const TRAIL_LABEL_POS = {
  prev:    { left: 128, cy: TRAIL_POS.prev.cy,    width: 150, align: "left"  },
  current: { left: 20,  cy: TRAIL_POS.current.cy, width: 140, align: "right" },
  next:    { left: 128, cy: TRAIL_POS.next.cy,    width: 150, align: "left"  },
};
// Сегменты пунктира между соседними остановками, в порядке сверху вниз.
const TRAIL_PATH_DONE_BADGE = "M132,66 C132,72 100,73 88,78";
const TRAIL_PATH_DONE       = "M107,126 C140,135 155,143 178,152";
const TRAIL_PATH_AHEAD      = "M178,208 C150,215 130,222 107,230";
const TRAIL_PATH_AHEAD_BADGE = "M88,278 C88,284 115,286 132,293";

// Короткая подпись узла: для букв/огласовок — общее название раздела (номер уже
// на кружке), для словарной порции/грамматики — реальное короткое имя узла.
function trailLabel(v) {
  if (!v) return "";
  if (v.kind === "letters") return "Буквы";
  if (v.kind === "sounds")  return "Огласовки";
  return v.title;
}

function TrailNode({ v, role, dark }) {
  if (!v) return null;
  const pos = TRAIL_POS[role];
  const base = {
    left: xPct(pos.cx), top: yPct(pos.cy), width: pos.size, height: pos.size,
    transform: "translate(-50%,-50%)",
  };

  if (role === "prev") {
    return (
      <div className="absolute rounded-full flex items-center justify-center font-extrabold" style={{
        ...base, fontSize: 13,
        background: dark ? "rgba(34,197,94,.15)" : "#dcf5e3",
        border: `2px solid ${dark ? "#22c55e" : "#16a34a"}`,
        color: dark ? "rgba(134,239,172,.7)" : "rgba(22,101,52,.6)",
      }}>{v.id}</div>
    );
  }

  if (role === "current") {
    return (
      <div className="absolute rounded-full flex items-center justify-center font-extrabold" style={{
        ...base, fontSize: 16,
        background: "#fffaf0",
        border: `3px solid ${dark ? "#818cf8" : "#4f46e5"}`,
        color: "#4f46e5",
        boxShadow: dark ? "0 6px 16px rgba(0,0,0,.35)" : "0 6px 14px rgba(79,70,229,.18)",
      }}>{v.id}</div>
    );
  }

  // role === "next" (заблокирован) — светлее счётчика «ещё впереди» снизу:
  // темнота должна нарастать по мере движения вперёд по тропе, а не обрываться
  // сразу на первом закрытом узле.
  return (
    <div className="absolute rounded-full flex items-center justify-center" style={{
      ...base,
      background: dark ? "#3c3768" : "#e0e3f8",
      border: dark ? "1px solid rgba(129,140,248,.35)" : "1.5px solid #b3bbf0",
    }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: dark ? "#c7d2fe" : "#4c4f7d" }}>{v.id}</span>
      <span className="absolute rounded-full flex items-center justify-center" style={{
        right: -3, bottom: -3, width: 18, height: 18, fontSize: 9,
        background: dark ? "#2d2954" : "#c7cdf0",
        color: dark ? "#c7d2fe" : "#4c4f7d",
      }}>🔒</span>
    </div>
  );
}

// Заголовки узлов часто содержат вкраплённый иврит («окончание ־ִים») —
// маккаф (־) в юникоде помечен как «дефис», и браузер переносит строку прямо
// внутри такого токена, отрывая огласовку от буквы. Разбиваем по пробелам
// и запрещаем перенос ВНУТРИ каждого слова (nowrap) — перенос остаётся только
// между словами, лишние слова просто уходят на следующую строку целиком.
function noBreakWords(text) {
  const words = text.split(" ");
  return words.flatMap((w, i) => {
    const span = <span key={i} style={{ whiteSpace: "nowrap" }}>{w}</span>;
    return i < words.length - 1 ? [span, " "] : [span];
  });
}

function TrailLabel({ v, role, dark }) {
  if (!v) return null;
  const p = TRAIL_LABEL_POS[role];
  const color = role === "prev" ? (dark ? "#4ade80" : "#16743f")
    : role === "current" ? (dark ? "#a5b4fc" : "#3730a3")
    : (dark ? "#c7d2fe" : "#4c4f7d");
  return (
    <div className={`absolute ${p.align === "right" ? "text-right" : "text-left"}`} style={{
      left: xPct(p.left), top: yPct(p.cy), width: xPct(p.width),
      transform: "translateY(-50%)", lineHeight: 1.15, textWrap: "balance",
      fontSize: role === "current" ? 13.5 : 12.5, fontWeight: role === "current" ? 800 : 700, color,
    }}>{noBreakWords(trailLabel(v))}</div>
  );
}

// Бейдж-число сверху («пройдено всего») и снизу («ещё впереди») тропы.
// Показываются только вместе со своей группой (prevNode/nextNode) — бейдж
// без соседнего узла повис бы в воздухе без визуальной опоры.
function TrailCountBadge({ count, kind, dark }) {
  const pos = TRAIL_POS[kind === "done" ? "doneBadge" : "aheadBadge"];
  const base = {
    left: xPct(pos.cx), top: yPct(pos.cy), width: pos.size, height: pos.size,
    transform: "translate(-50%,-50%)",
  };
  if (kind === "done") {
    return (
      <div className="absolute rounded-full flex items-center justify-center font-extrabold" style={{
        ...base, fontSize: 19,
        background: dark ? "#16a34a" : "#15803d", color: "#fff",
        boxShadow: "0 4px 10px rgba(21,128,61,.35)",
      }}>
        {count}
        <span className="absolute rounded-full flex items-center justify-center" style={{
          right: -4, bottom: -4, width: 20, height: 20, fontSize: 11,
          background: dark ? "#052e16" : "#dcfce7", color: dark ? "#4ade80" : "#16743f",
        }}>✓</span>
      </div>
    );
  }
  // «Ещё впереди» — самый тёмный элемент тропы: чем дальше по курсу, тем
  // гуще неизвестность, до этого счётчика доходит самая тёмная точка.
  return (
    <div className="absolute rounded-full flex items-center justify-center font-extrabold" style={{
      ...base, fontSize: 19,
      background: dark ? "#0c0a16" : "#1e1a30", color: "#fff",
      boxShadow: "0 4px 10px rgba(0,0,0,.35)",
    }}>
      {count}
      <span className="absolute rounded-full flex items-center justify-center" style={{
        right: -4, bottom: -4, width: 20, height: 20, fontSize: 10,
        background: dark ? "#050409" : "#120f20", color: "rgba(255,255,255,.7)",
      }}>🔒</span>
    </div>
  );
}

// Пунктир: зелёные сегменты (счётчик-пройдено → prev → current) рисуются
// только если prevNode есть, серые (current → next → счётчик-впереди) —
// только если есть next. Так тропа честно обрывается на границах курса.
function TrailPath({ prevNode, nextNode, dark }) {
  return (
    <svg viewBox={`0 0 ${TRAIL_VB.w} ${TRAIL_VB.h}`}
      className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      {prevNode && (
        <path d={TRAIL_PATH_DONE_BADGE} fill="none" stroke={dark ? "#22c55e" : "#16a34a"}
          strokeWidth="4" strokeLinecap="round" strokeDasharray="1 13" />
      )}
      {prevNode && (
        <path d={TRAIL_PATH_DONE} fill="none" stroke={dark ? "#22c55e" : "#16a34a"}
          strokeWidth="4" strokeLinecap="round" strokeDasharray="1 13" />
      )}
      {nextNode && (
        <path d={TRAIL_PATH_AHEAD} fill="none" stroke={dark ? "#3f3a56" : "#c7c2d6"}
          strokeWidth="4" strokeLinecap="round" strokeDasharray="1 13" />
      )}
      {nextNode && (
        <path d={TRAIL_PATH_AHEAD_BADGE} fill="none" stroke={dark ? "#3f3a56" : "#c7c2d6"}
          strokeWidth="4" strokeLinecap="round" strokeDasharray="1 13" />
      )}
    </svg>
  );
}

// ── Наполнение карточки «Продолжить» — по типу узла ────────────────────────────
function ContinuePreview({ v, dark }) {
  if (!v) return null;

  if (v.kind === "letters") {
    const g = LETTER_GROUPS.find(g => g.id === Number(v.id.split(".")[1]));
    const glyphs = g?.letterIds.map(id => ALPHABET.find(l => l.id === id)?.symbol).filter(Boolean);
    if (!glyphs?.length) return null;
    return <p dir="rtl" className={`text-2xl font-bold tracking-widest mt-3 ${dark ? "text-white" : "text-gray-900"}`}>{glyphs.join("  ")}</p>;
  }

  if (v.kind === "sounds") {
    const g = NIKUD_GROUPS.find(g => g.id === Number(v.id.split(".")[1]));
    const names = g?.vowelIds.map(id => NIKUD.find(n => n.id === id)?.name).filter(Boolean);
    if (!names?.length) return null;
    return <p className={`text-sm font-semibold mt-3 ${dark ? "text-gray-200" : "text-gray-700"}`}>{names.join(" · ")}</p>;
  }

  if (v.kind === "grammar") {
    const ex = GRAMMAR_LESSONS_BY_ID[v.id]?.examples?.[0];
    if (!ex) return null;
    return (
      <div className="mt-3">
        <p dir="rtl" className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{ex.hebrew}</p>
        <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{ex.ru}</p>
      </div>
    );
  }

  if (v.kind === "reading") {
    const block = READING_BLOCKS.find(b => b.id === v.id);
    const sample = block?.items?.slice(0, 2) || [];
    if (!sample.length) return null;
    return (
      <div className="mt-3 flex flex-col gap-1">
        {sample.map(w => (
          <p key={w.id} className={`text-sm ${dark ? "text-gray-200" : "text-gray-700"}`}>
            <span dir="rtl" className="font-bold">{w.hebrew}</span> — {w.translation}
          </p>
        ))}
      </div>
    );
  }

  return null;
}

// ── Подсказка-карточка под маскотом — из реального контента текущего узла ──────
// Группа буквы/огласовки уже раскрыта в подзаголовке карточки «Продолжить»
// (g.description) — здесь берём более частный факт, чтобы не повторяться:
// произношение конкретной буквы / подсказка конкретного значка.
// Для словарных порций отдельного «факта» в данных нет — вместо него честная
// мини-подсказка «как запомнить», собранная из уже известных звуков букв
// (эти буквы точно пройдены: слово доступно только когда все его буквы изучены).
function tipForNode(v) {
  if (!v) return null;

  if (v.kind === "grammar") {
    const body = firstPhrase(GRAMMAR_LESSONS_BY_ID[v.id]?.rule);
    return body ? { header: "Знали ли вы?", body } : null;
  }

  if (v.kind === "letters") {
    const g = LETTER_GROUPS.find(g => g.id === Number(v.id.split(".")[1]));
    const letter = g && ALPHABET.find(l => l.id === g.letterIds[0]);
    return letter?.pronunciation ? { header: "Знали ли вы?", body: letter.pronunciation } : null;
  }

  if (v.kind === "sounds") {
    const g = NIKUD_GROUPS.find(g => g.id === Number(v.id.split(".")[1]));
    const vowel = g && NIKUD.find(n => n.id === g.vowelIds[0]);
    return vowel?.hint ? { header: "Знали ли вы?", body: vowel.hint } : null;
  }

  if (v.kind === "reading") {
    const block = READING_BLOCKS.find(b => b.id === v.id);
    const word = block?.items?.[0];
    if (!word?.plain) return null;
    const sounds = [...word.plain].map(ch => ALPHABET.find(l => l.symbol === ch)?.sound).filter(Boolean);
    if (sounds.length < 2) return null;
    return {
      header: "Как запомнить",
      body: `${word.hebrew} («${word.transliteration}» — ${word.translation}) читается по буквам, которые ты уже знаешь: ${sounds.join(" + ")}.`,
    };
  }

  return null;
}

export default function HomeScreen({ onOpenProfile, onNavigateStudy }) {
  const { dark } = useTheme();
  const { stats, getDueCards, getDueWords } = useStats();

  const { level, pct: lvlPct } = levelProgress(stats.xp);
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const name   = tgUser?.first_name || "Привет";

  const p = stats.progress || {};
  const dueLetters = getDueCards(ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && p.letters?.[g.id] !== "locked")
  )).length;
  const dueWords = getDueWords().length;
  const dueTotal = dueLetters + dueWords;

  const { continueView, prevNode, nextNode, doneTotal, remainingAhead } = buildTrail(stats);
  const tip    = tipForNode(continueView);
  const teaser = nextAchievement(stats);

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto flex flex-col gap-4">

      {/* ── Профиль компактно ───────────────────────────────────────────────── */}
      <button onClick={onOpenProfile}
        className={`rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all border
          ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-xl flex-shrink-0">
          {tgUser?.photo_url
            ? <img src={tgUser.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
            : "😊"}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{name}</div>
          <div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Уровень {level} · {stats.xp} XP</div>
          <div className={`mt-1.5 h-1 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${lvlPct}%` }} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-orange-500 text-sm font-bold">🔥 {stats.streak}</span>
          <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Профиль →</span>
        </div>
      </button>

      {/* ── Тропа: карточка со своим фоном (макет 3a/3b) ─────────────────────── */}
      {continueView && (
        <div className="rounded-[18px] border relative" style={{
          background: dark ? "#211d33" : "#f4f2fb",
          borderColor: dark ? "rgba(255,255,255,.08)" : "#e6e1f2",
          boxShadow: dark ? "0 2px 10px rgba(0,0,0,.3)" : "0 2px 8px rgba(79,70,229,.06)",
          padding: "18px 18px 16px",
        }}>
          <p className="uppercase" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: ".04em", marginBottom: 6,
            color: dark ? "#8f8aa3" : "#8a86a0",
          }}>Твой путь</p>
          <div className="relative overflow-visible" style={{ aspectRatio: `${TRAIL_VB.w} / ${TRAIL_VB.h}` }}>
            <TrailPath prevNode={prevNode} nextNode={nextNode} dark={dark} />

            {prevNode && <TrailCountBadge count={doneTotal} kind="done" dark={dark} />}
            <TrailNode v={prevNode} role="prev" dark={dark} />
            <TrailLabel v={prevNode} role="prev" dark={dark} />

            <TrailNode v={continueView} role="current" dark={dark} />
            <TrailLabel v={continueView} role="current" dark={dark} />

            <TrailNode v={nextNode} role="next" dark={dark} />
            <TrailLabel v={nextNode} role="next" dark={dark} />
            {nextNode && <TrailCountBadge count={remainingAhead} kind="ahead" dark={dark} />}

            <img src="/mascot/mskt-2-heyy.png" alt="" className="absolute object-contain pointer-events-none" style={{
              right: "-6%", top: yPct(200), width: "32%", maxWidth: 120,
              transform: "rotate(4deg)",
              filter: dark ? "drop-shadow(0 6px 10px rgba(0,0,0,.4))" : "drop-shadow(0 6px 10px rgba(0,0,0,.15))",
            }} />
          </div>
        </div>
      )}

      {/* ── Продолжить — реальный следующий узел курса ──────────────────────── */}
      {continueView ? (
        <div className={`relative rounded-2xl p-5 border
          ${dark ? "bg-gradient-to-br from-indigo-950/60 to-violet-950/40 border-indigo-900/50"
                 : "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{continueView.icon}</span>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${dark ? "text-indigo-300" : "text-indigo-500"}`}>Продолжить</span>
          </div>
          <p className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{continueView.title}</p>
          {continueView.sub && (
            <p className={`text-sm mt-1 ${dark ? "text-gray-300" : "text-gray-600"}`}>{continueView.sub}</p>
          )}
          <ContinuePreview v={continueView} dark={dark} />
          <button onClick={() => onNavigateStudy("continue")}
            className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 active:scale-[0.98] transition-all">
            Продолжить →
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl p-5 text-center border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <p className="text-2xl mb-1">🎉</p>
          <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>Ты прошёл весь курс, который сейчас есть в приложении.</p>
        </div>
      )}

      {/* ── Повторение: буквы + слова одним слотом ──────────────────────────── */}
      {dueTotal > 0 && (
        <button onClick={() => onNavigateStudy(dueWords > dueLetters ? "reading" : "cards")}
          className={`rounded-2xl p-4 border flex items-center justify-between active:scale-[0.98] transition-all
            ${dark ? "bg-blue-900/30 border-blue-700/40" : "bg-blue-50 border-blue-200"}`}>
          <div className="text-left">
            <p className={`font-semibold text-sm ${dark ? "text-blue-300" : "text-blue-700"}`}>Повторить</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-blue-400" : "text-blue-500"}`}>
              {[dueLetters > 0 && `${dueLetters} букв`, dueWords > 0 && `${dueWords} слов`].filter(Boolean).join(" · ")} ждут повторения
            </p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full flex-shrink-0 ${dark ? "bg-blue-800 text-blue-300" : "bg-blue-500 text-white"}`}>
            Открыть →
          </span>
        </button>
      )}

      {/* ── Знали ли вы? / Как запомнить — по типу текущего узла ─────────────── */}
      {tip && (
        <div className={`rounded-2xl p-4 flex gap-3 items-start border
          ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <img src="/mascot/mskt-1-hi.png" alt="" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wide ${dark ? "text-indigo-400" : "text-indigo-500"}`}>{tip.header}</p>
            <p className={`text-sm mt-1 leading-snug ${dark ? "text-gray-200" : "text-gray-700"}`}>{tip.body}</p>
          </div>
        </div>
      )}

      {/* ── Тизер следующего достижения ──────────────────────────────────────── */}
      {teaser && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border
          ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <img src="/mascot/mskt-7-star.png" alt="" className="w-11 h-11 object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>До значка «{teaser.name}» {teaser.icon}</p>
            {teaser.progress != null ? (
              <div className={`mt-1.5 h-1.5 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                <div className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${Math.min(100, Math.round(teaser.progress * 100))}%` }} />
              </div>
            ) : (
              <p className={`text-sm font-semibold mt-0.5 ${dark ? "text-gray-200" : "text-gray-700"}`}>Ещё не открыт</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
