// api/decks.js — тематические колоды + прогресс слов (этап 5).
// ПЛОСКИЙ, самодостаточный (Vercel: без cross-file импортов). SUPABASE_URL без /rest/v1.
//
// Actions (POST { action, telegram_id, ... }):
//   content  { deck }                 → слова колоды (чанки) из deck_words
//   load                              → весь прогресс слов юзера (user_word_progress)
//   sync     { updates:[{word_id,seen,correct,wrong,sm2,introduced}] } → upsert дельт
//
// initData не верифицируем здесь ради краткости примера — В ПРОДЕ добавить
// верификацию как в api/sync.js (тот же секрет бота).

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path, opts = {}) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { action, telegram_id } = req.body || {};

  try {
    if (action === 'content') {
      const { deck } = req.body;
      if (!deck) return res.status(400).json({ error: 'deck required' });
      const rows = await sb(`deck_words?deck=eq.${encodeURIComponent(deck)}&order=chunk.asc,ord.asc`);
      return res.status(200).json({ deck, words: rows });
    }

    if (action === 'load') {
      if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });
      const rows = await sb(`user_word_progress?telegram_id=eq.${telegram_id}&select=word_id,seen,correct,wrong,sm2,introduced`);
      return res.status(200).json({ progress: rows });
    }

    if (action === 'sync') {
      const { updates } = req.body;
      if (!telegram_id || !Array.isArray(updates)) return res.status(400).json({ error: 'telegram_id + updates required' });
      const payload = updates.map(u => ({
        telegram_id, word_id: u.word_id,
        seen: u.seen ?? 0, correct: u.correct ?? 0, wrong: u.wrong ?? 0,
        sm2: u.sm2 ?? null, introduced: u.introduced ?? true,
        updated_at: new Date().toISOString(),
      }));
      // upsert по (telegram_id, word_id)
      await sb('user_word_progress', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(payload),
      });
      return res.status(200).json({ ok: true, count: payload.length });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    console.error('api/decks error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
