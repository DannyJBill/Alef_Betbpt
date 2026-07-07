/**
 * curriculum.js — единый граф курса (schema v7).
 *
 * ЕДИНСТВЕННЫЙ источник правды о разблокировке и завершении любых юнитов:
 * буквы, огласовки, чтение, слова, фразы, грамматические уроки.
 * Кодовое представление LESSON_REGISTRY_v3.md.
 *
 * Принцип: в stats хранятся только ФАКТЫ —
 *   stats.scores       { 'L1.2': 85, 'N1.1': 90, 'C0': 85 }  — процент теста
 *   stats.blockScores  { 'letters_1': 12 }                    — счётчики игры (words/phrases + game-путь)
 *   stats.readingProgress.studied [id, ...]                   — изученные карточки чтения
 * Статусы (locked/available/done) ВСЕГДА вычисляются из фактов — deriveProgress().
 * Никаких recalc*-цепочек и рукописных unlock-функций на урок.
 *
 * Узел графа:
 *   id        — 'L1.2' | 'N1.3' | 'R0.2' | 'W1' | 'P1' | 'C0' | 'M1.2' …
 *   kind      — letters|sounds|reading|words|phrases|grammar
 *   block     — номер блока 1-5 для матрицы progress (letters/sounds/words/phrases/reading)
 *   module    — для grammar: syntax|morphology|verb|numbers (ключ в progress)
 *   requires  — ['L1.1'] или [{ id:'L1.2', min:90 }] — min переопределяет порог узла-зависимости
 *   done      — { type:'score'|'studied', threshold }
 *               score:   scores[id] >= threshold; для letters/sounds дополнительно
 *                        засчитывается игровой путь blockScores[counterKey] >= MIN_CORRECT_TO_UNLOCK
 *               studied: доля изученных карточек блока чтения >= threshold (0..1)
 *
 * Добавление урока из мастерской = одна строка здесь + контент в grammarLessons.js.
 */
import { ALPHABET, LETTER_GROUPS } from './alphabet';
import { MIN_CORRECT_TO_UNLOCK } from './constants';
import { READING_BLOCKS } from './reading';
import { getKnownLetters, isReadableByLetters } from '../helpers/vocab';

// ─── Граф ─────────────────────────────────────────────────────────────────────

export const CURRICULUM = [
  // ═══ ЗОНА 0: буквы + огласовки + ОБЯЗАТЕЛЬНЫЕ порции слов ═══════════════════
  // Механика: после урока — порция слов (узел VL/VN), следующий урок зоны требует
  // её изучения. Треки букв и огласовок сплетены через порции (канонический путь):
  // L1.1→VL1.1→L1.2→VL1.2→N1.1→N1.2→L1.3→VL1.3→N1.3→VN1.3→L1.4→VL1.4→N1.4→VN1.4→L1.5→N1.5→VN1.5
  // ⚠️ Изменение против v7.0: буквы гр.3+ теперь требуют прогресса в огласовках
  // (через порции) — треки больше не независимы. Слова тянут за собой звуки.
  // VN1.1/VN1.2/VL1.5 пусты (превью съедает раннее, финальные формы — по базовой) — узлов нет.

  // ── Буквы ──
  { id: 'L1.1', kind: 'letters', block: 1, requires: [],                 done: { type: 'score', threshold: 70 }, counterKey: 'letters_1' },
  { id: 'L1.2', kind: 'letters', block: 2, requires: ['L1.1', 'VL1.1'],  done: { type: 'score', threshold: 70 }, counterKey: 'letters_2' },
  { id: 'L1.3', kind: 'letters', block: 3, requires: ['L1.2', 'N1.2'],   done: { type: 'score', threshold: 70 }, counterKey: 'letters_3' },
  { id: 'L1.4', kind: 'letters', block: 4, requires: ['L1.3', 'VN1.3'],  done: { type: 'score', threshold: 70 }, counterKey: 'letters_4' },
  { id: 'L1.5', kind: 'letters', block: 5, requires: ['L1.4', 'VN1.4'],  done: { type: 'score', threshold: 70 }, counterKey: 'letters_5' },

  // ── Огласовки ──
  { id: 'N1.1', kind: 'sounds', block: 1, requires: ['L1.2', 'VL1.2'],   done: { type: 'score', threshold: 70 }, counterKey: 'sounds_1' },
  { id: 'N1.2', kind: 'sounds', block: 2, requires: ['N1.1'],            done: { type: 'score', threshold: 70 }, counterKey: 'sounds_2' },
  { id: 'N1.3', kind: 'sounds', block: 3, requires: ['N1.2', 'VL1.3'],   done: { type: 'score', threshold: 70 }, counterKey: 'sounds_3' },
  { id: 'N1.4', kind: 'sounds', block: 4, requires: ['N1.3', 'VL1.4'],   done: { type: 'score', threshold: 70 }, counterKey: 'sounds_4' },
  { id: 'N1.5', kind: 'sounds', block: 5, requires: ['N1.4'],            done: { type: 'score', threshold: 70 }, counterKey: 'sounds_5' },

  // ── Порции слов зоны 0 (обязательные) — done = изучено 100% доступных ──
  { id: 'VL1.1', kind: 'reading', requires: ['L1.1'],          done: { type: 'studied', threshold: 1 } },
  { id: 'VL1.2', kind: 'reading', requires: ['L1.2'],          done: { type: 'studied', threshold: 1 } },
  { id: 'VL1.3', kind: 'reading', requires: ['L1.3', 'N1.2'],  done: { type: 'studied', threshold: 1 } },
  { id: 'VN1.3', kind: 'reading', requires: ['N1.3'],          done: { type: 'studied', threshold: 1 } },
  { id: 'VL1.4', kind: 'reading', requires: ['L1.4'],          done: { type: 'studied', threshold: 1 } },
  { id: 'VN1.4', kind: 'reading', requires: ['N1.4'],          done: { type: 'studied', threshold: 1 } },
  { id: 'VN1.5', kind: 'reading', requires: ['N1.5', 'L1.4'],  done: { type: 'studied', threshold: 1 } },

  // ── Фонетика (дагеш, шва) — надстройка над зоной 0 ──
  // D1.1 — концепция (без теста); D1.3 требует M1.1 (артикль) → ставится в ленте после него.
  { id: 'D1.1',  kind: 'grammar', module: 'phonetics', requires: ['N1.5'],  done: { type: 'score', threshold: 70 } },
  { id: 'D1.2',  kind: 'grammar', module: 'phonetics', requires: ['D1.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'SH1.1', kind: 'grammar', module: 'phonetics', requires: ['D1.2'],  done: { type: 'score', threshold: 70 } },
  { id: 'SH1.2', kind: 'grammar', module: 'phonetics', requires: ['SH1.1'], done: { type: 'score', threshold: 70 } },
  { id: 'D1.3',  kind: 'grammar', module: 'phonetics', requires: ['M1.1'],  done: { type: 'score', threshold: 70 } },

  // ── Разговор (W1-5) — done через игровые счётчики (как раньше) ──
  // 🟡 R1-конфликт (ранний словарь vs финал уровня 6) НЕ решён — условия
  // сохранены как в действующем checkWordsUnlock. Менять здесь, когда решится.
  { id: 'W1', kind: 'words', block: 1, requires: [{ id: 'L1.2', min: 90 }, { id: 'N1.2', min: 90 }],       done: { type: 'counter' }, counterKey: 'words_1' },
  { id: 'W2', kind: 'words', block: 2, requires: ['W1', { id: 'L1.3', min: 90 }, { id: 'N1.2', min: 90 }], done: { type: 'counter' }, counterKey: 'words_2' },
  { id: 'W3', kind: 'words', block: 3, requires: ['W2', { id: 'L1.4', min: 90 }, { id: 'N1.3', min: 90 }], done: { type: 'counter' }, counterKey: 'words_3' },
  { id: 'W4', kind: 'words', block: 4, requires: ['W3', { id: 'L1.5', min: 90 }, { id: 'N1.4', min: 90 }], done: { type: 'counter' }, counterKey: 'words_4' },
  { id: 'W5', kind: 'words', block: 5, requires: ['W4', { id: 'L1.5', min: 90 }, { id: 'N1.5', min: 90 }], done: { type: 'counter' }, counterKey: 'words_5' },

  // ── Фразы (P1-5) ──
  { id: 'P1', kind: 'phrases', block: 1, requires: ['W1'], done: { type: 'counter' }, counterKey: 'phrases_1' },
  { id: 'P2', kind: 'phrases', block: 2, requires: ['P1'], done: { type: 'counter' }, counterKey: 'phrases_2' },
  { id: 'P3', kind: 'phrases', block: 3, requires: ['P2'], done: { type: 'counter' }, counterKey: 'phrases_3' },
  { id: 'P4', kind: 'phrases', block: 4, requires: ['P3'], done: { type: 'counter' }, counterKey: 'phrases_4' },
  { id: 'P5', kind: 'phrases', block: 5, requires: ['P4'], done: { type: 'counter' }, counterKey: 'phrases_5' },

  // ── Грамматика — уровень 1 (перенесено из мастерской 01-02.07.2026) ──
  { id: 'C0',   kind: 'grammar', module: 'syntax',     requires: ['VL1.3'],  done: { type: 'score', threshold: 70 } },
  { id: 'M1.1', kind: 'grammar', module: 'morphology', requires: ['C0'],   done: { type: 'score', threshold: 70 } },
  { id: 'C1',   kind: 'grammar', module: 'syntax',     requires: ['M1.4'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.2', kind: 'grammar', module: 'morphology', requires: ['M1.1'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.3', kind: 'grammar', module: 'morphology', requires: ['M1.2'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.4', kind: 'grammar', module: 'morphology', requires: ['M1.3'],   done: { type: 'score', threshold: 90 } },

  // ── Числа — Ч1 (открывается после M1.3) ──
  { id: 'CH1.1', kind: 'grammar', module: 'numbers', requires: ['M1.3', 'L1.4'],  done: { type: 'score', threshold: 70 } },
  { id: 'CH1.2', kind: 'grammar', module: 'numbers', requires: ['CH1.1'], done: { type: 'score', threshold: 70 } },
  { id: 'CH1.3', kind: 'grammar', module: 'numbers', requires: ['CH1.2'], done: { type: 'score', threshold: 70 } },

  // ── Глагол — Г1, паАль настоящее (открывается после M1 done = M1.4) ──
  { id: 'G1.1', kind: 'grammar', module: 'verb', requires: ['M1.4', 'N1.5'], done: { type: 'score', threshold: 70 } },
  { id: 'G1.2', kind: 'grammar', module: 'verb', requires: ['G1.1'], done: { type: 'score', threshold: 70 } },
  { id: 'G1.3', kind: 'grammar', module: 'verb', requires: ['G1.2'], done: { type: 'score', threshold: 70 } },
  { id: 'G1.4', kind: 'grammar', module: 'verb', requires: ['G1.3'], done: { type: 'score', threshold: 70 } },
  { id: 'G1.5', kind: 'grammar', module: 'verb', requires: ['C2'],   done: { type: 'score', threshold: 70 } },
  { id: 'G1.6', kind: 'grammar', module: 'verb', requires: ['G1.5'], done: { type: 'score', threshold: 90 } },

  // ── Уровень 2: сквозной C2 и числа CH1.4 ──
  { id: 'C2',    kind: 'grammar', module: 'syntax',  requires: ['G1.4'],  done: { type: 'score', threshold: 70 } },
  { id: 'CH1.4', kind: 'grammar', module: 'numbers', requires: ['CH1.3'], done: { type: 'score', threshold: 70 } },

  // ── Уровень 3: М2 (мн.ч.+предлоги), С3, Г2, С4, Ч2 ──
  // ⚠️ Реестр: «М2 ← порции уровня 1 изучены + G1 done». Гейт по порциям R1.2x
  //    не реализован (они не узлы графа) — пока только G1.6. Решить с Daniel.
  { id: 'M2.1', kind: 'grammar', module: 'morphology', requires: ['G1.6'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.2', kind: 'grammar', module: 'morphology', requires: ['M2.1'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.3', kind: 'grammar', module: 'morphology', requires: ['M2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.4', kind: 'grammar', module: 'morphology', requires: ['M2.3'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.5', kind: 'grammar', module: 'morphology', requires: ['M2.4'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.6', kind: 'grammar', module: 'morphology', requires: ['M2.5'], done: { type: 'score', threshold: 70 } },
  { id: 'C3',   kind: 'grammar', module: 'syntax',     requires: ['M2.6'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.7', kind: 'grammar', module: 'morphology', requires: ['C3'],   done: { type: 'score', threshold: 70 } },
  { id: 'M2.8', kind: 'grammar', module: 'morphology', requires: ['M2.7'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.9', kind: 'grammar', module: 'morphology', requires: ['M2.8'], done: { type: 'score', threshold: 90 } },
  { id: 'G2.1', kind: 'grammar', module: 'verb', requires: ['M2.9'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.2', kind: 'grammar', module: 'verb', requires: ['G2.1'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.3', kind: 'grammar', module: 'verb', requires: ['G2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.4', kind: 'grammar', module: 'verb', requires: ['G2.3'], done: { type: 'score', threshold: 90 } },
  { id: 'C4',   kind: 'grammar', module: 'syntax',   requires: ['M2.9', 'G2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'CH2.1', kind: 'grammar', module: 'numbers', requires: ['CH1.4'], done: { type: 'score', threshold: 70 } },
];

export const CURRICULUM_BY_ID = Object.fromEntries(CURRICULUM.map(n => [n.id, n]));

// section+blockN (старый API экранов) → id узла
const SECTION_PREFIX = { letters: 'L1.', sounds: 'N1.', words: 'W', phrases: 'P' };
export function sectionBlockToId(section, blockN) {
  const pref = SECTION_PREFIX[section];
  return pref ? `${pref}${blockN}` : null;
}

// ─── Факты ────────────────────────────────────────────────────────────────────

export function getScore(stats, id) {
  return stats?.scores?.[id] ?? null;
}

// ─── Деривация статусов ───────────────────────────────────────────────────────

/** Узел завершён? (только факты, без рекурсии) */
export function isNodeDone(id, stats) {
  const node = CURRICULUM_BY_ID[id];
  if (!node) return false; // урок ещё не перенесён (например M1.1) → не done

  if (node.done.type === 'score') {
    const score = getScore(stats, id);
    if (score != null && score >= node.done.threshold) return true;
    // Игровой путь: MIN_CORRECT правильных ответов в GameScreen (letters/sounds)
    if (node.counterKey && (stats?.blockScores?.[node.counterKey] || 0) >= MIN_CORRECT_TO_UNLOCK) return true;
    return false;
  }

  if (node.done.type === 'counter') {
    return (stats?.blockScores?.[node.counterKey] || 0) >= MIN_CORRECT_TO_UNLOCK;
  }

  if (node.done.type === 'studied') {
    return getReadingBlockStudiedPct(id, stats) >= node.done.threshold;
  }

  return false;
}

/** Требование выполнено? Строка — done узла; {id,min} — процент теста ≥ min. */
function isRequirementMet(req, stats) {
  if (typeof req === 'string') return isNodeDone(req, stats);
  return (getScore(stats, req.id) ?? 0) >= req.min;
}

export function isNodeUnlocked(id, stats) {
  const node = CURRICULUM_BY_ID[id];
  if (!node) return false;
  return node.requires.every(r => isRequirementMet(r, stats));
}

/** Статус узла: 'locked' | 'available' | 'done' */
export function getNodeStatus(id, stats) {
  if (isNodeDone(id, stats)) return 'done';
  return isNodeUnlocked(id, stats) ? 'available' : 'locked';
}

/**
 * Полная матрица прогресса для UI — форма идентична прежнему stats.progress:
 * { letters:{1..5}, sounds:{1..5}, words:{1..5}, phrases:{1..5},
 *   syntax:{C0,...}, morphology:{...}, ... }
 * Вычисляется из фактов; хранится в stats.progress только как кэш для экранов.
 */
export function deriveProgress(stats) {
  const progress = {};
  for (const node of CURRICULUM) {
    const status = getNodeStatus(node.id, stats);
    if (node.kind === 'grammar') {
      if (!progress[node.module]) progress[node.module] = {};
      progress[node.module][node.id] = status;
    } else if (node.kind !== 'reading') {
      if (!progress[node.kind]) progress[node.kind] = {};
      progress[node.kind][node.block] = status;
    }
    // reading в матрице не хранится — экраны спрашивают статус напрямую
  }
  return progress;
}

// ─── Чтение: доля изученного в блоке ─────────────────────────────────────────

/**
 * Доля изученных карточек блока чтения (0..1) среди ДОСТУПНЫХ по буквам.
 * items блока — только новый материал; review-ссылки в расчёт не входят.
 */
export function getReadingBlockStudiedPct(blockId, stats) {
  const block = READING_BLOCKS.find(b => b.id === blockId);
  if (!block) return 0;
  // Известные буквы — ТОЛЬКО по done-фактам (isNodeDone букв = чистые scores).
  // Нельзя брать полный статус (available требует unlock → порции → снова сюда):
  // с v7.1 буквы и порции взаимозависимы, done-факты разрывают цикл.
  // Для гейта это и семантически верно: порция «пройдена», когда изучено всё,
  // что читаемо УЖЕ выученными буквами.
  const lettersStatuses = {};
  for (let n = 1; n <= 5; n++) lettersStatuses[n] = isNodeDone(`L1.${n}`, stats) ? 'done' : 'locked';
  const known = getKnownLetters(lettersStatuses, ALPHABET, LETTER_GROUPS);
  const available = block.items.filter(i => isReadableByLetters(i.hebrew, known));
  // Страховка от дедлока: РАЗБЛОКИРОВАННАЯ порция без доступных карточек
  // не должна вечно гейтить следующий урок. Для закрытой порции (буквы ещё
  // не выучены → 0 доступных) это НЕ done — иначе новичку откроется C0.
  // V-узлы требуют только L/N (done по фактам) — рекурсии здесь нет.
  if (available.length === 0) return isNodeUnlocked(blockId, stats) ? 1 : 0;
  const studied = stats?.readingProgress?.studied || [];
  const cnt = available.filter(i => studied.includes(i.id)).length;
  return cnt / available.length;
}

/** Порция открыта? V-узлы — по requires графа; порции уроков — «урок done». */
export function isReadingBlockUnlocked(block, stats) {
  if (block.lesson) return isNodeDone(block.lesson, stats);
  return isNodeUnlocked(block.id, stats);
}

/** Невыполненные требования узла — для подсказок «почему закрыто» в UI */
export function getUnmetRequirements(id, stats) {
  const node = CURRICULUM_BY_ID[id];
  if (!node) return [];
  return node.requires.filter(r =>
    typeof r === 'string' ? !isNodeDone(r, stats) : (getScore(stats, r.id) ?? 0) < r.min
  );
}

/** Человеческая подсказка для замка: приоритет — непройденная порция слов */
export function getLockHint(id, stats) {
  const unmet = getUnmetRequirements(id, stats);
  const portion = unmet.find(r => typeof r === 'string' && r.startsWith('V'));
  if (portion) {
    const block = READING_BLOCKS.find(b => b.id === portion);
    return `📖 Сначала изучи слова: «${block?.title || portion}»`;
  }
  return null; // остальные причины UI показывает как раньше
}

// ─── Канонический путь курса (для экрана «Путь») ─────────────────────────────
// Порядок глав и узлов, как их видит ученик. Плейсхолдеры (inDev) — уроки из
// LESSON_REGISTRY, ещё не перенесённые: видны серыми, дают ощущение дороги вперёд.
export const COURSE_PATH = [
  {
    chapter: 'Алфавит и звуки',
    items: [
      { id: 'L1.1' }, { id: 'VL1.1' }, { id: 'L1.2' }, { id: 'VL1.2' },
      { id: 'N1.1' }, { id: 'N1.2' },
      { id: 'L1.3' }, { id: 'VL1.3' }, { id: 'N1.3' }, { id: 'VN1.3' },
      { id: 'L1.4' }, { id: 'VL1.4' }, { id: 'N1.4' }, { id: 'VN1.4' },
      { id: 'L1.5' }, { id: 'N1.5' }, { id: 'VN1.5' },
      { id: 'D1.1' }, { id: 'D1.2' }, { id: 'SH1.1' }, { id: 'SH1.2' },
    ],
  },
  {
    chapter: 'Уровень 1 · Именное предложение и артикль',
    items: [
      { id: 'C0' },   { id: 'R1.20' },
      { id: 'M1.1' }, { id: 'R1.21' }, { id: 'D1.3' },
      { id: 'M1.2' }, { id: 'R1.23' },
      { id: 'M1.3' }, { id: 'R1.24' },
      { id: 'M1.4' }, { id: 'R1.25' },
      { id: 'C1' },   { id: 'R1.22' },
      { id: 'CH1.1' }, { id: 'R1.26' },
      { id: 'CH1.2' }, { id: 'R1.27' },
      { id: 'CH1.3' }, { id: 'R1.28' },
      { id: 'CH1.4' }, { id: 'R1.36' },
    ],
  },
  {
    chapter: 'Уровень 2',
    items: [
      { id: 'G1.1' },
      { id: 'G1.2' }, { id: 'R1.30' },
      { id: 'G1.3' }, { id: 'R1.31' },
      { id: 'G1.4' }, { id: 'R1.32' },
      { id: 'C2' },   { id: 'R1.35' },
      { id: 'G1.5' }, { id: 'R1.33' },
      { id: 'G1.6' }, { id: 'R1.34' },
    ],
  },
  {
    chapter: 'Уровень 3',
    items: [
      { id: 'M2.1' }, { id: 'R1.37' },
      { id: 'M2.2' }, { id: 'R1.38' },
      { id: 'M2.3' }, { id: 'R1.39' },
      { id: 'M2.4' }, { id: 'R1.40' },
      { id: 'M2.5' }, { id: 'R1.41' },
      { id: 'M2.6' }, { id: 'R1.42' },
      { id: 'C3' },   { id: 'R1.43' },
      { id: 'M2.7' }, { id: 'R1.44' },
      { id: 'M2.8' }, { id: 'R1.45' },
      { id: 'M2.9' }, { id: 'R1.46' },
      { id: 'G2.1' }, { id: 'R1.47' },
      { id: 'G2.2' }, { id: 'R1.48' },
      { id: 'G2.3' }, { id: 'R1.49' },
      { id: 'G2.4' }, { id: 'R1.50' },
      { id: 'C4' },   { id: 'R1.51' },
      { id: 'CH2.1' }, { id: 'R1.52' },
    ],
  },
];

/** Первый доступный (available) узел канонического пути — цель кнопки «Продолжить» */
export function getContinueNode(stats) {
  for (const ch of COURSE_PATH) {
    for (const it of ch.items) {
      if (it.inDev) continue;
      const node = CURRICULUM_BY_ID[it.id];
      if (node) {
        if (getNodeStatus(it.id, stats) === 'available') return it.id;
      } else {
        // порция урока (R1.x) — не узел графа: открыта уроком, done = 100% изучено
        const block = READING_BLOCKS.find(b => b.id === it.id);
        if (block && isReadingBlockUnlocked(block, stats)
            && getReadingBlockStudiedPct(it.id, stats) < 1) return it.id;
      }
    }
  }
  return null;
}
