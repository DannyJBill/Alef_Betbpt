/**
 * ReadingScreen — сессии по словам порций курса.
 *
 * После объединения экранов словаря (см. VocabularyScreen.jsx) этот файл
 * отвечает только за:
 *   - soloBlock — карточки свежей порции при прохождении «Пути» (StudyScreen);
 *   - CardsMode/QuizMode/PhraseLocksSection — переиспользуемые компоненты
 *     сессий, которые VocabularyScreen запускает над ЛЮБЫМ подмножеством
 *     словаря (весь словарь / модуль курса), не только над порцией.
 * Раньше здесь же жил DictView («Мой словарь») — теперь это VocabularyScreen.
 */
import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { READING_BLOCKS, PHRASE_LOCKS, getUnlockedPhraseLocks, getBlockCards } from "../data/reading";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { getKnownLetters, filterReadable } from "../helpers/vocab";
import { getLessonWordMeta, playAudio } from "../helpers/dictionary";
import { shuffle } from "../helpers/utils";
import { buildSession, fromReadingItem } from "../helpers/exercises";
import ExerciseSession from "../components/ui/ExerciseSession";

const BLOCK_META = {
  1: { label:"Блок 1", gradient:"from-emerald-500 to-teal-600",   fill:"bg-emerald-500", border:"border-emerald-200", bg:"bg-emerald-50", text:"text-emerald-700" },
  2: { label:"Блок 2", gradient:"from-blue-500 to-cyan-600",      fill:"bg-blue-500",    border:"border-blue-200",   bg:"bg-blue-50",    text:"text-blue-700"    },
  3: { label:"Блок 3", gradient:"from-amber-500 to-orange-600",   fill:"bg-amber-500",   border:"border-amber-200",  bg:"bg-amber-50",   text:"text-amber-700"   },
  4: { label:"Блок 4", gradient:"from-rose-500 to-pink-600",      fill:"bg-rose-500",    border:"border-rose-200",   bg:"bg-rose-50",    text:"text-rose-700"    },
  lesson: { label:"Урок", gradient:"from-violet-500 to-purple-600", fill:"bg-violet-500",  border:"border-violet-200", bg:"bg-violet-50",  text:"text-violet-700"  },
};

// Палитра по id блока: R0.x — историческая, R1.x (уроки) — фиолетовая.
// 'dict'/'chapter' — сессии VocabularyScreen над произвольным подмножеством
// словаря (весь словарь / модуль курса) — emerald-семья, как и порции букв.
function metaFor(blockId) {
  if (blockId === 'dict' || blockId === 'chapter') return { ...BLOCK_META[1], gradient: "from-emerald-500 to-teal-600", fill: "bg-emerald-500" };
  if (blockId?.startsWith('VL')) return BLOCK_META[1];  // порции букв — emerald-семья
  if (blockId?.startsWith('VN')) return BLOCK_META[2];  // порции огласовок
  return BLOCK_META.lesson;
}

// Единая проверка «читаемо по буквам» — helpers/vocab.js
// (финальные формы ך ם ן ף ץ считаются по базовой букве)
function getAvailableItems(blockItems, stats) {
  const known = getKnownLetters(stats.progress?.letters, ALPHABET, LETTER_GROUPS);
  return filterReadable(blockItems, known);
}

// ─── Карточки (флип) ──────────────────────────────────────────────────────────
const CHUNK = 8; // размер серии карточек: порция — единица контента, серия — единица усилия

export function CardsMode({ items, blockN, dark, onBack, onReview }) {
  const m = metaFor(blockN);
  const queue = useRef(shuffle([...items]));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [rest, setRest] = useState(false); // пауза между сериями

  if (done || idx >= queue.current.length) {
    return (
      <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className={`text-xl font-bold mb-2 ${dark?"text-white":"text-gray-900"}`}>Просмотрено!</h2>
        <p className={`text-sm mb-6 ${dark?"text-gray-400":"text-gray-500"}`}>{queue.current.length} карточек</p>
        <button onClick={onBack}
          className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${m.gradient}`}>
          Назад
        </button>
      </div>
    );
  }

  if (rest) {
    const left = queue.current.length - idx;
    return (
      <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-5xl mb-4">💪</div>
        <h2 className={`text-xl font-bold mb-2 ${dark?"text-white":"text-gray-900"}`}>Серия пройдена!</h2>
        <p className={`text-sm mb-6 ${dark?"text-gray-400":"text-gray-500"}`}>Осталось {left} карточек</p>
        <button onClick={() => setRest(false)}
          className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${m.gradient} mb-3`}>
          Ещё {Math.min(CHUNK, left)} →
        </button>
        <button onClick={onBack}
          className={`w-full py-3 rounded-2xl border font-medium ${dark?"border-gray-700 text-gray-400":"border-gray-200 text-gray-500"}`}>
          Продолжить позже
        </button>
      </div>
    );
  }

  const item = queue.current[idx];

  function rate(q) {
    onReview(item.id, q);
    setFlipped(false);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= queue.current.length) setDone(true);
      else {
        setIdx(next);
        if (next % CHUNK === 0) setRest(true);
      }
    }, 180);
  }

  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className={`text-sm font-medium ${dark?"text-gray-400":"text-gray-500"}`}>← Назад</button>
        <span className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>
          {item.isReview && <span className="mr-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">повторение</span>}
          {idx+1}/{queue.current.length}
        </span>
        <div className="w-12"/>
      </div>
      <div className={`h-1.5 rounded-full mb-5 ${dark?"bg-gray-700":"bg-gray-200"}`}>
        <div className={`h-full rounded-full ${m.fill} transition-all`}
          style={{width:`${Math.round(((idx+1)/queue.current.length)*100)}%`}}/>
      </div>

      <div className="cursor-pointer" style={{perspective:"800px"}}
        onClick={() => !flipped && setFlipped(true)}>
        <div style={{
          transformStyle:"preserve-3d", transition:"transform 0.4s",
          transform: flipped ? "rotateY(180deg)" : "none",
          position:"relative", height:"220px",
        }}>
          <div style={{backfaceVisibility:"hidden", position:"absolute", inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-2
              ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
            <span style={{fontFamily:"serif", fontSize:52, direction:"rtl"}}
              className={dark?"text-white":"text-gray-900"}>{item.hebrew}</span>
            {item.plain && item.plain !== item.hebrew && (
              <span style={{fontFamily:"serif", fontSize:20, direction:"rtl"}}
                className={dark?"text-gray-500":"text-gray-400"}>{item.plain}</span>
            )}
            <p className={`text-xs ${dark?"text-gray-600":"text-gray-300"}`}>нажми — увидишь ответ</p>
          </div>
          <div style={{backfaceVisibility:"hidden", transform:"rotateY(180deg)", position:"absolute", inset:0}}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-3 p-6
              ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
            <span style={{fontFamily:"serif", fontSize:30, direction:"rtl"}}
              className={dark?"text-gray-400":"text-gray-500"}>{item.hebrew}</span>
            <p className={`text-2xl font-bold ${dark?"text-white":"text-gray-900"}`}>{item.translation}</p>
            {item.transliteration && (
              <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{item.transliteration}</p>
            )}
            {item.audio && (
              <button onClick={e => {e.stopPropagation(); playAudio(item.audio);}}
                className="text-2xl active:scale-95 mt-1">🔊</button>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            {q:0,label:"Снова",  emoji:"✗", cls:dark?"bg-rose-950 border-rose-800 text-rose-300"   :"bg-rose-50 border-rose-200 text-rose-600"},
            {q:1,label:"Трудно", emoji:"〜", cls:dark?"bg-amber-950 border-amber-800 text-amber-300":"bg-amber-50 border-amber-200 text-amber-600"},
            {q:2,label:"Легко",  emoji:"✓", cls:dark?"bg-emerald-950 border-emerald-800 text-emerald-300":"bg-emerald-50 border-emerald-200 text-emerald-600"},
          ].map(btn => (
            <button key={btn.q} onClick={() => rate(btn.q)}
              className={`py-4 rounded-2xl border font-semibold flex flex-col items-center gap-1 active:scale-95 transition-all ${btn.cls}`}>
              <span className="text-xl">{btn.emoji}</span>
              <span className="text-xs">{btn.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Учиться (quiz) — через ДВИЖОК УПРАЖНЕНИЙ ────────────────────────────────
// Генерация вопросов: helpers/exercises.js (word_ru), рендер: ExerciseSession.
// Проверка — единый комплексный квиз: узнавание (word_ru), активное
// припоминание (word_he), чтение без огласовок (no_nikud), печать (typing).
export function QuizMode({ items, pool, blockN, dark, onBack, onAnswer }) {
  const m = metaFor(blockN);
  const src = items.map(fromReadingItem);
  const pl  = pool.map(fromReadingItem);
  const questions = useRef(buildSession([
    { gen: 'word_ru',  sources: src, pool: pl, take: 4 },
    { gen: 'word_he',  sources: src, pool: pl, take: 3 },
    { gen: 'no_nikud', sources: src, pool: pl, take: 3 },
    { gen: 'typing',   sources: src, pool: pl, take: 2 },
  ])).current;
  return (
    <ExerciseSession
      questions={questions} dark={dark}
      title="Проверка"
      accent={{ grad: m.gradient, fill: m.fill }}
      onAnswer={(id, ok) => id && onAnswer(id, ok)}
      onFinish={() => {}}
      onBack={onBack}
    />
  );
}

/** «Ты уже можешь сказать» — фразы-замки, разблокирующиеся по мере накопления словаря. */
export function PhraseLocksSection({ studied, dark }) {
  const unlocked = getUnlockedPhraseLocks(studied);
  const lockedCount = PHRASE_LOCKS.length - unlocked.length;
  if (unlocked.length === 0 && lockedCount === 0) return null;
  return (
    <div className={`rounded-2xl border p-4 ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
      <p className={`text-sm font-bold mb-1 ${dark?"text-white":"text-gray-900"}`}>✨ Ты уже можешь сказать</p>
      {unlocked.length === 0 ? (
        <p className="text-xs text-gray-400">Учи слова — фразы из них будут открываться здесь.</p>
      ) : (
        <div className={`divide-y ${dark?"divide-gray-700":"divide-gray-100"}`}>
          {unlocked.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${dark?"text-white":"text-gray-900"}`} dir="rtl">{p.hebrew}</span>
                {p.audio && (
                  <button onClick={() => playAudio(p.audio)}
                    className="text-sm opacity-60 active:scale-95">🔊</button>
                )}
              </div>
              <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{p.transliteration} — {p.translation}</p>
            </div>
          ))}
        </div>
      )}
      {lockedCount > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">🔒 ещё {lockedCount} — откроются с новыми словами</p>
      )}
    </div>
  );
}

// ─── Экран: карточки свежей порции (StudyScreen «Путь») ─────────────────────
export default function ReadingScreen({ onBack, soloBlock }) {
  const { dark } = useTheme();
  const { stats, recordWordReview } = useStats();

  const block = READING_BLOCKS.find(b => b.id === soloBlock);
  const cards = block ? getBlockCards(block) : [];
  const items = getAvailableItems(cards, stats);
  return (
    <CardsMode
      items={items}
      blockN={soloBlock}
      dark={dark}
      onReview={(id, q) => recordWordReview(id, q, getLessonWordMeta(id))}
      onBack={onBack}
    />
  );
}
