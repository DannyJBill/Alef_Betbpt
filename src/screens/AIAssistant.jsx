import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { askAI } from "../helpers/ai";
import { AI_HISTORY_LIMIT } from "../data/constants";

const WELCOME = "Шалом! 🇮🇱 Я помогу вам выучить алфавит иврита. Спрашивайте всё, что непонятно!";

export default function AIAssistant() {
  const { dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ id: 0, role: "assistant", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const nextId = useRef(1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const userEntry = { id: nextId.current++, role: "user", text: userMsg };
    setMsgs(m => [...m, userEntry]);
    setLoading(true);

    try {
      // keep only last N messages to limit token usage
      const history = [...msgs, userEntry]
        .slice(-AI_HISTORY_LIMIT)
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

      const reply = await askAI(history);
      setMsgs(m => [...m, { id: nextId.current++, role: "assistant", text: reply }]);
    } catch (err) {
      const errText = err.message.includes("ожидания") ? err.message : "Ошибка соединения 😔 Попробуйте снова.";
      setMsgs(m => [...m, { id: nextId.current++, role: "assistant", text: errText }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Закрыть чат" : "Открыть AI-помощника"}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div
          className={`fixed bottom-36 right-4 z-50 w-80 rounded-3xl shadow-2xl flex flex-col overflow-hidden border
            ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
          style={{ height: 380 }}>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <p className="text-white font-bold text-sm">AI-помощник</p>
              <p className="text-indigo-200 text-xs">Всегда готов помочь</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white rounded-br-sm"
                    : dark ? "bg-gray-800 text-gray-200 rounded-bl-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`px-3 py-2 rounded-2xl text-sm ${dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-400"}`}>
                  ⌛ Думаю...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={`p-2 border-t flex gap-2 ${dark ? "border-gray-700" : "border-gray-100"}`}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Спросите про букву..."
              aria-label="Сообщение AI-помощнику"
              className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none
                ${dark ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-800 placeholder-gray-400"}`}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Отправить"
              className="bg-indigo-500 text-white rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50">
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
