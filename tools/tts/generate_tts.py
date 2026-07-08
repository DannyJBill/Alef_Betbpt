# -*- coding: utf-8 -*-
"""
Озвучка порций через edge-tts (бесплатные нейроголоса Microsoft, есть иврит).

ГОЛОС ПО РОДУ (v2):
  Каждая запись озвучивается мужским или женским голосом.
  Приоритет выбора рода:
    1. поле "gender" в manifest.json ("m"/"f") — ручной оверрайд;
    2. иначе — авто-классификация по огласованной форме (classify_gender):
       местоимение (הוא/היא/אתה/את…) → суффикс 2 л. (־ָךְ/־ֵךְ) →
       мужские числа 3–10 → окончание (־ָה/־ֶת/־ית) → дефолт мужской.
  Классификатор — эвристика; «объектные» фразы (subject м.р. + fem-существительное
  в конце) он может спутать. Поэтому есть режим сверки (--annotate).

Запуск на Windows (по одной строке):
  pip install edge-tts
  python tools/tts/generate_tts.py --annotate     # 1) записать gender в manifest, СВЕРИТЬ вручную
  python tools/tts/generate_tts.py                 # 2) сгенерировать mp3 нужным голосом

Что делает основной прогон:
1. Читает tools/tts/manifest.json (id, text, file, gender?).
2. Генерирует mp3 в public/reading/<id>.mp3 голосом по роду.
3. Патчит src/data/reading.js: audio:null -> audio:"<id>.mp3" (только для созданных).
4. Идемпотентно: пропускает файлы, уже сгенерированные ТЕМ ЖЕ голосом
   (состояние в tools/tts/.tts_state.json). Если род записи изменился —
   mp3 перегенерируется автоматически.
"""
import asyncio
import json
import os
import re
import sys

VOICES = {
    "m": "he-IL-AvriNeural",   # мужской
    "f": "he-IL-HilaNeural",   # женский
}
DEFAULT_GENDER = "m"
RATE = "-10%"                  # чуть медленнее для учебного темпа

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MANIFEST = os.path.join(HERE, "manifest.json")
STATE = os.path.join(HERE, ".tts_state.json")
OUT_DIR = os.path.join(ROOT, "public", "reading")
READING_JS = os.path.join(ROOT, "src", "data", "reading.js")

# ── Классификатор рода по огласованной форме ──────────────────────────────────
_NIKUD = re.compile(r"[\u0591-\u05C7]")
_NONHEB = re.compile(r"[^\u05D0-\u05EA\u0591-\u05C7]")  # не ивр. буква и не никуд
_clean = lambda w: _NONHEB.sub("", w)                   # убрать пунктуацию/?/!
_strip = lambda w: _NIKUD.sub("", _clean(w))            # + убрать никуд

_FEM1 = {"היא", "הן", "אתן"}
_MASC1 = {"הוא", "אתה", "אתם", "הם"}
# Мужские числительные 3–10 (оканчиваются на ־ָה, но род мужской):
_MASC_NUM = {"שלושה", "שלשה", "ארבעה", "חמישה", "חמשה", "שישה", "ששה",
             "שבעה", "שמונה", "שמנה", "תשעה", "עשרה", "שניים", "שנים", "אחד"}

_FEM_2P = re.compile(r"[\u05B8\u05B6]\u05DA\u05B0?$")     # ...ָךְ/ֶךְ  (2 л. ж.р.)
_KAMATZ_HE = re.compile(r"\u05B8\u05D4$")                 # ...ָה
_TAV_FEM = re.compile(r"(\u05B6|\u05B7|\u05B4\u05D9|\u05D5)\u05EA$")  # ...ֶת/ַת/ית/ות


# Суффиксы 2 л. в ЛЮБОМ месте фразы (маркер сильнее окончания последнего слова):
_SUF_FEM = re.compile(r"\u05B8\u05DA\u05B0")   # ...ָךְ  (kamatz+kaf+sheva) — «тебе/твой» ж.р.
_SUF_MASC = re.compile(r"\u05DA\u05B8")          # ...ךָ   (kaf+kamatz)        — «тебе/твой» м.р.

def classify_gender(text):
    words = [w for w in text.split() if _clean(w)]
    # 1) местоимение в любом месте
    for w in words:
        b = _strip(w)
        if b in _FEM1:  return "f"
        if b in _MASC1: return "m"
    # 2) суффикс 2 л. в любом месте (адресат)
    for w in words:
        if _SUF_FEM.search(w):  return "f"
        if _SUF_MASC.search(w): return "m"
    # 3) окончание последнего значимого слова
    last = _clean(words[-1]) if words else _clean(text)
    if _strip(last) in _MASC_NUM: return "m"
    if _FEM_2P.search(last):      return "f"
    if _KAMATZ_HE.search(last):   return "f"
    if _TAV_FEM.search(last):     return "f"
    return DEFAULT_GENDER


def gender_of(it):
    g = it.get("gender")
    return g if g in VOICES else classify_gender(it["text"])


# ── Режим сверки: записать gender в manifest и показать список ─────────────────
def annotate():
    items = json.load(open(MANIFEST, encoding="utf-8"))
    fem = []
    for it in items:
        if it.get("gender") not in VOICES:      # не трогаем ручные оверрайды
            it["gender"] = classify_gender(it["text"])
        if it["gender"] == "f":
            fem.append(it)
    json.dump(items, open(MANIFEST, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"Аннотировано {len(items)} записей. Женский голос: {len(fem)}.")
    print("Сверь женские (поправь \"gender\":\"m\" где нужно):")
    for it in fem:
        print(f'  {it["gender"]}  {it["text"]:26} {it["id"]}')
    print("\nПосле сверки запусти без --annotate.")


# ── Генерация ─────────────────────────────────────────────────────────────────
async def synth(text, voice, path):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=RATE).save(path)


def main():
    if "--annotate" in sys.argv:
        annotate()
        return

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("Сначала установи: pip install edge-tts")
        sys.exit(1)

    items = json.load(open(MANIFEST, encoding="utf-8"))
    os.makedirs(OUT_DIR, exist_ok=True)
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}

    done, skipped, failed = [], [], []
    for it in items:
        g = gender_of(it)
        voice = VOICES[g]
        path = os.path.join(OUT_DIR, it["file"])
        fresh = os.path.exists(path) and os.path.getsize(path) > 0 and state.get(it["id"]) == g
        if fresh:
            skipped.append(it["id"])
            done.append(it)
            continue
        try:
            asyncio.run(synth(it["text"], voice, path))
            state[it["id"]] = g
            print(f"✓ {it['id']}  [{g}]  {it['text']}")
            done.append(it)
        except Exception as e:  # noqa: BLE001
            print("✗", it["id"], e)
            failed.append(it["id"])

    json.dump(state, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # патч reading.js только для успешных (audio:null -> файл)
    src = open(READING_JS, encoding="utf-8").read()
    patched = 0
    for it in done:
        pattern = r'(id:"%s"[^{}]*?audio:)(?:null|"[^"]*")' % re.escape(it["id"])
        new_src, n = re.subn(pattern, r'\g<1>"%s"' % it["file"], src, count=1)
        if n:
            src = new_src
            patched += 1
    open(READING_JS, "w", encoding="utf-8").write(src)

    print(f"\nГотово: {len(done)} файлов ({len(skipped)} уже были нужным голосом), "
          f"патчей в reading.js: {patched}, ошибок: {len(failed)}")
    if failed:
        print("Не сгенерировались:", ", ".join(failed))
    print("Дальше: прослушай выборочно, прогони смоук, закоммить mp3 + reading.js + manifest.json")


if __name__ == "__main__":
    main()
