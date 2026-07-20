/**
 * migrate.js — миграция сохранённого прогресса между версиями схемы (v1 → v8).
 *
 * Вынесена из StatsContext в ЧИСТЫЙ модуль: не зависит от React, `window`
 * гардится (typeof). Это позволяет прогонять миграцию headless на реальных
 * дампах пользователей — критично, т.к. живые юзеры сидят на РАЗНЫХ версиях
 * (v1/v4/v5/v7), и fold в facts (v8) стоит ПОСЛЕДНИМ шагом, уже на v7-форме.
 *
 * Два экспорта:
 *   migrateThroughV7(p) — цепочка v1→v7 (поведение ДО v8; для проверки инварианта);
 *   migrate(p)          — полная цепочка v1→v8 (fold в facts + регенерация зеркала).
 *
 * ⛔ Логику unlock/done сюда не добавлять — она только в curriculum.js.
 */
import { INITIAL_STATS, MIN_CORRECT_TO_UNLOCK } from "../data/constants";
import { deriveProgress, blockKey, sectionBlockToId } from "./progressHelpers";
import { foldToFacts, factsToLegacyView } from "./facts";

function tgId() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
}

/** Цепочка v1 → v7 (нормализует любую старую форму к v7-фактам). Мутирует p. */
export function migrateThroughV7(p) {
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
    const id = tgId();
    p.referralCode     = id ? `ref_${id}` : `ref_${Date.now()}`;
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
    const oldLetters  = p.groupProgress || {};
    const oldNikud    = p.nikudProgress?.groupProgress || {};
    const oldWords    = p.nikudProgress?.wordsCorrect || {};

    const lettersNew = {};
    for (let n = 1; n <= 5; n++) {
      const s = oldLetters[n];
      lettersNew[n] = s === 'completed' ? 'done' : (s || 'locked');
    }

    const soundsNew = {};
    for (let n = 1; n <= 5; n++) {
      const s = oldNikud[n];
      soundsNew[n] = s === 'completed' ? 'done' : (s === 'available' ? 'available' : 'locked');
    }
    if (soundsNew[1] === 'locked' &&
        (oldNikud[1] === 'available' || oldNikud[1] === 'completed')) {
      soundsNew[1] = 'available';
    }

    const hasWords = Object.keys(oldWords).length > 0;

    const blockScores = {};
    for (let n = 1; n <= 5; n++) {
      if (lettersNew[n] === 'done')
        blockScores[blockKey('letters', n)] = MIN_CORRECT_TO_UNLOCK;
      if (soundsNew[n] === 'done')
        blockScores[blockKey('sounds', n)] = MIN_CORRECT_TO_UNLOCK;
    }
    if (hasWords) blockScores[blockKey('words', 1)] = MIN_CORRECT_TO_UNLOCK;

    p.progress    = { letters: lettersNew, sounds: soundsNew,
      words:   { 1:'locked',2:'locked',3:'locked',4:'locked',5:'locked' },
      phrases: { 1:'locked',2:'locked',3:'locked',4:'locked',5:'locked' } };
    p.blockScores = blockScores;
    p.testScores  = {};

    p.cardReviews  = p.cardReviews  || {};
    p.weakLetters  = p.weakLetters  || {};
    p.wordsStudied = (p.nikudProgress?.wordsStudied || []).map(id => String(id));
    p.wordsCorrect = {};
    Object.entries(p.nikudProgress?.wordsCorrect || {}).forEach(([k, v]) => {
      p.wordsCorrect[String(k)] = v;
    });

    p.vowelReviews = p.nikudProgress?.vowelReviews || {};

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

  // v6 → v7: единый граф курса. Хранятся только ФАКТЫ.
  if (p.version < 7) {
    const scores = { ...(p.scores || {}) };

    Object.entries(p.testScores || {}).forEach(([key, val]) => {
      const [section, n] = key.split('_');
      const id = sectionBlockToId(section, Number(n));
      if (id) scores[id] = Math.max(scores[id] ?? 0, val ?? 0);
    });

    Object.entries(p.lessonScores || {}).forEach(([id, val]) => {
      scores[id] = Math.max(scores[id] ?? 0, val ?? 0);
    });

    const oldProgress = p.progress || {};
    for (const section of ['letters', 'sounds']) {
      for (let n = 1; n <= 5; n++) {
        if (oldProgress[section]?.[n] === 'done') {
          const id = sectionBlockToId(section, n);
          scores[id] = Math.max(scores[id] ?? 0, 70);
        }
      }
    }

    p.scores = scores;
    delete p.testScores;
    delete p.lessonScores;

    p.version = 7;
  }

  // Накопительный словарь: per-word прогресс. Идемпотентно.
  p.readingProgress = p.readingProgress || { studied: [] };
  if (!p.readingProgress.words) {
    p.readingProgress.words = {};
    (p.readingProgress.studied || []).forEach(id => {
      p.readingProgress.words[id] = { seen: 1, correct: 0, wrong: 0 };
    });
  }

  return p;
}

/** Полная миграция v1 → v8. Мутирует p. */
export function migrate(p) {
  if (!p) return { ...INITIAL_STATS };

  migrateThroughV7(p);

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

  // Статусы — всегда свежая деривация из фактов.
  p.progress = deriveProgress(p);

  return p;
}
