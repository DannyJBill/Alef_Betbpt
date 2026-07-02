/**
 * progressHelpers.js — тонкий слой совместимости над data/curriculum.js.
 *
 * Вся логика разблокировки/завершения живёт в curriculum.js (единый граф курса).
 * Проверка «читаемо ли слово по буквам» — в helpers/vocab.js.
 * Здесь — только обёртки со старыми именами для экранов и пара UI-утилит.
 *
 * ⛔ Не добавлять сюда unlock-логику. Новый юнит курса = узел в CURRICULUM.
 */
import {
  getNodeStatus,
  isNodeDone,
  isNodeUnlocked,
  deriveProgress,
  sectionBlockToId,
  isReadingBlockUnlocked,
} from '../data/curriculum';

// re-export для StatsContext и экранов
export { deriveProgress, getNodeStatus, isNodeDone, isReadingBlockUnlocked };

// ─── Обёртки со старыми именами ───────────────────────────────────────────────

/** Раздел «Словарь» доступен всегда: лента порций сама показывает замки
 *  и условия открытия — это часть мотивации (виден путь вперёд). */
export function checkReadingUnlock() {
  return true;
}

/** Блок слов W1-5 разблокирован? (было: checkWordsUnlock(n, testScores)) */
export function checkWordsUnlock(blockN, stats) {
  return isNodeUnlocked(`W${blockN}`, stats);
}

/** Статус грамматического урока: locked | available | done */
export function getLessonStatus(lessonId, stats) {
  return getNodeStatus(lessonId, stats);
}

/** Урок пройден? */
export function isLessonDone(lessonId, stats) {
  return isNodeDone(lessonId, stats);
}

// ─── UI-утилиты (без логики курса) ────────────────────────────────────────────

/** Ключ счётчика игры для blockScores: 'letters_1' */
export function blockKey(section, blockN) {
  return `${section}_${blockN}`;
}

/** id узла курса по секции и номеру блока: ('letters',2) → 'L1.2' */
export { sectionBlockToId };

/** Процент прохождения раздела 4×5 (0-100) — для прогресс-баров */
export function getSectionPct(sectionProgress = {}) {
  const done = [1, 2, 3, 4, 5].filter(n => sectionProgress[n] === 'done').length;
  return Math.round((done / 5) * 100);
}

// ─── Свежие порции слов ───────────────────────────────────────────────────────
// Порции словаря, открытые но ещё не начатые — для CTA «Изучить N новых слов»
// на экранах результатов уроков/тестов. Логика единая для всех типов уроков.
import { READING_BLOCKS, getBlockCards } from '../data/reading';
import { getKnownLetters, filterReadable } from './vocab';
import { ALPHABET, LETTER_GROUPS } from '../data/alphabet';

export function getFreshPortions(stats) {
  const known = getKnownLetters(stats?.progress?.letters, ALPHABET, LETTER_GROUPS);
  const studied = stats?.readingProgress?.studied || [];
  return READING_BLOCKS
    .map(block => {
      if (!isReadingBlockUnlocked(block, stats)) return null;
      const fresh = filterReadable(getBlockCards(block), known)
        .filter(i => !studied.includes(i.id));
      return fresh.length > 0 ? { block, freshCount: fresh.length } : null;
    })
    .filter(Boolean);
}
