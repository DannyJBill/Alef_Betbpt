# -*- coding: utf-8 -*-
"""
Озвучка через edge-tts (бесплатные нейроголоса Microsoft, есть иврит).
Два источника записей — одна и та же логика синтеза/идемпотентности:

  1. manifest.json → public/reading/, патчит src/data/reading.js (курс,
     курируется в гите). Режим по умолчанию, как раньше.
  2. `vocab_items` в Supabase (--sync-vocab-items) → public/reading/, пишет
     audio/audio_hash обратно в саму таблицу. Раньше это делал отдельный
     one-off скрипт мимо этого файла (462 слова колод озвучены им один раз
     без связи с manifest.json) — теперь тот же путь для любых новых слов
     в vocab_items (декам, будущему импорту 10к и т.п.).

ГОЛОС ПО РОДУ (v2):
  Каждая запись озвучивается мужским или женским голосом.
  Приоритет выбора рода:
    1. поле "gender" в manifest.json / vocab_items.gender — ручной оверрайд;
    2. иначе — авто-классификация по огласованной форме (classify_gender):
       местоимение (הוא/היא/אתה/את…) → суффикс 2 л. (־ָךְ/־ֵךְ) →
       мужские числа 3–10 → окончание (־ָה/־ֶת/־ית) → дефолт мужской.
  Классификатор — эвристика; «объектные» фразы (subject м.р. + fem-существительное
  в конце) он может спутать. Поэтому есть режим сверки (--annotate, только manifest).

ИДЕМПОТЕНТНОСТЬ (v3): ключ — hash(text + gender + voice + rate), не просто
  id+gender. Раньше правка текста записи без чистки состояния тихо оставляла
  старое (неверное) аудио — ключ по одному только роду не видел изменения
  текста. Теперь любое изменение текста меняет hash → файл перегенерируется
  автоматически. Старое состояние .tts_state.json (значения "m"/"f") при
  первом запуске после апгрейда конвертируется в hash-формат без форсированной
  перегенерации всего архива ("дедушкина оговорка" — см. LEGACY_GENDER_VALUES).

Запуск на Windows (по одной строке):
  pip install edge-tts
  python tools/tts/generate_tts.py --annotate         # 1) записать gender в manifest, СВЕРИТЬ вручную
  python tools/tts/generate_tts.py                     # 2) сгенерировать mp3 нужным голосом (manifest.json)
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python tools/tts/generate_tts.py --sync-vocab-items
                                                         # 3) то же самое для vocab_items (колоды/будущий импорт)
"""
import asyncio
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request

VOICES = {
    "m": "he-IL-AvriNeural",   # мужской
    "f": "he-IL-HilaNeural",   # женский
}
DEFAULT_GENDER = "m"
RATE = "-10%"                  # чуть медленнее для учебного темпа
LEGACY_GENDER_VALUES = {"m", "f"}  # старый формат .tts_state.json (id -> gender)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MANIFEST = os.path.join(HERE, "manifest.json")
STATE = os.path.join(HERE, ".tts_state.json")
OUT_DIR = os.path.join(ROOT, "public", "reading")
READING_JS = os.path.join(ROOT, "src", "data", "reading.js")

# ── Классификатор рода по огласованной форме ──────────────────────────────────
_NIKUD = re.compile(r"[֑-ׇ]")
_NONHEB = re.compile(r"[^א-ת֑-ׇ]")  # не ивр. буква и не никуд
_clean = lambda w: _NONHEB.sub("", w)                   # убрать пунктуацию/?/!
_strip = lambda w: _NIKUD.sub("", _clean(w))            # + убрать никуд

_FEM1 = {"היא", "הן", "אתן"}
_MASC1 = {"הוא", "אתה", "אתם", "הם"}
# Имена семейного нарратива (denikud) — сильный сигнал субъекта в примерах:
_FEM_NAMES = {"מיה", "תמר", "מלכה", "שרה"}
_MASC_NAMES = {"דניאל", "נעם", "שמעון", "רקס"}
# Мужские числительные 3–10 (оканчиваются на ־ָה, но род мужской):
_MASC_NUM = {"שלושה", "שלשה", "ארבעה", "חמישה", "חמשה", "שישה", "ששה",
             "שבעה", "שמונה", "שמנה", "תשעה", "עשרה", "שניים", "שנים", "אחד"}

_FEM_2P = re.compile(r"[ֶָ]ךְ?$")     # ...ָךְ/ֶךְ  (2 л. ж.р.)
_KAMATZ_HE = re.compile(r"ָה$")                 # ...ָה
_TAV_FEM = re.compile(r"(ֶ|ַ|ִי|ו)ת$")  # ...ֶת/ַת/ית/ות


# Суффиксы 2 л. в ЛЮБОМ месте фразы (маркер сильнее окончания последнего слова):
_SUF_FEM = re.compile(r"ָךְ")   # ...ָךְ  (kamatz+kaf+sheva) — «тебе/твой» ж.р.
_SUF_MASC = re.compile(r"ךָ")          # ...ךָ   (kaf+kamatz)        — «тебе/твой» м.р.

def classify_gender(text):
    words = [w for w in text.split() if _clean(w)]
    # 1) местоимение / имя в любом месте
    for w in words:
        b = _strip(w)
        if b in _FEM1 or b in _FEM_NAMES:  return "f"
        if b in _MASC1 or b in _MASC_NAMES: return "m"
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


def audio_hash(text, gender, voice, rate):
    """Ключ идемпотентности: меняется при любой правке текста/рода/голоса/темпа."""
    raw = f"{text}|{gender}|{voice}|{rate}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


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


def run_manifest():
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
        h = audio_hash(it["text"], g, voice, RATE)
        stored = state.get(it["id"])
        # "Дедушкина оговорка": старый формат состояния хранил только род.
        # Если файл уже существует и род не поменялся — считаем актуальным
        # и просто переходим на hash-формат, не тратя квоту TTS впустую.
        grandfathered = stored in LEGACY_GENDER_VALUES and stored == g
        fresh = os.path.exists(path) and os.path.getsize(path) > 0 and (stored == h or grandfathered)
        if fresh:
            state[it["id"]] = h
            skipped.append(it["id"])
            done.append(it)
            continue
        try:
            asyncio.run(synth(it["text"], voice, path))
            state[it["id"]] = h
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


# ── vocab_items (Supabase) ──────────────────────────────────────────────────
def _sb_request(method, path, body=None):
    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not sb_url or not sb_key:
        print("Нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в окружении.")
        sys.exit(1)
    url = sb_url.rstrip("/") + "/rest/v1/" + path
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal" if method == "PATCH" else "return=representation",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print("✗ Supabase HTTP", e.code, e.read().decode("utf-8", "replace"))
        raise


def run_vocab_items():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("Сначала установи: pip install edge-tts")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    rows = _sb_request("GET", "vocab_items?select=id,plain,gender,audio,audio_hash")

    done = skipped = failed = 0
    for row in rows:
        g = row.get("gender") or DEFAULT_GENDER
        if g not in VOICES:
            g = DEFAULT_GENDER
        voice = VOICES[g]
        text = row["plain"]
        h = audio_hash(text, g, voice, RATE)
        filename = f"{row['id']}.mp3"
        path = os.path.join(OUT_DIR, filename)

        # "Дедушкина оговорка", как в run_manifest(): если audio уже стоит,
        # а audio_hash ещё не считался (первый прогон после апгрейда) —
        # не перегенерируем, просто проставляем hash задним числом.
        if row.get("audio_hash") == h:
            skipped += 1
            continue
        if row.get("audio") and not row.get("audio_hash") and os.path.exists(path):
            _sb_request("PATCH", f"vocab_items?id=eq.{row['id']}", {"audio_hash": h})
            skipped += 1
            continue

        try:
            asyncio.run(synth(text, voice, path))
            _sb_request("PATCH", f"vocab_items?id=eq.{row['id']}",
                        {"audio": filename, "audio_hash": h})
            print(f"✓ {row['id']}  [{g}]  {text}")
            done += 1
        except Exception as e:  # noqa: BLE001
            print("✗", row["id"], e)
            failed += 1

    print(f"\nГотово: {done} новых/обновлённых файлов, {skipped} уже актуальны, ошибок: {failed}")


def main():
    if "--annotate" in sys.argv:
        annotate()
        return
    if "--sync-vocab-items" in sys.argv:
        run_vocab_items()
        return
    run_manifest()


if __name__ == "__main__":
    main()
