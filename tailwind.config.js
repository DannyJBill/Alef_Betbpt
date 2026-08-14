/** @type {import('tailwindcss').Config} */
export default {
  // Без этого `dark:`-классы Tailwind следуют системной теме устройства
  // (prefers-color-scheme), а не переключателю темы в приложении (см.
  // ThemeContext.jsx) — из-за рассинхрона светлая тема в приложении могла
  // получить тёмный фон блока (по системе) под тёмным текстом (по стейту
  // приложения) и стать нечитаемой. 'class' заставляет dark:-классы
  // слушаться класса .dark на <html>, который синхронизирует ThemeContext.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
