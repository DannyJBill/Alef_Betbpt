/**
 * vocab.js — ЕДИНСТВЕННОЕ место, где решается «читаемо ли слово по буквам».
 *
 * Раньше эта логика была скопирована в трёх местах (ReadingScreen.getAvailableItems,
 * progressHelpers.wordUsesKnownLetters, isReadingBlockDone) и во всех трёх был баг:
 * финальные формы (ך ם ן ף ץ) проверялись буквально, поэтому слово вроде מַיִם
 * считалось нечитаемым до прохождения группы 5. По архитектурному решению
 * (LESSON_REGISTRY_v3) финальные формы считаются ПО БАЗОВОЙ БУКВЕ.
 *
 * Никаких других реализаций проверки букв в кодовой базе быть не должно.
 */

// Финальная форма → базовая буква (архитектурное решение: вариант Б)
export const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

// Никуд + дагеш/шин-син точки
const NIKUD_RE = /[\u05B0-\u05C7]/g;
// Не-буквы: пробелы и пунктуация, встречающаяся во фразах
const PUNCT_RE = /[\s?!.,«»""()\-–—:;']/g;

/** Слово без огласовок */
export function stripNikud(hebrew) {
  return (hebrew || '').replace(NIKUD_RE, '');
}

/** Буквы слова с приведением финальных форм к базовым */
export function baseLetters(hebrew) {
  const plain = stripNikud(hebrew).replace(PUNCT_RE, '');
  return [...plain].map(ch => FINAL_TO_BASE[ch] || ch);
}

/**
 * Множество известных букв по статусам групп букв.
 * @param {object} lettersStatuses — { 1:'done', 2:'available', ... }
 * @param {Array} ALPHABET, LETTER_GROUPS — из data/alphabet
 * Считаем известными группы 'done' И 'available' (учим сейчас) — как в текущем UI.
 */
export function getKnownLetters(lettersStatuses = {}, ALPHABET, LETTER_GROUPS) {
  const openGroups = [1, 2, 3, 4, 5].filter(
    n => lettersStatuses[n] === 'done' || lettersStatuses[n] === 'available'
  );
  const known = new Set();
  ALPHABET.forEach(l => {
    const g = LETTER_GROUPS.find(g => g.letterIds.includes(l.id));
    if (g && openGroups.includes(g.id)) known.add(l.symbol);
  });
  return known;
}

/** Все буквы слова (по базовым формам) входят в известный набор? */
export function isReadableByLetters(hebrew, knownSet) {
  if (!hebrew) return false;
  const letters = baseLetters(hebrew);
  if (letters.length === 0) return false;
  return letters.every(ch => knownSet.has(ch));
}

/** Фильтр списка карточек по известным буквам (общий для всех экранов) */
export function filterReadable(items, knownSet) {
  return items.filter(i => isReadableByLetters(i.hebrew, knownSet));
}
