import { createContext, useContext, useState, useEffect, useRef } from "react";

const THEME_KEY = "hebrew-app-theme";
// Отдельный флаг: пользователь явно переключил тему вручную (через toggle()).
// Пока он стоит, ресинки Telegram-события themeChanged не должны перетирать выбор.
const THEME_MANUAL_KEY = "hebrew-app-theme-manual";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    // Сначала проверяем сохранённую тему
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch { /* ignore */ }
    // Если нет сохранённой — берём тему из Telegram WebApp
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.colorScheme === "dark") return true;
    } catch { /* ignore */ }
    return false;
  });
  const [manual, setManual] = useState(() => {
    try { return localStorage.getItem(THEME_MANUAL_KEY) === "1"; } catch { return false; }
  });
  // themeChanged-обработчик ниже навешивается один раз (пустой deps) — держим
  // актуальное значение manual в ref, чтобы замыкание не видело устаревшее.
  const manualRef = useRef(manual);
  useEffect(() => { manualRef.current = manual; }, [manual]);

  // Persist whenever theme changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch { /* ignore */ }
  }, [dark]);

  // Синхронизируем класс .dark на <html> — Tailwind (darkMode: 'class')
  // читает dark:-классы отсюда, а не из системной темы устройства. Без
  // этого dark:-классы в некоторых экранах следовали бы системной теме,
  // расходясь с этим стейтом (см. tailwind.config.js).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_MANUAL_KEY, manual ? "1" : "0");
    } catch { /* ignore */ }
  }, [manual]);

  // Следим за сменой темы в Telegram — но только пока пользователь не выбрал тему вручную сам
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const handler = () => {
      if (manualRef.current) return;
      setDark(tg.colorScheme === "dark");
    };
    tg.onEvent?.("themeChanged", handler);
    return () => tg.offEvent?.("themeChanged", handler);
  }, []);

  const toggle = () => { setManual(true); setDark(d => !d); };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
