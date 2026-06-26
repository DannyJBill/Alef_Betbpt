import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { LETTER_GROUPS } from "../data/alphabet";
import { getGroupLetters, isGroupUnlocked, getGroupMastery, GROUP_COLORS } from "../helpers/groupHelpers";
import HebrewKeyboard from "../components/ui/HebrewKeyboard";
import { speakLetter } from "../helpers/speak";

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

export default function LearnScreen() {
  const { dark } = useTheme();
  const { stats, updateStats, completeGroupTest } = useStats();
  const [phase, setPhase]         = useState('groups');
  const [groupId, setGroupId]     = useState(null);
  const [letterIdx, setLetterIdx] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx]           = useState(0);
  const [answered, setAnswered]   = useState(null); // null | 'correct' | 'wrong'
  const [correct, setCorrect]     = useState(0);
  const [input, setInput]         = useState('');   // для type==='name-to-symbol'
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const groupLetters = groupId ? getGroupLetters(groupId) : [];
  const group        = LETTER_GROUPS.find(g => g.id === groupId);
  const colors       = group ? GROUP_COLORS[group.color] : {};

  // ── Build questions: 3 types rotate ──────────────────────────────────────
  function buildQuestions(letters) {
    return shuffle(letters).map((letter, i) => {
      const type = ['letter-to-name', 'name-to-letter', 'name-to-symbol'][i % 3];
      const wrong = shuffle(letters.filter(l => l.id !== letter.id)).slice(0, 3);
      if (type === 'letter-to-name') {
        return { type, letter,
          prompt: letter.symbol, promptLabel: 'Как называется эта буква?',
          correct: letter.name,
          options: shuffle([...wrong.map(l => l.name), letter.name]) };
      } else if (type === 'name-to-letter') {
        return { type, letter,
          prompt: letter.name, promptLabel: 'Найди эту букву:',
          correct: letter.symbol,
          options: shuffle([...wrong.map(l => l.symbol), letter.symbol]) };
      } else {
        // name-to-symbol — keyboard input
        return { type, letter,
          prompt: letter.name, promptLabel: 'Напиши эту букву на иврите:',
          correct: letter.symbol,
          options: null };
      }
    });
  }

  function startGroup(gId) {
    setGroupId(gId); setLetterIdx(0); setPhase('studying');
  }

  function nextLetter() {
    if (letterIdx < groupLetters.length - 1) setLetterIdx(i => i + 1);
    else {
      const qs = buildQuestions(groupLetters);
      setQuestions(qs); setQIdx(0); setAnswered(null); setCorrect(0); setInput(''); setPhase('test');
    }
  }

  function handleAnswer(option) {
    if (answered !== null) return;
    const q = questions[qIdx];
    const ok = option === q.correct;
    setAnswered(ok ? 'correct' : 'wrong');
    const nextCorrect = correct + (ok ? 1 : 0);
    timerRef.current = setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(i => i + 1); setAnswered(null); setCorrect(nextCorrect); setInput('');
      } else {
        const score = Math.round((nextCorrect / questions.length) * 100);
        completeGroupTest(groupId, score);
        updateStats(s => ({ ...s, dailyDone: Math.min(s.dailyGoal, s.dailyDone + 1) }));
        setCorrect(nextCorrect); setPhase('result');
      }
    }, 900);
  }

  function handleKeyboardSubmit() {
    if (answered !== null || !input) return;
    handleAnswer(input);
  }

  // ── PHASE: groups ──────────────────────────────────────────────────────────
  if (phase === 'groups') return (
    <div className="px-4 pt-3 max-w-md mx-auto flex flex-col gap-2" style={{height:"100%"}}>
      <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Учись</h2>
      {LETTER_GROUPS.map(g => {
        const unlocked = isGroupUnlocked(g.id, stats.groupProgress);
        const progress = stats.groupProgress?.[g.id];
        const mastery  = getGroupMastery(g.id, stats.cardReviews);
        const letters  = getGroupLetters(g.id);
        const c        = GROUP_COLORS[g.color];
        const score    = stats.groupTestScores?.[g.id]?.score;
        return (
          <div key={g.id} onClick={() => unlocked && startGroup(g.id)}
            className={`rounded-2xl border p-4 transition-all ${
              unlocked ? `${c.border} ${c.bg} cursor-pointer active:scale-[0.98]` : 'border-gray-200 dark:border-gray-800 opacity-50'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{!unlocked ? '🔒' : progress === 'completed' ? '✅' : '▶️'}</span>
                <span className={`font-semibold ${unlocked ? c.text : 'text-gray-400 dark:text-gray-600'}`}>{g.name}</span>
              </div>
              {unlocked && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${c.border} ${c.bg} ${c.text}`}>
                  {progress === 'completed' ? `✓ ${score}% · Повторить` : progress === 'available' ? 'Начать →' : 'В процессе'}
                </span>
              )}
            </div>
            {unlocked && (
              <>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {letters.map(l => (
                    <span key={l.id} className={`text-xl font-bold ${c.text}`} style={{ fontFamily: 'serif' }}>{l.symbol}</span>
                  ))}
                </div>
                <div className={`h-1.5 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div className={`h-full ${c.fill} rounded-full transition-all`} style={{ width: `${mastery}%` }} />
                </div>
              </>
            )}
            {!unlocked && (
              <p className="text-xs text-gray-400 mt-1">
                Открывается после: {LETTER_GROUPS.find(x => x.id === g.unlocksAfter)?.name}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── PHASE: studying ────────────────────────────────────────────────────────
  if (phase === 'studying') {
    const letter = groupLetters[letterIdx];
    return (
      <div className="px-4 pt-3 max-w-md mx-auto flex flex-col gap-3" style={{height:"100%",overflowY:"auto"}}>
        <div className="flex gap-1">
          {groupLetters.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= letterIdx ? colors.fill : dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className={`rounded-3xl p-5 flex flex-col items-center gap-2 border-2 ${colors.border} ${colors.bg}`}>
          <span style={{ fontSize: "min(100px, 18vw)", lineHeight: 1, fontFamily: 'serif' }}>{letter.symbol}</span>
          {letter.isFinalForm && <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>финальная форма</span>}
          <div className="flex items-center gap-2">
            <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{letter.name}</h2>
            <button onClick={()=>speakLetter(letter)}
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all ${dark?'bg-white/10':'bg-white/60'}`}
              aria-label="Произнести">🔊</button>
          </div>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>«{letter.sound}» · {letter.trans}</p>

        </div>
        <div className={`rounded-2xl px-4 py-3 border ${colors.border} ${colors.bg}`}>
          <p className={`text-xs mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Примеры слов:</p>
          {letter.words?.slice(0,3).map((w, i) => {
            const text = typeof w === 'string' ? w : `${w.he} (${w.tr}) — ${w.ru}`;
            return <p key={i} className={`text-sm leading-6 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{text}</p>;
          })}
        </div>
        <button onClick={nextLetter}
          className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.fill} active:scale-[0.98] transition-all`}>
          {letterIdx < groupLetters.length - 1 ? 'Понятно, дальше →' : 'К тесту →'}
        </button>
      </div>
    );
  }

  // ── PHASE: test ────────────────────────────────────────────────────────────
  if (phase === 'test' && questions.length) {
    const q = questions[qIdx];
    const isKeyboard = q.type === 'name-to-symbol';

    return (
      <div className="pb-4 px-4 pt-4 max-w-md mx-auto flex flex-col gap-3">
        <p className={`text-sm text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{qIdx + 1} / {questions.length}</p>
        <div className={`h-1.5 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className={`h-full ${colors.fill} rounded-full transition-all`} style={{ width: `${(qIdx / questions.length) * 100}%` }} />
        </div>

        {/* Badge — тип вопроса */}
        <div className="flex justify-center">
          <span className={`text-xs px-3 py-1 rounded-full ${
            isKeyboard
              ? dark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
              : dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>
            {isKeyboard ? '⌨️ Введи букву' : q.type === 'letter-to-name' ? '🔤 Найди название' : '🔡 Найди букву'}
          </span>
        </div>

        <p className={`text-sm text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{q.promptLabel}</p>

        {/* Prompt */}
        <div className={`rounded-3xl flex items-center justify-center ${dark ? 'bg-gray-800' : 'bg-gray-50'}`} style={{ height: 'min(140px, 25vw)', minHeight: 90 }}>
          <span style={{
            fontSize: q.type === 'letter-to-name' ? 100 : 32,
            fontFamily: 'serif', fontWeight: 'bold',
          }} className={dark ? 'text-white' : 'text-gray-900'}>
            {q.prompt}
          </span>
        </div>

        {/* Keyboard mode */}
        {isKeyboard ? (
          <>
            {/* Input display */}
            <div className={`rounded-2xl flex items-center justify-center border-2 transition-all ${
              answered === null
                ? dark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                : answered === 'correct'
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                  : 'border-rose-400 bg-rose-50 dark:bg-rose-950'
            }`} style={{ height: 60 }}>
              {input ? (
                <span style={{ fontSize: 52, fontFamily: 'serif' }}
                  className={answered === 'correct' ? 'text-emerald-600' : answered === 'wrong' ? 'text-rose-600' : dark ? 'text-white' : 'text-gray-900'}>
                  {input}
                </span>
              ) : (
                <span className={`text-sm ${dark ? 'text-gray-600' : 'text-gray-300'}`}>нажми букву на клавиатуре</span>
              )}
            </div>

            {/* Feedback */}
            {answered && (
              <div className={`rounded-2xl p-3 text-center font-semibold text-sm ${
                answered === 'correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                       : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {answered === 'correct' ? '✅ Верно!' : `❌ Правильно: ${q.correct} (${q.letter.name})`}
              </div>
            )}

            <HebrewKeyboard
              onKey={sym => { if (answered === null) setInput(sym); }}
              onDelete={() => { if (answered === null) setInput(''); }}
              onSubmit={handleKeyboardSubmit}
              disabled={answered !== null}
              highlightSymbol={answered === 'wrong' ? q.correct : null}
            />
          </>
        ) : (
          /* Multiple choice */
          <div className="grid grid-cols-2 gap-3">
            {q.options.map(opt => {
              let cls = `py-5 rounded-2xl font-semibold border-2 text-center transition-all `;
              const isSymbol = q.type === 'name-to-letter';
              cls += isSymbol ? 'text-4xl ' : 'text-lg ';
              if (answered === null)
                cls += dark ? 'bg-gray-800 border-gray-700 text-white active:scale-95' : 'bg-white border-gray-200 text-gray-800 active:scale-95';
              else if (opt === q.correct)
                cls += 'bg-emerald-50 dark:bg-emerald-950 border-emerald-400 text-emerald-700 dark:text-emerald-300';
              else if (opt === answered && opt !== q.correct)
                cls += 'bg-rose-50 dark:bg-rose-950 border-rose-400 text-rose-600';
              else
                cls += dark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400';
              return (
                <button key={opt} className={cls}
                  style={isSymbol ? { fontFamily: 'serif', direction: 'rtl' } : {}}
                  disabled={answered !== null} onClick={() => handleAnswer(opt)}>
                  {opt}{answered !== null && opt === q.correct ? ' ✓' : ''}
                  {answered !== null && opt === answered && opt !== q.correct ? ' ✗' : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── PHASE: result ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    const score    = Math.round((correct / questions.length) * 100);
    const isPassed = score >= 70;
    const nextGrp  = LETTER_GROUPS.find(g => g.unlocksAfter === groupId);
    return (
      <div className="pb-4 px-4 pt-6 max-w-md mx-auto flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{isPassed ? '🎉' : '💪'}</span>
        <div>
          <p className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {isPassed ? 'Группа пройдена!' : 'Почти получилось!'}
          </p>
          <p className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isPassed ? group?.name : `Нужно 70%, у тебя ${score}%`}
          </p>
        </div>
        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
          isPassed ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-amber-400 bg-amber-50 dark:bg-amber-950'
        }`}>
          <span className={`text-4xl font-bold ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>{score}%</span>
        </div>
        {isPassed && nextGrp && (
          <div className={`w-full rounded-2xl p-4 border ${GROUP_COLORS[nextGrp.color].border} ${GROUP_COLORS[nextGrp.color].bg}`}>
            <p className={`text-sm font-medium ${GROUP_COLORS[nextGrp.color].text}`}>🔓 Открыта новая группа!</p>
            <p className={`text-lg font-bold mt-1 ${GROUP_COLORS[nextGrp.color].text}`}>{nextGrp.name}</p>
          </div>
        )}
        {isPassed ? (
          <div className="w-full flex flex-col gap-3">
            {nextGrp && (
              <button onClick={() => setPhase('groups')}
                className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.fill}`}>
                Перейти к «{nextGrp.name}» →
              </button>
            )}
            <button onClick={() => setPhase('groups')}
              className={`w-full py-3 rounded-2xl border font-medium ${dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              К списку групп
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <button onClick={() => { setLetterIdx(0); setPhase('studying'); }}
              className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg">
              Повторить буквы и пересдать
            </button>
            <button onClick={() => setPhase('groups')}
              className={`w-full py-3 rounded-2xl border font-medium ${dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              Вернуться к группам
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Share result helper — exported for reuse
export function shareGroupResult(group, score, refCode) {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  const refLink = `https://t.me/AlefBetBot/learn?startapp=${refCode}`;
  const text = `Прошёл группу "${group?.name}" с результатом ${score}%! 🇮🇱\nУчу иврит в Alef Bet → ${refLink}`;
  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`);
}
