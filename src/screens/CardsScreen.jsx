import { useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { LETTER_GROUPS, ALL_LETTERS } from "../data/alphabet";
import { getGroupLetters, isGroupUnlocked, GROUP_COLORS } from "../helpers/groupHelpers";

export default function CardsScreen() {
  const { dark } = useTheme();
  const { stats, updateCardReview, getDueCards } = useStats();
  const [phase, setPhase]   = useState('groupSelect'); // groupSelect|session|done
  const [queue, setQueue]   = useState([]);

  // Only letters from unlocked groups
  const UNLOCKED_LETTERS = ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== 'locked')
  );
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({easy:0,hard:0,again:0});

  function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  function startSession(scope, forceAll = false) {
    let letters;
    if (scope === 'all-due')  letters = forceAll ? UNLOCKED_LETTERS : getDueCards(UNLOCKED_LETTERS);
    else if (scope === 'weak') letters = UNLOCKED_LETTERS.filter(l=>(stats.weakLetters?.[l.id]||0)>0);
    else letters = forceAll ? getGroupLetters(scope) : getDueCards(getGroupLetters(scope));
    const q = shuffle(letters).slice(0, 15);
    setQueue(q); setCurrent(0); setFlipped(false);
    setSessionStats({easy:0,hard:0,again:0});
    setPhase(q.length > 0 ? 'session' : 'done');
  }

  const handleAnswer = useCallback((quality) => {
    updateCardReview(queue[current].id, quality);
    setSessionStats(s=>({...s, easy:s.easy+(quality===2?1:0), hard:s.hard+(quality===1?1:0), again:s.again+(quality===0?1:0)}));
    setFlipped(false);
    setCurrent(c=>c+1);
  },[queue,current,updateCardReview]);

  // ── groupSelect ────────────────────────────────────────────────────────────
  if (phase==='groupSelect') {
    const allDue = getDueCards(UNLOCKED_LETTERS).length;
    const weakCount = UNLOCKED_LETTERS.filter(l=>(stats.weakLetters?.[l.id]||0)>0).length;
    return (
      <div className="pb-20 px-4 pt-4 max-w-md mx-auto flex flex-col gap-3">
        <h2 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Карточки</h2>
        {allDue>0 ? (
          <button onClick={()=>startSession('all-due')}
            className="w-full py-4 px-5 rounded-2xl bg-indigo-500 text-white font-semibold flex items-center justify-between">
            <span>⏰ Все на сегодня</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{allDue} букв</span>
          </button>
        ) : (
          <button onClick={()=>startSession('all-due', true)}
            className={`w-full py-4 px-5 rounded-2xl font-semibold flex items-center justify-between border ${dark?'border-indigo-700 bg-indigo-900/30 text-indigo-300':'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
            <span>🔄 Повторить все буквы заново</span>
            <span className={`text-xs px-2 py-1 rounded-full ${dark?'bg-indigo-800':'bg-indigo-100'}`}>{UNLOCKED_LETTERS.length} букв</span>
          </button>
        )}
        {weakCount>0 && (
          <button onClick={()=>startSession('weak')}
            className="w-full py-4 px-5 rounded-2xl bg-rose-500 text-white font-semibold flex items-center justify-between">
            <span>🔴 Только слабые</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{weakCount} букв</span>
          </button>
        )}
        {LETTER_GROUPS.map(g => {
          const unlocked = isGroupUnlocked(g.id, stats.groupProgress);
          const letters  = getGroupLetters(g.id);
          const due      = getDueCards(letters).length;
          const c        = GROUP_COLORS[g.color];
          return (
            <div key={g.id} onClick={()=>unlocked&&startSession(g.id)}
              className={`rounded-2xl border p-4 transition-all ${
                unlocked?`${c.border} ${c.bg} cursor-pointer active:scale-[0.98]`:'border-gray-200 dark:border-gray-800 opacity-40'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!unlocked&&<span>🔒</span>}
                  <span className={`font-semibold ${unlocked?c.text:'text-gray-400'}`}>{g.name}</span>
                </div>
                {unlocked&&(
                  <div className="flex items-center gap-2">
                    {due>0&&<span className={`text-xs px-2 py-0.5 rounded-full ${c.fill} text-white`}>{due} сегодня</span>}
                    <span className={`text-sm ${dark?'text-gray-400':'text-gray-400'}`}>→</span>
                  </div>
                )}
              </div>
              {unlocked&&(
                <div className="flex gap-1 mt-2 flex-wrap">
                  {letters.map(l=><span key={l.id} className={`text-lg ${c.text}`} style={{fontFamily:'serif'}}>{l.symbol}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── done ───────────────────────────────────────────────────────────────────
  if (phase==='done' || current>=queue.length) {
    const total = sessionStats.easy+sessionStats.hard+sessionStats.again;
    const lastScope = queue[0] ? 'all-due' : 'all-due'; // сохраняем scope для повтора
    return (
      <div className={`pb-20 px-4 pt-12 max-w-md mx-auto text-center ${dark?'text-white':'text-gray-900'}`}>
        <div className="text-5xl mb-3">✨</div>
        <h2 className="text-2xl font-bold mb-1">Сессия завершена!</h2>
        {total===0
          ? <p className={`text-sm mt-2 ${dark?'text-gray-400':'text-gray-500'}`}>На сегодня всё повторено 🎉</p>
          : <div className="grid grid-cols-3 gap-3 mt-5 mb-6">
              {[{l:'Легко',v:sessionStats.easy,c:'text-green-500',bg:dark?'bg-gray-800':'bg-green-50'},
                {l:'Трудно',v:sessionStats.hard,c:'text-yellow-500',bg:dark?'bg-gray-800':'bg-yellow-50'},
                {l:'Снова',v:sessionStats.again,c:'text-red-500',bg:dark?'bg-gray-800':'bg-red-50'}]
                .map(s=><div key={s.l} className={`rounded-2xl p-3 ${s.bg}`}><div className={`font-bold text-xl ${s.c}`}>{s.v}</div><div className={`text-xs ${dark?'text-gray-500':'text-gray-400'}`}>{s.l}</div></div>)}
            </div>
        }
        <button onClick={()=>startSession('all-due', true)}
          className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold">
          🔄 Повторить ещё раз
        </button>
        <button onClick={()=>setPhase('groupSelect')}
          className={`w-full mt-2 py-3 rounded-2xl border font-medium ${dark?'border-gray-700 text-gray-400':'border-gray-200 text-gray-500'}`}>
          К группам
        </button>
      </div>
    );
  }

  // ── session ────────────────────────────────────────────────────────────────
  const card = queue[current];
  const isWeak = (stats.weakLetters?.[card.id]||0)>0;
  const review = stats.cardReviews?.[card.id];
  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">
      <div className="flex justify-between text-xs mb-2">
        <span className={dark?'text-gray-400':'text-gray-500'}>{current+1} / {queue.length}</span>
        <div className="flex gap-2">
          {isWeak&&<span className="text-red-400 font-semibold">🔴 Слабая</span>}
          {review&&<span className={dark?'text-gray-500':'text-gray-400'}>интервал: {review.interval}д</span>}
        </div>
      </div>
      <div className={`h-1.5 rounded-full mb-5 ${dark?'bg-gray-700':'bg-gray-200'}`}>
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${(current/queue.length)*100}%`}}/>
      </div>
      <div onClick={()=>setFlipped(f=>!f)} style={{perspective:1000}} className="cursor-pointer mb-5" role="button">
        <div style={{transformStyle:'preserve-3d',transform:flipped?'rotateY(180deg)':'rotateY(0deg)',transition:'transform 0.45s',position:'relative',height:260}}>
          <div style={{backfaceVisibility:'hidden'}}
            className={`absolute inset-0 rounded-3xl flex flex-col items-center justify-center shadow-lg border ${dark?'bg-gray-700 border-gray-600':'bg-white border-gray-100'}`}>
            <span style={{fontSize:110,lineHeight:1,fontFamily:'serif'}}>{card.symbol}</span>
            {card.isFinalForm&&<span className={`text-xs mt-2 px-2 py-0.5 rounded-full ${dark?'bg-indigo-900 text-indigo-300':'bg-indigo-100 text-indigo-600'}`}>финальная форма</span>}
            <p className={`text-xs mt-4 ${dark?'text-gray-600':'text-gray-300'}`}>нажмите чтобы открыть</p>
          </div>
          <div style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}
            className={`absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-6 shadow-lg ${dark?'bg-indigo-800':'bg-indigo-500'} text-white`}>
            <span style={{fontSize:56,fontFamily:'serif'}}>{card.symbol}</span>
            <h3 className="text-2xl font-bold mt-1">{card.name}</h3>
            <p className="text-indigo-200 text-sm mt-0.5">«{card.sound}» · {card.trans}</p>
            <p className="mt-2 text-sm text-indigo-200">🧠 {card.mnemonic}</p>
            {card.exampleWord&&<p className="mt-2 text-xs text-indigo-300">{card.exampleWord} — {card.exampleMeaning}</p>}
          </div>
        </div>
      </div>
      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          {[{l:'Снова',sub:'не знаю',q:0,cls:`border-2 border-red-400 text-red-500 ${dark?'bg-red-900/20':'bg-red-50'}`},
            {l:'Трудно',sub:'с трудом',q:1,cls:`border-2 border-yellow-400 text-yellow-600 ${dark?'bg-yellow-900/20':'bg-yellow-50'}`},
            {l:'Легко',sub:'помню',q:2,cls:'bg-gradient-to-b from-green-500 to-emerald-600 text-white'}]
            .map(b=><button key={b.q} onClick={()=>handleAnswer(b.q)} className={`py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all ${b.cls}`}>{b.l}<div className="text-xs font-normal opacity-70">{b.sub}</div></button>)}
        </div>
      ) : (
        <p className={`text-center text-sm ${dark?'text-gray-500':'text-gray-400'}`}>Вспомните название и звук, затем откройте</p>
      )}
    </div>
  );
}
