/**
 * CheatSheet — шпаргалка пройденного узла Пути (вариант А, 02.07.2026).
 *
 * Тап по завершённому узлу показывает не «пройти заново», а конспект:
 *   letters → сетка букв группы (символ, название, звук)
 *   sounds  → огласовки группы (знак на מ, название, звук)
 *   reading → слова порции (иврит, транслит, перевод, аудио)
 *   grammar → правило урока + примеры
 * Внизу — «Пройти заново» (тот же экшен, что открывал узел впервые).
 * Контент рендерится из существующих данных (alphabet/reading/grammarLessons) —
 * отдельного справочного контента нет.
 */
import { ALPHABET, LETTER_GROUPS, NIKUD, NIKUD_GROUPS } from "../data/alphabet";
import { READING_BLOCKS, getBlockCards } from "../data/reading";
import { GRAMMAR_LESSONS_BY_ID } from "../data/grammarLessons";
import { RichText } from "../helpers/richText";

// Акцент callout/иврита по модулю урока
const MODULE_C = {
  syntax:     { soft: "bg-violet-50", bar: "bg-violet-500", text: "text-violet-700" },
  morphology: { soft: "bg-teal-50",   bar: "bg-teal-500",   text: "text-teal-700" },
  verb:       { soft: "bg-orange-50", bar: "bg-orange-500", text: "text-orange-700" },
  numbers:    { soft: "bg-sky-50",    bar: "bg-sky-500",    text: "text-sky-700" },
  phonetics:  { soft: "bg-emerald-50",bar: "bg-emerald-500",text: "text-emerald-700" },
};

function playAudio(file) {
  if (!file) return;
  try { new Audio(`/reading/${file}`).play(); } catch {}
}

export default function CheatSheet({ nodeId, kind, title, dark, onBack, onRetake }) {
  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      <button onClick={onBack}
        className={`flex items-center gap-1 mb-3 text-sm font-medium ${dark?"text-emerald-400":"text-emerald-600"}`}>
        ← Путь
      </button>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">✅</span>
        <h2 className={`text-xl font-bold ${dark?"text-white":"text-gray-900"}`}>{title}</h2>
      </div>
      <p className={`text-xs mb-4 ${dark?"text-gray-500":"text-gray-400"}`}>Конспект пройденного</p>

      {kind === 'letters' && <LettersSheet nodeId={nodeId} dark={dark} />}
      {kind === 'sounds'  && <SoundsSheet nodeId={nodeId} dark={dark} />}
      {kind === 'reading' && <PortionSheet nodeId={nodeId} dark={dark} />}
      {kind === 'grammar' && <GrammarSheet nodeId={nodeId} dark={dark} />}

      <button onClick={onRetake}
        className="mt-5 w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
        🔄 Пройти заново
      </button>
    </div>
  );
}

function LettersSheet({ nodeId, dark }) {
  const groupN = Number(nodeId.split('.')[1]);
  const letters = ALPHABET.filter(l => l.group === groupN);
  return (
    <div className="grid grid-cols-2 gap-2">
      {letters.map(l => (
        <div key={l.id} className={`rounded-xl border p-3 text-center ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
          <div className={`text-4xl font-bold mb-1 ${dark?"text-white":"text-gray-900"}`}>{l.symbol}</div>
          <div className={`text-sm font-medium ${dark?"text-gray-300":"text-gray-700"}`}>{l.name} · «{l.sound}»</div>
          {l.exampleWord && (
            <div className="text-xs text-gray-400 mt-1" dir="rtl">{l.exampleWord} <span dir="ltr">— {l.exampleMeaning}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}

function SoundsSheet({ nodeId, dark }) {
  const groupN = Number(nodeId.split('.')[1]);
  const group = NIKUD_GROUPS.find(g => g.id === groupN);
  const list = NIKUD.filter(v => group?.vowelIds?.includes(v.id));
  return (
    <div className="flex flex-col gap-2">
      {group?.conceptBody && (
        <p className={`text-xs px-1 ${dark?"text-gray-400":"text-gray-500"}`}>{group.conceptBody}</p>
      )}
      {list.map(v => (
        <div key={v.id} className={`rounded-xl border p-3 flex items-center gap-4 ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-100"}`}>
          <div className={`text-4xl font-bold w-14 text-center shrink-0 ${dark?"text-white":"text-gray-900"}`}>{v.id === 'shuruk' ? 'מ' + v.symbol : 'מ' + v.symbol}</div>
          <div className="min-w-0">
            <div className={`text-sm font-bold ${dark?"text-gray-200":"text-gray-800"}`}>{v.name} · «{v.sound}»</div>
            <div className="text-xs text-gray-400">{v.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortionSheet({ nodeId, dark }) {
  const block = READING_BLOCKS.find(b => b.id === nodeId);
  if (!block) return null;
  const cards = getBlockCards(block);
  return (
    <div className={`rounded-2xl border divide-y ${dark?"bg-gray-800 border-gray-700 divide-gray-700":"bg-white border-gray-100 divide-gray-100"}`}>
      {cards.map(i => (
        <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className={`text-lg font-bold shrink-0 ${dark?"text-white":"text-gray-900"}`} dir="rtl">{i.hebrew}</span>
          <div className="min-w-0 flex-1">
            <div className={`text-sm truncate ${dark?"text-gray-300":"text-gray-700"}`}>{i.translation}</div>
            <div className="text-[11px] text-gray-400">{i.transliteration}{i.isReview ? ' · повторение' : ''}</div>
          </div>
          {i.audio && (
            <button onClick={() => playAudio(i.audio)} className="text-lg shrink-0">🔊</button>
          )}
        </div>
      ))}
    </div>
  );
}

function GrammarSheet({ nodeId, dark }) {
  const lesson = GRAMMAR_LESSONS_BY_ID[nodeId];
  if (!lesson) return null;
  const c = MODULE_C[lesson.module] || MODULE_C.syntax;
  return (
    <div className="flex flex-col gap-3">
      {lesson.rule && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="font-bold text-sm mb-2 text-gray-900">Правило</p>
          <RichText text={lesson.rule} c={c} />
        </div>
      )}
      {(lesson.examples || []).length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100">
          {lesson.examples.map((ex, i) => (
            <div key={i} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900" dir="rtl" style={{ fontFamily: "'Noto Sans Hebrew', sans-serif" }}>{ex.hebrew}</span>
                {ex.audio && (
                  <button onClick={() => playAudio(ex.audio)} aria-label="Озвучить" className="text-sm active:scale-95">🔊</button>
                )}
              </div>
              <div className="text-xs text-gray-400">{ex.translit}</div>
              <div className="text-sm text-gray-600">{ex.ru}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
