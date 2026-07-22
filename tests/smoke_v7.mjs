// tests/smoke_v7.mjs — сквозная проверка графа курса и данных чтения.
// Запуск (Windows/PowerShell, две команды отдельно):
//   npx esbuild tests/smoke_v7.mjs --bundle --format=esm --outfile=tests/.smoke.bundle.mjs
//   node tests/.smoke.bundle.mjs
// Гонять после ЛЮБОГО изменения curriculum.js / reading.js / vocab.js / миграций.
import { CURRICULUM, deriveProgress, getNodeStatus, isNodeDone, getReadingBlockStudiedPct, isReadingBlockUnlocked, getLockHint } from '../src/data/curriculum.js';
import { checkReadingUnlock, getFreshPortions } from '../src/helpers/progressHelpers.js';
import { GRAMMAR_LESSONS } from '../src/data/grammarLessons.js';
import { READING_BLOCKS, READING_ITEMS, getBlockCards, PHRASE_LOCKS, getUnlockedPhraseLocks } from '../src/data/reading.js';
import { getKnownLetters, isReadableByLetters } from '../src/helpers/vocab.js';
import { ALPHABET, LETTER_GROUPS } from '../src/data/alphabet.js';
import { GRAMMAR_LESSONS_BY_ID } from '../src/data/grammarLessons.js';
import { sm2, isDue, dueKeys } from '../src/helpers/planner.js';
import { foldToFacts, factsToLegacyView, itemKey, COUNTER_KEY_TO_NODE, NODE_TO_COUNTER_KEY,
         setNodeScore, bumpNodeCounter, reviewLetter, reviewVowel, seenWord, answerWord, reviewWord, mergeFacts } from '../src/helpers/facts.js';
import { migrate, migrateThroughV7 } from '../src/helpers/migrate.js';
import { GENERATORS, buildQuestion, buildSession, stripNikud as exStrip, shuffleRnd } from '../src/helpers/exercises.js';

let fails = 0;
function check(name, cond) {
  console.log((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) fails++;
}

// ── 1. Новый пользователь ──
const fresh = { scores: {}, blockScores: {}, readingProgress: { studied: [] } };
let p = deriveProgress(fresh);
check('новый: letters[1] available', p.letters[1] === 'available');
check('новый: letters[2] locked', p.letters[2] === 'locked');
check('новый: sounds[1] locked', p.sounds[1] === 'locked');
check('этап4: матрицы words нет в progress', p.words === undefined);
check('новый: C0 locked', p.syntax.C0 === 'locked');

// ── 2. Тест <70% НЕ даёт done; ≥70% даёт ──
const low = { ...fresh, scores: { 'L1.1': 55 } };
check('L1.1=55%: не done', !isNodeDone('L1.1', low));
check('L1.1=55%: L1.2 всё ещё locked', getNodeStatus('L1.2', low) === 'locked');
const ok70 = { ...fresh, scores: { 'L1.1': 70 } };
check('L1.1=70%: done', isNodeDone('L1.1', ok70));
check('L1.1=70%: L1.2 всё равно locked — нужна порция слов VL1.1', getNodeStatus('L1.2', ok70) === 'locked');

// ── 3. Игровой путь: 10 правильных в игре = done без теста ──
const game = { ...fresh, blockScores: { letters_1: 10 } };
check('игра 10 ответов: L1.1 done', isNodeDone('L1.1', game));

// ── 4. Обязательные порции: сплетённая цепочка зоны 0 ──
// L1.2 требует не только L1.1, но и порцию слов VL1.1
const l1only = { ...fresh, scores: { 'L1.1': 80 } };
check('L1.1 done, слова не изучены: L1.2 LOCKED', getNodeStatus('L1.2', l1only) === 'locked');
check('подсказка замка указывает на порцию', /Сначала изучи слова/.test(getLockHint('L1.2', l1only) || ''));
const vl11 = READING_BLOCKS.find(b => b.id === 'VL1.1');
check('VL1.1 открыта после L1.1', isReadingBlockUnlocked(vl11, l1only));
check('VL1.1 — превью (до никуда)', vl11.mode === 'preview');
check('VL1.1: ровно 5 слов', vl11.items.length === 5);
const l1v = { ...l1only, readingProgress: { studied: getBlockCards(vl11).map(i => i.id), words: {} } };
check('изучил порцию: L1.2 available', getNodeStatus('L1.2', l1v) === 'available');

// Треки сплетены: буквы гр.3 требуют огласовок Н2
const lettersOnly = { ...fresh, scores: { 'L1.1': 80, 'L1.2': 80 },
  readingProgress: { studied: [...getBlockCards(vl11).map(i=>i.id), ...getBlockCards(READING_BLOCKS.find(b=>b.id==='VL1.2')).map(i=>i.id)], words: {} } };
check('без Н2: L1.3 locked (треки сплетены)', getNodeStatus('L1.3', lettersOnly) === 'locked');
const withN2 = { ...lettersOnly, scores: { ...lettersOnly.scores, 'N1.1': 80, 'N1.2': 80 } };
check('с Н2: L1.3 available', getNodeStatus('L1.3', withN2) === 'available');

// ── 5. Words: min:90 на зависимостях ──
const w89 = { ...fresh, scores: { 'L1.1': 95, 'L1.2': 89, 'N1.1': 95, 'N1.2': 95 } };
check('этап4: getNodeStatus по снесённому W1 — locked (узла нет)', getNodeStatus('W1', w89) === 'locked');
const w90 = { ...fresh, scores: { 'L1.1': 95, 'L1.2': 90, 'N1.1': 95, 'N1.2': 90 } };
check('этап4: W1 отсутствует и при выполненных старых условиях', getNodeStatus('W1', w90) === 'locked');

// ── 6. Порция «done» = 100% доступных; C0 открывается после VL1.3 ──
const rStats = { scores: { 'L1.1': 80, 'L1.2': 80, 'L1.3': 80, 'N1.1': 80, 'N1.2': 80 }, blockScores: {}, readingProgress: { studied: [], words: {} } };
const vl13 = READING_BLOCKS.find(b => b.id === 'VL1.3');
check('VL1.3 открыта (L1.3+N1.2)', isReadingBlockUnlocked(vl13, rStats));
check('VL1.3 не done (не изучено)', !isNodeDone('VL1.3', rStats));
check('C0 locked до изучения слов', getNodeStatus('C0', rStats) === 'locked');
rStats.readingProgress.studied = getBlockCards(vl13).map(i => i.id);
check('VL1.3 done после 100% изучения', isNodeDone('VL1.3', rStats));
check('C0 available после VL1.3', getNodeStatus('C0', rStats) === 'available');

// ── 7. Грамматическая цепочка ──
const g = { ...rStats, scores: { ...rStats.scores, 'C0': 85 } };
check('C0=85: done', isNodeDone('C0', g));
check('M1.1 available после C0', getNodeStatus('M1.1', g) === 'available');
check('C1 locked до M1.1', getNodeStatus('C1', g) === 'locked');
const g2 = { ...g, scores: { ...g.scores, 'M1.1': 90, 'M1.2': 75, 'M1.3': 80 } };
check('M1.1=90 done; C1 ждёт M1.4 (арка артикля цельная)', isNodeDone('M1.1', g2) && getNodeStatus('C1', g2) === 'locked' && getNodeStatus('C1', { ...g2, scores: { ...g2.scores, 'M1.4': 95 } }) === 'available');
check('M1.4 available (M1.3 done)', getNodeStatus('M1.4', g2) === 'available');
check('M1.4=85 <90: не done (isSynthesis)', !isNodeDone('M1.4', { ...g2, scores: { ...g2.scores, 'M1.4': 85 } }));
check('M1.4=90: done', isNodeDone('M1.4', { ...g2, scores: { ...g2.scores, 'M1.4': 90 } }));

// ── 8. Блок чтения урока открывается по «урок done» ──
const c0block = READING_BLOCKS.find(b => b.id === 'R1.20');
check('R1.20 закрыт до C0', !isReadingBlockUnlocked(c0block, rStats));
check('R1.20 открыт после C0', isReadingBlockUnlocked(c0block, g));

// ── 9. Финальные формы: считаются по базовой букве ──
const known12 = getKnownLetters({ 1: 'done', 2: 'done' }, ALPHABET, LETTER_GROUPS);
const known123 = getKnownLetters({ 1: 'done', 2: 'done', 3: 'done' }, ALPHABET, LETTER_GROUPS);
check('מים нечитаемо при группах 1-2 (מ — гр.3)', !isReadableByLetters('מַיִם', known12));
check('מים ЧИТАЕМО при группах 1-3 (ם считается как מ)', isReadableByLetters('מַיִם', known123));
check('דֶּרֶךְ читаемо при 1-4 (ך→כ гр.2)', isReadableByLetters('דֶּרֶךְ', getKnownLetters({1:'done',2:'done',3:'done',4:'done'}, ALPHABET, LETTER_GROUPS)));

// ── 10. Дедуп: уникальность plain в items (кроме 3 исторических R0) ──
const norm = h => h.replace(/[\u05B0-\u05C7\s?!.,«»()\-–—:;']/g, '');
const plains = READING_ITEMS.map(i => norm(i.hebrew));
const dups = plains.filter((v, i) => plains.indexOf(v) !== i);
check('дубликатов plain ≤ 3 (исторические R0)', dups.length <= 3);

// ── 11. review-ссылки все резолвятся ──
const allIds = new Set(READING_ITEMS.map(i => i.id));
const badRefs = READING_BLOCKS.flatMap(b => (b.review || []).filter(r => !allIds.has(r)));
check('все review-ссылки валидны', badRefs.length === 0);

// ── 12. Миграция v6→v7 (симуляция на данных прод-юзера) ──
const legacyV6 = {
  version: 6,
  progress: { letters: { 1: 'done', 2: 'done', 3: 'available', 4: 'locked', 5: 'locked' },
              sounds: { 1: 'done', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked' } },
  testScores: { letters_1: 92 },
  lessonScores: { 'C0': 85 },
  blockScores: { letters_1: 10 },
  readingProgress: { studied: [] },
};
const scores = {};
Object.entries(legacyV6.testScores).forEach(([key, val]) => {
  const [sec, n] = key.split('_');
  const id = ({ letters: 'L1.', sounds: 'N1.' }[sec] || '') + n;
  scores[id] = Math.max(scores[id] ?? 0, val);
});
Object.entries(legacyV6.lessonScores).forEach(([id, val]) => { scores[id] = Math.max(scores[id] ?? 0, val); });
for (const sec of ['letters', 'sounds']) {
  for (let n = 1; n <= 5; n++) {
    if (legacyV6.progress[sec]?.[n] === 'done') {
      const id = ({ letters: 'L1.', sounds: 'N1.' }[sec]) + n;
      scores[id] = Math.max(scores[id] ?? 0, 70);
    }
  }
}
const migrated = { ...legacyV6, scores };
const mp = deriveProgress(migrated);
check('миграция: L1.1 done (тест 92)', mp.letters[1] === 'done' && migrated.scores['L1.1'] === 92);
check('миграция: L1.2 done (был done без теста → 70)', mp.letters[2] === 'done' && migrated.scores['L1.2'] === 70);
check('миграция: L1.3 locked до Н2 (сплетённая зона; было available)', mp.letters[3] === 'locked');
check('миграция: N1.1 done', mp.sounds[1] === 'done');
check('миграция: C0 done (lessonScores перенесён)', mp.syntax.C0 === 'done');

// ── 12b. R1.21 (M1.1) ──
const r121 = READING_BLOCKS.find(b => b.id === 'R1.21');
check('R1.21 существует, 7 items + 3 review', !!r121 && r121.items.length === 7 && r121.review.length === 3);
check('R1.21 закрыт до M1.1, открыт после', !isReadingBlockUnlocked(r121, g) && isReadingBlockUnlocked(r121, g2));

// ── 12c. Числа Ч1 ──
check('CH1.1 locked до M1.3', getNodeStatus('CH1.1', g) === 'locked');
check('CH1.1 требует M1.3 + L1.4 (якорь зоны 0)', getNodeStatus('CH1.1', g2) === 'locked' && getNodeStatus('CH1.1', { ...g2, scores: { ...g2.scores, 'L1.4': 80 } }) === 'available');
const gCh = { ...g2, scores: { ...g2.scores, 'L1.4': 80, 'CH1.1': 80, 'CH1.2': 75 } };
check('цепочка CH1.1→CH1.2→CH1.3', isNodeDone('CH1.2', gCh) && getNodeStatus('CH1.3', gCh) === 'available');
const r128 = READING_BLOCKS.find(b => b.id === 'R1.28');
check('R1.28: 5 items, открыт после CH1.3', !!r128 && r128.items.length === 5 && isReadingBlockUnlocked(r128, { ...gCh, scores: { ...gCh.scores, 'CH1.3': 90 } }) && !isReadingBlockUnlocked(r128, gCh));
check('все уроки уровня 1 имеют practiceItems', GRAMMAR_LESSONS.filter(l => l.level === 1).every(l => l.practiceItems.length >= 5));

// ── 12d. Фразы-замки зоны 0 ──
check('PHRASE_LOCKS: 16 фраз, все composedOf-ссылки валидны',
  PHRASE_LOCKS.length === 16 &&
  PHRASE_LOCKS.every(p => p.composedOf.length >= 2 && p.composedOf.every(id => READING_ITEMS.some(i => i.id === id))));
check('фразы-замки: пустой словарь → 0 открытых', getUnlockedPhraseLocks([]).length === 0);
check('фразы-замки: зэ+тов открывает pl_01, но не pl_02 (нет לא)',
  getUnlockedPhraseLocks(['rw_18','rw_32']).some(p => p.id === 'pl_01') &&
  !getUnlockedPhraseLocks(['rw_18','rw_32']).some(p => p.id === 'pl_02'));
check('фразы-замки: полный словарь → все 16 открыты',
  getUnlockedPhraseLocks(READING_ITEMS.map(i => i.id)).length === 16);

// ── 12e. Глаголы Г1 ──
check('G1.1 locked до M1.4', getNodeStatus('G1.1', g) === 'locked');
const gM14 = { ...g2, scores: { ...g2.scores, 'M1.4': 95 } };
check('G1.1 требует M1.4 + N1.5 (якорь зоны 0)', getNodeStatus('G1.1', gM14) === 'locked' && getNodeStatus('G1.1', { ...gM14, scores: { ...gM14.scores, 'N1.5': 80 } }) === 'available');
check('G1.1 без practiceItems (урок-концепция), G1.6 порог 90',
  GRAMMAR_LESSONS.find(l => l.id === 'G1.1').practiceItems.length === 0 &&
  GRAMMAR_LESSONS.find(l => l.id === 'G1.6').threshold === 90);
const gG = { ...gM14, scores: { ...gM14.scores, 'N1.5': 80, 'G1.1': 100, 'G1.2': 80, 'G1.3': 75, 'G1.4': 85, 'C2': 80, 'G1.5': 72, 'G1.6': 89 } };
check('G1.6=89 < 90 → не done', !isNodeDone('G1.6', gG));
check('G1.6=90 → done', isNodeDone('G1.6', { ...gG, scores: { ...gG.scores, 'G1.6': 90 } }));
const r130 = READING_BLOCKS.find(b => b.id === 'R1.30');
check('R1.30: 6 items, открыт после G1.2', !!r130 && r130.items.length === 6 && isReadingBlockUnlocked(r130, gG) && !isReadingBlockUnlocked(r130, gM14));
check('G1-порции: review-ссылки валидны',
  ['R1.30','R1.31','R1.32','R1.33','R1.34'].every(bid =>
    READING_BLOCKS.find(b => b.id === bid).review.every(id => READING_ITEMS.some(i => i.id === id))));

// ── 12f. C2 + CH1.4 (уровень 2 полностью) ──
check('C2 available после G1.4 (не ждёт G1.6)', getNodeStatus('C2', { ...gG, scores: { ...gG.scores, 'G1.6': 0, 'C2': 0 } }) === 'available');
check('CH1.4 available после CH1.3', getNodeStatus('CH1.4', { ...gCh, scores: { ...gCh.scores, 'CH1.3': 90 } }) === 'available');
check('CH1.4 locked без CH1.3', getNodeStatus('CH1.4', gCh) === 'locked');
check('R1.36: 5 ж.р. чисел, review валиден',
  (() => { const b = READING_BLOCKS.find(x => x.id === 'R1.36');
    return b && b.items.length === 5 && b.review.every(id => READING_ITEMS.some(i => i.id === id)); })());
check('уровень 2 полностью: 8 уроков в коде',
  ['G1.1','G1.2','G1.3','G1.4','G1.5','G1.6','C2','CH1.4'].every(id => GRAMMAR_LESSONS.some(l => l.id === id)));

// ── 12g. Уровень 3 (M2, C3, G2, C4, CH2.1) ──
const gL2 = { ...gG, scores: { ...gG.scores, 'G1.6': 95, 'C2': 80, 'CH1.4': 80 } };
check('M2.1 после G1.6; G2.1 ждёт M2.9 (ветки последовательны)', getNodeStatus('M2.1', gL2) === 'available' && getNodeStatus('G2.1', gL2) === 'locked');
check('M2.1 locked до G1.6', getNodeStatus('M2.1', gG) === 'locked');
const gM2 = { ...gL2, scores: { ...gL2.scores, 'M2.1': 80, 'M2.2': 80, 'M2.3': 80, 'M2.4': 80, 'M2.5': 80, 'M2.6': 80 } };
check('C3 available после M2.6, M2.7 после C3', getNodeStatus('C3', gM2) === 'available' &&
  getNodeStatus('M2.7', { ...gM2, scores: { ...gM2.scores, 'C3': 75 } }) === 'available');
const gC4a = { ...gM2, scores: { ...gM2.scores, 'C3': 80, 'M2.7': 80, 'M2.8': 80, 'M2.9': 95, 'G2.1': 80 } };
check('C4 требует ОБА: M2.9 и G2.2', getNodeStatus('C4', gC4a) === 'locked' &&
  getNodeStatus('C4', { ...gC4a, scores: { ...gC4a.scores, 'G2.2': 80 } }) === 'available');
check('M2.9 порог 90: 89 не done', !isNodeDone('M2.9', { ...gM2, scores: { ...gM2.scores, 'C3': 80, 'M2.7': 80, 'M2.8': 80, 'M2.9': 89 } }));
check('CH2.1 после CH1.4', getNodeStatus('CH2.1', gL2) === 'available');
check('уровень 3: все 16 уроков в коде и в графе',
  ['M2.1','M2.2','M2.3','M2.4','M2.5','M2.6','C3','M2.7','M2.8','M2.9','G2.1','G2.2','G2.3','G2.4','C4','CH2.1']
    .every(id => GRAMMAR_LESSONS.some(l => l.id === id) && getNodeStatus(id, g) === 'locked'));
check('порции уровня 3: R1.37–R1.52 существуют, review валидны',
  ['R1.37','R1.38','R1.39','R1.40','R1.41','R1.42','R1.43','R1.44','R1.45','R1.46','R1.47','R1.48','R1.49','R1.50','R1.51','R1.52']
    .every(bid => { const b = READING_BLOCKS.find(x => x.id === bid);
      return b && b.items.length >= 3 && b.review.every(id => READING_ITEMS.some(i => i.id === id)); }));

// ── 12h. Выпрямление пути (03.07) ──
check('G1.5 ждёт C2 (вопрос до отрицания)', getNodeStatus('G1.5', { ...gG, scores: { ...gG.scores, 'C2': 0, 'G1.5': 0 } }) === 'locked');
check('G2.1 открывается после M2.9', getNodeStatus('G2.1', { ...gC4a, scores: { ...gC4a.scores, 'G2.1': 0 } }) === 'available');

// ── 12i. Фонетика (дагеш, шва) ──
check('D1.1 locked без N1.5, available с N1.5', getNodeStatus('D1.1', g) === 'locked' && getNodeStatus('D1.1', { ...g, scores: { ...g.scores, 'N1.5': 80 } }) === 'available');
check('D1.1 без теста (концепция), D1.2 с тестом',
  GRAMMAR_LESSONS.find(l => l.id === 'D1.1').practiceItems.length === 0 &&
  GRAMMAR_LESSONS.find(l => l.id === 'D1.2').practiceItems.length === 6);
const gPh = { ...g, scores: { ...g.scores, 'N1.5': 80, 'D1.1': 100, 'D1.2': 80, 'SH1.1': 75 } };
check('цепочка D1.1→D1.2→SH1.1→SH1.2', isNodeDone('SH1.1', gPh) && getNodeStatus('SH1.2', gPh) === 'available');
check('D1.3 требует M1.1 (артикль), не зону 0', getNodeStatus('D1.3', gPh) === 'locked' &&
  getNodeStatus('D1.3', { ...gPh, scores: { ...gPh.scores, 'C0': 80, 'M1.1': 80 } }) === 'available');
check('C0 НЕ требует фонетику (грамматика не блокируется дагешем)',
  getNodeStatus('C0', { ...g, scores: { ...g.scores, 'D1.1': 0, 'D1.2': 0 } }) !== 'locked' || getNodeStatus('C0', g) === getNodeStatus('C0', { ...g, scores: { ...g.scores } }));
check('фонетика: 5 уроков в модуле phonetics',
  GRAMMAR_LESSONS.filter(l => l.module === 'phonetics').length === 5);

// ── 13. Единый поток: свежие порции для CTA ──
const freshStats = { scores: { 'L1.1': 80 }, blockScores: {},
  readingProgress: { studied: [], words: {} },
  progress: { letters: { 1: 'done', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked' } } };
const portions = getFreshPortions(freshStats);
check('после L1.1: свежая порция VL1.1 с 5 словами', portions.length >= 1 && portions[0].block.id === 'VL1.1' && portions[0].freshCount === 5);
const afterStudy = { ...freshStats, readingProgress: { studied: getBlockCards(READING_BLOCKS.find(b=>b.id==='VL1.1')).map(i=>i.id), words: {} } };
check('после изучения VL1.1 свежих порций из неё нет', getFreshPortions(afterStudy).every(p2 => p2.block.id !== 'VL1.1'));

// ── 14. Миграция словаря: studied → words ──
const dictMig = { readingProgress: { studied: ['rw_01', 'rw_02'] } };
// имитация идемпотентного шага migrate:
dictMig.readingProgress.words = {};
dictMig.readingProgress.studied.forEach(id => { dictMig.readingProgress.words[id] = { seen: 1, correct: 0, wrong: 0 }; });
check('словарь: words создан из studied', Object.keys(dictMig.readingProgress.words).length === 2 && dictMig.readingProgress.words['rw_01'].seen === 1);

// ── 15. Единый планировщик SM-2 (helpers/planner.js) ──
const NOW = 1_700_000_000_000;
const DAY = 86400000;
// Первый верный ответ (Легко): interval=1, repetitions=1, nextReview через 1 день
const c1 = sm2({}, 2, NOW);
check('планировщик: новая карта, quality=2 → interval 1, reps 1', c1.interval === 1 && c1.repetitions === 1);
check('планировщик: nextReview = now + interval*день', c1.nextReview === NOW + 1 * DAY);
// Второй верный: interval=3
const c2 = sm2(c1, 2, NOW);
check('планировщик: 2-й верный → interval 3, reps 2', c2.interval === 3 && c2.repetitions === 2);
// Третий верный: interval = round(3 * ef)
const c3 = sm2(c2, 2, NOW);
check('планировщик: 3-й верный → interval растёт (>=3)', c3.interval >= 3 && c3.repetitions === 3);
// «Снова» (quality 0) сбрасывает прогресс
const cReset = sm2(c3, 0, NOW);
check('планировщик: «Снова» (q=0) сбрасывает reps в 0 и interval в 1', cReset.repetitions === 0 && cReset.interval === 1);
// ef не опускается ниже 1.3
let ef = {};
for (let i = 0; i < 10; i++) ef = sm2(ef, 1, NOW);
check('планировщик: ef не ниже 1.3 после серии «Трудно»', ef.ef >= 1.3);
// isDue: свежая карта due; запланированная на будущее — нет
check('планировщик: карта без nextReview — due', isDue(undefined, NOW) && isDue({}, NOW));
check('планировщик: карта на завтра — не due', !isDue(c1, NOW));
check('планировщик: карта на завтра — due через 2 дня', isDue(c1, NOW + 2 * DAY));
// dueKeys выбирает только просроченные
const map = { a: { nextReview: NOW - DAY }, b: { nextReview: NOW + DAY }, c: {} };
const due = dueKeys(map, NOW).sort();
check('планировщик: dueKeys выбирает просроченные и новые', due.length === 2 && due.includes('a') && due.includes('c'));

// ── 16. Факты v8: свёртка v7 → facts.{nodes,items} + обратная проекция ──
function stable(x) {
  if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
  if (x && typeof x === 'object')
    return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
const deepEq = (a, b) => stable(a) === stable(b);

// counterKey ⇄ node: карта покрывает ровно узлы со счётчиком (W/P снесены, этап 4)
const counterNodes = ['L1.1','L1.2','L1.3','L1.4','L1.5','N1.1','N1.2','N1.3','N1.4','N1.5'];
check('facts: counterKey↔node карта покрывает все узлы со счётчиком',
  counterNodes.every(id => NODE_TO_COUNTER_KEY[id] && COUNTER_KEY_TO_NODE[NODE_TO_COUNTER_KEY[id]] === id));

// ── Этап 4: узлы W1-5/P1-5 снесены, данные юзеров не теряются ──
check('этап4: узлов W1-5/P1-5 нет в графе',
  ['W1','W2','W3','W4','W5','P1','P2','P3','P4','P5'].every(id => !CURRICULUM.some(n => n.id === id)));
check('этап4: deriveProgress не эмитит words/phrases',
  (() => { const p = deriveProgress({ scores:{}, blockScores:{}, readingProgress:{studied:[]} });
           return !p.words && !p.phrases; })());
// счётчик words_1 старого юзера сворачивается в '#words_1' и переживает круг
const legacyCounters = { scores:{}, blockScores:{ words_1: 10, letters_1: 5 }, readingProgress:{studied:[]} };
const flc = foldToFacts(legacyCounters);
check('этап4: неизвестный counterKey сохранён в facts (#-fallback)', flc.nodes['#words_1']?.counter === 10);
check('этап4: известный counterKey живёт как узел', flc.nodes['L1.1']?.counter === 5);
check('этап4: #-fallback разворачивается обратно в blockScores',
  factsToLegacyView(flc).blockScores.words_1 === 10 && factsToLegacyView(flc).blockScores.letters_1 === 5);

// Населённая v7-фикстура (зона 0 пройдена + грамматика + атомы букв/огласовок/слов)
const zoneCards = ['VL1.1','VL1.2','VL1.3','VL1.4','VN1.3','VN1.4','VN1.5']
  .flatMap(bid => getBlockCards(READING_BLOCKS.find(b => b.id === bid)).map(i => i.id));
const L = ALPHABET[0].id, L2 = ALPHABET[1].id;
const sampleSm2 = { interval: 3, repetitions: 2, ef: 2.5, nextReview: 1700000000000 };
const rich = {
  scores: { 'L1.1':90,'L1.2':90,'L1.3':90,'L1.4':90,'L1.5':90,
            'N1.1':90,'N1.2':90,'N1.3':90,'N1.4':90,'N1.5':90,
            'C0':85,'M1.1':90,'M1.2':90,'M1.3':90,'M1.4':90 },
  blockScores: { letters_1: 12 },
  cardReviews: { [L]: sampleSm2 },
  weakLetters: { [L2]: 3 },
  vowelReviews: { patah: { interval: 1, repetitions: 1, ef: 2.5, nextReview: 1700000000001 } },
  wordsStudied: [],
  wordsCorrect: {},
  readingProgress: {
    studied: [...zoneCards, 'rw_seen'],
    words: {
      rw_seen:  { seen: 2, correct: 1, wrong: 0, sm2: sampleSm2 },
      rw_wrong: { seen: 1, correct: 0, wrong: 2 },  // отвечено неверно, НЕ в studied
    },
  },
};
const F = foldToFacts(rich);

// fold-placement: данные легли в правильные слоты facts
check('facts.fold: score узла', F.nodes['L1.1'].score === 90 && F.nodes['C0'].score === 85);
check('facts.fold: counter узла из blockScores', F.nodes['L1.1'].counter === 12);
check('facts.fold: SM-2 буквы', deepEq(F.items[itemKey.letter(L)].sm2, sampleSm2));
check('facts.fold: weakLetters → wrong элемента', F.items[itemKey.letter(L2)].wrong === 3);
check('facts.fold: SM-2 огласовки', !!F.items[itemKey.vowel('patah')].sm2);
check('facts.fold: introduced из studied', F.items[itemKey.word('rw_seen')].introduced === true);
check('facts.fold: слово-«неверно» НЕ introduced (нет в studied)',
  F.items[itemKey.word('rw_wrong')].introduced === undefined && F.items[itemKey.word('rw_wrong')].wrong === 2);

// Обратная проекция: восстанавливает то, что читает deriveProgress
const view = factsToLegacyView(F);
check('facts.view: scores восстановлены', deepEq(view.scores, rich.scores));
check('facts.view: blockScores восстановлены', view.blockScores.letters_1 === 12);
check('facts.view: studied восстановлен как множество',
  deepEq([...view.readingProgress.studied].sort(), [...rich.readingProgress.studied].sort()));
check('facts.view: cardReviews/weakLetters/vowelReviews восстановлены',
  deepEq(view.cardReviews, rich.cardReviews) && view.weakLetters[L2] === 3 && !!view.vowelReviews.patah);

// ── ГЛАВНЫЙ ИНВАРИАНТ: миграция потерянулева по статусам ──
// deriveProgress(v7) === deriveProgress(view(fold(v7))) для набора состояний.
const realEmpty = { scores:{}, blockScores:{}, readingProgress:{ studied:[] } };
const fixtures = [
  ['новый (реальный дамп daniilusachev)', realEmpty],
  ['зона 0 + грамматика (rich)', rich],
  ['частичный: L1.1 done, слова не изучены', { scores:{'L1.1':80}, blockScores:{}, readingProgress:{studied:[]} }],
  ['игровой путь: letters_1=10', { scores:{}, blockScores:{letters_1:10}, readingProgress:{studied:[]} }],
];
for (const [name, v7] of fixtures) {
  const before = deriveProgress(v7);
  const after  = deriveProgress(factsToLegacyView(foldToFacts(v7)));
  check(`facts.invariant: deriveProgress совпадает — ${name}`, deepEq(before, after));
}
// И покомпонентно по статусам всех узлов (rich)
const nodeIds = Object.keys(COUNTER_KEY_TO_NODE).map(ck => COUNTER_KEY_TO_NODE[ck])
  .concat(['C0','M1.1','M1.2','M1.3','M1.4','C1','G1.1']);
const richView = factsToLegacyView(foldToFacts(rich));
check('facts.invariant: getNodeStatus совпадает по всем узлам (rich)',
  nodeIds.every(id => getNodeStatus(id, rich) === getNodeStatus(id, richView)));

// ── 17. Чистые мутаторы facts (их пишет StatsContext) ──
const E = { nodes: {}, items: {} };
// узлы
check('mut: setNodeScore по максимуму',
  setNodeScore(setNodeScore(E, 'L1.1', 70), 'L1.1', 55).nodes['L1.1'].score === 70);
check('mut: bumpNodeCounter +1', bumpNodeCounter(bumpNodeCounter(E, 'W1'), 'W1').nodes['W1'].counter === 2);
check('mut: counter → blockScores в зеркале',
  factsToLegacyView(bumpNodeCounter(E, 'L1.1', 5)).blockScores.letters_1 === 5);
// буква: «Снова» → weakLetters
const fl = reviewLetter(E, '9', 0);
check('mut: reviewLetter q=0 → sm2 сброшен + weakLetters',
  fl.items['l:9'].sm2.repetitions === 0 && factsToLegacyView(fl).weakLetters['9'] === 1);
// огласовка с двоеточием в ключе
const fv = reviewVowel(E, 'shva:ב', 2);
check('mut: reviewVowel ключ с двоеточием round-trip',
  !!fv.items['v:shva:ב'].sm2 && !!factsToLegacyView(fv).vowelReviews['shva:ב']);
// слово: показ / ответ / повтор
const sw = seenWord(E, 'rw_01');
check('mut: seenWord → introduced+seen, isNew', sw.isNew === true && sw.facts.items['w:rw_01'].seen === 1);
const awWrong = answerWord(E, 'rw_x', false);
check('mut: answerWord неверно → wrong, НЕ introduced, не new',
  awWrong.facts.items['w:rw_x'].wrong === 1 && !awWrong.facts.items['w:rw_x'].introduced && awWrong.isNew === false);
const rw = reviewWord(E, 'rw_02', 2);
const rwView = factsToLegacyView(rw.facts);
check('mut: reviewWord → SM-2 + studied + words в зеркале',
  rw.isNew === true && !!rw.facts.items['w:rw_02'].sm2 &&
  rwView.readingProgress.studied.includes('rw_02') && !!rwView.readingProgress.words.rw_02.sm2);

// ── 18. mergeFacts (serverSync, одно правило) ──
const fa = { nodes: { 'L1.1': { score: 70 } }, items: { 'w:a': { kind:'word', introduced:true, correct:2, sm2:{repetitions:1,nextReview:100} } } };
const fb = { nodes: { 'L1.1': { score: 90 }, 'N1.1': { counter: 3 } }, items: { 'w:a': { kind:'word', correct:5, sm2:{repetitions:3,nextReview:50} }, 'w:b': { kind:'word', introduced:true } } };
const mg = mergeFacts(fa, fb);
check('merge: score по максимуму', mg.nodes['L1.1'].score === 90);
check('merge: узел только у b сохранён', mg.nodes['N1.1'].counter === 3);
check('merge: счётчики по максимуму', mg.items['w:a'].correct === 5);
check('merge: sm2 берёт более продвинутую (больше repetitions)', mg.items['w:a'].sm2.repetitions === 3);
check('merge: introduced по ИЛИ', mg.items['w:a'].introduced === true && mg.items['w:b'].introduced === true);

// ── 19. Реальный населённый дамп (Huzpay) — миграция потерянулева ──
// Обезличенный срез: непустые scores(48)/blockScores, cardReviews(числ. id),
// weakLetters, vowelReviews с ключами-двоеточиями, легаси-словарь, readingProgress.words.
const huzpay = {
  scores: { C0:88,C1:88,C2:100,C3:100,C4:100,'D1.1':100,'D1.2':100,'D1.3':100,
    'G1.1':100,'G1.2':100,'G1.3':100,'G1.4':88,'G1.5':100,'G1.6':100,
    'G2.1':100,'G2.2':100,'G2.3':100,'G2.4':100,
    'L1.1':100,'L1.2':70,'L1.3':70,'L1.4':70,'L1.5':70,
    'M1.1':100,'M1.2':88,'M1.3':100,'M1.4':100,
    'M2.1':75,'M2.2':100,'M2.3':100,'M2.4':88,'M2.5':100,'M2.6':100,'M2.7':100,'M2.8':100,'M2.9':100,
    'N1.1':70,'N1.2':70,'N1.3':70,'N1.4':70,'N1.5':92,
    'CH1.1':100,'CH1.2':100,'CH1.3':100,'CH1.4':100,'CH2.1':100,'SH1.1':100,'SH1.2':100 },
  blockScores: { words_1:10, sounds_1:10, sounds_2:10, sounds_3:10, sounds_4:10, sounds_5:10,
    letters_1:10, letters_2:10, letters_3:10, letters_4:10, letters_5:10 },
  cardReviews: { '1':{ef:2.6,interval:1,nextReview:1782658842990,repetitions:1},
                 '9':{ef:2.6,interval:1,nextReview:1782658871603,repetitions:0} },
  weakLetters: { '9': 1 },
  vowelReviews: { 'shva:ב':{ef:2.6,interval:1,nextReview:1782805811971,repetitions:1},
                  'hirik:כ':{ef:3.2,interval:595,nextReview:1834127418259,repetitions:7} },
  wordsStudied: ['1','95','328','24'],
  wordsCorrect: { '1':1,'24':4,'95':3,'328':4 },
  readingProgress: {
    studied: [],
    words: { rp_01:{seen:1,wrong:0,correct:0}, rp_17:{seen:3,wrong:0,correct:0} },
  },
};
const hzView = factsToLegacyView(foldToFacts(huzpay));
check('huzpay: deriveProgress миграции == оригинала',
  deepEq(deriveProgress(huzpay), deriveProgress(hzView)));
check('huzpay: ключ огласовки shva:ב восстановлен точно',
  deepEq(hzView.vowelReviews['shva:ב'], huzpay.vowelReviews['shva:ב']));
check('huzpay: cardReviews числовые id восстановлены',
  deepEq(hzView.cardReviews, huzpay.cardReviews) && hzView.weakLetters['9'] === 1);
check('huzpay: scores (48 узлов) восстановлены', deepEq(hzView.scores, huzpay.scores));
check('huzpay: легаси-словарь свёрнут в studied',
  hzView.readingProgress.studied.includes('1') && hzView.readingProgress.studied.includes('95'));

// ── 20. Цикл персиста: v7 → fold → strip mirror → reload → regenerate ──
// Имитируем сохранение (храним только facts+мета, зеркало стрипается) и загрузку
// (зеркало регенерируется из facts). Прогресс не теряется на кругу.
const MIRROR_KEYS = ['scores','blockScores','cardReviews','vowelReviews','weakLetters',
                     'wordsStudied','wordsCorrect','readingProgress','progress'];
function simulateSaveLoad(v7) {
  const facts = foldToFacts(v7);                         // migrate v7→v8
  const persisted = { facts, xp: v7.xp, version: 8 };    // strip mirror перед хранением
  for (const k of MIRROR_KEYS) delete persisted[k];
  // reload: version 8 → fold пропускается, зеркало регенерируется
  const reloaded = { ...persisted, ...factsToLegacyView(persisted.facts) };
  reloaded.progress = deriveProgress(reloaded);
  return reloaded;
}
for (const [name, v7] of fixtures) {
  const reloaded = simulateSaveLoad(v7);
  check(`persist-cycle: статусы сохраняются на кругу — ${name}`,
    deepEq(deriveProgress(v7), reloaded.progress));
}
check('persist-cycle: huzpay доезжает без потерь',
  deepEq(deriveProgress(huzpay), simulateSaveLoad(huzpay).progress));

// ── 21. Полная миграция v1→v8 на РАЗНЫХ версиях схемы (живые юзеры на v1/v4/v5/v7) ──
// Инвариант: шаг v8 не меняет выводимый прогресс против поведения ДО v8 (v1→v7).
// migrate/migrateThroughV7 мутируют — клонируем вход.
const clone = o => JSON.parse(JSON.stringify(o));
const legacyFixtures = [
  ['v1 (без version)', { xp: 10 }],
  ['v4 (nikudProgress)', {
    version: 4,
    groupProgress: { 1:'completed', 2:'completed', 3:'available', 4:'locked', 5:'locked' },
    cardReviews: { '1': { interval:3, repetitions:2, ef:2.6, nextReview:1800000000000 } },
    weakLetters: { '3': 1 },
    nikudProgress: {
      groupProgress: { 1:'completed', 2:'available', 3:'locked', 4:'locked', 5:'locked' },
      groupTestScores: {},
      vowelReviews: { 'patah:ב': { interval:1, repetitions:1, ef:2.6, nextReview:1800000000001 } },
      wordsStudied: ['5', '9'],
      wordsCorrect: { '5': 2, '9': 1 },
    },
  }],
  ['v5 (blockScores+testScores)', {
    version: 5,
    progress: { letters:{1:'done',2:'done',3:'available',4:'locked',5:'locked'},
                sounds:{1:'available',2:'locked',3:'locked',4:'locked',5:'locked'},
                words:{1:'locked',2:'locked',3:'locked',4:'locked',5:'locked'},
                phrases:{1:'locked',2:'locked',3:'locked',4:'locked',5:'locked'} },
    blockScores: { letters_1: 10, letters_2: 10 },
    testScores: { 'letters_1': 85, 'sounds_1': 72 },
    cardReviews: {}, weakLetters: {}, vowelReviews: {}, wordsStudied: [], wordsCorrect: {},
  }],
];
for (const [name, blob] of legacyFixtures) {
  const refProg = deriveProgress(migrateThroughV7(clone(blob)));
  const mig = migrate(clone(blob));
  check(`migrate v→v8: version 8 + facts — ${name}`, mig.version === 8 && !!mig.facts);
  check(`migrate v→v8: статусы == поведение до v8 — ${name}`,
    deepEq(refProg, deriveProgress(mig)));
}
// v4-словарь и SM-2 буквы реально доезжают в facts
const migV4 = migrate(clone(legacyFixtures[1][1]));
check('migrate v4→v8: SM-2 буквы и словарь в facts',
  !!migV4.facts.items['l:1']?.sm2 && migV4.facts.items['w:5']?.introduced === true);

// ── 22. Движок упражнений (этап 3): реестр генераторов, единый Question ──
// Детерминированный rnd для воспроизводимости
function seededRnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const W = [
  { id: 'w1', he: 'בַּיִת', ru: 'дом' },
  { id: 'w2', he: 'כֶּלֶב', ru: 'собака' },
  { id: 'w3', he: 'סֵפֶר', ru: 'книга' },
  { id: 'w4', he: 'מַיִם', ru: 'вода' },
  { id: 'w5', he: 'אור',  ru: 'свет' },   // без никуда — для проверки no_nikud null
];

// choice4 — авторский В4 как в уроках
const b4 = buildQuestion('choice4', { prompt: 'Что значит «מַיָּה מוֹרָה»?',
  options: ['Майя — учительница','Майя была','Майя будет','У Майи есть'], answer: 'Майя — учительница' }, [], seededRnd(1));
check('движок: choice4 — 4 опции, answerId указывает на верную подпись',
  b4.mode === 'choice' && b4.options.length === 4 &&
  b4.options.find(o => o.id === b4.answerId)?.label === 'Майя — учительница' &&
  new Set(b4.options.map(o => o.id)).size === 4);
const b4dup = buildQuestion('choice4', { prompt:'x', options:['А','А','Б','В'], answer:'Б' }, [], seededRnd(9));
check('движок: choice4 с дублями подписей — ключи уникальны, answer верен',
  new Set(b4dup.options.map(o=>o.id)).size === 4 &&
  b4dup.options.find(o=>o.id===b4dup.answerId)?.label === 'Б');

// word_ru — как LearnMode: 1 верный + 3 дистрактора из пула
const q1 = buildQuestion('word_ru', W[0], W, seededRnd(2));
check('движок: word_ru — 4 варианта, верный в опциях, itemId для facts',
  q1.options.length === 4 && q1.options.some(o => o.id === 'w1') && q1.answerId === 'w1' &&
  q1.itemId === 'w1' && q1.hebrew === 'בַּיִת');
check('движок: word_ru — дистракторы уникальны и не содержат дубль верного',
  new Set(q1.options.map(o => o.id)).size === 4);

// word_he — обратное направление
const q2 = buildQuestion('word_he', W[1], W, seededRnd(3));
check('движок: word_he — промпт с переводом, опции на иврите',
  q2.prompt.includes('собака') && q2.options.every(o => o.labelHe) && q2.answerId === 'w2');

// no_nikud — мутатор: снимает огласовки
const q3 = buildQuestion('no_nikud', W[0], W, seededRnd(4));
check('движок: no_nikud — иврит без огласовок', q3.hebrew === 'בית' && q3.answerId === 'w1');
check('движок: no_nikud — null для слова без никуда (не дублирует word_ru)',
  buildQuestion('no_nikud', W[4], W, seededRnd(5)) === null);
check('движок: stripNikud снимает только никуд', exStrip('שָׁלוֹם') === 'שלום');

// typing — эталон без огласовок
const q4 = buildQuestion('typing', W[2], [], seededRnd(6));
check('движок: typing — mode=typing, эталон без никуда', q4.mode === 'typing' && q4.answerId === 'ספר');

// phrase_build
const PH = [
  { id: 'p1', he: 'מַה שְּׁלוֹמְךָ?', ru: 'как дела?' },
  { id: 'p2', he: 'בּוֹקֶר טוֹב', ru: 'доброе утро' },
  { id: 'p3', he: 'תּוֹדָה רַבָּה', ru: 'большое спасибо' },
  { id: 'p4', he: 'לְהִתְרָאוֹת', ru: 'до встречи' },
];
const q5 = buildQuestion('phrase_build', PH[0], PH, seededRnd(7));
check('движок: phrase_build — фраза по переводу', q5.answerId === 'p1' && q5.options.length === 4);

// buildSession: слои + пропуск null
const sess = buildSession([
  { gen: 'word_ru',  sources: W.slice(0, 4), pool: W, take: 3 },
  { gen: 'no_nikud', sources: W,             pool: W, take: 5 }, // w5 отвалится (null)
], seededRnd(8));
check('движок: buildSession собирает слои и пропускает null',
  sess.length === 3 + 4 && sess.every(q => q.gen === 'word_ru' || q.gen === 'no_nikud'));

// детерминизм: одинаковый seed → одинаковая сессия
const sA = buildSession([{ gen: 'word_ru', sources: W, pool: W, take: 4 }], seededRnd(42));
const sB = buildSession([{ gen: 'word_ru', sources: W, pool: W, take: 4 }], seededRnd(42));
check('движок: детерминизм при одинаковом rnd', deepEq(sA, sB));

// реестр целостен
check('движок: реестр содержит 6 генераторов, id совпадают с ключами',
  Object.keys(GENERATORS).length === 6 && Object.entries(GENERATORS).every(([k, g]) => g.id === k));

// ── 23. Батч 1 уровня 4 (beta.V1.1.4): M3.1-3, SL1.1-2, Q1.1 + порция R1.53 ──
const B1_IDS = ['M3.1','M3.2','M3.3','SL1.1','SL1.2','Q1.1'];
check('батч1: все 6 узлов в графе', B1_IDS.every(id => CURRICULUM.some(n => n.id === id)));
check('батч1: все 6 уроков в GRAMMAR_LESSONS', B1_IDS.every(id => !!GRAMMAR_LESSONS_BY_ID[id]));
check('батч1: цепочка M3.1←C4, M3.2←M3.1, SL1.1←G1.6, Q1.1←C2',
  (() => { const by = Object.fromEntries(CURRICULUM.map(n=>[n.id,n]));
    return by['M3.1'].requires.includes('C4') && by['M3.2'].requires.includes('M3.1')
        && by['M3.3'].requires.includes('M3.2') && by['SL1.1'].requires.includes('G1.6')
        && by['SL1.2'].requires.includes('SL1.1') && by['Q1.1'].requires.includes('C2'); })());
// прогресс-цепь: юзер с C4 done видит M3.1 available, M3.2 locked
const doneThroughC4 = { scores: Object.fromEntries(
  ['L1.1','L1.2','L1.3','L1.4','L1.5','N1.1','N1.2','N1.3','N1.4','N1.5',
   'C0','M1.1','M1.2','M1.3','M1.4','C1','CH1.1','CH1.2','CH1.3',
   'G1.1','G1.2','G1.3','G1.4','G1.5','G1.6','C2','CH1.4',
   'M2.1','M2.2','M2.3','M2.4','M2.5','M2.6','C3','M2.7','M2.8','M2.9',
   'G2.1','G2.2','G2.3','G2.4','C4','CH2.1'].map(id=>[id,95])),
  blockScores:{}, readingProgress:{ studied: [...zoneCards] } };
check('батч1: после C4 → M3.1 available', getNodeStatus('M3.1', doneThroughC4) === 'available');
check('батч1: M3.2 заперт до M3.1', getNodeStatus('M3.2', doneThroughC4) === 'locked');
check('батч1: SL1.1 available (G1.6 done), SL — надстройка',
  getNodeStatus('SL1.1', doneThroughC4) === 'available');
// порция R1.53
const b53 = READING_BLOCKS.find(b => b.id === 'R1.53');
check('батч1: порция R1.53 существует, lesson=M3.1, 7 слов',
  !!b53 && b53.lesson === 'M3.1' && b53.items.length === 7);
check('батч1: слова порции читаемы всеми буквами (все группы известны)',
  (() => { const known = new Set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ');
    return b53.items.every(w => [...w.plain].every(ch => known.has(ch))); })());
check('батч1: id слов порции уникальны против всего потока',
  b53.items.every(w => READING_ITEMS.filter(i => i.id === w.id).length === 1));
check('батч1: все новые слова помечены draft (на вычитку)',
  b53.items.every(w => w.draft === true));
check('батч1: review порции ссылается на существующие id',
  b53.review.every(id => READING_ITEMS.some(i => i.id === id)));
// секвенция: practiceItems M3.1 используют только слова ≤ урока (порция+знакомые)
check('батч1: у каждого урока ≥6 practiceItems типа В4',
  B1_IDS.every(id => (GRAMMAR_LESSONS_BY_ID[id].practiceItems||[]).length >= 6 &&
    GRAMMAR_LESSONS_BY_ID[id].practiceItems.every(p => p.type === 'В4' && p.options.length === 4 && p.options.includes(p.answer))));
check('батч1: SL-уроки без порций (работают на накопленном словаре)',
  !READING_BLOCKS.some(b => b.lesson === 'SL1.1' || b.lesson === 'SL1.2'));

// ── 24. Батч 2 уровня 4: Q1.2, CH3.1-2, SL1.3, G3.1-2 + порции из колод ──
const B2_IDS = ['Q1.2','CH3.1','CH3.2','SL1.3','G3.1','G3.2'];
check('батч2: все 6 узлов в графе', B2_IDS.every(id => CURRICULUM.some(n => n.id === id)));
check('батч2: все 6 уроков в GRAMMAR_LESSONS', B2_IDS.every(id => !!GRAMMAR_LESSONS_BY_ID[id]));
check('батч2: цепочка requires верна',
  (() => { const by = Object.fromEntries(CURRICULUM.map(n=>[n.id,n]));
    return by['Q1.2'].requires.includes('Q1.1') && by['CH3.1'].requires.includes('CH2.1')
        && by['CH3.2'].requires.includes('CH3.1') && by['SL1.3'].requires.includes('SL1.2')
        && by['G3.1'].requires.includes('G2.4') && by['G3.2'].requires.includes('G3.1'); })());
// прогресс: батч1 пройден → батч2 первые доступны
const b2ready = { scores: Object.fromEntries(
  ['L1.1','L1.2','L1.3','L1.4','L1.5','N1.1','N1.2','N1.3','N1.4','N1.5',
   'C0','M1.1','M1.2','M1.3','M1.4','C1','CH1.1','CH1.2','CH1.3',
   'G1.1','G1.2','G1.3','G1.4','G1.5','G1.6','C2','CH1.4',
   'M2.1','M2.2','M2.3','M2.4','M2.5','M2.6','C3','M2.7','M2.8','M2.9',
   'G2.1','G2.2','G2.3','G2.4','C4','CH2.1',
   'M3.1','M3.2','M3.3','SL1.1','SL1.2','Q1.1'].map(id=>[id,95])),
  blockScores:{}, readingProgress:{ studied:[...zoneCards] } };
check('батч2: Q1.2/CH3.1/G3.1/SL1.3 available после батча1',
  ['Q1.2','CH3.1','G3.1','SL1.3'].every(id => getNodeStatus(id, b2ready) === 'available'));
check('батч2: G3.2 заперт до G3.1', getNodeStatus('G3.2', b2ready) === 'locked');
// порции
const b2blocks = ['R1.59','R1.60','R1.63'];
check('батч2: 3 порции существуют с верными lesson',
  (() => { const m = { 'R1.59':'Q1.2','R1.60':'CH3.1','R1.63':'G3.1' };
    return b2blocks.every(id => { const b = READING_BLOCKS.find(x=>x.id===id); return b && b.lesson===m[id]; }); })());
check('батч2: все слова порций читаемы известными буквами',
  (() => { const known = new Set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ');
    return b2blocks.every(id => READING_BLOCKS.find(b=>b.id===id).items
      .every(w => [...w.plain].every(ch => known.has(ch)))); })());
check('батч2: все новые слова draft', 
  b2blocks.every(id => READING_BLOCKS.find(b=>b.id===id).items.every(w => w.draft === true)));
check('батч2: слова из колоды — числа-десятки на месте',
  (() => { const b = READING_BLOCKS.find(x=>x.id==='R1.60');
    return ['אַרְבָּעִים','שִׁשִּׁים','מֵאָה'].every(h => b.items.some(w=>w.hebrew===h)) && b.items.length === 8; })());
check('батч2: практика — 6×В4 с валидным answer у каждого урока',
  B2_IDS.every(id => { const P = GRAMMAR_LESSONS_BY_ID[id].practiceItems;
    return P.length >= 6 && P.every(p => p.options.length === 4 && p.options.includes(p.answer)); }));
check('батч2: SL1.3 без порции', !READING_BLOCKS.some(b => b.lesson === 'SL1.3'));
check('батч2: id новых слов уникальны в потоке',
  b2blocks.flatMap(id => READING_BLOCKS.find(b=>b.id===id).items).every(w => READING_ITEMS.filter(i=>i.id===w.id).length === 1));

// ── 25. Батч 3: G3.3-6 (прошедшее полно), C5.1, SL1.4 ──
const B3_IDS = ['G3.3','G3.4','G3.5','G3.6','C5.1','SL1.4'];
check('батч3: все 6 узлов в графе', B3_IDS.every(id => CURRICULUM.some(n => n.id === id)));
check('батч3: все 6 уроков в GRAMMAR_LESSONS', B3_IDS.every(id => !!GRAMMAR_LESSONS_BY_ID[id]));
check('батч3: G3.5 — синтез с порогом 90',
  (() => { const n = CURRICULUM.find(x=>x.id==='G3.5'); const l = GRAMMAR_LESSONS_BY_ID['G3.5'];
    return n.done.threshold === 90 && l.threshold === 90 && l.isSynthesis === true; })());
check('батч3: цепочка G3.3←G3.2 … C5.1←G3.5, SL1.4←SL1.3',
  (() => { const by = Object.fromEntries(CURRICULUM.map(n=>[n.id,n]));
    return by['G3.3'].requires.includes('G3.2') && by['G3.5'].requires.includes('G3.4')
        && by['C5.1'].requires.includes('G3.5') && by['SL1.4'].requires.includes('SL1.3'); })());
// прогресс: весь батч2 done → G3.3/C5.1(после G3.5?)/SL1.4
const b3ready = { scores: Object.fromEntries(
  [...Object.keys(b2ready.scores),'M3.1','M3.2','M3.3','SL1.1','SL1.2','Q1.1',
   'Q1.2','CH3.1','CH3.2','SL1.3','G3.1','G3.2'].map(id=>[id,95])),
  blockScores:{}, readingProgress:{ studied:[...zoneCards] } };
check('батч3: G3.3 и SL1.4 available после батча2',
  getNodeStatus('G3.3', b3ready) === 'available' && getNodeStatus('SL1.4', b3ready) === 'available');
check('батч3: C5.1 заперт (нужен G3.5)', getNodeStatus('C5.1', b3ready) === 'locked');
// порции
const b3blocks = ['R1.68','R1.70'];
check('батч3: порции R1.68(G3.6)/R1.70(SL1.4) с верными lesson',
  (() => { const m={'R1.68':'G3.6','R1.70':'SL1.4'};
    return b3blocks.every(id => { const b=READING_BLOCKS.find(x=>x.id===id); return b && b.lesson===m[id]; }); })());
check('батч3: глаголы прошедшего из колоды в R1.68',
  (() => { const b=READING_BLOCKS.find(x=>x.id==='R1.68');
    return ['לָמַד','עָבַד','שָׁמַע'].every(h=>b.items.some(w=>w.hebrew===h)); })());
check('батч3: профессии/приборы в R1.70',
  (() => { const b=READING_BLOCKS.find(x=>x.id==='R1.70');
    return ['נַהָג','מַחְשֵׁב','מַפְתֵּחַ'].every(h=>b.items.some(w=>w.hebrew===h)); })());
check('батч3: новые слова draft + читаемы + уникальны',
  (() => { const known=new Set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ');
    const items=b3blocks.flatMap(id=>READING_BLOCKS.find(b=>b.id===id).items);
    return items.every(w=>w.draft===true) && items.every(w=>[...w.plain].every(ch=>known.has(ch)))
        && items.every(w=>READING_ITEMS.filter(i=>i.id===w.id).length===1); })());
check('батч3: практика — валидные В4 у всех 6 уроков (G3.5 — 8 вопросов)',
  B3_IDS.every(id => { const P=GRAMMAR_LESSONS_BY_ID[id].practiceItems;
    return P.length>=6 && P.every(p=>p.options.length===4 && p.options.includes(p.answer)); }));

// ── 26. Чистота типов словаря: type:"phrase" — только настоящие (многословные) ──
const allPhrases = READING_ITEMS.filter(i => i.type === 'phrase');
check('типы: каждая type:"phrase" — многословная (нет слов под ярлыком фразы)',
  allPhrases.every(p => (p.plain || '').trim().includes(' ')));
check('типы: счётчики бьются — 216 слов, 73 фразы',
  READING_ITEMS.filter(i => i.type !== 'phrase').length === 216 &&
  allPhrases.length === 73);
check('типы: бывшие псевдо-фразы стали словами (מי pronoun, חומוס noun, שלום noun)',
  READING_ITEMS.find(i=>i.id==='rp_19')?.type === 'pronoun' &&
  READING_ITEMS.find(i=>i.id==='rp_33')?.type === 'noun' &&
  READING_ITEMS.find(i=>i.id==='rp_01')?.type === 'noun');

console.log(fails === 0 ? '\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `\n💥 ПРОВАЛОВ: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
