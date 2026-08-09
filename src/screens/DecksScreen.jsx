/**
 * DecksScreen — 📦 тематические колоды (этап 5).
 * Список колод (прогресс) → чанки → изучить (карточки) / проверить (квиз).
 * Слова из Supabase (deck_words), прогресс — user_word_progress, слияние в словарь.
 */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { DECKS, DECKS_BY_ID, loadDeckContent, loadWordProgress, syncWordProgress, deckStats } from "../data/decks";
import { buildSession } from "../helpers/exercises";
import { deckWordMeta } from "../helpers/dictionary";
import ExerciseSession from "../components/ui/ExerciseSession";

// Приведение слова колоды к формату движка (fromReadingItem-совместимо).
// he/ru — для генераторов упражнений (buildSession); hebrew/translation/transliteration/audio —
// для CardsMode (флип-карточки), который читает именно эти имена полей.
const toItem = w => ({
  id: w.id, he: w.hebrew, ru: w.translation, plain: w.plain, type: 'word',
  hebrew: w.hebrew, translation: w.translation, transliteration: w.transliteration, audio: w.audio,
});

export default function DecksScreen({ onBack, CardsMode }) {
  const { dark } = useTheme();
  const { stats, recordDeckWords } = useStats();
  const tgId = stats.telegramId;

  const [progress, setProgress] = useState({});   // word_id -> {seen,correct,wrong,sm2,introduced}
  const [deckId, setDeckId] = useState(null);
  const [chunks, setChunks] = useState(null);
  const [active, setActive] = useState(null);      // {chunkIdx, mode:'cards'|'quiz'}

  useEffect(() => { if (tgId) loadWordProgress(tgId).then(setProgress).catch(() => {}); }, [tgId]);

  // Открыть колоду → загрузить её чанки
  function openDeck(id) {
    setDeckId(id); setChunks(null);
    loadDeckContent(id).then(setChunks).catch(() => setChunks([]));
  }

  // Записать результаты чанка: в user_word_progress (для % колоды на её экране)
  // + слить в основной словарь через facts (helpers/facts.introduceWord) —
  // с meta-снапшотом, иначе слово физически не сможет отрисоваться в «Мой
  // словарь» (readingProgress — производное зеркало facts, регенерируется
  // при каждой миграции; прямой патч readingProgress не переживал перезагрузку).
  function commitResults(words, results) {
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

  // ── Сессия изучения/проверки группы ──
  if (active && chunks) {
    const words = chunks[active.chunkIdx].words;
    const src = words.map(toItem);
    const title = `${DECKS_BY_ID[deckId].title} · группа ${active.chunkIdx + 1}`;

    // «Изучить»: сначала флип-карточки, затем проверка БЕЗ ЗАЧЁТА (тренировка)
    if (active.mode === 'cards' && active.stage !== 'check') {
      return <CardsMode items={words} blockN={deckId} dark={dark}
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
      onDone={(res) => { commitResults(words, graded ? res : {}); setActive(null); }}
      onBack={() => setActive(null)} />;
  }

  // ── Список чанков колоды ──
  if (deckId) {
    const deck = DECKS_BY_ID[deckId];
    const st = deckStats(deck, progress);
    return (
      <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
        <button onClick={() => { setDeckId(null); setChunks(null); }}
          className={`flex items-center gap-1 mb-3 text-sm font-medium ${dark ? "text-indigo-400" : "text-indigo-600"}`}>← Колоды</button>
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{deck.icon} {deck.title}</h2>
        <p className="text-sm text-gray-400 mb-4">{st.learned} из {st.total} изучено · {st.knownPct}% знания</p>
        {!chunks ? <p className="text-sm text-gray-400">Загрузка…</p> : (
          <div className="flex flex-col gap-2">
            {chunks.map((ch, i) => {
              const done = ch.words.filter(w => progress[w.id]?.introduced).length;
              return (
                <div key={i} className={`rounded-2xl border p-3.5 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>Группа {i + 1}</span>
                    <span className="text-xs text-gray-400">{done}/{ch.words.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActive({ chunkIdx: i, mode: 'cards' })}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600">📖 Изучить</button>
                    <button onClick={() => setActive({ chunkIdx: i, mode: 'quiz' })} disabled={done === 0}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 disabled:opacity-40 ${dark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>✅ Проверить</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Список колод ──
  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      {onBack && <button onClick={onBack}
        className={`flex items-center gap-1 mb-3 text-sm font-medium ${dark ? "text-indigo-400" : "text-indigo-600"}`}>← Словарь</button>}
      <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>📦 Ещё слова</h2>
      <p className="text-sm text-gray-400 mb-4">Тематические колоды · слова падают в твой словарь</p>
      <div className="grid grid-cols-2 gap-2">
        {DECKS.map(d => {
          const st = deckStats(d, progress);
          return (
            <button key={d.id} onClick={() => openDeck(d.id)}
              className={`rounded-2xl border p-3 text-left ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              <div className="text-2xl mb-1">{d.icon}</div>
              <p className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>{d.title}</p>
              <p className="text-xs text-gray-400">{st.learned}/{d.wordCount} · {st.knownPct}%</p>
              <div className={`h-1 rounded-full mt-1.5 ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${d.wordCount ? Math.round(st.learned / d.wordCount * 100) : 0}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
