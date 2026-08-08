// tools/vocab/import_bet_packs.mjs
//
// Импорт двух курируемых Anki-колод в deck_words (одноразовый, но
// идемпотентный — upsert по id, безопасно перезапускать):
//   1. Hebrew-Russian_Bet__Audio.apkg — существительные/прилагательные/
//      глаголы/служебные слова с реальным аудио (не TTS), никудом,
//      русским переводом, корнем/биньяном/спряжениями.
//   2. 100____RU-HE_TeachMeHebrewcom.apkg — разговорные фразы.
// См. план и обоснование в BACKLOG.md / истории сессии.
//
// Категории → колоды:
//   По_типу_существительных     → g_nouns       (как есть)
//   По_типу_прилагательных      → g_adjectives  (2 карточки: м.р.+ж.р.)
//   Глаголы-Иврит                → g_verbs       (только инфинитив;
//                                                  спряжения — в meta)
//   СТП-Иврит (служебные слова)  → conj          (расширяет существующую
//                                                  колоду «Служебные»)
//   100 фраз                     → g_phrases     (новая)
// Пропущено осознанно: По_типу_местоимений (5 заметок, посессивные
// парадигмы — сложные таблицы, не карточка) и Информация (2 заметки,
// справочные — не словарные единицы).
//
// Подготовка (Anki .apkg — это zip; распаковать один раз вручную):
//   unzip -o Hebrew-Russian_Bet__Audio.apkg -d /tmp/bet_audio
//   unzip -o 100____RU-HE_TeachMeHebrewcom.apkg -d /tmp/teachmehebrew100
//
// Запуск:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//     node tools/vocab/import_bet_packs.mjs /tmp/bet_audio /tmp/teachmehebrew100
//
// После импорта прогнать tools/vocab/sync_vocab_items.mjs, чтобы новые
// строки зеркалились в vocab_items.

import { createClient } from '@supabase/supabase-js';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT_AUDIO_DIR = join(ROOT, 'public', 'reading');

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB || !KEY) {
  console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в окружении.');
  process.exit(1);
}
const supabase = createClient(SB, KEY);

const [, , betDir, phrasesDir] = process.argv;
if (!betDir || !phrasesDir) {
  console.error('Использование: node import_bet_packs.mjs <распакованный bet_audio> <распакованный teachmehebrew100>');
  process.exit(1);
}

const SEP = String.fromCharCode(31);
const NIKUD = /[֑-ׇ]/g;
const stripNikud = s => (s || '').replace(NIKUD, '');

function cleanHtml(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/<\/?div[^>]*>/gi, '; ')
    .replace(/<\/?p[^>]*>/gi, '; ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s*;\s*/g, '; ')
    .replace(/(^;\s*|;\s*$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseSounds(s) {
  if (!s) return [];
  return [...s.matchAll(/\[sound:([^\]]+)\]/g)].map(m => m[1]);
}
function mapGender(g) {
  const c = (g || '').trim();
  if (c.startsWith('ז')) return 'm'; // ז'
  if (c.startsWith('נ')) return 'f'; // נ'
  return null;
}
const ext = name => { const m = (name || '').match(/\.([a-zA-Z0-9]+)$/); return m ? m[1].toLowerCase() : 'mp3'; };

function loadMedia(dir) {
  const map = JSON.parse(readFileSync(join(dir, 'media'), 'utf8'));
  const rev = new Map();
  for (const [num, name] of Object.entries(map)) rev.set(name, num);
  return rev;
}

function resolveAudio(sounds, srcDir, revMap, newId) {
  if (!sounds.length) return null;
  const original = sounds[0];
  const num = revMap.get(original);
  if (num === undefined) return null;
  const srcPath = join(srcDir, num);
  if (!existsSync(srcPath)) return null;
  const destName = `${newId}.${ext(original)}`;
  copyFileSync(srcPath, join(OUT_AUDIO_DIR, destName));
  return destName;
}

// ── читаем bet_audio ─────────────────────────────────────────────────────
const betDb = new DatabaseSync(join(betDir, 'collection.anki2'), { readOnly: true });
const betModels = JSON.parse(betDb.prepare('select models from col').get().models);
const betModelNames = {};
for (const id in betModels) betModelNames[id] = betModels[id].name;
const betRows = betDb.prepare('select mid, flds from notes').all()
  .map(r => ({ model: betModelNames[r.mid], f: r.flds.split(SEP) }));
betDb.close();
const betMedia = loadMedia(betDir);

// ── читаем 100 фраз ──────────────────────────────────────────────────────
const phDb = new DatabaseSync(join(phrasesDir, 'collection.anki2'), { readOnly: true });
const phRows = phDb.prepare('select flds from notes').all().map(r => r.flds.split(SEP));
phDb.close();
const phMedia = loadMedia(phrasesDir);

// ── строим строки по категориям ──────────────────────────────────────────
const built = { conj: [], g_nouns: [], g_adjectives: [], g_verbs: [], g_phrases: [] };

for (const { model, f } of betRows.filter(r => r.model === 'СТП-Иврит')) {
  const hebrew = cleanHtml(f[0]), translation = cleanHtml(f[1]);
  const plain = cleanHtml(f[2]) || stripNikud(hebrew);
  built.conj.push({ hebrew, plain, translation, transliteration: null, gender: null, sounds: parseSounds(f[3]), meta: null });
}

for (const { model, f } of betRows.filter(r => r.model === 'По_типу_существительных')) {
  const hebrew = cleanHtml(f[0]);
  const plural = cleanHtml(f[1]), root = cleanHtml(f[2]);
  const plain = cleanHtml(f[3]) || stripNikud(hebrew);
  const gender = mapGender(f[5]);
  const dual = cleanHtml(f[6]);
  const translation = cleanHtml(f[7]);
  const meta = {};
  if (root) meta.root = root;
  if (plural) meta.plural = plural;
  if (dual) meta.dual = dual;
  built.g_nouns.push({ hebrew, plain, translation, transliteration: null, gender, sounds: parseSounds(f[4]), meta: Object.keys(meta).length ? meta : null });
}

for (const { model, f } of betRows.filter(r => r.model === 'По_типу_прилагательных')) {
  const maleVow = cleanHtml(f[0]), femaleVow = cleanHtml(f[1]);
  const malePlain = cleanHtml(f[2]) || stripNikud(maleVow), femalePlain = cleanHtml(f[3]) || stripNikud(femaleVow);
  const translateMale = cleanHtml(f[4]), translateFemale = cleanHtml(f[5]);
  const sounds = parseSounds(f[6]);
  const root = cleanHtml(f[7]);
  const meta = root ? { root } : null;

  const maleSound = sounds[0] ? [sounds[0]] : [];
  let femaleSound = [];
  let femaleNeedsReview = false;
  if (sounds.length > 1 && stripNikud(femalePlain) && sounds[1].includes(stripNikud(femalePlain))) {
    femaleSound = [sounds[1]];
    if (sounds[1].length > femalePlain.length + 20) femaleNeedsReview = true;
  }

  built.g_adjectives.push({ hebrew: maleVow, plain: malePlain, translation: translateMale, transliteration: null, gender: 'm', sounds: maleSound, meta });
  built.g_adjectives.push({
    hebrew: femaleVow, plain: femalePlain, translation: translateFemale, transliteration: null, gender: 'f',
    sounds: femaleSound, meta: femaleNeedsReview ? { ...(meta || {}), audio_may_be_phrase: true } : meta,
  });
}

for (const { model, f } of betRows.filter(r => r.model === 'Глаголы-Иврит')) {
  const infVow = cleanHtml(f[0]), infPlain = cleanHtml(f[1]) || stripNikud(infVow);
  const root = cleanHtml(f[2]), binyan = cleanHtml(f[3]);
  const translation = cleanHtml(f[4]);
  const meta = {
    root: root || undefined, binyan: binyan || undefined,
    past: f[6] ? { vow: cleanHtml(f[5]), plain: cleanHtml(f[6]) } : undefined,
    present: {
      m_sg: f[8] ? { vow: cleanHtml(f[7]), plain: cleanHtml(f[8]) } : undefined,
      f_sg: f[10] ? { vow: cleanHtml(f[9]), plain: cleanHtml(f[10]) } : undefined,
      m_pl: f[12] ? { vow: cleanHtml(f[11]), plain: cleanHtml(f[12]) } : undefined,
      f_pl: f[14] ? { vow: cleanHtml(f[13]), plain: cleanHtml(f[14]) } : undefined,
    },
  };
  built.g_verbs.push({ hebrew: infVow, plain: infPlain, translation, transliteration: null, gender: null, sounds: parseSounds(f[15]), meta });
}

for (const f of phRows) {
  const rawHebrew = f[0];
  const hasVariant = /<p/.test(rawHebrew);
  const hebrew = rawHebrew.split(/<p/)[0].trim();
  const translation = cleanHtml(f[1]);
  const transliteration = cleanHtml(f[3].split(/<br|<div/)[0]);
  let meta = null;
  if (hasVariant) {
    const variantHtml = rawHebrew.split(/<p/).slice(1).map(s => '<p' + s).join('');
    meta = { has_gender_variant: true, variant_hebrew: cleanHtml(variantHtml) };
  }
  built.g_phrases.push({
    hebrew, plain: stripNikud(hebrew), translation, transliteration, gender: null,
    sounds: parseSounds(f[2]), meta, __pack: 'ph',
  });
}

// ── id/chunk/ord + копирование аудио ─────────────────────────────────────
async function existingCount(deckId) {
  const { count } = await supabase.from('deck_words').select('id', { count: 'exact', head: true }).eq('deck', deckId);
  return count || 0;
}

const PAD = { conj: 3, g_nouns: 4, g_adjectives: 4, g_verbs: 3, g_phrases: 3 };
const finalRows = [];

for (const deckId of Object.keys(built)) {
  let idx = await existingCount(deckId);
  const pad = PAD[deckId];
  for (const row of built[deckId]) {
    const id = `d_${deckId}_${String(idx).padStart(pad, '0')}`;
    const chunk = Math.floor(idx / 8);
    const ord = idx % 8;
    const revMap = row.__pack === 'ph' ? phMedia : betMedia;
    const srcDir = row.__pack === 'ph' ? phrasesDir : betDir;
    const audio = resolveAudio(row.sounds, srcDir, revMap, id);
    finalRows.push({
      id, deck: deckId, chunk, ord,
      hebrew: row.hebrew, plain: row.plain, translation: row.translation,
      transliteration: row.transliteration, gender: row.gender, audio, meta: row.meta,
    });
    idx++;
  }
}

console.log(`Собрано ${finalRows.length} строк, копирую аудио уже сделано, пишу в deck_words...`);

const BATCH = 300;
let done = 0;
for (let i = 0; i < finalRows.length; i += BATCH) {
  const batch = finalRows.slice(i, i + BATCH);
  const { error } = await supabase.from('deck_words').upsert(batch, { onConflict: 'id' });
  if (error) throw error;
  done += batch.length;
  console.log(`  ${done}/${finalRows.length}`);
}

console.log('Готово.');
for (const deckId of Object.keys(built)) {
  console.log(`  ${deckId}: +${built[deckId].length}`);
}
console.log('\nДальше: node tools/vocab/sync_vocab_items.mjs, обновить src/data/decks.js (wordCount/chunkCount).');
