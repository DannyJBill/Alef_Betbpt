/**
 * StudyScreen — 📚 Учиться (перестройка 02.07.2026, вариант Б)
 *
 * Два таба вместо пяти секций с хабами:
 *   🛤 Путь        — вертикальная лента узлов курса в каноническом порядке
 *                    (COURSE_PATH из curriculum.js). Тап по доступному узлу
 *                    сразу открывает контент: группу букв/огласовок, порцию
 *                    слов, грамматический урок — без промежуточных хабов.
 *                    Тап по пройденному узлу — шпаргалка (CheatSheet) с
 *                    кнопкой «Пройти заново».
 *   📚 Мой словарь — накопитель слов (DictView внутри ReadingScreen dictOnly).
 *
 * Сплетение треков (v7.1) читается прямо на ленте: замки объясняются
 * getLockHint. Старые экраны-хабы (AlphabetScreen, GrammarScreen, ReadingScreen
 * feed) с этого экрана больше не открываются.
 */
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import {
  COURSE_PATH, CURRICULUM_BY_ID, getNodeStatus, getContinueNode,
  getReadingBlockStudiedPct, isReadingBlockUnlocked, getLockHint,
} from "../data/curriculum";
import { READING_BLOCKS } from "../data/reading";
import { GRAMMAR_LESSONS_BY_ID } from "../data/grammarLessons";

import LearnScreen   from "./LearnScreen";
import NikudScreen   from "./NikudScreen";
import ReadingScreen from "./ReadingScreen";
import LessonScreen  from "./LessonScreen";
import CheatSheet    from "./CheatSheet";

// ─── Представление узла в ленте ───────────────────────────────────────────────

const KIND_META = {
  letters: { icon: "🔤", color: "indigo" },
  sounds:  { icon: "🎵", color: "blue" },
  reading: { icon: "📖", color: "emerald" },
  grammar: { icon: "🧩", color: "violet" },
};

function nodeView(item, stats) {
  // Порция урока (R1.x) — не узел графа
  const block = READING_BLOCKS.find(b => b.id === item.id);
  if (item.inDev) {
    return { id: item.id, kind: 'grammar', title: item.title, sub: 'в разработке',
             status: 'indev', icon: item.icon || '🧩' };
  }
  const node = CURRICULUM_BY_ID[item.id];
  if (!node && block) {
    const unlocked = isReadingBlockUnlocked(block, stats);
    const pct = getReadingBlockStudiedPct(item.id, stats);
    return {
      id: item.id, kind: 'reading',
      title: block.title,
      sub: !unlocked
        ? `после урока ${block.lesson}`
        : `${block.items.length} слов` + (block.review?.length ? ` + ${block.review.length} повт.` : ''),
      status: !unlocked ? 'locked' : pct >= 1 ? 'done' : 'available',
      pct, icon: '📖',
    };
  }
  if (!node) return null;

  const status = getNodeStatus(item.id, stats);
  let title = item.id, sub = '';
  if (node.kind === 'letters') {
    const g = LETTER_GROUPS.find(g => g.id === node.block);
    title = `Буквы · ${g?.name || node.block}`;
    sub = g?.description || '';
  } else if (node.kind === 'sounds') {
    const g = NIKUD_GROUPS.find(g => g.id === node.block);
    title = `Огласовки · ${g?.name || node.block}`;
    sub = g?.description || '';
  } else if (node.kind === 'reading') {
    const b = READING_BLOCKS.find(b => b.id === item.id);
    title = b?.title || item.id;
    const pct = getReadingBlockStudiedPct(item.id, stats);
    sub = `${b?.items.length ?? 0} слов` + (b?.mode === 'preview' ? ' · 🔊 на слух' : '');
    return { id: item.id, kind: 'reading', title, sub, status,
             pct, icon: '📖', preview: b?.mode === 'preview' };
  } else if (node.kind === 'grammar') {
    const l = GRAMMAR_LESSONS_BY_ID[item.id];
    title = l?.title || item.id;
    sub = l?.tagline || 'Грамматика';
  }
  return { id: item.id, kind: node.kind, title, sub, status,
           score: stats.scores?.[item.id], icon: KIND_META[node.kind]?.icon || '📘' };
}

// ─── Строка узла ──────────────────────────────────────────────────────────────

function PathNode({ v, dark, isCurrent, lockHint, onOpen }) {
  const done = v.status === 'done';
  const locked = v.status === 'locked' || v.status === 'indev';
  const base = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";

  return (
    <button
      onClick={() => !locked && onOpen(v)}
      disabled={locked}
      className={`w-full text-left rounded-2xl border p-3.5 flex items-center gap-3 transition-all
        ${locked ? `opacity-55 ${base}` : base}
        ${isCurrent ? "ring-2 ring-emerald-400" : ""}`}
    >
      <span className="text-2xl w-9 text-center shrink-0">
        {done ? "✅" : locked ? "🔒" : v.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>
          {v.title}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {v.status === 'indev' ? 'скоро — урок в разработке' : (lockHint || v.sub)}
        </p>
        {v.kind === 'reading' && !locked && !done && v.pct > 0 && (
          <div className={`h-1 rounded-full mt-1.5 ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(v.pct * 100)}%` }}/>
          </div>
        )}
      </div>
      <span className="shrink-0 text-xs font-bold">
        {done && v.score != null && <span className="text-emerald-500">{v.score}%</span>}
        {done && v.score == null && <span className="text-emerald-500">100%</span>}
        {isCurrent && <span className="text-emerald-500">← ты здесь</span>}
      </span>
    </button>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────

export default function StudyScreen({ initialSection }) {
  const { dark } = useTheme();
  const { stats } = useStats();
  const [tab, setTab] = useState(initialSection === 'reading' ? 'dict' : 'path');
  // active: { type:'letters'|'sounds'|'portion'|'grammar'|'sheet', ... }
  const [active, setActive] = useState(null);
  const [readingTarget, setReadingTarget] = useState(null);

  const continueId = getContinueNode(stats);

  // CTA «Изучить N новых слов» из результатов уроков → сразу в порцию
  function openReading(blockId) {
    setActive({ type: 'portion', id: blockId });
    setReadingTarget(null);
  }

  function openNode(v) {
    if (v.status === 'done') {
      setActive({ type: 'sheet', v });
      return;
    }
    startNode(v);
  }

  function startNode(v) {
    if (v.kind === 'letters') setActive({ type: 'letters', group: Number(v.id.split('.')[1]) });
    else if (v.kind === 'sounds') setActive({ type: 'sounds', group: Number(v.id.split('.')[1]) });
    else if (v.kind === 'reading') setActive({ type: 'portion', id: v.id });
    else if (v.kind === 'grammar') setActive({ type: 'grammar', id: v.id });
  }

  const back = () => setActive(null);

  // ── Активный контент (вместо ленты) ──
  if (active?.type === 'letters')
    return <LearnScreen initialGroup={active.group} onBack={back} onOpenReading={openReading} />;
  if (active?.type === 'sounds')
    return <NikudScreen initialGroup={active.group} onBack={back} onOpenReading={openReading} />;
  if (active?.type === 'portion')
    return <ReadingScreen soloBlock={active.id} onBack={back} />;
  if (active?.type === 'grammar') {
    const lesson = GRAMMAR_LESSONS_BY_ID[active.id];
    return <LessonScreen lesson={lesson} onBack={back} onOpenReading={openReading} />;
  }
  if (active?.type === 'sheet') {
    const v = active.v;
    return (
      <CheatSheet
        nodeId={v.id} kind={v.kind} title={v.title} dark={dark}
        onBack={back}
        onRetake={() => startNode(v)}
      />
    );
  }

  // ── Лента ──
  const TABS = [
    { id: 'path', icon: '🛤', label: 'Путь' },
    { id: 'dict', icon: '📚', label: 'Мой словарь' },
  ];

  return (
    <div className="pb-24 max-w-md mx-auto">
      <div className="px-4 pt-4 pb-3">
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Учиться</h2>
      </div>

      <div className="px-4 mb-4">
        <div className={`flex rounded-2xl p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5
                ${tab === t.id
                  ? dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow"
                  : dark ? "text-gray-400" : "text-gray-500"}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'dict' ? (
        <ReadingScreen dictOnly />
      ) : (
        <div className="px-4 flex flex-col gap-4">
          {/* Продолжить */}
          {continueId && (
            <button
              onClick={() => {
                const item = COURSE_PATH.flatMap(c => c.items).find(i => i.id === continueId);
                const v = item && nodeView(item, stats);
                if (v) startNode(v);
              }}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
              ▶ Продолжить
            </button>
          )}

          {COURSE_PATH.map(ch => (
            <div key={ch.chapter}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                {ch.chapter}
              </p>
              <div className="flex flex-col gap-2">
                {ch.items.map(item => {
                  const v = nodeView(item, stats);
                  if (!v) return null;
                  const lockHint = v.status === 'locked' && CURRICULUM_BY_ID[v.id]
                    ? getLockHint(v.id, stats) : null;
                  return (
                    <PathNode key={v.id} v={v} dark={dark}
                      isCurrent={v.id === continueId}
                      lockHint={lockHint}
                      onOpen={openNode} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
