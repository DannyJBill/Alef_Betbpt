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
 *   id        — 'L1.2' | 'N1.3' | 'R0.2' | 'W1' | 'P1' | 'C0' | 'M1.2' | 'EX1.1' …
 *   kind      — letters|sounds|reading|words|phrases|grammar|exam
 *   block     — номер блока 1-5 для матрицы progress (letters/sounds/words/phrases/reading)
 *   module    — для grammar: syntax|morphology|verb|numbers|phonetics|wordsystem (ключ в progress)
 *   requires  — ['L1.1'] или [{ id:'L1.2', min:90 }] — min переопределяет порог узла-зависимости
 *   done      — { type:'score'|'studied'|'exam', threshold }
 *               score:   scores[id] >= threshold; для letters/sounds дополнительно
 *                        засчитывается игровой путь blockScores[counterKey] >= MIN_CORRECT_TO_UNLOCK
 *               studied: доля изученных карточек блока чтения >= threshold (0..1)
 *               exam:    scores[id] >= threshold. ⚠️ НЕ автозачитывается по факту
 *                        «sourceLessons все done» — requires и это условие совпадают
 *                        почти всегда, живая проверка означала бы самозачёт в
 *                        момент открытия для любого игрока (реальный баг первой
 *                        версии, см. CHANGELOG.md v1.2 часть 1). Разовый автозачёт
 *                        для тех, кто прошёл материал ДО появления экзамена в графе —
 *                        миграция StatsContext.migrate() (флаг examsGrandfathered).
 *   kind:'exam' — доп. поля:
 *     examTitle     — заголовок экзамена в UI ("Экзамен: {examTitle}")
 *     sourceLessons — [id,...] уроков подгруппы; их practiceItems (grammar) или
 *                     сами буквы/огласовки (L1.x/N1.x, через адаптер в ExamScreen)
 *                     формируют пул вопросов сессии (buildSession/exercises.js)
 *
 * COURSE_PATH (канонический путь для экрана «Путь», ниже) — доп. опциональные
 * поля главы: icon, description (визуал модуля, src/data/pathTheme.js) и
 * subgroups: [{ title, endId }] — нарезка модуля на подгруппы для UI; endId —
 * id последнего урока подгруппы, узел-экзамен вставляется в items главы сразу
 * после него (и после порций чтения, которые он открывает) как отдельный
 * элемент {id:'EXx.x'} — subgroups сам по себе items не меняет и не генерирует.
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

  // ── W1-5/P1-5 УДАЛЕНЫ (этап 4, beta.V1.1.4) ──────────────────────────────
  // Ранний «Разговор» конфликтовал с реестром (R1 = seq 102, уровень 6).
  // Счётчики words_*/phrases_* существующих пользователей НЕ теряются:
  // foldToFacts кладёт неизвестные counterKey под '#words_1' в facts.nodes.
  // Имена W*/P* свободны; серия книги Коэн-Цедека переименована в SL заранее.

  // ── Грамматика — уровень 1 (перенесено из мастерской 01-02.07.2026) ──
  { id: 'C0',   kind: 'grammar', module: 'syntax',     requires: ['VL1.3'],  done: { type: 'score', threshold: 70 } },
  { id: 'M1.1', kind: 'grammar', module: 'morphology', requires: ['C0'],   done: { type: 'score', threshold: 70 } },
  { id: 'C1',   kind: 'grammar', module: 'syntax',     requires: ['EX1.1'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.2', kind: 'grammar', module: 'morphology', requires: ['M1.1'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.3', kind: 'grammar', module: 'morphology', requires: ['M1.2'],   done: { type: 'score', threshold: 70 } },
  { id: 'M1.4', kind: 'grammar', module: 'morphology', requires: ['M1.3'],   done: { type: 'score', threshold: 90 } },

  // ── Числа — Ч1 (открывается после M1.3) ──
  { id: 'CH1.1', kind: 'grammar', module: 'numbers', requires: ['M1.3', 'L1.4'],  done: { type: 'score', threshold: 70 } },
  { id: 'CH1.2', kind: 'grammar', module: 'numbers', requires: ['CH1.1'], done: { type: 'score', threshold: 70 } },
  { id: 'CH1.3', kind: 'grammar', module: 'numbers', requires: ['CH1.2'], done: { type: 'score', threshold: 70 } },

  // ── Глагол — Г1, паАль настоящее (открывается после M1 done = M1.4) ──
  { id: 'G1.1', kind: 'grammar', module: 'verb', requires: ['EX1.1', 'EX0.1'], done: { type: 'score', threshold: 70 } },
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
  { id: 'M2.1', kind: 'grammar', module: 'morphology', requires: ['EX2.1'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.2', kind: 'grammar', module: 'morphology', requires: ['M2.1'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.3', kind: 'grammar', module: 'morphology', requires: ['M2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.4', kind: 'grammar', module: 'morphology', requires: ['M2.3'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.5', kind: 'grammar', module: 'morphology', requires: ['M2.4'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.6', kind: 'grammar', module: 'morphology', requires: ['M2.5'], done: { type: 'score', threshold: 70 } },
  { id: 'C3',   kind: 'grammar', module: 'syntax',     requires: ['M2.6'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.7', kind: 'grammar', module: 'morphology', requires: ['C3'],   done: { type: 'score', threshold: 70 } },
  { id: 'M2.8', kind: 'grammar', module: 'morphology', requires: ['M2.7'], done: { type: 'score', threshold: 70 } },
  { id: 'M2.9', kind: 'grammar', module: 'morphology', requires: ['M2.8'], done: { type: 'score', threshold: 90 } },
  { id: 'G2.1', kind: 'grammar', module: 'verb', requires: ['EX3.1'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.2', kind: 'grammar', module: 'verb', requires: ['G2.1'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.3', kind: 'grammar', module: 'verb', requires: ['G2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'G2.4', kind: 'grammar', module: 'verb', requires: ['G2.3'], done: { type: 'score', threshold: 90 } },
  { id: 'C4',   kind: 'grammar', module: 'syntax',   requires: ['EX3.1', 'G2.2'], done: { type: 'score', threshold: 70 } },
  { id: 'CH2.1', kind: 'grammar', module: 'numbers', requires: ['EX1.2'], done: { type: 'score', threshold: 70 } },

  // ── Уровень 4 · батч 1 (beta.V1.1.4): שֶׁל + SL-трек + вопросы ──
  { id: 'M3.1',  kind: 'grammar', module: 'morphology', requires: ['C4'],    done: { type: 'score', threshold: 70 } },
  { id: 'M3.2',  kind: 'grammar', module: 'morphology', requires: ['M3.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'M3.3',  kind: 'grammar', module: 'morphology', requires: ['M3.2'],  done: { type: 'score', threshold: 70 } },
  { id: 'SL1.1', kind: 'grammar', module: 'wordsystem', requires: ['EX2.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'SL1.2', kind: 'grammar', module: 'wordsystem', requires: ['SL1.1'], done: { type: 'score', threshold: 70 } },
  { id: 'Q1.1',  kind: 'grammar', module: 'syntax',     requires: ['C2'],    done: { type: 'score', threshold: 70 } },
  { id: 'Q1.2',  kind: 'grammar', module: 'syntax',     requires: ['Q1.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'CH3.1', kind: 'grammar', module: 'numbers',    requires: ['EX3.3'], done: { type: 'score', threshold: 70 } },
  { id: 'CH3.2', kind: 'grammar', module: 'numbers',    requires: ['CH3.1'], done: { type: 'score', threshold: 70 } },
  { id: 'SL1.3', kind: 'grammar', module: 'wordsystem', requires: ['SL1.2'], done: { type: 'score', threshold: 70 } },
  { id: 'G3.1',  kind: 'grammar', module: 'verb',       requires: ['EX4.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'G3.2',  kind: 'grammar', module: 'verb',       requires: ['G3.1'],  done: { type: 'score', threshold: 70 } },
  { id: 'G3.3',  kind: 'grammar', module: 'verb',       requires: ['G3.2'],  done: { type: 'score', threshold: 70 } },
  { id: 'G3.4',  kind: 'grammar', module: 'verb',       requires: ['G3.3'],  done: { type: 'score', threshold: 70 } },
  { id: 'G3.5',  kind: 'grammar', module: 'verb',       requires: ['G3.4'],  done: { type: 'score', threshold: 90 } },
  { id: 'G3.6',  kind: 'grammar', module: 'verb',       requires: ['EX4.2'],  done: { type: 'score', threshold: 70 } },
  { id: 'C5.1',  kind: 'grammar', module: 'syntax',     requires: ['EX4.2'],  done: { type: 'score', threshold: 70 } },
  { id: 'SL1.4', kind: 'grammar', module: 'wordsystem', requires: ['EX4.1'], done: { type: 'score', threshold: 70 } },

  // ═══ ЭКЗАМЕН АЛФАВИТА ═════════════════════════════════════════════════════════
  // Большой экзамен в конце «Алфавит и звуки»: все буквы + огласовки + фонетика.
  // Вопросы по буквам/огласовкам — не choice4 (не грамматические уроки), а
  // адаптер letters/nikud → {he,ru} через word_ru/word_he (см. ExamScreen).
  { id: 'EX0.1', kind: 'exam', examTitle: 'Буквы, огласовки и фонетика',
    sourceLessons: ['L1.1', 'L1.2', 'L1.3', 'L1.4', 'L1.5', 'N1.1', 'N1.2', 'N1.3', 'N1.4', 'N1.5', 'D1.1', 'D1.2', 'SH1.1', 'SH1.2'],
    requires: ['L1.1', 'L1.2', 'L1.3', 'L1.4', 'L1.5', 'N1.1', 'N1.2', 'N1.3', 'N1.4', 'N1.5', 'D1.1', 'D1.2', 'SH1.1', 'SH1.2'],
    done: { type: 'exam', threshold: 80 } },

  // ═══ ЭКЗАМЕНЫ ПОДГРУПП ═══════════════════════════════════════════════════════
  // Сводный тест по всем грамматическим урокам подгруппы (вопросы собираются
  // из их practiceItems, см. ExamScreen). done: score ≥ threshold ИЛИ все
  // sourceLessons уже done (см. isNodeDone выше) — тот же принцип «несколько
  // путей к done», что у letters/sounds. requires = sourceLessons: экзамен
  // открывается, только когда пройдены ВСЕ уроки подгруппы (не только последний
  // по цепочке — внутри подгрупп есть боковые ветки вроде D1.3).
  { id: 'EX1.1', kind: 'exam', examTitle: 'Артикль и род',
    sourceLessons: ['C0', 'M1.1', 'D1.3', 'M1.2', 'M1.3', 'M1.4'],
    requires: ['C0', 'M1.1', 'D1.3', 'M1.2', 'M1.3', 'M1.4'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX1.2', kind: 'exam', examTitle: 'Есть/нет и числа 1–10',
    sourceLessons: ['C1', 'CH1.1', 'CH1.2', 'CH1.3', 'CH1.4'],
    requires: ['C1', 'CH1.1', 'CH1.2', 'CH1.3', 'CH1.4'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX2.1', kind: 'exam', examTitle: 'Глагол паАль — настоящее время',
    sourceLessons: ['G1.1', 'G1.2', 'G1.3', 'G1.4', 'C2', 'G1.5', 'G1.6'],
    requires: ['G1.1', 'G1.2', 'G1.3', 'G1.4', 'C2', 'G1.5', 'G1.6'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX3.1', kind: 'exam', examTitle: 'Множественное число и предлоги',
    sourceLessons: ['M2.1', 'M2.2', 'M2.3', 'M2.4', 'M2.5', 'M2.6', 'C3', 'M2.7', 'M2.8', 'M2.9'],
    requires: ['M2.1', 'M2.2', 'M2.3', 'M2.4', 'M2.5', 'M2.6', 'C3', 'M2.7', 'M2.8', 'M2.9'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX3.2', kind: 'exam', examTitle: 'Глагол мн.ч. и прямое дополнение',
    sourceLessons: ['G2.1', 'G2.2', 'G2.3', 'G2.4'],
    requires: ['G2.1', 'G2.2', 'G2.3', 'G2.4'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX3.3', kind: 'exam', examTitle: 'Связка ש и числа 11–20',
    sourceLessons: ['C4', 'CH2.1'],
    requires: ['C4', 'CH2.1'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX4.1', kind: 'exam', examTitle: 'Принадлежность, корень и вопросы',
    sourceLessons: ['M3.1', 'M3.2', 'M3.3', 'SL1.1', 'SL1.2', 'Q1.1', 'Q1.2', 'CH3.1', 'CH3.2', 'SL1.3'],
    requires: ['M3.1', 'M3.2', 'M3.3', 'SL1.1', 'SL1.2', 'Q1.1', 'Q1.2', 'CH3.1', 'CH3.2', 'SL1.3'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX4.2', kind: 'exam', examTitle: 'Прошедшее время',
    sourceLessons: ['G3.1', 'G3.2', 'G3.3', 'G3.4', 'G3.5'],
    requires: ['G3.1', 'G3.2', 'G3.3', 'G3.4', 'G3.5'],
    done: { type: 'exam', threshold: 80 } },
  { id: 'EX4.3', kind: 'exam', examTitle: 'Итоги уровня 4',
    sourceLessons: ['G3.6', 'C5.1', 'SL1.4'],
    requires: ['G3.6', 'C5.1', 'SL1.4'],
    done: { type: 'exam', threshold: 80 } },
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

  if (node.done.type === 'exam') {
    // ⚠️ Только реальный результат экзамена — НЕ «все sourceLessons done»:
    // requires экзамена и это условие совпадают почти всегда (уроки подгруппы
    // идут подряд), так что «автозачёт по фактам» на каждом рендере означал бы
    // «экзамен зачитывается сам себе в момент открытия» — для НОВЫХ игроков
    // это делает его декорацией, а не проверкой. Разовый автозачёт для тех,
    // кто прошёл подгруппу ДО появления экзамена в графе — миграция
    // StatsContext.migrate() (флаг examsGrandfathered), не отсюда.
    const score = getScore(stats, id);
    return score != null && score >= node.done.threshold;
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
    id: 'alphabet',
    chapter: 'Алфавит и звуки',
    icon: '🔤',
    description: 'Буквы, огласовки, первые слова',
    items: [
      { id: 'L1.1' }, { id: 'VL1.1' }, { id: 'L1.2' }, { id: 'VL1.2' },
      { id: 'N1.1' }, { id: 'N1.2' },
      { id: 'L1.3' }, { id: 'VL1.3' }, { id: 'N1.3' }, { id: 'VN1.3' },
      { id: 'L1.4' }, { id: 'VL1.4' }, { id: 'N1.4' }, { id: 'VN1.4' },
      { id: 'L1.5' }, { id: 'N1.5' }, { id: 'VN1.5' },
      { id: 'D1.1' }, { id: 'D1.2' }, { id: 'SH1.1' }, { id: 'SH1.2' },
      { id: 'EX0.1' },
    ],
  },
  {
    id: 'level1',
    chapter: 'Уровень 1 · Именное предложение и артикль',
    icon: '🧩',
    description: 'Артикль, род, первые числа',
    // Подгруппы внутри модуля — каждая заканчивается проверкой (checkpoint = id
    // последнего урока подгруппы). M1.4 — уже готовый синтез-урок (порог 90%);
    // CH1.4 — новая граница, порог урока не менялся (проверка только визуальная).
    subgroups: [
      { title: 'Артикль и род', endId: 'M1.4' },
      { title: 'Есть/нет и числа 1–10', endId: 'CH1.4' },
    ],
    items: [
      { id: 'C0' },   { id: 'R1.20' },
      { id: 'M1.1' }, { id: 'R1.21' }, { id: 'D1.3' },
      { id: 'M1.2' }, { id: 'R1.23' },
      { id: 'M1.3' }, { id: 'R1.24' },
      { id: 'M1.4' }, { id: 'R1.25' },
      { id: 'TV.colors' },
      { id: 'EX1.1' },
      { id: 'TV.family' },
      { id: 'C1' },   { id: 'R1.22' },
      { id: 'CH1.1' }, { id: 'R1.26' },
      { id: 'CH1.2' }, { id: 'R1.27' },
      { id: 'CH1.3' }, { id: 'R1.28' },
      { id: 'CH1.4' }, { id: 'R1.36' },
      { id: 'TV.numbers' },
      { id: 'EX1.2' },
      { id: 'TV.body' },
    ],
  },
  {
    id: 'level2',
    chapter: 'Уровень 2',
    icon: '🗣️',
    description: 'Глагол паАль, настоящее время',
    subgroups: [
      { title: 'Глагол паАль — настоящее время', endId: 'G1.6' },
    ],
    items: [
      { id: 'G1.1' },
      { id: 'G1.2' }, { id: 'R1.30' },
      { id: 'TV.food' },
      { id: 'G1.3' }, { id: 'R1.31' },
      { id: 'G1.4' }, { id: 'R1.32' },
      { id: 'TV.home' },
      { id: 'C2' },   { id: 'R1.35' },
      { id: 'TV.clothes' },
      { id: 'G1.5' }, { id: 'R1.33' },
      { id: 'G1.6' }, { id: 'R1.34' },
      { id: 'EX2.1' },
      { id: 'TV.city' },
    ],
  },
  {
    id: 'level3',
    chapter: 'Уровень 3',
    icon: '📐',
    description: 'Мн. число, предлоги, глагол II',
    subgroups: [
      { title: 'Множественное число и предлоги', endId: 'M2.9' },
      { title: 'Глагол мн.ч. и прямое дополнение', endId: 'G2.4' },
      { title: 'Связка ש и числа 11–20', endId: 'CH2.1' },
    ],
    items: [
      { id: 'M2.1' }, { id: 'R1.37' },
      { id: 'M2.2' }, { id: 'R1.38' },
      { id: 'M2.3' }, { id: 'R1.39' },
      { id: 'TV.nature' },
      { id: 'M2.4' }, { id: 'R1.40' },
      { id: 'M2.5' }, { id: 'R1.41' },
      { id: 'M2.6' }, { id: 'R1.42' },
      { id: 'C3' },   { id: 'R1.43' },
      { id: 'TV.time' },
      { id: 'M2.7' }, { id: 'R1.44' },
      { id: 'M2.8' }, { id: 'R1.45' },
      { id: 'M2.9' }, { id: 'R1.46' },
      { id: 'EX3.1' },
      { id: 'G2.1' }, { id: 'R1.47' },
      { id: 'G2.2' }, { id: 'R1.48' },
      { id: 'TV.transport' },
      { id: 'G2.3' }, { id: 'R1.49' },
      { id: 'G2.4' }, { id: 'R1.50' },
      { id: 'EX3.2' },
      { id: 'C4' },   { id: 'R1.51' },
      { id: 'CH2.1' }, { id: 'R1.52' },
      { id: 'TV.verbs' },
      { id: 'EX3.3' },
    ],
  },
  {
    id: 'level4',
    chapter: 'Уровень 4 · Принадлежность и вопросы (начало)',
    icon: '🔑',
    description: 'Принадлежность, вопросы, числа 3',
    subgroups: [
      { title: 'Принадлежность, корень и вопросы', endId: 'SL1.3' },
      { title: 'Прошедшее время', endId: 'G3.5' },
      { title: 'Итоги уровня 4', endId: 'SL1.4' },
    ],
    items: [
      { id: 'M3.1' }, { id: 'R1.53' },
      { id: 'M3.2' },
      { id: 'TV.study' },
      { id: 'M3.3' },
      { id: 'SL1.1' },
      { id: 'SL1.2' },
      { id: 'Q1.1' },
      { id: 'Q1.2' }, { id: 'R1.59' },
      { id: 'CH3.1' }, { id: 'R1.60' },
      { id: 'CH3.2' },
      { id: 'SL1.3' },
      { id: 'EX4.1' },
      { id: 'G3.1' }, { id: 'R1.63' },
      { id: 'G3.2' },
      { id: 'G3.3' },
      { id: 'G3.4' },
      { id: 'G3.5' },
      { id: 'EX4.2' },
      { id: 'G3.6' }, { id: 'R1.68' },
      { id: 'C5.1' },
      { id: 'TV.phrases1' },
      { id: 'SL1.4' }, { id: 'R1.70' },
      { id: 'EX4.3' },
      { id: 'TV.phrases2' },
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
