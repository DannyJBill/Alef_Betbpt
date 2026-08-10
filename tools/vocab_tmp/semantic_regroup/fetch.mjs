// Fetch deck_words rows for target decks, save full backup + working copy.
import fs from 'fs';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './env.mjs';

const DECKS = ['g_nouns', 'g_adjectives', 'g_verbs', 'conj', 'g_phrases'];

async function sbAll(pathQ) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQ}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

const out = {};
for (const deck of DECKS) {
  const rows = await sbAll(`deck_words?deck=eq.${deck}&order=chunk.asc,ord.asc`);
  out[deck] = rows;
  console.log(deck, rows.length);
}

fs.writeFileSync('tools/vocab_tmp/semantic_regroup/backup_original.json', JSON.stringify(out, null, 1));
console.log('saved backup_original.json, total:', Object.values(out).reduce((s, a) => s + a.length, 0));
