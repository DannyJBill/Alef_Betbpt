import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { INITIAL_STATS, computeLevel, INITIAL_PROGRESS, MIN_CORRECT_TO_UNLOCK, WORDS_UNLOCK_THRESHOLD } from "../data/constants";
import { saveStatsToServer, loadStatsFromServer, resetStatsOnServer } from "../helpers/serverSync";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import { recalcProgress, blockKey, getContinueTarget, recalcWordsProgress } from "../helpers/progressHelpers";
import { Analytics } from "../helpers/analytics";

const STORAGE_KEY    = "hebrew-app-stats";
const SCHEMA_VERSION = 5;

const TGCloud = window.Telegram?.WebApp?.CloudStorage;
function tgGet(k) { return new Promise((res,rej) => TGCloud.getItem(k,(e,v)=>e?rej(e):res(v))); }
function tgSet(k,v) { return new Promise((res,rej) => TGCloud.setItem(k,v,e=>e?rej(e):res())); }

// ─── Миграция ─────────────────────────────────────────────────────────────────
function migrate(p) {
  if (!p) return { ...INITIAL_STATS };

  // v1 → v2
  if (!p.version || p.version < 2) {
    p.groupProgress   = { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' };
    p.groupTestScores = {};
    p.cardReviews     = {};
    p.weakLetters     = {};
    p.totalAnswers    = 0;
    p.correctAnswers  = 0;
    p.lastStudiedDate = null;
    p.version = 2;
  }
  // referral patch
  if (!p.referralCode) {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    p.referralCode     = tgId ? `ref_${tgId}` : `ref_${Date.now()}`;
    p.referredBy       = null;
    p.referralRewarded = false;
    p.referralsCount   = 0;
    p.referralsXpEarned= 0;
  }
  // v2 → v3
  if (p.version < 3) {
    p.isPremium          = p.isPremium          ?? false;
    p.premiumPurchasedAt = p.premiumPurchasedAt ?? null;
    p.premiumType        = p.premiumType        ?? null;
    p.aiUsageToday       = p.aiUsageToday       ?? { date: null, count: 0 };
    p.version = 3;
  }
  // v3 → v4
  if (p.version < 4) {
    p.nikudProgress = p.nikudProgress ?? {
      groupProgress:   { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' },
      groupTestScores: {},
      vowelReviews:    {},
      wordsStudied:    [],
      wordsCorrect:    {},
    };
    p.version = 4;
  }
  // v4 → v5: переход на матрицу прогрессии
  if (p.version < 5) {
    // Конвертируем старый groupProgress (буквы) в новую матрицу
    const oldLetters  = p.groupProgress || {};
    const oldNikud    = p.nikudProgress?.groupProgress || {};
    const oldWords    = p.nikudProgress?.wordsCorrect || {};

    // letters: completed → done, available → available, locked → locked
    const lettersNew = {};
    for (let n = 1; n <= 5; n++) {
      const s = oldLetters[n];
      lettersNew[n] = s === 'completed' ? 'done' : (s || 'locked');
    }

    // sounds: completed → done, available → available
    // Важно: если огласовки уже были открыты в v4 — не закрывать,
    // даже если новое правило требует L1+L2
    const soundsNew = {};
    for (let n = 1; n <= 5; n++) {
      const s = oldNikud[n];
      soundsNew[n] = s === 'completed' ? 'done' : (s === 'available' ? 'available' : 'locked');
    }
    // Если Н1 была открыта в старой версии — оставить available
    if (soundsNew[1] === 'locked' &&
        (oldNikud[1] === 'available' || oldNikud[1] === 'completed')) {
      soundsNew[1] = 'available';
    }

    // words: если есть хоть какие-то пройденные слова — открываем пакет 1
    const hasWords = Object.keys(oldWords).length > 0;

    // blockScores: восстанавливаем приблизительно
    const blockScores = {};
    for (let n = 1; n <= 5; n++) {
      if (lettersNew[n] === 'done')
        blockScores[blockKey('letters', n)] = MIN_CORRECT_TO_UNLOCK;
      if (soundsNew[n] === 'done')
        blockScores[blockKey('sounds', n)] = MIN_CORRECT_TO_UNLOCK;
    }
    if (hasWords) blockScores[blockKey('words', 1)] = MIN_CORRECT_TO_UNLOCK;

    // sounds[1] остаётся locked — откроется после L1+L2
    p.progress    = recalcProgress(
      { letters: lettersNew, sounds: soundsNew,
        words:   { 1:'available',2:'locked',3:'locked',4:'locked',5:'locked' },
        phrases: { 1:'available',2:'locked',3:'locked',4:'locked',5:'locked' } },
      blockScores
    );
    p.blockScores = blockScores;
    p.testScores  = {};  // пересчитается при следующем тесте

    // SM-2 и слова — перекладываем на верхний уровень
    p.cardReviews  = p.cardReviews  || {};
    p.weakLetters  = p.weakLetters  || {};
    // Конвертировать типы: числа → строки для совместимости с v5
    p.wordsStudied = (p.nikudProgress?.wordsStudied || []).map(id => String(id));
    p.wordsCorrect = {};
    Object.entries(p.nikudProgress?.wordsCorrect || {}).forEach(([k, v]) => {
      p.wordsCorrect[String(k)] = v;
    });

    // Оставляем vowelReviews для совместимости
    p.vowelReviews = p.nikudProgress?.vowelReviews || {};

    // Убираем старые поля
    delete p.groupProgress;
    delete p.groupTestScores;
    delete p.nikudProgress;

    p.version = 5;
  }

  return p;
}

// ─── Хранилище ────────────────────────────────────────────────────────────────
async function loadFromStorage() {
  for (const read of [
    async () => TGCloud ? JSON.parse(await tgGet(STORAGE_KEY)||"null") : null,
    () => JSON.parse(localStorage.getItem(STORAGE_KEY)),
    () => JSON.parse(sessionStorage.getItem(STORAGE_KEY)),
  ]) {
    try { const p = await read(); if (p) return { ...INITIAL_STATS, ...migrate(p) }; } catch {}
  }
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return {
    ...INITIAL_STATS,
    referralCode: tgId ? `ref_${tgId}` : `ref_${Date.now()}`,
  };
}

async function saveToStorage(stats) {
  const payload = JSON.stringify({ ...stats, version: SCHEMA_VERSION });
  if (TGCloud) try { await tgSet(STORAGE_KEY, payload); } catch {}
  try { localStorage.setItem(STORAGE_KEY, payload); } catch {}
  try { sessionStorage.setItem(STORAGE_KEY, payload); } catch {}
}

// ─── SM-2 ─────────────────────────────────────────────────────────────────────
function sm2(card = {}, quality) {
  let { interval=1, repetitions=0, ef=2.5 } = card;
  if (quality < 1) { interval=1; repetitions=0; }
  else {
    if (repetitions===0) interval=1;
    else if (repetitions===1) interval=3;
    else interval=Math.round(interval*ef);
    repetitions+=1;
    ef=Math.max(1.3, ef+0.1-(2-quality)*(0.08+(2-quality)*0.02));
  }
  return { interval, repetitions, ef, nextReview: Date.now()+interval*86400000 };
}

function applyStreak(stats) {
  const today = new Date().toDateString();
  if (stats.lastStudiedDate===today) return stats;
  const yesterday = new Date(Date.now()-86400000).toDateString();
  return {
    ...stats,
    streak: stats.lastStudiedDate===yesterday ? stats.streak+1 : 1,
    lastStudiedDate: today,
  };
}

async function registerReferral(newUserId, startParam) {
  if (!startParam?.startsWith("ref_")) return;
  try {
    await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUserId, referralCode: startParam }),
    });
  } catch {}
}

async function rewardReferrer(referrerId, refereeName) {
  try {
    await fetch("/api/referral/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId, refereeName }),
    });
  } catch {}
}

// ─── Контекст ─────────────────────────────────────────────────────────────────
const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats]   = useState(INITIAL_STATS);
  const [ready, setReady]   = useState(false);
  const saveRef             = useRef(null);
  const serverSaveRef       = useRef(null);
  const referralDoneRef     = useRef(false);

  useEffect(() => {
    (async () => {
      const local = await loadFromStorage();
      setStats(local);
      setReady(true);

      const server = await loadStatsFromServer(local);
      if (server) {
        const score = (s) =>
          (s.xp || 0) * 10
          + Object.values(s.progress?.letters || {}).filter(v => v==='done').length * 1000
          + (s.isPremium ? 10000 : 0);
        if (score(server) > score(local) || (server.updatedAt||0) > (local.updatedAt||0)) {
          setStats({ ...INITIAL_STATS, ...migrate(server) });
        }
      } else {
        await saveStatsToServer(local);
      }

      if (!referralDoneRef.current) {
        referralDoneRef.current = true;
        const tgUser     = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if (tgUser?.id && startParam && !local.referredBy) {
          await registerReferral(tgUser.id, startParam);
          const referrerId = Number(startParam.replace("ref_", ""));
          if (referrerId && referrerId !== tgUser.id) {
            setStats(prev => {
              const next = { ...prev, referredBy: referrerId };
              saveToStorage(next);
              return next;
            });
          }
        }
      }
    })();
  }, []);

  const scheduleSave = useCallback((data) => {
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => saveToStorage(data), 300);
    if (!serverSaveRef.current) {
      serverSaveRef.current = setTimeout(() => {
        saveStatsToServer(data);
        serverSaveRef.current = null;
      }, 30000);
    }
  }, []);

  const updateStats = useCallback((updater) => {
    setStats(prev => {
      const updated = updater(prev);
      const next    = { ...updated, level: computeLevel(updated.xp ?? prev.xp) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── SM-2 для букв ──────────────────────────────────────────────────────────
  const updateCardReview = useCallback((letterId, quality) => {
    setStats(prev => {
      Analytics.cardReview(letterId, quality);
      const updated     = sm2(prev.cardReviews?.[letterId], quality);
      const weakLetters = { ...prev.weakLetters };
      if (quality===0) weakLetters[letterId] = (weakLetters[letterId]||0)+1;
      const next = applyStreak({
        ...prev,
        cardReviews:    { ...prev.cardReviews, [letterId]: updated },
        weakLetters,
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(quality>0?1:0),
      });
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Запись результата ответа в игре (матрица) ──────────────────────────────
  // section: 'letters'|'sounds'|'words'|'phrases'
  // blockN: 1-5
  // isCorrect: bool
  const recordGameAnswer = useCallback((section, blockN, isCorrect) => {
    setStats(prev => {
      const key          = blockKey(section, blockN);
      const oldScore     = prev.blockScores?.[key] || 0;
      const newScore     = isCorrect ? oldScore + 1 : oldScore;
      const newBlockScores = { ...prev.blockScores, [key]: newScore };

      // Пересчитываем матрицу
      const newProgress  = recalcProgress(prev.progress || INITIAL_PROGRESS, newBlockScores);

      const next = applyStreak({
        ...prev,
        blockScores:    newBlockScores,
        progress:       newProgress,
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(isCorrect?1:0),
        xp:             (prev.xp||0)+(isCorrect?2:0),
      });
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Принудительное завершение блока (после теста ≥70%) ────────────────────
  const completeBlock = useCallback((section, blockN, testScore) => {
    setStats(prev => {
      const key = blockKey(section, blockN);
      // Ставим счёт не ниже MIN_CORRECT_TO_UNLOCK
      const newScore = Math.max(prev.blockScores?.[key] || 0, MIN_CORRECT_TO_UNLOCK);
      const newBlockScores = { ...prev.blockScores, [key]: newScore };

      // Сохраняем процент теста
      const testKey = `${section}_${blockN}`;
      const newTestScores = { ...(prev.testScores || {}), [testKey]: Math.max(prev.testScores?.[testKey] || 0, testScore) };

      // Пересчитываем матрицу
      const newProgress = recalcProgress(prev.progress || INITIAL_PROGRESS, newBlockScores);

      // Пересчитываем доступность слов на основе тестовых результатов
      const newWordsProgress = recalcWordsProgress(newProgress.words || {}, newTestScores);
      newProgress.words = newWordsProgress;

      const xpBonus = testScore >= 90 ? 80 : testScore >= 70 ? 50 : 10;
      const next = {
        ...prev,
        blockScores: newBlockScores,
        testScores:  newTestScores,
        progress:    newProgress,
        xp:          (prev.xp||0) + xpBonus,
      };

      // Реферальный бонус при первом блоке
      if (section==='letters' && blockN===1 && testScore>=70 && !prev.referralRewarded && prev.referredBy) {
        next.xp += 100;
        next.referralRewarded = true;
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        rewardReferrer(prev.referredBy, tgUser?.first_name || "Твой друг");
      }

      Analytics.lessonComplete(blockN, testScore);
      if (testScore >= 70) Analytics.groupComplete(blockN, testScore);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Обратная совместимость: старые экраны ─────────────────────────────────
  // LearnScreen / NikudScreen ещё используют completeGroupTest / completeNikudGroupTest
  const completeGroupTest = useCallback((groupId, score) => {
    completeBlock('letters', groupId, score);
  }, [completeBlock]);

  const completeNikudGroupTest = useCallback((groupId, score) => {
    completeBlock('sounds', groupId, score);
  }, [completeBlock]);

  // ── SM-2 для огласовок ─────────────────────────────────────────────────────
  const updateVowelReview = useCallback((key, quality) => {
    setStats(prev => {
      const reviews = { ...(prev.vowelReviews || {}) };
      reviews[key]  = sm2(reviews[key], quality);
      const next    = { ...prev, vowelReviews: reviews };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Прогресс слов ──────────────────────────────────────────────────────────
  const recordWordResult = useCallback((wordId, isCorrect) => {
    setStats(prev => {
      const studied = prev.wordsStudied?.includes(wordId)
        ? prev.wordsStudied
        : [...(prev.wordsStudied || []), wordId];
      const correct = { ...(prev.wordsCorrect || {}) };
      if (isCorrect) correct[wordId] = (correct[wordId] || 0) + 1;

      const next = applyStreak({
        ...prev,
        wordsStudied: studied,
        wordsCorrect: correct,
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(isCorrect?1:0),
        xp: (prev.xp||0)+(isCorrect?3:0),
      });

      // Записываем в матрицу — определяем блок слова
      // (упрощённо: если слово изучено 2+ раза — считаем как правильный ответ в блоке)
      if (isCorrect) {
        // WordsScreen сам передаст blockN если захочет точности
      }

      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── SM-2 очереди ───────────────────────────────────────────────────────────
  const getDueCards = useCallback((alphabet) => {
    const now = Date.now();
    return alphabet.filter(l => {
      const r = stats.cardReviews?.[l.id];
      return !r || r.nextReview <= now;
    });
  }, [stats.cardReviews]);

  const getDueVowelCards = useCallback(() => {
    const now     = Date.now();
    const reviews = stats.vowelReviews || {};
    return Object.entries(reviews)
      .filter(([, r]) => r.nextReview <= now)
      .map(([key]) => key);
  }, [stats.vowelReviews]);

  // ── AI лимит ───────────────────────────────────────────────────────────────
  const AI_FREE_LIMIT = 3;

  const canUseAI = useCallback(() => {
    if (stats.isPremium) return true;
    const today = new Date().toISOString().slice(0, 10);
    const usage = stats.aiUsageToday || { date: null, count: 0 };
    if (usage.date !== today) return true;
    return usage.count < AI_FREE_LIMIT;
  }, [stats.isPremium, stats.aiUsageToday]);

  const incrementAIUsage = useCallback(() => {
    if (stats.isPremium) return;
    setStats(prev => {
      const today   = new Date().toISOString().slice(0, 10);
      const prev_u  = prev.aiUsageToday || { date: null, count: 0 };
      const newCount= prev_u.date === today ? prev_u.count + 1 : 1;
      const next    = { ...prev, aiUsageToday: { date: today, count: newCount } };
      scheduleSave(next);
      return next;
    });
  }, [stats.isPremium, scheduleSave]);

  const getAIUsageLeft = useCallback(() => {
    if (stats.isPremium) return Infinity;
    const today = new Date().toISOString().slice(0, 10);
    const usage = stats.aiUsageToday || { date: null, count: 0 };
    if (usage.date !== today) return AI_FREE_LIMIT;
    return Math.max(0, AI_FREE_LIMIT - usage.count);
  }, [stats.isPremium, stats.aiUsageToday]);

  // ── Сброс ─────────────────────────────────────────────────────────────────
  const resetStats = useCallback(async () => {
    const fresh = {
      ...INITIAL_STATS,
      referralCode: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
        ? `ref_${window.Telegram.WebApp.initDataUnsafe.user.id}`
        : `ref_${Date.now()}`,
    };
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    if (TGCloud) {
      try {
        await new Promise((res, rej) =>
          TGCloud.removeItem(STORAGE_KEY, e => e ? rej(e) : res())
        );
      } catch {}
    }
    await resetStatsOnServer();
    setStats(fresh);
    await saveToStorage(fresh);
    await saveStatsToServer(fresh);
  }, []);

  useEffect(() => () => {
    clearTimeout(saveRef.current);
    clearTimeout(serverSaveRef.current);
  }, []);

  return (
    <StatsContext.Provider value={{
      stats,
      ready,
      updateStats,
      // Матрица
      recordGameAnswer,
      completeBlock,
      // Обратная совместимость
      completeGroupTest,
      completeNikudGroupTest,
      // SM-2
      updateCardReview,
      updateVowelReview,
      getDueCards,
      getDueVowelCards,
      // Слова
      recordWordResult,
      // AI
      canUseAI,
      incrementAIUsage,
      getAIUsageLeft,
      AI_FREE_LIMIT,
      // Сброс
      resetStats,
    }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside StatsProvider");
  return ctx;
}
