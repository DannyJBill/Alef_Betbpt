/**
 * reading.js — порции слов единого потока (schema v7.1).
 *
 * МЕХАНИКА: порция слов — полноценный узел графа курса (data/curriculum.js).
 * В зоне 0 (буквы+огласовки) порции ОБЯЗАТЕЛЬНЫ — следующий урок зоны
 * требует изучения порции предыдущего (100% доступных карточек).
 * Дальше (грамматика) порции открываются уроком, но не гейтят прогресс.
 *
 * Поля блока:
 *   id     — id узла в curriculum.js ('VL1.3') или 'R1.<seq>' для порций уроков
 *   seq    — порядок в ленте «Новое» (канонический путь курса)
 *   lesson — для порций грамматики: урок, который открывает порцию
 *   mode   — 'preview': порция до изучения никуда (транслит+аудио ведут чтение,
 *            допущен камац как «а»; N1.1/N1.2 потом формализуют знаки)
 *   items  — ТОЛЬКО новый материал (слово вводится в курсе ровно один раз)
 *   review — спираль повторения: ССЫЛКИ (id) на карточки предыдущих порций
 *
 * ПРАВИЛО ПЕРЕНОСА ИЗ МАСТЕРСКОЙ: дубль по plain → в review, не в items.
 * Историческая чистка v7.1: удалены дубли rp_26 (≈rw_56), rp_07 (≈rp_06), rw_53 (≈rw_49).
 * Черновики (draft:true) — придуманы при пере-нарезке, сверить перевод/никуд.
 */

export const READING_BLOCKS = [
  { id:"VL1.1", seq:2, title:"Первые слова", unlockLabel:"урок «Буквы гр.1»", mode:'preview',
    items: [
      { id:"rw_10", hebrew:"אַבָּא", plain:"אבא", transliteration:"аба", translation:"папа", english:"dad", type:"noun", audio:"reading_010.mp3" },
      { id:"rw_12", hebrew:"אַהֲבָה", plain:"אהבה", transliteration:"аhава", translation:"любовь", english:"love", type:"noun", audio:"reading_012.mp3" },
      { id:"rw_45", hebrew:"בָּאָה", plain:"באה", transliteration:"баа", translation:"приходит (ж.р.)", english:"comes (f)", type:"verb", audio:"reading_045.mp3" },
      { id:"rv_d01", hebrew:"דָּג", plain:"דג", transliteration:"даг", translation:"рыба", type:"word", audio:null, draft:true },
      { id:"rv_d02", hebrew:"גַּג", plain:"גג", transliteration:"гаг", translation:"крыша", type:"word", audio:null, draft:true },
    ],
    review: [],
  },
  { id:"VL1.2", seq:4, title:"Слова группы 2", unlockLabel:"урок «Буквы гр.2»", mode:'preview',
    items: [
      { id:"rw_07", hebrew:"הִיא", plain:"היא", transliteration:"hи", translation:"она", english:"she", type:"pronoun", audio:"reading_007.mp3" },
      { id:"rw_11", hebrew:"חָלָב", plain:"חלב", transliteration:"халав", translation:"молоко", english:"milk", type:"noun", audio:"reading_011.mp3" },
      { id:"rw_54", hebrew:"חַג", plain:"חג", transliteration:"хаг", translation:"праздник", english:"holiday", type:"noun", audio:"reading_054b.mp3" },
      { id:"rw_55", hebrew:"טִיוּל", plain:"טיול", transliteration:"тиюль", translation:"прогулка / поход", english:"trip", type:"noun", audio:"reading_054c.mp3" },
      { id:"rw_56", hebrew:"אוּלַי", plain:"אולי", transliteration:"улай", translation:"может быть", english:"maybe", type:"particle", audio:"reading_054d.mp3" },
      { id:"rw_57", hebrew:"אַז", plain:"אז", transliteration:"аз", translation:"тогда", english:"then", type:"particle", audio:"reading_054e.mp3" },
    ],
    review: [],
  },
  { id:"VL1.3", seq:10, title:"Слова: буквы гр.3", unlockLabel:"Буквы гр.3",
    items: [
      { id:"rw_01", hebrew:"אִימָא", plain:"אימא", transliteration:"има", translation:"мама", english:"mom", type:"noun", audio:"reading_001.mp3" },
      { id:"rw_02", hebrew:"יַיִן", plain:"יין", transliteration:"яин", translation:"вино", english:"wine", type:"noun", audio:"reading_002.mp3" },
      { id:"rw_03", hebrew:"מַיִם", plain:"מים", transliteration:"маим", translation:"вода", english:"water", type:"noun", audio:"reading_003.mp3" },
      { id:"rw_04", hebrew:"אֲנִי", plain:"אני", transliteration:"ани", translation:"я", english:"I", type:"pronoun", audio:"reading_004.mp3" },
      { id:"rw_13", hebrew:"חַם", plain:"חם", transliteration:"хам", translation:"горячий", english:"hot", type:"adj", audio:"reading_013.mp3" },
      { id:"rp_19", hebrew:"מִי", plain:"מי", transliteration:"ми", translation:"кто?", english:"who?", type:"phrase", audio:"reading_072.mp3" },
      { id:"rp_20", hebrew:"מַה", plain:"מה", transliteration:"ма", translation:"что?", english:"what?", type:"phrase", audio:"reading_073.mp3" },
      { id:"rp_16", hebrew:"כַּמָּה", plain:"כמה", transliteration:"кама", translation:"сколько?", english:"how much / how many?", type:"phrase", audio:"reading_069.mp3" },
      { id:"rp_18", hebrew:"לָמָה", plain:"למה", transliteration:"лама", translation:"почему?", english:"why?", type:"phrase", audio:"reading_071.mp3" },
      { id:"rp_33", hebrew:"חוּמוּס", plain:"חומוס", transliteration:"хумус", translation:"хумус", english:"hummus", type:"phrase", audio:"reading_086.mp3" },
      { id:"rp_34", hebrew:"בָּלָאגָן", plain:"בלאגן", transliteration:"балаган", translation:"беспорядок / балаган", english:"mess / chaos", type:"phrase", audio:"reading_087.mp3" },
      { id:"rw_33", hebrew:"עוּגָה", plain:"עוגה", transliteration:"уга", translation:"торт / пирог", english:"cake", type:"noun", audio:"reading_033.mp3" },
      { id:"rw_39", hebrew:"טָעִים", plain:"טעים", transliteration:"таим", translation:"вкусный", english:"tasty", type:"adj", audio:"reading_039.mp3" },
      { id:"rp_30", hebrew:"עֲלִייָּה", plain:"עלייה", transliteration:"алия", translation:"алия", english:"aliyah", type:"phrase", audio:"reading_083.mp3" },
    ],
    review: [],
  },
  { id:"VN1.3", seq:12, title:"Слова: Э-звуки", unlockLabel:"Огласовки Н3",
    items: [
      { id:"rw_09", hebrew:"לֶחֶם", plain:"לחם", transliteration:"лехем", translation:"хлеб", english:"bread", type:"noun", audio:"reading_009.mp3" },
      { id:"rp_25", hebrew:"הֵם", plain:"הם", transliteration:"hем", translation:"они (м.р.)", english:"they", type:"phrase", audio:"reading_078.mp3" },
      { id:"rw_16", hebrew:"יֶלֶד", plain:"ילד", transliteration:"йелед", translation:"мальчик", english:"boy", type:"noun", audio:"reading_016.mp3" },
      { id:"rw_18", hebrew:"זֶה", plain:"זה", transliteration:"зэ", translation:"это (м.р.)", english:"this (m)", type:"pronoun", audio:"reading_018.mp3" },
      { id:"rw_20", hebrew:"כֵּן", plain:"כן", transliteration:"кен", translation:"да", english:"yes", type:"particle", audio:"reading_020.mp3" },
      { id:"rw_23", hebrew:"כֶּלֶב", plain:"כלב", transliteration:"келев", translation:"собака", english:"dog", type:"noun", audio:"reading_023.mp3" },
      { id:"rw_25", hebrew:"מֶלֶך", plain:"מלך", transliteration:"мелех", translation:"король / царь", english:"king", type:"noun", audio:"reading_025.mp3" },
      { id:"rp_15", hebrew:"אֵיך", plain:"איך", transliteration:"эйх", translation:"как?", english:"how?", type:"phrase", audio:"reading_068.mp3" },
      { id:"rp_32", hebrew:"פָלָאפֶל", plain:"פלאפל", transliteration:"фалафель", translation:"фалафель", english:"falafel", type:"phrase", audio:"reading_085.mp3" },
      { id:"rw_34", hebrew:"יָפֶה", plain:"יפה", transliteration:"яфэ", translation:"красивый", english:"beautiful", type:"adj", audio:"reading_034.mp3" },
      { id:"rw_38", hebrew:"כֵּיף", plain:"כיף", transliteration:"кейф", translation:"кайф / весело", english:"fun", type:"noun", audio:"reading_038.mp3" },
      { id:"rp_11", hebrew:"אֵין בַּעַד מָה", plain:"אין בעד מה", transliteration:"эйн баад ма", translation:"не за что", english:"you're welcome", type:"phrase", audio:"reading_064.mp3" },
      { id:"rp_39", hebrew:"יַם הַמֶלַח", plain:"ים המלח", transliteration:"ям hамелах", translation:"Мёртвое море", english:"the Dead Sea", type:"phrase", audio:"reading_092.mp3" },
    ],
    review: [],
  },
  { id:"VL1.4", seq:14, title:"Слова: буквы гр.4", unlockLabel:"Буквы гр.4",
    items: [
      { id:"rw_05", hebrew:"אַת", plain:"את", transliteration:"ат", translation:"ты (ж.р.)", english:"you (f)", type:"pronoun", audio:"reading_005.mp3" },
      { id:"rw_06", hebrew:"אַתָה", plain:"אתה", transliteration:"ата", translation:"ты (м.р.)", english:"you (m)", type:"pronoun", audio:"reading_006.mp3" },
      { id:"rp_22", hebrew:"עֶרֶב", plain:"ערב", transliteration:"эрев", translation:"вечер", english:"evening", type:"phrase", audio:"reading_075.mp3" },
      { id:"rw_15", hebrew:"אִישָּׁה", plain:"אישה", transliteration:"иша", translation:"женщина / жена", english:"woman / wife", type:"noun", audio:"reading_015.mp3" },
      { id:"rw_21", hebrew:"גֶּבֶר", plain:"גבר", transliteration:"гевер", translation:"мужчина", english:"man", type:"noun", audio:"reading_021.mp3" },
      { id:"rw_24", hebrew:"שָׂמֵחַ", plain:"שמח", transliteration:"самеах", translation:"счастливый", english:"happy", type:"adj", audio:"reading_024.mp3" },
      { id:"rw_26", hebrew:"מַשָּׂאִית", plain:"משאית", transliteration:"масаит", translation:"грузовик", english:"truck", type:"noun", audio:"reading_026.mp3" },
      { id:"rp_17", hebrew:"מָתַי", plain:"מתי", transliteration:"матай", translation:"когда?", english:"when?", type:"phrase", audio:"reading_070.mp3" },
      { id:"rw_29", hebrew:"מִיץ", plain:"מיץ", transliteration:"миц", translation:"сок", english:"juice", type:"noun", audio:"reading_029.mp3" },
      { id:"rw_30", hebrew:"תַּפּוּז", plain:"תפוז", transliteration:"тапуз", translation:"апельсин", english:"orange", type:"noun", audio:"reading_030.mp3" },
      { id:"rw_31", hebrew:"סֵפֶר", plain:"ספר", transliteration:"сефер", translation:"книга", english:"book", type:"noun", audio:"reading_031.mp3" },
      { id:"rw_35", hebrew:"חָמוּץ", plain:"חמוץ", transliteration:"хамуц", translation:"кислый", english:"sour", type:"adj", audio:"reading_035.mp3" },
      { id:"rw_37", hebrew:"עָצוּב", plain:"עצוב", transliteration:"ацув", translation:"грустный", english:"sad", type:"adj", audio:"reading_037.mp3" },
      { id:"rw_40", hebrew:"רַע", plain:"רע", transliteration:"ра", translation:"плохой", english:"bad", type:"adj", audio:"reading_040.mp3" },
      { id:"rw_41", hebrew:"תַּפּוּחַ", plain:"תפוח", transliteration:"тапуах", translation:"яблоко", english:"apple", type:"noun", audio:"reading_041.mp3" },
      { id:"rp_31", hebrew:"קִיבּוּץ", plain:"קיבוץ", transliteration:"кибуц", translation:"кибуц", english:"kibbutz", type:"phrase", audio:"reading_084.mp3" },
    ],
    review: [],
  },
  { id:"VN1.4", seq:16, title:"Слова: О-звук", unlockLabel:"Огласовки Н4",
    items: [
      { id:"rw_08", hebrew:"לֹא", plain:"לא", transliteration:"ло", translation:"нет / не", english:"no / not", type:"particle", audio:"reading_008.mp3" },
      { id:"rw_14", hebrew:"יוֹנָה", plain:"יונה", transliteration:"йона", translation:"голубь", english:"pigeon / dove", type:"noun", audio:"reading_014.mp3" },
      { id:"rw_46", hebrew:"אוֹהֵב", plain:"אוהב", transliteration:"оhев", translation:"любит (м.р.)", english:"loves (m)", type:"verb", audio:"reading_046.mp3" },
      { id:"rp_01", hebrew:"שָׁלוֹם", plain:"שלום", transliteration:"шалом", translation:"привет / до свидания / мир", english:"hello / goodbye / peace", type:"phrase", audio:"reading_054.mp3" },
      { id:"rp_02", hebrew:"תּוֹדָה", plain:"תודה", transliteration:"тода", translation:"спасибо", english:"thanks", type:"phrase", audio:"reading_055.mp3" },
      { id:"rp_21", hebrew:"בּוֹקֶר", plain:"בוקר", transliteration:"бокер", translation:"утро", english:"morning", type:"phrase", audio:"reading_074.mp3" },
      { id:"rw_19", hebrew:"זֹאת", plain:"זאת", transliteration:"зот", translation:"это (ж.р.)", english:"this (f)", type:"pronoun", audio:"reading_019.mp3" },
      { id:"rw_27", hebrew:"אֱגוֹז", plain:"אגוז", transliteration:"эгоз", translation:"орех", english:"nut", type:"noun", audio:"reading_027.mp3" },
      { id:"rw_28", hebrew:"אוֹרֶז", plain:"אורז", transliteration:"орез", translation:"рис", english:"rice", type:"noun", audio:"reading_028.mp3" },
      { id:"rw_48", hebrew:"אוֹכֵל", plain:"אוכל", transliteration:"охел", translation:"ест (м.р.)", english:"eats (m)", type:"verb", audio:"reading_048.mp3" },
      { id:"rw_49", hebrew:"רוֹאֶה", plain:"רואה", transliteration:"роэ", translation:"видит (м.р.)", english:"sees (m)", type:"verb", audio:"reading_049.mp3" },
      { id:"rw_50", hebrew:"שׁוֹתֶה", plain:"שותה", transliteration:"шотэ", translation:"пьёт (м.р.)", english:"drinks (m)", type:"verb", audio:"reading_050.mp3" },
      { id:"rp_10", hebrew:"תוֹדָה רָבָּה", plain:"תודה רבה", transliteration:"тода раба", translation:"большое спасибо", english:"thank you very much", type:"phrase", audio:"reading_063.mp3" },
      { id:"rp_14", hebrew:"אֵיפֹה", plain:"איפה", transliteration:"эйфо", translation:"где?", english:"where?", type:"phrase", audio:"reading_067.mp3" },
      { id:"rp_35", hebrew:"מַה קוֹרֶה?", plain:"מה קורה?", transliteration:"ма корэ?", translation:"что происходит?", english:"what's happening?", type:"phrase", audio:"reading_088.mp3" },
      { id:"rw_32", hebrew:"טוֹב", plain:"טוב", transliteration:"тов", translation:"хорошо / хороший", english:"good", type:"adj", audio:"reading_032.mp3" },
      { id:"rw_36", hebrew:"מָתוֹק", plain:"מתוק", transliteration:"маток", translation:"сладкий", english:"sweet", type:"adj", audio:"reading_036.mp3" },
      { id:"rw_42", hebrew:"עוֹף", plain:"עוף", transliteration:"оф", translation:"птица / курица", english:"chicken / bird", type:"noun", audio:"reading_042.mp3" },
      { id:"rw_43", hebrew:"עִיתּוֹן", plain:"עיתון", transliteration:"итон", translation:"газета", english:"newspaper", type:"noun", audio:"reading_043.mp3" },
      { id:"rw_51", hebrew:"קוֹרֵא", plain:"קורא", transliteration:"корэ", translation:"читает (м.р.)", english:"reads (m)", type:"verb", audio:"reading_051.mp3" },
      { id:"rw_52", hebrew:"רוֹצֶה", plain:"רוצה", transliteration:"роцэ", translation:"хочет (м.р.)", english:"wants (m)", type:"verb", audio:"reading_052.mp3" },
      { id:"rp_13", hebrew:"מַזָּל טוֹב", plain:"מזל טוב", transliteration:"мазаль тов", translation:"поздравляю!", english:"congratulations", type:"phrase", audio:"reading_066.mp3" },
      { id:"rp_29", hebrew:"עוֹלֶה חָדָשׁ", plain:"עולה חדש", transliteration:"оле хадаш", translation:"новый репатриант", english:"new immigrant", type:"phrase", audio:"reading_082.mp3" },
      { id:"rp_38", hebrew:"הַיָּם הָאָדוֹם", plain:"הים האדום", transliteration:"hайям hаадом", translation:"Красное море", english:"the Red Sea", type:"phrase", audio:"reading_091.mp3" },
    ],
    review: [],
  },
  { id:"VN1.5", seq:20, title:"Слова: шва", unlockLabel:"Огласовки Н5",
    items: [
      { id:"rp_23", hebrew:"לַיְלָה", plain:"לילה", transliteration:"лайла", translation:"ночь", english:"night", type:"phrase", audio:"reading_076.mp3" },
      { id:"rp_24", hebrew:"אֲנַחְנוּ", plain:"אנחנו", transliteration:"анахну", translation:"мы", english:"we", type:"phrase", audio:"reading_077.mp3" },
      { id:"rw_17", hebrew:"יַלְדָה", plain:"ילדה", transliteration:"ялда", translation:"девочка", english:"girl", type:"noun", audio:"reading_017.mp3" },
      { id:"rw_22", hebrew:"דֶּרֶךְ", plain:"דרך", transliteration:"дерех", translation:"дорога / путь", english:"way / road", type:"noun", audio:"reading_022.mp3" },
      { id:"rw_47", hebrew:"הוֹלֵךְ", plain:"הולך", transliteration:"hолех", translation:"идёт (м.р.)", english:"walks (m)", type:"verb", audio:"reading_047.mp3" },
      { id:"rp_03", hebrew:"בְּבַקָשָׁה", plain:"בבקשה", transliteration:"бевакаша", translation:"пожалуйста / не за что", english:"please / you're welcome", type:"phrase", audio:"reading_056.mp3" },
      { id:"rp_04", hebrew:"סְלִיחָה", plain:"סליחה", transliteration:"слиха", translation:"извините / прости", english:"sorry / excuse me", type:"phrase", audio:"reading_057.mp3" },
      { id:"rp_05", hebrew:"בְּסֵדֶר", plain:"בסדר", transliteration:"бесэдер", translation:"всё в порядке / окей", english:"alright / fine", type:"phrase", audio:"reading_058.mp3" },
      { id:"rp_06", hebrew:"מַה שְׁלוֹמְךָ?", plain:"מה שלומך?", transliteration:"ма шломха?", translation:"как дела? (м.р.)", english:"how are you? (m)", type:"phrase", audio:"reading_059.mp3" },
      { id:"rp_08", hebrew:"בָּרוּךְ הַבָּא", plain:"ברוך הבא", transliteration:"барух hаба", translation:"добро пожаловать", english:"welcome", type:"phrase", audio:"reading_061.mp3" },
      { id:"rp_09", hebrew:"מַה נִשְׁמַע?", plain:"מה נשמע?", transliteration:"ма нишма?", translation:"что слышно? / как дела?", english:"what's up?", type:"phrase", audio:"reading_062.mp3" },
      { id:"rp_27", hebrew:"עִבְרִית", plain:"עברית", transliteration:"иврит", translation:"иврит", english:"Hebrew", type:"phrase", audio:"reading_080.mp3" },
      { id:"rp_36", hebrew:"לְהִתְרָאוֹת", plain:"להתראות", transliteration:"леhитраот", translation:"до свидания", english:"see you later", type:"phrase", audio:"reading_089.mp3" },
      { id:"rw_44", hebrew:"אֲפַרְסֵק", plain:"אפרסק", transliteration:"афарсек", translation:"персик", english:"peach", type:"noun", audio:"reading_044.mp3" },
      { id:"rp_12", hebrew:"בְּהַצְלָחָה", plain:"בהצלחה", transliteration:"бехацлаха", translation:"удачи!", english:"good luck", type:"phrase", audio:"reading_065.mp3" },
      { id:"rp_28", hebrew:"אוּלְפָּן", plain:"אולפן", transliteration:"ульпан", translation:"ульпан", english:"ulpan", type:"phrase", audio:"reading_081.mp3" },
      { id:"rp_37", hebrew:"שַׁקְשׁוּקָה", plain:"שקשוקה", transliteration:"шакшука", translation:"шакшука", english:"shakshuka", type:"phrase", audio:"reading_090.mp3" },
    ],
    review: [],
  },
  // ── C0 — открывается после урока ──
  { id:"R1.20", seq:120, lesson:"C0", title:"Именное предложение",
    items: [
      { id:"r1_c0_01", hebrew:"הוּא", plain:"הוא", transliteration:"hu", translation:"он", type:"word", lesson:"C0", audio:null },
      { id:"r1_c0_03", hebrew:"מוֹרָה", plain:"מורה", transliteration:"moráh", translation:"учительница", type:"word", lesson:"C0", audio:null },
      { id:"r1_c0_04", hebrew:"גָּדוֹל", plain:"גדול", transliteration:"gadól", translation:"большой", type:"word", lesson:"C0", audio:null },
      { id:"r1_c0_05", hebrew:"הַכֶּלֶב גָּדוֹל", plain:"הכלב גדול", transliteration:"ha-kélev gadól", translation:"собака большая (Рекс большой)", type:"phrase", lesson:"C0", audio:null },
      { id:"r1_c0_06", hebrew:"הִיא מוֹרָה", plain:"היא מורה", transliteration:"hi moráh", translation:"она учительница (Майя — учительница)", type:"phrase", lesson:"C0", audio:null },
      { id:"r1_c0_08", hebrew:"הוּא יֶלֶד", plain:"הוא ילד", transliteration:"hu yéled", translation:"он мальчик (Ноам — мальчик)", type:"phrase", lesson:"C0", audio:null },
      { id:"r1_c0_09", hebrew:"הַבַּיִת גָּדוֹל", plain:"הבית גדול", transliteration:"ha-báyit gadól", translation:"дом большой (новый дом семьи большой)", type:"phrase", lesson:"C0", audio:null },
    ],
    review: ["rw_07", "rw_16"],
  },
  // ── M1.1 — открывается после урока ──
  { id:"R1.21", seq:121, lesson:"M1.1", title:"Артикль הַ",
    items: [
      { id:"r1_m11_01", hebrew:"בַּיִת", plain:"בית", transliteration:"báyit", translation:"дом", type:"word", lesson:"M1.1", audio:null },
      { id:"r1_m11_02", hebrew:"הַבַּיִת", plain:"הבית", transliteration:"ha-báyit", translation:"тот дом (определённый)", type:"word", lesson:"M1.1", audio:null },
      { id:"r1_m11_03", hebrew:"הַכֶּלֶב", plain:"הכלב", transliteration:"ha-kélev", translation:"та собака (Рекс!)", type:"word", lesson:"M1.1", audio:null },
      { id:"r1_m11_04", hebrew:"חָדָשׁ", plain:"חדש", transliteration:"hadásh", translation:"новый", type:"word", lesson:"M1.1", audio:null },
      { id:"r1_m11_05", hebrew:"קָטָן", plain:"קטן", transliteration:"katán", translation:"маленький", type:"word", lesson:"M1.1", audio:null },
      { id:"r1_m11_06", hebrew:"הַבַּיִת חָדָשׁ", plain:"הבית חדש", transliteration:"ha-báyit hadásh", translation:"дом новый — Майя говорит соседям про новый дом семьи", type:"phrase", lesson:"M1.1", audio:null },
      { id:"r1_m11_07", hebrew:"הַיֶּלֶד קָטָן", plain:"הילד קטן", transliteration:"ha-yéled katán", translation:"мальчик маленький — Ноам ещё маленький", type:"phrase", lesson:"M1.1", audio:null },
    ],
    review: ["rw_23", "rw_16", "r1_c0_04"],
  },
  // ── C1 — открывается после урока ──
  { id:"R1.22", seq:122, lesson:"C1", title:"יֵשׁ / אֵין — есть/нет",
    items: [
      { id:"r1_c1_01", hebrew:"יֵשׁ", plain:"יש", transliteration:"yesh", translation:"есть (что-то имеется)", type:"word", lesson:"C1", audio:null },
      { id:"r1_c1_02", hebrew:"אֵין", plain:"אין", transliteration:"ein", translation:"нет (чего-то нет)", type:"word", lesson:"C1", audio:null },
      { id:"r1_c1_03", hebrew:"יֵשׁ לִי", plain:"יש לי", transliteration:"yesh li", translation:"у меня есть", type:"phrase", lesson:"C1", audio:null },
      { id:"r1_c1_04", hebrew:"אֵין לִי", plain:"אין לי", transliteration:"ein li", translation:"у меня нет", type:"phrase", lesson:"C1", audio:null },
      { id:"r1_c1_05", hebrew:"יֵשׁ לְךָ כֶּלֶב?", plain:"יש לך כלב?", transliteration:"yesh le-kha kelev?", translation:"У тебя есть собака? — Ноам спрашивает соседа Шимона", type:"phrase", lesson:"C1", audio:null },
      { id:"r1_c1_06", hebrew:"יֵשׁ לִי כֶּלֶב.", plain:"יש לי כלב.", transliteration:"yesh li kelev.", translation:"У меня есть собака. — Шимон улыбается: у него тоже есть пёс", type:"phrase", lesson:"C1", audio:null },
      { id:"r1_c1_07", hebrew:"אֵין לִי כֶּלֶב, יֵשׁ לִי בַּיִת.", plain:"אין לי כלב, יש לי בית.", transliteration:"ein li kelev, yesh li bayit.", translation:"У меня нет собаки, у меня есть дом. — Малка смеётся: дом есть, собаки нет", type:"phrase", lesson:"C1", audio:null },
    ],
    review: [],
  },
  // ── M1.2 — открывается после урока ──
  { id:"R1.23", seq:123, lesson:"M1.2", title:"Артикль перед гортанными",
    items: [
      { id:"r1_m12_01", hebrew:"הָאֵם", plain:"האם", transliteration:"ха-эм", translation:"мама (с артиклем). Майя — הָאֵם. Перед א гласная артикля — а долгое.", type:"word", lesson:"M1.2", audio:null },
      { id:"r1_m12_02", hebrew:"הָאִישׁ", plain:"האיש", transliteration:"ха-иш", translation:"мужчина, муж (с артиклем). Даниэль — הָאִישׁ. Перед א артикль הָ.", type:"word", lesson:"M1.2", audio:null },
      { id:"r1_m12_03", hebrew:"הֶחָלָב", plain:"החלב", transliteration:"хе-халав", translation:"молоко (с артиклем). Майя ставит הֶחָלָב на стол. Перед ח артикль הֶ.", type:"word", lesson:"M1.2", audio:null },
      { id:"r1_m12_04", hebrew:"הָעִיר", plain:"העיר", transliteration:"ха-ир", translation:"город (с артиклем). Тель-Авив — הָעִיר. Перед עִ артикль звучит הָ — особый случай.", type:"word", lesson:"M1.2", audio:null, draft:true },
      { id:"r1_m12_05", hebrew:"הָאֵם בַּבַּיִת", plain:"האם בבית", transliteration:"ха-эм ба-байт", translation:"Мама дома. Майя — הָאֵם — дома с детьми.", type:"phrase", lesson:"M1.2", audio:null },
      { id:"r1_m12_06", hebrew:"הֶחָלָב עַל הַשֻּׁלְחָן", plain:"החלב על השלחן", transliteration:"хе-халав аль ха-шшулхан", translation:"Молоко на столе. Майя поставила הֶחָלָב на הַשֻּׁלְחָן.", type:"phrase", lesson:"M1.2", audio:null },
      { id:"r1_m12_07", hebrew:"הָאִישׁ בָּרְחוֹב", plain:"האיש ברחוב", transliteration:"ха-иш ба-рехов", translation:"Мужчина на улице. Даниэль — הָאִישׁ — вышел на הָרְחוֹב.", type:"phrase", lesson:"M1.2", audio:null },
    ],
    review: [],
  },
  // ── M1.3 — открывается после урока ──
  { id:"R1.24", seq:124, lesson:"M1.3", title:"Женский род",
    items: [
      { id:"r1_m13_03", hebrew:"שַׁבָּת", plain:"שבת", transliteration:"sha-bát", translation:"суббота — вся семья дома בְּשַׁבָּת", type:"word", lesson:"M1.3", audio:null },
      { id:"r1_m13_05", hebrew:"אֱמֶת", plain:"אמת", transliteration:"e-met", translation:"правда, истина — оканчивается на ת, женский род. Даниэль говорит: «זֹאת אֱמֶת» — это правда", type:"word", lesson:"M1.3", audio:null },
      { id:"r1_m13_07", hebrew:"זֹאת הַיַּלְדָּה שֶׁלִּי", plain:"זאת הילדה שלי", transliteration:"zot ha-yal-dá she-lí", translation:"это моя девочка — Даниэль говорит соседу Шимону про Тамар", type:"phrase", lesson:"M1.3", audio:null },
    ],
    review: ["rw_17", "r1_c0_03", "rw_12", "rw_22"],
  },
  // ── M1.4 — открывается после урока ──
  { id:"R1.25", seq:125, lesson:"M1.4", title:"Артикль + род — синтез",
    items: [
      { id:"r1_m14_02", hebrew:"גְּדוֹלָה", plain:"גדולה", transliteration:"gdolá", translation:"большая (ж.р.) — форма от גָּדוֹל для существительных женского рода", type:"word", lesson:"M1.4", audio:null },
      { id:"r1_m14_03", hebrew:"הַיֶּלֶד הַגָּדוֹל", plain:"הילד הגדול", transliteration:"ha-yéled ha-gadól", translation:"тот большой мальчик — Малка говорит о Ноаме: «הַיֶּלֶד הַגָּדוֹל бежит!»", type:"phrase", lesson:"M1.4", audio:null },
      { id:"r1_m14_04", hebrew:"הַיַּלְדָּה הַגְּדוֹלָה", plain:"הילדה הגדולה", transliteration:"ha-yaldá ha-gdolá", translation:"та большая девочка — Шимон говорит о Тамар: «הַיַּלְדָּה הַגְּדוֹלָה — Тамар»", type:"phrase", lesson:"M1.4", audio:null },
      { id:"r1_m14_05", hebrew:"הַכֶּלֶב הַגָּדוֹל", plain:"הכלב הגדול", transliteration:"ha-kélev ha-gadól", translation:"та большая собака — Даниэль смеётся: «זֶה רֶקְס — הַכֶּלֶב הַגָּדוֹל!»", type:"phrase", lesson:"M1.4", audio:null },
      { id:"r1_m14_06", hebrew:"הַבַּיִת הֶחָדָשׁ", plain:"הבית החדש", transliteration:"ha-báyit he-hadásh", translation:"тот новый дом — Майя говорит соседям: «הַבַּיִת הֶחָדָשׁ שֶׁלָּנוּ»", type:"phrase", lesson:"M1.4", audio:null },
    ],
    review: ["r1_c0_04", "r1_m13_07"],
  },
  // ── CH1.1 — открывается после урока ──
  { id:"R1.26", seq:126, lesson:"CH1.1", title:"Числа 1–5 (м.р.)",
    items: [
      { id:"r1_ch11_01", hebrew:"אֶחָד", plain:"אחד", transliteration:"эхад", translation:"один (м.р.)", type:"word", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_02", hebrew:"שְׁנַיִם", plain:"שנים", transliteration:"шнаим", translation:"два (м.р.)", type:"word", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_03", hebrew:"שְׁלֹשָׁה", plain:"שלשה", transliteration:"шлоша", translation:"три (м.р.)", type:"word", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_04", hebrew:"אַרְבָּעָה", plain:"ארבעה", transliteration:"арбаа", translation:"четыре (м.р.)", type:"word", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_05", hebrew:"חֲמִשָּׁה", plain:"חמשה", transliteration:"хамиша", translation:"пять (м.р.)", type:"word", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_06", hebrew:"יֶלֶד אֶחָד", plain:"ילד אחד", transliteration:"йэлед эхад", translation:"один мальчик — «один» стоит после слова. Ноам — йэлед эхад", type:"phrase", lesson:"CH1.1", audio:null },
      { id:"r1_ch11_07", hebrew:"כֶּלֶב אֶחָד", plain:"כלב אחד", transliteration:"кэлев эхад", translation:"одна собака — Рекс! (кэлев — м.р.)", type:"phrase", lesson:"CH1.1", audio:null },
    ],
    review: ["rw_16", "rw_23"],
  },
  // ── CH1.2 — открывается после урока ──
  { id:"R1.27", seq:127, lesson:"CH1.2", title:"Числа 1–5 (ж.р.)",
    items: [
      { id:"r1_ch12_01", hebrew:"אַחַת", plain:"אחת", transliteration:"ахат", translation:"одна (ж.р.)", type:"word", lesson:"CH1.2", audio:null },
      { id:"r1_ch12_02", hebrew:"שְׁתַּיִם", plain:"שתים", transliteration:"штаим", translation:"две (ж.р.)", type:"word", lesson:"CH1.2", audio:null },
      { id:"r1_ch12_03", hebrew:"שָׁלֹשׁ", plain:"שלש", transliteration:"шалош", translation:"три (ж.р.)", type:"word", lesson:"CH1.2", audio:null },
      { id:"r1_ch12_04", hebrew:"אַרְבַּע", plain:"ארבע", transliteration:"арба", translation:"четыре (ж.р.)", type:"word", lesson:"CH1.2", audio:null },
      { id:"r1_ch12_05", hebrew:"חָמֵשׁ", plain:"חמש", transliteration:"хамеш", translation:"пять (ж.р.)", type:"word", lesson:"CH1.2", audio:null },
      { id:"r1_ch12_06", hebrew:"יַלְדָּה אַחַת", plain:"ילדה אחת", transliteration:"ялда ахат", translation:"одна девочка — Тамар! (ялда — ж.р.)", type:"phrase", lesson:"CH1.2", audio:null },
    ],
    review: ["r1_ch11_01", "r1_ch11_03", "rw_17"],
  },
  // ── CH1.3 — открывается после урока ──
  { id:"R1.28", seq:128, lesson:"CH1.3", title:"Числа 6–10 (м.р.)",
    items: [
      { id:"r1_ch13_01", hebrew:"שִׁשָּׁה", plain:"ששה", transliteration:"шиша", translation:"шесть (м.р.)", type:"word", lesson:"CH1.3", audio:null },
      { id:"r1_ch13_02", hebrew:"שִׁבְעָה", plain:"שבעה", transliteration:"шивъа", translation:"семь (м.р.)", type:"word", lesson:"CH1.3", audio:null },
      { id:"r1_ch13_03", hebrew:"שְׁמֹנָה", plain:"שמנה", transliteration:"шмона", translation:"восемь (м.р.)", type:"word", lesson:"CH1.3", audio:null },
      { id:"r1_ch13_04", hebrew:"תִּשְׁעָה", plain:"תשעה", transliteration:"тишъа", translation:"девять (м.р.)", type:"word", lesson:"CH1.3", audio:null },
      { id:"r1_ch13_05", hebrew:"עֲשָׂרָה", plain:"עשרה", transliteration:"асара", translation:"десять (м.р.)", type:"word", lesson:"CH1.3", audio:null },
    ],
    review: ["r1_ch11_05", "r1_ch12_01"],
  },
];

// ─── Совместимость: плоские экспорты ─────────────────────────────────────────
export const READING_ITEMS   = READING_BLOCKS.flatMap(b => b.items);
export const READING_WORDS   = READING_ITEMS.filter(w => w.type !== 'phrase');
export const READING_PHRASES = READING_ITEMS.filter(w => w.type === 'phrase');

/** Карточки блока с повторением: собственные items + review-карточки по ссылкам */
const ITEMS_BY_ID = Object.fromEntries(READING_ITEMS.map(i => [i.id, i]));
export function getBlockCards(block) {
  const review = (block.review || []).map(id => ITEMS_BY_ID[id]).filter(Boolean)
    .map(i => ({ ...i, isReview: true }));
  return [...block.items, ...review];
}
