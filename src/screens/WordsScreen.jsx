/**
 * WordsScreen — 💬 Разговор
 * Теперь — заглушка (в разработке)
 */
import { useTheme } from "../context/ThemeContext";

export default function WordsScreen({ onBack }) {
  const { dark } = useTheme();

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-8 text-center">
      {onBack && (
        <button 
          onClick={onBack}
          className={`flex items-center gap-1 mb-6 text-sm font-medium ${dark ? "text-amber-400" : "text-amber-600"}`}
        >
          ← Учиться
        </button>
      )}
      
      <div className="text-6xl mb-6">💬</div>
      <h2 className={`text-3xl font-bold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>
        Разговор
      </h2>
      <p className={`text-lg mb-8 ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Режим «Разговор»<br />в разработке
      </p>
      
      <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-sm
        ${dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
        Скоро здесь будут разговорные практики
      </div>
    </div>
  );
}