/**
 * progressHelpers.js
 *
 * Матрица прогрессии 4×5:
 *   letters[1..5] → sounds[1..5] → words[1..5] → phrases[1..5]
 *
 * Главный экспорт: getAvailablePool(stats) — весь доступный материал
 * для генерации заданий в GameScreen, ReadingScreen, WordsScreen.
 */

import { ALPHABET, LETTER_GROUPS, NIKUD, NIKUD_GROUPS } from '../data/alphabet';
import { WORD_CATEGORIES } from '../data/words';
import { MIN_CORRECT_TO_UNLOCK, WORDS_UNLOCK_THRESHOLD } from '../data/constants';

// ─── Типы разделов ────────────────────────────────────────────────────────────
export const SECTIONS = ['letters', 'sounds', 'words', 'phrases'];

// Маппинг блок → что входит
export const BLOCK_CONTENT = {
  letters: {
    1: { groupId: 1 },  // א ב ג ד ה ו
    2: { groupId: 2 },  // ז ח ט י כ ל
    3: { groupId: 3 },  // מ נ ס ע פ
    4: { groupId: 4 },  // צ ק ר ש ת
    5: { groupId: 5 },  // ך ם ן ף ץ
  },
  sounds: {
    1: { groupId: 1 },  // патах, хирик, шурук (А И У)
    2: { groupId: 2 },  // камац (А-двойник)
    3: { groupId: 3 },  // цере, сеголь (Э)
    4: { groupId: 4 },  // холам, кубуц (О + У)
    5: { groupId: 5 },  // шва
  },
  words: {
    1: { categories: [1, 3] },       // Семья, Тело
    2: { categories: [2, 4] },       // Еда, Природа
    3: { categories: [5, 6, 8] },    // Город, Дом, Время
    4: { categories: [7,9,10,11,12,13,14] }, // Действия, Числа, Цвета, Одежда...
    5: { categories: [15, 16] },     // Союзы, Разное
  },
  phrases: {
    1: { ids: ['ph_1','ph_2','ph_3','ph_4','ph_5'] },        // שלום תודה כן לא היי
    2: { ids: ['ph_6','ph_7','ph_8','ph_9','ph_10'] },       // בבקשה סליחה מה שלומך
    3: { ids: ['ph_11','ph_12','ph_13','ph_14','ph_15'] },
    4: { ids: ['ph_16','ph_17','ph_18','ph_19','ph_20'] },
    5: { ids: ['ph_21','ph_22','ph_23','ph_24','ph_25'] },
  },
};

// ─── Правила разблокировки ────────────────────────────────────────────────────

/**
 * Возвращает true если блок [section][blockN] должен быть доступен
 * на основе текущего progress.
 */
export function isBlockUnlockable(section, blockN, progress) {
  const p = progress || {};

  if (section === 'letters') {
    if (blockN === 1) return true;
    return p.letters?.[blockN - 1] === 'done';
  }

  if (section === 'sounds') {
    // Н1 открывается только после букв гр.1 И гр.2
    if (blockN === 1) return p.letters?.[1] === 'done' && p.letters?.[2] === 'done';
    return p.sounds?.[blockN - 1] === 'done';
  }

  if (section === 'words') {
    // Слова НЕ открываются автоматически — только через checkWordsUnlock()
    if (blockN === 1) return false; // управляется отдельно
    return p.words?.[blockN - 1] === 'done';
  }

  if (section === 'phrases') {
    if (blockN === 1) return p.words?.[1] === 'done';
    return p.phrases?.[blockN - 1] === 'done';
  }

  return false;
}

/**
 * Пересчитывает весь progress — какие блоки должны быть available/locked.
 * Вызывается после каждого изменения blockScores.
 */
export function recalcProgress(progress, blockScores) {
  const next = {
    letters: { ...progress.letters },
    sounds:  { ...progress.sounds  },
    words:   { ...progress.words   },
    phrases: { ...progress.phrases },
  };

  for (const section of SECTIONS) {
    for (let n = 1; n <= 5; n++) {
      const current = next[section][n];
      if (current === 'done') continue; // done не меняем

      const unlockable = isBlockUnlockable(section, n, next);
      const score = blockScores?.[`${section}_${n}`] || 0;

      if (!unlockable) {
        next[section][n] = 'locked';
      } else if (score >= MIN_CORRECT_TO_UNLOCK) {
        next[section][n] = 'done';
      } else {
        next[section][n] = 'available';
      }
    }
  }

  return next;
}

// ─── Проверка условия открытия чтения ───────────────────────────────────────
/**
 * Чтение блока N открывается когда:
 *   Block 1: letters[1] done + sounds[1] done
 *   Block 2: letters[2] done + sounds[2] done
 *   etc.
 */
export function checkReadingUnlock(readingBlockN, progress) {
  // Чтение блок 1: буквы гр.1+2 done + огласовки гр.1 done
  // Чтение блок N (N>1): буквы гр.N done + огласовки гр.N done
  const n = readingBlockN;
  if (n === 1) {
    return (
      progress?.letters?.[1] === 'done' &&
      progress?.letters?.[2] === 'done' &&
      progress?.sounds?.[1]  === 'done'
    );
  }
  return (
    progress?.letters?.[n] === 'done' &&
    progress?.sounds?.[n]  === 'done'
  );
}

// ─── Проверка условия открытия слов ─────────────────────────────────────────
/**
 * Слова блока N открываются когда:
 *   Block 1: letters[2].testScore >= 90% AND sounds[2].testScore >= 90%
 *   Block 2: letters[3].testScore >= 90% AND sounds[2].testScore >= 90%
 *   Block 3: letters[4].testScore >= 90% AND sounds[3].testScore >= 90%
 *   Block 4: letters[5].testScore >= 90% AND sounds[4].testScore >= 90%
 */
const WORDS_UNLOCK_CONDITIONS = {
  1: { letters: 2, sounds: 2 },
  2: { letters: 3, sounds: 2 },
  3: { letters: 4, sounds: 3 },
  4: { letters: 5, sounds: 4 },
  5: { letters: 5, sounds: 5 },
};

export function checkWordsUnlock(wordBlockN, testScores) {
  const cond = WORDS_UNLOCK_CONDITIONS[wordBlockN];
  if (!cond) return false;
  const lettersScore = testScores?.[`letters_${cond.letters}`] || 0;
  const soundsScore  = testScores?.[`sounds_${cond.sounds}`]  || 0;
  return lettersScore >= WORDS_UNLOCK_THRESHOLD && soundsScore >= WORDS_UNLOCK_THRESHOLD;
}

/**
 * Пересчитывает words прогресс на основе testScores.
 * Вызывается после каждого прохождения теста.
 */
export function recalcWordsProgress(currentWordsProgress, testScores) {
  const next = { ...currentWordsProgress };
  for (let n = 1; n <= 5; n++) {
    if (next[n] === 'done') continue; // done не меняем
    if (checkWordsUnlock(n, testScores)) {
      next[n] = 'available';
    } else {
      // Если блок N-1 done и условие выполнено — available
      // Иначе locked (если блок N-1 ещё locked)
      if (n > 1 && next[n-1] !== 'done') {
        next[n] = 'locked';
      }
    }
  }
  return next;
}

// ─── Пул доступного материала ─────────────────────────────────────────────────

/**
 * Возвращает весь материал из пройденных ('done') блоков.
 * Это основа для генерации заданий — GameScreen, ReadingScreen, WordsScreen
 * используют только этот пул.
 *
 * @param {object} stats — полный объект stats
 * @returns {object} { letters, vowels, words, phrases, wordCategories }
 */
export function getAvailablePool(stats) {
  const progress = stats.progress || {};

  // Блоки со статусом done или available (available = учим сейчас)
  const doneLetterBlocks   = doneAndActive(progress.letters);
  const doneSoundBlocks    = doneAndActive(progress.sounds);
  const doneWordBlocks     = doneAndActive(progress.words);
  const donePhraseBlocks   = doneAndActive(progress.phrases);

  // Буквы
  const letterGroupIds = doneLetterBlocks.map(n => BLOCK_CONTENT.letters[n]?.groupId).filter(Boolean);
  const letters = ALPHABET.filter(l =>
    LETTER_GROUPS.find(g => g.id === l.group && letterGroupIds.includes(g.id))
  );
  // Fallback для нового юзера — первые 6 букв всегда
  const availableLetters = letters.length >= 4 ? letters : ALPHABET.slice(0, 6);

  // Огласовки
  const soundGroupIds = doneSoundBlocks.map(n => BLOCK_CONTENT.sounds[n]?.groupId).filter(Boolean);
  const vowels = NIKUD.filter(v => soundGroupIds.includes(v.groupId));

  // Слова — только те у которых есть nikud И все буквы из пройденных групп
  const letterSymbols = new Set(availableLetters.map(l => l.symbol));
  
  // Доступные слова из words.js с фильтрацией
  // Показываем ВСЕ слова где буквы пройдены (по категориям не фильтруем жёстко)
  const wordCatIds = doneWordBlocks.flatMap(n => BLOCK_CONTENT.words[n]?.categories || []);
  const wordCategories = WORD_CATEGORIES.filter(c => wordCatIds.includes(c.id));
  const words = wordCategories
    .flatMap(c => c.words)
    .filter(w => w.hebrewNikud && wordUsesKnownLetters(w.hebrew, letterSymbols));

  // Фразы (пока заглушка — будет reading.js)
  const phrases = [];

  return {
    letters: availableLetters,
    vowels,
    words,
    wordCategories,
    phrases,
    // Удобные флаги для UI
    hasLetters:  availableLetters.length >= 4,
    hasVowels:   vowels.length >= 2,
    hasWords:    words.length >= 4,
    hasPhrases:  phrases.length >= 2,
    // Какие блоки сейчас активны (для подсветки в UI)
    activeBlocks: {
      letters: activeBlock(progress.letters),
      sounds:  activeBlock(progress.sounds),
      words:   activeBlock(progress.words),
      phrases: activeBlock(progress.phrases),
    },
  };
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Блоки в статусе done или available */
function doneAndActive(sectionProgress = {}) {
  return [1,2,3,4,5].filter(n =>
    sectionProgress[n] === 'done' || sectionProgress[n] === 'available'
  );
}

/** Текущий активный блок (available) */
function activeBlock(sectionProgress = {}) {
  return [1,2,3,4,5].find(n => sectionProgress[n] === 'available') || null;
}

/**
 * Проверяет что все буквы слова входят в известный набор.
 * Игнорирует огласовки и знаки кантилляции.
 */
const NIKUD_RANGE = /[\u05B0-\u05C7]/g;
function wordUsesKnownLetters(hebrew, knownLetters) {
  if (!hebrew) return false;
  const letters = hebrew.replace(NIKUD_RANGE, '').replace(/\s/g, '');
  return [...letters].every(ch => knownLetters.has(ch));
}

// ─── Прогресс по разделу (для UI) ────────────────────────────────────────────

/** Процент прохождения раздела (0-100) */
export function getSectionPct(sectionProgress = {}) {
  const done = [1,2,3,4,5].filter(n => sectionProgress[n] === 'done').length;
  return Math.round((done / 5) * 100);
}

/** Описание текущего блока для кнопки "Продолжить" */
export function getContinueTarget(progress = {}) {
  // Приоритет: буквы → звуки → слова → фразы
  for (const section of SECTIONS) {
    const active = activeBlock(progress[section]);
    if (active) return { section, block: active };
  }
  return null; // всё пройдено
}

/** Ключ блока для blockScores */
export function blockKey(section, blockN) {
  return `${section}_${blockN}`;
}
