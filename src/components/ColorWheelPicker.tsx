import { useState, useEffect, useRef, useCallback } from "react";
import { Pipette, Sparkles, RefreshCw } from "lucide-react";

interface ColorWheelPickerProps {
  color: string;
  onChange: (hex: string) => void;
  folderName?: string;
}

// Helpers for HSV <-> RGB <-> Hex conversion
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) return { h: 200, s: 0.5, v: 0.9 };

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, v };
}

// Fantasy inspiration presets
const QUICK_PALETTE = [
  { name: "Glacial", hex: "#d0e8ee" },
  { name: "Rubí", hex: "#e63946" },
  { name: "Esmeralda", hex: "#2a9d8f" },
  { name: "Oro Arcano", hex: "#e9c46a" },
  { name: "Ámbar", hex: "#f4a261" },
  { name: "Amatista", hex: "#9b5de5" },
  { name: "Océano", hex: "#00b4d8" },
  { name: "Ceniza", hex: "#8d99ae" },
];

export default function ColorWheelPicker({ color, onChange }: ColorWheelPickerProps) {
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => hexToHsv(color || "#d0e8ee"));
  const [hexInput, setHexInput] = useState(color || "#d0e8ee");
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync state if external color changes
  useEffect(() => {
    if (color && color.toLowerCase() !== hexInput.toLowerCase()) {
      const parsed = hexToHsv(color);
      setHsv(parsed);
      setHexInput(color);
    }
  }, [color]);

  // Draw the Color Wheel on the Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 3;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const currentV = hsv.v;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const index = (y * size + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          const sat = Math.min(1, dist / radius);

          const { r, g, b } = hsvToRgb(angle, sat, currentV);
          const alpha = dist > radius - 1.5 ? Math.max(0, (radius - dist) / 1.5) * 255 : 255;

          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = alpha;
        } else {
          data[index + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw inner subtle guide circle
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }, [hsv.v]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Calculate pointer position to Hue & Saturation
  const handlePointerCoords = useCallback(
    (clientX: number, clientY: number) => {
      const container = wheelContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxRadius = rect.width / 2 - 3;

      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const sat = Math.max(0, Math.min(1, dist / maxRadius));

      const newHsv = { h: angle, s: sat, v: hsv.v };
      setHsv(newHsv);
      const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setHexInput(newHex);
      onChange(newHex);
    },
    [hsv.v, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingWheel(true);
    handlePointerCoords(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDraggingWheel) return;
      handlePointerCoords(e.clientX, e.clientY);
    };

    const handleUp = () => {
      setIsDraggingWheel(false);
    };

    if (isDraggingWheel) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDraggingWheel, handlePointerCoords]);

  // Brightness slider change
  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newV = parseFloat(e.target.value);
    const newHsv = { ...hsv, v: newV };
    setHsv(newHsv);
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(newHex);
    onChange(newHex);
  };

  // Direct Hex input change
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("#")) val = "#" + val;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const parsed = hexToHsv(val);
      setHsv(parsed);
      onChange(val);
    }
  };

  // Native color picker
  const handleNativeColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    const parsed = hexToHsv(val);
    setHsv(parsed);
    onChange(val);
  };

  // Preset click
  const handlePresetSelect = (presetHex: string) => {
    setHexInput(presetHex);
    const parsed = hexToHsv(presetHex);
    setHsv(parsed);
    onChange(presetHex);
  };

  // Compute Thumb Pin position on the wheel
  const wheelSize = 160;
  const radius = wheelSize / 2 - 4;
  const rad = (hsv.h * Math.PI) / 180;
  const thumbDist = hsv.s * radius;
  const thumbX = wheelSize / 2 + thumbDist * Math.cos(rad);
  const thumbY = wheelSize / 2 + thumbDist * Math.sin(rad);

  const currentColorHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="space-y-3 bg-sepia/25 p-3.5 rounded-2xl border border-umber/60 select-none">
      {/* Header with Title and Real-time color badge preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-vellum/70 text-[10px] font-heading uppercase tracking-wider font-semibold">
          <Sparkles size={11} className="text-gold" />
          <span>Rueda de Color</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border-2 border-white/80 shadow-md transition-colors"
            style={{
              backgroundColor: currentColorHex,
              boxShadow: `0 0 10px ${currentColorHex}80`,
            }}
          />
          <span className="font-mono text-[10px] text-vellum/80 font-bold uppercase">{currentColorHex}</span>
        </div>
      </div>

      {/* Center Color Wheel & Thumb Controller */}
      <div className="flex flex-col items-center justify-center pt-1">
        <div
          ref={wheelContainerRef}
          onPointerDown={handlePointerDown}
          className="relative w-40 h-40 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-2 border-umber/80 cursor-crosshair touch-none flex items-center justify-center group"
          style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}
        >
          <canvas
            ref={canvasRef}
            width={wheelSize}
            height={wheelSize}
            className="w-full h-full rounded-full pointer-events-none"
          />

          {/* Draggable Selector Thumb Pin */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.9)] pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
            style={{
              left: `${thumbX}px`,
              top: `${thumbY}px`,
              backgroundColor: currentColorHex,
            }}
          >
            <div className="w-full h-full rounded-full border border-black/40" />
          </div>
        </div>
      </div>

      {/* Brightness / Luminosity Slider */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between items-center text-[9px] text-vellum/50 font-mono">
          <span>Brillo / Luminosidad</span>
          <span>{Math.round(hsv.v * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={hsv.v}
          onChange={handleBrightnessChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer border border-umber/50"
          style={{
            background: `linear-gradient(to right, #000000, ${hsvToHex(hsv.h, hsv.s, 1)})`,
          }}
        />
      </div>

      {/* Hex Code Input & Native Eye-Dropper */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            placeholder="#d0e8ee"
            maxLength={7}
            className="w-full bg-void/80 border border-umber focus:border-gold/60 rounded-xl pl-3 pr-8 py-1.5 font-mono text-xs text-vellum font-semibold outline-none transition-all"
          />
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-md border border-umber shadow-inner pointer-events-none"
            style={{ backgroundColor: currentColorHex }}
          />
        </div>

        {/* Native Color Pipette / Picker trigger */}
        <label
          className="relative px-2.5 py-1.5 rounded-xl bg-void/80 border border-umber hover:border-gold/60 text-vellum/60 hover:text-gold flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wider font-semibold cursor-pointer transition-all shadow-sm"
          title="Abrir selector nativo / cuentagotas"
        >
          <Pipette size={12} />
          <span>Pipeta</span>
          <input
            type="color"
            value={currentColorHex}
            onChange={handleNativeColorPick}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>

      {/* Quick Fantasy Inspirations */}
      <div className="space-y-1 pt-1 border-t border-umber/40">
        <span className="text-[9px] uppercase tracking-widest text-vellum/30 font-semibold block">
          Inspiración Rápida
        </span>
        <div className="flex items-center justify-between gap-1">
          {QUICK_PALETTE.map((p) => (
            <button
              key={p.hex}
              type="button"
              onClick={() => handlePresetSelect(p.hex)}
              className={`w-6 h-6 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                currentColorHex.toLowerCase() === p.hex.toLowerCase()
                  ? "border-gold scale-110 shadow-[0_0_8px_#d4af37]"
                  : "border-umber/60 opacity-70 hover:opacity-100 hover:scale-105"
              }`}
              style={{ backgroundColor: p.hex }}
              title={p.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
