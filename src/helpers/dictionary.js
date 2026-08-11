/**
 * dictionary.js — единая точка сборки «словаря» из РАЗНЫХ источников слов
 * (уроки-порции data/reading.js, тематические колоды data/decks.js, в будущем —
 * любой другой источник, который умеет отдать {hebrew, translation, ...}).
 *
 * Раньше «Мой словарь» (ReadingScreen.DictView) брал контент слова напрямую из
 * READING_ITEMS — поэтому слова из колод (Supabase, не в бандле) физически не
 * могли там появиться, хотя прогресс по ним уже писался в readingProgress.
 *
 * Решение: снапшот отображаемых полей слова кладётся в facts.items['w:'+id].meta
 * В МОМЕНТ изучения (см. facts.answerWord/reviewWord/introduceWord), а не
 * достаётся заново из контента при каждом рендере. Словарь читает готовые
 * записи readingProgress.words[id].meta — ему не важно, откуда слово пришло.
 *
 * Для слов, изученных ДО этого изменения (meta ещё нет), — фолбэк на бандл
 * уроков (LESSON_META_BY_ID); слова колод без meta считались утраченными и до
 * этого изменения (баг: не переживали перезагрузку, см. DecksScreen).
 */
import { READING_ITEMS, READING_BLOCKS, PHRASE_LOCKS, getUnlockedPhraseLocks } from '../data/reading';
import { COURSE_PATH } from '../data/curriculum';

/** Снапшот слова из порции урока (data/reading.js). */
export function lessonWordMeta(item) {
  if (!item) return null;
  return {
    hebrew: item.hebrew, plain: item.plain || null,
    transliteration: item.transliteration || null,
    translation: item.translation, audio: item.audio || null,
    type: item.type || 'word',
    source: { kind: 'lesson', label: item.lesson || null },
  };
}

/** Снапшот слова из тематической колоды (data/decks.js, содержимое — Supabase). */
export function deckWordMeta(item, deck) {
  if (!item) return null;
  return {
    hebrew: item.hebrew, plain: item.plain || null,
    transliteration: item.transliteration || null,
    translation: item.translation, audio: item.audio || null,
    type: item.type || 'word',
    source: { kind: 'deck', id: deck?.id || null, label: deck?.title || null, icon: deck?.icon || '📦' },
  };
}

const LESSON_META_BY_ID = Object.fromEntries(
  READING_ITEMS.map(i => [i.id, lessonWordMeta(i)])
);

/** Снапшот слова урока по id (для мест, где под рукой только id — CardsMode/QuizMode). */
export function getLessonWordMeta(id) {
  return LESSON_META_BY_ID[id] || null;
}

/**
 * Единый список слов словаря пользователя: readingProgress.studied → снапшот
 * (meta, записанный при изучении) с фолбэком на бандл уроков для старых
 * записей без meta. Слова без снапшота нигде (ни meta, ни в бандле) не
 * рендерятся — контента для них нет.
 */
export function dictionaryEntries(stats) {
  const words = stats?.readingProgress?.words || {};
  const studied = stats?.readingProgress?.studied || [];
  return studied
    .map(id => {
      const w = words[id] || {};
      const meta = w.meta || LESSON_META_BY_ID[id];
      if (!meta) return null;
      return { id, ...meta, progress: w };
    })
    .filter(Boolean);
}

/** Обратное к dictionaryEntries: снапшот-поля записи без id/progress (для повторной записи meta при review/answer). */
export function metaOf(entry) {
  const { id, progress, ...meta } = entry;
  return meta;
}

export function playAudio(filename) {
  if (!filename) return;
  new Audio(`/reading/${filename}`).play().catch(() => {});
}

/** Статус слова в словаре по его прогрессу (для точки-индикатора, счётчиков, фильтров). */
export function statusOf(w) {
  if (!w) return { label: "новое", dot: "bg-gray-300" };
  const reps = w.sm2?.repetitions || 0;
  const correct = w.correct || 0, wrong = w.wrong || 0;
  if (reps >= 2 || correct >= 3) return { label: "знаю", dot: "bg-emerald-500" };
  if (wrong > 0 && wrong >= correct) return { label: "слабое", dot: "bg-rose-500" };
  return { label: "изучается", dot: "bg-amber-400" };
}

/** Источник слова → короткая метка/иконка для бейджа в строке слова. */
export function sourceBadge(source) {
  if (!source) return null;
  if (source.kind === 'deck') return { label: source.label || 'Тема', icon: source.icon || '📦' };
  if (source.label) return { label: source.label, icon: '📖' };
  return null;
}

// ─── Группировка «по урокам» — модуль курса (COURSE_PATH), к которому относится
// порция, в которой слово ВПЕРВЫЕ введено. Чисто производное от статического
// контента (id слова → его порция → модуль пути) — работает для ЛЮБОГО слова
// урока независимо от того, есть ли у него meta-снапшот (не требует миграции).
const WORD_ID_TO_BLOCK_ID = Object.fromEntries(
  READING_BLOCKS.flatMap(b => b.items.map(i => [i.id, b.id]))
);
const BLOCK_ID_TO_CHAPTER = {};
for (const ch of COURSE_PATH) {
  for (const it of ch.items) {
    if (READING_BLOCKS.some(b => b.id === it.id)) {
      BLOCK_ID_TO_CHAPTER[it.id] = { id: ch.id, title: ch.chapter, icon: ch.icon };
    }
  }
}
const CHAPTER_ORDER = COURSE_PATH.map(c => c.id);

/** Модуль курса (глава COURSE_PATH), в котором слово впервые встретилось. null — для слов колод. */
export function lessonWordChapter(id) {
  const blockId = WORD_ID_TO_BLOCK_ID[id];
  return blockId ? BLOCK_ID_TO_CHAPTER[blockId] || null : null;
}

/**
 * Словарь, сгруппированный по модулям курса (только уже изученные слова уроков,
 * фразы и слова колод исключены — у них своё представление). Порядок групп —
 * канонический порядок COURSE_PATH. Слово без определённого модуля (не должно
 * случаться при целостном контенте) уходит в группу «Другое» в конец списка.
 */
export function groupByLessonChapter(stats) {
  const entries = dictionaryEntries(stats).filter(e => e.type !== 'phrase' && e.source?.kind !== 'deck');
  const byChapter = new Map();
  for (const e of entries) {
    const ch = lessonWordChapter(e.id) || { id: '_other', title: 'Другое', icon: '📖' };
    if (!byChapter.has(ch.id)) byChapter.set(ch.id, { ...ch, words: [] });
    byChapter.get(ch.id).words.push(e);
  }
  return [...byChapter.values()].sort((a, b) => {
    const ia = CHAPTER_ORDER.indexOf(a.id), ib = CHAPTER_ORDER.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

/**
 * Двухуровневая версия groupByLessonChapter — для вкладок «Слова»/«Фразы»
 * VocabularyScreen: модуль (COURSE_PATH) → урок/порция (READING_BLOCKS) →
 * записи. { phrase:false } — только слова (как groupByLessonChapter),
 * { phrase:true } — только фразы (type === 'phrase', реальное значение поля
 * в reading.js; у слов там разные POS-теги, ни один не 'phrase').
 */
export function groupByLessonBlock(stats, { phrase = false } = {}) {
  const entries = dictionaryEntries(stats).filter(e =>
    (phrase ? e.type === 'phrase' : e.type !== 'phrase') && e.source?.kind !== 'deck');
  const byChapter = new Map();
  for (const e of entries) {
    const ch = lessonWordChapter(e.id) || { id: '_other', title: 'Другое', icon: '📖' };
    const blockId = WORD_ID_TO_BLOCK_ID[e.id] || '_other';
    if (!byChapter.has(ch.id)) byChapter.set(ch.id, { ...ch, blocks: new Map() });
    const chEntry = byChapter.get(ch.id);
    if (!chEntry.blocks.has(blockId)) {
      const block = READING_BLOCKS.find(b => b.id === blockId);
      chEntry.blocks.set(blockId, { id: blockId, title: block?.title || 'Другое', words: [] });
    }
    chEntry.blocks.get(blockId).words.push(e);
  }
  return [...byChapter.values()]
    .map(ch => ({ ...ch, blocks: [...ch.blocks.values()] }))
    .sort((a, b) => {
      const ia = CHAPTER_ORDER.indexOf(a.id), ib = CHAPTER_ORDER.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}

/**
 * Открытые «комбо-фразы» (PHRASE_LOCKS — собраны из уже известных слов, не
 * контент урока), сгруппированные по модулю курса — раньше рендерились
 * отдельным всегда-открытым списком (PhraseLocksSection) над аккордеоном
 * «Фразы»; по фидбэку это выглядело как дублирующий, оторванный от уроков
 * список. Модуль фразы — модуль САМОГО ПОЗДНЕГО из составляющих её слов
 * (composedOf) в порядке COURSE_PATH: это и есть модуль, прохождение
 * которого фактически открывает фразу.
 */
export function phraseLocksByChapter(studied) {
  const unlocked = getUnlockedPhraseLocks(studied);
  const byChapter = new Map();
  for (const p of unlocked) {
    let chapter = null, order = -1;
    for (const wordId of p.composedOf) {
      const ch = lessonWordChapter(wordId);
      const i = ch ? CHAPTER_ORDER.indexOf(ch.id) : -1;
      if (i > order) { order = i; chapter = ch; }
    }
    const chId = chapter?.id || '_other';
    if (!byChapter.has(chId)) byChapter.set(chId, { ...(chapter || { id: '_other', title: 'Другое', icon: '📖' }), phrases: [] });
    byChapter.get(chId).phrases.push(p);
  }
  return byChapter;
}
