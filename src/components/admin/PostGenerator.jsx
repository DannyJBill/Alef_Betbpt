/**
 * PostGenerator — вкладка «🎨 Промо» в админке.
 *
 * Генератор картинок для постов/сторис в Telegram: текст + фон
 * (цвет/градиент/картинка) + иконка/маскот, с перетаскиванием элементов
 * мышью/пальцем прямо по превью и экспортом в PNG. Полностью на canvas,
 * без сторонних зависимостей.
 *
 * Это React-версия отдельного инструмента `promo/tg-post-generator/`
 * (тот остаётся как самостоятельный офлайн-HTML для тех, у кого нет
 * доступа к админке).
 */
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const FORMATS = [
  { key: "post11", label: "1:1", w: 1080, h: 1080 },
  { key: "post45", label: "4:5", w: 1080, h: 1350 },
  { key: "story", label: "9:16", w: 1080, h: 1920 },
  { key: "wide", label: "Wide", w: 1200, h: 630 },
];

const GRAD_PRESETS = [
  ["#6366f1", "#9333ea"], // indigo -> purple
  ["#10b981", "#0d9488"], // emerald -> teal
  ["#f97316", "#ef4444"], // orange -> red
  ["#8b5cf6", "#6d28d9"], // violet
  ["#0ea5e9", "#0369a1"], // sky -> blue
  ["#f59e0b", "#d97706"], // amber
];

const BUNDLED_ICONS = [
  { key: "/mascot/mskt-1-hi.png", label: "Привет" },
  { key: "/mascot/mskt-2-heyy.png", label: "Хей" },
  { key: "/mascot/mskt-7-star.png", label: "Звезда" },
];

const hebrewLikely = (str) => /[֐-׿]/.test(str);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

export default function PostGenerator() {
  const { dark } = useTheme();
  const card = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const txt = dark ? "text-white" : "text-gray-900";
  const soft = dark ? "text-gray-400" : "text-gray-500";

  const canvasRef = useRef(null);
  const textRectRef = useRef(null);
  const iconRectRef = useRef(null);
  const dragRef = useRef(null); // 'icon' | 'text' | null
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [format, setFormat] = useState(FORMATS[0]);
  const [bgType, setBgType] = useState("gradient");
  const [bgSolid, setBgSolid] = useState("#4338ca");
  const [grad1, setGrad1] = useState("#6366f1");
  const [grad2, setGrad2] = useState("#9333ea");
  const [gradAngle, setGradAngle] = useState(135);
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const [bgImg, setBgImg] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);

  const [eyebrow, setEyebrow] = useState({ text: "", color: "#fde047", align: "center" });
  const [title, setTitle] = useState({ text: "Учи иврит легко 🇮🇱", color: "#ffffff", align: "center", size: 72, weight: "800", dir: "auto" });
  const [body, setBody] = useState({ text: "Новые слова, карточки и произношение — всё в одном приложении.", color: "#e5e7eb", align: "center", size: 32 });
  const [footer, setFooter] = useState({ text: "", color: "#ffffffaa" });

  const [iconSrc, setIconSrc] = useState(null);
  const [iconImg, setIconImg] = useState(null);
  const [iconSize, setIconSize] = useState(180);

  const [textAnchor, setTextAnchor] = useState({ x: 0.5, y: 0.5 });
  const [iconAnchor, setIconAnchor] = useState({ x: 0.5, y: 0.86 });

  // ── загрузка картинок ──
  useEffect(() => {
    if (!bgImageUrl) { setBgImg(null); return; }
    let alive = true;
    loadImage(bgImageUrl).then((img) => { if (alive) setBgImg(img); });
    return () => { alive = false; };
  }, [bgImageUrl]);

  useEffect(() => {
    if (!iconSrc) { setIconImg(null); return; }
    let alive = true;
    loadImage(iconSrc).then((img) => { if (alive) setIconImg(img); });
    return () => { alive = false; };
  }, [iconSrc]);

  // ── отрисовка ──
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    cv.width = format.w;
    cv.height = format.h;

    // фон
    if (bgType === "solid") {
      ctx.fillStyle = bgSolid;
      ctx.fillRect(0, 0, format.w, format.h);
    } else if (bgType === "gradient") {
      const rad = (gradAngle * Math.PI) / 180;
      const x1 = format.w / 2 - (Math.cos(rad) * format.w) / 2;
      const y1 = format.h / 2 - (Math.sin(rad) * format.h) / 2;
      const x2 = format.w / 2 + (Math.cos(rad) * format.w) / 2;
      const y2 = format.h / 2 + (Math.sin(rad) * format.h) / 2;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, grad1);
      g.addColorStop(1, grad2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, format.w, format.h);
    } else if (bgType === "image" && bgImg) {
      drawCover(ctx, bgImg, 0, 0, format.w, format.h);
      ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`;
      ctx.fillRect(0, 0, format.w, format.h);
    } else {
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(0, 0, format.w, format.h);
    }

    textRectRef.current = drawTextBlock(ctx, format, textAnchor, eyebrow, title, body);
    iconRectRef.current = drawIcon(ctx, format, iconAnchor, iconImg, iconSize);
    drawFooter(ctx, format, footer);
  }, [format, bgType, bgSolid, grad1, grad2, gradAngle, bgImg, overlayOpacity,
      eyebrow, title, body, footer, iconImg, iconSize, textAnchor, iconAnchor]);

  // ── drag ──
  function canvasPoint(e) {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width, scaleY = cv.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  function inRect(p, r, pad = 12) {
    return r && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  }
  function onPointerDown(e) {
    const p = canvasPoint(e);
    if (inRect(p, iconRectRef.current)) {
      dragRef.current = "icon";
      dragOffsetRef.current = { x: p.x - iconAnchor.x * format.w, y: p.y - iconAnchor.y * format.h };
    } else if (inRect(p, textRectRef.current)) {
      dragRef.current = "text";
      dragOffsetRef.current = { x: p.x - textAnchor.x * format.w, y: p.y - textAnchor.y * format.h };
    } else {
      dragRef.current = null;
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const p = canvasPoint(e);
    const nx = (p.x - dragOffsetRef.current.x) / format.w;
    const ny = (p.y - dragOffsetRef.current.y) / format.h;
    const clamped = { x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) };
    if (dragRef.current === "icon") setIconAnchor(clamped);
    else setTextAnchor(clamped);
  }
  function onPointerUp() { dragRef.current = null; }

  function resetPositions() {
    setTextAnchor({ x: 0.5, y: 0.5 });
    setIconAnchor({ x: 0.5, y: 0.86 });
  }

  function exportPng() {
    const cv = canvasRef.current;
    const link = document.createElement("a");
    link.download = `tg-post-${format.w}x${format.h}.png`;
    link.href = cv.toDataURL("image/png");
    link.click();
  }

  async function onBgFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBgImageUrl(await fileToDataUrl(file));
  }
  async function onIconFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setIconSrc(await fileToDataUrl(file));
  }

  const inputCls = `w-full rounded-lg border p-2 text-sm ${card} ${txt}`;
  const labelCls = `text-[11px] font-semibold ${soft} mt-2 mb-1 block`;
  const segBtn = (active) =>
    `px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${active ? "bg-indigo-500 text-white" : `border ${card} ${soft}`}`;

  return (
    <div>
      {/* превью */}
      <div className={`sticky top-0 z-10 -mx-4 px-4 pb-2 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="rounded-xl overflow-hidden shadow-lg mx-auto" style={{ maxWidth: 320 }}>
          <canvas
            ref={canvasRef}
            className="w-full block touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <p className={`text-center text-[11px] mt-1 ${soft}`}>перетащи текст или иконку по картинке</p>
      </div>

      {/* формат */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ФОРМАТ</p>
        <div className="flex gap-1.5 flex-wrap">
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFormat(f)} className={segBtn(format.key === f.key)}>
              {f.label} · {f.w}×{f.h}
            </button>
          ))}
        </div>
      </div>

      {/* фон */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ФОН</p>
        <div className="flex gap-1.5 mb-2">
          {[["gradient", "Градиент"], ["solid", "Цвет"], ["image", "Картинка"]].map(([k, l]) => (
            <button key={k} onClick={() => setBgType(k)} className={segBtn(bgType === k)}>{l}</button>
          ))}
        </div>

        {bgType === "solid" && (
          <input type="color" value={bgSolid} onChange={(e) => setBgSolid(e.target.value)} className="h-8 w-12 rounded" />
        )}

        {bgType === "gradient" && (
          <>
            <div className="flex gap-2 items-center mb-2">
              <input type="color" value={grad1} onChange={(e) => setGrad1(e.target.value)} className="h-8 w-10 rounded" />
              <input type="color" value={grad2} onChange={(e) => setGrad2(e.target.value)} className="h-8 w-10 rounded" />
              <select value={gradAngle} onChange={(e) => setGradAngle(+e.target.value)} className={`flex-1 ${inputCls}`}>
                <option value={135}>↘ диагональ</option>
                <option value={90}>↓ вертикально</option>
                <option value={0}>→ горизонтально</option>
                <option value={45}>↗ диагональ</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              {GRAD_PRESETS.map(([c1, c2], i) => (
                <button key={i} onClick={() => { setGrad1(c1); setGrad2(c2); }}
                  className="w-7 h-7 rounded-full border-2 border-white shadow"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
              ))}
            </div>
          </>
        )}

        {bgType === "image" && (
          <>
            <input type="file" accept="image/*" onChange={onBgFile} className="text-xs" />
            <p className={labelCls}>Затемнение ({Math.round(overlayOpacity * 100)}%)</p>
            <input type="range" min={0} max={0.85} step={0.01} value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(+e.target.value)} className="w-full accent-indigo-500" />
          </>
        )}
      </div>

      {/* метка */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>МЕТКА (EYEBROW)</p>
        <input type="text" value={eyebrow.text} placeholder="Например: Обновление v1.3"
          onChange={(e) => setEyebrow({ ...eyebrow, text: e.target.value })} className={inputCls} />
        <div className="flex gap-2 mt-2 items-center">
          <input type="color" value={eyebrow.color} onChange={(e) => setEyebrow({ ...eyebrow, color: e.target.value })} className="h-8 w-10 rounded" />
          <select value={eyebrow.align} onChange={(e) => setEyebrow({ ...eyebrow, align: e.target.value })} className={`flex-1 ${inputCls}`}>
            <option value="center">По центру</option>
            <option value="left">Слева</option>
            <option value="right">Справа</option>
          </select>
        </div>
      </div>

      {/* заголовок */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ЗАГОЛОВОК</p>
        <textarea value={title.text} rows={2} onChange={(e) => setTitle({ ...title, text: e.target.value })} className={inputCls} />
        <div className="flex gap-2 mt-2 items-center">
          <input type="color" value={title.color} onChange={(e) => setTitle({ ...title, color: e.target.value })} className="h-8 w-10 rounded" />
          <select value={title.align} onChange={(e) => setTitle({ ...title, align: e.target.value })} className={`flex-1 ${inputCls}`}>
            <option value="center">По центру</option>
            <option value="left">Слева</option>
            <option value="right">Справа</option>
          </select>
        </div>
        <p className={labelCls}>Размер ({title.size}px)</p>
        <input type="range" min={28} max={120} value={title.size}
          onChange={(e) => setTitle({ ...title, size: +e.target.value })} className="w-full accent-indigo-500" />
        <div className="flex gap-2 mt-2">
          <select value={title.weight} onChange={(e) => setTitle({ ...title, weight: e.target.value })} className={`flex-1 ${inputCls}`}>
            <option value="800">Жирный</option>
            <option value="400">Обычный</option>
          </select>
          <select value={title.dir} onChange={(e) => setTitle({ ...title, dir: e.target.value })} className={`flex-1 ${inputCls}`}>
            <option value="auto">Авто-направление</option>
            <option value="rtl">RTL (иврит)</option>
            <option value="ltr">LTR</option>
          </select>
        </div>
      </div>

      {/* описание */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ТЕКСТ / ОПИСАНИЕ</p>
        <textarea value={body.text} rows={3} onChange={(e) => setBody({ ...body, text: e.target.value })} className={inputCls} />
        <div className="flex gap-2 mt-2 items-center">
          <input type="color" value={body.color} onChange={(e) => setBody({ ...body, color: e.target.value })} className="h-8 w-10 rounded" />
          <select value={body.align} onChange={(e) => setBody({ ...body, align: e.target.value })} className={`flex-1 ${inputCls}`}>
            <option value="center">По центру</option>
            <option value="left">Слева</option>
            <option value="right">Справа</option>
          </select>
        </div>
        <p className={labelCls}>Размер ({body.size}px)</p>
        <input type="range" min={16} max={56} value={body.size}
          onChange={(e) => setBody({ ...body, size: +e.target.value })} className="w-full accent-indigo-500" />
      </div>

      {/* иконка */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ИКОНКА / МАСКОТ</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setIconSrc(null)}
            className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-[10px] ${soft} ${!iconSrc ? "border-indigo-500" : card}`}>
            нет
          </button>
          {BUNDLED_ICONS.map((ic) => (
            <button key={ic.key} onClick={() => setIconSrc(ic.key)} title={ic.label}
              className={`w-11 h-11 rounded-lg border-2 bg-center bg-no-repeat ${iconSrc === ic.key ? "border-indigo-500" : "border-transparent"} ${card}`}
              style={{ backgroundImage: `url(${ic.key})`, backgroundSize: "70%" }} />
          ))}
        </div>
        <input type="file" accept="image/*" onChange={onIconFile} className="text-xs mt-2" />
        <p className={labelCls}>Размер ({iconSize}px)</p>
        <input type="range" min={60} max={500} value={iconSize}
          onChange={(e) => setIconSize(+e.target.value)} className="w-full accent-indigo-500" />
      </div>

      {/* футер */}
      <div className={`rounded-xl border p-3 mt-3 ${card}`}>
        <p className={labelCls} style={{ marginTop: 0 }}>ПОДПИСЬ (ФУТЕР)</p>
        <input type="text" value={footer.text} placeholder="@yourchannel · hebrew-app.example"
          onChange={(e) => setFooter({ ...footer, text: e.target.value })} className={inputCls} />
        <input type="color" value={footer.color.slice(0, 7)}
          onChange={(e) => setFooter({ ...footer, color: e.target.value })} className="h-8 w-10 rounded mt-2" />
      </div>

      <button onClick={resetPositions} className={`w-full text-center text-xs underline mt-3 ${soft}`}>
        ↺ Сбросить позиции текста и иконки
      </button>

      <button onClick={exportPng}
        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 mt-2 mb-4">
        ⬇ Скачать PNG
      </button>
    </div>
  );
}

// ── canvas helpers ──

function drawCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.width / img.height, dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function wrapLines(ctx, text, font, maxWidth) {
  ctx.font = font;
  const paragraphs = text.split("\n");
  const lines = [];
  paragraphs.forEach((p) => {
    if (p.trim() === "") { lines.push(""); return; }
    const words = p.split(" ");
    let cur = "";
    words.forEach((w) => {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    });
    if (cur) lines.push(cur);
  });
  return lines;
}

function drawTextBlock(ctx, format, anchor, eyebrow, title, body) {
  const maxWidth = format.w * 0.82;
  const cx = anchor.x * format.w;
  const cy = anchor.y * format.h;

  const blocks = [];
  if (eyebrow.text.trim()) {
    const font = `700 ${Math.round(title.size * 0.32)}px Segoe UI, Arial, sans-serif`;
    blocks.push({ font, color: eyebrow.color, align: eyebrow.align,
      lines: wrapLines(ctx, eyebrow.text, font, maxWidth), lineH: Math.round(title.size * 0.32 * 1.3), gapAfter: 18 });
  }
  if (title.text.trim()) {
    const font = `${title.weight} ${title.size}px Segoe UI, Arial, sans-serif`;
    blocks.push({ font, color: title.color, align: title.align, dir: title.dir,
      lines: wrapLines(ctx, title.text, font, maxWidth), lineH: Math.round(title.size * 1.18), gapAfter: 16 });
  }
  if (body.text.trim()) {
    const font = `400 ${body.size}px Segoe UI, Arial, sans-serif`;
    blocks.push({ font, color: body.color, align: body.align,
      lines: wrapLines(ctx, body.text, font, maxWidth), lineH: Math.round(body.size * 1.4), gapAfter: 0 });
  }

  let totalH = 0;
  blocks.forEach((b) => { totalH += b.lines.length * b.lineH + b.gapAfter; });

  let y = cy - totalH / 2;
  const startY = y;
  let minX = Infinity, maxX = -Infinity;

  blocks.forEach((b) => {
    ctx.font = b.font;
    ctx.fillStyle = b.color;
    ctx.textBaseline = "top";
    const dir = b.dir === "rtl" || (b.dir === "auto" && hebrewLikely(b.lines.join(""))) ? "rtl" : "ltr";
    ctx.direction = dir;
    b.lines.forEach((line) => {
      ctx.textAlign = b.align;
      ctx.fillText(line, cx, y);
      const width = ctx.measureText(line).width;
      let lx;
      if (b.align === "center") lx = cx - width / 2;
      else if (b.align === "right") lx = cx - width;
      else lx = cx;
      minX = Math.min(minX, lx);
      maxX = Math.max(maxX, lx + width);
      y += b.lineH;
    });
    y += b.gapAfter;
  });
  ctx.direction = "inherit";

  return { x: minX, y: startY, w: maxX - minX, h: y - startY };
}

function drawIcon(ctx, format, anchor, iconImg, size) {
  if (!iconImg) return null;
  const cx = anchor.x * format.w;
  const cy = anchor.y * format.h;
  const ratio = iconImg.width / iconImg.height;
  let dw = size, dh = size / ratio;
  if (dh > size) { dh = size; dw = size * ratio; }
  const x = cx - dw / 2, y = cy - dh / 2;
  ctx.drawImage(iconImg, x, y, dw, dh);
  return { x, y, w: dw, h: dh };
}

function drawFooter(ctx, format, footer) {
  if (!footer.text.trim()) return;
  ctx.font = `600 ${Math.round(format.w * 0.024)}px Segoe UI, Arial, sans-serif`;
  ctx.fillStyle = footer.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.direction = hebrewLikely(footer.text) ? "rtl" : "ltr";
  ctx.fillText(footer.text, format.w / 2, format.h - format.h * 0.035);
  ctx.direction = "inherit";
}
