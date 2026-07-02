/**
 * ReadingScreen — 📖 Чтение
 * Теперь в стиле WordsScreen: два таба сверху → список блоков
 */
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { READING_BLOCKS, READING_ITEMS, getBlockCards } from "../data/reading";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { isReadingBlockUnlocked } from "../data/curriculum";
import { getKnownLetters, filterReadable } from "../helpers/vocab";
import { shuffle } from "../helpers/utils";

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

function playAudio(filename) {
  if (!filename) return;
  const a = new Audio(`/reading/${filename}`);
  a.play().catch(() => {
    const b = new Audio(`/words499/${filename}`);
    b.play().catch(() => {});
  });
}

// Единая проверка «читаемо по буквам» — helpers/vocab.js
// (финальные формы ך ם ן ף ץ считаются по базовой букве)
function getAvailableItems(blockItems, stats) {
  const known = getKnownLetters(stats.progress?.letters, ALPHABET, LETTER_GROUPS);
  return filterReadable(blockItems, known);
}

// ─── Карточки (флип) ──────────────────────────────────────────────────────────
const CHUNK = 8; // размер серии карточек: порция — единица контента, серия — единица усилия

function CardsMode({ items, blockN, dark, onBack, onSeen }) {
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
    onSeen(item.id);
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

// ─── Учиться (quiz) ───────────────────────────────────────────────────────────
function LearnMode({ items, pool, blockN, dark, onBack, onAnswer }) {
  const m = metaFor(blockN);
  const SESSION = Math.min(items.length, 10);
  const queue = useRef(shuffle([...items]).slice(0, SESSION));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  if (done) {
    const pct = Math.round((score/SESSION)*100);
    return (
      <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-5xl mb-3">{pct>=80?"🎉":"💪"}</div>
        <h2 className={`text-xl font-bold mb-1 ${dark?"text-white":"text-gray-900"}`}>{pct>=80?"Отлично!":"Продолжай!"}</h2>
        <p className={`text-4xl font-black mb-1 ${dark?"text-indigo-400":"text-indigo-600"}`}>{pct}%</p>
        <p className={`text-sm mb-6 ${dark?"text-gray-400":"text-gray-500"}`}>{score}/{SESSION} правильных</p>
        <button onClick={onBack}
          className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${m.gradient}`}>
          Назад
        </button>
      </div>
    );
  }

  const current = queue.current[idx];
  // Дистракторы — из общего пула (весь словарь), не только из порции
  const distractorSource = (pool && pool.length >= 4) ? pool : items;
  const distractors = shuffle(distractorSource.filter(w => w.id !== current?.id)).slice(0, 3);
  const choices = current ? shuffle([current, ...distractors]) : [];

  function answer(ch) {
    if (selected !== null) return;
    setSelected(ch.id);
    const ok = ch.id === current.id;
    if (ok) setScore(s => s+1);
    onAnswer(current.id, ok);
    timer.current = setTimeout(() => {
      setSelected(null);
      if (idx+1 >= SESSION) setDone(true);
      else setIdx(i => i+1);
    }, 600);
  }

  return (
    <div className="pb-4 px-4 pt-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>← Назад</button>
        <span className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{idx+1}/{SESSION}</span>
        <span className={`text-sm font-bold ${dark?"text-yellow-400":"text-yellow-600"}`}>⚡{score}</span>
      </div>
      <div className={`h-1.5 rounded-full mb-4 ${dark?"bg-gray-700":"bg-gray-200"}`}>
        <div className={`h-full rounded-full ${m.fill} transition-all`}
          style={{width:`${Math.round(((idx+1)/SESSION)*100)}%`}}/>
      </div>

      <p className={`text-xs text-center mb-3 font-medium ${dark?"text-gray-500":"text-gray-400"}`}>Что значит?</p>

      <div className={`rounded-3xl flex flex-col items-center justify-center mb-5 min-h-[110px]
        ${dark?"bg-gray-800":"bg-white border border-gray-100 shadow-sm"}`}>
        <span style={{fontFamily:"serif", fontSize:46, direction:"rtl"}}
          className={dark?"text-white":"text-gray-900"}>{current?.hebrew}</span>
        {current?.audio && (
          <button onClick={() => playAudio(current.audio)}
            className="text-xl mt-1 active:scale-95">🔊</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map(ch => {
          const isSel = selected === ch.id;
          const isOk = ch.id === current?.id;
          let cls = dark
            ? "bg-gray-800 text-white border border-gray-700"
            : "bg-white text-gray-800 border-2 border-gray-100 shadow-sm";
          if (selected !== null) {
            if (isOk) cls = "bg-emerald-500 text-white border-emerald-500";
            else if (isSel) cls = "bg-red-400 text-white border-red-400";
          }
          return (
            <button key={ch.id} onClick={() => answer(ch)}
              className={`py-4 px-2 rounded-2xl font-medium text-sm transition-all active:scale-95 ${cls}`}>
              {ch.translation}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Лента «Новое» — единый поток порций слов через весь курс ────────────────
// Порция = блок чтения. Открывается этапом курса (группа букв/огласовок или урок).
// Слова из порции падают в накопительный словарь и дальше живут в «Мой словарь».
function FeedList({ stats, dark, readingStudied, onOpen }) {
  const portions = [...READING_BLOCKS]
    .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999))
    .map((block) => {
    const unlocked = isReadingBlockUnlocked(block, stats);
    const cards = getBlockCards(block);
    const available = unlocked ? getAvailableItems(cards, stats) : [];
    const studied = available.filter(w => readingStudied.includes(w.id)).length;
    const pct = available.length ? Math.round((studied / available.length) * 100) : 0;
    const m = metaFor(block.id);
    const title = block.lesson ? `Урок ${block.lesson} · ${block.title}` : block.title;
    const sub = block.lesson ? `после урока ${block.lesson}` : block.unlockLabel;
    return { block, m, title, sub, unlocked, available, studied, pct };
  });

  return (
    <div className="px-4 flex flex-col gap-3">
      {portions.map(({ block, m, title, sub, unlocked, available, studied, pct }) => {
        const complete = unlocked && available.length > 0 && studied >= available.length;
        if (!unlocked) {
          return (
            <div key={block.id}
              className={`rounded-2xl border p-4 opacity-60 ${dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${dark?"text-gray-300":"text-gray-600"}`}>{title}</p>
                  <p className="text-xs text-gray-400">Откроется: {sub} · {block.items.length} слов</p>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id} className={`rounded-2xl border p-4 ${m.bg} ${m.border}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{complete ? "✅" : "📖"}</span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${m.text}`}>{title}</p>
                  <p className="text-xs text-gray-400">
                    {available.length} слов · {studied} изучено
                    {block.review?.length > 0 && ` · 🔄 ${block.review.length} на повторение`}
                  </p>
                  {block.mode === 'preview' && (
                    <p className="text-[10px] text-gray-400 mt-0.5">🔊 на слух: транслит и звук ведут — никуд впереди</p>
                  )}
                  {!block.lesson && !complete && (
                    <p className="text-[10px] font-medium text-amber-600 mt-0.5">⭐ обязательная — откроет следующий урок</p>
                  )}
                </div>
              </div>
              {complete && <span className="text-xs font-bold text-emerald-600 shrink-0">100%</span>}
            </div>
            <div className={`h-1.5 rounded-full mb-3 ${dark?"bg-gray-700":"bg-white/70"}`}>
              <div className={`h-full rounded-full ${m.fill} transition-all`} style={{width:`${pct}%`}}/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onOpen(block.id, 'cards')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${m.gradient}`}>
                🃏 Карточки
              </button>
              <button onClick={() => onOpen(block.id, 'learn')}
                disabled={available.length < 4}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 disabled:opacity-40
                  ${dark?"border-gray-600 text-gray-200":"border-gray-300 text-gray-700"}`}>
                📝 Учиться
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── «Мой словарь» — накопитель всех введённых слов ──────────────────────────
function statusOf(w) {
  if (!w) return { dot: "bg-gray-300", label: "новое" };
  if ((w.correct || 0) >= 2 && (w.correct || 0) > (w.wrong || 0)) return { dot: "bg-emerald-500", label: "знаю" };
  if ((w.wrong || 0) > (w.correct || 0)) return { dot: "bg-rose-400", label: "слабое" };
  return { dot: "bg-amber-400", label: "учу" };
}

function DictView({ stats, dark, onOpen }) {
  const [q, setQ] = useState("");
  const wordsMap = stats.readingProgress?.words || {};
  const studied = stats.readingProgress?.studied || [];
  const introduced = READING_ITEMS.filter(i => studied.includes(i.id));

  const known = introduced.filter(i => statusOf(wordsMap[i.id]).label === "знаю").length;
  const weak  = introduced.filter(i => statusOf(wordsMap[i.id]).label === "слабое").length;

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
          Словарь пока пуст. Открой порцию во вкладке «Новое» — изученные слова накапливаются здесь.
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
          <button onClick={() => onOpen('dict', 'learn')}
            disabled={introduced.length < 4}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 disabled:opacity-40
              ${dark?"border-gray-600 text-gray-200":"border-gray-300 text-gray-700"}`}>
            📝 Проверить
          </button>
        </div>
      </div>

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
              <span className={`text-lg font-bold shrink-0 ${dark?"text-white":"text-gray-900"}`} dir="rtl">{i.hebrew}</span>
              <span className={`text-sm truncate flex-1 text-left ${dark?"text-gray-400":"text-gray-500"}`}>{i.translation}</span>
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
export default function ReadingScreen({ onBack, initialBlock, dictOnly, soloBlock }) {
  const { dark } = useTheme();
  const { stats, recordWordSeen, recordWordAnswer } = useStats();
  const [tab, setTab] = useState(dictOnly ? 'dict' : 'feed'); // feed | dict
  const [activeMode, setActiveMode] = useState(null);
  const [activeBlock, setActiveBlock] = useState(null); // block id | 'dict'

  const readingStudied = stats.readingProgress?.studied || [];
  const wordsMap = stats.readingProgress?.words || {};

  // Прямой переход из урока: «Изучить N новых слов»
  useEffect(() => {
    if (initialBlock && READING_BLOCKS.some(b => b.id === initialBlock)) {
      setActiveBlock(initialBlock);
      setActiveMode('cards');
    }
  }, [initialBlock]);

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
        onSeen={recordWordSeen}
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
      onSeen: recordWordSeen,
      onAnswer: recordWordAnswer,
      onBack: () => { setActiveMode(null); setActiveBlock(null); },
    };

    return activeMode === 'cards'
      ? <CardsMode {...props} />
      : <LearnMode {...props} />;
  }

  const introducedCount = readingStudied.length;
  const totalAvail = getAvailableItems(
    READING_BLOCKS.filter(b => isReadingBlockUnlocked(b, stats)).flatMap(b => b.items), stats
  ).length;

  const TABS = [
    { id:'feed', icon:'✨', label:'Новое' },
    { id:'dict', icon:'📚', label:'Мой словарь' },
  ];

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
          {introducedCount} слов накоплено · {Math.max(totalAvail - introducedCount, 0)} новых доступно
        </p>
      </div>

      {/* Табы */}
      {!dictOnly && (
      <div className="px-4 mb-4">
        <div className={`flex rounded-2xl p-1 ${dark?"bg-gray-800":"bg-gray-100"}`}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5
                ${tab === t.id
                  ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow"
                  : dark ? "text-gray-400" : "text-gray-500"}`}
            >
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {tab === 'feed'
        ? <FeedList stats={stats} dark={dark} readingStudied={readingStudied}
            onOpen={(blockId, mode) => { setActiveBlock(blockId); setActiveMode(mode); }} />
        : <DictView stats={stats} dark={dark}
            onOpen={(blockId, mode) => { setActiveBlock(blockId); setActiveMode(mode); }} />}
    </div>
  );
}
