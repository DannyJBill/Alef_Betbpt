import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Analytics } from './helpers/analytics.js'

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand()
  window.Telegram.WebApp.ready()
}

// Логировать открытие приложения
Analytics.open();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
