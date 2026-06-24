/**
 * Логирование событий на сервер.
 * Вызывать в ключевых точках приложения.
 */

const tg = window.Telegram?.WebApp;

async function logEvent(event_type, payload = {}) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg?.initData || null,
        event_type,
        payload,
      }),
    });
  } catch { /* silent */ }
}

export const Analytics = {
  // Открыл приложение
  open: ()                         => logEvent("open"),
  // Завершил урок
  lessonComplete: (groupId, score) => logEvent("lesson_complete", { groupId, score }),
  // Прошёл группу
  groupComplete: (groupId, score)  => logEvent("group_complete",  { groupId, score }),
  // Сыграл в игру
  gamePlayed: (score)              => logEvent("game_play",       { score }),
  // Повторил карточку
  cardReview: (letterId, quality)  => logEvent("card_review",     { letterId, quality }),
  // Открыл AI
  aiOpen: ()                       => logEvent("ai_open"),
};
