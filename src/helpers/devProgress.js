/**
 * devProgress.js — ТЕСТОВЫЙ инструмент: выставить прогресс «до урока N».
 *
 * Используется дев-панелью в профиле (и только ей). В обычном потоке приложения
 * не вызывается. Пишет через мутаторы facts.js, поэтому зеркало (scores/progress/
 * readingProgress) пересчитается штатно при commit()/migrate().
 */
import { setNodeScore, bumpNodeCounter, seenWord } from './facts';
import { COURSE_PATH, CURRICULUM_BY_ID } from '../data/curriculum';
import { READING_BLOCKS } from '../data/reading';

/** Плоская лента Пути: [{id, kind, title}] — в том же порядке, что видит юзер. */
export function pathNodes() {
  const out = [];
  for (const ch of COURSE_PATH) {
    for (const it of ch.items) {
      out.push({ id: it.id, chapter: ch.chapter });
    }
  }
  return out;
}

/**
 * Выставить прогресс: все узлы Пути до индекса `upto` включительно — пройдены,
 * слова из их порций — введены в словарь. Всё, что дальше, очищается,
 * чтобы можно было и «откатить» прогресс назад.
 * @param {object} stats текущие stats
 * @param {number} upto  индекс в pathNodes() (0-based); -1 = сбросить всё
 */
export function applyProgressUpTo(stats, upto) {
  const nodes = pathNodes();
  let facts = { nodes: {}, items: {} };

  for (let i = 0; i <= upto && i < nodes.length; i++) {
    const id = nodes[i].id;

    // Порция слов: вводим её слова — так закрывается done:{type:'studied'}
    const block = READING_BLOCKS.find(b => b.id === id);
    if (block) {
      for (const w of block.items) facts = seenWord(facts, w.id).facts;
      continue;
    }

    const node = CURRICULUM_BY_ID[id];
    if (!node) continue;

    if (node.done?.type === 'counter') {
      // Игровые узлы (буквы/огласовки): нужен счётчик правильных ответов
      facts = bumpNodeCounter(facts, id, 10);
    } else {
      // Тесты уроков: процент ≥ порога
      facts = setNodeScore(facts, id, 100);
    }
  }

  return { ...stats, facts, version: 8 };
}
