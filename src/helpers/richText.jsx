/**
 * richText.jsx — единый рендерер учебного текста (правило урока, конспект).
 *
 * Лёгкая разметка прямо в строке:
 *   пустая строка (\n\n)      → абзац
 *   **термин**                → акцент (полужирный)
 *   строка "> ..."            → callout «💡 суть»
 *   строка "> важно: ..."     → callout с лейблом (⚠️ важно / 📌 запомни / …)
 *   строка "- ..." / "• ..."  → пункт списка
 *   иврит [\u0590-\u05FF]      → авто-подсветка + dir="rtl" (размечать не надо)
 *
 * Используется и в LessonScreen (сцена rule), и в CheatSheet (конспект) —
 * дизайн теории один во всех «материалах».
 */
import { useMemo } from "react";

const HE = /[\u0590-\u05FF]/;
const HEB_FONT = { fontFamily: "'Noto Sans Hebrew', sans-serif" };
const RULE_TEXT = "text-[17px] leading-[1.75]";
const LABEL_ICON = { "суть": "💡", "важно": "⚠️", "внимание": "⚠️", "запомни": "📌", "пример": "📝", "совет": "💬", "исключение": "❗" };
const DEFAULT_C = { soft: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" };

// ── Инлайн: подсветка иврита + **жирный** ─────────────────────────────────────
function renderSegment(text, c, keyBase) {
  const tokens = text.split(/(\s+)/);
  const nodes = [];
  let buf = [];
  const flushHe = () => {
    if (!buf.length) return;
    nodes.push(
      <span key={`${keyBase}-h${nodes.length}`} dir="rtl"
        className={`font-semibold ${c.text}`} style={{ ...HEB_FONT, fontSize: "1.08em" }}>
        {buf.join("")}
      </span>
    );
    buf = [];
  };
  tokens.forEach((tok, i) => {
    if (tok.trim() === "") {
      // Пробел уходит ВНУТРЬ ивритского спана только между ивритскими словами:
      // иначе он схлопывается в RTL-контексте и текст слипается
      // («מוֹרָה.Важно:» вместо «מוֹרָה. Важно:»).
      const next = tokens[i + 1];
      if (buf.length && next && HE.test(next)) buf.push(tok);
      else { flushHe(); nodes.push(tok); }
    }
    else if (HE.test(tok)) { buf.push(tok); }
    else { flushHe(); nodes.push(<span key={`${keyBase}-t${i}`}>{tok}</span>); }
  });
  flushHe();
  return nodes;
}

export function renderInline(text, c = DEFAULT_C, keyBase = "i") {
  return String(text ?? "").split(/(\*\*[^*]+\*\*)/).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <span key={`${keyBase}-b${i}`} className="font-bold text-gray-900">
          {renderSegment(seg.slice(2, -2), c, `${keyBase}-b${i}`)}
        </span>
      );
    }
    return <span key={`${keyBase}-s${i}`}>{renderSegment(seg, c, `${keyBase}-s${i}`)}</span>;
  });
}

// ── Блочный парсер: абзацы / callout / список ─────────────────────────────────
function parseBlocks(raw = "") {
  const blocks = [];
  let bullets = null, callout = null;
  const flush = () => {
    if (bullets) { blocks.push({ type: "list", items: bullets }); bullets = null; }
    if (callout) { blocks.push({ type: "callout", lines: callout }); callout = null; }
  };
  for (const line of String(raw ?? "").split("\n")) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (t.startsWith(">")) { if (bullets) flush(); (callout ||= []).push(t.replace(/^>\s?/, "")); }
    else if (/^[-•]\s/.test(t)) { if (callout) flush(); (bullets ||= []).push(t.replace(/^[-•]\s+/, "")); }
    else { flush(); blocks.push({ type: "p", text: t }); }
  }
  flush();
  return blocks;
}

export function RichText({ text, c = DEFAULT_C }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        if (b.type === "callout") {
          const m = b.lines[0].match(/^([^:]{1,20}):\s+(.+)$/);
          const label = (m ? m[1] : "суть").trim().toLowerCase();
          const body = m ? [m[2], ...b.lines.slice(1)] : b.lines;
          const icon = LABEL_ICON[label] || "💡";
          return (
            <div key={i} className={`flex gap-3 rounded-xl p-3.5 ${c.soft}`}>
              <div className={`w-1 rounded-full flex-shrink-0 ${c.bar}`} />
              <div className="flex-1">
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${c.text}`}>{icon} {label}</div>
                {body.map((ln, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-gray-800">{renderInline(ln, c, `c${i}-${j}`)}</p>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "list") return (
          <ul key={i} className="flex flex-col gap-1.5 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className={`flex gap-2.5 ${RULE_TEXT} text-gray-800`}>
                <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.bar}`} />
                <span className="flex-1">{renderInline(it, c, `l${i}-${j}`)}</span>
              </li>
            ))}
          </ul>
        );
        return (
          <p key={i} className={`${RULE_TEXT} text-gray-800`}>{renderInline(b.text, c, `p${i}`)}</p>
        );
      })}
    </div>
  );
}
