import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Analytics } from './helpers/analytics.js'

if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp
  tg.expand()
  // Bot API 8.0+: разворачивает мини-апп edge-to-edge (нужно на iPad —
  // одного expand() там недостаточно, окно остаётся маленьким). Метод может
  // не только отсутствовать в старых клиентах, но и БЫТЬ определён и синхронно
  // throw'ить WebAppMethodUnsupported, если клиент ниже нужной версии Bot API —
  // поэтому одного `?.()` мало, нужен try/catch, иначе падает вся загрузка приложения.
  try { tg.requestFullscreen?.() } catch { /* старый клиент — просто пропускаем */ }
  tg.ready()

  // requestFullscreen() рисует контент edge-to-edge — без этого шапка
  // (TopBar) заезжает под системный статус-бар/шторку и под собственный
  // хедер Telegram (кнопка Close, шеврон, меню). safeAreaInset — отступ под
  // само «железо» (чёлка/статус-бар), contentSafeAreaInset — доп. место,
  // занятое хедером Telegram поверх нашего контента в fullscreen. Пишем
  // сумму в CSS-переменную, читают её index.css/TopBar как padding-top.
  function applySafeArea() {
    const top = (tg.safeAreaInset?.top || 0) + (tg.contentSafeAreaInset?.top || 0)
    document.documentElement.style.setProperty('--tg-top-inset', `${top}px`)
  }
  applySafeArea()
  tg.onEvent?.('safeAreaChanged', applySafeArea)
  tg.onEvent?.('contentSafeAreaChanged', applySafeArea)
}

// Логировать открытие приложения
Analytics.open();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
