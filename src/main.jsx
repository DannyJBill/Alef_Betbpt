import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Analytics } from './helpers/analytics.js'

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand()
  // Bot API 8.0+: разворачивает мини-апп edge-to-edge (нужно на iPad —
  // одного expand() там недостаточно, окно остаётся маленьким). Метод может
  // не только отсутствовать в старых клиентах, но и БЫТЬ определён и синхронно
  // throw'ить WebAppMethodUnsupported, если клиент ниже нужной версии Bot API —
  // поэтому одного `?.()` мало, нужен try/catch, иначе падает вся загрузка приложения.
  try { window.Telegram.WebApp.requestFullscreen?.() } catch { /* старый клиент — просто пропускаем */ }
  window.Telegram.WebApp.ready()
}

// Логировать открытие приложения
Analytics.open();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
