// ─── Уровни ───────────────────────────────────────────────────────────────────
export function computeLevel(xp) { return Math.floor(xp / 100) + 1; }
export function xpForLevel(lvl)  { return (lvl - 1) * 100; }
export function levelProgress(xp) {
  const level   = computeLevel(xp);
  const xpInLvl = xp - xpForLevel(level);
  const pct     = Math.min(100, xpInLvl);
  return { level, pct, xpToNext: 100 - xpInLvl };
}

// ─── Матрица прогрессии (4 раздела × 5 блоков) ───────────────────────────────
//
// Статусы блока: 'locked' | 'available' | 'done'
//
// Правило разблокировки:
//   letters[N] доступен если letters[N-1] === 'done'
//   sounds[N]  доступен если sounds[N-1] === 'done' И letters[N] === 'done'
//   words[N]   доступен если words[N-1]  === 'done' И sounds[N]  === 'done'
//   phrases[N] доступен если phrases[N-1]=== 'done' И words[N]   === 'done'
//
// Порог перехода: MIN_CORRECT правильных ответов в GameScreen из материала блока

export const MIN_CORRECT_TO_UNLOCK = 10; // минимум правильных для открытия след. блока

// Порог для открытия слов: нужно сдать тест на ≥90%
export const WORDS_UNLOCK_THRESHOLD = 90; // %

export const INITIAL_PROGRESS = {
  // letters/sounds: блок 1 доступен сразу
  // words/phrases: открываются по условию (letters[2]≥90% + sounds[2]≥90%)
  letters: { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' },
  sounds:  { 1:'locked',    2:'locked', 3:'locked', 4:'locked', 5:'locked' },
  words:   { 1:'locked',    2:'locked', 3:'locked', 4:'locked', 5:'locked' },
  phrases: { 1:'locked',    2:'locked', 3:'locked', 4:'locked', 5:'locked' },
};

// Счётчики правильных ответов по блокам (для порога)
// Формат: { 'letters_1': 15, 'sounds_2': 7, ... }
export const INITIAL_BLOCK_SCORES = {};

// Тестовые результаты по блокам
// Формат: { 'letters_2': 92, 'sounds_2': 88, ... }
export const INITIAL_TEST_SCORES = {};

// ─── Начальные stats (schema v5) ─────────────────────────────────────────────
export const INITIAL_STATS = {
  // Мета
  version: 5,

  // Геймификация
  xp: 0,
  coins: 0,
  streak: 0,
  lastStudiedDate: null,
  dailyGoal: 10,
  dailyDone: 0,
  totalTime: 0,
  totalAnswers: 0,
  correctAnswers: 0,

  // Реферралы
  referralCode:      null,
  referredBy:        null,
  referralRewarded:  false,
  referralsCount:    0,
  referralsXpEarned: 0,

  // Премиум
  isPremium:          false,
  premiumType:        null,
  premiumPurchasedAt: null,
  aiUsageToday:       { date: null, count: 0 },

  // ── Матрица прогрессии ────────────────────────────────────────────────────
  progress:    INITIAL_PROGRESS,   // статусы блоков
  blockScores: INITIAL_BLOCK_SCORES, // счётчики правильных

  // ── SM-2 карточки (буквы) ─────────────────────────────────────────────────
  cardReviews: {},   // letterId → { interval, repetitions, ef, nextReview }
  weakLetters: {},   // letterId → count ошибок

  // ── Счётчики слов ─────────────────────────────────────────────────────────
  wordsStudied: [],  // [word_id, ...]
  wordsCorrect: {},  // { word_id: count }

  // ── Прогресс чтения ───────────────────────────────────────────────────────
  readingProgress: { studied: [] },

  // ── Тестовые результаты блоков ────────────────────────────────────────────
  // 'letters_2': 92 означает "тест блока 2 букв сдан на 92%"
  testScores: {},
};

// ─── Константы ────────────────────────────────────────────────────────────────
export const LESSON_LENGTH    = 6;
export const AI_HISTORY_LIMIT = 10;
