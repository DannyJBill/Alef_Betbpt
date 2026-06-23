import { createContext, useContext, useState, useEffect } from "react";

const THEME_KEY = "hebrew-app-theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    // Read persisted preference on first render
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });

  // Persist whenever theme changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch { /* ignore */ }
  }, [dark]);

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
