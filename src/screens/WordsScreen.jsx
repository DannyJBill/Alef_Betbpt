import { useState, useRef, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { WORD_CATEGORIES } from "../data/words";
import { shuffle } from "../helpers/utils";

const COLOR_MAP = {
  emerald: { bg:"bg-emerald-500/10", border:"border-emerald-500/30", text:"text-emerald-500", btn:"bg-emerald-600", fill:"bg-emerald-500", light:"bg-emerald-50 dark:bg-emerald-950/40" },
  blue:    { bg:"bg-blue-500/10",    border:"border-blue-500/30",    text:"text-blue-500",    btn:"bg-blue-600",    fill:"bg-blue-500",    light:"bg-blue-50 dark:bg-blue-950/40" },
  amber:   { bg:"bg-amber-500/10",   border:"border-amber-500/30",   text:"text-amber-500",   btn:"bg-amber-600",   fill:"bg-amber-500",   light:"bg-amber-50 dark:bg-amber-950/40" },
  rose:    { bg:"bg-rose-500/10",    border:"border-rose-500/30",    text:"text-rose-500",    btn:"bg-rose-600",    fill:"bg-rose-500",    light:"bg-rose-50 dark:bg-rose-950/40" },
  purple:  { bg:"bg-purple-500/10",  border:"border-purple-500/30",  text:"text-purple-500",  btn:"bg-purple-600",  fill:"bg-purple-500",  light:"bg-purple-50 dark:bg-purple-950/40" },
  orange:  { bg:"bg-orange-500/10",  border:"border-orange-500/30",  text:"text-orange-500",  btn:"bg-orange-600",  fill:"bg-orange-500",  light:"bg-orange-50 dark:bg-orange-950/40" },
};

export default function WordsScreen() {
  const { dark } = useTheme();
  const { stats, recordWordResult } = useStats();
  const [activeGroup, setActiveGroup] = useState(null);
  const [mode, setMode]               = useState(null);
  const [activeTab, setActiveTab]     = useState("cards"); // cards | learn

  const wordsStudied = stats.nikudProgress?.wordsStudied || [];
  const wordsCorrect = stats.nikudProgress?.wordsCorrect || {};

  function groupProgress(group) {
    const total   = group.words.length;
    const studied = group.words.filter(w => wordsStudied.includes(w.id)).length;
    const correct = group.words.reduce((s, w) => s + (wordsCorrect[w.id] || 0), 0);
    const pct     = total ? Math.round((correct / (total * 2)) * 100) : 0; // 2 вопроса на слово
    return { total, studied, pct: Math.min(pct, 100) };
  }

  function openGroup(group) {
    setActiveGroup(group);
    setMode(activeTab);
  }
  function goBack() { setActiveGroup(null); setMode(null); }

  if (activeGroup && mode === "cards") return <CardsMode group={activeGroup} dark={dark} onBack={goBack} />;
  if (activeGroup && mode === "learn") return <LearnMode group={activeGroup} dark={dark} onBack={goBack} stats={stats} recordWordResult={recordWordResult} />;

  const TABS = [
    { id:"cards", label:"Карточки", icon:"🃏" },
    { id:"learn", label:"Изучение", icon:"📝" },
  ];

  return (
    <div className="pb-24 max-w-md mx-auto">
      <div className="px-4 pt-4 pb-3">
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Слова</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {WORD_CATEGORIES.reduce((s,c) => s + c.words.length, 0)} слов · {WORD_CATEGORIES.length} тем
        </p>
      </div>

      {/* Табы режима */}
      <div className="px-4 mb-4">
        <div className={`flex rounded-2xl p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1
                ${activeTab === t.id
                  ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow"
                  : dark ? "text-gray-400" : "text-gray-500"}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Список категорий */}
      <div className="px-4 flex flex-col gap-3">
        {WORD_CATEGORIES.map(group => {
          const colors = COLOR_MAP[group.color] || COLOR_MAP.blue;
          const { total, studied, pct } = groupProgress(group);
          const isEmpty  = !total;
          const done     = pct >= 80;

          return (
            <div key={group.id}
              onClick={() => !isEmpty && openGroup(group)}
              className={`rounded-2xl border p-4 transition-all
                ${isEmpty
                  ? dark ? "border-gray-800 opacity-40" : "border-gray-200 opacity-40"
                  : `${colors.border} ${colors.bg} cursor-pointer active:scale-[0.98]`}`}>

              {/* Шапка */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {done
                    ? <span className="text-lg">✅</span>
                    : studied > 0
                      ? <span className={`w-2.5 h-2.5 rounded-full ${colors.fill}`} />
                      : <span className="text-lg">{group.icon}</span>
                  }
                  <span className={`font-semibold text-base ${colors.text}`}>{group.name}</span>
                </div>
                {!isEmpty && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {studied === 0 ? `${total} слов` : done ? `${pct}% ✓` : `${studied}/${total}`}
                  </span>
                )}
              </div>

              {/* Прогресс-бар */}
              {!isEmpty && studied > 0 && (
                <div className={`h-1.5 rounded-full mb-2 ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div className={`h-1.5 rounded-full transition-all ${colors.fill}`}
                    style={{ width: `${pct}%` }} />
                </div>
              )}

              {/* Превью слов */}
              {!isEmpty && (
                <div className="flex gap-1.5 flex-wrap">
                  {group.words.slice(0, 5).map(w => (
                    <span key={w.id}
                      className={`text-xs px-2 py-0.5 rounded-lg border ${colors.border}
                        ${wordsCorrect[w.id] ? colors.bg : dark ? "bg-gray-800/50" : "bg-white/70"}
                        ${dark ? "text-gray-300" : "text-gray-600"}`}
                      style={{ fontFamily:"serif", direction:"rtl" }}>
                      {w.hebrew}
                    </span>
                  ))}
                  {group.words.length > 5 && (
                    <span className={`text-xs px-2 py-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      +{group.words.length - 5}
                    </span>
                  )}
                </div>
              )}

              {isEmpty && <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>Скоро</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Режим: Карточки ──────────────────────────────────────────────────────────
function CardsMode({ group, dark, onBack }) {
  const colors  = COLOR_MAP[group.color] || COLOR_MAP.blue;
  const words   = group.words;
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlipped] = useState(false);
  const audioRef = useRef(null);

  function playAudio(file) {
    if (!file) return;
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(`/words499/${file}`);
    audioRef.current.play().catch(() => {});
  }
  function next() { setFlipped(false); setTimeout(() => setIdx(i => (i+1) % words.length), 60); }
  function prev() { setFlipped(false); setTimeout(() => setIdx(i => (i-1+words.length) % words.length), 60); }

  const word = words[idx];
  if (!word) return null;

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
          ← {group.icon} {group.name}
        </button>
        <span className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>{idx+1} / {words.length}</span>
      </div>

      <div className={`h-1 rounded-full ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
        <div className={`h-1 rounded-full transition-all ${colors.fill}`} style={{width:`${((idx+1)/words.length)*100}%`}} />
      </div>

      <div className="cursor-pointer select-none" style={{perspective:"1000px"}}
        onClick={() => { if (!flipped) playAudio(word.audio); setFlipped(f => !f); }}>
        <div style={{transformStyle:"preserve-3d",transition:"transform 0.4s",transform:flipped?"rotateY(180deg)":"none",position:"relative",height:"280px"}}>
          <div style={{backfaceVisibility:"hidden",position:"absolute",inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-3 p-6 ${colors.border} ${dark?"bg-gray-800":"bg-white"}`}>
            <p className={`text-7xl font-bold ${dark?"text-white":"text-gray-900"}`} style={{direction:"rtl",fontFamily:"serif"}}>{word.hebrew}</p>
            <p className={`text-sm ${dark?"text-gray-500":"text-gray-400"}`}>Нажми — узнаешь перевод</p>
          </div>
          <div style={{backfaceVisibility:"hidden",transform:"rotateY(180deg)",position:"absolute",inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-4 p-6 ${colors.border} ${dark?"bg-gray-800":"bg-white"}`}>
            <p className={`text-4xl font-bold ${dark?"text-white":"text-gray-900"}`} style={{direction:"rtl",fontFamily:"serif"}}>{word.hebrew}</p>
            <div className="text-center">
              <p className={`text-2xl font-semibold ${dark?"text-white":"text-gray-900"}`}>{word.translation}</p>
              <p className={`text-base mt-1 ${colors.text}`}>{word.transliteration}</p>
            </div>
            {word.audio && (
              <button onClick={e=>{e.stopPropagation();playAudio(word.audio);}}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${colors.btn} text-white`}>
                🔊 Произношение
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={prev}
          className={`flex-1 py-4 rounded-2xl border font-semibold active:scale-95 transition-all ${dark?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>
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

// ─── Режим: Изучение ──────────────────────────────────────────────────────────
function LearnMode({ group, dark, onBack, stats, recordWordResult }) {
  const colors = COLOR_MAP[group.color] || COLOR_MAP.blue;
  const words  = group.words;

  const questions = useMemo(() => {
    // Дистракторы ТОЛЬКО из той же группы
    return shuffle(words).flatMap(word => {
      const sameGroup = words.filter(w => w.id !== word.id);
      const q = [];

      // иврит → перевод (дистракторы: переводы других слов группы)
      const wrongTr = shuffle(sameGroup).slice(0, 3).map(w => w.translation);
      q.push({ type:"heb_to_ru", word, correct:word.translation, options:shuffle([word.translation, ...wrongTr]) });

      // перевод → иврит (дистракторы: иврит других слов группы)
      const wrongHe = shuffle(sameGroup).slice(0, 3).map(w => w.hebrew);
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
        <span className="text-6xl">{pct>=80?"🏆":pct>=60?"🎯":"💪"}</span>
        <div>
          <p className={`text-xl font-bold ${dark?"text-white":"text-gray-900"}`}>Готово!</p>
          <p className={`text-5xl font-black mt-1 ${colors.text}`}>{pct}%</p>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>{correct} из {questions.length}</p>
        </div>
        <button onClick={onBack} className={`w-full py-4 rounded-2xl font-bold text-white ${colors.btn}`}>← К темам</button>
      </div>
    );
  }

  const q = questions[idx];
  const isHebToRu = q.type === "heb_to_ru";

  function handlePick(opt) {
    if (revealed) return;
    const isRight = opt === q.correct;
    setSelected(opt);
    setRevealed(true);
    if (isRight) {
      setCorrect(c => c+1);
      if (audioRef.current) audioRef.current.pause();
      if (q.word.audio) {
        audioRef.current = new Audio(`/words499/${q.word.audio}`);
        audioRef.current.play().catch(() => {});
      }
    }
    recordWordResult(q.word.id, isRight);
    setTimeout(() => { setIdx(i => i+1); setSelected(null); setRevealed(false); }, 900);
  }

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`text-sm font-medium ${dark?"text-gray-400":"text-gray-500"}`}>
          ← {group.icon} {group.name}
        </button>
        <span className={`text-sm font-medium ${dark?"text-emerald-400":"text-emerald-600"}`}>✓ {correct}</span>
      </div>

      <div className={`h-1.5 rounded-full ${dark?"bg-gray-800":"bg-gray-200"}`}>
        <div className={`h-1.5 rounded-full transition-all ${colors.fill}`} style={{width:`${(idx/questions.length)*100}%`}} />
      </div>
      <p className={`text-center text-xs ${dark?"text-gray-500":"text-gray-400"}`}>{idx+1} / {questions.length}</p>

      <p className={`text-center text-sm font-medium ${dark?"text-gray-300":"text-gray-700"}`}>
        {isHebToRu ? "Что означает это слово?" : "Найди слово на иврите:"}
      </p>

      <div className={`rounded-3xl border-2 ${colors.border} ${dark?"bg-gray-800":"bg-white"} h-44 flex items-center justify-center px-4`}>
        {isHebToRu
          ? <p className={`text-7xl font-bold ${dark?"text-white":"text-gray-900"}`} style={{direction:"rtl",fontFamily:"serif"}}>{q.word.hebrew}</p>
          : <p className={`text-2xl font-bold text-center ${dark?"text-white":"text-gray-900"}`}>{q.word.translation}</p>
        }
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          const isC = opt === q.correct;
          let cls = dark?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200 text-gray-800";
          if (revealed) {
            if (isC)               cls = dark?"bg-emerald-950 border-emerald-500 text-emerald-300":"bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (opt===selected) cls = dark?"bg-rose-950 border-rose-500 text-rose-300":"bg-rose-50 border-rose-400 text-rose-700";
          }
          return (
            <button key={opt} onClick={() => handlePick(opt)}
              className={`py-4 rounded-2xl border font-medium transition-all active:scale-95 ${cls} ${!isHebToRu?"text-2xl":"text-sm"}`}
              style={!isHebToRu?{direction:"rtl",fontFamily:"serif"}:{}}>
              {opt}{revealed&&isC?" ✓":""}{revealed&&opt===selected&&!isC?" ✗":""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
