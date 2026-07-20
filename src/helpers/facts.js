/**
 * facts.js — единый формат фактов v8 (часть 1: свёртка + обратная проекция).
 *
 * ЦЕЛЬ v8: вместо 8+ раздроблённых полей прогресса
 *   (scores, blockScores, readingProgress.{studied,words}, cardReviews,
 *    vowelReviews, weakLetters, wordsStudied, wordsCorrect)
 * — один канонический стор:
 *
 *   facts = {
 *     nodes: { [nodeId]: { score?, counter? } },        // узлы курса
 *     items: { [itemKey]: { kind, introduced?, seen?,   // атомы: буквы/огласовки/слова
 *                           correct?, wrong?, sm2? } },
 *   }
 *
 * Ключ элемента неймспейсится префиксом, чтобы буквы/огласовки/слова не
 * сталкивались id-шниками:  'l:'+letterId | 'v:'+vowelKey | 'w:'+wordId.
 *
 * ⚠️ ЧАСТЬ 1 (эта): модуль ЧИСТЫЙ и АДДИТИВНЫЙ. Он умеет:
 *   - foldToFacts(v7stats)      — собрать facts из старых полей;
 *   - factsToLegacyView(facts)  — спроецировать facts обратно в старую форму
 *                                 (будущее read-only «зеркало» для экранов).
 * Канонический источник в curriculum/StatsContext НЕ переключается здесь —
 * это часть 2 (вместе с методами записи, зеркалом и serverSync). Пока facts
 * доказывается потерянулевым через round-trip в смоуке.
 *
 * ⛔ Unlock/done-логика сюда НЕ добавляется — она только в curriculum.js.
 */
import { CURRICULUM } from '../data/curriculum';
import { sm2 } from './planner';

// ─── Карта counterKey ⇄ nodeId (единственный источник — граф) ────────────────
export const COUNTER_KEY_TO_NODE = {};
export const NODE_TO_COUNTER_KEY = {};
for (const n of CURRICULUM) {
  if (n.counterKey) {
    COUNTER_KEY_TO_NODE[n.counterKey] = n.id;
    NODE_TO_COUNTER_KEY[n.id] = n.counterKey;
  }
}

// ─── Ключи элементов ──────────────────────────────────────────────────────────
export const itemKey = {
  letter: id => 'l:' + id,
  vowel:  id => 'v:' + id,
  word:   id => 'w:' + id,
};
/** Разобрать ключ элемента: 'w:rw_01' → { kind:'word', id:'rw_01' } */
export function parseItemKey(key) {
  const i = key.indexOf(':');
  const p = key.slice(0, i);
  const id = key.slice(i + 1);
  const kind = p === 'l' ? 'letter' : p === 'v' ? 'vowel' : 'word';
  return { kind, id };
}

// ─── Свёртка v7 → facts ───────────────────────────────────────────────────────

/**
 * Собрать facts.{nodes,items} из v7-полей. Идемпотентна и не мутирует вход.
 * НЕ теряет ничего, что читает deriveProgress (scores, счётчики, studied).
 */
export function foldToFacts(s = {}) {
  const nodes = {};
  const items = {};

  const node = id => (nodes[id] || (nodes[id] = {}));
  const item = key => (items[key] || (items[key] = {}));

  // scores { nodeId: pct } → nodes[id].score
  for (const [id, pct] of Object.entries(s.scores || {})) {
    if (pct != null) node(id).score = pct;
  }

  // blockScores { counterKey: count } → nodes[nodeId].counter
  // (неизвестные ключи сохраняем под сырым именем, чтобы не потерять — но их быть не должно)
  for (const [ck, cnt] of Object.entries(s.blockScores || {})) {
    const id = COUNTER_KEY_TO_NODE[ck] || ('#' + ck);
    node(id).counter = cnt;
  }

  // cardReviews { letterId: sm2 } → items['l:'+id].sm2
  for (const [id, card] of Object.entries(s.cardReviews || {})) {
    const it = item(itemKey.letter(id)); it.kind = 'letter'; it.sm2 = card;
  }
  // weakLetters { letterId: wrongCount } → items['l:'+id].wrong
  for (const [id, c] of Object.entries(s.weakLetters || {})) {
    const it = item(itemKey.letter(id)); it.kind = 'letter'; it.wrong = c;
  }
  // vowelReviews { key: sm2 } → items['v:'+key].sm2
  for (const [k, card] of Object.entries(s.vowelReviews || {})) {
    const it = item(itemKey.vowel(k)); it.kind = 'vowel'; it.sm2 = card;
  }

  // readingProgress.studied [id] → items['w:'+id].introduced
  const rp = s.readingProgress || {};
  for (const id of rp.studied || []) {
    const it = item(itemKey.word(id)); it.kind = 'word'; it.introduced = true;
  }
  // readingProgress.words { id: {seen,correct,wrong,sm2?} }
  // ⚠️ introduced НЕ ставим здесь: слово, на которое ответили неверно, имеет
  // запись в words, но НЕ входит в studied. introduced — только из studied[].
  for (const [id, w] of Object.entries(rp.words || {})) {
    const it = item(itemKey.word(id));
    it.kind = 'word';
    if (w.seen    != null) it.seen    = w.seen;
    if (w.correct != null) it.correct = w.correct;
    if (w.wrong   != null) it.wrong   = w.wrong;
    if (w.sm2)             it.sm2     = w.sm2;
  }

  // Легаси-словарь (wordsStudied/wordsCorrect) — вливаем в те же word-элементы
  for (const id of s.wordsStudied || []) {
    const it = item(itemKey.word(String(id))); it.kind = 'word'; it.introduced = true;
  }
  for (const [id, c] of Object.entries(s.wordsCorrect || {})) {
    const it = item(itemKey.word(String(id)));
    it.kind = 'word'; it.correct = Math.max(it.correct || 0, c || 0);
  }

  return { nodes, items };
}

// ─── Обратная проекция facts → старая форма (будущее «зеркало» для экранов) ───

/**
 * Спроецировать facts обратно в v7-поля. Read-only вью: экраны (часть 2) читают
 * его вместо прямых полей, канонический источник — facts. Round-trip
 * factsToLegacyView(foldToFacts(v7)) сохраняет всё, что нужно deriveProgress.
 */
export function factsToLegacyView(facts = { nodes: {}, items: {} }) {
  const scores = {};
  const blockScores = {};
  for (const [id, n] of Object.entries(facts.nodes || {})) {
    if (n.score != null) scores[id] = n.score;
    if (n.counter != null) {
      const ck = NODE_TO_COUNTER_KEY[id] || (id[0] === '#' ? id.slice(1) : null);
      if (ck) blockScores[ck] = n.counter;
    }
  }

  const studied = [];
  const words = {};
  const cardReviews = {};
  const vowelReviews = {};
  const weakLetters = {};
  const wordsStudied = [];
  const wordsCorrect = {};

  for (const [key, it] of Object.entries(facts.items || {})) {
    const { kind, id } = parseItemKey(key);
    if (kind === 'letter') {
      if (it.sm2) cardReviews[id] = it.sm2;
      if (it.wrong != null) weakLetters[id] = it.wrong;
    } else if (kind === 'vowel') {
      if (it.sm2) vowelReviews[id] = it.sm2;
    } else if (kind === 'word') {
      if (it.introduced) { studied.push(id); wordsStudied.push(id); }
      const w = {
        seen:    it.seen    ?? 0,
        correct: it.correct ?? 0,
        wrong:   it.wrong   ?? 0,
      };
      if (it.sm2) w.sm2 = it.sm2;
      words[id] = w;
      if (it.correct != null) wordsCorrect[id] = it.correct;
    }
  }

  return {
    scores,
    blockScores,
    readingProgress: { studied, words },
    cardReviews,
    vowelReviews,
    weakLetters,
    wordsStudied,
    wordsCorrect,
  };
}

// ─── Чистые мутаторы (пишет их StatsContext, тестируются в смоуке) ────────────
// Все возвращают НОВЫЙ facts, вход не мутируют. Канонический стор — facts;
// зеркало (factsToLegacyView) регенерируется StatsContext после каждого вызова.

function withNode(facts, id, patch) {
  return { ...facts, nodes: { ...facts.nodes, [id]: { ...facts.nodes?.[id], ...patch } } };
}
function withItem(facts, key, patch) {
  return { ...facts, items: { ...facts.items, [key]: { ...facts.items?.[key], ...patch } } };
}

/** Процент теста узла (по максимуму). */
export function setNodeScore(facts, id, score) {
  const cur = facts.nodes?.[id]?.score ?? 0;
  return withNode(facts, id, { score: Math.max(cur, score) });
}
/** Игровой счётчик узла (+by). */
export function bumpNodeCounter(facts, id, by = 1) {
  const cur = facts.nodes?.[id]?.counter ?? 0;
  return withNode(facts, id, { counter: cur + by });
}
/** Повтор буквы: SM-2 + wrong++ на «Снова» (→ weakLetters в зеркале). */
export function reviewLetter(facts, letterId, quality) {
  const key = itemKey.letter(letterId);
  const it = facts.items?.[key] || {};
  const patch = { kind: 'letter', sm2: sm2(it.sm2, quality) };
  if (quality === 0) patch.wrong = (it.wrong || 0) + 1;
  return withItem(facts, key, patch);
}
/** Повтор огласовки: SM-2. */
export function reviewVowel(facts, vowelKey, quality) {
  const key = itemKey.vowel(vowelKey);
  const it = facts.items?.[key] || {};
  return withItem(facts, key, { kind: 'vowel', sm2: sm2(it.sm2, quality) });
}
/** Слово показано (карточка перевёрнута). Возвращает {facts, isNew}. */
export function seenWord(facts, id) {
  const key = itemKey.word(id);
  const it = facts.items?.[key] || {};
  return {
    facts: withItem(facts, key, { kind: 'word', introduced: true, seen: (it.seen || 0) + 1 }),
    isNew: !it.introduced,
  };
}
/** Ответ в квизе. Верный ответ вводит слово в словарь. {facts, isNew}. */
export function answerWord(facts, id, ok) {
  const key = itemKey.word(id);
  const it = facts.items?.[key] || {};
  const patch = {
    kind: 'word',
    correct: (it.correct || 0) + (ok ? 1 : 0),
    wrong:   (it.wrong   || 0) + (ok ? 0 : 1),
  };
  const isNew = ok && !it.introduced;
  if (ok) patch.introduced = true;
  return { facts: withItem(facts, key, patch), isNew };
}
/** Повтор слова карточкой (Снова/Трудно/Легко): единый SM-2. {facts, isNew}. */
export function reviewWord(facts, id, quality) {
  const key = itemKey.word(id);
  const it = facts.items?.[key] || {};
  const ok = quality >= 1;
  const isNew = !it.introduced;
  return {
    facts: withItem(facts, key, {
      kind: 'word', introduced: true,
      seen:    (it.seen    || 0) + 1,
      correct: (it.correct || 0) + (ok ? 1 : 0),
      wrong:   (it.wrong   || 0) + (ok ? 0 : 1),
      sm2:     sm2(it.sm2, quality),
    }),
    isNew,
  };
}

// ─── Слияние фактов для serverSync (одно правило, монотонно) ─────────────────
// Узлы: score/counter по максимуму. Элементы: счётчики по максимуму, introduced
// по ИЛИ, sm2 — более продвинутая карта (больше repetitions; при равенстве —
// более поздний nextReview). Откат прогресса невозможен.
export function mergeFacts(a = { nodes: {}, items: {} }, b = { nodes: {}, items: {} }) {
  const nodes = { ...(a.nodes || {}) };
  for (const [id, n] of Object.entries(b.nodes || {})) {
    const c = nodes[id] || {};
    const m = {};
    if (c.score != null || n.score != null) m.score = Math.max(c.score ?? 0, n.score ?? 0);
    if (c.counter != null || n.counter != null) m.counter = Math.max(c.counter ?? 0, n.counter ?? 0);
    nodes[id] = m;
  }
  const items = { ...(a.items || {}) };
  for (const [k, it] of Object.entries(b.items || {})) {
    const c = items[k] || {};
    const m = { kind: c.kind || it.kind };
    if (c.introduced || it.introduced) m.introduced = true;
    const seen    = Math.max(c.seen    ?? 0, it.seen    ?? 0); if (seen)    m.seen    = seen;
    const correct = Math.max(c.correct ?? 0, it.correct ?? 0); if (correct) m.correct = correct;
    const wrong   = Math.max(c.wrong   ?? 0, it.wrong   ?? 0); if (wrong)   m.wrong   = wrong;
    const sa = c.sm2, sb = it.sm2;
    const pick = !sa ? sb : !sb ? sa
      : (sb.repetitions > sa.repetitions
         || (sb.repetitions === sa.repetitions && (sb.nextReview || 0) > (sa.nextReview || 0)))
        ? sb : sa;
    if (pick) m.sm2 = pick;
    items[k] = m;
  }
  return { nodes, items };
}
