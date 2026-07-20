/**
 * planner.js — ЕДИНЫЙ планировщик интервального повторения (SM-2).
 *
 * До v1.0 алгоритм SM-2 был скопирован внутрь StatsContext и обслуживал только
 * буквы (cardReviews) и огласовки (vowelReviews). Слова (readingProgress.words)
 * SM-2 НЕ использовали — хранили лишь счётчики {seen,correct,wrong}, из-за чего
 * кнопки «Снова / Трудно / Легко» в словаре ничего не планировали (rate(q)
 * игнорировал quality). Теперь это единственное место, где живёт SM-2, и он
 * типо-независим: одна очередь для букв, огласовок и слов.
 *
 * Карта повторения (единый формат для всех типов):
 *   { interval, repetitions, ef, nextReview }
 *   interval    — дней до следующего показа
 *   repetitions — сколько раз подряд отвечено верно (quality >= 1)
 *   ef          — easiness factor (>= 1.3)
 *   nextReview  — timestamp (мс) следующего показа
 *
 * quality: 0 = «Снова» (сброс), 1 = «Трудно», 2 = «Легко».
 *
 * ⛔ Никаких других реализаций SM-2 в кодовой базе быть не должно.
 */

const DAY_MS = 86400000;

/**
 * Пересчёт карты повторения по ответу.
 * @param {object} card    — текущая карта (или {} для новой)
 * @param {number} quality — 0 | 1 | 2
 * @param {number} now     — время «сейчас» в мс (инъекция для тестов)
 */
export function sm2(card = {}, quality, now = Date.now()) {
  let { interval = 1, repetitions = 0, ef = 2.5 } = card;
  if (quality < 1) {
    interval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * ef);
    repetitions += 1;
    ef = Math.max(1.3, ef + 0.1 - (2 - quality) * (0.08 + (2 - quality) * 0.02));
  }
  return { interval, repetitions, ef, nextReview: now + interval * DAY_MS };
}

/** Карта «просрочена» (пора показать)? Отсутствие карты = due. */
export function isDue(card, now = Date.now()) {
  if (!card || card.nextReview == null) return true;
  return card.nextReview <= now;
}

/**
 * Просроченные карты из словаря {id: card}.
 * @returns {string[]} id карт, которым пора на повтор (включая ещё не начатые).
 */
export function dueKeys(cardMap = {}, now = Date.now()) {
  return Object.keys(cardMap).filter(id => isDue(cardMap[id], now));
}
