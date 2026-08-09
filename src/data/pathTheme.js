/**
 * pathTheme.js — визуальные темы для экрана «Путь» (StudyScreen).
 *
 * Чисто презентационный слой, НЕ источник правды ни для чего:
 * - PATH_SECTION_THEME красит секции COURSE_PATH (curriculum.js) по их `id`,
 *   включая обёртку подгруппы (sub) — левый акцент + фон, чтобы подгруппы
 *   внутри модуля читались как отдельные карточки, а не просто заголовок.
 * - GRAMMAR_TOPIC_META красит тег темы на карточке грамматического урока
 *   по значению node.module (syntax/morphology/verb/numbers/phonetics/wordsystem).
 * - NODE_KIND_CARD красит саму карточку урока по её типу (теория/слова/экзамен) —
 *   так три вида контента различимы даже без чтения текста.
 * Классы — литералами (не собираются динамически), чтобы Tailwind JIT их видел.
 */

export const PATH_SECTION_THEME = {
  alphabet: {
    light: { icon: 'bg-white text-indigo-600 border-indigo-100', head: 'bg-indigo-50/70', ring: 'ring-indigo-300 bg-indigo-50/50', text: 'text-indigo-600', bar: 'bg-indigo-500', sub: 'border-indigo-300 bg-indigo-50/40' },
    dark:  { icon: 'bg-gray-800 text-indigo-300 border-indigo-500/30', head: 'bg-indigo-500/10', ring: 'ring-indigo-500/40 bg-indigo-500/5', text: 'text-indigo-300', bar: 'bg-indigo-500', sub: 'border-indigo-500/50 bg-indigo-500/[0.04]' },
  },
  level1: {
    light: { icon: 'bg-white text-emerald-600 border-emerald-100', head: 'bg-emerald-50/70', ring: 'ring-emerald-300 bg-emerald-50/50', text: 'text-emerald-600', bar: 'bg-emerald-500', sub: 'border-emerald-300 bg-emerald-50/40' },
    dark:  { icon: 'bg-gray-800 text-emerald-300 border-emerald-500/30', head: 'bg-emerald-500/10', ring: 'ring-emerald-500/40 bg-emerald-500/5', text: 'text-emerald-300', bar: 'bg-emerald-500', sub: 'border-emerald-500/50 bg-emerald-500/[0.04]' },
  },
  level2: {
    light: { icon: 'bg-white text-amber-600 border-amber-100', head: 'bg-amber-50/70', ring: 'ring-amber-300 bg-amber-50/50', text: 'text-amber-600', bar: 'bg-amber-500', sub: 'border-amber-300 bg-amber-50/40' },
    dark:  { icon: 'bg-gray-800 text-amber-300 border-amber-500/30', head: 'bg-amber-500/10', ring: 'ring-amber-500/40 bg-amber-500/5', text: 'text-amber-300', bar: 'bg-amber-500', sub: 'border-amber-500/50 bg-amber-500/[0.04]' },
  },
  level3: {
    light: { icon: 'bg-white text-rose-600 border-rose-100', head: 'bg-rose-50/70', ring: 'ring-rose-300 bg-rose-50/50', text: 'text-rose-600', bar: 'bg-rose-500', sub: 'border-rose-300 bg-rose-50/40' },
    dark:  { icon: 'bg-gray-800 text-rose-300 border-rose-500/30', head: 'bg-rose-500/10', ring: 'ring-rose-500/40 bg-rose-500/5', text: 'text-rose-300', bar: 'bg-rose-500', sub: 'border-rose-500/50 bg-rose-500/[0.04]' },
  },
  level4: {
    light: { icon: 'bg-white text-violet-600 border-violet-100', head: 'bg-violet-50/70', ring: 'ring-violet-300 bg-violet-50/50', text: 'text-violet-600', bar: 'bg-violet-500', sub: 'border-violet-300 bg-violet-50/40' },
    dark:  { icon: 'bg-gray-800 text-violet-300 border-violet-500/30', head: 'bg-violet-500/10', ring: 'ring-violet-500/40 bg-violet-500/5', text: 'text-violet-300', bar: 'bg-violet-500', sub: 'border-violet-500/50 bg-violet-500/[0.04]' },
  },
};

export function getSectionTheme(id, dark) {
  const t = PATH_SECTION_THEME[id];
  if (!t) return PATH_SECTION_THEME.alphabet[dark ? 'dark' : 'light'];
  return t[dark ? 'dark' : 'light'];
}

// node.module (грамматика) → лейбл + цвет чипа темы урока
export const GRAMMAR_TOPIC_META = {
  phonetics:  { label: 'фонетика',     light: 'bg-slate-100 text-slate-600',     dark: 'bg-slate-500/15 text-slate-300' },
  syntax:     { label: 'синтаксис',    light: 'bg-sky-100 text-sky-700',         dark: 'bg-sky-500/15 text-sky-300' },
  morphology: { label: 'морфология',   light: 'bg-fuchsia-100 text-fuchsia-700', dark: 'bg-fuchsia-500/15 text-fuchsia-300' },
  verb:       { label: 'глагол',       light: 'bg-orange-100 text-orange-700',   dark: 'bg-orange-500/15 text-orange-300' },
  numbers:    { label: 'числа',        light: 'bg-teal-100 text-teal-700',       dark: 'bg-teal-500/15 text-teal-300' },
  wordsystem: { label: 'словосистема', light: 'bg-lime-100 text-lime-700',       dark: 'bg-lime-500/15 text-lime-300' },
};

export function getTopicMeta(topic, dark) {
  const t = GRAMMAR_TOPIC_META[topic];
  if (!t) return null;
  return { label: t.label, cls: t[dark ? 'dark' : 'light'] };
}

// Карточка урока по типу контента: теория (grammar/letters/sounds) — нейтральная,
// как раньше; слова (reading) — лёгкий изумрудный тон; экзамен — янтарный
// тон + пунктир, чтобы «это не обычный урок» читалось до текста.
export const NODE_KIND_CARD = {
  reading: { light: 'bg-emerald-50/60 border-emerald-100', dark: 'bg-emerald-500/[0.06] border-emerald-500/20' },
  exam:    { light: 'bg-amber-50/80 border-amber-200',     dark: 'bg-amber-500/[0.08] border-amber-500/30' },
};
const DEFAULT_CARD = { light: 'bg-white border-gray-100', dark: 'bg-gray-800 border-gray-700' };

export function getNodeCardTheme(kind, dark) {
  const t = NODE_KIND_CARD[kind] || DEFAULT_CARD;
  return t[dark ? 'dark' : 'light'];
}
