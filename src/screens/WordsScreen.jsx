import { useState, useRef, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { WORD_CATEGORIES } from "../data/words";
import { shuffle } from "../helpers/utils";

const COLOR_MAP = {
  emerald: { bg:"bg-emerald-500/10", border:"border-emerald-500/30", text:"text-emerald-400", btn:"bg-emerald-600", dark:"bg-emerald-950" },
  blue:    { bg:"bg-blue-500/10",    border:"border-blue-500/30",    text:"text-blue-400",    btn:"bg-blue-600",    dark:"bg-blue-950" },
  amber:   { bg:"bg-amber-500/10",   border:"border-amber-500/30",   text:"text-amber-400",   btn:"bg-amber-600",   dark:"bg-amber-950" },
  rose:    { bg:"bg-rose-500/10",    border:"border-rose-500/30",    text:"text-rose-400",    btn:"bg-rose-600",    dark:"bg-rose-950" },
  purple:  { bg:"bg-purple-500/10",  border:"border-purple-500/30",  text:"text-purple-400",  btn:"bg-purple-600",  dark:"bg-purple-950" },
  orange:  { bg:"bg-orange-500/10",  border:"border-orange-500/30",  text:"text-orange-400",  btn:"bg-orange-600",  dark:"bg-orange-950" },
};

// ─── Главный экран ─────────────────────────────────────────────────────────────
export default function WordsScreen() {
  const { dark } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [mode, setMode]               = useState(null); // null | 'cards' | 'learn'

  function openGroup(group, m) {
    setActiveGroup(group);
    setMode(m);
  }
  function goBack() {
    setActiveGroup(null);
    setMode(null);
  }

  if (activeGroup && mode === "cards") {
    return <CardsMode group={activeGroup} dark={dark} onBack={goBack} />;
  }
  if (activeGroup && mode === "learn") {
    return <LearnMode group={activeGroup} dark={dark} onBack={goBack} />;
  }

  // Список групп
  return (
    <div className="pb-24 max-w-md mx-auto">
      <div className="px-4 pt-4 pb-3">
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Слова</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {WORD_CATEGORIES.reduce((s,c)=>s+c.words.length,0)} слов в {WORD_CATEGORIES.length} темах
        </p>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {WORD_CATEGORIES.map(group => {
          const colors = COLOR_MAP[group.color] || COLOR_MAP.blue;
          const isEmpty = !group.words?.length;
          return (
            <div
              key={group.id}
              className={`rounded-2xl border p-4 ${isEmpty
                ? dark ? "border-gray-800 opacity-40" : "border-gray-200 opacity-40"
                : `${colors.border} ${colors.bg}`}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{group.icon}</span>
                <div className="flex-1">
                  <p className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{group.name}</p>
                  <p className={`text-xs ${isEmpty ? "text-gray-400" : colors.text}`}>
                    {isEmpty ? "Скоро" : `${group.words.length} слов`}
                  </p>
                </div>
              </div>
              {!isEmpty && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openGroup(group, "cards")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium text-white ${colors.btn}`}
                  >
                    🃏 Карточки
                  </button>
                  <button
                    onClick={() => openGroup(group, "learn")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border
                      ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700"}`}
                  >
                    📝 Изучение
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Режим: Карточки (флипкарты) ─────────────────────────────────────────────
function CardsMode({ group, dark, onBack }) {
  const colors   = COLOR_MAP[group.color] || COLOR_MAP.blue;
  const words    = group.words;
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlipped] = useState(false);
  const audioRef = useRef(null);

  function playAudio(file) {
    if (!file) return;
    if (audioRef.current) { audioRef.current.pause(); }
    audioRef.current = new Audio(`/words499/${file}`);
    audioRef.current.play().catch(() => {});
  }

  function next() { setFlipped(false); setTimeout(() => setIdx(i => (i+1) % words.length), 60); }
  function prev() { setFlipped(false); setTimeout(() => setIdx(i => (i-1+words.length) % words.length), 60); }

  const word = words[idx];
  if (!word) return null;

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
          ← {group.icon} {group.name}
        </button>
        <span className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>{idx+1} / {words.length}</span>
      </div>

      {/* Прогресс */}
      <div className={`h-1 rounded-full ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
        <div className={`h-1 rounded-full transition-all ${colors.btn}`} style={{width:`${((idx+1)/words.length)*100}%`}} />
      </div>

      {/* Карточка */}
      <div className="cursor-pointer select-none" style={{perspective:"1000px"}}
        onClick={() => { if (!flipped) playAudio(word.audio); setFlipped(f => !f); }}>
        <div style={{
          transformStyle:"preserve-3d", transition:"transform 0.4s",
          transform: flipped ? "rotateY(180deg)" : "none",
          position:"relative", height:"280px",
        }}>
          {/* Лицо */}
          <div style={{backfaceVisibility:"hidden",position:"absolute",inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-3 p-6
              ${colors.border} ${dark ? "bg-gray-800" : "bg-white"}`}>
            <p className={`text-7xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
              style={{direction:"rtl",fontFamily:"serif"}}>{word.hebrew}</p>
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Нажми — узнаешь перевод</p>
          </div>
          {/* Оборот */}
          <div style={{backfaceVisibility:"hidden",transform:"rotateY(180deg)",position:"absolute",inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-4 p-6
              ${colors.border} ${dark ? "bg-gray-800" : "bg-white"}`}>
            <p className={`text-4xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
              style={{direction:"rtl",fontFamily:"serif"}}>{word.hebrew}</p>
            <div className="text-center">
              <p className={`text-2xl font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{word.translation}</p>
              <p className={`text-base mt-1 ${colors.text}`}>{word.transliteration}</p>
            </div>
            {word.audio && (
              <button onClick={e => { e.stopPropagation(); playAudio(word.audio); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${colors.btn} text-white`}>
                🔊 Произношение
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex gap-3">
        <button onClick={prev}
          className={`flex-1 py-4 rounded-2xl border font-semibold active:scale-95 transition-all
            ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
          ← Назад
        </button>
        <button onClick={next}
          className={`flex-1 py-4 rounded-2xl font-semibold text-white active:scale-95 transition-all ${colors.btn}`}>
          Вперёд →
        </button>
      </div>
    </div>
  );
}

// ─── Режим: Изучение (вопросы с вариантами) ──────────────────────────────────
function LearnMode({ group, dark, onBack }) {
  const colors = COLOR_MAP[group.color] || COLOR_MAP.blue;
  const words  = group.words;

  // Генерируем вопросы: иврит → выбери перевод или перевод → выбери иврит
  const questions = useMemo(() => {
    const allTranslations = WORD_CATEGORIES.flatMap(c => c.words).map(w => w.translation);
    const allHebrews      = WORD_CATEGORIES.flatMap(c => c.words).map(w => w.hebrew);

    return shuffle(words).flatMap(word => {
      const q = [];

      // Тип 1: иврит → перевод
      const wrongTr = shuffle(allTranslations.filter(t => t !== word.translation)).slice(0, 3);
      q.push({ type:"heb_to_ru", word, correct:word.translation, options:shuffle([word.translation, ...wrongTr]) });

      // Тип 2: перевод → иврит
      const wrongHe = shuffle(allHebrews.filter(h => h !== word.hebrew)).slice(0, 3);
      q.push({ type:"ru_to_heb", word, correct:word.hebrew, options:shuffle([word.hebrew, ...wrongHe]) });

      return q;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [idx,      setIdx]     = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const audioRef = useRef(null);

  if (idx >= questions.length) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="pb-24 max-w-md mx-auto px-4 pt-8 flex flex-col items-center gap-5 text-center">
        <span className="text-6xl">{pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : "💪"}</span>
        <div>
          <p className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Сессия завершена!</p>
          <p className={`text-5xl font-black mt-1 ${colors.text}`}>{pct}%</p>
          <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{correct} из {questions.length}</p>
        </div>
        <button onClick={onBack} className={`w-full py-4 rounded-2xl font-bold text-white ${colors.btn}`}>
          К списку тем
        </button>
      </div>
    );
  }

  const q = questions[idx];
  const isHebToRu = q.type === "heb_to_ru";

  function playAudio() {
    if (!q.word.audio) return;
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(`/words499/${q.word.audio}`);
    audioRef.current.play().catch(() => {});
  }

  function handlePick(opt) {
    if (revealed) return;
    const isRight = opt === q.correct;
    setSelected(opt);
    setRevealed(true);
    if (isRight) { setCorrect(c => c+1); playAudio(); }
    setTimeout(() => { setIdx(i => i+1); setSelected(null); setRevealed(false); }, 900);
  }

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 flex flex-col gap-5">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
          ← {group.icon} {group.name}
        </button>
        <span className={`text-sm font-medium ${dark ? "text-emerald-400" : "text-emerald-600"}`}>✓ {correct}</span>
      </div>

      {/* Прогресс */}
      <div className={`h-1.5 rounded-full ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
        <div className={`h-1.5 rounded-full transition-all ${colors.btn}`} style={{width:`${(idx/questions.length)*100}%`}} />
      </div>

      <p className={`text-center text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
        {idx+1} / {questions.length}
      </p>

      <p className={`text-center text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
        {isHebToRu ? "Что означает это слово?" : "Найди слово на иврите:"}
      </p>

      {/* Карточка вопроса */}
      <div className={`rounded-3xl border-2 ${colors.border} ${dark ? "bg-gray-800" : "bg-white"} h-44 flex items-center justify-center`}>
        {isHebToRu
          ? <p className={`text-7xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
              style={{direction:"rtl",fontFamily:"serif"}}>{q.word.hebrew}</p>
          : <p className={`text-3xl font-bold text-center px-4 ${dark ? "text-white" : "text-gray-900"}`}>
              {q.word.translation}
            </p>
        }
      </div>

      {/* Варианты */}
      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          const isCorrect = opt === q.correct;
          let cls = dark ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800";
          if (revealed) {
            if (isCorrect)          cls = dark ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (opt === selected) cls = dark ? "bg-rose-950 border-rose-500 text-rose-300"       : "bg-rose-50 border-rose-400 text-rose-700";
          }
          return (
            <button key={opt} onClick={() => handlePick(opt)}
              className={`py-4 rounded-2xl border font-medium transition-all active:scale-95 ${cls}
                ${!isHebToRu ? "text-2xl" : "text-sm"}`}
              style={!isHebToRu ? {direction:"rtl",fontFamily:"serif"} : {}}>
              {opt}
              {revealed && isCorrect && " ✓"}
              {revealed && opt === selected && !isCorrect && " ✗"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
