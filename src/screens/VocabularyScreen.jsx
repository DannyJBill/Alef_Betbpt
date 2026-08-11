/**
 * VocabularyScreen — 📚 Мой словарь (редизайн v2, 4 вкладки).
 *
 * Раньше — переключатель из 3 режимов («Все слова» / «По урокам» / «По темам»)
 * + отдельная кнопка «Буквы» сверху (см. git-историю). Теперь — 4 постоянные
 * вкладки, каждая со своей плашкой статистики (Всего/Знаешь/Предстоит) и
 * кнопкой «Повторить» сверху:
 *   🔤 Буквы и Огласовки — список (не сессия) по группам LETTER_GROUPS/
 *      NIKUD_GROUPS, «Повторить» ведёт на CardsScreen (тренажёр букв).
 *      Огласовки без своего тренажёра на этом этапе — read-only.
 *   📝 Слова / 💬 Фразы — список изученных слов/фраз, аккордеон модуль
 *      (COURSE_PATH) → урок (READING_BLOCKS), см. groupByLessonBlock.
 *      «Повторить» задизейблена — «в разработке».
 *   🎁 Бонус — тематические колоды (DecksScreen), встроены напрямую как
 *      постоянная вкладка (без onBack — это больше не отдельный экран).
 * Макет утверждён 11.08.2026 (mockups/vocab-screen-v2.html), см. обсуждение
 * в истории чата — это перенос того же дизайна в реальный код.
 */
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { ALL_LETTERS, LETTER_GROUPS, NIKUD, NIKUD_GROUPS } from "../data/alphabet";
import { GROUP_COLORS } from "../helpers/groupHelpers";
import { getSectionTheme } from "../data/pathTheme";
import { getNodeStatus } from "../data/curriculum";
import { DECKS_UNLOCK_NODE } from "../data/decks";
import { READING_ITEMS } from "../data/reading";
import {
  dictionaryEntries, groupByLessonBlock, statusOf, sourceBadge, metaOf, playAudio,
} from "../helpers/dictionary";
import { CardsMode, PhraseLocksSection } from "./ReadingScreen";
import DecksScreen from "./DecksScreen";
import CardsScreen from "./CardsScreen";

const WORDS_TOTAL   = READING_ITEMS.filter(i => i.type !== 'phrase').length;
const PHRASES_TOTAL = READING_ITEMS.filter(i => i.type === 'phrase').length;

const TABS = [
  { id: 'letters', icon: '🔤', label: 'Буквы и Огласовки' },
  { id: 'words',   icon: '📝', label: 'Слова' },
  { id: 'phrases', icon: '💬', label: 'Фразы' },
  { id: 'bonus',   icon: '🎁', label: 'Бонус' },
];

// ─── Общие мелкие блоки ─────────────────────────────────────────────────────

function StatBar({ dark, total, known, upcoming }) {
  return (
    <div className="flex justify-around text-center mb-3">
      <div><p className={`text-xl font-black ${dark ? "text-white" : "text-gray-900"}`}>{total}</p><p className="text-xs text-gray-400">всего</p></div>
      <div><p className="text-xl font-black text-emerald-500">{known}</p><p className="text-xs text-gray-400">знаешь</p></div>
      <div><p className="text-xl font-black text-rose-400">{upcoming}</p><p className="text-xs text-gray-400">предстоит</p></div>
    </div>
  );
}

function RepeatButton({ dark, onClick, disabled }) {
  if (disabled) {
    return (
      <button disabled className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-between
        ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"} cursor-not-allowed`}>
        <span>🔄 Повторить</span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">🔒 в разработке</span>
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
      🔄 Повторить
    </button>
  );
}

function Accordion({ dark, icon, iconCls, title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full p-3.5 flex items-center gap-3 text-left">
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${iconCls}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>{title}</p>
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        </div>
        <span className="shrink-0 text-gray-400 text-xs">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

function SearchInput({ dark, q, setQ, placeholder }) {
  return (
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none
        ${dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`} />
  );
}

// ─── Вкладка 1 — Буквы и Огласовки ──────────────────────────────────────────

function symbolStatus(sm2) {
  const reps = sm2?.repetitions || 0;
  if (reps >= 2) return "bg-emerald-500";
  if (reps > 0) return "bg-amber-400";
  return "bg-gray-300 dark:bg-gray-600";
}

function SymbolRow({ dark, symbol, name, sub, sm2 }) {
  return (
    <div className="flex items-center gap-3 px-1 py-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${symbolStatus(sm2)}`} />
      <span className="text-lg font-bold w-10 shrink-0" style={{ fontFamily: "serif" }} dir="rtl">{symbol}</span>
      <span className={`text-sm flex-1 truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>{name}{sub ? ` — ${sub}` : ''}</span>
    </div>
  );
}

function LettersTab({ dark, stats }) {
  const [q, setQ] = useState('');
  const [showCards, setShowCards] = useState(false);
  const query = q.trim().toLowerCase();

  const unlockedGroups = LETTER_GROUPS.filter(g => stats.progress?.letters?.[g.id] !== 'locked');
  const unlockedVowelGroups = NIKUD_GROUPS.filter(g => ['done', 'available'].includes(stats.progress?.sounds?.[g.id]));

  const lettersOf = g => ALL_LETTERS.filter(l => g.letterIds.includes(l.id));
  const vowelsOf = g => NIKUD.filter(v => g.vowelIds.includes(v.id));

  const totalLetters = unlockedGroups.reduce((n, g) => n + lettersOf(g).length, 0);
  const totalVowels = unlockedVowelGroups.reduce((n, g) => n + vowelsOf(g).length, 0);
  const knownLetters = unlockedGroups.reduce((n, g) => n + lettersOf(g).filter(l => (stats.cardReviews?.[l.id]?.repetitions || 0) >= 2).length, 0);
  const knownVowels = unlockedVowelGroups.reduce((n, g) => n + vowelsOf(g).filter(v => (stats.vowelReviews?.[v.id]?.repetitions || 0) >= 2).length, 0);

  if (showCards) return <CardsScreen onBack={() => setShowCards(false)} />;

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className={`rounded-2xl border p-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <StatBar dark={dark} total={`${totalLetters}+${totalVowels}`} known={knownLetters + knownVowels}
          upcoming={(totalLetters + totalVowels) - (knownLetters + knownVowels)} />
        <RepeatButton dark={dark} onClick={() => setShowCards(true)} />
      </div>

      <SearchInput dark={dark} q={q} setQ={setQ} placeholder="Поиск по буквам и огласовкам…" />

      <Accordion dark={dark} icon="🔤" title="Алфавит и звуки" sub={`${totalLetters + totalVowels} изучено`}
        iconCls={dark ? "bg-gray-800 text-indigo-300 border-indigo-500/30" : "bg-white text-indigo-600 border-indigo-100"}
        defaultOpen>
        {totalLetters > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 px-1">Буквы</p>
            {unlockedGroups.map(g => {
              const c = GROUP_COLORS[g.color];
              const rows = lettersOf(g).filter(l => !query || l.name.toLowerCase().includes(query) || l.symbol.includes(q));
              if (!rows.length) return null;
              return (
                <div key={g.id} className={`rounded-xl border-l-[3px] p-2 ${c.border} ${c.bg}`}>
                  <p className={`text-[11px] font-bold px-1 mb-1 ${c.text}`}>{g.name}</p>
                  <div className={`flex flex-col divide-y ${dark ? "divide-gray-700/60" : "divide-gray-200/60"}`}>
                    {rows.map(l => (
                      <SymbolRow key={l.id} dark={dark} symbol={l.symbol} name={l.name} sub={`«${l.sound}»`}
                        sm2={stats.cardReviews?.[l.id]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalVowels > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 px-1 mt-1">Огласовки</p>
            {unlockedVowelGroups.map(g => {
              const c = GROUP_COLORS[g.color] || GROUP_COLORS.emerald;
              const rows = vowelsOf(g).filter(v => !query || v.name.toLowerCase().includes(query) || v.symbol.includes(q));
              return (
                <div key={g.id} className={`rounded-xl border-l-[3px] p-2 ${c.border} ${c.bg}`}>
                  <p className={`text-[11px] font-bold px-1 mb-1 ${c.text}`}>{g.name}</p>
                  {rows.length > 0 && (
                    <div className={`flex flex-col divide-y ${dark ? "divide-gray-700/60" : "divide-gray-200/60"}`}>
                      {rows.map(v => (
                        <SymbolRow key={v.id} dark={dark} symbol={v.symbol} name={v.name} sub={v.sound ? `«${v.sound}»` : 'молчит'}
                          sm2={stats.vowelReviews?.[v.id]} />
                      ))}
                    </div>
                  )}
                  {g.conceptExample && !query && (
                    <div className={`mt-1 rounded-lg px-2 py-1.5 ${dark ? "bg-gray-900/40" : "bg-white/60"}`}>
                      <span className="text-base font-bold" style={{ fontFamily: "serif" }} dir="rtl">
                        {g.conceptExample.syllables.join(" · ")}
                      </span>
                      <span className={`text-xs ml-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                        {g.conceptExample.transliteration} — {g.conceptExample.translation}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Accordion>
    </div>
  );
}

// ─── Вкладка 2/3 — Слова / Фразы (общий рендер) ─────────────────────────────

function WordRow({ dark, entry }) {
  const st = statusOf(entry.progress);
  const badge = sourceBadge(entry.source);
  return (
    <div className="flex items-center gap-3 px-1 py-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} title={st.label} />
      <span className={`text-base font-bold shrink-0 w-24 truncate ${dark ? "text-white" : "text-gray-900"}`} dir="rtl">{entry.hebrew}</span>
      <div className="min-w-0 flex-1 text-left">
        <p className={`text-sm truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>{entry.translation}</p>
      </div>
      {entry.audio && (
        <button onClick={() => playAudio(entry.audio)} className="text-sm shrink-0 active:scale-95" aria-label="Озвучить">🔊</button>
      )}
      {badge && <span className="text-[10px] text-gray-400 shrink-0">{badge.icon}</span>}
    </div>
  );
}

function LessonListTab({ dark, stats, phrase, total }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const entries = dictionaryEntries(stats).filter(e => phrase ? e.type === 'phrase' : e.type !== 'phrase');
  const known = entries.filter(e => statusOf(e.progress).label === 'знаю').length;
  const chapters = groupByLessonBlock(stats, { phrase });

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className={`rounded-2xl border p-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <StatBar dark={dark} total={total} known={known} upcoming={Math.max(0, total - entries.length)} />
        <RepeatButton dark={dark} disabled />
      </div>

      {phrase && <PhraseLocksSection studied={stats.readingProgress?.studied || []} dark={dark} />}

      <SearchInput dark={dark} q={q} setQ={setQ} placeholder={phrase ? "Поиск по фразам…" : "Поиск по словам…"} />

      {chapters.length === 0 ? (
        <p className={`text-sm text-center py-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {phrase ? "Фразы пока не изучены — они появятся здесь по мере прохождения уроков." : "Слова пока не изучены."}
        </p>
      ) : chapters.map(ch => {
        const theme = getSectionTheme(ch.id, dark);
        const blocks = ch.blocks
          .map(b => ({ ...b, words: query ? b.words.filter(e => e.translation.toLowerCase().includes(query) || (e.plain || '').includes(q) || e.hebrew.includes(q)) : b.words }))
          .filter(b => b.words.length > 0);
        if (!blocks.length) return null;
        const chTotal = ch.blocks.reduce((n, b) => n + b.words.length, 0);
        return (
          <Accordion key={ch.id} dark={dark} icon={ch.icon} title={ch.title} sub={`${chTotal} изучено`}
            iconCls={theme.icon} defaultOpen={chapters.length === 1}>
            {blocks.map(b => (
              <div key={b.id} className={`rounded-xl border-l-[3px] p-2 ${dark ? "border-gray-600 bg-gray-700/30" : "border-gray-300 bg-gray-50"}`}>
                <p className={`text-[11px] font-bold px-1 mb-1 ${dark ? "text-gray-300" : "text-gray-600"}`}>{b.title}</p>
                <div className={`flex flex-col divide-y ${dark ? "divide-gray-700/60" : "divide-gray-200/60"}`}>
                  {b.words.map(e => <WordRow key={e.id} dark={dark} entry={e} />)}
                </div>
              </div>
            ))}
          </Accordion>
        );
      })}
    </div>
  );
}

// ─── Главный экран ──────────────────────────────────────────────────────────

export default function VocabularyScreen() {
  const { dark } = useTheme();
  const { stats } = useStats();
  const [tab, setTab] = useState('letters');

  const decksUnlocked = !DECKS_UNLOCK_NODE || getNodeStatus(DECKS_UNLOCK_NODE, stats) === 'done';

  return (
    <div className="pb-24 max-w-md mx-auto pt-4 flex flex-col gap-3">
      <h2 className={`text-xl font-bold px-4 ${dark ? "text-white" : "text-gray-900"}`}>Словарь</h2>

      <div className="px-4">
        <div className={`grid grid-cols-4 gap-1 rounded-2xl p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all
                ${tab === t.id
                  ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow"
                  : dark ? "text-gray-400" : "text-gray-500"}`}>
              <span className="text-base">{t.icon}</span>
              <span className="truncate w-full text-center">{t.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'letters' && <LettersTab dark={dark} stats={stats} />}
      {tab === 'words'   && <LessonListTab dark={dark} stats={stats} phrase={false} total={WORDS_TOTAL} />}
      {tab === 'phrases' && <LessonListTab dark={dark} stats={stats} phrase total={PHRASES_TOTAL} />}
      {tab === 'bonus' && (
        decksUnlocked
          ? <DecksScreen CardsMode={CardsMode} />
          : <p className={`text-sm text-center py-6 px-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>Откроется после уровня 4</p>
      )}
    </div>
  );
}
