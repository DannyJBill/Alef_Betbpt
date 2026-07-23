/**
 * ReadingScreen — 📖 Чтение
 * Теперь в стиле WordsScreen: два таба сверху → список блоков
 */
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { READING_BLOCKS, READING_ITEMS, PHRASE_LOCKS, getUnlockedPhraseLocks, getBlockCards } from "../data/reading";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { isReadingBlockUnlocked } from "../data/curriculum";
import { getKnownLetters, filterReadable } from "../helpers/vocab";
import { getFreshPortions } from "../helpers/progressHelpers";
import { getNodeStatus } from "../data/curriculum";
import { DECKS_UNLOCK_NODE } from "../data/decks";
import DecksScreen from "./DecksScreen";
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

// Палитра по id блока: R0.x — историческая, R1.x (уроки) — фиолетовая
function metaFor(blockId) {
  if (blockId === 'dict') return { ...BLOCK_META[1], gradient: "from-emerald-500 to-teal-600", fill: "bg-emerald-500" };
  if (blockId?.startsWith('VL')) return BLOCK_META[1];  // порции букв — emerald-семья
  if (blockId?.startsWith('VN')) return BLOCK_META[2];  // порции огласовок
  return BLOCK_META.lesson;
}

// Показывать транслит под словом-вопросом в квизе «что значит?».
// false — иврит голый (сама проверка чтения); true — транслит-подсказка везде.
const SHOW_TRANSLIT_IN_QUIZ = false;

function playAudio(filename) {
  if (!filename) return;
  new Audio(`/reading/${filename}`).play().catch(() => {});
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
// Экран больше не содержит логики построения вопросов.
// ─── Проверка — единый комплексный квиз (бывшие «Проверить» + «Тренажёр») ────
// Смешанная сессия из всех генераторов движка: узнавание (word_ru), активное
// припоминание (word_he), чтение без огласовок (no_nikud), печать (typing).
function QuizMode({ items, pool, blockN, dark, onBack, onAnswer }) {
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

// ─── Лента «Новое» УДАЛЕНА (этап 4): дублировала «Путь». ────────────────────

function PhraseLocksSection({ studied, dark }) {
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

// Статус слова в словаре по его прогрессу (для точки-индикатора и счётчиков).
// Восстановлено в этапе 3-fix: жил в снесённом FeedList.
function statusOf(w) {
  if (!w) return { label: "новое", dot: "bg-gray-300" };
  const reps = w.sm2?.repetitions || 0;
  const correct = w.correct || 0, wrong = w.wrong || 0;
  if (reps >= 2 || correct >= 3) return { label: "знаю", dot: "bg-emerald-500" };
  if (wrong > 0 && wrong >= correct) return { label: "слабое", dot: "bg-rose-500" };
  return { label: "изучается", dot: "bg-amber-400" };
}

function DictView({ stats, dark, onOpen, onOpenDecks, decksUnlocked }) {
  const [q, setQ] = useState("");
  const wordsMap = stats.readingProgress?.words || {};
  const studied = stats.readingProgress?.studied || [];
  // Только слова (фразы — в разделе «Ты уже можешь сказать»), только реально
  // существующие в контенте. Совпадает с базой заголовка «в словаре».
  const introduced = READING_ITEMS.filter(i => i.type !== 'phrase' && studied.includes(i.id));

  const known = introduced.filter(i => statusOf(wordsMap[i.id]).label === "знаю").length;
  const weak  = introduced.filter(i => statusOf(wordsMap[i.id]).label === "слабое").length;
  const nextFresh = getFreshPortions(stats)[0] || null; // следующая порция с новыми словами

  const shown = q.trim()
    ? introduced.filter(i =>
        i.translation.toLowerCase().includes(q.toLowerCase()) ||
        i.plain.includes(q) || i.hebrew.includes(q))
    : introduced;

  if (introduced.length === 0) {
    return (
      <div className="px-4 pt-8 text-center">
        <p className="text-4xl mb-3">📚</p>
        <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>
          Словарь пока пуст. Проходи уроки — новые слова из порций накапливаются здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 flex flex-col gap-3">
      {/* Сводка */}
      <div className={`rounded-2xl border p-4 ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
        <div className="flex justify-around text-center mb-3">
          <div><p className={`text-xl font-black ${dark?"text-white":"text-gray-900"}`}>{introduced.length}</p><p className="text-xs text-gray-400">в словаре</p></div>
          <div><p className="text-xl font-black text-emerald-500">{known}</p><p className="text-xs text-gray-400">знаю</p></div>
          <div><p className="text-xl font-black text-rose-400">{weak}</p><p className="text-xs text-gray-400">слабых</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onOpen('dict', 'cards')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
            🃏 Повторить
          </button>
          <button onClick={() => onOpen('dict', 'quiz')}
            disabled={introduced.length < 4}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 disabled:opacity-40
              ${dark?"border-gray-600 text-gray-200":"border-gray-300 text-gray-700"}`}>
            ✅ Проверить
          </button>
          <button onClick={() => decksUnlocked && onOpenDecks()}
            disabled={!decksUnlocked}
            title={decksUnlocked ? "Тематические колоды" : "Откроется после уровня 4"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 disabled:opacity-40
              ${dark?"border-indigo-500 text-indigo-400":"border-indigo-400 text-indigo-600"}`}>
            {decksUnlocked ? "➕ Ещё слова" : "🔒 Ещё слова"}
          </button>
        </div>
      </div>

      {/* Фразы-замки: «ты уже можешь сказать» */}
      <PhraseLocksSection studied={studied} dark={dark} />

      {/* Поиск */}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по словарю…"
        className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none
          ${dark?"bg-gray-800 border-gray-700 text-white placeholder-gray-500":"bg-white border-gray-200 text-gray-900"}`}/>

      {/* Список */}
      <div className={`rounded-2xl border divide-y ${dark?"bg-gray-800 border-gray-700 divide-gray-700":"bg-white border-gray-100 divide-gray-100"}`}>
        {shown.map(i => {
          const st = statusOf(wordsMap[i.id]);
          return (
            <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} title={st.label}/>
              <span className={`text-lg font-bold shrink-0 w-24 ${dark?"text-white":"text-gray-900"}`} dir="rtl">{i.hebrew}</span>
              <div className="min-w-0 flex-1 text-left">
                <p className={`text-sm truncate ${dark?"text-gray-300":"text-gray-700"}`}>{i.translation}</p>
                {i.transliteration && (
                  <p className="text-[11px] text-gray-400 truncate">{i.transliteration}</p>
                )}
              </div>
              {i.audio && (
                <button onClick={() => playAudio(i.audio)} className="text-base shrink-0 active:scale-95" aria-label="Озвучить">🔊</button>
              )}
              {i.lesson && <span className="text-[10px] text-gray-400 shrink-0">{i.lesson}</span>}
            </div>
          );
        })}
        {shown.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Ничего не найдено</p>}
      </div>
    </div>
  );
}

// ─── Главный экран: Словарь ───────────────────────────────────────────────────
// Единый поток слов через весь курс: «Новое» — лента порций по порядку курса,
// «Мой словарь» — накопитель всего введённого (карточки/квиз по всему словарю).
export default function ReadingScreen({ onBack, dictOnly, soloBlock }) {
  const { dark } = useTheme();
  const { stats, recordWordReview, recordWordAnswer } = useStats();
  const [activeMode, setActiveMode] = useState(null);
  const [activeBlock, setActiveBlock] = useState(null); // block id | 'dict'
  const [showDecks, setShowDecks] = useState(false);
  const decksUnlocked = getNodeStatus(DECKS_UNLOCK_NODE, stats) === 'done';

  const readingStudied = stats.readingProgress?.studied || [];
  const wordsMap = stats.readingProgress?.words || {};

  // Прямой переход из урока: «Изучить N новых слов»
  // initialBlock-эффект удалён (этап 4): лента снесена, порции открывает Путь.

  // Тематические колоды (этап 5) — вход по кнопке «Ещё слова»
  if (showDecks) return <DecksScreen onBack={() => setShowDecks(false)} CardsMode={CardsMode} />;

  // Solo-порция (экран «Путь»): сразу карточки, выход — в Путь
  if (soloBlock) {
    const block = READING_BLOCKS.find(b => b.id === soloBlock);
    const cards = block ? getBlockCards(block) : [];
    const items = getAvailableItems(cards, stats);
    return (
      <CardsMode
        items={items}
        blockN={soloBlock}
        dark={dark}
        onReview={recordWordReview}
        onBack={onBack}
      />
    );
  }

  // Режим внутри порции или по всему словарю
  if (activeMode && activeBlock !== null) {
    let items, pool;
    const introduced = READING_ITEMS.filter(i => readingStudied.includes(i.id));
    if (activeBlock === 'dict') {
      // Весь словарь: слабые и новые — первыми
      const weight = i => {
        const w = wordsMap[i.id] || {};
        return (w.wrong || 0) * 100 - (w.correct || 0) * 10 - (w.seen || 0);
      };
      items = [...introduced].sort((a, b) => weight(b) - weight(a));
      pool = introduced;
    } else {
      const block = READING_BLOCKS.find(b => b.id === activeBlock);
      const cards = block ? getBlockCards(block) : [];
      items = getAvailableItems(cards, stats);
      // Дистракторы — из порции + всего словаря
      pool = [...new Map([...items, ...introduced].map(i => [i.id, i])).values()];
    }

    const props = {
      items, pool,
      blockN: activeBlock,
      dark,
      onReview: recordWordReview,
      onAnswer: recordWordAnswer,
      onBack: () => { setActiveMode(null); setActiveBlock(null); },
    };

    return activeMode === 'cards'
      ? <CardsMode {...props} />
      : <QuizMode {...props} />;
  }

  // Только СЛОВА (не фразы — у них свой раздел), и только те, что реально есть
  // в контенте (фильтр по READING_ITEMS отсекает фантомные id из прогресса).
  const dictWords = READING_ITEMS.filter(i => i.type !== 'phrase');
  const introducedCount = dictWords.filter(i => readingStudied.includes(i.id)).length;
  const availWords = getAvailableItems(
    READING_BLOCKS.filter(b => isReadingBlockUnlocked(b, stats))
      .flatMap(b => b.items).filter(i => i.type !== 'phrase'),
    stats
  ).length;



  return (
    <div className="pb-24 max-w-md mx-auto">
      <div className="px-4 pt-4 pb-3">
        {onBack && (
          <button onClick={onBack}
            className={`flex items-center gap-1 mb-3 text-sm font-medium ${dark?"text-emerald-400":"text-emerald-600"}`}>
            ← Учиться
          </button>
        )}
        <h2 className={`text-xl font-bold ${dark?"text-white":"text-gray-900"}`}>Словарь</h2>
        <p className={`text-sm mt-0.5 ${dark?"text-gray-400":"text-gray-500"}`}>
          {introducedCount} слов в словаре · {Math.max(availWords - introducedCount, 0)} новых доступно
        </p>
      </div>

      {/* Единственный вид — «Мой словарь» (лента «Новое» снесена, этап 4) */}
      <DictView stats={stats} dark={dark}
        decksUnlocked={decksUnlocked}
        onOpenDecks={() => setShowDecks(true)}
        onOpen={(blockId, mode) => { setActiveBlock(blockId); setActiveMode(mode); }} />
    </div>
  );
}
