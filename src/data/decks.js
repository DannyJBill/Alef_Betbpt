// src/data/decks.js — тематические колоды (этап 5). Метаданные в бандле,
// слова и прогресс — из Supabase через api/decks. Гейт после узла ниже.
export const DECKS_UNLOCK_NODE = 'G3.6'; // открываются после уровня 4

export const DECKS = [
  { id: 'family',    icon: '👨‍👩‍👧', title: 'Семья',       wordCount: 19,  chunkCount: 3  },
  { id: 'food',      icon: '🍎', title: 'Еда и напитки', wordCount: 79,  chunkCount: 10 },
  { id: 'body',      icon: '🤚', title: 'Тело',          wordCount: 22,  chunkCount: 3  },
  { id: 'nature',    icon: '🌿', title: 'Природа',       wordCount: 25,  chunkCount: 4  },
  { id: 'city',      icon: '🏙', title: 'Город',         wordCount: 25,  chunkCount: 4  },
  { id: 'home',      icon: '🏠', title: 'Дом',           wordCount: 36,  chunkCount: 5  },
  { id: 'time',      icon: '⏰', title: 'Время',         wordCount: 25,  chunkCount: 4  },
  { id: 'numbers',   icon: '🔢', title: 'Числа',         wordCount: 7,   chunkCount: 1  },
  { id: 'colors',    icon: '🎨', title: 'Цвета',         wordCount: 10,  chunkCount: 2  },
  { id: 'clothes',   icon: '👕', title: 'Одежда',        wordCount: 10,  chunkCount: 2  },
  { id: 'transport', icon: '🚌', title: 'Транспорт',     wordCount: 11,  chunkCount: 2  },
  { id: 'study',     icon: '📚', title: 'Учёба',         wordCount: 24,  chunkCount: 3  },
  { id: 'verbs',     icon: '🏃', title: 'Спорт',         wordCount: 7,   chunkCount: 1  },
  { id: 'conj',      icon: '🔗', title: 'Служебные',     wordCount: 22,  chunkCount: 3  },
  { id: 'misc',      icon: '📦', title: 'Разное',        wordCount: 140, chunkCount: 18 },
];
export const DECKS_BY_ID = Object.fromEntries(DECKS.map(d => [d.id, d]));

const API = '/api/decks';
const _cache = new Map();

export async function loadDeckContent(deckId) {
  if (_cache.has(deckId)) return _cache.get(deckId);
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'content', deck: deckId }) });
  const { words } = await res.json();
  const byChunk = [];
  for (const w of words) (byChunk[w.chunk] ||= []).push(w);
  const chunks = byChunk.map((words, chunk) => ({ chunk, words }));
  _cache.set(deckId, chunks);
  return chunks;
}

export async function loadWordProgress(telegramId) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'load', telegram_id: telegramId }) });
  const { progress } = await res.json();
  return Object.fromEntries((progress || []).map(p => [p.word_id, p]));
}

export async function syncWordProgress(telegramId, updates) {
  if (!updates.length) return;
  await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', telegram_id: telegramId, updates }) });
}

/** {learned, total, knownPct} по прогрессу колоды. */
export function deckStats(deck, progressMap) {
  let learned = 0, known = 0;
  for (const [id, p] of Object.entries(progressMap)) {
    if (!id.startsWith(`d_${deck.id}_`)) continue;
    if (p.introduced) learned++;
    if ((p.sm2?.repetitions || 0) >= 2 || (p.correct || 0) >= 3) known++;
  }
  return { learned, total: deck.wordCount, knownPct: learned ? Math.round(known / learned * 100) : 0 };
}
