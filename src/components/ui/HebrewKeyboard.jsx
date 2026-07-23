/**
 * HebrewKeyboard — виртуальная ивритская клавиатура.
 *
 * Раскладка — СТАНДАРТНАЯ ивритская (как на телефоне и на физической
 * клавиатуре): ряды ק־פ / ש־ף / ז־ץ. Финальные формы стоят на своих привычных
 * местах (ן ם сверху, ך ף в среднем ряду, ץ снизу), а не отдельной строкой —
 * чтобы мышечная память переносилась на реальный ввод.
 *
 * Props:
 *   onKey(symbol)   — нажатие буквы
 *   onDelete()      — удалить последний символ
 *   onSubmit()      — подтвердить ответ
 *   disabled        — заблокировать после ответа
 *   highlightSymbol — подсветить клавишу (подсказка)
 */

import { useTheme } from "../../context/ThemeContext";

// Стандартная ивритская раскладка (контейнер RTL ставит ק справа сверху).
// Спокойный современный гротеск — как на системной клавиатуре Android/iOS
const KEY_FONT = '"Noto Sans Hebrew", "Arial Hebrew", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif';

const KEYBOARD_ROWS = [
  ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"],
  ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"],
  ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"],
];

export default function HebrewKeyboard({ onKey, onDelete, onSubmit, disabled = false, highlightSymbol = null }) {
  const { dark } = useTheme();

  const keyBase = dark
    ? "bg-[#4a4a4e] text-white active:bg-[#5c5c61]"
    : "bg-white text-gray-900 active:bg-gray-200";
  const shadow = dark ? "0 1px 0 rgba(0,0,0,0.5)" : "0 1px 0 rgba(0,0,0,0.28)";

  return (
    <div
      className={`w-full rounded-xl px-1.5 py-2 select-none ${dark ? "bg-[#2c2c2e]" : "bg-[#d1d4da]"}`}
      style={{ direction: "rtl" }}
    >
      <div className="flex flex-col gap-[6px]">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-[4px] justify-center">
            {row.map(sym => {
              const isHighlight = sym === highlightSymbol;
              return (
                <button
                  key={sym}
                  onClick={() => !disabled && onKey(sym)}
                  disabled={disabled}
                  className={`flex-1 min-w-0 h-11 rounded-[6px] text-[21px] leading-none transition-colors duration-75
                    ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                    ${isHighlight ? "bg-emerald-500 text-white" : keyBase}`}
                  style={{ fontFamily: KEY_FONT, fontWeight: 400, boxShadow: shadow }}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        ))}

        {/* Служебный ряд */}
        <div className="flex gap-[4px] mt-[2px]">
          <button
            onClick={() => !disabled && onDelete()}
            disabled={disabled}
            className={`w-[28%] h-11 rounded-[6px] text-lg transition-colors duration-75
              ${disabled ? "opacity-40" : ""}
              ${dark ? "bg-[#3a3a3e] text-gray-200 active:bg-[#4a4a4e]" : "bg-[#adb3bd] text-gray-900 active:bg-[#9aa1ac]"}`}
            style={{ boxShadow: shadow }}
          >
            ⌫
          </button>
          <button
            onClick={() => !disabled && onSubmit()}
            disabled={disabled}
            className={`flex-1 h-11 rounded-[6px] font-semibold text-[15px] text-white transition-colors duration-75
              ${disabled ? "opacity-40 bg-gray-400" : "bg-indigo-500 active:bg-indigo-600"}`}
            style={{ boxShadow: shadow }}
          >
            Проверить
          </button>
        </div>
      </div>
    </div>
  );
}
