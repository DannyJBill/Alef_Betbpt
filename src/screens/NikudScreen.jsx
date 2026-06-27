/**
 * NikudScreen — 📖 Огласовки (Никуд)
 *
 * Состояния:
 *  - isPremium=false → экран предзаказа (Stars)
 *  - isPremium=true  → обучающий экран:
 *      tab 'groups'  → список групп огласовок
 *      tab 'words'   → слова для чтения
 *      tab 'review'  → SM-2 повторение
 *
 * Внутри группы — линейный поток сцен:
 *   'intro' → 'learn' → 'practice' → 'test' → 'result'
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  useStats,
} from "../context/StatsContext";
import {
  NIKUD,
  NIKUD_GROUPS,
  SIGHT_WORDS,
} from "../data/alphabet";

// ─── Константы ────────────────────────────────────────────────────────────────
const PREORDER_PRICE = 99;
const FULL_PRICE     = 199;

// Нейтральная буква для демонстрации огласовок
const DEMO_LETTER = "מ";

// Буквы для практики слогов — частые, хорошо знакомые
const PRACTICE_LETTERS = ["מ", "ב", "ד", "ל", "כ", "ג", "ת", "ר", "ש", "נ"];

const COLOR_MAP = {
  emerald: {
    bg:     "bg-emerald-50 dark:bg-emerald-950",
    text:   "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    fill:   "bg-emerald-500",
    btn:    "bg-emerald-500 active:bg-emerald-600",
    light:  "bg-emerald-100 dark:bg-emerald-900",
    bgFixed: "bg-emerald-50", borderFixed: "border-emerald-200", textFixed: "text-emerald-700", lightFixed: "bg-emerald-100",
  },
  blue: {
    bg:     "bg-blue-50 dark:bg-blue-950",
    text:   "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    fill:   "bg-blue-500",
    btn:    "bg-blue-500 active:bg-blue-600",
    light:  "bg-blue-100 dark:bg-blue-900",
    bgFixed: "bg-blue-50", borderFixed: "border-blue-200", textFixed: "text-blue-700", lightFixed: "bg-blue-100",
  },
  amber: {
    bg:     "bg-amber-50 dark:bg-amber-950",
    text:   "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    fill:   "bg-amber-500",
    btn:    "bg-amber-500 active:bg-amber-600",
    light:  "bg-amber-100 dark:bg-amber-900",
    bgFixed: "bg-amber-50", borderFixed: "border-amber-200", textFixed: "text-amber-700", lightFixed: "bg-amber-100",
  },
  rose: {
    bg:     "bg-rose-50 dark:bg-rose-950",
    text:   "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    fill:   "bg-rose-500",
    btn:    "bg-rose-500 active:bg-rose-600",
    light:  "bg-rose-100 dark:bg-rose-900",
    bgFixed: "bg-rose-50", borderFixed: "border-rose-200", textFixed: "text-rose-700", lightFixed: "bg-rose-100",
  },
  purple: {
    bg:     "bg-purple-50 dark:bg-purple-950",
    text:   "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    fill:   "bg-purple-500",
    btn:    "bg-purple-500 active:bg-purple-600",
    light:  "bg-purple-100 dark:bg-purple-900",
    bgFixed: "bg-purple-50", borderFixed: "border-purple-200", textFixed: "text-purple-700", lightFixed: "bg-purple-100",
  },
};

// Fisher-Yates
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function NikudScreen() {
  const { dark } = useTheme();
  const { stats, updateStats } = useStats();

  const [buyState, setBuyState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Обучающий режим
  const [activeTab,   setActiveTab]   = useState("groups"); // groups | words | review
  const [activeGroup, setActiveGroup] = useState(null);     // id группы или null

  useEffect(() => {
    if (stats.isPremium) setBuyState("already");
  }, [stats.isPremium]);

  useEffect(() => {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!tgId || stats.isPremium) return;
    fetch(`/api/payments-status?telegramId=${tgId}`)
      .then(r => r.json())
      .then(data => {
        if (data.isPremium && !stats.isPremium) {
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
  }, []); // eslint-disable-line

  async function handleBuy() {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!tgId) { setErrorMsg("Открой приложение через Telegram"); setBuyState("error"); return; }
    setBuyState("loading"); setErrorMsg("");
    try {
      const res  = await fetch("/api/payments-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "nikud_lifetime", telegramId: tgId }),
      });
      const data = await res.json();
      if (data.alreadyPurchased) { updateStats(prev => ({ ...prev, isPremium: true })); setBuyState("already"); return; }
      if (!data.invoiceLink) throw new Error(data.error || "No invoice link");
      window.Telegram.WebApp.openInvoice(data.invoiceLink, (status) => {
        if (status === "paid") {
          updateStats(prev => ({ ...prev, isPremium: true, premiumPurchasedAt: Date.now(), premiumType: "lifetime", xp: (prev.xp||0)+200 }));
          setBuyState("success");
        } else if (status === "cancelled") {
          setBuyState("idle");
        } else if (status === "failed") {
          setErrorMsg("Оплата не прошла. Попробуй ещё раз."); setBuyState("error");
        }
      });
    } catch (err) {
      console.error("[NikudScreen] buy error:", err);
      setErrorMsg("Ошибка соединения. Попробуй позже."); setBuyState("error");
    }
  }

  // ── Premium контент ─────────────────────────────────────────────────────────
  // Показываем premium если isPremium в stats (загружены асинхронно) ИЛИ только что купили
  const showPremium = stats.isPremium || buyState === "success";

  if (showPremium) {
    // Если открыта группа — показать урок
    if (activeGroup !== null) {
      return (
        <GroupLesson
          key={activeGroup}
          groupId={activeGroup}
          dark={dark}
          stats={stats}
          onBack={() => setActiveGroup(null)}
          onOpenGroup={setActiveGroup}
        />
      );
    }

    return (
      <PremiumContent
        dark={dark}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenGroup={setActiveGroup}
        isNew={buyState === "success"}
      />
    );
  }

  // ── Paywall ─────────────────────────────────────────────────────────────────
  return <PaywallScreen dark={dark} buyState={buyState} errorMsg={errorMsg} onBuy={handleBuy} />;
}

// ─── Paywall ──────────────────────────────────────────────────────────────────
const COMING_FEATURES = [
  { icon: "🔵", title: "10 знаков огласовок",    desc: "Патах, камац, цере и другие — с объяснением и примерами" },
  { icon: "🃏", title: "Карточки SM-2",           desc: "Знак → звук и звук → знак, с интервальным повторением" },
  { icon: "📖", title: "Чтение с огласовками",   desc: "Простые слова — читаешь слог за слогом, как носитель" },
  { icon: "⚡", title: "Игра «Поймай звук»",     desc: "Тренируй рефлекс: видишь знак — называешь звук мгновенно" },
  { icon: "🤖", title: "AI-ассистент без лимита", desc: "Задавай вопросы об иврите без ограничений" },
];

const NIKUD_PREVIEW = [
  { base: "מַ", name: "Патах",  sound: "а", color: "emerald" },
  { base: "מָ", name: "Камац",  sound: "а", color: "emerald" },
  { base: "מֵ", name: "Цере",   sound: "э", color: "blue"    },
  { base: "מֶ", name: "Сеголь", sound: "э", color: "blue"    },
  { base: "מִ", name: "Хирик",  sound: "и", color: "amber"   },
  { base: "מוּ", name: "Шурук", sound: "у", color: "amber"   },
];

function PaywallScreen({ dark, buyState, errorMsg, onBuy }) {
  return (
    <div className="pb-24 px-4 pt-4 max-w-md mx-auto">
      <h2 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
        Огласовки (Никуд)
      </h2>
      <p className={`text-sm mb-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Следующий шаг после алфавита
      </p>

      {/* Превью */}
      <div className={`rounded-2xl p-4 mb-5 ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Знаки огласовок:
        </p>
        <div className="grid grid-cols-3 gap-2">
          {NIKUD_PREVIEW.map(n => {
            const c = COLOR_MAP[n.color];
            return (
              <div key={n.name} className={`rounded-xl p-3 text-center border ${c.bg} ${c.border}`}>
                <div className={`text-3xl font-bold mb-1 ${c.text}`} style={{ direction: "rtl" }}>
                  {n.base}
                </div>
                <div className={`text-[11px] font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>{n.name}</div>
                <div className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>«{n.sound}»</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Предзаказ */}
      <div className={`rounded-2xl p-5 mb-5 border-2 ${dark ? "border-amber-600 bg-amber-950/30" : "border-amber-300 bg-amber-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⭐</span>
          <span className={`font-bold text-base ${dark ? "text-amber-300" : "text-amber-700"}`}>
            Предзаказ — {PREORDER_PRICE} Stars
          </span>
        </div>
        <p className={`text-sm mb-3 ${dark ? "text-amber-400" : "text-amber-600"}`}>
          Раздел в разработке. Предзакажи сейчас по сниженной цене — получи доступ первым.
        </p>
        <div className={`flex items-center gap-2 text-xs ${dark ? "text-amber-500" : "text-amber-500"}`}>
          <span>После релиза цена будет</span>
          <span className="line-through">{FULL_PRICE} Stars</span>
        </div>
      </div>

      {/* Фичи */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
        Что включено навсегда:
      </p>
      <div className="flex flex-col gap-2 mb-6">
        {COMING_FEATURES.map((item, i) => (
          <div key={i} className={`rounded-2xl p-4 flex items-start gap-3 ${dark ? "bg-gray-800" : "bg-white border border-gray-100"}`}>
            <span className="text-xl mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${dark ? "text-white" : "text-gray-800"}`}>{item.title}</p>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 max-w-md mx-auto">
        <div className={`rounded-2xl overflow-hidden shadow-lg ${dark ? "shadow-black/40" : "shadow-gray-200"}`}>
          <button
            onClick={onBuy}
            disabled={buyState === "loading"}
            className={`w-full py-4 font-bold text-base text-white transition-all ${buyState === "loading" ? "bg-gray-400 cursor-not-allowed" : "bg-amber-500 active:bg-amber-600 active:scale-[0.99]"}`}
          >
            {buyState === "loading" ? "Подготовка оплаты…" : `⭐ Предзаказ за ${PREORDER_PRICE} Stars`}
          </button>
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

// ─── Premium-контент: табы ─────────────────────────────────────────────────────
function PremiumContent({ dark, activeTab, setActiveTab, stats, onOpenGroup, isNew }) {
  const TABS = [
    { id: "groups", label: "Группы",    icon: "📚" },
    { id: "words",  label: "Слова",     icon: "📖" },
    { id: "review", label: "Повторение",icon: "🃏" },
  ];

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Шапка */}
      <div className="px-4 pt-4 pb-3">
        <h2 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
          Огласовки
        </h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Никуд — гласные звуки иврита
        </p>
      </div>

      {/* Табы */}
      <div className="px-4 mb-4">
        <div className={`flex rounded-2xl p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1
                ${activeTab === t.id
                  ? (dark ? "bg-gray-700 text-white shadow" : "bg-white text-gray-900 shadow")
                  : (dark ? "text-gray-400" : "text-gray-500")
                }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      {activeTab === "groups"  && <GroupsTab  dark={dark} stats={stats} onOpenGroup={onOpenGroup} />}
      {activeTab === "words"   && <WordsTab   dark={dark} stats={stats} />}
      {activeTab === "review"  && <ReviewTab  dark={dark} stats={stats} />}
    </div>
  );
}

// ─── Таб «Группы» ─────────────────────────────────────────────────────────────
function GroupsTab({ dark, stats, onOpenGroup }) {
  const nikudProgress = stats.nikudProgress?.groupProgress ||
    { 1:'available', 2:'locked', 3:'locked', 4:'locked', 5:'locked' };
  const testScores    = stats.nikudProgress?.groupTestScores || {};

  return (
    <div className="px-4 flex flex-col gap-3">
      {/* Объяснение концепции — только один раз, сверху */}
      <div className={`rounded-2xl p-4 border ${dark ? "bg-indigo-950/40 border-indigo-800" : "bg-indigo-50 border-indigo-200"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? "text-indigo-400" : "text-indigo-600"}`}>
          Как это работает
        </p>
        <p className={`text-sm ${dark ? "text-indigo-200" : "text-indigo-800"}`}>
          Огласовок всего <strong>9 основных</strong> — меньше чем букв. Каждая = один гласный звук.
          Учим по группам: сначала самые простые, потом сложнее.
        </p>
      </div>

      {NIKUD_GROUPS.map(group => {
        const progress  = nikudProgress[group.id] || 'locked';
        const isLocked  = progress === 'locked';
        const isPaidGate = group.isPaid && !stats.isPremium;  // платный контент без подписки
        const completed = progress === 'completed';
        const score     = testScores[group.id]?.score;
        const colors    = COLOR_MAP[group.color];
        const vowels    = NIKUD.filter(v => group.vowelIds.includes(v.id));

        return (
          <div
            key={group.id}
            onClick={() => !isLocked && !isPaidGate && onOpenGroup(group.id)}
            className={`rounded-2xl border p-4 transition-all
              ${isLocked || isPaidGate
                ? "border-gray-200 dark:border-gray-800 opacity-50"
                : `${colors.border} ${colors.bg} cursor-pointer active:scale-[0.98]`
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isLocked
                  ? <span className="text-lg">🔒</span>
                  : isPaidGate
                    ? <span className="text-lg">⭐</span>
                    : completed
                      ? <span className="text-lg">✅</span>
                      : <span className={`w-2.5 h-2.5 rounded-full ${colors.fill}`} />
                }
                <span className={`font-semibold text-base ${isLocked || isPaidGate ? (dark ? "text-gray-400" : "text-gray-500") : colors.text}`}>
                  {group.name}
                </span>
              </div>
              {!isLocked && !isPaidGate && (
                <span className={`text-xs px-2 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {completed ? `${score}%` : progress === 'available' ? 'Начать →' : 'Продолжить →'}
                </span>
              )}
              {isPaidGate && (
                <span className={`text-xs px-2 py-1 rounded-full ${dark ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                  ⭐ Stars
                </span>
              )}
            </div>

            <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>{group.description}</p>

            {/* Знаки огласовок группы */}
            {!isLocked && !isPaidGate && (
              <div className="flex gap-2 flex-wrap">
                {vowels.map(v => (
                  <div key={v.id} className={`rounded-lg px-2 py-1 border ${colors.light} ${colors.border}`}>
                    <span className={`text-xl font-bold ${colors.text}`} style={{ direction: "rtl" }}>
                      {DEMO_LETTER}{v.symbol}
                    </span>
                    <span className={`text-xs ml-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>= {v.sound || "?"}</span>
                  </div>
                ))}
              </div>
            )}

            {isLocked && (
              <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
                Открывается после группы {group.unlocksAfter}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Таб «Слова» ──────────────────────────────────────────────────────────────
function WordsTab({ dark, stats }) {
  const nikudProgress  = stats.nikudProgress?.groupProgress || { 1:'available' };
  const wordsStudied   = stats.nikudProgress?.wordsStudied  || [];
  const { recordWordResult } = useStats();

  // Доступны слова из пройденных и текущих групп
  const unlockedGroupIds = Object.entries(nikudProgress)
    .filter(([, v]) => v !== 'locked')
    .map(([k]) => Number(k));

  const availableWords = SIGHT_WORDS.filter(w =>
    unlockedGroupIds.includes(w.nikudGroup) && !w.isPaid
  );

  const [current,   setCurrent]   = useState(0);
  const [phase,     setPhase]     = useState("show");   // show | quiz | feedback
  const [selected,  setSelected]  = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  const word = availableWords[current % availableWords.length];

  // Фиксируем порядок вариантов — пересчитываем только при смене слова,
  // иначе shuffle на каждом рендере меняет кнопки местами
  const wordOptions = useMemo(
    () => word ? shuffle([word.transliteration, ...word.distractors]) : [],
    [word?.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!word) return (
    <div className="px-4 pt-8 text-center">
      <p className={`text-4xl mb-4`}>📖</p>
      <p className={`font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>
        Пройди группы огласовок, чтобы открыть слова
      </p>
    </div>
  );

  function handleAnswer(opt) {
    if (phase !== "quiz") return;
    const correct = opt === word.transliteration;
    setSelected(opt);
    setIsCorrect(correct);
    setPhase("feedback");
    recordWordResult(word.id, correct);
    setTimeout(() => {
      setCurrent(c => c + 1);
      setPhase("show");
      setSelected(null);
      setIsCorrect(null);
    }, 1000);
  }

  return (
    <div className="px-4 flex flex-col gap-4">
      {/* Прогресс */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Изучено: {wordsStudied.length} / {availableWords.length}
        </p>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {word.emoji} {word.translation}
        </p>
      </div>

      {/* Карточка слова */}
      <div
        className={`rounded-3xl border-2 p-8 flex flex-col items-center gap-4 cursor-pointer transition-all
          ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}
          ${phase === "show" ? "active:scale-[0.98]" : ""}`}
        onClick={() => phase === "show" && setPhase("quiz")}
      >
        {/* Слово с огласовками */}
        <div className="text-6xl font-bold" style={{ direction: "rtl", fontFamily: "serif" }}>
          {word.hebrew}
        </div>

        {/* Слоги */}
        <div className="flex gap-2 items-center" style={{ direction: "rtl" }}>
          {word.syllables.map((s, i) => (
            <span key={i} className={`text-xl font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>
              {s}{i < word.syllables.length - 1 && <span className={`text-xs mx-0.5 ${dark ? "text-gray-600" : "text-gray-300"}`}>·</span>}
            </span>
          ))}
        </div>

        {phase === "show" && (
          <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
            Нажми, чтобы прочитать
          </p>
        )}
      </div>

      {/* Варианты ответа */}
      {phase !== "show" && (
        <div className="grid grid-cols-2 gap-3">
          {wordOptions.map(opt => {
            let cls = dark ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800";
            if (phase === "feedback") {
              if (opt === word.transliteration) cls = dark ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-emerald-50 border-emerald-400 text-emerald-700";
              else if (opt === selected)        cls = dark ? "bg-rose-950 border-rose-500 text-rose-300"         : "bg-rose-50 border-rose-400 text-rose-700";
            }
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`py-4 rounded-2xl border font-semibold text-base transition-all ${cls} ${phase === "quiz" ? "active:scale-95" : ""}`}
              >
                {opt}
                {phase === "feedback" && opt === word.transliteration && " ✓"}
                {phase === "feedback" && opt === selected && opt !== word.transliteration && " ✗"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Таб «Повторение» ─────────────────────────────────────────────────────────
function ReviewTab({ dark, stats }) {
  const { getDueVowelCards, updateVowelReview } = useStats();
  const dueKeys = getDueVowelCards();

  if (dueKeys.length === 0) {
    return (
      <div className="px-4 pt-8 text-center flex flex-col items-center gap-4">
        <span className="text-5xl">✅</span>
        <p className={`font-semibold text-lg ${dark ? "text-gray-200" : "text-gray-800"}`}>
          Всё повторено!
        </p>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Карточек для повторения нет. Возвращайся позже или изучи новую группу.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <p className={`text-sm mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
        {dueKeys.length} карточек ждут повторения
      </p>
      <VowelReviewSession dueKeys={dueKeys} dark={dark} onAnswer={updateVowelReview} />
    </div>
  );
}

function VowelReviewSession({ dueKeys, dark, onAnswer }) {
  const [queue,   setQueue]   = useState(() => shuffle(dueKeys));
  const [idx,     setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done,    setDone]    = useState(false);

  if (done || idx >= queue.length) {
    return (
      <div className="text-center py-8 flex flex-col items-center gap-4">
        <span className="text-5xl">🎉</span>
        <p className={`font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>Сессия завершена!</p>
      </div>
    );
  }

  const key      = queue[idx];
  const [vowelId, letterSymbol] = key.split(":");
  const vowel    = NIKUD.find(v => v.id === vowelId);
  if (!vowel) return null;

  function handleRate(quality) {
    onAnswer(key, quality);
    setFlipped(false);
    if (idx + 1 >= queue.length) setDone(true);
    else setIdx(i => i + 1);
  }

  const displaySlug = (letterSymbol || DEMO_LETTER) + vowel.symbol;

  return (
    <div className="flex flex-col gap-4">
      <p className={`text-xs text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>
        {idx + 1} / {queue.length}
      </p>

      {/* Карточка flip */}
      <div
        className="cursor-pointer"
        style={{ perspective: "800px" }}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.4s",
          transform: flipped ? "rotateY(180deg)" : "none",
          position: "relative", height: "220px",
        }}>
          {/* Лицо */}
          <div
            style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-3
              ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <span className="text-8xl font-bold" style={{ direction: "rtl", fontFamily: "serif" }}>
              {displaySlug}
            </span>
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Нажми — увидишь ответ</p>
          </div>
          {/* Оборот */}
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
            className={`rounded-3xl border-2 flex flex-col items-center justify-center gap-3 p-6
              ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <span className="text-5xl font-bold" style={{ direction: "rtl", fontFamily: "serif" }}>{displaySlug}</span>
            <p className={`text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{vowel.sound ? `«${vowel.sound}»` : "молчит"}</p>
            <p className={`text-base ${dark ? "text-gray-400" : "text-gray-500"}`}>{vowel.name}</p>
            <p className={`text-xs text-center ${dark ? "text-gray-600" : "text-gray-400"}`}>{vowel.hint}</p>
          </div>
        </div>
      </div>

      {/* Кнопки оценки */}
      {flipped && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { q: 0, label: "Снова",  emoji: "✗", cls: dark ? "bg-rose-950 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-600" },
            { q: 1, label: "Трудно", emoji: "〜", cls: dark ? "bg-amber-950 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-600" },
            { q: 2, label: "Легко",  emoji: "✓", cls: dark ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-600" },
          ].map(btn => (
            <button
              key={btn.q}
              onClick={() => handleRate(btn.q)}
              className={`py-4 rounded-2xl border font-semibold flex flex-col items-center gap-1 active:scale-95 transition-all ${btn.cls}`}
            >
              <span className="text-xl">{btn.emoji}</span>
              <span className="text-xs">{btn.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Урок группы ─────────────────────────────────────────────────────────────
function GroupLesson({ groupId, dark, stats, onBack, onOpenGroup }) {
  const group  = NIKUD_GROUPS.find(g => g.id === groupId);
  const vowels = NIKUD.filter(v => group.vowelIds.includes(v.id));
  const colors = COLOR_MAP[group.color];

  // Огласовки из всех групп которые были пройдены ДО текущей
  const nikudProgress = stats.nikudProgress?.groupProgress || {};
  const previousVowels = NIKUD_GROUPS
    .filter(g => g.id < groupId && nikudProgress[g.id] === 'completed')
    .flatMap(g => NIKUD.filter(v => g.vowelIds.includes(v.id)));

  // Линейный поток сцен
  const [scene,    setScene]    = useState("intro");  // intro | learn_N | practice | test | result
  const [learnIdx, setLearnIdx] = useState(0);        // индекс текущей огласовки в learn
  const [testData, setTestData] = useState(null);     // результаты теста

  const { completeNikudGroupTest, updateVowelReview } = useStats();

  function goNext() {
    if (scene === "intro") {
      setScene("learn");
      setLearnIdx(0);
    } else if (scene === "learn") {
      if (learnIdx + 1 < vowels.length) {
        setLearnIdx(i => i + 1);
      } else {
        setScene("practice");
      }
    } else if (scene === "practice") {
      setScene("test");
    } else if (scene === "test") {
      // test компонент сам вызывает onTestDone
    }
  }

  function onTestDone(score) {
    completeNikudGroupTest(groupId, score);
    setTestData({ score });
    setScene("result");
  }

  // Прогресс-бар вверху
  const sceneOrder = ["intro", "learn", "practice", "test", "result"];
  const sceneIdx   = scene === "learn" ? 1 : sceneOrder.indexOf(scene);
  const progress   = Math.round((sceneIdx / (sceneOrder.length - 1)) * 100);

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Шапка */}
      <div className={`flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-10 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
        <button
          onClick={onBack}
          className={`text-2xl ${dark ? "text-gray-400 active:text-white" : "text-gray-400 active:text-gray-900"}`}
        >
          ←
        </button>
        <div className="flex-1">
          <div className={`h-2 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
            <div
              className={`h-full ${colors.fill} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className={`text-xs font-medium ${colors.text}`}>{group.name}</span>
      </div>

      {/* Сцены */}
      {scene === "intro" && (
        <IntroScene group={group} vowels={vowels} colors={colors} dark={dark} onNext={goNext} />
      )}
      {scene === "learn" && (
        <LearnScene
          vowel={vowels[learnIdx]}
          vowelIndex={learnIdx}
          total={vowels.length}
          colors={colors}
          dark={dark}
          isLast={learnIdx === vowels.length - 1}
          onNext={goNext}
        />
      )}
      {scene === "practice" && (
        <PracticeScene
          vowels={vowels}
          colors={colors}
          dark={dark}
          onNext={goNext}
          onReview={updateVowelReview}
        />
      )}
      {scene === "test" && (
        <TestScene
          vowels={vowels}
          previousVowels={previousVowels}
          allVowels={NIKUD}
          colors={colors}
          dark={dark}
          onDone={onTestDone}
        />
      )}
      {scene === "result" && (
        <ResultScene
          group={group}
          score={testData?.score}
          vowels={vowels}
          colors={colors}
          dark={dark}
          onBack={onBack}
          onOpenGroup={onOpenGroup}
        />
      )}
    </div>
  );
}

// ─── Сцена: Intro ──────────────────────────────────────────────────────────────
function IntroScene({ group, vowels, colors, dark, onNext }) {
  const [step, setStep] = useState(0); // 0=концепция, 1=примеры

  if (step === 0) {
    return (
      <div className="px-4 pt-6 flex flex-col gap-6">
        <div className={`rounded-3xl p-6 border-2 ${colors.borderFixed} ${colors.bgFixed} text-center`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${colors.textFixed}`}>
            Группа {group.id} · {group.name}
          </p>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">
            {group.conceptTitle}
          </h2>
          <p className="text-base leading-relaxed text-gray-600">
            {group.conceptBody}
          </p>
        </div>

        {/* Пример слова из концепции */}
        {group.conceptExample && (
          <div className="rounded-2xl p-5 border bg-white border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-400">
              Пример:
            </p>
            <div className="text-center">
              <p className="text-5xl font-bold mb-2 text-gray-900" style={{ direction: "rtl", fontFamily: "serif" }}>
                {group.conceptExample.word}
              </p>
              <div className="flex justify-center gap-2 mb-2" style={{ direction: "rtl" }}>
                {group.conceptExample.syllables.map((s, i) => (
                  <span key={i} className={`text-xl px-2 py-1 rounded-lg ${colors.lightFixed} ${colors.textFixed} font-semibold`}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-lg font-medium text-gray-700">
                {group.conceptExample.transliteration}
              </p>
              <p className="text-sm text-gray-400">
                {group.conceptExample.translation}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setStep(1)}
          className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.btn}`}
        >
          Понятно, показывай знаки →
        </button>
      </div>
    );
  }

  // step=1: предпросмотр всех знаков группы
  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="text-center">
        <p className="text-lg font-semibold mb-1 text-gray-900">
          В этой группе {vowels.length} {vowels.length === 1 ? "огласовка" : "огласовки"}:
        </p>
        <p className="text-sm text-gray-500">
          Изучим каждую по очереди
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {vowels.map((v, i) => (
          <div key={v.id} className={`rounded-2xl p-4 border flex items-center gap-4 ${colors.bgFixed} ${colors.borderFixed}`}>
            <span className="text-5xl font-bold text-gray-900" style={{ direction: "rtl", fontFamily: "serif" }}>
              {DEMO_LETTER}{v.symbol}
            </span>
            <div>
              <p className={`font-bold text-lg ${colors.textFixed}`}>«{v.sound || "…"}»</p>
              <p className="text-sm text-gray-500">{v.name} · {v.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNext} className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.btn}`}>
        Начать изучение →
      </button>
    </div>
  );
}

// ─── Сцена: Learn (одна огласовка) ────────────────────────────────────────────
function LearnScene({ vowel, vowelIndex, total, colors, dark, isLast, onNext }) {
  const [exampleIdx, setExampleIdx] = useState(0);

  // Разные буквы для показа паттерна
  const exampleLetters = ["מ", "ב", "ד", "ל", "ג"];
  const shown = exampleLetters.slice(0, exampleIdx + 1);

  return (
    <div className="px-4 pt-4 flex flex-col gap-5">
      {/* Прогресс по огласовкам */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i < vowelIndex ? colors.fill :
              i === vowelIndex ? colors.fill + " opacity-100" :
              (dark ? "bg-gray-700" : "bg-gray-200")
            }`}
          />
        ))}
      </div>

      {/* Главная карточка знака */}
      <div className={`rounded-3xl border-2 ${colors.borderFixed} ${colors.bgFixed} p-8 flex flex-col items-center gap-4`}>
        {/* Анимированный знак */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${colors.textFixed}`}>
            {vowel.name}
          </p>
          <div className="text-9xl font-bold mb-2 text-gray-900" style={{ direction: "rtl", fontFamily: "serif" }}>
            {DEMO_LETTER}{vowel.symbol}
          </div>
          <div className="text-3xl font-bold text-gray-900">
            «{vowel.sound || "молчит"}»
          </div>
        </div>

        {/* Подсказка */}
        <div className={`w-full rounded-xl p-3 border ${colors.lightFixed} ${colors.borderFixed} text-center`}>
          <p className="text-sm text-gray-600">{vowel.hint}</p>
          <p className="text-xs mt-1 text-gray-400">{vowel.visualDesc}</p>
        </div>

        {/* Особая заметка для двойников */}
        {vowel.twinNote && (
          <div className="w-full rounded-xl p-3 border bg-amber-50 border-amber-200 text-amber-700 text-center">
            <p className="text-sm">💡 {vowel.twinNote}</p>
          </div>
        )}
      </div>

      {/* Паттерн: тот же знак с разными буквами */}
      <div className="rounded-2xl p-4 border bg-white border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-400">
          Этот знак работает с любой буквой:
        </p>
        <div className="flex gap-3 flex-wrap">
          {shown.map((letter, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 ${colors.lightFixed} border ${colors.borderFixed} text-center`}>
              <span className={`text-3xl font-bold ${colors.textFixed}`} style={{ direction: "rtl", fontFamily: "serif" }}>
                {letter}{vowel.symbol}
              </span>
            </div>
          ))}
          {exampleIdx < exampleLetters.length - 1 && (
            <button
              onClick={() => setExampleIdx(i => i + 1)}
              className="rounded-xl px-3 py-2 border border-dashed border-gray-300 text-gray-400 text-sm"
            >
              + ещё
            </button>
          )}
        </div>
      </div>

      <button onClick={onNext} className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.btn}`}>
        {isLast ? "К практике →" : "Понятно, дальше →"}
      </button>
    </div>
  );
}

// ─── Сцена: Practice ─────────────────────────────────────────────────────────
function PracticeScene({ vowels, colors, dark, onNext, onReview }) {
  const letters = PRACTICE_LETTERS.slice(0, 6);

  // Фиксируем вопросы один раз при монтировании — иначе shuffle на каждом рендере
  const questions = useMemo(() => {
    const q = [];
    for (let i = 0; i < 12; i++) {
      const vowel  = vowels[i % vowels.length];
      const letter = letters[i % letters.length];
      // Нормализуем: пустой sound (шва) → специальная метка, чтобы сравнение работало
      const soundLabel = vowel.sound || "∅";
      q.push({ vowel, letter, slug: letter + vowel.symbol, soundLabel });
    }
    return shuffle(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct,  setCorrect]  = useState(0);

  // Фиксируем варианты ответа при смене вопроса — не при каждом setState
  const practiceOptions = useMemo(() => {
    if (idx >= questions.length) return [];
    const q      = questions[idx];
    const sounds = ["а", "и", "у", "э", "о", "∅"];
    const wrong  = sounds.filter(s => s !== q.soundLabel).slice(0, 3);
    return shuffle([q.soundLabel, ...wrong]);
  }, [idx, questions]);

  if (idx >= questions.length) {
    return (
      <div className="px-4 pt-8 flex flex-col items-center gap-5 text-center">
        <span className="text-6xl">✨</span>
        <p className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
          Практика завершена!
        </p>
        <p className={`text-base ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {correct} из {questions.length} правильно
        </p>
        <button onClick={onNext} className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.btn}`}>
          К тесту →
        </button>
      </div>
    );
  }

  const q = questions[idx];

  function handlePick(opt) {
    if (revealed) return;
    // Сравниваем с той же нормализованной меткой что в options
    const isRight = opt === q.soundLabel;
    setSelected(opt);
    setRevealed(true);
    if (isRight) {
      setCorrect(c => c + 1);
      onReview(`${q.vowel.id}:${q.letter}`, 2);
    } else {
      onReview(`${q.vowel.id}:${q.letter}`, 0);
    }
    setTimeout(() => {
      setIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }, 700);
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-5">
      {/* Счётчик */}
      <div className="flex justify-between items-center">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{idx + 1} / {questions.length}</p>
        <p className={`text-sm font-medium ${dark ? "text-emerald-400" : "text-emerald-600"}`}>✓ {correct}</p>
      </div>

      <p className={`text-center text-base ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Какой звук?
      </p>

      {/* Слог */}
      <div className={`rounded-3xl border-2 ${colors.border} ${colors.bg} h-44 flex items-center justify-center`}>
        <span className="text-9xl font-bold" style={{ direction: "rtl", fontFamily: "serif" }}>
          {q.slug}
        </span>
      </div>

      {/* Варианты */}
      <div className="grid grid-cols-2 gap-3">
        {practiceOptions.map(opt => {
          let cls = dark
            ? "bg-gray-800 border-gray-700 text-gray-200"
            : "bg-white border-gray-200 text-gray-800";
          if (revealed) {
            if (opt === q.soundLabel) cls = dark ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (opt === selected) cls = dark ? "bg-rose-950 border-rose-500 text-rose-300"         : "bg-rose-50 border-rose-400 text-rose-700";
          }
          return (
            <button
              key={opt}
              onClick={() => handlePick(opt)}
              className={`py-5 rounded-2xl border font-bold text-2xl transition-all ${cls} ${!revealed ? "active:scale-95" : ""}`}
            >
              {opt === "∅" ? "молчит" : `«${opt}»`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Сцена: Test ──────────────────────────────────────────────────────────────
function TestScene({ vowels, previousVowels, allVowels, colors, dark, onDone }) {
  const letters = PRACTICE_LETTERS.slice(0, 5);

  const questions = useMemo(() => {
    const q = [];
    let letterIdx = 0;

    function makeQuestion(vowel, type) {
      const letter     = letters[letterIdx++ % letters.length];
      const soundLabel = vowel.sound || "∅";

      if (type === "slug_to_sound") {
        const seenSounds = new Set([soundLabel]);
        const wrongVowels = allVowels.filter(v => {
          const s = v.sound || "∅";
          if (v.id === vowel.id || seenSounds.has(s)) return false;
          seenSounds.add(s);
          return true;
        }).slice(0, 3);
        return {
          type:    "slug_to_sound",
          slug:    letter + vowel.symbol,
          correct: soundLabel,
          options: shuffle([soundLabel, ...wrongVowels.map(v => v.sound || "∅")]),
          vowelId: vowel.id,
          letter,
        };
      } else {
        const seenSymbols = new Set([vowel.symbol]);
        const wrongSlugs = allVowels
          .filter(v => {
            if (v.id === vowel.id || seenSymbols.has(v.symbol)) return false;
            seenSymbols.add(v.symbol);
            return true;
          })
          .slice(0, 3)
          .map(v => letter + v.symbol);
        return {
          type:    "sound_to_slug",
          sound:   soundLabel === "∅" ? "молчит" : `«${soundLabel}»`,
          correct: letter + vowel.symbol,
          options: shuffle([letter + vowel.symbol, ...wrongSlugs]),
          vowelId: vowel.id,
          letter,
        };
      }
    }

    // 2 вопроса на каждую новую огласовку (оба типа)
    vowels.forEach(vowel => {
      q.push(makeQuestion(vowel, "slug_to_sound"));
      q.push(makeQuestion(vowel, "sound_to_slug"));
    });

    // 1 вопрос на каждую предыдущую пройденную огласовку (типы чередуются)
    (previousVowels || []).forEach((vowel, i) => {
      q.push(makeQuestion(vowel, i % 2 === 0 ? "slug_to_sound" : "sound_to_slug"));
    });

    return shuffle(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [results,  setResults]  = useState([]);

  // onDone вызываем через useEffect — не в теле рендера
  const doneCalled = useRef(false);
  useEffect(() => {
    if (idx >= questions.length && !doneCalled.current && questions.length > 0) {
      doneCalled.current = true;
      const score = Math.round((results.filter(Boolean).length / results.length) * 100);
      onDone(score);
    }
  }, [idx, questions.length, results, onDone]);

  if (idx >= questions.length) return null;

  const q = questions[idx];

  function handlePick(opt) {
    if (revealed) return;
    const isRight = opt === q.correct;
    setSelected(opt);
    setRevealed(true);
    setResults(r => [...r, isRight]);
    setTimeout(() => {
      setIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }, 800);
  }

  const isSlugToSound = q.type === "slug_to_sound";

  return (
    <div className="px-4 pt-4 flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{idx + 1} / {questions.length}</p>
        <p className={`text-sm font-medium ${dark ? "text-emerald-400" : "text-emerald-600"}`}>
          ✓ {results.filter(Boolean).length}
        </p>
      </div>

      <p className={`text-center text-base font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
        {isSlugToSound ? "Какой звук у этого слога?" : "Найди слог с таким звуком:"}
      </p>

      {/* Вопрос */}
      <div className={`rounded-3xl border-2 ${colors.border} ${dark ? "bg-gray-800" : "bg-white"} h-44 flex items-center justify-center`}>
        {isSlugToSound ? (
          <span className={`text-9xl font-bold ${dark ? "text-white" : "text-gray-900"}`} style={{ direction: "rtl", fontFamily: "serif" }}>{q.slug}</span>
        ) : (
          <span className={`text-5xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{q.sound}</span>
        )}
      </div>

      {/* Варианты */}
      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          let cls = dark
            ? "bg-gray-800 border-gray-700 text-gray-200"
            : "bg-white border-gray-200 text-gray-800";
          if (revealed) {
            if (opt === q.correct) cls = dark ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (opt === selected) cls = dark ? "bg-rose-950 border-rose-500 text-rose-300"       : "bg-rose-50 border-rose-400 text-rose-700";
          }
          // Для slug_to_sound показываем звук (∅ → "молчит"), для sound_to_slug — слог
          const label = isSlugToSound
            ? (opt === "∅" ? "молчит" : `«${opt}»`)
            : opt;
          return (
            <button
              key={opt}
              onClick={() => handlePick(opt)}
              className={`py-5 rounded-2xl border font-bold transition-all ${cls} ${!revealed ? "active:scale-95" : ""}
                ${isSlugToSound ? "text-2xl" : "text-4xl"}`}
              style={!isSlugToSound ? { direction: "rtl", fontFamily: "serif" } : {}}
            >
              {label}
              {revealed && opt === q.correct && " ✓"}
              {revealed && opt === selected && opt !== q.correct && " ✗"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Сцена: Result ────────────────────────────────────────────────────────────
function ResultScene({ group, score, vowels, colors, dark, onBack, onOpenGroup }) {
  const isPassed  = score >= 70;
  const nextGroup = NIKUD_GROUPS.find(g => g.unlocksAfter === group.id);

  function handlePrimaryBtn() {
    if (isPassed && nextGroup && !nextGroup.isPaid && onOpenGroup) {
      // Автопереход в следующую группу
      onOpenGroup(nextGroup.id);
    } else if (!isPassed && onOpenGroup) {
      // Перезапустить ту же группу
      onOpenGroup(group.id);
    } else {
      onBack();
    }
  }

  return (
    <div className="px-4 pt-8 flex flex-col items-center gap-5 text-center">
      <span className="text-6xl">{isPassed ? "🎉" : "💪"}</span>

      <div>
        <p className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
          {isPassed ? "Группа пройдена!" : "Почти!"}
        </p>
        <p className={`text-base mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {isPassed ? group.name : `Нужно 70%, у тебя ${score}%`}
        </p>
      </div>

      {/* Счёт */}
      <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
        isPassed
          ? `border-emerald-400 ${dark ? "bg-emerald-950" : "bg-emerald-50"}`
          : `border-amber-400 ${dark ? "bg-amber-950" : "bg-amber-50"}`
      }`}>
        <span className={`text-4xl font-bold ${isPassed ? "text-emerald-500" : "text-amber-500"}`}>
          {score}%
        </span>
      </div>

      {/* Что теперь умеешь */}
      {isPassed && (
        <div className={`w-full rounded-2xl p-4 border ${colors.bg} ${colors.border}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${colors.text}`}>
            Ты теперь читаешь:
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {PRACTICE_LETTERS.slice(0, 5).flatMap(letter =>
              vowels.map(v => (
                <span
                  key={letter + v.id}
                  className={`text-2xl font-bold ${colors.text}`}
                  style={{ direction: "rtl", fontFamily: "serif" }}
                >
                  {letter}{v.symbol}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Разблокировка */}
      {isPassed && nextGroup && !nextGroup.isPaid && (
        <div className={`w-full rounded-2xl p-4 border ${dark ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
          <p className={`text-sm font-medium ${dark ? "text-blue-400" : "text-blue-600"}`}>
            🔓 Открыта новая группа!
          </p>
          <p className={`text-lg font-bold mt-1 ${dark ? "text-blue-200" : "text-blue-800"}`}>
            {nextGroup.name}
          </p>
          <p className={`text-sm ${dark ? "text-blue-400" : "text-blue-500"}`}>
            {nextGroup.description}
          </p>
        </div>
      )}

      {/* Кнопки */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handlePrimaryBtn}
          className={`w-full py-4 rounded-2xl font-bold text-white text-lg ${colors.btn}`}
        >
          {isPassed
            ? (nextGroup && !nextGroup.isPaid ? `К группе "${nextGroup.name}" →` : "К списку групп")
            : "Попробовать ещё раз"}
        </button>
        {!isPassed && (
          <button
            onClick={onBack}
            className={`w-full py-3 rounded-2xl border font-semibold text-sm ${dark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"}`}
          >
            Вернуться к группам
          </button>
        )}
      </div>
    </div>
  );
}
