/**
 * DevPanel — тестовый инструмент (скрыт: 5 тапов по «Мой профиль»).
 * Выставляет прогресс до выбранной точки Пути: всё до неё — пройдено,
 * дальше — закрыто. Нужен для тестирования и багфикса на любом устройстве,
 * без консоли и без SQL.
 */
import { useState } from "react";
import { applyProgressUpTo, pathNodes } from "../../helpers/devProgress";

export default function DevPanel({ stats, updateStats, dark }) {
  const nodes = pathNodes();
  const [idx, setIdx] = useState(nodes.length - 1);
  const [done, setDone] = useState(false);

  const box = dark ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800";
  const cur = nodes[idx];

  function apply() {
    updateStats(s => applyProgressUpTo(s, idx));
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className={`w-full rounded-2xl border p-4 mb-3 ${box}`}>
      <p className="text-sm font-bold mb-1">🧪 Тест-режим</p>
      <p className="text-xs opacity-60 mb-3">
        Выставить прогресс до выбранного места. Всё до него — пройдено, дальше — закрыто.
      </p>

      <input type="range" min="0" max={nodes.length - 1} value={idx}
        onChange={e => setIdx(Number(e.target.value))}
        className="w-full accent-indigo-500" />

      <div className="text-xs mt-2 mb-3">
        <span className="opacity-60">{idx + 1} / {nodes.length} · {cur?.chapter}</span>
        <br />
        <b>до узла {cur?.id}</b>
      </div>

      <div className="flex gap-2">
        <button onClick={apply}
          className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-indigo-500">
          {done ? "✅ Готово" : "Применить"}
        </button>
        <button onClick={() => { updateStats(s => applyProgressUpTo(s, -1)); setDone(true); setTimeout(() => setDone(false), 2000); }}
          className={`px-3 py-2 rounded-xl text-sm font-bold border ${dark ? "border-gray-600" : "border-gray-300"}`}>
          Сброс
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        {[["Зона 0", 16], ["Ур. 1", 40], ["Ур. 2", 60], ["Ур. 3", 80], ["Всё", nodes.length - 1]].map(([label, i]) => (
          <button key={label} onClick={() => setIdx(Math.min(i, nodes.length - 1))}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border ${dark ? "border-gray-600" : "border-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
