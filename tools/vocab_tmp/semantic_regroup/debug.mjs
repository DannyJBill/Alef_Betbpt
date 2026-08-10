import fs from 'fs';
import { TAXONOMY } from './taxonomy.mjs';

const data = JSON.parse(fs.readFileSync('tools/vocab_tmp/semantic_regroup/backup_original.json', 'utf8'));
const [deck, wantCat, limit] = process.argv.slice(2);

const CYR = 'а-яёa-z';
const reCache = new Map();
function kwRegex(rawKw) {
  if (reCache.has(rawKw)) return reCache.get(rawKw);
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
    const hit = cat.words.find(kw => kwRegex(kw).test(t));
    if (hit) return { name: cat.name, hit };
  }
  return { name: 'Прочее', hit: null };
}

const rows = data[deck];
const categories = TAXONOMY[deck];
let n = 0;
for (const w of rows) {
  const c = classify(w, categories);
  if (c.name === wantCat) {
    console.log(w.plain, '|', w.translation, '|hit:', c.hit);
    if (++n >= (Number(limit) || 30)) break;
  }
}
console.log('...total shown', n);
