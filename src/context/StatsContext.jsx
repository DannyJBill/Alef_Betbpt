import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { INITIAL_STATS, computeLevel } from "../data/constants";
import { saveStatsToServer, loadStatsFromServer, resetStatsOnServer } from "../helpers/serverSync";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import { Analytics } from "../helpers/analytics";

const STORAGE_KEY    = "hebrew-app-stats";
const SCHEMA_VERSION = 4;

const TGCloud = window.Telegram?.WebApp?.CloudStorage;
function tgGet(k) { return new Promise((res,rej) => TGCloud.getItem(k,(e,v)=>e?rej(e):res(v))); }
function tgSet(k,v) { return new Promise((res,rej) => TGCloud.setItem(k,v,e=>e?rej(e):res())); }

function migrate(p) {
  // v1 → v2
  if (p.version === 1) {
    p.groupProgress   = { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' };
    p.groupTestScores = {};
    p.cardReviews     = {};
    p.weakLetters     = {};
    p.totalAnswers    = 0;
    p.correctAnswers  = 0;
    p.lastStudiedDate = null;
    p.version = 2;
  }
  // Referral fields (v2 patch)
  if (!p.referralCode) {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    p.referralCode      = tgId ? `ref_${tgId}` : `ref_${Date.now()}`;
    p.referredBy        = null;
    p.referralRewarded  = false;
    p.referralsCount    = 0;
    p.referralsXpEarned = 0;
  }
  // v2 → v3: premium + AI usage
  if (!p.version || p.version < 3) {
    if (p.isPremium === undefined)          p.isPremium          = false;
    if (p.premiumPurchasedAt === undefined) p.premiumPurchasedAt = null;
    if (p.premiumType === undefined)        p.premiumType        = null;
    if (!p.aiUsageToday)                    p.aiUsageToday       = { date: null, count: 0 };
    p.version = 3;
  }
  // v3 → v4: nikud progress
  if (p.version < 4) {
    if (!p.nikudProgress) {
      p.nikudProgress = {
        groupProgress:   { 1: 'available', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked' },
        groupTestScores: {},
        vowelReviews:    {},  // "vowel_id:letter_symbol" → SM-2 данные
        wordsStudied:    [],  // массив id пройденных слов
        wordsCorrect:    {},  // word_id → счётчик правильных ответов
      };
    }
    p.version = 4;
  }
  return p;
}

async function loadFromStorage() {
  for (const read of [
    async () => TGCloud ? JSON.parse(await tgGet(STORAGE_KEY)||"null") : null,
    () => JSON.parse(localStorage.getItem(STORAGE_KEY)),
    () => JSON.parse(sessionStorage.getItem(STORAGE_KEY)),
  ]) {
    try { const p = await read(); if (p) return { ...INITIAL_STATS, ...migrate(p) }; } catch {}
  }
  // Fresh user — generate referral code
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
  return { ...stats, streak: stats.lastStudiedDate===yesterday ? stats.streak+1 : 1, lastStudiedDate: today };
}

async function registerReferral(newUserId, startParam) {
  if (!startParam?.startsWith("ref_")) return;
  try {
    await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUserId, referralCode: startParam }),
    });
  } catch { /* silent */ }
}

async function rewardReferrer(referrerId, refereeName) {
  try {
    await fetch("/api/referral/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId, refereeName }),
    });
  } catch { /* silent */ }
}

const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats]     = useState(INITIAL_STATS);
  const [ready, setReady]     = useState(false);
  const saveRef               = useRef(null);
  const serverSaveRef         = useRef(null);
  const referralDoneRef       = useRef(false);

  useEffect(() => {
    (async () => {
      const local = await loadFromStorage();
      setStats(local);
      setReady(true);

      const server = await loadStatsFromServer(local);
      if (server) {
        const score = (s) => (s.xp || 0) * 10
          + Object.values(s.groupProgress || {}).filter(v => v === "completed").length * 1000
          + (s.isPremium ? 10000 : 0);
        const serverRicher  = score(server) > score(local);
        const serverFresher = (server.updatedAt || 0) > (local.updatedAt || 0) && (server.xp || 0) > 0;
        if (serverRicher || serverFresher) {
          setStats({ ...INITIAL_STATS, ...migrate(server) });
        }
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
    // Local save: debounce 300ms (reset on each action — fine)
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => saveToStorage(data), 300);

    // Server save: fires 30s after the FIRST action in a burst, not the last.
    // This ensures data reaches the server even during active gameplay.
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

  // ── SM-2 для букв алфавита ─────────────────────────────────────────────────
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

  // ── Тест группы букв ───────────────────────────────────────────────────────
  const completeGroupTest = useCallback((groupId, score) => {
    setStats(prev => {
      const newGroupProgress   = { ...prev.groupProgress };
      const newGroupTestScores = { ...prev.groupTestScores };
      newGroupTestScores[groupId] = {
        score, passedAt: Date.now(),
        attempts: (prev.groupTestScores?.[groupId]?.attempts||0)+1,
      };

      let xpBonus = score >= 70 ? 50 : 10;

      if (score >= 70) {
        newGroupProgress[groupId] = 'completed';
        const nextGroup = LETTER_GROUPS.find(g => g.unlocksAfter===groupId);
        if (nextGroup && newGroupProgress[nextGroup.id] === 'locked') {
          newGroupProgress[nextGroup.id] = 'available';
        }
        if (groupId === 1 && !prev.referralRewarded && prev.referredBy) {
          xpBonus += 100;
          const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          rewardReferrer(prev.referredBy, tgUser?.first_name || "Твой друг");
        }
      }

      const updated = {
        ...prev,
        groupProgress:   newGroupProgress,
        groupTestScores: newGroupTestScores,
        xp: prev.xp + xpBonus,
        ...(groupId === 1 && score >= 70 && !prev.referralRewarded && prev.referredBy
          ? { referralRewarded: true } : {}),
      };
      Analytics.lessonComplete(groupId, score);
      if (score >= 70) Analytics.groupComplete(groupId, score);
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  // ── Тест группы огласовок ──────────────────────────────────────────────────
  const completeNikudGroupTest = useCallback((groupId, score) => {
    setStats(prev => {
      const np = { ...(prev.nikudProgress || {}) };
      const gp = { ...(np.groupProgress || { 1:'available',2:'locked',3:'locked',4:'locked',5:'locked' }) };
      const gs = { ...(np.groupTestScores || {}) };

      gs[groupId] = {
        score, passedAt: Date.now(),
        attempts: (gs[groupId]?.attempts || 0) + 1,
      };

      let xpBonus = score >= 70 ? 30 : 5;

      if (score >= 70) {
        gp[groupId] = 'completed';
        const nextGroup = NIKUD_GROUPS.find(g => g.unlocksAfter === groupId);
        if (nextGroup && gp[nextGroup.id] === 'locked') {
          gp[nextGroup.id] = 'available';
        }
      }

      const next = {
        ...prev,
        xp: (prev.xp || 0) + xpBonus,
        nikudProgress: { ...np, groupProgress: gp, groupTestScores: gs },
      };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── SM-2 для огласовок ─────────────────────────────────────────────────────
  // key = "vowel_id:letter_symbol", например "patah:מ"
  const updateVowelReview = useCallback((key, quality) => {
    setStats(prev => {
      const np      = { ...(prev.nikudProgress || {}) };
      const reviews = { ...(np.vowelReviews || {}) };
      reviews[key]  = sm2(reviews[key], quality);
      const next    = {
        ...prev,
        nikudProgress: { ...np, vowelReviews: reviews },
      };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Прогресс слов ──────────────────────────────────────────────────────────
  const recordWordResult = useCallback((wordId, isCorrect) => {
    setStats(prev => {
      const np      = { ...(prev.nikudProgress || {}) };
      const studied = np.wordsStudied?.includes(wordId)
        ? np.wordsStudied
        : [...(np.wordsStudied || []), wordId];
      const correct = { ...(np.wordsCorrect || {}) };
      if (isCorrect) correct[wordId] = (correct[wordId] || 0) + 1;
      const next    = {
        ...prev,
        nikudProgress: { ...np, wordsStudied: studied, wordsCorrect: correct },
      };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── SM-2 очередь огласовок ─────────────────────────────────────────────────
  const getDueVowelCards = useCallback(() => {
    const now     = Date.now();
    const reviews = stats.nikudProgress?.vowelReviews || {};
    return Object.entries(reviews)
      .filter(([, r]) => r.nextReview <= now)
      .map(([key]) => key);
  }, [stats.nikudProgress]);

  // ── SM-2 очередь букв ──────────────────────────────────────────────────────
  const getDueCards = useCallback((alphabet) => {
    const now = Date.now();
    return alphabet.filter(l => {
      const r = stats.cardReviews?.[l.id];
      return !r || r.nextReview <= now;
    });
  }, [stats.cardReviews]);

  // ── AI лимит ───────────────────────────────────────────────────────────────
  const AI_FREE_LIMIT = 3;

  const canUseAI = useCallback(() => {
    if (stats.isPremium) return true;
    const today = new Date().toISOString().slice(0, 10);
    const usage = stats.aiUsageToday;
    if (usage.date !== today) return true;
    return usage.count < AI_FREE_LIMIT;
  }, [stats.isPremium, stats.aiUsageToday]);

  const incrementAIUsage = useCallback(() => {
    if (stats.isPremium) return;
    setStats(prev => {
      const today    = new Date().toISOString().slice(0, 10);
      const prevUsage = prev.aiUsageToday || { date: null, count: 0 };
      const newCount  = prevUsage.date === today ? prevUsage.count + 1 : 1;
      const next      = { ...prev, aiUsageToday: { date: today, count: newCount } };
      scheduleSave(next);
      return next;
    });
  }, [stats.isPremium, scheduleSave]);

  const getAIUsageLeft = useCallback(() => {
    if (stats.isPremium) return Infinity;
    const today = new Date().toISOString().slice(0, 10);
    const usage = stats.aiUsageToday;
    if (usage.date !== today) return AI_FREE_LIMIT;
    return Math.max(0, AI_FREE_LIMIT - usage.count);
  }, [stats.isPremium, stats.aiUsageToday]);

  // ── Полный сброс прогресса ─────────────────────────────────────────────────
  const resetStats = useCallback(async () => {
    const fresh = {
      ...INITIAL_STATS,
      referralCode: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
        ? `ref_${window.Telegram.WebApp.initDataUnsafe.user.id}`
        : `ref_${Date.now()}`,
    };

    // 1. Очистить все локальные хранилища
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    if (TGCloud) {
      try {
        await new Promise((res, rej) =>
          TGCloud.removeItem(STORAGE_KEY, e => e ? rej(e) : res())
        );
      } catch {}
    }

    // 2. Удалить строку из базы
    await resetStatsOnServer();

    // 3. Сбросить стейт
    setStats(fresh);
    await saveToStorage(fresh);
  }, []);

  useEffect(() => () => {
    clearTimeout(saveRef.current);
    clearTimeout(serverSaveRef.current);
  }, []);

  return (
    <StatsContext.Provider value={{
      stats,
      updateStats,
      updateCardReview,
      completeGroupTest,
      getDueCards,
      ready,
      resetStats,
      // Огласовки
      completeNikudGroupTest,
      updateVowelReview,
      recordWordResult,
      getDueVowelCards,
      // Premium / AI
      canUseAI,
      incrementAIUsage,
      getAIUsageLeft,
      AI_FREE_LIMIT,
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
