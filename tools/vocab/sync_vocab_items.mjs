// tools/vocab/sync_vocab_items.mjs
//
// Синхронизирует единую таблицу Supabase `vocab_items` с двумя источниками
// авторства (см. PROMPT_DB_WORDS_ARCHITECTURE.md и план миграции):
//   1. src/data/reading.js (READING_BLOCKS) — курируемый в гите core-course,
//      гейтит граф курса. Source of truth для этих слов — гит, а не БД.
//   2. Supabase `deck_words` — колоды, редактируются без деплоя.
//      Source of truth для этих слов — сама БД (просто зеркалируется 1:1).
//
// Идемпотентно: upsert по id, можно перезапускать после любых правок
// reading.js или deck_words. Ничего не удаляет (если слово убрали из
// reading.js, его строка в vocab_items останется — ручная чистка).
//
// Запуск:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tools/vocab/sync_vocab_items.mjs
//
// (Те же переменные окружения, что использует api/decks.js на Vercel —
// см. `vercel env pull` или Project Settings → Environment Variables.)

import { createClient } from '@supabase/supabase-js';
import { READING_BLOCKS } from '../../src/data/reading.js';

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB || !KEY) {
  console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в окружении.');
  process.exit(1);
}
const supabase = createClient(SB, KEY);

function readingRows() {
  const rows = [];
  for (const block of READING_BLOCKS) {
    for (const item of block.items) {
      rows.push({
        id: item.id,
        type: item.type === 'phrase' ? 'phrase' : 'word',
        pos: item.type === 'phrase' ? null : item.type,
        hebrew: item.hebrew,
        plain: item.plain,
        transliteration: item.transliteration || null,
        translation: item.translation,
        english: item.english || null,
        gender: item.gender || null,
        audio: item.audio || null,
        curriculum_node: block.id,
        curriculum_seq: block.seq,
        curriculum_mode: block.mode || null,
        unlock_label: block.unlockLabel || null,
        deck: null, chunk: null, ord: null,
        source: 'core-course',
        draft: !!item.draft,
        meta: null,
      });
    }
  }
  return rows;
}

async function deckWordsRows() {
  // Supabase/PostgREST caps a single select() at 1000 rows by default —
  // deck_words давно перевалила за это, пагинируем через .range().
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('deck_words').select('*').range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all.map(w => ({
    id: w.id,
    type: w.deck === 'g_phrases' ? 'phrase' : 'word',
    pos: null,
    hebrew: w.hebrew,
    plain: w.plain,
    transliteration: w.transliteration || null,
    translation: w.translation,
    english: null,
    gender: w.gender || null,
    audio: w.audio || null,
    curriculum_node: null, curriculum_seq: null, curriculum_mode: null, unlock_label: null,
    deck: w.deck, chunk: w.chunk, ord: w.ord,
    source: 'legacy-decks',
    draft: false,
    meta: w.meta || null,
  }));
}

async function upsertBatches(rows, label) {
  const BATCH = 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('vocab_items').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
    done += batch.length;
  }
  console.log(`${label}: upserted ${done} rows`);
}

async function main() {
  const reading = readingRows();
  await upsertBatches(reading, 'reading.js (core-course)');

  const decks = await deckWordsRows();
  await upsertBatches(decks, 'deck_words (legacy-decks)');

  const { count } = await supabase.from('vocab_items').select('id', { count: 'exact', head: true });
  console.log(`vocab_items total rows: ${count}`);
  console.log(`Ожидалось: ${reading.length} (core-course) + ${decks.length} (legacy-decks) = ${reading.length + decks.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
