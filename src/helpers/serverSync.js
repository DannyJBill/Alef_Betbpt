/**
 * Sync stats with server using Telegram initData as auth.
 * Falls back silently if not in Telegram or server unavailable.
 */
import { foldToFacts, mergeFacts } from "./facts";

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
    // v8: канон — facts. Сливаем ОДНИМ правилом (mergeFacts): по item, счётчики
    // по максимуму, introduced по ИЛИ, sm2 — более продвинутая карта. Если одна
    // из сторон ещё v7 (нет facts) — сворачиваем её на лету (foldToFacts).
    if (localStats) {
      const srvFacts = serverStats.facts || foldToFacts(serverStats);
      const locFacts = localStats.facts  || foldToFacts(localStats);
      const facts = mergeFacts(srvFacts, locFacts);
      return {
        ...serverStats,
        facts,
        xp:     Math.max(serverStats.xp     ?? 0, localStats.xp     ?? 0),
        coins:  Math.max(serverStats.coins  ?? 0, localStats.coins  ?? 0),
        streak: Math.max(serverStats.streak ?? 0, localStats.streak ?? 0),
        // Premium: once granted, never revoke on client side
        isPremium: serverStats.isPremium || localStats.isPremium || false,
        // Зеркало (scores/blockScores/readingProgress/…) регенерируется в migrate().
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
