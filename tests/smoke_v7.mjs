// tests/smoke_v7.mjs — сквозная проверка графа курса и данных чтения.
// Запуск (Windows/PowerShell, две команды отдельно):
//   npx esbuild tests/smoke_v7.mjs --bundle --format=esm --outfile=tests/.smoke.bundle.mjs
//   node tests/.smoke.bundle.mjs
// Гонять после ЛЮБОГО изменения curriculum.js / reading.js / vocab.js / миграций.
import { deriveProgress, getNodeStatus, isNodeDone, getReadingBlockStudiedPct, isReadingBlockUnlocked, getLockHint } from '../src/data/curriculum.js';
import { checkReadingUnlock, checkWordsUnlock, getFreshPortions } from '../src/helpers/progressHelpers.js';
import { GRAMMAR_LESSONS } from '../src/data/grammarLessons.js';
import { READING_BLOCKS, READING_ITEMS, getBlockCards } from '../src/data/reading.js';
import { getKnownLetters, isReadableByLetters } from '../src/helpers/vocab.js';
import { ALPHABET, LETTER_GROUPS } from '../src/data/alphabet.js';

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
check('M1.1=90: done → C1 available', isNodeDone('M1.1', g2) && getNodeStatus('C1', g2) === 'available');
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
check('CH1.1 available после M1.3', getNodeStatus('CH1.1', g2) === 'available');
const gCh = { ...g2, scores: { ...g2.scores, 'CH1.1': 80, 'CH1.2': 75 } };
check('цепочка CH1.1→CH1.2→CH1.3', isNodeDone('CH1.2', gCh) && getNodeStatus('CH1.3', gCh) === 'available');
const r128 = READING_BLOCKS.find(b => b.id === 'R1.28');
check('R1.28: 5 items, открыт после CH1.3', !!r128 && r128.items.length === 5 && isReadingBlockUnlocked(r128, { ...gCh, scores: { ...gCh.scores, 'CH1.3': 90 } }) && !isReadingBlockUnlocked(r128, gCh));
check('все уроки уровня 1 имеют practiceItems', GRAMMAR_LESSONS.filter(l => l.level === 1).every(l => l.practiceItems.length >= 5));

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

console.log(fails === 0 ? '\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `\n💥 ПРОВАЛОВ: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
