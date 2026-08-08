# Alef Bet — Project State

Только актуальное. При изменении — заменять строку.

Последнее обновление: 08.08.2026 (RLS на 7 таблицах Supabase + фикс BUG-019, сверено с git-историей до `3422537`) Schema version: 8 (канон `facts.{nodes,items}` + регенерируемое зеркало) Версия: **beta.V1.1.4.2**

> ⚠️ Коммит `247a31f` подписан как `beta.V1.1.5`, хотя все коммиты вокруг него (до и после) — `beta.V1.1.4.2`, а в `package.json` версия вообще не менялась (`1.0.0`). Похоже на опечатку/локальную путаницу с номером, а не реальный бамп версии — считаем текущей веткой `beta.V1.1.4.2`. Стоит решить единую схему версионирования (см. BACKLOG).

## Перестройка v1.0 — статус

1. ✅ Этап 1 — планировщик SM-2 (`planner.js`)
2. ✅ Этап 2 — единые факты v8 (`facts.js`, `migrate.js`)
3. ✅ Этап 3 — движок упражнений (`exercises.js` + `ExerciseSession`)
4. ✅ Этап 4 — схлопывание экранов
5. ✅ Этап 5 — тематические колоды + вынос словарного прогресса в Supabase

Перестройка v1.0 завершена. Дальше — контент (уровни 5–6) и продуктовые фичи (админка/дев-режим — уже сделаны сверх плана, см. ниже).

## Движок упражнений

`src/helpers/exercises.js` — чистый реестр генераторов. Question: `{gen, mode:'choice'|'typing', prompt, hebrew?, speak?, options?, answerId, itemId?}`. Генераторы: `choice4` (id вариантов ПОЗИЦИОННЫЙ), `word_ru`, `word_he`, `no_nikud`, `typing`, `phrase_build`. `buildSession(plan, rnd)`. `src/components/ui/ExerciseSession.jsx` — единый рендерер (choice + typing + 🔊). ⛔ Новый тип задания = генератор в реестре, не правка экранов.

Формат item для генераторов: `{id, he, ru, plain, type}` (см. `fromReadingItem`).

## Схема v8

Канон `stats.facts.{nodes,items}`, ключи `l:`/`v:`/`w:`+id. Зеркало (scores/blockScores/readingProgress/progress) регенерируется `commit()`/`migrate()`. Запись только через мутаторы `facts.js`. Слияние — `mergeFacts`. Неизвестные counterKey переживают fold как `#<key>`. Миграция v1→v8 — `migrate.js`.

`src/helpers/devProgress.js` — служебная надстройка над теми же мутаторами: выставляет прогресс «до узла N» для дев-панели (см. ниже). В обычном потоке приложения не вызывается.

## Граф курса

`curriculum.js`: узлы уровней 0–4, 58 уроков (seq 11–70). Модули: phonetics, syntax, morphology, verb, numbers, wordsystem (трек книги). Уровень 4 (seq 53–70): M3.1–3.3, SL1.1–1.4, Q1.1–1.2, CH3.1–3.2, G3.1–3.6, C5.1. Прошедшее время закрыто. G3.5 — синтез (порог 90).

Контент уроков (правила, примеры, В4/квиз-итемы) - `src/data/grammarLessons.js` (~393 В4-итема; подтверждён как текущий файл уроков грамматики). `curriculum.js` = только граф (requires/done), контент в нём не дублируется.

## Экраны

* StudyScreen — Путь | Мой словарь. Путь: автопрокрутка к текущему узлу + рамка активной главы.
* ReadingScreen (Словарь) — список слов + 3 кнопки: 🃏 Повторить (CardsMode), ✅ Проверить (QuizMode: word_ru+word_he+no_nikud+typing), ➕ Ещё слова (колоды, гейт `DECKS_UNLOCK_NODE`). `CardsMode` экспортируется и передаётся в DecksScreen пропом (не импортом — иначе цикл ReadingScreen ↔ DecksScreen).
* DecksScreen — 📦 колоды: список (иконка/прогресс/% знания) → группы по 8 → 📖 Изучить (флип-карточки → тренировка БЕЗ зачёта) / ✅ Проверить (квиз с зачётом). Результаты → `user_word_progress` + слияние в `readingProgress`.
* GameScreen — 2 режима (рейтинг/тренировка), подсветка вариантов, счёт через refs, своя игровая клавиатура (добавлена и доправлена дважды 23.07 — рекомендуется дополнительная проверка стабильности, см. BACKLOG).
* AIAssistant — UI работает, но ответы модели временно отключены (`AI_ENABLED=false` в `helpers/ai.js`): вместо ответа — статичная заглушка «бот пока в разработке».
* ProfileScreen — статистика, достижения, реферальная ссылка (`t.me/alef_betbot/learn?startapp=...`), «Написать в поддержку» (`t.me/alef_betbot`), сброс прогресса. Точки входа в служебные экраны (см. ниже).
* **AdminScreen** (новый, beta.V1.1.4.2) — мини-админка внутри приложения, видна только владельцу (`stats.telegramId === ADMIN_TELEGRAM_ID`, захардкожен в `ProfileScreen.jsx`/`api/admin.js`). Вкладки: 📊 Обзор (DAU/WAU/MAU, воронка курса, отток, события за 7д, топ-рефереры), 👥 Пользователи (поиск/сегменты/карточка юзера — сообщение + выдача-отзыв Premium), 📣 Маркетинг (рассылка по 9 сегментам, deep-link с UTM-меткой, языки аудитории). Есть и отдельный полноценный HTML-дашборд на `/api/admin?view=1` (тот же бэкенд, без входа в мини-апп).
* **DevPanel** (новый, beta.V1.1.4.2, «тест-режим») — скрыта в `ProfileScreen`: 5 тапов по «Мой профиль» либо `localStorage.ab_dev==='1'`. Ползунок по всей ленте Пути, пресеты (Зона 0 / Ур.1 / Ур.2 / Ур.3 / Всё), кнопка «Сброс». Только для тестирования на устройстве без консоли/SQL.
* CheatSheet (+ «🃏 Карточки SM-2») · CardsScreen · HomeScreen · Profile.
* Удалены: AlphabetScreen, GrammarScreen, WordsScreen.

## Словарь — данные

`READING_ITEMS`: 216 слов + 73 фразы (type:"phrase" только многословные) + 16 `PHRASE_LOCKS`. 45 порций. Счётчики: только слова, только резолвящиеся в контент.

## Тематические колоды (этап 5) — В ПРОДЕ (данные)

* Supabase: `deck_words` (462 слова, 15 колод, группы по 8, с транслитерацией) + `user_word_progress` (telegram_id, word_id, seen, correct, wrong, sm2, introduced). RLS включён 08.08.2026 (без политик — весь доступ через service role в `api/*.js`). Источник: курированные 500 слов (`WORD_CATEGORIES`), мусор отфильтрован.
* API: `api/decks.js` (плоский): content / load / sync. ⚠️ Верификация initData НЕ добавлена (подтверждено в коде: `// initData не верифицируем здесь ради краткости примера — В ПРОДЕ добавить`) — сделать перед широким релизом.
* Клиент: `src/data/decks.js` — DECKS (15: family 19, food 79, body 22, nature 25, city 25, home 36, time 25, numbers 7, colors 10, clothes 10, transport 11, study 24, verbs 7, conj 22, misc 140), `loadDeckContent`, `loadWordProgress`, `syncWordProgress`, `deckStats`. `DECKS_UNLOCK_NODE = 'G3.6'`.
* Огласовок нет (карточка «иврит → перевод» + транслит).

## Тесты

`tests/smoke_v7.mjs` — 200 проверок:

```
npx esbuild tests/smoke_v7.mjs --bundle --format=esm --outfile=tests/.smoke.bundle.mjs
node tests/.smoke.bundle.mjs
```

`npm run build` собирается чисто (проверено 07.08.2026, 74 модуля, один Vite-варнинг про размер чанка >500 kB — не ошибка).

## Баги

Открытые баги - в `BUGLOG.md` (отдельный лог, новое сверху). 07.08.2026 разобраны и закрыты BUG-001 (M1.4, перевод גדולה), BUG-003 (G1.1, сноска про שׁוֹתֶה/ל"ה), BUG-004 (C2, позиция «?» в RTL-строках), BUG-005 (M2.1, `answer ∈ options` — плюс разовый прогон линта по всем 393 В4-итемам, нарушений больше нет), BUG-006 (M2.5, «домой» объяснено через исключение הַבַּיְתָה). 08.08.2026 закрыты BUG-019 (`api/decks.js` sync — 500 на успешном upsert из-за пустого тела `201`, найден при постфактум-смоуке RLS-изменения), BUG-020 (`api/sync.js` dev-обход подписи Telegram работал и на проде — auth bypass, найден живым `curl` боевого URL; фикс требует ещё и env-флаг `ALLOW_DEV_BYPASS`, который не должен быть задан в Vercel-проде) и BUG-021 (`ADMIN_SECRET` — 4-значный числовой без rate-limit, код-часть пофикшена constant-time сравнением, но саму ротацию секрета в Vercel должен сделать владелец вручную) — оба последних требуют ручного действия владельца в Vercel Environment Variables, см. критичные пункты в `BACKLOG.md`. Открытые остались BUG-002 (нискуд нечитаем на телефоне — UX/визуальный, нужна проверка на устройстве), BUG-010 (словарь без огласовок — вопрос продукта), BUG-014 (правило про союз «у» перед ש — нужна лингвистическая сверка), BUG-018 (пааль объясняется бессистемно — методический долг). Build + смоук (200/200) зелёные после всех правок.

## Инфраструктура

Repo `DannyJBill/Alef_Betbpt` · `https://alef-betbpt.vercel.app` · бот `@alef_betbot` (в проф. ссылках и `t.me/AlefBetBot` в UpdatePopup — тот же бот, разный регистр в разных местах кода) · Supabase `pikoccutljmlkfondcxc` · Windows/PowerShell (команды раздельно). API плоский: sync, bot, cron, chat, admin, events, referral, payments-create, payments-status, decks. Vercel gotchas: `_`-префикс приватный, вложенные пути 404, cross-file импорты не работают, `SUPABASE_URL` без `/rest/v1`.

`ADMIN_TELEGRAM_ID` (владелец) захардкожен как строка в `api/admin.js` и продублирован в `src/screens/ProfileScreen.jsx` — не секрет сам по себе (это telegram id, не пароль), но два места дублирования и отсутствие env-переменной — потенциальный источник рассинхрона при смене владельца.

Доки проекта: `PROJECT_OVERVIEW.md`, `PROJECT_STATE.md`, `BACKLOG.md`, `BUGLOG.md`, `CHANGELOG.md` (все пять восстановлены 07.08.2026 — до этого существовали только вне git-репозитория).

## Известные рудименты / хвосты

* GameScreen топик «Слова» — на легаси `WORD_CATEGORIES`; слить с колодами.
* `recordWordSeen`/`recordWordResult`, `getDueWords()` — не подключены к UI.
* `api/decks.js` без верификации initData.
* Колоды не пишут SM-2 (только seen/correct/wrong/introduced).
* **Новое:** `UpdatePopup` рекламирует «🤖 ИИ-помощник — спроси что угодно на иврите», а `AI_ENABLED=false` — обещание расходится с реальным поведением приложения.
* **Новое:** `premiumExpiresAt` выставляется админкой (`grant_premium` → `days`), но нигде не проверяется автоматически — просроченный Premium не отзывается (тот же пункт уже был в BACKLOG, подтверждён по коду: в `api/cron.js` такой проверки нет).
