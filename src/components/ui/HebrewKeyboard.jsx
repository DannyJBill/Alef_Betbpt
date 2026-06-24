/**
 * HebrewKeyboard — виртуальная ивритская клавиатура
 * Props:
 *   onKey(symbol)   — нажатие буквы
 *   onDelete()      — удалить последний символ
 *   onSubmit()      — подтвердить ответ
 *   disabled        — заблокировать после ответа
 *   letters         — массив букв из availableLetters (только разблокированные)
 */

import { ALPHABET, FINAL_FORMS } from "../../data/alphabet";
import { useTheme } from "../../context/ThemeContext";

// Раскладка иврита построчно (как на физической клавиатуре)
const KEYBOARD_ROWS = [
  ["פ","ו","ט","א","ר","ק"],
  ["ל","ח","י","כ","ע","נ","מ"],
  ["ת","צ","ז","ג","ד","ש","ב","ה","ס"],
  ["ף","ץ","ך","ם","ן"],   // финальные формы
];

const ALL_SYMBOLS = new Set([...ALPHABET, ...FINAL_FORMS].map(l => l.symbol));

export default function HebrewKeyboard({ onKey, onDelete, onSubmit, disabled = false, highlightSymbol = null }) {
  const { dark } = useTheme();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1 justify-center">
          {row.map(sym => {
            const isHighlight = sym === highlightSymbol;
            return (
              <button
                key={sym}
                onClick={() => !disabled && onKey(sym)}
                disabled={disabled}
                className={`
                  flex-1 max-w-[48px] h-12 rounded-xl font-bold text-xl
                  transition-all active:scale-90 select-none
                  ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  ${isHighlight
                    ? "bg-emerald-500 text-white shadow-lg scale-105"
                    : dark
                      ? "bg-gray-700 text-white border border-gray-600 active:bg-gray-600"
                      : "bg-white text-gray-800 border border-gray-200 shadow-sm active:bg-gray-100"
                  }
                `}
                style={{ fontFamily: "serif", direction: "rtl" }}
              >
                {sym}
              </button>
            );
          })}
        </div>
      ))}

      {/* Delete + Submit */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => !disabled && onDelete()}
          disabled={disabled}
          className={`flex-1 h-11 rounded-xl font-semibold text-sm transition-all active:scale-95
            ${disabled ? "opacity-40" : ""}
            ${dark ? "bg-gray-700 text-gray-300 border border-gray-600" : "bg-gray-100 text-gray-600 border border-gray-200"}`}
        >
          ⌫ Удалить
        </button>
        <button
          onClick={() => !disabled && onSubmit()}
          disabled={disabled}
          className={`flex-[2] h-11 rounded-xl font-bold text-sm text-white transition-all active:scale-95
            ${disabled ? "opacity-40 bg-gray-400" : "bg-indigo-500 active:bg-indigo-600"}`}
        >
          Проверить ✓
        </button>
      </div>
    </div>
  );
}
