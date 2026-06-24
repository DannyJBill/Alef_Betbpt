import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { INITIAL_STATS, computeLevel } from "../data/constants";
import { saveStatsToServer, loadStatsFromServer } from "../helpers/serverSync";
import { LETTER_GROUPS } from "../data/alphabet";
import { Analytics } from "../helpers/analytics";

const STORAGE_KEY = "hebrew-app-stats";
const SCHEMA_VERSION = 2;

const TGCloud = window.Telegram?.WebApp?.CloudStorage;
function tgGet(k) { return new Promise((res,rej) => TGCloud.getItem(k,(e,v)=>e?rej(e):res(v))); }
function tgSet(k,v) { return new Promise((res,rej) => TGCloud.setItem(k,v,e=>e?rej(e):res())); }

function migrate(p) {
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
  // Referral fields migration
  if (!p.referralCode) {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    p.referralCode      = tgId ? `ref_${tgId}` : `ref_${Date.now()}`;
    p.referredBy        = null;
    p.referralRewarded  = false;
    p.referralsCount    = 0;
    p.referralsXpEarned = 0;
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

// Register referral link on first open
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

// Notify server to reward referrer
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
  const [stats, setStats] = useState(INITIAL_STATS);
  const [ready, setReady] = useState(false);
  const saveRef       = useRef(null);
  const serverSaveRef = useRef(null);
  const referralDoneRef = useRef(false);

  useEffect(() => {
    (async () => {
      const local = await loadFromStorage();
      setStats(local);
      setReady(true);

      // Load from server (fresher data from another device)
      const server = await loadStatsFromServer();
      if (server && (server.updatedAt || 0) > (local.updatedAt || 0)) {
        setStats({ ...INITIAL_STATS, ...migrate(server) });
      }

      // Register referral on first open (only once)
      if (!referralDoneRef.current) {
        referralDoneRef.current = true;
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if (tgUser?.id && startParam && !local.referredBy) {
          await registerReferral(tgUser.id, startParam);
          // Save referredBy to local stats
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
    // Local storage — fast (300ms debounce)
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => saveToStorage(data), 300);
    // Server save — slow debounce (30s) to avoid hammering Supabase
    clearTimeout(serverSaveRef.current);
    serverSaveRef.current = setTimeout(() => saveStatsToServer(data), 30000);
  }, []);

  const updateStats = useCallback((updater) => {
    setStats(prev => {
      const updated = updater(prev);
      const next = { ...updated, level: computeLevel(updated.xp ?? prev.xp) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateCardReview = useCallback((letterId, quality) => {
    setStats(prev => {
      Analytics.cardReview(letterId, quality);
      const updated = sm2(prev.cardReviews?.[letterId], quality);
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

        // Referral reward — trigger on first pass of group 1
        if (groupId === 1 && !prev.referralRewarded && prev.referredBy) {
          xpBonus += 100; // +100 XP для себя
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
          ? { referralRewarded: true }
          : {}),
      };
      // Analytics
      Analytics.lessonComplete(groupId, score);
      if (score >= 70) Analytics.groupComplete(groupId, score);

      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  const getDueCards = useCallback((alphabet) => {
    const now = Date.now();
    return alphabet.filter(l => {
      const r = stats.cardReviews?.[l.id];
      return !r || r.nextReview<=now;
    });
  }, [stats.cardReviews]);

  useEffect(() => () => {
    clearTimeout(saveRef.current);
    clearTimeout(serverSaveRef.current);
  }, []);

  return (
    <StatsContext.Provider value={{ stats, updateStats, updateCardReview, completeGroupTest, getDueCards, ready }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside StatsProvider");
  return ctx;
}
