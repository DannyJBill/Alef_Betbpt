import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Expand to full screen in Telegram Mini App
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand()
  window.Telegram.WebApp.ready()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
