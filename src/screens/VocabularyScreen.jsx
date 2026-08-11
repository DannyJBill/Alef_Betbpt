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
 *      «Повторить» задизейблена — «в разработке». Во «Фразах» открытые
 *      комбо-фразы (PHRASE_LOCKS) вшиты внутрь модуля, который их
 *      фактически открыл (phraseLocksByChapter) — не отдельным
 *      всегда-раскрытым списком, как было раньше (PhraseLocksSection).
 *   🎁 Бонус — тематические колоды (DecksScreen), встроены напрямую как
 *      постоянная вкладка, тем же визуальным языком (счёт + аккордеон
 *      колод вместо сетки квадратиков) — см. DecksScreen.jsx.
 * Макет утверждён 11.08.2026 (mockups/vocab-screen-v2.html); правки
 * 12.08.2026 по фидбэку — числа Всего/Знаешь/Предстоит должны биться
 * (Предстоит = total - known, а не total - studied), комбо-фразы внутри
 * модулей, «Бонус» в общем визуальном языке (StatBar/Accordion — вынесены
 * в components/ui/VocabAccordion.jsx, общие с DecksScreen).
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
  dictionaryEntries, groupByLessonBlock, phraseLocksByChapter, statusOf, sourceBadge, playAudio,
} from "../helpers/dictionary";
import { StatBar, RepeatButton, Accordion, SearchInput } from "../components/ui/VocabAccordion";
import { CardsMode } from "./ReadingScreen";
import DecksScreen from "./DecksScreen";
import CardsScreen from "./CardsScreen";

const WORDS_TOTAL   = READING_ITEMS.filter(i => i.type !== 'phrase').length;
const PHRASES_TOTAL = READING_ITEMS.filter(i => i.type === 'phrase').length;

const TABS = [
  { id: 'letters', icon: '🔤', label: 'Буквы' },
  { id: 'words',   icon: '📝', label: 'Слова' },
  { id: 'phrases', icon: '💬', label: 'Фразы' },
  { id: 'bonus',   icon: '🎁', label: 'Бонус' },
];

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

/** Строка комбо-фразы (PHRASE_LOCKS) — тот же вид, что WordRow, но без
 * статус-точки (это не запись словаря, а производная от известных слов). */
function ComboPhraseRow({ dark, p }) {
  return (
    <div className="flex items-center gap-3 px-1 py-1.5">
      <span className="w-2 h-2 shrink-0" />
      <span className={`text-base font-bold shrink-0 w-24 truncate ${dark ? "text-white" : "text-gray-900"}`} dir="rtl">{p.hebrew}</span>
      <div className="min-w-0 flex-1 text-left">
        <p className={`text-sm truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>{p.translation}</p>
      </div>
      {p.audio && (
        <button onClick={() => playAudio(p.audio)} className="text-sm shrink-0 active:scale-95" aria-label="Озвучить">🔊</button>
      )}
    </div>
  );
}

function LessonListTab({ dark, stats, phrase, total }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const entries = dictionaryEntries(stats).filter(e => phrase ? e.type === 'phrase' : e.type !== 'phrase');
  const known = entries.filter(e => statusOf(e.progress).label === 'знаю').length;
  const chapters = groupByLessonBlock(stats, { phrase });
  const comboByChapter = phrase ? phraseLocksByChapter(stats.readingProgress?.studied || []) : new Map();

  // Модули из обоих источников (обычные фразы урока + комбо-фразы), чтобы
  // модуль с одними только комбо-фразами тоже показался в списке.
  const chapterIds = phrase
    ? [...new Set([...chapters.map(c => c.id), ...comboByChapter.keys()])]
    : chapters.map(c => c.id);
  const chaptersById = Object.fromEntries(chapters.map(c => [c.id, c]));

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className={`rounded-2xl border p-4 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <StatBar dark={dark} total={total} known={known} upcoming={Math.max(0, total - known)} />
        <RepeatButton dark={dark} disabled />
      </div>

      <SearchInput dark={dark} q={q} setQ={setQ} placeholder={phrase ? "Поиск по фразам…" : "Поиск по словам…"} />

      {chapterIds.length === 0 ? (
        <p className={`text-sm text-center py-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {phrase ? "Фразы пока не изучены — они появятся здесь по мере прохождения уроков." : "Слова пока не изучены."}
        </p>
      ) : chapterIds.map(chId => {
        const ch = chaptersById[chId] || comboByChapter.get(chId);
        const theme = getSectionTheme(chId, dark);
        const blocks = (ch.blocks || [])
          .map(b => ({ ...b, words: query ? b.words.filter(e => e.translation.toLowerCase().includes(query) || (e.plain || '').includes(q) || e.hebrew.includes(q)) : b.words }))
          .filter(b => b.words.length > 0);
        const combo = (comboByChapter.get(chId)?.phrases || [])
          .filter(p => !query || p.translation.toLowerCase().includes(query) || p.plain.includes(q) || p.hebrew.includes(q));
        if (!blocks.length && !combo.length) return null;
        const chTotal = (chaptersById[chId]?.blocks || []).reduce((n, b) => n + b.words.length, 0) + (comboByChapter.get(chId)?.phrases.length || 0);
        return (
          <Accordion key={chId} dark={dark} icon={ch.icon} title={ch.title} sub={`${chTotal} изучено`}
            iconCls={theme.icon} defaultOpen={chapterIds.length === 1}>
            {blocks.map(b => (
              <div key={b.id} className={`rounded-xl border-l-[3px] p-2 ${dark ? "border-gray-600 bg-gray-700/30" : "border-gray-300 bg-gray-50"}`}>
                <p className={`text-[11px] font-bold px-1 mb-1 ${dark ? "text-gray-300" : "text-gray-600"}`}>{b.title}</p>
                <div className={`flex flex-col divide-y ${dark ? "divide-gray-700/60" : "divide-gray-200/60"}`}>
                  {b.words.map(e => <WordRow key={e.id} dark={dark} entry={e} />)}
                </div>
              </div>
            ))}
            {combo.length > 0 && (
              <div className={`rounded-xl border-l-[3px] p-2 ${dark ? "border-amber-500/50 bg-amber-500/[0.04]" : "border-amber-300 bg-amber-50/60"}`}>
                <p className={`text-[11px] font-bold px-1 mb-1 ${dark ? "text-amber-400" : "text-amber-600"}`}>✨ Ты уже можешь сказать</p>
                <div className={`flex flex-col divide-y ${dark ? "divide-gray-700/60" : "divide-gray-200/60"}`}>
                  {combo.map(p => <ComboPhraseRow key={p.id} dark={dark} p={p} />)}
                </div>
              </div>
            )}
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
              <span className="truncate w-full text-center">{t.label}</span>
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
