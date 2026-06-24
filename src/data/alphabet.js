export const ALPHABET = [
  // Блок 1
  {
    id:1, symbol:"א", name:"Алеф", trans:"а/–", sound:"а",
    pronunciation:"Немая буква — звука нет, произносится гласная рядом",
    group:1, exampleWord:"אבא", exampleTrans:"аба", exampleMeaning:"папа",
    similarTo:[16], audioFile:"alef.mp3", finalForm:null, isFinalForm:false,
    words:[
      { he:"אבא",   tr:"аба",    ru:"папа"    },
      { he:"אם",    tr:"эм",     ru:"мама"    },
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
    similarTo:[8,11], audioFile:"hey.mp3", finalForm:null, isFinalForm:false,
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
    similarTo:[5,11], audioFile:"khet.mp3", finalForm:null, isFinalForm:false,
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
    id:10, symbol:"י", name:"Йод", trans:"й/и", sound:"й",
    pronunciation:"Й как в «йога»; также гласная И в матках чтения",
    group:2, exampleWord:"יום", exampleTrans:"йом", exampleMeaning:"день",
    similarTo:[6], audioFile:"yod.mp3", finalForm:null, isFinalForm:false,
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
    similarTo:[2,5,8], audioFile:"kaf.mp3", finalForm:"ך", isFinalForm:false,
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
    similarTo:[9,13], audioFile:"samekh.mp3", finalForm:null, isFinalForm:false,
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
    similarTo:[2,11], audioFile:"pe.mp3", finalForm:"ף", isFinalForm:false,
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
      { he:"צלחת",  tr:"цэлахат",ru:"тарелка" },
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
    similarTo:[], audioFile:"tav.mp3", finalForm:null, isFinalForm:false,
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
