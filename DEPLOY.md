# 🚀 Деплой на Vercel + Telegram Mini App

## Содержание

1. [Структура файлов проекта](#1-структура-файлов-проекта)
2. [Шаг 1 — Локальный запуск](#2-шаг-1--локальный-запуск)
3. [Шаг 2 — Git-репозиторий](#3-шаг-2--git-репозиторий)
4. [Шаг 3 — Деплой на Vercel](#4-шаг-3--деплой-на-vercel)
5. [Шаг 4 — Создание Telegram-бота](#5-шаг-4--создание-telegram-бота)
6. [Шаг 5 — Подключение Mini App](#6-шаг-5--подключение-mini-app)
7. [Шаг 6 — Настройка Mini App](#7-шаг-6--настройка-mini-app)
8. [Переменные окружения](#8-переменные-окружения)
9. [Обновление приложения](#9-обновление-приложения)
10. [Решение проблем](#10-решение-проблем)

---

## 1. Структура файлов проекта

После распаковки архива структура должна выглядеть так:

```
hebrew-app/
├── src/                      # исходный код (уже есть)
├── index.html                # точка входа
├── package.json              # зависимости
├── vite.config.js            # сборщик
├── tailwind.config.js        # стили
├── postcss.config.js         # PostCSS
├── vercel.json               # конфиг Vercel
└── .gitignore
```

---

## 2. Шаг 1 — Локальный запуск

### Требования

- Node.js **18+** — проверить: `node -v`
- npm **9+** — проверить: `npm -v`

### Установка и запуск

```bash
# 1. Перейти в папку проекта
cd hebrew-app

# 2. Установить зависимости
npm install

# 3. Запустить dev-сервер
npm run dev
```

Откроется `http://localhost:5173` — приложение работает.

### Сборка для продакшн

```bash
npm run build
# Результат в папке dist/

npm run preview
# Предпросмотр продакшн-сборки на http://localhost:4173
```

---

## 3. Шаг 2 — Git-репозиторий

### Создать репозиторий на GitHub

1. Открыть [github.com/new](https://github.com/new)
2. Имя: `hebrew-alphabet-app`
3. Видимость: Public (Vercel Free работает с публичными) или Private
4. **Не добавлять** README, .gitignore, license — они уже есть в проекте
5. Нажать **Create repository**

### Загрузить код

```bash
cd hebrew-app

git init
git add .
git commit -m "feat: initial Hebrew alphabet app"

# Заменить YOUR_USERNAME на ваш GitHub логин
git remote add origin https://github.com/YOUR_USERNAME/hebrew-alphabet-app.git
git branch -M main
git push -u origin main
```

---

## 4. Шаг 3 — Деплой на Vercel

### Способ 1 — через сайт Vercel (рекомендуется)

1. Открыть [vercel.com](https://vercel.com) → Sign Up / Log In через GitHub
2. Нажать **Add New → Project**
3. Найти `hebrew-alphabet-app` → нажать **Import**
4. Vercel автоматически определит Vite-проект. Настройки:

   | Параметр | Значение |
   |----------|----------|
   | Framework Preset | **Vite** |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

5. Нажать **Deploy** и подождать ~1 минуту

6. Vercel выдаст URL вида: `https://hebrew-alphabet-app-abc123.vercel.app`

   > ⚠️ Скопируйте этот URL — он понадобится для Telegram

### Способ 2 — через Vercel CLI

```bash
# Установить Vercel CLI глобально
npm install -g vercel

# Залогиниться
vercel login

# Деплой из папки проекта
cd hebrew-app
vercel

# Следовать интерактивным подсказкам:
# Set up and deploy? → Y
# Which scope? → ваш аккаунт
# Link to existing project? → N
# Project name → hebrew-alphabet-app
# Directory → ./
# Override settings? → N

# После деплоя CLI покажет URL продакшна
vercel --prod
```

### Проверка деплоя

Откройте URL в браузере — приложение должно загрузиться.
Откройте в мобильном браузере — убедитесь, что адаптивная верстка работает.

---

## 5. Шаг 4 — Создание Telegram-бота

### Создать бота через BotFather

1. Открыть Telegram → найти **[@BotFather](https://t.me/BotFather)**
2. Отправить `/newbot`
3. Ввести **имя бота** (публичное): `Hebrew Alphabet`
4. Ввести **username бота** (уникальный, без пробелов): `hebrew_alphabet_bot`
   > Username должен заканчиваться на `bot`
5. BotFather пришлёт **токен** вида: `7123456789:AAHdqTAZZZ...`

   > 🔒 Токен — секрет. Не коммитить в git, не публиковать.

---

## 6. Шаг 5 — Подключение Mini App

### Создать Mini App через BotFather

1. В чате с [@BotFather](https://t.me/BotFather) отправить `/newapp`
2. Выбрать своего бота (например `@hebrew_alphabet_bot`)
3. Ввести **заголовок**: `Hebrew Alphabet`
4. Ввести **описание**: `Учите иврит весело и быстро`
5. Загрузить **иконку** 640×360 px (или пропустить — Enter)
6. Ввести **URL приложения**: `https://hebrew-alphabet-app-abc123.vercel.app`
   > Вставить свой URL с Vercel из шага 3
7. Ввести **short name**: `hebrew` (используется в ссылке `t.me/ваш_бот/hebrew`)

BotFather подтвердит: *"Done! Mini App created."*

### Добавить кнопку Menu Button (необязательно)

Чтобы приложение открывалось кнопкой в нижней панели чата:

```
/mybots → выбрать бота → Bot Settings → Menu Button → Configure Menu Button
→ ввести URL: https://hebrew-alphabet-app-abc123.vercel.app
→ ввести текст кнопки: Учить иврит
```

---

## 7. Шаг 6 — Настройка Mini App

### Проверить корректную работу

1. Открыть Telegram → найти своего бота
2. Нажать **Start** или кнопку Menu
3. Приложение должно открыться в WebView внутри Telegram

### Что уже настроено в коде

В `src/main.jsx` уже есть инициализация Telegram SDK:

```js
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand()   // развернуть на весь экран
  window.Telegram.WebApp.ready()    // сообщить TG что приложение готово
}
```

В `src/index.css` добавлены safe area отступы для iOS:

```css
#root {
  padding-bottom: env(safe-area-inset-bottom); /* home bar на iPhone */
}
```

### Настроить цвет хедера Telegram (необязательно)

Добавить в `src/main.jsx`:

```js
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand()
  window.Telegram.WebApp.ready()

  // Цвет статус-бара Telegram под тему приложения
  window.Telegram.WebApp.setHeaderColor("#6366f1") // indigo-500
  window.Telegram.WebApp.setBackgroundColor("#f9fafb")
}
```

### Получить данные пользователя Telegram (необязательно)

```js
// src/context/StatsContext.jsx или App.jsx
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
// tgUser.id, tgUser.first_name, tgUser.username, tgUser.photo_url
```

---

## 8. Переменные окружения

Если планируете добавить серверную часть или скрыть чувствительные данные:

### Создать `.env.local` (локально)

```bash
# .env.local — НЕ коммитить в git (уже в .gitignore)
VITE_API_BASE_URL=https://your-api.vercel.app
```

### Добавить переменные на Vercel

1. Vercel Dashboard → ваш проект → **Settings → Environment Variables**
2. Добавить переменную: `VITE_API_BASE_URL` = `https://your-api.vercel.app`
3. Scope: **Production** + **Preview** + **Development**
4. Нажать **Save** → сделать новый деплой

### Использовать в коде

```js
const apiUrl = import.meta.env.VITE_API_BASE_URL
```

> ⚠️ Все `VITE_`-переменные видны в браузере. Для секретов (токен бота, ключи API) — нужен бэкенд-прокси.

---

## 9. Обновление приложения

После любых изменений в коде:

```bash
git add .
git commit -m "fix: описание изменений"
git push origin main
```

**Vercel автоматически** запустит новый деплой через 30–60 секунд. Следить в [vercel.com/dashboard](https://vercel.com/dashboard).

### Preview-деплои

Каждый push в ветку (не `main`) создаёт отдельный preview URL:

```bash
git checkout -b feature/new-screen
git push origin feature/new-screen
# Vercel создаст: https://hebrew-app-git-feature-new-screen-abc123.vercel.app
```

---

## 10. Решение проблем

### Белый экран после деплоя

**Причина:** Vercel не знает, что это SPA, и возвращает 404 на прямых URL.

**Решение:** Убедитесь, что `vercel.json` в корне проекта:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### `npm run build` падает с ошибкой

```bash
# Проверить версию Node.js
node -v  # должна быть 18+

# Очистить кэш и переустановить
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Приложение не открывается в Telegram

**Причина 1:** URL в BotFather указан без `https://`
→ Telegram требует только HTTPS. Vercel выдаёт HTTPS автоматически. ✅

**Причина 2:** Домен не верифицирован
→ Vercel-домены `*.vercel.app` принимаются Telegram без дополнительной верификации.

**Причина 3:** Mini App не опубликован
→ В BotFather: `/myapps` → выбрать приложение → убедиться, что статус Active.

---

### localStorage не работает в Telegram

В некоторых версиях Telegram WebView `localStorage` может быть ограничен.

**Проверить:**
```js
try {
  localStorage.setItem("test", "1")
  localStorage.removeItem("test")
} catch {
  console.warn("localStorage недоступен")
}
```

`StatsContext.jsx` уже имеет `try/catch` вокруг localStorage — приложение не упадёт, но прогресс не сохранится.

---

### Keyboard перекрывает контент на iOS

Добавить в `src/main.jsx`:
```js
if (window.Telegram?.WebApp) {
  // Автоматически скроллить к активному input
  window.Telegram.WebApp.onEvent('viewportChanged', () => {
    document.activeElement?.scrollIntoView({ block: 'center' })
  })
}
```

---

## Итоговые ссылки

| Ресурс | URL |
|--------|-----|
| Telegram Mini Apps — документация | https://core.telegram.org/bots/webapps |
| Telegram SDK reference | https://core.telegram.org/bots/webapps#initializing-mini-apps |
| BotFather | https://t.me/BotFather |
| Vercel Dashboard | https://vercel.com/dashboard |
| Vercel CLI docs | https://vercel.com/docs/cli |
| Vite docs | https://vitejs.dev |
ENDOFFILE
