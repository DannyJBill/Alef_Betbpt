# -*- coding: utf-8 -*-
"""
Озвучка порций через edge-tts (бесплатные нейроголоса Microsoft, есть иврит).

Запуск на Windows (по одной строке):
  pip install edge-tts
  python tools/tts/generate_tts.py

Что делает:
1. Читает tools/tts/manifest.json (id, text с никудом, file).
2. Генерирует mp3 в public/reading/<id>.mp3 (голос he-IL-AvriNeural, мужской;
   поменяй VOICE на he-IL-HilaNeural для женского).
3. После успешной генерации патчит src/data/reading.js:
   audio:null -> audio:"<id>.mp3" ТОЛЬКО для реально созданных файлов.
4. Повторный запуск безопасен: существующие mp3 пропускаются, уже
   пропатченные записи не трогаются.

После запуска: прослушать выборочно, прогнать смоук, закоммитить
public/reading/*.mp3 вместе с reading.js.
"""
import asyncio
import json
import os
import re
import sys

VOICE = "he-IL-AvriNeural"   # мужской; женский: he-IL-HilaNeural
RATE = "-10%"                # чуть медленнее для учебного темпа

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MANIFEST = os.path.join(HERE, "manifest.json")
OUT_DIR = os.path.join(ROOT, "public", "reading")
READING_JS = os.path.join(ROOT, "src", "data", "reading.js")


async def synth(text, path):
    import edge_tts
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(path)


def main():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("Сначала установи: pip install edge-tts")
        sys.exit(1)

    items = json.load(open(MANIFEST, encoding="utf-8"))
    os.makedirs(OUT_DIR, exist_ok=True)

    done, skipped, failed = [], [], []
    for it in items:
        path = os.path.join(OUT_DIR, it["file"])
        if os.path.exists(path) and os.path.getsize(path) > 0:
            skipped.append(it["id"])
            done.append(it)
            continue
        try:
            asyncio.run(synth(it["text"], path))
            print("✓", it["id"], it["text"])
            done.append(it)
        except Exception as e:  # noqa: BLE001
            print("✗", it["id"], e)
            failed.append(it["id"])

    # патч reading.js только для успешных
    src = open(READING_JS, encoding="utf-8").read()
    patched = 0
    for it in done:
        pattern = r'(\{ id:"%s",[^}]*?audio:)null' % re.escape(it["id"])
        new_src, n = re.subn(pattern, r'\g<1>"%s"' % it["file"], src, count=1)
        if n:
            src = new_src
            patched += 1
    open(READING_JS, "w", encoding="utf-8").write(src)

    print(f"\nГотово: {len(done)} файлов ({len(skipped)} уже были), "
          f"патчей в reading.js: {patched}, ошибок: {len(failed)}")
    if failed:
        print("Не сгенерировались:", ", ".join(failed))
    print("Дальше: прослушай выборочно, прогони смоук, закоммить mp3 + reading.js")


if __name__ == "__main__":
    main()
