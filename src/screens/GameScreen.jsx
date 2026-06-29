/**
 * GameScreen — ⚡ Игра
 *
 * Режимы:
 *  menu         — выбор: Рейтинговая / Тренировка
 *  rated        — 60 сек, всё пройденное, лидерборд
 *  training     — настраиваемая тренировка
 *  playing      — игровой процесс
 *  over         — результат
 */

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALPHABET, LETTER_GROUPS, NIKUD, NIKUD_GROUPS } from "../data/alphabet";
import { WORD_CATEGORIES } from "../data/words";
import { shuffle, pick } from "../helpers/utils";
import LetterDisplay from "../components/ui/LetterDisplay";
import ProgressBar   from "../components/ui/ProgressBar";
import HebrewKeyboard from "../components/ui/HebrewKeyboard";

// ─── Генератор вопросов из пройденного материала ────────────────────────────
function buildQuestionPool(stats, topics) {
  const questions = [];

  // Доступные буквы — fallback на первые 6 если ничего не открыто
  const unlockedLetters = ALPHABET.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== "locked")
  );
  const gameLetters = unlockedLetters.length >= 4 ? unlockedLetters : ALPHABET.slice(0, 6);

  if (topics.includes("alphabet")) {
    // Тип 1: название → выбрать букву
    gameLetters.forEach(l => {
      questions.push({ type:"name-to-letter", letter:l, distractors: gameLetters });
    });
    // Тип 2: буква → выбрать название
    gameLetters.forEach(l => {
      questions.push({ type:"letter-to-name", letter:l, distractors: gameLetters });
    });
  }

  // Пройденные огласовки
  const doneNikudGroups = NIKUD_GROUPS.filter(g =>
    stats.nikudProgress?.groupProgress?.[g.id] === "completed"
  );
  const unlockedVowels = doneNikudGroups.flatMap(g => g.vowels.map(vid => NIKUD.find(v => v.id === vid)).filter(Boolean));

  if (topics.includes("nikud") && unlockedVowels.length >= 2) {
    const DEMO_LETTERS = ["מ","ב","ד","ל","כ","ש"];
    DEMO_LETTERS.forEach(letter => {
      unlockedVowels.forEach(vowel => {
        questions.push({ type:"slug-to-sound", letter, vowel, distractors: unlockedVowels });
      });
    });
  }

  // Слова
  if (topics.includes("words")) {
    const learnedWordIds = new Set(stats.nikudProgress?.wordsStudied || []);
    const allWords = WORD_CATEGORIES.flatMap(c => c.words.filter(w => learnedWordIds.has(w.id)));
    if (allWords.length >= 4) {
      allWords.forEach(w => {
        questions.push({ type:"word-to-translation", word:w, distractors:allWords });
      });
    }
  }

  return questions;
}

function makeQuestion(pool, prevId) {
  if (!pool.length) return null;
  let q;
  let attempts = 0;
  do {
    q = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while (attempts < 10 && q.letter?.id === prevId);

  // Собираем варианты
  if (q.type === "name-to-letter" || q.type === "letter-to-name") {
    const distractors = shuffle(q.distractors.filter(l => l.id !== q.letter.id)).slice(0, 3);
    return {
      ...q,
      choices: shuffle([q.letter, ...distractors]),
      correctId: q.letter.id,
    };
  }
  if (q.type === "slug-to-sound") {
    const distractors = shuffle(q.distractors.filter(v => v.id !== q.vowel.id)).slice(0, 3);
    return {
      ...q,
      choices: shuffle([q.vowel, ...distractors]),
      correctId: q.vowel.id,
    };
  }
  if (q.type === "word-to-translation") {
    const distractors = shuffle(q.distractors.filter(w => w.id !== q.word.id)).slice(0, 3);
    return {
      ...q,
      choices: shuffle([q.word, ...distractors]),
      correctId: q.word.id,
    };
  }
  return null;
}

// ─── Настройки тренировки ────────────────────────────────────────────────────
const TOPIC_OPTIONS = [
  { id:"alphabet", label:"Буквы",     icon:"🔤" },
  { id:"nikud",    label:"Огласовки", icon:"📖" },
  { id:"words",    label:"Слова",     icon:"💬" },
];
const TIME_OPTIONS = [
  { val:30,   label:"30 сек" },
  { val:60,   label:"1 мин"  },
  { val:120,  label:"2 мин"  },
  { val:0,    label:"∞"      },
];

// ─── Игровой процесс ─────────────────────────────────────────────────────────
function PlayingGame({ pool, timeLimit, isRated, dark, onOver }) {
  const { updateStats, updateCardReview } = useStats();
  const [timeLeft, setTimeLeft]   = useState(timeLimit || 999);
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [bestStreak, setBest]     = useState(0);
  const [total, setTotal]         = useState(0);
  const [current, setCurrent]     = useState(null);
  const [flash, setFlash]         = useState(null); // "ok"|"err"
  const prevIdRef  = useRef(null);
  const xpSaved    = useRef(false);
  const timerRef   = useRef(null);
  const flashRef   = useRef(null);

  useEffect(() => {
    if (pool.length === 0) {
      // Нет вопросов — завершаем без краша
      onOver({ score: 0, total: 0, bestStreak: 0 });
      return;
    }
    nextQ();
  }, []);

  useEffect(() => {
    if (timeLimit === 0) return; // бесконечно
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function finish() {
    clearInterval(timerRef.current);
    if (!xpSaved.current) {
      xpSaved.current = true;
      const xp = score * 5;
      if (xp > 0) updateStats(s => ({ ...s, xp: s.xp + xp, coins: s.coins + Math.floor(score / 5) }));
    }
    onOver({ score, total, bestStreak });
  }

  function nextQ() {
    const q = makeQuestion(pool, prevIdRef.current);
    if (!q) { finish(); return; }
    if (q.letter) prevIdRef.current = q.letter.id;
    if (q.word)   prevIdRef.current = q.word.id;
    setCurrent(q);
  }

  function answer(choiceId) {
    if (!current || flash) return;
    setTotal(t => t + 1);
    const ok = choiceId === current.correctId;
    setFlash(ok ? "ok" : "err");
    if (ok) {
      setScore(s => s + 1);
      setStreak(st => { const n = st + 1; setBest(b => Math.max(b, n)); return n; });
    } else {
      setStreak(0);
      if (current.letter) updateCardReview(current.letter.id, 0);
    }
    flashRef.current = setTimeout(() => {
      setFlash(null);
      nextQ();
    }, 280);
  }

  if (!current) return null;

  const timerPct = timeLimit ? (timeLeft / timeLimit) * 100 : 100;
  const timerColor = !timeLimit ? "bg-indigo-500" : timeLeft > timeLimit*0.5 ? "bg-green-500" : timeLeft > timeLimit*0.2 ? "bg-yellow-500" : "bg-red-500";

  // Вопрос
  let prompt = null;
  let choices = [];
  if (current.type === "name-to-letter") {
    prompt = <span className={`text-2xl font-bold ${dark?"text-white":"text-gray-800"}`}>{current.letter.name}</span>;
    choices = current.choices.map(c => ({ id:c.id, label:c.symbol, style:{ fontFamily:"serif", fontSize:32, direction:"rtl" } }));
  } else if (current.type === "letter-to-name") {
    prompt = <LetterDisplay symbol={current.letter.symbol} name="" size={72} />;
    choices = current.choices.map(c => ({ id:c.id, label:c.name }));
  } else if (current.type === "slug-to-sound") {
    const slug = current.letter + current.vowel.symbol;
    prompt = <span style={{ fontFamily:"serif", fontSize:52, direction:"rtl" }} className={dark?"text-white":"text-gray-900"}>{slug}</span>;
    choices = current.choices.map(c => ({ id:c.id, label:c.sound }));
  } else if (current.type === "word-to-translation") {
    prompt = <span style={{ fontFamily:"serif", fontSize:36, direction:"rtl" }} className={dark?"text-white":"text-gray-900"}>{current.word.hebrew}</span>;
    choices = current.choices.map(c => ({ id:c.id, label:c.translation }));
  }

  return (
    <div className={`pb-4 px-4 pt-4 max-w-md mx-auto transition-colors ${flash==="ok"?"bg-green-500/10":flash==="err"?"bg-red-500/10":""}`}>
      {/* Шапка */}
      <div className="flex justify-between items-center mb-2">
        <span className={`font-black text-2xl ${timeLimit && timeLeft<=10?"text-red-500 animate-pulse":dark?"text-white":"text-gray-800"}`}>
          {timeLimit === 0 ? "∞" : `${timeLeft}с`}
        </span>
        <div className="flex items-center gap-2">
          {streak > 1 && <span className="text-orange-400 text-sm font-bold">🔥{streak}</span>}
        </div>
        <span className={`font-bold text-xl ${dark?"text-yellow-400":"text-yellow-600"}`}>⚡ {score}</span>
      </div>
      {timeLimit > 0 && (
        <div className="mb-3">
          <ProgressBar pct={timerPct} color={timerColor} height="h-2" />
        </div>
      )}

      {/* Промпт */}
      <div className={`rounded-3xl flex items-center justify-center mb-4 ${dark?"bg-gray-800":"bg-gradient-to-b from-indigo-50 to-purple-50"}`}
        style={{ height:130 }}>
        {prompt}
      </div>

      {/* Варианты */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map(ch => (
          <button key={ch.id} onClick={() => answer(ch.id)}
            style={ch.style}
            className={`py-4 rounded-2xl font-bold text-base transition-all active:scale-95
              ${dark
                ? "bg-gray-800 text-white border border-gray-700 hover:border-indigo-500"
                : "bg-white text-gray-800 border-2 border-gray-100 hover:border-indigo-400 shadow-sm"
              }`}>
            {ch.label}
          </button>
        ))}
      </div>

      {/* Кнопка стоп */}
      {!isRated && (
        <button onClick={finish}
          className={`w-full mt-4 py-3 rounded-2xl text-sm font-medium ${dark?"text-gray-500 border border-gray-700":"text-gray-400 border border-gray-200"}`}>
          Завершить
        </button>
      )}
    </div>
  );
}

// ─── Меню тренировки ─────────────────────────────────────────────────────────
function TrainingMenu({ stats, dark, onStart }) {
  const [topics, setTopics] = useState(["alphabet"]);
  const [time, setTime]     = useState(60);

  function toggleTopic(id) {
    setTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  // Проверяем доступность тем
  const unlockedAlpha  = ALPHABET.filter(l => LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== "locked")).length;
  const unlockedNikud  = NIKUD_GROUPS.filter(g => stats.nikudProgress?.groupProgress?.[g.id] === "completed").length;
  const learnedWords   = (stats.nikudProgress?.wordsStudied || []).length;

  const topicAvail = {
    alphabet: unlockedAlpha >= 4,
    nikud:    unlockedNikud >= 1,
    words:    learnedWords  >= 4,
  };

  function handleStart() {
    const validTopics = topics.filter(t => topicAvail[t]);
    if (!validTopics.length) return;
    onStart({ topics: validTopics, timeLimit: time, isRated: false });
  }

  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      <h3 className={`text-lg font-bold mb-4 ${dark?"text-white":"text-gray-900"}`}>🎯 Тренировка</h3>

      {/* Темы */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark?"text-gray-400":"text-gray-500"}`}>Темы</p>
      <div className="flex flex-col gap-2 mb-5">
        {TOPIC_OPTIONS.map(t => {
          const avail   = topicAvail[t.id];
          const checked = topics.includes(t.id);
          return (
            <button key={t.id}
              onClick={() => avail && toggleTopic(t.id)}
              disabled={!avail}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                ${!avail ? "opacity-30 " + (dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200")
                  : checked
                    ? dark ? "bg-indigo-900/40 border-indigo-500" : "bg-indigo-50 border-indigo-400"
                    : dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
              <span className="text-xl">{t.icon}</span>
              <span className={`flex-1 text-sm font-medium ${dark?"text-white":"text-gray-800"}`}>{t.label}</span>
              {!avail && <span className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>🔒 нет материала</span>}
              {avail && (
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                  ${checked ? "bg-indigo-500 border-indigo-500" : dark ? "border-gray-600" : "border-gray-300"}`}>
                  {checked && <span className="text-white text-xs">✓</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Время */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark?"text-gray-400":"text-gray-500"}`}>Время</p>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {TIME_OPTIONS.map(t => (
          <button key={t.val} onClick={() => setTime(t.val)}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all
              ${time === t.val
                ? "bg-indigo-500 text-white"
                : dark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-600"
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      <button onClick={handleStart}
        disabled={topics.filter(t => topicAvail[t]).length === 0}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40">
        Начать тренировку →
      </button>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function GameScreen() {
  const { dark } = useTheme();
  const { stats, updateStats } = useStats();
  const [phase, setPhase]   = useState("menu"); // menu | playing | over
  const [config, setConfig] = useState(null);   // { topics, timeLimit, isRated }
  const [result, setResult] = useState(null);   // { score, total, bestStreak }
  const [showTraining, setShowTraining] = useState(false);

  const unlockedLetters = ALPHABET.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.groupProgress?.[g.id] !== "locked")
  );
  const hasEnoughForGame = unlockedLetters.length >= 4;

  function startRated() {
    // Рейтинговая: всё пройденное, буквы всегда включены
    const topics = ["alphabet"];
    if (NIKUD_GROUPS.some(g => stats.nikudProgress?.groupProgress?.[g.id] === "completed")) topics.push("nikud");
    if ((stats.nikudProgress?.wordsStudied||[]).length >= 4) topics.push("words");
    setConfig({ topics, timeLimit: 60, isRated: true });
    setPhase("playing");
    setShowTraining(false);
  }

  function startTraining(cfg) {
    setConfig(cfg);
    setPhase("playing");
    setShowTraining(false);
  }

  function handleOver(res) {
    setResult(res);
    setPhase("over");
    setShowTraining(false);
  }

  const pool = config ? buildQuestionPool(stats, config.topics) : [];

  // ── Игра ───────────────────────────────────────────────────────────────────
  if (phase === "playing" && config) {
    return <PlayingGame
      pool={pool}
      timeLimit={config.timeLimit}
      isRated={config.isRated}
      dark={dark}
      onOver={handleOver}
    />;
  }

  // ── Результат ──────────────────────────────────────────────────────────────
  if (phase === "over" && result) {
    const xpGained  = result.score * 5;
    const accuracy  = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    const isRated   = config?.isRated;
    return (
      <div className="pb-24 px-4 pt-12 max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">{result.score >= 20 ? "🏆" : result.score >= 10 ? "🎯" : "💪"}</div>
        <h2 className={`text-2xl font-bold mb-1 ${dark?"text-white":"text-gray-900"}`}>
          {isRated ? "Время вышло!" : "Тренировка окончена!"}
        </h2>
        <p className={`text-5xl font-black mb-1 ${dark?"text-indigo-400":"text-indigo-600"}`}>{result.score}</p>
        <p className={`mb-2 ${dark?"text-gray-400":"text-gray-500"}`}>правильных · +{xpGained} XP</p>
        <div className="flex justify-center gap-4 mb-6">
          <div className={`rounded-xl px-4 py-2 ${dark?"bg-gray-800":"bg-gray-100"}`}>
            <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>Точность</p>
            <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{accuracy}%</p>
          </div>
          <div className={`rounded-xl px-4 py-2 ${dark?"bg-gray-800":"bg-gray-100"}`}>
            <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>Серия</p>
            <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>🔥{result.bestStreak}</p>
          </div>
          <div className={`rounded-xl px-4 py-2 ${dark?"bg-gray-800":"bg-gray-100"}`}>
            <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>Всего</p>
            <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{result.total}</p>
          </div>
        </div>
        {isRated ? (
          <button onClick={startRated}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-xl mb-3">
            Ещё раз!
          </button>
        ) : (
          <button onClick={() => { setShowTraining(true); setPhase("menu"); setResult(null); }}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-xl mb-3">
            Ещё раз
          </button>
        )}
        <button onClick={() => { setPhase("menu"); setResult(null); setShowTraining(false); }}
          className={`w-full py-4 rounded-2xl font-bold text-lg border-2 ${dark?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>
          В меню
        </button>
      </div>
    );
  }

  // ── Меню тренировки ────────────────────────────────────────────────────────
  if (showTraining) return (
    <div className="max-w-md mx-auto">
      <button onClick={() => setShowTraining(false)}
        className={`flex items-center gap-1 px-4 pt-4 text-sm font-medium ${dark?"text-gray-400":"text-gray-500"}`}>
        ← Назад
      </button>
      <TrainingMenu stats={stats} dark={dark} onStart={startTraining} />
    </div>
  );

  // ── Главное меню игры ──────────────────────────────────────────────────────
  const ratedTopics = [];
  if (unlockedLetters.length >= 4) ratedTopics.push("Буквы");
  if (NIKUD_GROUPS.some(g => stats.nikudProgress?.groupProgress?.[g.id] === "completed")) ratedTopics.push("Огласовки");
  if ((stats.nikudProgress?.wordsStudied||[]).length >= 4) ratedTopics.push("Слова");

  return (
    <div className="pb-24 px-4 pt-6 max-w-md mx-auto">
      <h2 className={`text-xl font-bold mb-1 ${dark?"text-white":"text-gray-900"}`}>Игра</h2>
      <p className={`text-sm mb-5 ${dark?"text-gray-400":"text-gray-500"}`}>Проверь знания на скорость</p>

      {/* Рейтинговая */}
      <div className={`rounded-2xl border mb-3 overflow-hidden ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
          <p className="text-white font-bold">🏆 Рейтинговая игра</p>
          <p className="text-orange-100 text-xs">60 секунд · результат в лидерборд</p>
        </div>
        <div className="px-4 py-4">
          <p className={`text-sm mb-3 ${dark?"text-gray-300":"text-gray-600"}`}>
            Вопросы из всего пройденного материала:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ratedTopics.length > 0 ? ratedTopics.map(t => (
              <span key={t} className={`text-xs px-2 py-1 rounded-full font-medium ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                {t}
              </span>
            )) : (
              <span className={`text-xs ${dark?"text-gray-500":"text-gray-400"}`}>Пройди хотя бы 1 группу букв</span>
            )}
          </div>
          <button onClick={startRated}
            disabled={ratedTopics.length === 0}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3.5 rounded-xl font-bold disabled:opacity-40">
            Играть 60 сек →
          </button>
        </div>
      </div>

      {/* Тренировка */}
      <div className={`rounded-2xl border overflow-hidden ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
          <p className="text-white font-bold">🎯 Тренировка</p>
          <p className="text-indigo-100 text-xs">Настрой сам · не влияет на рейтинг</p>
        </div>
        <div className="px-4 py-4">
          <p className={`text-sm mb-4 ${dark?"text-gray-300":"text-gray-600"}`}>
            Выбери темы, тип вопросов и время.
          </p>
          <button onClick={() => setShowTraining(true)}
            disabled={!hasEnoughForGame}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-40">
            Настроить тренировку →
          </button>
        </div>
      </div>

      {/* Рекорд / лидерборд заглушка */}
      <div className={`mt-3 rounded-2xl p-4 border ${dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-100"}`}>
        <p className={`text-xs font-semibold ${dark?"text-gray-400":"text-gray-500"}`}>Лидерборд — скоро</p>
        <p className={`text-xs mt-0.5 ${dark?"text-gray-600":"text-gray-400"}`}>Соревнуйся с другими участниками</p>
      </div>
    </div>
  );
}
