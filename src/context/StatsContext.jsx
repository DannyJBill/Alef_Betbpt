import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { INITIAL_STATS, computeLevel, MIN_CORRECT_TO_UNLOCK } from "../data/constants";
import { saveStatsToServer, loadStatsFromServer, resetStatsOnServer } from "../helpers/serverSync";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import { deriveProgress, blockKey, sectionBlockToId } from "../helpers/progressHelpers";
import { Analytics } from "../helpers/analytics";
import {
  foldToFacts, factsToLegacyView,
  setNodeScore, bumpNodeCounter, reviewLetter, reviewVowel,
  seenWord, answerWord, reviewWord,
} from "../helpers/facts";

const STORAGE_KEY    = "hebrew-app-stats";
const SCHEMA_VERSION = 8;

// Легаси-зеркало фактов (производные поля) — НЕ персистятся: регенерируются из
// facts на загрузке (migrate). Персистится только канон: facts + мета.
const MIRROR_KEYS = [
  "scores", "blockScores", "cardReviews", "vowelReviews", "weakLetters",
  "wordsStudied", "wordsCorrect", "readingProgress", "progress",
];

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

    // Статусы здесь не важны — шаг v7 пересчитает всё из фактов (deriveProgress)
    p.progress    = { letters: lettersNew, sounds: soundsNew,
      words:   { 1:'locked',2:'locked',3:'locked',4:'locked',5:'locked' },
      phrases: { 1:'locked',2:'locked',3:'locked',4:'locked',5:'locked' } };
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

  // v5 → v6: грамматические уроки (переходная схема, поглощается v7)
  if (p.version < 6) {
    p.lessonScores = p.lessonScores ?? {};
    p.version = 6;
  }

  // v6 → v7: единый граф курса. Хранятся только ФАКТЫ (scores/blockScores/
  // readingProgress), статусы всегда выводятся deriveProgress().
  if (p.version < 7) {
    const scores = { ...(p.scores || {}) };

    // testScores 'letters_2'→'L1.2', 'sounds_3'→'N1.3'
    Object.entries(p.testScores || {}).forEach(([key, val]) => {
      const [section, n] = key.split('_');
      const id = sectionBlockToId(section, Number(n));
      if (id) scores[id] = Math.max(scores[id] ?? 0, val ?? 0);
    });

    // lessonScores 'C0':85 → scores как есть
    Object.entries(p.lessonScores || {}).forEach(([id, val]) => {
      scores[id] = Math.max(scores[id] ?? 0, val ?? 0);
    });

    // Блоки, помеченные done в старой матрице, не должны регресснуть:
    // раньше done ставился за любой завершённый тест (даже <70%) — фиксируем
    // фактом score = max(имеющийся, порог 70).
    const oldProgress = p.progress || {};
    for (const section of ['letters', 'sounds']) {
      for (let n = 1; n <= 5; n++) {
        if (oldProgress[section]?.[n] === 'done') {
          const id = sectionBlockToId(section, n);
          scores[id] = Math.max(scores[id] ?? 0, 70);
        }
      }
    }
    // words/phrases done жили на счётчиках blockScores — счётчики сохраняются как есть.

    p.scores = scores;
    delete p.testScores;
    delete p.lessonScores;

    p.version = 7;
  }

  // Накопительный словарь (единый поток слов): per-word прогресс.
  // readingProgress.studied (массив id) остаётся фактом «слово введено»;
  // words — детализация { id: { seen, correct, wrong } }. Идемпотентно.
  p.readingProgress = p.readingProgress || { studied: [] };
  if (!p.readingProgress.words) {
    p.readingProgress.words = {};
    (p.readingProgress.studied || []).forEach(id => {
      p.readingProgress.words[id] = { seen: 1, correct: 0, wrong: 0 };
    });
  }

  // v7 → v8: единый канонический стор фактов. Сворачиваем 8 раздроблённых полей
  // (scores/blockScores/readingProgress.*/cardReviews/vowelReviews/weakLetters/
  //  wordsStudied/wordsCorrect) в facts.{nodes,items}.
  if (p.version < 8) {
    p.facts = foldToFacts(p);
    p.version = 8;
  }
  if (!p.facts) p.facts = { nodes: {}, items: {} };

  // Канон = facts. Легаси-поля — read-only ЗЕРКАЛО, всегда регенерируются из
  // facts (экраны ещё читают их напрямую; удаление — этапы 3–4).
  Object.assign(p, factsToLegacyView(p.facts));

  // Статусы — всегда свежая деривация из фактов (curriculum мог измениться
  // между деплоями; хранимый progress — только кэш)
  p.progress = deriveProgress(p);

  return p;
}

// ─── Коммит фактов: единая точка записи ──────────────────────────────────────
// Обновляет канон (facts), регенерирует зеркало для экранов и кэш статусов.
// Все методы записи проходят через неё.
function commit(prev, facts, extra = {}) {
  const next = { ...prev, ...factsToLegacyView(facts), facts, ...extra };
  next.progress = deriveProgress(next);
  return next;
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

// Персистим только КАНОН: facts + мета. Зеркало (MIRROR_KEYS) регенерируется
// на загрузке из facts — не храним дубль (важно для потолка CloudStorage 4КБ).
function canonicalForStorage(stats) {
  const c = { ...stats, version: SCHEMA_VERSION };
  for (const k of MIRROR_KEYS) delete c[k];
  return c;
}

async function saveToStorage(stats) {
  const payload = JSON.stringify(canonicalForStorage(stats));
  if (TGCloud) try { await tgSet(STORAGE_KEY, payload); } catch {}
  try { localStorage.setItem(STORAGE_KEY, payload); } catch {}
  try { sessionStorage.setItem(STORAGE_KEY, payload); } catch {}
}

// ─── SM-2 ─────────────────────────────────────────────────────────────────────
// Алгоритм вынесен в helpers/planner.js — единый для букв, огласовок и слов.

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
      const facts = reviewLetter(prev.facts, letterId, quality);
      const next = applyStreak(commit(prev, facts, {
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(quality>0?1:0),
      }));
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
      const id    = sectionBlockToId(section, blockN);
      const facts = (isCorrect && id) ? bumpNodeCounter(prev.facts, id, 1) : prev.facts;
      const next  = applyStreak(commit(prev, facts, {
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(isCorrect?1:0),
        xp:             (prev.xp||0)+(isCorrect?2:0),
      }));
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Завершение теста блока (буквы/огласовки) ───────────────────────────────
  // v7: пишем ФАКТ — процент теста в scores['L1.n'/'N1.n']. Блок становится done
  // при score ≥ порога узла (70) ИЛИ через игровой путь (счётчики recordGameAnswer).
  // Изменение против v5/v6: тест <70% больше НЕ помечает блок done принудительно.
  const completeBlock = useCallback((section, blockN, testScore) => {
    setStats(prev => {
      const id = sectionBlockToId(section, blockN);
      const facts = setNodeScore(prev.facts, id, testScore);
      const xpBonus = testScore >= 90 ? 80 : testScore >= 70 ? 50 : 10;
      const next = commit(prev, facts, { xp: (prev.xp||0) + xpBonus });

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

  // ── Грамматические уроки (v6) ──────────────────────────────────────────────
  /**
   * Завершение грамматического урока.
   * @param {string} lessonId — 'C0', 'M1.2', …
   * @param {number|null} score — процент теста; null для уроков без теста
   */
  const completeLesson = useCallback((lessonId, score) => {
    setStats(prev => {
      const target = score == null ? 100 : score;
      const facts = setNodeScore(prev.facts, lessonId, target);
      const newScore = facts.nodes[lessonId].score;
      const xpBonus = newScore >= 90 ? 80 : newScore >= 70 ? 50 : 10;
      const next = commit(prev, facts, { xp: (prev.xp || 0) + xpBonus });
      Analytics.lessonComplete(lessonId, newScore);
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
  // ── Накопительный словарь (сквозной поток слов) ────────────────────────────
  /** Слово показано (карточка перевёрнута / встречено впервые). +2 XP за новое. */
  const recordWordSeen = useCallback((id) => {
    setStats(prev => {
      const { facts, isNew } = seenWord(prev.facts, id);
      const next = commit(prev, facts, { xp: (prev.xp || 0) + (isNew ? 2 : 0) });
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  /** Ответ в квизе по слову. Правильный ответ также вводит слово в словарь. */
  const recordWordAnswer = useCallback((id, isCorrect) => {
    setStats(prev => {
      const { facts, isNew } = answerWord(prev.facts, id, isCorrect);
      const next = commit(prev, facts, { xp: (prev.xp || 0) + (isNew ? 2 : 0) });
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  /**
   * Повтор карточки слова с оценкой (Снова=0 / Трудно=1 / Легко=2).
   * Единый SM-2 (planner.sm2) — как у букв и огласовок. Планирует nextReview
   * И питает статус словаря: Снова → wrong+1 (слабое), Трудно/Легко → correct+1.
   * Первый показ вводит слово в словарь (studied + XP), как recordWordSeen.
   */
  const recordWordReview = useCallback((id, quality) => {
    setStats(prev => {
      const { facts, isNew } = reviewWord(prev.facts, id, quality);
      const next = commit(prev, facts, { xp: (prev.xp || 0) + (isNew ? 2 : 0) });
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  /** Слова, которым пора на повтор (nextReview прошёл или ещё не начаты). */
  const getDueWords = useCallback(() => {
    const words = stats.readingProgress?.words || {};
    const now = Date.now();
    return Object.keys(words).filter(id => {
      const c = words[id]?.sm2;
      return !c || c.nextReview == null || c.nextReview <= now;
    });
  }, [stats]);

  const updateVowelReview = useCallback((key, quality) => {
    setStats(prev => {
      const facts = reviewVowel(prev.facts, key, quality);
      const next  = commit(prev, facts);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Прогресс слов (легаси-путь WordsScreen; осиротел) ──────────────────────
  const recordWordResult = useCallback((wordId, isCorrect) => {
    setStats(prev => {
      const { facts } = answerWord(prev.facts, wordId, isCorrect);
      const next = applyStreak(commit(prev, facts, {
        totalAnswers:   (prev.totalAnswers||0)+1,
        correctAnswers: (prev.correctAnswers||0)+(isCorrect?1:0),
        xp: (prev.xp||0)+(isCorrect?3:0),
      }));
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
      completeLesson,
      // Обратная совместимость
      completeGroupTest,
      completeNikudGroupTest,
      // SM-2
      updateCardReview,
      updateVowelReview,
      recordWordSeen,
      recordWordAnswer,
      recordWordReview,
      getDueCards,
      getDueVowelCards,
      getDueWords,
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
