import { createContext, useContext, useState, useEffect } from "react";

const THEME_KEY = "hebrew-app-theme";

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

  // Persist whenever theme changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch { /* ignore */ }
  }, [dark]);

  // Следим за сменой темы в Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const handler = () => setDark(tg.colorScheme === "dark");
    tg.onEvent?.("themeChanged", handler);
    return () => tg.offEvent?.("themeChanged", handler);
  }, []);

  const toggle = () => setDark(d => !d);

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
