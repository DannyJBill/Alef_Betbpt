/**
 * ReadingScreen — 📖 Чтение
 * Теперь в стиле WordsScreen: два таба сверху → список блоков
 */
import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { READING_ITEMS } from "../data/reading";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { checkReadingUnlock } from "../helpers/progressHelpers";
import { shuffle } from "../helpers/utils";

const NIKUD_CHARS = new Set('ֱֲֳִֵֶַָֹֻּׁׂ');

const BLOCK_META = {
  1: { label:"Блок 1", gradient:"from-emerald-500 to-teal-600",   fill:"bg-emerald-500", border:"border-emerald-200", bg:"bg-emerald-50", text:"text-emerald-700" },
  2: { label:"Блок 2", gradient:"from-blue-500 to-cyan-600",      fill:"bg-blue-500",    border:"border-blue-200",   bg:"bg-blue-50",    text:"text-blue-700"    },
  3: { label:"Блок 3", gradient:"from-amber-500 to-orange-600",   fill:"bg-amber-500",   border:"border-amber-200",  bg:"bg-amber-50",   text:"text-amber-700"   },
  4: { label:"Блок 4", gradient:"from-rose-500 to-pink-600",      fill:"bg-rose-500",    border:"border-rose-200",   bg:"bg-rose-50",    text:"text-rose-700"    },
};

function playAudio(filename) {
  if (!filename) return;
  const a = new Audio(`/reading/${filename}`);
  a.play().catch(() => {
    const b = new Audio(`/words499/${filename}`);
    b.play().catch(() => {});
  });
}

function getAvailableItems(blockItems, stats) {
  const p = stats.progress || {};
  const doneGroups = [1,2,3,4,5].filter(n =>
    p.letters?.[n] === 'done' || p.letters?.[n] === 'available'
  );
  const knownLetters = new Set();
  ALPHABET.forEach(l => {
    const g = LETTER_GROUPS.find(g => g.letterIds.includes(l.id));
    if (g && doneGroups.includes(g.id)) knownLetters.add(l.symbol);
  });
  return blockItems.filter(item => {
    const plain = [...item.hebrew].filter(ch => !NIKUD_CHARS.has(ch) && ch !== ' ');
    return plain.every(ch => knownLetters.has(ch));
  });
}

// ─── Карточки (флип) ──────────────────────────────────────────────────────────
function CardsMode({ items, blockN, dark, onBack, readingStudied, recordStudied }) {
  const m = BLOCK_META[blockN] || BLOCK_META[1];
  const queue = useRef(shuffle([...items]));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

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

  const item = queue.current[idx];

  function rate(q) {
    recordStudied(item.id);
    setFlipped(false);
    setTimeout(() => {
      if (idx + 1 >= queue.current.length) setDone(true);
      else setIdx(i => i + 1);
    }, 180);
  }

  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className={`text-sm font-medium ${dark?"text-gray-400":"text-gray-500"}`}>← Назад</button>
        <span className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{idx+1}/{queue.current.length}</span>
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
function LearnMode({ items, blockN, dark, onBack, recordStudied }) {
  const m = BLOCK_META[blockN] || BLOCK_META[1];
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
  const distractors = shuffle(items.filter(w => w.id !== current?.id)).slice(0, 3);
  const choices = current ? shuffle([current, ...distractors]) : [];

  function answer(ch) {
    if (selected !== null) return;
    setSelected(ch.id);
    const ok = ch.id === current.id;
    if (ok) { setScore(s => s+1); recordStudied(current.id); }
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

// ─── Список блоков (для одного таба) ──────────────────────────────────────
function BlockList({ mode, stats, dark, readingStudied, onSelect }) {
  const p = stats.progress || {};

  const byBlock = {};
  READING_ITEMS.forEach(item => {
    if (!byBlock[item.block]) byBlock[item.block] = [];
    byBlock[item.block].push(item);
  });

  const blocks = [1,2,3,4].map(n => {
    const m = BLOCK_META[n];
    const unlocked = checkReadingUnlock(n, p);
    const allItems = byBlock[n] || [];
    const available = unlocked ? getAvailableItems(allItems, stats) : [];
    const studied = available.filter(w => readingStudied.includes(w.id)).length;
    const pct = available.length ? Math.round((studied / available.length) * 100) : 0;

    return { n, m, unlocked, available, allItems, studied, pct };
  });

  const visibleBlocks = blocks.filter(b => b.unlocked && 
    b.available.length >= (mode === 'learn' ? 4 : 1));

  if (visibleBlocks.length === 0) {
    return (
      <div className="px-4 pt-8 text-center">
        <p className={`text-4xl mb-3`}>📖</p>
        <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>
          Блоки чтения откроются по мере прохождения букв и огласовок
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 flex flex-col gap-3">
      {visibleBlocks.map(({ n, m, available, allItems, studied, pct }) => (
        <div key={n} className={`rounded-2xl border p-4 ${m.bg} ${m.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <p className={`font-bold text-sm ${m.text}`}>{m.label}</p>
                <p className="text-xs text-gray-400">
                  {available.length} карточек · {studied} изучено
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold ${pct >= 80 ? "text-emerald-500" : m.text}`}>
              {pct >= 80 ? "✅" : `${pct}%`}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-white/50 mb-4">
            <div className={`h-full rounded-full ${m.fill} transition-all`} style={{width: `${pct}%`}}/>
          </div>

          <button 
            onClick={() => onSelect(n)}
            className={`w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${m.gradient}`}
          >
            {mode === 'cards' ? '🃏 Открыть карточки' : '📝 Начать учить'} →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function ReadingScreen({ onBack }) {
  const { dark } = useTheme();
  const { stats, updateStats } = useStats();
  const [tab, setTab] = useState('cards'); // cards | learn
  const [activeMode, setActiveMode] = useState(null);
  const [activeBlock, setActiveBlock] = useState(null);

  const readingStudied = stats.readingProgress?.studied || [];

  function recordStudied(id) {
    updateStats(prev => {
      const rp = prev.readingProgress || { studied: [] };
      if (rp.studied.includes(id)) return prev;
      return { 
        ...prev, 
        readingProgress: { ...rp, studied: [...rp.studied, id] }, 
        xp: (prev.xp||0)+2 
      };
    });
  }

  // Режим внутри блока
  if (activeMode && activeBlock !== null) {
    const byBlock = {};
    READING_ITEMS.forEach(item => {
      if (!byBlock[item.block]) byBlock[item.block] = [];
      byBlock[item.block].push(item);
    });
    
    const allItems = byBlock[activeBlock] || [];
    const available = getAvailableItems(allItems, stats);
    
    const props = { 
      items: available, 
      blockN: activeBlock, 
      dark, 
      recordStudied,
      onBack: () => { 
        setActiveMode(null); 
        setActiveBlock(null); 
      } 
    };

    return activeMode === 'cards' 
      ? <CardsMode {...props} readingStudied={readingStudied} /> 
      : <LearnMode {...props} />;
  }

  const totalAvail = READING_ITEMS.filter(item => {
    // rough total available
    const p = stats.progress || {};
    const doneGroups = [1,2,3,4,5].filter(n => 
      p.letters?.[n] === 'done' || p.letters?.[n] === 'available'
    );
    const knownLetters = new Set();
    ALPHABET.forEach(l => {
      const g = LETTER_GROUPS.find(g => g.letterIds.includes(l.id));
      if (g && doneGroups.includes(g.id)) knownLetters.add(l.symbol);
    });
    const plain = [...item.hebrew].filter(ch => !NIKUD_CHARS.has(ch) && ch !== ' ');
    return plain.every(ch => knownLetters.has(ch));
  }).length;

  const TABS = [
    { id:'cards', icon:'🃏', label:'Карточки' },
    { id:'learn', icon:'📝', label:'Учиться'  },
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
        <h2 className={`text-xl font-bold ${dark?"text-white":"text-gray-900"}`}>Чтение</h2>
        <p className={`text-sm mt-0.5 ${dark?"text-gray-400":"text-gray-500"}`}>
          {totalAvail} карточек доступно · {readingStudied.length} изучено
        </p>
      </div>

      {/* Табы */}
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

      <BlockList
        mode={tab}
        stats={stats}
        dark={dark}
        readingStudied={readingStudied}
        onSelect={blockN => { 
          setActiveBlock(blockN); 
          setActiveMode(tab); 
        }}
      />
    </div>
  );
}