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

export async function loadStatsFromServer() {
  const initData = getInitData();
  if (!initData) return null;

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action: "load" }),
    });
    if (!res.ok) return null;
    const { stats } = await res.json();
    return stats;
  } catch { return null; }
}
