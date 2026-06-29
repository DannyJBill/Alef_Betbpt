/**
 * StudyScreen — 📚 Учиться
 *
 * Хаб для всех учебных модулей.
 * Секции: alphabet | nikud | reading | words
 * Каждая секция рендерит соответствующий экран.
 */

import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import { WORD_CATEGORIES } from "../data/words";
import { levelProgress, WORDS_UNLOCK_THRESHOLD } from "../data/constants";
import { checkWordsUnlock, checkReadingUnlock } from "../helpers/progressHelpers";

import AlphabetScreen from "./AlphabetScreen";
import NikudScreen    from "./NikudScreen";
import WordsScreen    from "./WordsScreen";
import ReadingScreen  from "./ReadingScreen";

// ─── Цвета секций ──────────────────────────────────────────────────────────────
const SEC_COLORS = {
  alphabet: { from:"from-indigo-500",  to:"to-purple-600",  light:"bg-indigo-50 dark:bg-indigo-900/20",  text:"text-indigo-600 dark:text-indigo-400",  bar:"bg-indigo-500",  border:"border-indigo-200 dark:border-indigo-800" },
  nikud:    { from:"from-blue-500",    to:"to-cyan-600",    light:"bg-blue-50 dark:bg-blue-900/20",      text:"text-blue-600 dark:text-blue-400",      bar:"bg-blue-500",    border:"border-blue-200 dark:border-blue-800" },
  reading:  { from:"from-emerald-500", to:"to-teal-600",    light:"bg-emerald-50 dark:bg-emerald-900/20",text:"text-emerald-600 dark:text-emerald-400", bar:"bg-emerald-500", border:"border-emerald-200 dark:border-emerald-800" },
  words:    { from:"from-amber-500",   to:"to-orange-600",  light:"bg-amber-50 dark:bg-amber-900/20",    text:"text-amber-600 dark:text-amber-400",     bar:"bg-amber-500",   border:"border-amber-200 dark:border-amber-800" },
};

const SECTIONS = [
  { id:"alphabet", icon:"🔤", label:"Буквы",     sub:"22 буквы · 5 групп" },
  { id:"nikud",    icon:"📖", label:"Огласовки", sub:"9 знаков · 5 групп" },
  { id:"reading",  icon:"🗣️", label:"Чтение",   sub:"Слоги и слова" },
  { id:"words",    icon:"💬", label:"Разговор",  sub:"Слова и фразы" },
];

function useSectionStats(stats) {
  const p = stats.progress || {};
  const ts = stats.testScores || {};
  const pct = (sectionP) => {
    const done = [1,2,3,4,5].filter(n => sectionP?.[n] === "done").length;
    return Math.round((done / 5) * 100);
  };
  const alphaDone = [1,2,3,4,5].filter(n=>p.letters?.[n]==="done").length;
  const nikudDone = [1,2,3,4,5].filter(n=>p.sounds?.[n]==="done").length;
  const readingUnlocked = checkReadingUnlock(1, p);
  const wordsUnlocked   = checkWordsUnlock(1, ts);
  const totalWords = WORD_CATEGORIES.reduce((s,c)=>s+c.words.length,0);
  const learnedW   = Object.keys(stats.wordsCorrect||{}).filter(k=>(stats.wordsCorrect[k]||0)>=2).length;
  const l2score = ts['letters_2'] || 0;
  const s2score = ts['sounds_2']  || 0;

  return {
    alphabet: { pct: pct(p.letters), sub:`${alphaDone}/5 групп`, unlocked:true },
    nikud:    { pct: pct(p.sounds),  sub: p.letters?.[2]==='done'||p.sounds?.[1]==='available'||p.sounds?.[1]==='done' ? `${nikudDone}/5 групп` : "После Букв гр.1+2", unlocked: p.letters?.[1]==='done' && p.letters?.[2]==='done' },
    reading:  { pct: 0, sub: readingUnlocked ? "Доступно" : `Буквы 1 + Звуки 1`, unlocked: readingUnlocked },
    words:    {
      pct: totalWords ? Math.round((learnedW/totalWords)*100) : 0,
      sub: wordsUnlocked ? `${learnedW}/${totalWords} слов` : `Буквы 2 (${l2score}%) + Звуки 2 (${s2score}%) ≥${WORDS_UNLOCK_THRESHOLD}%`,
      unlocked: wordsUnlocked
    },
  };
}



// ─── Карточка секции ──────────────────────────────────────────────────────────
function SectionCard({ section, stat, dark, onClick }) {
  const c = SEC_COLORS[section.id];
  const locked = !stat.unlocked;

  return (
    <button onClick={() => !locked && onClick(section.id)}
      disabled={locked}
      className={`rounded-2xl p-4 border text-left transition-all w-full
        ${locked
          ? dark ? "opacity-40 bg-gray-800 border-gray-700" : "opacity-40 bg-gray-50 border-gray-200"
          : dark ? `${c.light} ${c.border} active:scale-[0.98]` : `${c.light} ${c.border} active:scale-[0.98]`
        }`}>
      <div className="flex items-center gap-3">
        {/* Иконка */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.from} ${c.to} flex items-center justify-center text-2xl flex-shrink-0
          ${locked ? "opacity-50 grayscale" : ""}`}>
          {locked ? "🔒" : section.icon}
        </div>
        {/* Текст */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-gray-900">{section.label}</span>
            <span className={`text-xs font-bold ${locked ? "text-gray-400" : c.text}`}>
              {locked ? "Закрыто" : stat.pct >= 100 ? "✅" : `${stat.pct}%`}
            </span>
          </div>
          <p className={"text-xs mb-1.5 text-gray-500"}>{stat.sub}</p>
          {!locked && (
            <div className={`h-1.5 rounded-full ${dark?"bg-gray-700":"bg-gray-200"}`}>
              <div className={`h-full rounded-full transition-all ${c.bar}`}
                style={{ width:`${stat.pct}%` }} />
            </div>
          )}
        </div>
        {!locked && <span className="text-lg flex-shrink-0 text-gray-400">›</span>}
      </div>
    </button>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function StudyScreen({ initialSection, onClearSection }) {
  const { dark } = useTheme();
  const { stats } = useStats();
  const [section, setSection] = useState(initialSection || null);
  const [alphaMode, setAlphaMode] = useState(null);

  const secStats = useSectionStats(stats);

  // Когда App.jsx передаёт initialSection через navigateToStudy
  useEffect(() => {
    if (initialSection) {
      setSection(initialSection);
      onClearSection?.();
    }
  }, [initialSection]);

  function openSection(id) { setSection(id); setAlphaMode(null); }
  function goBack() { setSection(null); setAlphaMode(null); }

  // ── Рендер активной секции ─────────────────────────────────────────────────
  if (section === "alphabet") return (
    <AlphabetScreen
      activeMode={alphaMode}
      setActiveMode={setAlphaMode}
      onBack={goBack}
    />
  );
  if (section === "nikud")   return <NikudScreen onBack={goBack} />;
  if (section === "reading") return <ReadingScreen onBack={goBack} />;
  if (section === "words")   return <WordsScreen onBack={goBack} />;

  // ── Список секций ──────────────────────────────────────────────────────────
  const alphaDoneGroups = Object.values(stats.groupProgress||{}).filter(v=>v==="completed").length;
  const dueCards = stats.cardReviews ? Object.keys(stats.cardReviews).length : 0;

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto flex flex-col gap-3">
      <div className="pt-1 pb-1">
        <h2 className={`text-xl font-bold ${dark?"text-white":"text-gray-900"}`}>Учиться</h2>
        <p className={`text-xs mt-0.5 ${dark?"text-gray-400":"text-gray-500"}`}>Выбери раздел или продолжи с того места</p>
      </div>

      {/* Кнопка "Продолжить" — умный быстрый старт */}
      <ContinueButton stats={stats} secStats={secStats} dark={dark} onOpen={openSection} />

      {/* Секции */}
      {SECTIONS.map(s => (
        <SectionCard key={s.id} section={s} stat={secStats[s.id]} dark={dark} onClick={openSection} />
      ))}
    </div>
  );
}

// ─── Умная кнопка "Продолжить" ────────────────────────────────────────────────
function ContinueButton({ stats, secStats, dark, onOpen }) {
  // Определяем что сейчас актуальнее всего
  const p  = stats.progress || {};
  const ts = stats.testScores || {};
  const alphaDone = [1,2,3,4,5].filter(n=>p.letters?.[n]==="done").length;
  const nikudDone = [1,2,3,4,5].filter(n=>p.sounds?.[n]==="done").length;
  const dueCards   = Object.entries(stats.cardReviews||{}).filter(([,r]) => {
    if (!r?.nextReview) return false;
    return new Date(r.nextReview) <= new Date();
  }).length;

  let target = "alphabet";
  let label  = "Учить буквы";
  let sub    = alphaDone < 5 ? `Группа ${alphaDone + 1} из 5` : "Повторить алфавит";

  if (dueCards > 0) { label = `Повторить ${dueCards} букв`; sub = "SM-2 карточки готовы"; }
  else if (alphaDone >= 1 && nikudDone < 5) { target = "nikud"; label = "Учить огласовки"; sub = `Группа ${nikudDone + 1} из 5`; }
  else if (nikudDone >= 5) { target = "words"; label = "Учить слова"; sub = "Словарный тренажёр"; }

  return (
    <button onClick={() => onOpen(target)}
      className="w-full rounded-2xl p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-left active:scale-[0.98] transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">▶ Продолжить</p>
          <p className="text-xs opacity-80 mt-0.5">{label} · {sub}</p>
        </div>
        <span className="text-2xl">→</span>
      </div>
    </button>
  );
}
