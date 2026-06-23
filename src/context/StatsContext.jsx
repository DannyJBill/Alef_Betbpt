import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { INITIAL_STATS, computeLevel } from "../data/constants";
import { saveStatsToServer, loadStatsFromServer } from "../helpers/serverSync";
import { LETTER_GROUPS } from "../data/alphabet";

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
  return INITIAL_STATS;
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

const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [ready, setReady] = useState(false);
  const saveRef = useRef(null);

  useEffect(() => {
    (async () => {
      // 1. Load from local storage first (instant)
      const local = await loadFromStorage();
      setStats(local);
      setReady(true);

      // 2. Try to load from server (may have fresher data from another device)
      const server = await loadStatsFromServer();
      if (server && (server.updatedAt || 0) > (local.updatedAt || 0)) {
        setStats({ ...INITIAL_STATS, ...server });
      }
    })();
  }, []);

  const serverSaveRef = useRef(null);
  const scheduleSave = useCallback((data) => {
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => saveToStorage(data), 300);
    // Save to server with longer debounce (3s)
    clearTimeout(serverSaveRef.current);
    serverSaveRef.current = setTimeout(() => saveStatsToServer(data), 3000);
  }, []);

  const updateStats = useCallback((updater) => {
    setStats(prev => {
      const next = { ...updater(prev), level: computeLevel(updater(prev).xp ?? prev.xp) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateCardReview = useCallback((letterId, quality) => {
    setStats(prev => {
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
      if (score >= 70) {
        newGroupProgress[groupId] = 'completed';
        const next = LETTER_GROUPS.find(g => g.unlocksAfter===groupId);
        // Only unlock next group if it's still locked — don't downgrade completed/available
        if (next && newGroupProgress[next.id] === 'locked') {
          newGroupProgress[next.id] = 'available';
        }
      }
      const updated = {
        ...prev,
        groupProgress:   newGroupProgress,
        groupTestScores: newGroupTestScores,
        xp: prev.xp + (score>=70 ? 50 : 10),
      };
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

  useEffect(() => () => clearTimeout(saveRef.current), []);

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
