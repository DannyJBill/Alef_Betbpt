/**
 * Sync stats with server (Vercel KV) using Telegram initData as auth.
 * Falls back silently if not in Telegram or server unavailable.
 */

const tg = window.Telegram?.WebApp;

export function getInitData() {
  return tg?.initData || null;
}

export async function saveStatsToServer(stats) {
  const initData = getInitData();
  if (!initData) return; // not in Telegram — skip

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
      return {
        ...serverStats,
        xp:     Math.max(serverStats.xp     ?? 0, localStats.xp     ?? 0),
        coins:  Math.max(serverStats.coins   ?? 0, localStats.coins   ?? 0),
        streak: Math.max(serverStats.streak  ?? 0, localStats.streak  ?? 0),
        // Premium: once granted, never revoke on client side
        isPremium: serverStats.isPremium || localStats.isPremium || false,
      };
    }

    return serverStats;
  } catch { return null; }
}
