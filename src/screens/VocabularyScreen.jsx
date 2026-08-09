/**
 * VocabularyScreen — 📚 Мой словарь (единый экран, вариант 2 из обсуждения).
 *
 * Раньше «словарь» был размазан по экранам: плоский список слов (DictView
 * внутри ReadingScreen), тематические колоды — отдельный полноэкранный переход
 * (DecksScreen через кнопку «Ещё слова»), буквы — ещё один отдельный экран
 * (CardsScreen, вход только с Home/CheatSheet). Разная механика навигации,
 * слова колод физически не попадали в список (см. фикс BUG — helpers/facts.js
 * meta-снапшот).
 *
 * Теперь — один экран с переключателем группировки:
 *   «Все слова»  — плоский список + поиск + фильтр по статусу (как было).
 *   «По урокам»  — аккордеон по модулям курса (COURSE_PATH), только то, что
 *                  уже изучено — это ретроспектива «откуда что взялось», а не
 *                  дублирование прогрессии «Пути».
 *   «По темам»   — тематические колоды (DecksScreen), встроены сюда же:
 *                  выбор темы «замещает» экран целиком (внутри одного и того
 *                  же компонента, без отдельной точки входа), «← Словарь»
 *                  возвращает обратно к переключателю.
 * Буквы — отдельный персистентный блок над переключателем (не «слово» по
 * типу контента, поэтому не влезает ни в один из трёх режимов): открывает
 * существующий CardsScreen тем же способом.
 * Любая активная сессия (карточки/квиз — общесловарные, по модулю, по букве,
 * по колоде) занимает экран целиком — переключатель прячется, чтобы не путать
 * серединой повторения с переключением режима.
 */
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALL_LETTERS, LETTER_GROUPS } from "../data/alphabet";
import { getNodeStatus } from "../data/curriculum";
import { DECKS_UNLOCK_NODE } from "../data/decks";
import {
  dictionaryEntries, groupByLessonChapter, statusOf, sourceBadge, metaOf, playAudio,
} from "../helpers/dictionary";
import { CardsMode, QuizMode, PhraseLocksSection } from "./ReadingScreen";
import DecksScreen from "./DecksScreen";
import CardsScreen from "./CardsScreen";

const MODES = [
  { id: 'all',     label: 'Все слова' },
  { id: 'lessons', label: 'По урокам' },
  { id: 'topics',  label: 'По темам' },
];

function WordRow({ dark, entry }) {
  const st = statusOf(entry.progress);
  const badge = sourceBadge(entry.source);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} title={st.label} />
      <span className={`text-lg font-bold shrink-0 w-24 ${dark ? "text-white" : "text-gray-900"}`} dir="rtl">{entry.hebrew}</span>
      <div className="min-w-0 flex-1 text-left">
        <p className={`text-sm truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>{entry.translation}</p>
        {entry.transliteration && <p className="text-[11px] text-gray-400 truncate">{entry.transliteration}</p>}
      </div>
      {entry.audio && (
        <button onClick={() => playAudio(entry.audio)} className="text-base shrink-0 active:scale-95" aria-label="Озвучить">🔊</button>
      )}
      {badge && <span className="text-[10px] text-gray-400 shrink-0" title={badge.label}>{badge.icon}</span>}
    </div>
  );
}

function ChapterCard({ dark, chapter, expanded, onToggle, onStart, q }) {
  const words = q.trim()
    ? chapter.words.filter(e =>
        e.translation.toLowerCase().includes(q.toLowerCase()) ||
        (e.plain || '').includes(q) || e.hebrew.includes(q))
    : chapter.words;
  if (q.trim() && words.length === 0) return null;
  const known = chapter.words.filter(e => statusOf(e.progress).label === 'знаю').length;

  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
      <div role="button" tabIndex={0} onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
        <span className="text-xl shrink-0">{chapter.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold truncate ${dark ? "text-white" : "text-gray-900"}`}>{chapter.title}</p>
          <p className="text-xs text-gray-400">{chapter.words.length} слов · {known} знаю</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onStart('cards', chapter.words); }}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-700"}`}>
          🃏
        </button>
        <button onClick={e => { e.stopPropagation(); onStart('quiz', chapter.words); }}
          disabled={chapter.words.length < 4}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-30 ${dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-700"}`}>
          ✅
        </button>
        <span className="shrink-0 text-gray-400 text-xs">{expanded ? "▴" : "▾"}</span>
      </div>
      {expanded && (
        <div className={`divide-y ${dark ? "divide-gray-700" : "divide-gray-100"}`}>
          {words.map(e => <WordRow key={e.id} dark={dark} entry={e} />)}
        </div>
      )}
    </div>
  );
}

export default function VocabularyScreen() {
  const { dark } = useTheme();
  const { stats, recordWordReview, recordWordAnswer, getDueCards } = useStats();

  const [mode, setMode] = useState('all');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all|знаю|слабое
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [session, setSession] = useState(null); // { type:'cards'|'quiz', items, pool, blockN }
  const [lettersOpen, setLettersOpen] = useState(false);

  const decksUnlocked = !DECKS_UNLOCK_NODE || getNodeStatus(DECKS_UNLOCK_NODE, stats) === 'done';
  const studied = stats.readingProgress?.studied || [];
  const allEntries = dictionaryEntries(stats).filter(e => e.type !== 'phrase');
  const known = allEntries.filter(e => statusOf(e.progress).label === 'знаю').length;
  const weak  = allEntries.filter(e => statusOf(e.progress).label === 'слабое').length;

  const unlockedLetters = ALL_LETTERS.filter(l =>
    LETTER_GROUPS.find(g => g.letterIds.includes(l.id) && stats.progress?.letters?.[g.id] !== 'locked'));
  const dueLetters = unlockedLetters.length ? getDueCards(unlockedLetters).length : 0;

  function startSession(type, items) {
    setSession({ type, items, pool: items, blockN: 'chapter' });
  }
  function startDictSession(type) {
    const weight = e => (e.progress.wrong || 0) * 100 - (e.progress.correct || 0) * 10 - (e.progress.seen || 0);
    const items = [...allEntries].sort((a, b) => weight(b) - weight(a));
    setSession({ type, items, pool: allEntries, blockN: 'dict' });
  }

  // ── Активная сессия — экран целиком, переключатель спрятан ──
  if (session) {
    const byId = Object.fromEntries(session.items.map(e => [e.id, e]));
    const common = { items: session.items, pool: session.pool, blockN: session.blockN, dark, onBack: () => setSession(null) };
    return session.type === 'cards'
      ? <CardsMode {...common} onReview={(id, qlt) => recordWordReview(id, qlt, metaOf(byId[id]))} />
      : <QuizMode {...common} onAnswer={(id, ok) => recordWordAnswer(id, ok, metaOf(byId[id]))} />;
  }

  // ── Буквы — существующий CardsScreen целиком, возврат сюда ──
  if (lettersOpen) return <CardsScreen onBack={() => setLettersOpen(false)} />;

  // ── По темам — существующий DecksScreen целиком, возврат сюда ──
  if (mode === 'topics') return <DecksScreen onBack={() => setMode('all')} CardsMode={CardsMode} />;

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 flex flex-col gap-3">
      <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Словарь</h2>

      {/* Сводка — числа кликабельны: фильтр по статусу (применяется в «Все слова» и «По урокам») */}
      <div className={`rounded-2xl border p-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="flex justify-around text-center mb-3">
          {[
            { key: 'all',    val: allEntries.length, label: 'в словаре', cls: dark ? "text-white" : "text-gray-900" },
            { key: 'знаю',   val: known,              label: 'знаю',      cls: "text-emerald-500" },
            { key: 'слабое', val: weak,               label: 'слабых',    cls: "text-rose-400" },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(f => f === s.key ? 'all' : s.key)}
              className={`text-center rounded-xl px-1 py-0.5 transition-all ${statusFilter === s.key ? (dark ? "bg-gray-700" : "bg-gray-100") : ""}`}>
              <p className={`text-xl font-black ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => startDictSession('cards')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
            🃏 Повторить всё
          </button>
          <button onClick={() => startDictSession('quiz')} disabled={allEntries.length < 4}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 disabled:opacity-40 ${dark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}>
            ✅ Проверить всё
          </button>
        </div>
      </div>

      {/* Буквы — отдельный тип контента, персистентный блок над переключателем слов */}
      {unlockedLetters.length > 0 && (
        <button onClick={() => setLettersOpen(true)}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <span className="text-2xl shrink-0">🔤</span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Буквы</p>
            <p className="text-xs text-gray-400">{unlockedLetters.length} изучено{dueLetters > 0 ? ` · ${dueLetters} на сегодня` : ''}</p>
          </div>
          <span className="text-gray-400 text-xs">→</span>
        </button>
      )}

      {/* Фразы-замки: «ты уже можешь сказать» */}
      <PhraseLocksSection studied={studied} dark={dark} />

      {/* Переключатель группировки */}
      <div className={`flex rounded-2xl p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
        {MODES.map(m => (
          <button key={m.id}
            onClick={() => m.id === 'topics' ? (decksUnlocked && setMode('topics')) : setMode(m.id)}
            disabled={m.id === 'topics' && !decksUnlocked}
            title={m.id === 'topics' && !decksUnlocked ? "Откроется после уровня 4" : undefined}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40
              ${mode === m.id ? (dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow") : (dark ? "text-gray-400" : "text-gray-500")}`}>
            {m.id === 'topics' && !decksUnlocked ? `🔒 ${m.label}` : m.label}
          </button>
        ))}
      </div>

      {/* Поиск */}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по словарю…"
        className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none
          ${dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`} />

      {allEntries.length === 0 ? (
        <div className="pt-6 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Словарь пока пуст. Проходи уроки — новые слова из порций накапливаются здесь.
          </p>
        </div>
      ) : mode === 'lessons' ? (
        <div className="flex flex-col gap-2">
          {groupByLessonChapter(stats).map(ch => (
            <ChapterCard key={ch.id} dark={dark} chapter={ch} q={q}
              expanded={expandedChapter === ch.id}
              onToggle={() => setExpandedChapter(x => x === ch.id ? null : ch.id)}
              onStart={startSession} />
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border divide-y ${dark ? "bg-gray-800 border-gray-700 divide-gray-700" : "bg-white border-gray-100 divide-gray-100"}`}>
          {(() => {
            let shown = allEntries;
            if (statusFilter !== 'all') shown = shown.filter(e => statusOf(e.progress).label === statusFilter);
            if (q.trim()) shown = shown.filter(e =>
              e.translation.toLowerCase().includes(q.toLowerCase()) ||
              (e.plain || '').includes(q) || e.hebrew.includes(q));
            return shown.length
              ? shown.map(e => <WordRow key={e.id} dark={dark} entry={e} />)
              : <p className="px-4 py-6 text-center text-sm text-gray-400">Ничего не найдено</p>;
          })()}
        </div>
      )}
    </div>
  );
}
