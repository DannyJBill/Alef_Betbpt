import fs from 'fs';

const orig = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/backup_original.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/plan.json', 'utf8'));

const CHUNK_SIZE = { g_phrases: 4 };
let ok = true;

for (const deck of Object.keys(orig)) {
  const origIds = new Set(orig[deck].map(w => w.id));
  const planRows = plan[deck];
  const planIds = new Set(planRows.map(r => r.id));

  if (origIds.size !== planRows.length) { console.error(`${deck}: count mismatch orig=${origIds.size} plan=${planRows.length}`); ok = false; }
  if (planIds.size !== planRows.length) { console.error(`${deck}: duplicate ids in plan`); ok = false; }
  for (const id of origIds) if (!planIds.has(id)) { console.error(`${deck}: missing id ${id}`); ok = false; }
  for (const id of planIds) if (!origIds.has(id)) { console.error(`${deck}: unexpected id ${id}`); ok = false; }

  const size = CHUNK_SIZE[deck] || 8;
  const byChunk = new Map();
  for (const r of planRows) {
    if (!byChunk.has(r.chunk)) byChunk.set(r.chunk, []);
    byChunk.get(r.chunk).push(r);
  }
  for (const [chunk, rows] of byChunk) {
    if (rows.length > size) { console.error(`${deck}: chunk ${chunk} has ${rows.length} > ${size}`); ok = false; }
    const ords = rows.map(r => r.ord).sort((a, b) => a - b);
    for (let i = 0; i < ords.length; i++) if (ords[i] !== i) { console.error(`${deck}: chunk ${chunk} bad ord sequence`, ords); ok = false; }
  }
  const maxChunk = Math.max(...planRows.map(r => r.chunk));
  const expectedChunks = Math.ceil(planRows.length / size);
  if (maxChunk + 1 !== expectedChunks) { console.error(`${deck}: chunkCount mismatch got=${maxChunk + 1} expected=${expectedChunks}`); ok = false; }
  console.log(`${deck}: OK — ${planRows.length} items, ${expectedChunks} chunks of ${size}`);
}

console.log(ok ? '\n✅ ALL CHECKS PASSED' : '\n❌ CHECKS FAILED');
process.exit(ok ? 0 : 1);
