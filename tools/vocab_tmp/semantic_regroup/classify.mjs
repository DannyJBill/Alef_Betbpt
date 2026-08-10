import fs from 'fs';
import { TAXONOMY } from './taxonomy.mjs';

const CHUNK_SIZE = { g_phrases: 4 }; // default 8 for everything else

const data = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/backup_original.json', 'utf8'));

const CYR = 'а-яёa-z';
const reCache = new Map();
function kwRegex(rawKw) {
  if (reCache.has(rawKw)) return reCache.get(rawKw);
  // trailing '$' marks an exact/whole-word keyword (both boundaries required) —
  // use for short stems prone to collisions ("боль$" vs "большая").
  // Without '$', keyword is a free prefix (left boundary only) so Russian
  // inflection suffixes (-ый/-ая/-ость...) still match freely.
  const exact = rawKw.endsWith('$');
  const kw = exact ? rawKw.slice(0, -1) : rawKw;
  const esc = kw.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const right = exact ? `(?![${CYR}])` : '';
  const re = new RegExp(`(?:^|[^${CYR}])${esc}${right}`, 'iu');
  reCache.set(rawKw, re);
  return re;
}

function classify(word, categories) {
  const t = ' ' + word.translation.toLowerCase() + ' ';
  for (const cat of categories) {
    if (cat.words.some(kw => kwRegex(kw).test(t))) return cat.name;
  }
  return 'Прочее';
}

const report = {};
const plan = {}; // deck -> [{id, chunk, ord, category}]

for (const [deck, rows] of Object.entries(data)) {
  const categories = TAXONOMY[deck];
  if (!categories) { console.error('NO TAXONOMY FOR', deck); continue; }
  const catOrder = [...categories.map(c => c.name), 'Прочее'];

  const byCat = new Map(catOrder.map(n => [n, []]));
  for (const w of rows) {
    const cat = classify(w, categories);
    byCat.get(cat).push(w);
  }

  // stable order within category: alphabetical by plain (Hebrew), matches prior convention
  for (const arr of byCat.values()) arr.sort((a, b) => a.plain.localeCompare(b.plain, 'he'));

  const ordered = [];
  for (const name of catOrder) ordered.push(...byCat.get(name).map(w => ({ ...w, __cat: name })));

  const size = CHUNK_SIZE[deck] || 8;
  const planRows = ordered.map((w, i) => ({
    id: w.id, chunk: Math.floor(i / size), ord: i % size, category: w.__cat,
  }));
  plan[deck] = planRows;

  report[deck] = catOrder
    .map(name => ({ category: name, count: byCat.get(name).length }))
    .filter(c => c.count > 0);
}

fs.writeFileSync('tools/vocab_tmp/semantic_regroup/plan.json', JSON.stringify(plan));
fs.writeFileSync('tools/vocab_tmp/semantic_regroup/report.json', JSON.stringify(report, null, 1));

console.log('=== category distribution ===');
for (const [deck, cats] of Object.entries(report)) {
  const total = cats.reduce((s, c) => s + c.count, 0);
  console.log(`\n${deck} (${total} слов):`);
  for (const c of cats) {
    const pct = Math.round(c.count / total * 100);
    console.log(`  ${c.category}: ${c.count} (${pct}%)`);
  }
}
