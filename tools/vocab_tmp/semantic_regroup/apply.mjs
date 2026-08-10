// Apply the new chunk/ord assignment to Supabase deck_words (upsert full rows,
// batched, in the SAME shape api/decks.js already writes/reads).
import fs from 'fs';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './env.mjs';

const orig = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/backup_original.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/plan.json', 'utf8'));

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/deck_words`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

const BATCH = 500;
let totalWritten = 0;

for (const deck of Object.keys(plan)) {
  const byId = new Map(orig[deck].map(w => [w.id, w]));
  const planMap = new Map(plan[deck].map(r => [r.id, r]));
  const rows = orig[deck].map(w => {
    const p = planMap.get(w.id);
    return { ...w, chunk: p.chunk, ord: p.ord };
  });

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await upsertBatch(batch);
    totalWritten += batch.length;
    console.log(`${deck}: wrote ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
}

console.log(`\nDone. Total rows upserted: ${totalWritten}`);
