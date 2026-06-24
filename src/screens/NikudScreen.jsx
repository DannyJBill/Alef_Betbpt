/**
 * NikudScreen — 📖 Огласовки
 * Предзаказ за Telegram Stars (99 Stars)
 * После оплаты — экран "ты в списке первых"
 */
import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useStats } from "../context/StatsContext";

const PREORDER_PRICE = 99;   // Stars
const FULL_PRICE     = 199;  // Stars — цена после релиза

const COMING_FEATURES = [
  { icon: "🔵", title: "10 знаков огласовок",       desc: "Как выглядят и звучат — патах, камац, цере и другие" },
  { icon: "🃏", title: "Карточки SM-2",              desc: "Знак → звук и звук → знак, с интервальным повторением" },
  { icon: "📖", title: "Чтение с огласовками",       desc: "Простые слова и тексты — читаешь, как носитель" },
  { icon: "⚡", title: "Игра «Прочитай слово»",      desc: "Слово с огласовками — введи транскрипцию на скорость" },
  { icon: "🤖", title: "AI-ассистент без лимита",    desc: "Задавай вопросы об иврите без ограничений" },
];

const NIKUD_PREVIEW = [
  { base: "בַ", name: "Патах",  sound: "а",    color: "emerald" },
  { base: "בָ", name: "Камац",  sound: "а",    color: "emerald" },
  { base: "בֵ", name: "Цере",   sound: "э",    color: "blue"    },
  { base: "בִ", name: "Хирик",  sound: "и",    color: "blue"    },
  { base: "בֹ", name: "Холам",  sound: "о",    color: "amber"   },
  { base: "בּוּ", name: "Шурук", sound: "у",   color: "amber"   },
];

const COLOR_MAP = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950",       text: "text-blue-700 dark:text-blue-300",       border: "border-blue-200 dark:border-blue-800"       },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950",     text: "text-amber-700 dark:text-amber-300",     border: "border-amber-200 dark:border-amber-800"     },
};

export default function NikudScreen() {
  const { dark } = useTheme();
  const { stats, updateStats } = useStats();

  const [buyState, setBuyState] = useState("idle"); // idle | loading | success | error | already
  const [errorMsg, setErrorMsg] = useState("");

  // Если isPremium уже стоит — сразу показать success-экран
  useEffect(() => {
    if (stats.isPremium) setBuyState("already");
  }, [stats.isPremium]);

  // ─── Проверить статус на сервере при открытии экрана ──────────────────────
  useEffect(() => {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!tgId || stats.isPremium) return;

    fetch(`/api/payments-status?telegramId=${tgId}`)
      .then(r => r.json())
      .then(data => {
        if (data.isPremium && !stats.isPremium) {
          // Сервер знает что premium — синхронизировать локально
          updateStats(prev => ({
            ...prev,
            isPremium:          true,
            premiumPurchasedAt: data.premiumPurchasedAt,
            premiumType:        data.premiumType,
          }));
          setBuyState("already");
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Запуск оплаты ─────────────────────────────────────────────────────────
  async function handleBuy() {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!tgId) {
      setErrorMsg("Открой приложение через Telegram");
      setBuyState("error");
      return;
    }

    setBuyState("loading");
    setErrorMsg("");

    try {
      // Получить invoice link с сервера
      const res = await fetch("/api/payments-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "nikud_lifetime", telegramId: tgId }),
      });
      const data = await res.json();

      if (data.alreadyPurchased) {
        updateStats(prev => ({ ...prev, isPremium: true }));
        setBuyState("already");
        return;
      }

      if (!data.invoiceLink) throw new Error(data.error || "No invoice link");

      // Открыть нативный экран оплаты Telegram
      window.Telegram.WebApp.openInvoice(data.invoiceLink, (status) => {
        if (status === "paid") {
          // Оптимистично обновить локально — сервер обновится через webhook бота
          updateStats(prev => ({
            ...prev,
            isPremium:          true,
            premiumPurchasedAt: Date.now(),
            premiumType:        "lifetime",
            xp:                 (prev.xp || 0) + 200,
          }));
          setBuyState("success");
        } else if (status === "cancelled") {
          setBuyState("idle");
        } else if (status === "failed") {
          setErrorMsg("Оплата не прошла. Попробуй ещё раз.");
          setBuyState("error");
        }
        // pending — ждём, не меняем состояние
      });

    } catch (err) {
      console.error("[NikudScreen] buy error:", err);
      setErrorMsg("Ошибка соединения. Попробуй позже.");
      setBuyState("error");
    }
  }

  // ─── Экран "уже куплено / success" ────────────────────────────────────────
  if (buyState === "success" || buyState === "already") {
    return <PremiumScreen dark={dark} isNew={buyState === "success"} />;
  }

  // ─── Основной экран предзаказа ─────────────────────────────────────────────
  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">

      {/* Заголовок */}
      <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
        Огласовки (Никуд)
      </h2>
      <p className={`text-sm mb-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Следующий шаг после алфавита
      </p>

      {/* Превью знаков */}
      <div className={`rounded-2xl p-4 mb-5 ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Знаки огласовок:
        </p>
        <div className="grid grid-cols-3 gap-2">
          {NIKUD_PREVIEW.map(n => {
            const c = COLOR_MAP[n.color];
            return (
              <div key={n.name} className={`rounded-xl p-3 text-center border ${c.bg} ${c.border}`}>
                <div className={`text-3xl font-bold mb-1 ${c.text}`} style={{ fontFamily: "serif", direction: "rtl" }}>
                  {n.base}
                </div>
                <div className={`text-[11px] font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>{n.name}</div>
                <div className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>«{n.sound}»</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Блок предзаказа */}
      <div className={`rounded-2xl p-5 mb-5 border-2 ${
        dark ? "border-amber-600 bg-amber-950/30" : "border-amber-300 bg-amber-50"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⭐</span>
          <span className={`font-bold text-base ${dark ? "text-amber-300" : "text-amber-700"}`}>
            Предзаказ — {PREORDER_PRICE} Stars
          </span>
        </div>
        <p className={`text-sm mb-3 ${dark ? "text-amber-400" : "text-amber-600"}`}>
          Раздел в разработке. Предзакажи сейчас по сниженной цене — получи доступ первым, как только выйдет.
        </p>
        <div className={`flex items-center gap-2 text-xs ${dark ? "text-amber-500" : "text-amber-500"}`}>
          <span>После релиза цена будет</span>
          <span className="line-through">{FULL_PRICE} Stars</span>
        </div>
      </div>

      {/* Что входит */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
        Что включено навсегда:
      </p>
      <div className="flex flex-col gap-2 mb-6">
        {COMING_FEATURES.map((item, i) => (
          <div key={i} className={`rounded-2xl p-4 flex items-start gap-3
            ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
            <span className="text-xl mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${dark ? "text-white" : "text-gray-800"}`}>{item.title}</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка покупки */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 max-w-md mx-auto">
        <div className={`rounded-2xl overflow-hidden shadow-lg ${dark ? "shadow-black/40" : "shadow-gray-200"}`}>
          <button
            onClick={handleBuy}
            disabled={buyState === "loading"}
            className={`w-full py-4 font-bold text-base text-white transition-all
              ${buyState === "loading"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-amber-500 active:bg-amber-600 active:scale-[0.99]"
              }`}
          >
            {buyState === "loading"
              ? "Подготовка оплаты…"
              : `⭐ Предзаказ за ${PREORDER_PRICE} Stars`
            }
          </button>

          {/* Сообщение об ошибке */}
          {buyState === "error" && (
            <div className={`px-4 py-2 text-center text-sm ${dark ? "bg-rose-950 text-rose-300" : "bg-rose-50 text-rose-600"}`}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Экран после успешной оплаты ──────────────────────────────────────────────
function PremiumScreen({ dark, isNew }) {
  return (
    <div className="pb-24 px-4 pt-8 max-w-md mx-auto flex flex-col items-center text-center gap-6">

      <div className="text-7xl">{isNew ? "🎉" : "⭐"}</div>

      <div>
        <h2 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
          {isNew ? "Предзаказ оформлен!" : "У тебя есть доступ"}
        </h2>
        <p className={`text-base ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {isNew
            ? "Ты в числе первых. Как только раздел выйдет — доступ откроется автоматически."
            : "Раздел огласовок будет доступен как только выйдет."
          }
        </p>
      </div>

      {/* Бонус XP */}
      {isNew && (
        <div className={`w-full rounded-2xl p-4 border ${
          dark ? "bg-indigo-950 border-indigo-800" : "bg-indigo-50 border-indigo-200"
        }`}>
          <p className={`text-sm font-semibold ${dark ? "text-indigo-300" : "text-indigo-700"}`}>
            🎁 Бонус: +200 XP начислено
          </p>
          <p className={`text-xs mt-1 ${dark ? "text-indigo-400" : "text-indigo-500"}`}>
            За поддержку на этапе разработки
          </p>
        </div>
      )}

      {/* Что тебя ждёт */}
      <div className={`w-full rounded-2xl p-4 border ${
        dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Тебя ждёт:
        </p>
        <div className="flex flex-col gap-2">
          {COMING_FEATURES.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-base">{item.icon}</span>
              <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
        Следи за обновлениями — уведомим в боте
      </p>
    </div>
  );
}
