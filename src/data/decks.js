// src/data/decks.js — тематические колоды (этап 5). Метаданные в бандле,
// слова и прогресс — из Supabase через api/decks. Гейт после узла ниже.
// null — колоды доступны всем сразу. Поставить id узла (напр. 'G3.6'), чтобы
// снова закрыть за прогрессом.
export const DECKS_UNLOCK_NODE = null;

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
  { id: 'conj',      icon: '🔗', title: 'Служебные',     wordCount: 613, chunkCount: 77 },
  { id: 'misc',      icon: '📦', title: 'Разное',        wordCount: 140, chunkCount: 18 },
  // По частям речи (импорт Hebrew-Russian_Bet__Audio + 100 TeachMeHebrew, см. BACKLOG.md) —
  // грамматический разрез поверх тематических колод выше, реальное аудио (не TTS).
  { id: 'g_nouns',      icon: '📇', title: 'Существительные', wordCount: 1553, chunkCount: 195 },
  { id: 'g_adjectives', icon: '🌈', title: 'Прилагательные',  wordCount: 1678, chunkCount: 210 },
  { id: 'g_verbs',      icon: '🎬', title: 'Глаголы',          wordCount: 695,  chunkCount: 87  },
  { id: 'g_phrases',    icon: '💬', title: 'Фразы',            wordCount: 101,  chunkCount: 26  },
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
