import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";
import { levelProgress } from "../data/constants";
import ProgressBar from "../components/ui/ProgressBar";
import DevPanel from "../components/ui/DevPanel";

const BOT_USERNAME = "alef_betbot"; // поменяй на своего бота
const APP_SHORT    = "learn";

export default function ProfileScreen({ onBack }) {
  const { dark } = useTheme();
  const { stats, resetStats, updateStats } = useStats();
  const [devTaps, setDevTaps] = useState(0);
  const devOn = devTaps >= 5 || localStorage.getItem("ab_dev") === "1";
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { level, pct: levelPct, xpToNext } = levelProgress(stats.xp);
  const tg = window.Telegram?.WebApp;
  const isTelegram = !!tg;

  // Реферальная ссылка
  const refCode = stats.referralCode || `ref_${Date.now()}`;
  const refLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT}?startapp=${refCode}`;
  const shareText = "Учу иврит по приложению Alef Bet 🇮🇱 — выучил алфавит за неделю! Присоединяйся →";

  async function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetting(true);
    await resetStats();
    setResetting(false);
    setConfirmReset(false);
  }

  function handleShare() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    tg.openTelegramLink(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const achievements = [
    { icon: "🌟", name: "Первая буква",  done: stats.xp >= 20 },
    { icon: "📚", name: "5 уроков",      done: stats.dailyDone >= 5 },
    { icon: "🔥", name: "3 дня подряд",  done: stats.streak >= 3 },
    { icon: "⚡", name: "100 XP",        done: stats.xp >= 100 },
    { icon: "🎯", name: "Точность 80%",  done: stats.totalAnswers > 0 && (stats.correctAnswers / stats.totalAnswers) >= 0.8 },
    { icon: "🏆", name: "Весь алфавит",  done: Object.values(stats.progress?.letters || {}).filter(v => v === 'done').length >= 5 },
    { icon: "👥", name: "Пригласил друга", done: (stats.referralsCount || 0) >= 1 },
  ];

  const statCards = [
    { icon: "⚡", val: stats.xp,       label: "XP" },
    { icon: "🔥", val: stats.streak,   label: "Дней" },
    { icon: "💰", val: stats.coins,    label: "Монет" },
    { icon: "📖", val: stats.dailyDone,label: "Уроков" },
  ];

  return (
    <div className="pb-20 px-4 pt-6 max-w-md mx-auto">
      {/* Назад */}
      {onBack && (
        <button onClick={onBack}
          className="flex items-center gap-1 mb-4 text-sm font-medium text-indigo-500">
          ← Главная
        </button>
      )}
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-3xl mb-3">
          😊
        </div>
        <h2 onClick={() => setDevTaps(t => { const n = t + 1; if (n >= 5) localStorage.setItem("ab_dev", "1"); return n; })}
          className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Мой профиль</h2>
        <div className={`text-sm mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>Уровень {level}</div>
        <div className="w-40 mb-1">
          <ProgressBar pct={levelPct} color="bg-indigo-500" height="h-2" />
        </div>
        <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
          {xpToNext} XP до следующего уровня
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-2xl p-3 text-center ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
            <div className="text-xl">{s.icon}</div>
            <div className={`font-bold text-base ${dark ? "text-white" : "text-gray-900"}`}>{s.val}</div>
            <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Referral block */}
      <div className={`rounded-2xl p-4 mb-5 border ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👥</span>
          <p className={`font-bold text-sm ${dark ? "text-white" : "text-gray-800"}`}>Пригласи друга</p>
        </div>
        <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Ты и друг получите по <b>+100 XP</b> когда он пройдёт первую группу букв
        </p>

        <div className="flex gap-2 mb-3">
          {isTelegram && (
            <button onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm active:scale-95 transition-all">
              Пригласить в Telegram →
            </button>
          )}
          <button onClick={handleCopy}
            className={`${isTelegram ? '' : 'flex-1'} px-4 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all border ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500'
                : dark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
            }`}>
            {copied ? 'Скопировано ✓' : 'Скопировать ссылку'}
          </button>
        </div>

        {(stats.referralsCount > 0 || stats.referralsXpEarned > 0) && (
          <div className={`flex gap-4 text-xs pt-3 border-t ${dark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}>
            <span>👤 Приглашено: <b className={dark ? "text-white" : "text-gray-800"}>{stats.referralsCount || 0}</b></span>
            <span>⚡ Заработано: <b className={dark ? "text-yellow-400" : "text-indigo-600"}>{stats.referralsXpEarned || 0} XP</b></span>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className={`rounded-2xl p-4 border shadow-sm ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <p className={`font-bold text-sm mb-3 ${dark ? "text-white" : "text-gray-800"}`}>Достижения</p>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a, i) => (
            <div key={i} className={`flex flex-col items-center p-2 rounded-xl text-center transition-all
              ${a.done
                ? dark ? "bg-indigo-900/50" : "bg-indigo-50"
                : `opacity-40 ${dark ? "bg-gray-700/50" : "bg-gray-50"}`
              }`}>
              <span className="text-2xl">{a.icon}</span>
              <span className={`text-[10px] mt-1 ${dark ? "text-gray-300" : "text-gray-600"}`}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mt-5 flex flex-col gap-3">
        {/* Support */}
        <button
          onClick={() => window.Telegram?.WebApp?.openTelegramLink("https://t.me/alef_betbot")}
          className={`w-full py-3 rounded-2xl font-semibold text-sm border transition-all active:scale-95 ${
            dark ? "border-gray-700 text-gray-300 bg-gray-800" : "border-gray-200 text-gray-600 bg-white"
          }`}>
          💬 Написать в поддержку
        </button>

        {devOn && <DevPanel stats={stats} updateStats={updateStats} dark={dark} />}

        {/* Reset */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
            confirmReset
              ? "bg-red-500 text-white"
              : dark ? "border border-gray-700 text-red-400 bg-gray-800" : "border border-gray-200 text-red-400 bg-white"
          }`}>
          {resetting ? "Сбрасываем…" : confirmReset ? "⚠️ Подтвердить сброс — это нельзя отменить" : "🗑 Сбросить прогресс"}
        </button>
        {confirmReset && !resetting && (
          <button
            onClick={() => setConfirmReset(false)}
            className={`w-full py-2 rounded-2xl text-sm transition-all active:scale-95 ${
              dark ? "text-gray-500" : "text-gray-400"
            }`}>
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
