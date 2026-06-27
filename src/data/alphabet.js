export const ALPHABET = [
  // Блок 1
  {
    id:1, symbol:"א", name:"Алеф", trans:"а/–", sound:"а",
    pronunciation:"Немая буква — звука нет, произносится гласная рядом",
    group:1, exampleWord:"אבא", exampleTrans:"аба", exampleMeaning:"папа",
    similarTo:[16], audioFile:"alef.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"אבא",   tr:"аба",    ru:"папа"    },
      { he:"אמא",   tr:"има",    ru:"мама"    },
      { he:"ארץ",   tr:"эрэц",   ru:"страна"  },
    ],
  },
  {
    id:2, symbol:"ב", name:"Бет", trans:"б/в", sound:"б",
    pronunciation:"Б с дагешем (точка внутри), без дагеша — В",
    group:1, exampleWord:"בית", exampleTrans:"баит", exampleMeaning:"дом",
    similarTo:[11,17], audioFile:"bet.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"בית",   tr:"баит",   ru:"дом"     },
      { he:"בן",    tr:"бэн",    ru:"сын"     },
      { he:"בוקר",  tr:"бокер",  ru:"утро"    },
    ],
  },
  {
    id:3, symbol:"ג", name:"Гимел", trans:"г", sound:"г",
    pronunciation:"Г как в слове «гора» — всегда твёрдая",
    group:1, exampleWord:"גן", exampleTrans:"ган", exampleMeaning:"сад",
    similarTo:[14], audioFile:"gimel.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"גן",    tr:"ган",    ru:"сад"     },
      { he:"גדול",  tr:"гадоль", ru:"большой" },
      { he:"גשם",   tr:"гэшем",  ru:"дождь"   },
    ],
  },
  {
    id:4, symbol:"ד", name:"Далет", trans:"д", sound:"д",
    pronunciation:"Д как в «дом» — твёрдая согласная",
    group:1, exampleWord:"דג", exampleTrans:"даг", exampleMeaning:"рыба",
    similarTo:[20], audioFile:"dalet.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"דג",    tr:"даг",    ru:"рыба"    },
      { he:"דלת",   tr:"дэлет",  ru:"дверь"   },
      { he:"דרך",   tr:"дэрэх",  ru:"дорога"  },
    ],
  },
  {
    id:5, symbol:"ה", name:"Хэй", trans:"h", sound:"х",
    pronunciation:"Мягкое Х, как лёгкий выдох — не горловое",
    group:1, exampleWord:"הר", exampleTrans:"hар", exampleMeaning:"гора",
    similarTo:[8,11], audioFile:"he.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"הר",    tr:"hар",    ru:"гора"    },
      { he:"הוא",   tr:"hу",     ru:"он"      },
      { he:"היום",  tr:"hайом",  ru:"сегодня" },
    ],
  },
  {
    id:6, symbol:"ו", name:"Вав", trans:"в/о/у", sound:"в",
    pronunciation:"В как согласная; О или У как гласная-матка чтения",
    group:1, exampleWord:"ורד", exampleTrans:"вэрэд", exampleMeaning:"роза",
    similarTo:[7,10], audioFile:"vav.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"ורד",   tr:"вэрэд",  ru:"роза"    },
      { he:"ולד",   tr:"вэлэд",  ru:"ребёнок" },
      { he:"ויום",  tr:"вэйом",  ru:"и день"  },
    ],
  },
  // Блок 2
  {
    id:7, symbol:"ז", name:"Зайин", trans:"з", sound:"з",
    pronunciation:"З как в «зима» — звонкая согласная",
    group:2, exampleWord:"זהב", exampleTrans:"захав", exampleMeaning:"золото",
    similarTo:[6], audioFile:"zayin.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"זהב",   tr:"захав",  ru:"золото"  },
      { he:"זמן",   tr:"зман",   ru:"время"   },
      { he:"זרוע",  tr:"зроа",   ru:"рука"    },
    ],
  },
  {
    id:8, symbol:"ח", name:"Хэт", trans:"х(гл)", sound:"х",
    pronunciation:"Горловое Х — как в «Бах» или украинском «г»",
    group:2, exampleWord:"חיים", exampleTrans:"хаим", exampleMeaning:"жизнь",
    similarTo:[5,11], audioFile:"chet.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"חיים",  tr:"хаим",   ru:"жизнь"   },
      { he:"חם",    tr:"хам",    ru:"тёплый"  },
      { he:"חול",   tr:"холь",   ru:"песок"   },
    ],
  },
  {
    id:9, symbol:"ט", name:"Тэт", trans:"т", sound:"т",
    pronunciation:"Т как в «там» — исторически эмфатическое, в современном иврите как обычное Т",
    group:2, exampleWord:"טוב", exampleTrans:"тов", exampleMeaning:"хорошо",
    similarTo:[15], audioFile:"tet.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"טוב",   tr:"тов",    ru:"хорошо"  },
      { he:"טבע",   tr:"тэва",   ru:"природа" },
      { he:"טיול",  tr:"тиюль",  ru:"прогулка"},
    ],
  },
  {
    id:10, symbol:"י", name:"Йуд", trans:"й/и", sound:"й",
    pronunciation:"Й как в «йога»; также гласная И в матках чтения",
    group:2, exampleWord:"יום", exampleTrans:"йом", exampleMeaning:"день",
    similarTo:[6], audioFile:"yud.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"יום",   tr:"йом",    ru:"день"    },
      { he:"יד",    tr:"яд",     ru:"рука"    },
      { he:"ים",    tr:"ям",     ru:"море"    },
    ],
  },
  {
    id:11, symbol:"כ", name:"Каф", trans:"к/х", sound:"к",
    pronunciation:"К с дагешем; без дагеша — горловое Х (как Хэт, но мягче)",
    group:2, exampleWord:"כוכב", exampleTrans:"кохав", exampleMeaning:"звезда",
    similarTo:[2,5,8], audioFile:"chaf.mp3", finalForm:"ך", isFinalForm:false,
    words:[
      { he:"כוכב",  tr:"кохав",  ru:"звезда"  },
      { he:"כלב",   tr:"кэлев",  ru:"собака"  },
      { he:"כסף",   tr:"кэсэф",  ru:"деньги"  },
    ],
  },
  {
    id:12, symbol:"ל", name:"Ламед", trans:"л", sound:"л",
    pronunciation:"Л как в «лампа» — самая высокая буква алфавита",
    group:2, exampleWord:"לחם", exampleTrans:"лэхэм", exampleMeaning:"хлеб",
    similarTo:[], audioFile:"lamed.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"לחם",   tr:"лэхэм",  ru:"хлеб"    },
      { he:"לב",    tr:"лев",    ru:"сердце"  },
      { he:"לילה",  tr:"лайла",  ru:"ночь"    },
    ],
  },
  // Блок 3
  {
    id:13, symbol:"מ", name:"Мем", trans:"м", sound:"м",
    pronunciation:"М как в «мама»",
    group:3, exampleWord:"מים", exampleTrans:"маим", exampleMeaning:"вода",
    similarTo:[15], audioFile:"mem.mp3", finalForm:"ם", isFinalForm:false,
    words:[
      { he:"מים",   tr:"маим",   ru:"вода"    },
      { he:"מה",    tr:"ма",     ru:"что"     },
      { he:"מכונית",tr:"мэхонит",ru:"машина"  },
    ],
  },
  {
    id:14, symbol:"נ", name:"Нун", trans:"н", sound:"н",
    pronunciation:"Н как в «нос»",
    group:3, exampleWord:"נהר", exampleTrans:"наhар", exampleMeaning:"река",
    similarTo:[3,6], audioFile:"nun.mp3", finalForm:"ן", isFinalForm:false,
    words:[
      { he:"נהר",   tr:"наhар",  ru:"река"    },
      { he:"נר",    tr:"нер",    ru:"свеча"   },
      { he:"נשים",  tr:"нашим",  ru:"женщины" },
    ],
  },
  {
    id:15, symbol:"ס", name:"Самех", trans:"с", sound:"с",
    pronunciation:"С как в «сом» — всегда глухая",
    group:3, exampleWord:"ספר", exampleTrans:"сэфэр", exampleMeaning:"книга",
    similarTo:[9,13], audioFile:"samech.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"ספר",   tr:"сэфэр",  ru:"книга"   },
      { he:"סוס",   tr:"сус",    ru:"лошадь"  },
      { he:"סכין",  tr:"сакин",  ru:"нож"     },
    ],
  },
  {
    id:16, symbol:"ע", name:"Айин", trans:"–", sound:"гл.",
    pronunciation:"Горловая буква — в современном иврите как Алеф, произносится гласная рядом",
    group:3, exampleWord:"עץ", exampleTrans:"эц", exampleMeaning:"дерево",
    similarTo:[1], audioFile:"ayin.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"עץ",    tr:"эц",     ru:"дерево"  },
      { he:"עין",   tr:"айин",   ru:"глаз"    },
      { he:"עכשיו", tr:"ахшав",  ru:"сейчас"  },
    ],
  },
  {
    id:17, symbol:"פ", name:"Пэй", trans:"п/ф", sound:"п",
    pronunciation:"П с дагешем; без дагеша — Ф",
    group:3, exampleWord:"פרח", exampleTrans:"пэрах", exampleMeaning:"цветок",
    similarTo:[2,11], audioFile:"fay.mp3", finalForm:"ף", isFinalForm:false,
    words:[
      { he:"פרח",   tr:"пэрах",  ru:"цветок"  },
      { he:"פה",    tr:"по",     ru:"рот/здесь"},
      { he:"פנים",  tr:"паним",  ru:"лицо"    },
    ],
  },
  // Блок 4
  {
    id:18, symbol:"צ", name:"Цади", trans:"ц", sound:"ц",
    pronunciation:"Ц как в «цапля» — аффриката",
    group:4, exampleWord:"ציפור", exampleTrans:"ципор", exampleMeaning:"птица",
    similarTo:[14], audioFile:"tsadi.mp3", finalForm:"ץ", isFinalForm:false,
    words:[
      { he:"ציפור",  tr:"ципор",  ru:"птица"   },
      { he:"צבא",   tr:"цава",   ru:"армия"   },
      { he:"צלחת",  tr:"цалахат",ru:"тарелка" },
    ],
  },
  {
    id:19, symbol:"ק", name:"Куф", trans:"к", sound:"к",
    pronunciation:"К как в «кот» — в современном иврите как обычная К",
    group:4, exampleWord:"קול", exampleTrans:"коль", exampleMeaning:"голос",
    similarTo:[5], audioFile:"kuf.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"קול",   tr:"коль",   ru:"голос"   },
      { he:"קר",    tr:"кар",    ru:"холодный"},
      { he:"קיץ",   tr:"кайц",   ru:"лето"    },
    ],
  },
  {
    id:20, symbol:"ר", name:"Рэйш", trans:"р", sound:"р",
    pronunciation:"Р — в иврите увулярное (горловое), как французское R",
    group:4, exampleWord:"ראש", exampleTrans:"рош", exampleMeaning:"голова",
    similarTo:[4], audioFile:"resh.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"ראש",   tr:"рош",    ru:"голова"  },
      { he:"רגל",   tr:"рэгэль", ru:"нога"    },
      { he:"רחוב",  tr:"рэхов",  ru:"улица"   },
    ],
  },
  {
    id:21, symbol:"ש", name:"Шин", trans:"ш/с", sound:"ш",
    pronunciation:"Ш с точкой справа; С с точкой слева (Син)",
    group:4, exampleWord:"שלום", exampleTrans:"шалом", exampleMeaning:"мир",
    similarTo:[], audioFile:"shin.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"שלום",  tr:"шалом",  ru:"мир/привет"},
      { he:"שמש",   tr:"шэмэш",  ru:"солнце"  },
      { he:"שנה",   tr:"шана",   ru:"год"     },
    ],
  },
  {
    id:22, symbol:"ת", name:"Тав", trans:"т", sound:"т",
    pronunciation:"Т как в «там» — последняя буква алфавита",
    group:4, exampleWord:"תפוח", exampleTrans:"тапуах", exampleMeaning:"яблоко",
    similarTo:[], audioFile:"thaf.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"תפוח",  tr:"тапуах", ru:"яблоко"  },
      { he:"תודה",  tr:"тода",   ru:"спасибо" },
      { he:"תל אביב",tr:"тэль авив",ru:"Тель-Авив"},
    ],
  },
];

export const FINAL_FORMS = [
  {
    id:101, symbol:"ך", name:"Каф-Софит", trans:"к/х", sound:"х",
    pronunciation:"Финальная форма Каф — в конце слова всегда без дагеша, звучит как Х",
    group:5, exampleWord:"מלך", exampleTrans:"мэлэх", exampleMeaning:"царь",
    similarTo:[103], isFinalForm:true, baseLetterId:11, audioFile:"kaf-sofit.mp3",
    words:[
      { he:"מלך",   tr:"мэлэх",  ru:"царь"    },
      { he:"ברך",   tr:"бэрэх",  ru:"колено"  },
      { he:"דרך",   tr:"дэрэх",  ru:"дорога"  },
    ],
  },
  {
    id:102, symbol:"ם", name:"Мем-Софит", trans:"м", sound:"м",
    pronunciation:"Финальная форма Мем — закрытый прямоугольник в конце слова",
    group:5, exampleWord:"עולם", exampleTrans:"олам", exampleMeaning:"мир",
    similarTo:[15], isFinalForm:true, baseLetterId:13, audioFile:"mem-sofit.mp3",
    words:[
      { he:"עולם",  tr:"олам",   ru:"мир"     },
      { he:"שלום",  tr:"шалом",  ru:"покой"   },
      { he:"יום",   tr:"йом",    ru:"день"    },
    ],
  },
  {
    id:103, symbol:"ן", name:"Нун-Софит", trans:"н", sound:"н",
    pronunciation:"Финальная форма Нун — прямой штрих вниз под строку",
    group:5, exampleWord:"בן", exampleTrans:"бэн", exampleMeaning:"сын",
    similarTo:[101], isFinalForm:true, baseLetterId:14, audioFile:"nun-sofit.mp3",
    words:[
      { he:"בן",    tr:"бэн",    ru:"сын"     },
      { he:"גן",    tr:"ган",    ru:"сад"     },
      { he:"אדן",   tr:"адон",   ru:"господин"},
    ],
  },
  {
    id:104, symbol:"ף", name:"Пэй-Софит", trans:"п/ф", sound:"ф",
    pronunciation:"Финальная форма Пэй — в конце слова всегда без дагеша, звучит как Ф",
    group:5, exampleWord:"אף", exampleTrans:"аф", exampleMeaning:"нос",
    similarTo:[11], isFinalForm:true, baseLetterId:17, audioFile:"pe-sofit.mp3",
    words:[
      { he:"אף",    tr:"аф",     ru:"нос"     },
      { he:"כף",    tr:"каф",    ru:"ладонь"  },
      { he:"חרף",   tr:"хорэф",  ru:"зима"    },
    ],
  },
  {
    id:105, symbol:"ץ", name:"Цади-Софит", trans:"ц", sound:"ц",
    pronunciation:"Финальная форма Цади — хвост уходит прямо вниз под строку",
    group:5, exampleWord:"ארץ", exampleTrans:"эрэц", exampleMeaning:"земля",
    similarTo:[18], isFinalForm:true, baseLetterId:18, audioFile:"tsadi-sofit.mp3",
    words:[
      { he:"ארץ",   tr:"эрэц",   ru:"земля"   },
      { he:"קיץ",   tr:"кайц",   ru:"лето"    },
      { he:"חוץ",   tr:"хуц",    ru:"снаружи" },
    ],
  },
];

export const ALL_LETTERS = [...ALPHABET, ...FINAL_FORMS];

export const LETTER_GROUPS = [
  { id:1, name:"Первые шаги",    nameHe:"צעדים ראשונים", letterIds:[1,2,3,4,5,6],        description:"6 самых простых и частых букв",      color:"emerald", unlocksAfter:null },
  { id:2, name:"Звуки и формы",  nameHe:"צלילים וצורות",  letterIds:[7,8,9,10,11,12],     description:"Новые звуки и более сложные формы",  color:"blue",    unlocksAfter:1 },
  { id:3, name:"Похожие буквы",  nameHe:"אותיות דומות",   letterIds:[13,14,15,16,17],     description:"Буквы, которые легко перепутать",    color:"amber",   unlocksAfter:2 },
  { id:4, name:"Редкие буквы",   nameHe:"אותיות נדירות",  letterIds:[18,19,20,21,22],     description:"Редкие и сложные буквы",             color:"rose",    unlocksAfter:3 },
  { id:5, name:"Финальные формы",nameHe:"אותיות סופיות",  letterIds:[101,102,103,104,105],description:"Буквы, меняющие форму в конце слова", color:"purple",  unlocksAfter:4 },
];

// ─────────────────────────────────────────────────────────────────────────────
// НИКУД — огласовки (добавить в конец alphabet.js)
// ─────────────────────────────────────────────────────────────────────────────

// Отдельные огласовки — справочник
export const NIKUD = [
  // Группа 1 — «Три кита» (А, И, У — максимально разные, не спутать)
  { id: "patah",   symbol: "ַ",   sound: "а", name: "Патах",  nameHe: "פַּתַח",  groupId: 1,
    hint: "Черта снизу — звук А",
    visualDesc: "горизонтальная черта под буквой" },
  { id: "hirik",   symbol: "ִ",   sound: "и", name: "Хирик", nameHe: "חִירִיק", groupId: 1,
    hint: "Точка снизу — звук И",
    visualDesc: "одна точка под буквой" },
  { id: "shuruk",  symbol: "וּ",  sound: "у", name: "Шурук", nameHe: "שׁוּרוּק", groupId: 1,
    hint: "Вав с точкой — звук У",
    visualDesc: "буква вав с точкой внутри" },

  // Группа 2 — «Двойник А» (камац тоже А — концепция двойников)
  { id: "kamatz",  symbol: "ָ",   sound: "а", name: "Камац", nameHe: "קָמַץ",  groupId: 2,
    hint: "Т-образный знак снизу — тоже А",
    visualDesc: "знак похожий на перевёрнутую Т под буквой",
    twinOf: "patah", twinNote: "Камац и патах звучат одинаково — оба А" },

  // Группа 3 — «Э-звуки» (два знака = один звук Э)
  { id: "tsere",   symbol: "ֵ",   sound: "э", name: "Цере",   nameHe: "צֵרֵי",  groupId: 3,
    hint: "Две точки снизу слева — звук Э",
    visualDesc: "две точки под буквой, вытянуты горизонтально" },
  { id: "segol",   symbol: "ֶ",   sound: "э", name: "Сеголь", nameHe: "סֶגוֹל", groupId: 3,
    hint: "Три точки треугольником — тоже Э",
    visualDesc: "три точки под буквой треугольником",
    twinOf: "tsere", twinNote: "Цере и сеголь звучат одинаково — оба Э" },

  // Группа 4 — «О-звук» + кубуц (Stars)
  { id: "holam",   symbol: "ֹ",   sound: "о", name: "Холам",  nameHe: "חֹלֶם",  groupId: 4,
    hint: "Точка сверху слева — звук О",
    visualDesc: "маленькая точка над буквой слева" },
  { id: "kubutz",  symbol: "ֻ",   sound: "у", name: "Кубуц",  nameHe: "קִיבּוּץ", groupId: 4,
    hint: "Три точки по диагонали снизу — тоже У",
    visualDesc: "три точки под буквой по диагонали",
    twinOf: "shuruk", twinNote: "Кубуц и шурук звучат одинаково — оба У" },

  // Группа 5 — «Шва и особые случаи» (Stars)
  { id: "shva",    symbol: "ְ",   sound: "", name: "Шва",    nameHe: "שְׁוָא",  groupId: 5,
    hint: "Две точки вертикально — молчит или краткое Э",
    visualDesc: "две точки вертикально под буквой",
    special: true,
    specialNote: "Шва — особый знак. Либо закрывает слог (молчит), либо открывает новый (краткое Э)" },
];

// Группы огласовок — параллельно LETTER_GROUPS
export const NIKUD_GROUPS = [
  {
    id: 1,
    name: "Три кита",
    nameHe: "שלושה עוגנים",
    vowelIds: ["patah", "hirik", "shuruk"],
    description: "А, И, У — три звука которые невозможно перепутать",
    color: "emerald",
    unlocksAfter: null, // первая группа открыта сразу (при isPremium)
    isPaid: false,      // бесплатно
    // Центральная идея модуля О-1/О-2
    conceptTitle: "Буква + значок = слог",
    conceptBody: "В иврите буквы — только согласные. Гласный звук добавляется значком рядом. Буква всегда читается вместе со своим значком — после него.",
    conceptExample: { word: "שָׁלוֹם", syllables: ["שָׁ", "לוֹ", "ם"], transliteration: "шалом", translation: "мир / привет" },
  },
  {
    id: 2,
    name: "Двойник А",
    nameHe: "כפיל האלף",
    vowelIds: ["kamatz"],
    description: "Камац выглядит иначе — но звучит так же",
    color: "blue",
    unlocksAfter: 1,
    isPaid: false,
    conceptTitle: "Два знака — один звук",
    conceptBody: "В иврите бывает так: разные знаки звучат одинаково. Камац и патах оба дают звук А. Это не ошибка — так сложилось исторически. Ваша задача: не пугаться, а привыкнуть.",
    conceptExample: { word: "שָׁנָה", syllables: ["שָׁ", "נָה"], transliteration: "шана", translation: "год" },
  },
  {
    id: 3,
    name: "Э-звуки",
    nameHe: "צלילי האי",
    vowelIds: ["tsere", "segol"],
    description: "Цере и сеголь — снова двойники, теперь для Э",
    color: "amber",
    unlocksAfter: 2,
    isPaid: false,
    conceptTitle: "Снова двойники",
    conceptBody: "Паттерн тот же: два знака, один звук Э. Цере — две точки горизонтально, сеголь — три точки треугольником. Оба читаются как Э. Теперь у тебя 4 огласовки и ты знаешь А, И, У, Э.",
    conceptExample: { word: "בֶּן", syllables: ["בֶּ", "ן"], transliteration: "бэн", translation: "сын" },
  },
  {
    id: 4,
    name: "О-звук",
    nameHe: "צליל האו",
    vowelIds: ["holam", "kubutz"],
    description: "Холам и кубуц — последний звук О и второй вариант У",
    color: "rose",
    unlocksAfter: 3,
    isPaid: true, // Stars
    conceptTitle: "Полная картина",
    conceptBody: "Холам — точка над буквой, звук О. Кубуц — три точки снизу по диагонали, тоже У (второй вариант после шурука). Теперь ты знаешь все 5 гласных звуков иврита.",
    conceptExample: { word: "שָׁלוֹם", syllables: ["שָׁ", "לוֹ", "ם"], transliteration: "шалом", translation: "мир / привет" },
  },
  {
    id: 5,
    name: "Шва и матери чтения",
    nameHe: "שווא ואמות קריאה",
    vowelIds: ["shva"],
    description: "Особые случаи — шва, матери чтения, правила распознавания",
    color: "purple",
    unlocksAfter: 4,
    isPaid: true, // Stars
    conceptTitle: "Последний секрет иврита",
    conceptBody: "Шва — знак без чёткого звука. Иногда молчит (закрывает слог), иногда произносится как краткое Э (открывает слог). А буквы א ה ו י иногда вообще не читаются — они лишь уточняют вид гласного.",
    conceptExample: { word: "בְּרֵאשִׁית", syllables: ["בְּ", "רֵא", "שִׁית"], transliteration: "брэйшит", translation: "в начале (первое слово Торы)" },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SIGHT WORDS — слова для чтения
// ─────────────────────────────────────────────────────────────────────────────

export const SIGHT_WORDS = [
  {
    id: 1, nikudGroup: 1, isPaid: false,
    hebrew: "מַיִם", plain: "מים",
    syllables: ["מַ","יִם"],
    transliteration: "маим",
    translation: "вода", emoji: "💧",
    distractors: ["маям","миим","муим"],
  },
  {
    id: 2, nikudGroup: 1, isPaid: false,
    hebrew: "אַבָּא", plain: "אבא",
    syllables: ["אַ","בָּא"],
    transliteration: "аба",
    translation: "папа", emoji: "👨",
    distractors: ["има","яд","ши"],
  },
  {
    id: 3, nikudGroup: 1, isPaid: false,
    hebrew: "אִמָּא", plain: "אמא",
    syllables: ["אִ","מָּא"],
    transliteration: "има",
    translation: "мама", emoji: "👩",
    distractors: ["аба","яд","ши"],
  },
  {
    id: 4, nikudGroup: 1, isPaid: false,
    hebrew: "יַד", plain: "יד",
    syllables: ["יַד"],
    transliteration: "яд",
    translation: "рука", emoji: "✋",
    distractors: ["йид","йуд","йэд"],
  },
  {
    id: 5, nikudGroup: 1, isPaid: false,
    hebrew: "שִׁי", plain: "שי",
    syllables: ["שִׁי"],
    transliteration: "ши",
    translation: "подарок", emoji: "🎁",
    distractors: ["аба","яд","ми"],
  },
  {
    id: 6, nikudGroup: 2, isPaid: false,
    hebrew: "שָׁנָה", plain: "שנה",
    syllables: ["שָׁ","נָה"],
    transliteration: "шана",
    translation: "год", emoji: "📅",
    distractors: ["шина","шуна","шэна"],
  },
  {
    id: 7, nikudGroup: 2, isPaid: false,
    hebrew: "אָח", plain: "אח",
    syllables: ["אָח"],
    transliteration: "ах",
    translation: "брат", emoji: "👦",
    distractors: ["их","ух","эх"],
  },
  {
    id: 8, nikudGroup: 2, isPaid: false,
    hebrew: "מָה", plain: "מה",
    syllables: ["מָה"],
    transliteration: "ма",
    translation: "что", emoji: "❓",
    distractors: ["ми","му","мэ"],
  },
  {
    id: 9, nikudGroup: 2, isPaid: false,
    hebrew: "דָּג", plain: "דג",
    syllables: ["דָּג"],
    transliteration: "даг",
    translation: "рыба", emoji: "🐟",
    distractors: ["диг","дуг","дэг"],
  },
  {
    id: 10, nikudGroup: 2, isPaid: false,
    hebrew: "בָּבָא", plain: "באבא",
    syllables: ["בָּ","בָּא"],
    transliteration: "баба",
    translation: "дверь (разг.)", emoji: "🚪",
    distractors: ["аба","ма","ах"],
  },
  {
    id: 11, nikudGroup: 3, isPaid: false,
    hebrew: "בֶּן", plain: "בן",
    syllables: ["בֶּן"],
    transliteration: "бэн",
    translation: "сын", emoji: "👦",
    distractors: ["бан","бин","бун"],
  },
  {
    id: 12, nikudGroup: 3, isPaid: false,
    hebrew: "שֶׁמֶשׁ", plain: "שמש",
    syllables: ["שֶׁ","מֶשׁ"],
    transliteration: "шэмэш",
    translation: "солнце", emoji: "☀️",
    distractors: ["шамаш","шимиш","шумуш"],
  },
  {
    id: 13, nikudGroup: 3, isPaid: false,
    hebrew: "סֵפֶר", plain: "ספר",
    syllables: ["סֵ","פֶר"],
    transliteration: "сэфэр",
    translation: "книга", emoji: "📖",
    distractors: ["сафар","сифир","суфур"],
  },
  {
    id: 14, nikudGroup: 3, isPaid: false,
    hebrew: "לֶחֶם", plain: "לחם",
    syllables: ["לֶ","חֶם"],
    transliteration: "лэхэм",
    translation: "хлеб", emoji: "🍞",
    distractors: ["лахам","лихим","лухум"],
  },
  {
    id: 15, nikudGroup: 3, isPaid: false,
    hebrew: "כֶּלֶב", plain: "כלב",
    syllables: ["כֶּ","לֶב"],
    transliteration: "кэлэв",
    translation: "собака", emoji: "🐕",
    distractors: ["калав","килив","кулув"],
  },
  {
    id: 16, nikudGroup: 4, isPaid: true,
    hebrew: "שָׁלוֹם", plain: "שלום",
    syllables: ["שָׁ","לוֹם"],
    transliteration: "шалом",
    translation: "мир / привет", emoji: "✌️",
    distractors: ["шилим","шулум","шэлэм"],
  },
  {
    id: 17, nikudGroup: 4, isPaid: true,
    hebrew: "תּוֹדָה", plain: "תודה",
    syllables: ["תּוֹ","דָה"],
    transliteration: "тода",
    translation: "спасибо", emoji: "🙏",
    distractors: ["тиди","туду","тэдэ"],
  },
  {
    id: 18, nikudGroup: 4, isPaid: true,
    hebrew: "כֹּל", plain: "כל",
    syllables: ["כֹּל"],
    transliteration: "коль",
    translation: "всё / каждый", emoji: "🌍",
    distractors: ["каль","киль","куль"],
  },
  {
    id: 19, nikudGroup: 4, isPaid: true,
    hebrew: "יוֹם", plain: "יום",
    syllables: ["יוֹם"],
    transliteration: "йом",
    translation: "день", emoji: "🗓️",
    distractors: ["ям","йим","йэм"],
  },
  {
    id: 20, nikudGroup: 4, isPaid: true,
    hebrew: "טוֹב", plain: "טוב",
    syllables: ["טוֹב"],
    transliteration: "тов",
    translation: "хорошо / добро", emoji: "👍",
    distractors: ["тав","тив","тэв"],
  },
  {
    id: 21, nikudGroup: 4, isPaid: true,
    hebrew: "אוֹר", plain: "אור",
    syllables: ["אוֹר"],
    transliteration: "ор",
    translation: "свет", emoji: "💡",
    distractors: ["ар","ир","эр"],
  },
  {
    id: 22, nikudGroup: 4, isPaid: true,
    hebrew: "כֹּכָב", plain: "כוכב",
    syllables: ["כֹּ","כָב"],
    transliteration: "кохав",
    translation: "звезда", emoji: "⭐",
    distractors: ["кахав","кихив","кухув"],
  },
  {
    id: 23, nikudGroup: 5, isPaid: true,
    hebrew: "בְּרֵאשִׁית", plain: "בראשית",
    syllables: ["בְּ","רֵא","שִׁית"],
    transliteration: "брэйшит",
    translation: "в начале (Берешит)", emoji: "📜",
    distractors: ["брашат","бришит","брушут"],
  },
  {
    id: 24, nikudGroup: 5, isPaid: true,
    hebrew: "שְׁמַע", plain: "שמע",
    syllables: ["שְׁ","מַע"],
    transliteration: "шма",
    translation: "слушай (Шма Исраэль)", emoji: "👂",
    distractors: ["шама","шими","шуму"],
  }
];