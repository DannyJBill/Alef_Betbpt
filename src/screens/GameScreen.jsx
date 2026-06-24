import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { shuffle, pick } from "../helpers/utils";
import LetterDisplay from "../components/ui/LetterDisplay";
import ProgressBar from "../components/ui/ProgressBar";
import HebrewKeyboard from "../components/ui/HebrewKeyboard";

// Типы вопросов чередуются: 0=выбор буквы, 1=выбор названия, 2=ввод буквы
const QUESTION_TYPES = ['name-to-letter-choice', 'letter-to-name-choice', 'name-to-symbol-keyboard'];

export default function GameScreen() {
  const { dark } = useTheme();
  const { stats, updateStats, updateCardReview } = useStats();

  const availableLetters = ALPHABET.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== 'locked')
  );
  const gameLetters = availableLetters.length >= 4 ? availableLetters : ALPHABET.slice(0, 6);

  const [phase, setPhase]     = useState("menu");
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore]     = useState(0);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [qType, setQType]     = useState(0);   // индекс в QUESTION_TYPES
  const [flash, setFlash]     = useState(null);
  const [kbInput, setKbInput] = useState('');  // ввод с клавиатуры
  const [kbResult, setKbResult] = useState(null); // null | 'correct' | 'wrong'

  const timerRef      = useRef(null);
  const flashRef      = useRef(null);
  const kbTimerRef    = useRef(null);
  const prevIdRef     = useRef(null);
  const xpSavedRef    = useRef(false);
  const qCountRef     = useRef(0); // для чередования типов

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(flashRef.current);
    clearTimeout(kbTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase("over"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === "over" && !xpSavedRef.current) {
      xpSavedRef.current = true;
      const xpGained = score * 5;
      if (xpGained > 0) updateStats(s => ({ ...s, xp: s.xp + xpGained, coins: s.coins + Math.floor(score / 5) }));
    }
    if (phase !== "over") xpSavedRef.current = false;
  }, [phase, score, updateStats]);

  function nextQ() {
    let letter;
    do {
      letter = gameLetters[Math.floor(Math.random() * gameLetters.length)];
    } while (letter.id === prevIdRef.current && gameLetters.length > 1);
    prevIdRef.current = letter.id;
    setCurrent(letter);
    setChoices(shuffle([letter, ...pick(gameLetters.filter(l => l.id !== letter.id), 3)]));
    setQType(qCountRef.current % QUESTION_TYPES.length);
    qCountRef.current += 1;
    setKbInput('');
    setKbResult(null);
  }

  function startGame() {
    setScore(0); setTimeLeft(60); qCountRef.current = 0;
    setKbInput(''); setKbResult(null);
    setPhase("playing");
    nextQ();
  }

  // Ответ для кнопочных вопросов
  function answerChoice(ch) {
    if (!current || kbResult) return;
    const ok = ch.id === current.id;
    setFlash(ok ? "ok" : "err");
    if (ok) setScore(s => s + 1);
    else updateCardReview(current.id, 0);
    flashRef.current = setTimeout(() => { setFlash(null); nextQ(); }, 300);
  }

  // Ответ для клавиатурного вопроса
  function answerKeyboard() {
    if (!current || kbResult || !kbInput) return;
    const ok = kbInput === current.symbol;
    setKbResult(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
    else updateCardReview(current.id, 0);
    kbTimerRef.current = setTimeout(() => { nextQ(); }, 1000);
  }

  const currentType = QUESTION_TYPES[qType];
  const isKeyboard  = currentType === 'name-to-symbol-keyboard';

  // ─── Menu ──────────────────────────────────────────────────────────────────
  if (phase === "menu") return (
    <div className="pb-20 px-4 pt-12 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">⚡</div>
      <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Скоростной режим</h2>
      <p className={`mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>60 секунд — три типа вопросов!</p>
      <div className={`rounded-2xl p-4 mb-6 text-left ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
        {[
          ['🔡', 'Название → найди букву'],
          ['🔤', 'Буква → найди название'],
          ['⌨️', 'Название → напиши букву'],
        ].map(([icon, label]) => (
          <div key={label} className={`flex items-center gap-2 py-1.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[["🥉", "10"], ["🥈", "20"], ["🥇", "30+"]].map(([medal, pts]) => (
          <div key={pts} className={`rounded-2xl p-3 ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
            <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-700"}`}>{medal} {pts}</p>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>очков</p>
          </div>
        ))}
      </div>
      <button onClick={startGame}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-5 rounded-2xl font-bold text-xl shadow-lg">
        Поехали! 🚀
      </button>
    </div>
  );

  // ─── Game over ─────────────────────────────────────────────────────────────
  if (phase === "over") {
    const xpGained = score * 5;
    return (
      <div className="pb-20 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">{score >= 20 ? "🏆" : score >= 10 ? "🎯" : "💪"}</div>
        <h2 className={`text-2xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Время вышло!</h2>
        <p className={`text-5xl font-black mb-1 ${dark ? "text-indigo-400" : "text-indigo-600"}`}>{score}</p>
        <p className={`mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>правильных ответов · +{xpGained} XP</p>
        <button onClick={startGame}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-xl mb-3">
          Ещё раз!
        </button>
        <button onClick={() => setPhase("menu")}
          className={`w-full py-4 rounded-2xl font-bold text-lg border-2 ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
          В меню
        </button>
      </div>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  const timerPct   = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 30 ? "bg-green-500" : timeLeft > 10 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className={`pb-4 px-4 pt-4 max-w-md mx-auto transition-colors ${flash === "ok" ? "bg-green-500/10" : flash === "err" ? "bg-red-500/10" : ""}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className={`font-black text-2xl ${timeLeft <= 10 ? "text-red-500 animate-pulse" : dark ? "text-white" : "text-gray-800"}`}>{timeLeft}с</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isKeyboard
            ? dark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
            : dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
        }`}>
          {isKeyboard ? '⌨️ Введи букву' : currentType === 'letter-to-name-choice' ? '🔤 Найди название' : '🔡 Найди букву'}
        </span>
        <span className={`font-bold text-xl ${dark ? "text-yellow-400" : "text-yellow-600"}`}>⚡ {score}</span>
      </div>
      <div className="mb-3">
        <ProgressBar pct={timerPct} color={timerColor} height="h-2" />
      </div>

      {/* Prompt */}
      <div className={`rounded-3xl flex items-center justify-center mb-3 ${dark ? "bg-gray-800" : "bg-gradient-to-b from-indigo-50 to-purple-50"}`}
        style={{ height: isKeyboard ? 100 : 140 }}>
        {current && (
          currentType === 'letter-to-name-choice'
            ? <LetterDisplay symbol={current.symbol} name={current.name} size={80} />
            : <span className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{current.name}</span>
        )}
      </div>

      {/* Keyboard mode */}
      {isKeyboard ? (
        <>
          <div className={`rounded-2xl flex items-center justify-center mb-3 border-2 transition-all ${
            kbResult === null
              ? dark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              : kbResult === 'correct'
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                : 'border-rose-400 bg-rose-50 dark:bg-rose-950'
          }`} style={{ height: 64 }}>
            {kbInput ? (
              <span style={{ fontSize: 44, fontFamily: 'serif' }}
                className={kbResult === 'correct' ? 'text-emerald-600' : kbResult === 'wrong' ? 'text-rose-600' : dark ? 'text-white' : 'text-gray-900'}>
                {kbInput}
              </span>
            ) : (
              <span className={`text-sm ${dark ? 'text-gray-600' : 'text-gray-300'}`}>нажми букву</span>
            )}
          </div>
          <HebrewKeyboard
            onKey={sym => { if (kbResult === null) setKbInput(sym); }}
            onDelete={() => { if (kbResult === null) setKbInput(''); }}
            onSubmit={answerKeyboard}
            disabled={kbResult !== null}
            highlightSymbol={kbResult === 'wrong' ? current?.symbol : null}
          />
        </>
      ) : (
        /* Choice buttons */
        <div className="grid grid-cols-2 gap-3">
          {choices.map(ch => (
            <button key={ch.id} onClick={() => answerChoice(ch)}
              className={`py-4 rounded-2xl font-bold text-base transition-all active:scale-95
                ${currentType === 'name-to-letter-choice'
                  ? 'text-4xl'
                  : 'text-base'
                }
                ${dark
                  ? "bg-gray-800 text-white border border-gray-700 hover:border-indigo-500"
                  : "bg-white text-gray-800 border-2 border-gray-100 hover:border-indigo-400 shadow-sm"
                }`}
              style={currentType === 'name-to-letter-choice' ? { fontFamily: 'serif', direction: 'rtl' } : {}}>
              {currentType === 'name-to-letter-choice' ? ch.symbol : ch.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
