/**
 * Sync stats with server using Telegram initData as auth.
 * Falls back silently if not in Telegram or server unavailable.
 */

const tg = window.Telegram?.WebApp;

export function getInitData() {
  return tg?.initData || null;
}

export async function saveStatsToServer(stats) {
  const initData = getInitData();
  if (!initData) return;

  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, stats, action: "save" }),
    });
  } catch { /* silent fail — local storage is still the source of truth */ }
}

export async function loadStatsFromServer(localStats = null) {
  const initData = getInitData();
  if (!initData) return null;

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "load" }),
    });
    if (!res.ok) return null;
    const { stats: serverStats } = await res.json();
    if (!serverStats) return null;

    // Never let server data roll back local progress.
    // Take the best of each field independently.
    if (localStats) {
      // scores (v7, единый факт прогресса): по-ключевой максимум —
      // сервер никогда не откатывает локальный прогресс
      const scores = { ...(serverStats.scores || {}) };
      Object.entries(localStats.scores || {}).forEach(([k, v]) => {
        scores[k] = Math.max(scores[k] ?? 0, v ?? 0);
      });
      // blockScores (игровые счётчики) — тоже по максимуму
      const blockScores = { ...(serverStats.blockScores || {}) };
      Object.entries(localStats.blockScores || {}).forEach(([k, v]) => {
        blockScores[k] = Math.max(blockScores[k] ?? 0, v ?? 0);
      });
      // Словарь (сквозной поток слов): studied — объединение, words — по-полевой максимум
      const srvRp = serverStats.readingProgress || {};
      const locRp = localStats.readingProgress || {};
      const studied = Array.from(new Set([...(srvRp.studied || []), ...(locRp.studied || [])]));
      const words = { ...(srvRp.words || {}) };
      Object.entries(locRp.words || {}).forEach(([id, w]) => {
        const sv = words[id] || { seen: 0, correct: 0, wrong: 0 };
        words[id] = {
          seen:    Math.max(sv.seen    ?? 0, w.seen    ?? 0),
          correct: Math.max(sv.correct ?? 0, w.correct ?? 0),
          wrong:   Math.max(sv.wrong   ?? 0, w.wrong   ?? 0),
        };
      });
      return {
        ...serverStats,
        xp:        Math.max(serverStats.xp     ?? 0, localStats.xp     ?? 0),
        coins:     Math.max(serverStats.coins   ?? 0, localStats.coins   ?? 0),
        streak:    Math.max(serverStats.streak  ?? 0, localStats.streak  ?? 0),
        scores,
        blockScores,
        readingProgress: { ...srvRp, studied, words },
        // Premium: once granted, never revoke on client side
        isPremium: serverStats.isPremium || localStats.isPremium || false,
      };
    }

    return serverStats;
  } catch { return null; }
}

export async function resetStatsOnServer() {
  const initData = getInitData();
  if (!initData) return false;

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "reset" }),
    });
    return res.ok;
  } catch { return false; }
}
