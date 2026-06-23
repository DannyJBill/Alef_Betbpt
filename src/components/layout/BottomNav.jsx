import { useTheme } from "../../context/ThemeContext";

const NAV_ITEMS = [
  { id: "home",    icon: "🏠", label: "Главная"  },
  { id: "learn",   icon: "📚", label: "Учиться"  },
  { id: "cards",   icon: "🃏", label: "Карточки" },
  { id: "game",    icon: "🎮", label: "Игра"     },
  { id: "profile", icon: "👤", label: "Профиль"  },
];

export default function BottomNav({ tab, setTab }) {
  const { dark } = useTheme();

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t flex z-40
      ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      {NAV_ITEMS.map(it => (
        <button
          key={it.id}
          onClick={() => setTab(it.id)}
          aria-label={it.label}
          aria-current={tab === it.id ? "page" : undefined}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all
            ${tab === it.id
              ? "text-indigo-500"
              : dark
                ? "text-gray-500 hover:text-gray-300"
                : "text-gray-400 hover:text-gray-600"
            }`}>
          <span className="text-xl" aria-hidden="true">{it.icon}</span>
          <span className="text-[10px] font-medium">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
