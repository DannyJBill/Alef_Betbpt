// src/data/decks.js — тематические колоды (этап 5).
//
// МЕТАДАННЫЕ колод — в бандле (маленькие). СЛОВА и ПРОГРЕСС — из Supabase через
// api/decks (масштаб до 10k+ слов без раздувания бандла и без потолка CloudStorage).
//
// Гейт: колоды открываются после урока чтения без огласовок (карточки без никуда).
// До реализации SL2.4 — можно временно гейтить по концу уровня 3.
export const DECKS_UNLOCK_NODE = 'B1.1'; // «чтение без огласовок»; поменять при желании

export const DECKS = [
  { id: 'food',    icon: '🍎', title: 'Еда и напитки',   wordCount: 128, chunkCount: 16 },
  { id: 'verbs',   icon: '🏃', title: 'Глаголы',          wordCount: 173, chunkCount: 22 },
  { id: 'home',    icon: '🏠', title: 'Дом и вещи',       wordCount: 51,  chunkCount: 7  },
  { id: 'family',  icon: '👨‍👩‍👧', title: 'Семья и люди',  wordCount: 67,  chunkCount: 9  },
  { id: 'city',    icon: '🏙', title: 'Город и места',    wordCount: 50,  chunkCount: 7  },
  { id: 'time',    icon: '🕐', title: 'Время',            wordCount: 88,  chunkCount: 11 },
  { id: 'nature',  icon: '🌳', title: 'Природа',          wordCount: 38,  chunkCount: 5  },
  { id: 'body',    icon: '🧍', title: 'Тело и здоровье',  wordCount: 61,  chunkCount: 8  },
  { id: 'adj',     icon: '🎨', title: 'Признаки',         wordCount: 34,  chunkCount: 5  },
  { id: 'clothes', icon: '👕', title: 'Одежда',           wordCount: 10,  chunkCount: 2  },
];
export const DECKS_BY_ID = Object.fromEntries(DECKS.map(d => [d.id, d]));

const API = '/api/decks';

// Кэш контента колоды в памяти сессии (чтобы не тянуть повторно)
const _contentCache = new Map();

/** Слова колоды (сгруппированы по чанкам): [{chunk, words:[{id,hebrew,translation}]}] */
export async function loadDeckContent(deckId) {
  if (_contentCache.has(deckId)) return _contentCache.get(deckId);
  const res = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'content', deck: deckId }),
  });
  const { words } = await res.json();
  const byChunk = [];
  for (const w of words) {
    (byChunk[w.chunk] ||= []).push(w);
  }
  const chunks = byChunk.map((words, chunk) => ({ chunk, words }));
  _contentCache.set(deckId, chunks);
  return chunks;
}

/** Весь прогресс слов юзера из Supabase → { [word_id]: {seen,correct,wrong,sm2,introduced} } */
export async function loadWordProgress(telegramId) {
  const res = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'load', telegram_id: telegramId }),
  });
  const { progress } = await res.json();
  return Object.fromEntries((progress || []).map(p => [p.word_id, p]));
}

/** Отправить дельты прогресса (после изучения/проверки чанка). */
export async function syncWordProgress(telegramId, updates) {
  if (!updates.length) return;
  await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', telegram_id: telegramId, updates }),
  });
}

/** Статистика колоды по прогрессу: {learned, total, knownPct}. */
export function deckStats(deck, progressMap) {
  const total = deck.wordCount;
  let learned = 0, known = 0;
  for (const [id, p] of Object.entries(progressMap)) {
    if (!id.startsWith(`d_${deck.id}_`)) continue;
    if (p.introduced) learned++;
    const reps = p.sm2?.repetitions || 0;
    if (reps >= 2 || (p.correct || 0) >= 3) known++;
  }
  const knownPct = learned ? Math.round((known / learned) * 100) : 0;
  return { learned, total, knownPct };
}
