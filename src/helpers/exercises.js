/**
 * exercises.js — ДВИЖОК УПРАЖНЕНИЙ (этап 3 перестройки v1.0).
 *
 * До этапа 3 типы вопросов были вшиты в экраны:
 *   - LessonScreen: авторские practiceItems «В4» (выбор из 4);
 *   - ReadingScreen/LearnMode: квиз слова→перевод с дистракторами из пула;
 *   - GameScreen: 4 инлайн-типа (буква↔название, слог→звук, слово→перевод).
 * Каждый новый тип задания требовал правки экрана. Движок переворачивает это:
 * генератор — ПЛАГИН в реестре, экраны рендерят единый формат Question.
 *
 * ЕДИНЫЙ ФОРМАТ ВОПРОСА:
 *   Question = {
 *     gen:      id генератора ('choice4' | 'word_ru' | 'no_nikud' | 'typing' | ...),
 *     mode:     'choice' | 'typing',       // как рендерить ввод
 *     prompt:   string,                    // текст вопроса (RU)
 *     hebrew?:  string,                    // иврит крупно (RTL), если есть
 *     speak?:   string,                    // что озвучить кнопкой 🔊 (иврит)
 *     options?: [{ id, label, labelHe? }], // варианты (mode='choice')
 *     answerId: string,                    // правильный id (choice) / эталон (typing)
 *     itemId?:  string,                    // id слова для записи прогресса (facts)
 *   }
 *
 * ГЕНЕРАТОР:
 *   { id, mode, build(source, pool, rnd) → Question | null }
 *   source — элемент контента (practiceItem | слово | буква...);
 *   pool   — массив для дистракторов; rnd — инъекция случайности (тестируемость).
 *
 * ⛔ Движок ЧИСТЫЙ: без React, без Date.now, без Math.random внутри генераторов —
 * случайность только через rnd. Shuffle — Fisher-Yates на rnd.
 */

// ─── Утилиты (детерминированные через rnd) ───────────────────────────────────
export function shuffleRnd(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Убрать огласовки (никуд) из ивритской строки. U+0591–U+05C7 — теамим+никуд. */
export function stripNikud(he = '') {
  return he.replace(/[\u0591-\u05C7]/g, '');
}

function pickDistractors(pool, excludeId, n, rnd) {
  const seen = new Set([excludeId]);
  const uniq = pool.filter(x => x && !seen.has(x.id) && seen.add(x.id));
  return shuffleRnd(uniq, rnd).slice(0, n);
}

/** Адаптер: элемент словаря (reading.js) → формат движка {id, he, ru, plain}. */
export function fromReadingItem(item) {
  if (!item) return null;
  return { id: item.id, he: item.hebrew, ru: item.translation, plain: item.plain || null, type: item.type };
}

// ─── Генераторы ──────────────────────────────────────────────────────────────

/** В4 — авторский вопрос урока: {prompt, options[4], answer}. Как в LessonScreen. */
const genChoice4 = {
  id: 'choice4',
  mode: 'choice',
  build(item, _pool, rnd = Math.random) {
    if (!item?.options?.length) return null;
    // Позиционные id: устойчивы к одинаковым подписям (иначе коллизия ключей
    // и кривая отметка правильный/неправильный).
    const shuffled = shuffleRnd(item.options, rnd);
    const options = shuffled.map((o, i) => ({ id: String(i), label: o }));
    const answerIdx = shuffled.indexOf(item.answer);
    return {
      gen: 'choice4', mode: 'choice',
      prompt: item.prompt,
      hebrew: item.hebrew || null,
      speak: item.hebrew || null,
      options,
      answerId: String(answerIdx),
    };
  },
};

/** Слово: иврит → выбор перевода. Дистракторы из пула (весь словарь). Как LearnMode. */
const genWordRu = {
  id: 'word_ru',
  mode: 'choice',
  build(word, pool = [], rnd = Math.random) {
    if (!word?.ru) return null;
    const ds = pickDistractors(pool.length >= 4 ? pool : [word], word.id, 3, rnd);
    const options = shuffleRnd([word, ...ds], rnd)
      .map(w => ({ id: w.id, label: w.ru }));
    return {
      gen: 'word_ru', mode: 'choice',
      prompt: 'Что это значит?',
      hebrew: word.he, speak: word.he,
      options, answerId: word.id, itemId: word.id,
    };
  },
};

/** Обратное: перевод → выбор иврита (укрепляет активное припоминание). */
const genWordHe = {
  id: 'word_he',
  mode: 'choice',
  build(word, pool = [], rnd = Math.random) {
    if (!word?.he) return null;
    const ds = pickDistractors(pool.length >= 4 ? pool : [word], word.id, 3, rnd);
    const options = shuffleRnd([word, ...ds], rnd)
      .map(w => ({ id: w.id, label: w.he, labelHe: w.he }));
    return {
      gen: 'word_he', mode: 'choice',
      prompt: `Как на иврите «${word.ru}»?`,
      hebrew: null, speak: word.he,
      options, answerId: word.id, itemId: word.id,
    };
  },
};

/** 🔧 B: слово БЕЗ ОГЛАСОВОК → перевод. Мутатор поверх word_ru (разблокирует B1). */
const genNoNikud = {
  id: 'no_nikud',
  mode: 'choice',
  build(word, pool = [], rnd = Math.random) {
    const q = genWordRu.build(word, pool, rnd);
    if (!q) return null;
    const bare = word.plain || stripNikud(word.he);
    if (!bare || bare === word.he) return null; // нечего снимать — не дублируем word_ru
    return { ...q, gen: 'no_nikud', hebrew: bare, prompt: 'Прочитай без огласовок. Что это значит?' };
  },
};

/** 🔧 P: печать — слышишь/видишь перевод, набираешь иврит (HebrewKeyboard). */
const genTyping = {
  id: 'typing',
  mode: 'typing',
  build(word, _pool, _rnd) {
    if (!word?.he) return null;
    return {
      gen: 'typing', mode: 'typing',
      prompt: `Напечатай на иврите: «${word.ru}»`,
      hebrew: null, speak: word.he,
      answerId: word.plain || stripNikud(word.he), // сравнение без огласовок
      itemId: word.id,
    };
  },
};

/** 🔧 R: фраза-конструктор — собери фразу из слов по переводу (для Разговора). */
const genPhraseBuild = {
  id: 'phrase_build',
  mode: 'choice',
  build(phrase, pool = [], rnd = Math.random) {
    if (!phrase?.he || !phrase?.ru) return null;
    const ds = pickDistractors(pool.filter(p => p.he), phrase.id, 3, rnd);
    const options = shuffleRnd([phrase, ...ds], rnd)
      .map(p => ({ id: p.id, label: p.he, labelHe: p.he }));
    return {
      gen: 'phrase_build', mode: 'choice',
      prompt: `Как сказать: «${phrase.ru}»?`,
      hebrew: null, speak: phrase.he,
      options, answerId: phrase.id, itemId: phrase.id,
    };
  },
};

// ─── Реестр ──────────────────────────────────────────────────────────────────
export const GENERATORS = {
  [genChoice4.id]:    genChoice4,
  [genWordRu.id]:     genWordRu,
  [genWordHe.id]:     genWordHe,
  [genNoNikud.id]:    genNoNikud,
  [genTyping.id]:     genTyping,
  [genPhraseBuild.id]: genPhraseBuild,
};

/** Построить один вопрос выбранным генератором. null — если источник не подходит. */
export function buildQuestion(genId, source, pool, rnd = Math.random) {
  const g = GENERATORS[genId];
  return g ? g.build(source, pool, rnd) : null;
}

/**
 * Собрать сессию вопросов.
 * plan: [{ gen, sources, pool?, take? }] — слои сессии (напр. 6 word_ru + 4 word_he).
 * Источники шафлятся, непостроившиеся (null) пропускаются.
 */
export function buildSession(plan, rnd = Math.random) {
  const out = [];
  for (const layer of plan) {
    const srcs = shuffleRnd(layer.sources || [], rnd).slice(0, layer.take ?? layer.sources?.length ?? 0);
    for (const s of srcs) {
      const q = buildQuestion(layer.gen, s, layer.pool || layer.sources || [], rnd);
      if (q) out.push(q);
    }
  }
  return shuffleRnd(out, rnd);
}
