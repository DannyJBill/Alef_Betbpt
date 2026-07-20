// tests/smoke_v7.mjs — сквозная проверка графа курса и данных чтения.
// Запуск (Windows/PowerShell, две команды отдельно):
//   npx esbuild tests/smoke_v7.mjs --bundle --format=esm --outfile=tests/.smoke.bundle.mjs
//   node tests/.smoke.bundle.mjs
// Гонять после ЛЮБОГО изменения curriculum.js / reading.js / vocab.js / миграций.
import { deriveProgress, getNodeStatus, isNodeDone, getReadingBlockStudiedPct, isReadingBlockUnlocked, getLockHint } from '../src/data/curriculum.js';
import { checkReadingUnlock, checkWordsUnlock, getFreshPortions } from '../src/helpers/progressHelpers.js';
import { GRAMMAR_LESSONS } from '../src/data/grammarLessons.js';
import { READING_BLOCKS, READING_ITEMS, getBlockCards, PHRASE_LOCKS, getUnlockedPhraseLocks } from '../src/data/reading.js';
import { getKnownLetters, isReadableByLetters } from '../src/helpers/vocab.js';
import { ALPHABET, LETTER_GROUPS } from '../src/data/alphabet.js';
import { sm2, isDue, dueKeys } from '../src/helpers/planner.js';
import { foldToFacts, factsToLegacyView, itemKey, COUNTER_KEY_TO_NODE, NODE_TO_COUNTER_KEY,
         setNodeScore, bumpNodeCounter, reviewLetter, reviewVowel, seenWord, answerWord, reviewWord, mergeFacts } from '../src/helpers/facts.js';

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
check('новый: words[1] locked', p.words[1] === 'locked');
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
check('L1.2=89%: W1 locked (нужно ≥90)', !checkWordsUnlock(1, w89));
const w90 = { ...fresh, scores: { 'L1.1': 95, 'L1.2': 90, 'N1.1': 95, 'N1.2': 90 } };
check('L1.2=90% & N1.2=90%: W1 unlocked', checkWordsUnlock(1, w90));

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

// counterKey ⇄ node: карта покрывает ровно узлы со счётчиком
const counterNodes = ['L1.1','L1.2','L1.3','L1.4','L1.5','N1.1','N1.2','N1.3','N1.4','N1.5','W1','W2','W3','W4','W5','P1','P2','P3','P4','P5'];
check('facts: counterKey↔node карта покрывает все узлы со счётчиком',
  counterNodes.every(id => NODE_TO_COUNTER_KEY[id] && COUNTER_KEY_TO_NODE[NODE_TO_COUNTER_KEY[id]] === id));

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

console.log(fails === 0 ? '\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `\n💥 ПРОВАЛОВ: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
