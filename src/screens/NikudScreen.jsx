/**
 * NikudScreen — вкладка 📖 Огласовки
 * Заглушка «Скоро» с описанием
 */
import { useTheme } from "../context/ThemeContext";

const COMING_SOON = [
  { icon: "🔵", title: "Что такое никуд",    desc: "10 знаков огласовок — как они выглядят и звучат" },
  { icon: "📝", title: "Карточки никуда",     desc: "SM-2 повторения: знак → звук, звук → знак" },
  { icon: "📖", title: "Чтение с огласовками",desc: "Практика чтения простых слов и текстов" },
  { icon: "⚡", title: "Игра «Прочитай»",     desc: "Слово с огласовками — введи транскрипцию" },
];

export default function NikudScreen() {
  const { dark } = useTheme();
  return (
    <div className="pb-20 px-4 pt-4 max-w-md mx-auto">
      <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Огласовки (Никуд)</h2>
      <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Следующий раздел после алфавита
      </p>

      {/* Coming soon banner */}
      <div className={`rounded-2xl p-5 mb-6 text-center border-2 border-dashed
        ${dark ? "border-indigo-700 bg-indigo-950/30" : "border-indigo-200 bg-indigo-50"}`}>
        <div className="text-5xl mb-3">🚧</div>
        <p className={`text-lg font-bold mb-1 ${dark ? "text-indigo-300" : "text-indigo-700"}`}>
          Скоро!
        </p>
        <p className={`text-sm ${dark ? "text-indigo-400" : "text-indigo-500"}`}>
          Раздел в разработке. Сначала освой алфавит 🔤
        </p>
      </div>

      {/* What's coming */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
        Что будет в этом разделе:
      </p>
      <div className="flex flex-col gap-3">
        {COMING_SOON.map((item, i) => (
          <div key={i} className={`rounded-2xl p-4 flex items-start gap-3 opacity-60
            ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
            <span className="text-2xl mt-0.5">{item.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${dark ? "text-white" : "text-gray-800"}`}>{item.title}</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nikud preview */}
      <div className={`mt-6 rounded-2xl p-4 ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Превью — знаки огласовок:
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { sign: "ָ",  name: "Камац", sound: "а" },
            { sign: "ַ",  name: "Патах", sound: "а" },
            { sign: "ֵ",  name: "Цере",  sound: "э" },
            { sign: "ִ",  name: "Хирик", sound: "и" },
            { sign: "ֹ",  name: "Холам", sound: "о" },
            { sign: "ּ",  name: "Дагеш", sound: "усил." },
          ].map(n => (
            <div key={n.name} className={`rounded-xl p-3 text-center min-w-[64px]
              ${dark ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "serif" }}>
                בּ{n.sign}
              </div>
              <div className={`text-[10px] font-semibold ${dark ? "text-gray-300" : "text-gray-600"}`}>{n.name}</div>
              <div className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>«{n.sound}»</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
