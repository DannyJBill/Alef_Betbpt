/**
 * DecksScreen — 🎁 Бонус (тематические колоды, этап 5).
 *
 * Редизайн 12.08.2026: раньше — сетка квадратиков колод → отдельный экран
 * со списком её групп → сессия. Теперь, по фидбёку («визуально как Слова и
 * Фразы»), — общий счёт сверху (StatBar) + список колод аккордеоном
 * (VocabAccordion), без промежуточного экрана: колода разворачивается на
 * месте, группы (или тематические подсекции DECK_GROUPS — те же самые
 * пять «сквозных» колод, что в semantic_regroup) — внутри неё, без сетки.
 * Каждая колода лениво подгружает свои чанки при первом раскрытии.
 * Слова из Supabase (deck_words), прогресс — user_word_progress, слияние
 * в общий словарь через facts.introduceWord (см. commitResults ниже).
 */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { DECKS, DECKS_BY_ID, loadDeckContent, loadWordProgress, syncWordProgress, deckStats } from "../data/decks";
import { DECK_GROUPS } from "../data/deckGroups";
import { buildSession } from "../helpers/exercises";
import { deckWordMeta } from "../helpers/dictionary";
import { StatBar, Accordion } from "../components/ui/VocabAccordion";
import ExerciseSession from "../components/ui/ExerciseSession";

const KNOWN = p => (p.sm2?.repetitions || 0) >= 2 || (p.correct || 0) >= 3;

// Приведение слова колоды к формату движка (fromReadingItem-совместимо).
// he/ru — для генераторов упражнений (buildSession); hebrew/translation/transliteration/audio —
// для CardsMode (флип-карточки), который читает именно эти имена полей.
const toItem = w => ({
  id: w.id, he: w.hebrew, ru: w.translation, plain: w.plain, type: 'word',
  hebrew: w.hebrew, translation: w.translation, transliteration: w.transliteration, audio: w.audio,
});

export default function DecksScreen({ CardsMode }) {
  const { dark } = useTheme();
  const { stats, recordDeckWords } = useStats();
  const tgId = stats.telegramId;

  const [progress, setProgress] = useState({});   // word_id -> {seen,correct,wrong,sm2,introduced}
  const [chunksByDeck, setChunksByDeck] = useState({}); // deckId -> chunks[] | 'loading'
  const [active, setActive] = useState(null);      // {deckId, chunkIdx, mode:'cards'|'quiz', stage}

  useEffect(() => { if (tgId) loadWordProgress(tgId).then(setProgress).catch(() => {}); }, [tgId]);

  function ensureLoaded(deckId) {
    if (chunksByDeck[deckId]) return;
    setChunksByDeck(m => ({ ...m, [deckId]: 'loading' }));
    loadDeckContent(deckId)
      .then(chunks => setChunksByDeck(m => ({ ...m, [deckId]: chunks })))
      .catch(() => setChunksByDeck(m => ({ ...m, [deckId]: [] })));
  }

  // Записать результаты чанка: в user_word_progress (для % колоды) + слить в
  // основной словарь через facts (helpers/facts.introduceWord) — с
  // meta-снапшотом, иначе слово физически не отрисуется в «Мой словарь»
  // (readingProgress — производное зеркало facts).
  function commitResults(deckId, words, results) {
    const deck = DECKS_BY_ID[deckId];
    const updates = words.map(w => {
      const prev = progress[w.id] || { seen: 0, correct: 0, wrong: 0 };
      const r = results[w.id] || {};
      return { word_id: w.id, seen: (prev.seen || 0) + 1,
        correct: (prev.correct || 0) + (r.ok ? 1 : 0),
        wrong: (prev.wrong || 0) + (r.ok === false ? 1 : 0), introduced: true };
    });
    setProgress(p => { const n = { ...p }; updates.forEach(u => n[u.word_id] = u); return n; });
    if (tgId) syncWordProgress(tgId, updates).catch(() => {});
    recordDeckWords(words.map(w => ({
      id: w.id, meta: deckWordMeta(w, deck), ok: results[w.id]?.ok,
    })));
  }

  // ── Сессия изучения/проверки группы — на весь экран ──
  if (active) {
    const chunks = chunksByDeck[active.deckId];
    const words = chunks[active.chunkIdx].words;
    const src = words.map(toItem);
    const title = `${DECKS_BY_ID[active.deckId].title} · группа ${active.chunkIdx + 1}`;

    // «Изучить»: сначала флип-карточки, затем проверка БЕЗ ЗАЧЁТА (тренировка)
    if (active.mode === 'cards' && active.stage !== 'check') {
      return <CardsMode items={words} blockN={active.deckId} dark={dark}
        onReview={() => {}}
        onBack={() => setActive({ ...active, stage: 'check' })} />;
    }

    const graded = active.mode === 'quiz';
    const plan = [
      { gen: 'word_ru', sources: src, pool: src, take: Math.ceil(words.length / 2) },
      { gen: 'word_he', sources: src, pool: src, take: Math.floor(words.length / 2) },
    ];
    return <ChunkSession words={words} plan={plan} dark={dark}
      title={graded ? title : `${title} · тренировка`}
      onDone={(res) => { commitResults(active.deckId, words, graded ? res : {}); setActive(null); }}
      onBack={() => setActive(null)} />;
  }

  // ── Список колод — общий счёт + аккордеон ──
  let totalAll = 0, knownAll = 0;
  for (const d of DECKS) totalAll += d.wordCount;
  for (const [id, p] of Object.entries(progress)) if (id.startsWith('d_') && KNOWN(p)) knownAll++;

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className={`rounded-2xl border p-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <StatBar dark={dark} total={totalAll} known={knownAll} upcoming={totalAll - knownAll} />
        <p className="text-[11px] text-gray-400 text-center">{DECKS.length} колод · слова падают в твой словарь</p>
      </div>

      {DECKS.map(d => {
        const st = deckStats(d, progress);
        const chunks = chunksByDeck[d.id];
        return (
          <Accordion key={d.id} dark={dark} icon={d.icon} title={d.title}
            sub={`${st.learned}/${d.wordCount} изучено · ${st.knownPct}% знания`}
            iconCls={dark ? "bg-gray-800 text-indigo-300 border-indigo-500/30" : "bg-white text-indigo-600 border-indigo-100"}
            onToggle={open => open && ensureLoaded(d.id)}>
            {!chunks || chunks === 'loading' ? (
              <p className="text-xs text-gray-400 px-1">Загрузка…</p>
            ) : DECK_GROUPS[d.id] ? (
              <div className="flex flex-col gap-2">
                {DECK_GROUPS[d.id].map((group, gi) => (
                  <DeckThemeGroup key={gi} deckId={d.id} group={group} chunks={chunks} progress={progress} dark={dark}
                    onStudy={i => setActive({ deckId: d.id, chunkIdx: i, mode: 'cards' })}
                    onCheck={i => setActive({ deckId: d.id, chunkIdx: i, mode: 'quiz' })} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {chunks.map((ch, i) => (
                  <ChunkCard key={i} i={i} ch={ch} progress={progress} dark={dark}
                    onStudy={() => setActive({ deckId: d.id, chunkIdx: i, mode: 'cards' })}
                    onCheck={() => setActive({ deckId: d.id, chunkIdx: i, mode: 'quiz' })} />
                ))}
              </div>
            )}
          </Accordion>
        );
      })}
    </div>
  );
}

// Карточка одной группы (чанка) — «Изучить» / «Проверить».
function ChunkCard({ i, ch, progress, dark, onStudy, onCheck }) {
  const done = ch.words.filter(w => progress[w.id]?.introduced).length;
  return (
    <div className={`rounded-2xl border p-3.5 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>Группа {i + 1}</span>
        <span className="text-xs text-gray-400">{done}/{ch.words.length}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onStudy}
          className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600">📖 Изучить</button>
        <button onClick={onCheck} disabled={done === 0}
          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 disabled:opacity-40 ${dark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>✅ Проверить</button>
      </div>
    </div>
  );
}

// Тематическая подсекция «сквозной» колоды (g_nouns/g_adjectives/g_verbs/conj/
// g_phrases) — вложенный аккордеон внутри аккордеона колоды.
function DeckThemeGroup({ group, chunks, progress, dark, onStudy, onCheck }) {
  const range = chunks.slice(group.chunkStart, group.chunkEnd + 1);
  const total = range.reduce((s, ch) => s + ch.words.length, 0);
  const done = range.reduce((s, ch) => s + ch.words.filter(w => progress[w.id]?.introduced).length, 0);
  return (
    <Accordion dark={dark} icon="🏷️" title={group.name} sub={`${range.length} ${range.length === 1 ? "группа" : "групп"} · ${done}/${total} изучено`}
      iconCls={dark ? "bg-gray-900 text-gray-400 border-gray-700" : "bg-gray-50 text-gray-500 border-gray-200"}>
      {range.map((ch, ri) => {
        const i = group.chunkStart + ri;
        return <ChunkCard key={i} i={i} ch={ch} progress={progress} dark={dark}
          onStudy={() => onStudy(i)} onCheck={() => onCheck(i)} />;
      })}
    </Accordion>
  );
}

// Обёртка сессии: собирает результаты по слову и отдаёт onDone
function ChunkSession({ words, plan, dark, title, onDone, onBack }) {
  const questions = useRef(buildSession(plan)).current;
  const results = useRef({}).current;
  return <ExerciseSession questions={questions} dark={dark} title={title}
    accent={{ grad: "from-indigo-500 to-purple-600", fill: "bg-indigo-500" }}
    onAnswer={(id, ok) => { if (id) results[id] = { ok }; }}
    onFinish={() => onDone(results)} onBack={onBack} />;
}
