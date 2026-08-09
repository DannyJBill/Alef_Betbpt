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
 *   📚 Мой словарь — накопитель слов, темы и буквы одним экраном (VocabularyScreen).
 *
 * Сплетение треков (v7.1) читается прямо на ленте: замки объясняются
 * getLockHint. Старые экраны-хабы (AlphabetScreen, GrammarScreen, ReadingScreen
 * feed) с этого экрана больше не открываются.
 */
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { LETTER_GROUPS, NIKUD_GROUPS } from "../data/alphabet";
import {
  COURSE_PATH, CURRICULUM_BY_ID, getNodeStatus, getContinueNode,
  getReadingBlockStudiedPct, isReadingBlockUnlocked, getLockHint,
} from "../data/curriculum";
import { READING_BLOCKS } from "../data/reading";
import { GRAMMAR_LESSONS_BY_ID } from "../data/grammarLessons";
import { getSectionTheme, getTopicMeta, getNodeCardTheme } from "../data/pathTheme";

import LearnScreen   from "./LearnScreen";
import NikudScreen   from "./NikudScreen";
import CardsScreen   from "./CardsScreen";
import ReadingScreen from "./ReadingScreen";
import VocabularyScreen from "./VocabularyScreen";
import LessonScreen  from "./LessonScreen";
import ExamScreen    from "./ExamScreen";
import CheatSheet    from "./CheatSheet";

// ─── Представление узла в ленте ───────────────────────────────────────────────

export const KIND_META = {
  letters: { icon: "🔤", color: "indigo" },
  sounds:  { icon: "🎵", color: "blue" },
  reading: { icon: "📖", color: "emerald" },
  grammar: { icon: "🧩", color: "violet" },
  exam:    { icon: "🏁", color: "amber" },
};

// Экспортируется для HomeScreen — там строится мини-превью тропы (пред./тек./след.
// узел канонического пути) на основе того же представления, что и полная лента здесь.
export function nodeView(item, stats) {
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
  } else if (node.kind === 'exam') {
    title = `Экзамен: ${node.examTitle}`;
    sub = `Сводный тест · ${node.sourceLessons?.length || 0} уроков`;
  }
  return { id: item.id, kind: node.kind, title, sub, status,
           score: stats.scores?.[item.id], icon: KIND_META[node.kind]?.icon || '📘',
           topic: node.kind === 'grammar' ? node.module : null };
}

/** v (из nodeView) → форма active-состояния экрана, которая сразу открывает контент узла. */
function activeForNode(v) {
  if (v.kind === 'letters') return { type: 'letters', group: Number(v.id.split('.')[1]) };
  if (v.kind === 'sounds')  return { type: 'sounds',  group: Number(v.id.split('.')[1]) };
  if (v.kind === 'reading') return { type: 'portion', id: v.id };
  if (v.kind === 'grammar') return { type: 'grammar', id: v.id };
  if (v.kind === 'exam')    return { type: 'exam', id: v.id };
  return null;
}

/**
 * Делит items секции на подгруппы по ch.subgroups (см. curriculum.js).
 * Каждая подгруппа заканчивается уроком-чекпоинтом (endId) + прицепленными
 * к нему порциями чтения и самим узлом-экзаменом (kind:'exam' в графе,
 * curriculum.js) — они разблокируются этим уроком, визуально остаются в
 * одной карточке подгруппы. Без ch.subgroups — одна безымянная группа.
 */
function splitIntoSubgroups(ch) {
  if (!ch.subgroups?.length) return [{ title: null, items: ch.items }];
  const groups = [];
  let start = 0;
  for (const sg of ch.subgroups) {
    let end = ch.items.findIndex((it, i) => i >= start && it.id === sg.endId);
    if (end === -1) continue; // граница не найдена — пропускаем, не роняем экран
    while (end + 1 < ch.items.length && READING_BLOCKS.some(b => b.id === ch.items[end + 1].id)) end++;
    if (end + 1 < ch.items.length && CURRICULUM_BY_ID[ch.items[end + 1].id]?.kind === 'exam') end++;
    groups.push({ title: sg.title, items: ch.items.slice(start, end + 1) });
    start = end + 1;
  }
  if (start < ch.items.length) groups.push({ title: null, items: ch.items.slice(start) });
  return groups;
}

/** Сводка секции пути для шапки модуля: done/total + есть ли что-то доступное. */
function sectionSummary(ch, stats) {
  let total = 0, done = 0, anyOpen = false;
  for (const item of ch.items) {
    const v = nodeView(item, stats);
    if (!v) continue;
    total++;
    if (v.status === 'done') done++;
    if (v.status === 'available' || v.status === 'done') anyOpen = true;
  }
  return { done, total, anyOpen };
}

// ─── Строка узла ──────────────────────────────────────────────────────────────

function PathNode({ v, dark, isCurrent, lockHint, onOpen, nodeRef }) {
  const done = v.status === 'done';
  const locked = v.status === 'locked' || v.status === 'indev';
  const isExam = v.kind === 'exam';
  const card = getNodeCardTheme(v.kind, dark);
  const topic = v.topic ? getTopicMeta(v.topic, dark) : null;

  return (
    <button
      ref={nodeRef}
      onClick={() => !locked && onOpen(v)}
      disabled={locked}
      style={{ scrollMarginTop: 80, scrollMarginBottom: 120 }}
      className={`w-full text-left rounded-2xl border p-3.5 flex items-center gap-3 transition-all
        ${locked ? `opacity-55 ${card}` : card}
        ${isExam && !done ? "border-dashed" : ""}
        ${isCurrent ? "ring-2 ring-emerald-400" : ""}`}
    >
      <span className="text-2xl w-9 text-center shrink-0">
        {done ? "✅" : locked ? "🔒" : v.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>
          {v.title}
        </p>
        <p className="text-xs text-gray-400 truncate flex items-center gap-1.5">
          {v.status === 'indev' ? 'скоро — урок в разработке' : (lockHint || v.sub)}
          {!locked && !isExam && topic && (
            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case ${topic.cls}`}>
              {topic.label}
            </span>
          )}
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

// ─── Шапка модуля (секции пути) ───────────────────────────────────────────────

function SectionHeader({ ch, dark, isActiveChapter, expanded, onToggle, summary }) {
  const theme = getSectionTheme(ch.id, dark);
  const { done, total, anyOpen } = summary;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const locked = !anyOpen && done === 0;

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 transition-all ${theme.head}
        ${isActiveChapter ? `ring-1 ${theme.ring.split(' ')[0]}` : ""}`}
    >
      <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${theme.icon} ${locked ? "opacity-50" : ""}`}>
        {locked ? "🔒" : ch.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-sm truncate ${dark ? "text-white" : "text-gray-900"}`}>
          {ch.chapter}
        </p>
        <p className="text-xs text-gray-400 truncate">{ch.description}</p>
        <div className={`h-1 rounded-full mt-1.5 ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className={`shrink-0 text-xs font-bold ${theme.text}`}>{done}/{total}</span>
      <span className="shrink-0 text-gray-400 text-xs">{expanded ? "▴" : "▾"}</span>
    </button>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────

export default function StudyScreen({ initialSection }) {
  const { dark } = useTheme();
  const { stats } = useStats();
  const [tab, setTab] = useState('path');
  // active: { type:'letters'|'sounds'|'portion'|'grammar'|'sheet'|'cards', ... }
  const [active, setActive] = useState(null);
  const [readingTarget, setReadingTarget] = useState(null);

  const continueId = getContinueNode(stats);

  // Развёрнутые модули пути (id секции COURSE_PATH). По умолчанию открыт
  // только модуль с текущим узлом — остальные свёрнуты в одну строку.
  // Ленивая инициализация — continueId уже известен на первый рендер.
  const [expandedChapters, setExpandedChapters] = useState(() => {
    const activeCh = COURSE_PATH.find(c => c.items.some(i => i.id === continueId));
    return new Set(activeCh ? [activeCh.id] : []);
  });
  function toggleChapter(id) {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // initialSection — команда с Home ({ type: 'cards'|'continue'|'reading' }),
  // свежий объект на каждый переход. StudyScreen НЕ размонтируется между
  // табами (App держит все табы смонтированными, переключает display) — этот
  // экран уже открыт и просто ждёт следующей команды, поэтому это эффект,
  // а не useState-инициализатор: одного запуска на монтирование недостаточно.
  //  'cards'    — SM-2 колода букв (CardsScreen), из HomeScreen «Повторить».
  //  'continue' — сразу открывает актуальный узел getContinueNode(stats),
  //               без промежуточной остановки на ленте (HomeScreen «Продолжить»).
  //  'reading'  — таб «Мой словарь» (HomeScreen «Повторить» → слова).
  useEffect(() => {
    const type = initialSection?.type;
    if (!type) return;
    if (type === 'reading') { setTab('dict'); return; }
    if (type === 'cards')   { setActive({ type: 'cards' }); return; }
    if (type === 'continue') {
      const contId = getContinueNode(stats);
      const item = COURSE_PATH.flatMap(c => c.items).find(i => i.id === contId);
      const v = item && nodeView(item, stats);
      if (v) setActive(activeForNode(v));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSection]);

  // Автопрокрутка к текущему уроку при открытии таба «Путь» (и когда меняется
  // текущий узел). Ждём кадр, чтобы список успел отрендериться.
  const currentNodeRef = useRef(null);
  useEffect(() => {
    if (tab !== 'path' || active) return;
    const id = requestAnimationFrame(() => {
      currentNodeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [tab, active, continueId]);

  // Модуль с текущим узлом всегда развёрнут (например, после сдачи всех
  // уроков предыдущего модуля курс переходит в следующий) — не убираем
  // при этом раскрытые пользователем вручную модули.
  useEffect(() => {
    const activeCh = COURSE_PATH.find(c => c.items.some(i => i.id === continueId));
    if (!activeCh) return;
    setExpandedChapters(prev => prev.has(activeCh.id) ? prev : new Set(prev).add(activeCh.id));
  }, [continueId]);

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
    const next = activeForNode(v);
    if (next) setActive(next);
  }

  const back = () => setActive(null);

  // ── Активный контент (вместо ленты) ──
  if (active?.type === 'letters')
    return <LearnScreen initialGroup={active.group} onBack={back} onOpenReading={openReading} />;
  if (active?.type === 'sounds')
    return <NikudScreen initialGroup={active.group} onBack={back} onOpenReading={openReading} />;
  if (active?.type === 'portion')
    return <ReadingScreen soloBlock={active.id} onBack={back} />;
  if (active?.type === 'cards')
    return <CardsScreen onBack={back} />;
  if (active?.type === 'grammar') {
    const lesson = GRAMMAR_LESSONS_BY_ID[active.id];
    return <LessonScreen lesson={lesson} onBack={back} onOpenReading={openReading} />;
  }
  if (active?.type === 'exam') {
    const examNode = CURRICULUM_BY_ID[active.id];
    return <ExamScreen examNode={examNode} onBack={back} />;
  }
  if (active?.type === 'sheet') {
    const v = active.v;
    return (
      <CheatSheet
        nodeId={v.id} kind={v.kind} title={v.title} dark={dark}
        onBack={back}
        onRetake={() => startNode(v)}
        onCards={v.kind === 'letters' ? () => setActive({ type: 'cards' }) : undefined}
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
        <VocabularyScreen />
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

          {COURSE_PATH.map(ch => {
            const isActiveChapter = ch.items.some(i => i.id === continueId);
            const expanded = expandedChapters.has(ch.id);
            const summary = sectionSummary(ch, stats);
            const theme = getSectionTheme(ch.id, dark);
            return (
              <div key={ch.id} className="flex flex-col gap-2">
                <SectionHeader ch={ch} dark={dark} isActiveChapter={isActiveChapter}
                  expanded={expanded} summary={summary}
                  onToggle={() => toggleChapter(ch.id)} />
                {expanded && (
                  <div className="flex flex-col gap-2.5">
                    {splitIntoSubgroups(ch).map((sg, sgIdx) => {
                      const subDone = sg.items.reduce((n, it) => {
                        const v = nodeView(it, stats);
                        return n + (v?.status === 'done' ? 1 : 0);
                      }, 0);
                      return (
                        <div key={sg.title || `_${sgIdx}`}
                          className={`flex flex-col gap-2 rounded-2xl border-l-[3px] p-2.5
                            ${sg.title ? theme.sub : ""}`}>
                          {sg.title && (
                            <div className="flex items-center gap-2 px-0.5">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${theme.icon}`}>
                                {sgIdx + 1}
                              </span>
                              <p className={`text-[11px] font-bold uppercase tracking-wide flex-1 truncate ${theme.text}`}>
                                {sg.title}
                              </p>
                              <span className={`text-[10px] font-bold shrink-0 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                                {subDone}/{sg.items.filter(it => nodeView(it, stats)).length}
                              </span>
                            </div>
                          )}
                          {sg.items.map(item => {
                            const v = nodeView(item, stats);
                            if (!v) return null;
                            const lockHint = v.status === 'locked' && CURRICULUM_BY_ID[v.id]
                              ? getLockHint(v.id, stats) : null;
                            const isCur = v.id === continueId;
                            return (
                              <PathNode key={v.id} v={v} dark={dark}
                                isCurrent={isCur}
                                nodeRef={isCur ? currentNodeRef : null}
                                lockHint={lockHint}
                                onOpen={openNode} />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
