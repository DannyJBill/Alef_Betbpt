/**
 * AIAssistant.jsx
 * Floating chat — AI-помощник по ивриту
 * Free: 3 вопроса в день | Premium: безлимит
 */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { askAI, AI_ENABLED } from "../helpers/ai";
import { AI_HISTORY_LIMIT } from "../data/constants";

const WELCOME    = "Шалом! 🇮🇱 Я помогу вам выучить алфавит иврита. Спрашивайте всё, что непонятно!";
const FREE_LIMIT = 3;

function getTodayKey() { return new Date().toISOString().slice(0, 10); }

export default function AIAssistant() {
  const { dark } = useTheme();
  const { stats, updateStats } = useStats();

  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState([{ id: 0, role: "assistant", text: WELCOME }]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const bottomRef = useRef(null);
  const nextId    = useRef(1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const isPremium = Boolean(stats?.isPremium);

  function getUsageLeft() {
    if (isPremium) return Infinity;
    const usage = stats?.aiUsageToday;
    if (!usage || usage.date !== getTodayKey()) return FREE_LIMIT;
    return Math.max(0, FREE_LIMIT - (usage.count || 0));
  }

  function canAsk() { return isPremium || getUsageLeft() > 0; }

  function incrementUsage() {
    if (isPremium) return;
    updateStats(prev => {
      const today = getTodayKey();
      const u     = prev.aiUsageToday || { date: null, count: 0 };
      const count = u.date === today ? (u.count || 0) + 1 : 1;
      return { ...prev, aiUsageToday: { date: today, count } };
    });
  }

  async function send() {
    if (!input.trim() || loading) return;
    if (AI_ENABLED && !canAsk()) { setShowLimit(true); return; }

    const userMsg   = input.trim();
    setInput("");
    const userEntry = { id: nextId.current++, role: "user", text: userMsg };
    setMsgs(m => [...m, userEntry]);
    setLoading(true);
    if (AI_ENABLED) incrementUsage(); // заглушка не тратит дневной лимит

    try {
      const history = [...msgs, userEntry]
        .slice(-AI_HISTORY_LIMIT)
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const reply = await askAI(history);
      setMsgs(m => [...m, { id: nextId.current++, role: "assistant", text: reply }]);
    } catch (err) {
      const errText = err.message?.includes("ожидания")
        ? err.message
        : "Ошибка соединения 😔 Попробуйте снова.";
      setMsgs(m => [...m, { id: nextId.current++, role: "assistant", text: errText }]);
    } finally {
      setLoading(false);
    }
  }

  const usageLeft   = getUsageLeft();
  const isExhausted = !isPremium && usageLeft === 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Закрыть чат" : "Открыть AI-помощника"}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div
          className={`fixed bottom-36 right-4 z-50 w-80 rounded-3xl shadow-2xl flex flex-col overflow-hidden border
            ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
          style={{ height: 420 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-white font-bold text-sm">AI-помощник</p>
                <p className="text-indigo-200 text-xs">
                  {isPremium ? "Premium · безлимит ⭐" : "Иврит для олим 🇮🇱"}
                </p>
              </div>
            </div>
            {/* Счётчик — только для free */}
            {!isPremium && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1">
                  {Array.from({ length: FREE_LIMIT }, (_, i) => (
                    <div key={i}
                      className={`w-2 h-2 rounded-full transition-all ${i < usageLeft ? "bg-white" : "bg-white/30"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-indigo-200">
                  {usageLeft === Infinity ? "∞" : usageLeft}/{FREE_LIMIT} сегодня
                </span>
              </div>
            )}
          </div>

          {/* Paywall */}
          {(showLimit || isExhausted) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-5 text-center gap-4">
              <div className="text-4xl">⭐</div>
              <div>
                <p className={`font-bold text-base mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
                  Лимит на сегодня исчерпан
                </p>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  Бесплатно — {FREE_LIMIT} вопроса в день. Завтра сбросится.
                </p>
              </div>
              <div className={`w-full rounded-2xl p-4 border ${dark ? "bg-amber-950 border-amber-800" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm font-semibold mb-1 ${dark ? "text-amber-300" : "text-amber-700"}`}>
                  Premium — безлимитный AI
                </p>
                <p className={`text-xs ${dark ? "text-amber-400" : "text-amber-600"}`}>
                  Скоро в приложении ⭐
                </p>
              </div>
              {showLimit && !isExhausted && (
                <button onClick={() => setShowLimit(false)}
                  className={`text-xs underline ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  Закрыть
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {msgs.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-indigo-500 text-white rounded-br-sm"
                        : dark
                          ? "bg-gray-800 text-gray-200 rounded-bl-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className={`px-3 py-2 rounded-2xl text-sm ${dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                      ⌛ Думаю...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Предупреждение — остался 1 вопрос */}
              {!isPremium && usageLeft === 1 && (
                <div className={`px-3 py-1.5 text-xs text-center ${dark ? "bg-amber-950 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                  Остался 1 вопрос на сегодня
                </div>
              )}

              {/* Input */}
              <div className={`p-2 border-t flex gap-2 ${dark ? "border-gray-700" : "border-gray-100"}`}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Спросите про иврит..."
                  aria-label="Сообщение AI-помощнику"
                  className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none ${
                    dark ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-800 placeholder-gray-400"
                  }`}
                />
                <button onClick={send}
                  disabled={loading || !input.trim()}
                  aria-label="Отправить"
                  className="bg-indigo-500 text-white rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50">
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
