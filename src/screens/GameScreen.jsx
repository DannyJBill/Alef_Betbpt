import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, LETTER_GROUPS } from "../data/alphabet";
import { shuffle, pick } from "../helpers/utils";
import LetterDisplay from "../components/ui/LetterDisplay";
import ProgressBar from "../components/ui/ProgressBar";

export default function GameScreen() {
  const { dark } = useTheme();
  const { stats, updateStats, updateCardReview } = useStats();

  // Only letters from unlocked groups
  const availableLetters = ALPHABET.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== 'locked')
  );
  const gameLetters = availableLetters.length >= 4 ? availableLetters : ALPHABET.slice(0, 6);

  const [phase, setPhase] = useState("menu"); // menu | playing | over
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [flash, setFlash] = useState(null); // "ok" | "err"

  const timerRef = useRef(null);
  const flashRef = useRef(null);
  const prevLetterIdRef = useRef(null);
  const xpSavedRef = useRef(false);

  // cleanup all timers on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(flashRef.current);
  }, []);

  // countdown tick
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

  // save XP exactly once when game ends
  useEffect(() => {
    if (phase === "over" && !xpSavedRef.current) {
      xpSavedRef.current = true;
      const xpGained = score * 5;
      if (xpGained > 0) {
        updateStats(s => ({
          ...s,
          xp: s.xp + xpGained,
          coins: s.coins + Math.floor(score / 5),
        }));
      }
    }
    if (phase !== "over") xpSavedRef.current = false;
  }, [phase, score, updateStats]);

  function nextQ() {
    let letter;
    do {
      letter = gameLetters[Math.floor(Math.random() * gameLetters.length)];
    } while (letter.id === prevLetterIdRef.current && gameLetters.length > 1);
    prevLetterIdRef.current = letter.id;
    setCurrent(letter);
    setChoices(shuffle([letter, ...pick(gameLetters.filter(l => l.id !== letter.id), 3)]));
  }

  function startGame() {
    setScore(0);
    setTimeLeft(60);
    setPhase("playing");
    nextQ();
  }

  function answer(ch) {
    if (!current) return;
    const ok = ch.id === current.id;
    setFlash(ok ? "ok" : "err");
    if (ok) setScore(s => s + 1);
    else updateCardReview(current.id, 0);
    flashRef.current = setTimeout(() => setFlash(null), 300);
    nextQ();
  }

  // ─── Menu ──────────────────────────────────────────────────────────────────
  if (phase === "menu") return (
    <div className="pb-20 px-4 pt-12 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">⚡</div>
      <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Скоростной режим</h2>
      <p className={`mb-8 ${dark ? "text-gray-400" : "text-gray-500"}`}>60 секунд — как можно больше букв!</p>
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
  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 30 ? "bg-green-500" : timeLeft > 10 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className={`pb-20 px-4 pt-4 max-w-md mx-auto transition-colors ${flash === "ok" ? "bg-green-500/10" : flash === "err" ? "bg-red-500/10" : ""}`}>
      <div className="flex justify-between items-center mb-3">
        <span className={`font-black text-2xl ${timeLeft <= 10 ? "text-red-500 animate-pulse" : dark ? "text-white" : "text-gray-800"}`}>{timeLeft}с</span>
        <span className={`font-bold text-xl ${dark ? "text-yellow-400" : "text-yellow-600"}`}>⚡ {score}</span>
      </div>
      <div className="mb-5">
        <ProgressBar pct={timerPct} color={timerColor} height="h-2" />
      </div>

      <p className={`text-center text-sm mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>Какая это буква?</p>
      <div className={`rounded-3xl flex items-center justify-center mb-5 ${dark ? "bg-gray-800" : "bg-gradient-to-b from-indigo-50 to-purple-50"}`} style={{ height: 160 }}>
        {current && <LetterDisplay symbol={current.symbol} name={current.name} size={100} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map(ch => (
          <button key={ch.id} onClick={() => answer(ch)}
            className={`py-5 rounded-2xl font-bold text-base transition-all active:scale-95
              ${dark
                ? "bg-gray-800 text-white border border-gray-700 hover:border-indigo-500"
                : "bg-white text-gray-800 border-2 border-gray-100 hover:border-indigo-400 shadow-sm"
              }`}>
            {ch.name}
          </button>
        ))}
      </div>
    </div>
  );
}
