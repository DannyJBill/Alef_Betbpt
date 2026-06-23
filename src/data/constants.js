export const INITIAL_STATS = {
  xp: 0,
  coins: 0,
  streak: 0,
  lastStudiedDate: null,
  learnedIds: [],
  weakIds: [],
  groupProgress:   { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' },
  groupTestScores: {},
  cardReviews:     {},
  weakLetters:     {},
  totalAnswers:    0,
  correctAnswers:  0,
  dailyGoal: 10,
  dailyDone: 0,
  totalTime: 0,
};

export function computeLevel(xp) { return Math.floor(xp/100)+1; }
export function xpForLevel(lvl)  { return (lvl-1)*100; }

export function levelProgress(xp) {
  const level    = computeLevel(xp);
  const xpInLvl  = xp - xpForLevel(level);
  const pct      = Math.min(100, xpInLvl);
  const xpToNext = 100 - xpInLvl;
  return { level, pct, xpToNext };
}

export const LESSON_LENGTH    = 6;
export const AI_HISTORY_LIMIT = 10;

// Legacy — kept for HomeScreen compatibility
export const XP_PER_UNLOCK = 20;
export const INITIAL_UNLOCKED = 3;
