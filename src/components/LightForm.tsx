import { useState } from "react";
import { motion } from "motion/react";
import { X, Trash2, Save, Sparkles } from "lucide-react";
import { Light } from "../types";

export interface LightPreset {
  id: "torch" | "magic" | "cold" | "moon";
  label: string;
  icon: string;
  defaultColor: string;
  desc: string;
}

export const LIGHT_TYPES: LightPreset[] = [
  { id: "torch", label: "Antorcha", icon: "🔥", defaultColor: "#ffb030", desc: "Luz cálida parpadeante" },
  { id: "magic", label: "Mágica", icon: "✨", defaultColor: "#b060ff", desc: "Luz arcana pulsante" },
  { id: "cold", label: "Fría", icon: "❄️", defaultColor: "#90d0ff", desc: "Luz azul tenue" },
  { id: "moon", label: "Lunar", icon: "🌙", defaultColor: "#d0e8ff", desc: "Luz plateada suave" },
];

interface LightFormProps {
  light: Light;
  onSaved: (updatedData: Partial<Light>) => Promise<void>;
  onDeleted: (lightId: string) => Promise<void>;
  onCancel: () => void;
  onChange?: (updatedData: Partial<Light>) => void;
}

export default function LightForm({
  light,
  onSaved,
  onDeleted,
  onCancel,
  onChange,
}: LightFormProps) {
  const [type, setType] = useState<"torch" | "magic" | "cold" | "moon" | "point" | "directional">(() => {
    const t = light.type;
    return t || "torch";
  });
  const [radius, setRadius] = useState<number>(light.radius ?? 12);
  const [intensity, setIntensity] = useState<number>(light.intensity ?? 0.8);
  const [color, setColor] = useState<string>(
    light.color || LIGHT_TYPES.find(t => t.id === light.type)?.defaultColor || "#ffb030"
  );
  const [falloff, setFalloff] = useState<number>(light.falloff ?? 40);
  const [coreOpacity, setCoreOpacity] = useState<number>(light.core_opacity ?? 100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetSelect = (presetId: "torch" | "magic" | "cold" | "moon") => {
    setType(presetId);
    const preset = LIGHT_TYPES.find(t => t.id === presetId);
    const newColor = preset ? preset.defaultColor : color;
    if (preset) {
      setColor(preset.defaultColor);
    }
    onChange?.({
      type: presetId,
      color: newColor,
      radius,
      intensity,
      falloff,
      core_opacity: coreOpacity,
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSaved({
      type,
      radius,
      intensity,
      color,
      falloff,
      core_opacity: coreOpacity,
    });
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (window.confirm("¿Eliminar esta fuente de luz?")) {
      await onDeleted(light.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-20 left-5 z-40 w-72 rounded-2xl bg-void/95 backdrop-blur-xl border border-umber shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-umber">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-gold" />
          <span className="font-heading text-xs uppercase tracking-[0.15em] text-vellum font-semibold">Editar luz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            className="w-6 h-6 rounded-full bg-sepia border border-umber text-red-400/50 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
            title="Eliminar luz"
          >
            <Trash2 size={11} />
          </button>
          <button
            onClick={onCancel}
            className="w-6 h-6 rounded-full bg-sepia border border-umber text-vellum/40 hover:text-vellum flex items-center justify-center transition-all cursor-pointer"
            title="Cancelar"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Editor Sliders & Fields */}
      <div className="p-4 space-y-4 text-xs font-body">
        {/* Light Types Grid Selection */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Tipo de luz</label>
          <div className="grid grid-cols-2 gap-1.5">
            {LIGHT_TYPES.map(preset => {
              const active = type === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-all ${
                    active
                      ? "border-gold/55 bg-gold/10 text-vellum"
                      : "border-umber bg-sepia/30 text-vellum/50 hover:text-vellum/80"
                  }`}
                >
                  <span className="text-base select-none leading-none">{preset.icon}</span>
                  <div className="min-w-0">
                    <p className="font-body text-[11px] leading-tight font-bold">{preset.label}</p>
                    <p className="font-body text-[8.5px] text-vellum/30 leading-tight truncate">{preset.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Circular Preview Shader */}
        <div className="flex items-center justify-center py-2 bg-void/50 rounded-xl border border-umber/40">
          <div
            className="w-16 h-16 rounded-full shadow-lg transition-all"
            style={{
              background: `radial-gradient(circle, ${
                coreOpacity > 0
                  ? `rgba(255, 255, 255, ${coreOpacity / 100}) 0%, ${color} ${Math.max(2, 14 * (coreOpacity / 100))}%`
                  : `${color} 0%`
              }, ${color}d9 ${Math.max(2, 14 - falloff * 0.12)}%, ${color}73 ${20 + falloff * 0.6}%, ${color}26 ${45 + falloff * 0.5}%, transparent 100%)`,
              opacity: intensity,
              filter: `blur(${1 + (falloff / 100) * 6}px)`,
              boxShadow: `0 0 20px ${color}80`,
            }}
          />
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Tono cromático</label>
          <div className="flex items-center gap-3 bg-sepia/30 border border-umber rounded-xl p-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                const newCol = e.target.value;
                setColor(newCol);
                onChange?.({ color: newCol, radius, intensity, falloff, core_opacity: coreOpacity, type });
              }}
              className="w-8 h-8 rounded-full border border-umber bg-transparent cursor-pointer p-0 overflow-hidden outline-none"
            />
            <span className="font-mono text-[11px] text-vellum/50 uppercase select-all font-bold">{color}</span>
          </div>
        </div>

        {/* Core White Point Opacity Slider */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-sepia/30 border border-umber">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-vellum/50 font-semibold leading-none">
            <span className="flex items-center gap-1.5 text-vellum/80">
              <span className={`w-2 h-2 rounded-full transition-opacity ${coreOpacity === 0 ? "bg-vellum/20 border border-dashed border-vellum/40" : "bg-white shadow-[0_0_6px_#ffffff]"}`} />
              Punto Blanco Central
            </span>
            <span className="text-gold font-mono font-bold">
              {coreOpacity === 0 ? "Invisible (0%)" : `${coreOpacity}%`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={coreOpacity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCoreOpacity(val);
              onChange?.({ core_opacity: val, color, radius, intensity, falloff, type });
            }}
            className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
          />
          <p className="text-[9px] text-vellum/40 font-lore italic">
            {coreOpacity === 0
              ? "Punto blanco totalmente invisible (solo emite el color de la luz)."
              : "Regula la intensidad del núcleo blanco central incandescente."}
          </p>
        </div>

        {/* Radius Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-vellum/40 font-semibold leading-none">
            <span>Radio de brillo</span>
            <span className="text-gold font-mono">{radius}%</span>
          </div>
          <input
            type="range"
            min="4"
            max="40"
            step="1"
            value={radius}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRadius(val);
              onChange?.({ radius: val, color, intensity, falloff, core_opacity: coreOpacity, type });
            }}
            className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
          />
        </div>

        {/* Intensity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-vellum/40 font-semibold leading-none">
            <span>Potencia Lumínica</span>
            <span className="text-gold font-mono">{Math.round(intensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={intensity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setIntensity(val);
              onChange?.({ intensity: val, color, radius, falloff, core_opacity: coreOpacity, type });
            }}
            className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
          />
        </div>

        {/* Falloff Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-vellum/40 font-semibold leading-none">
            <span>Atenuación</span>
            <span className="text-gold font-mono">{falloff}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="1"
            value={falloff}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFalloff(val);
              onChange?.({ falloff: val, color, radius, intensity, core_opacity: coreOpacity, type });
            }}
            className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
          />
        </div>

        {/* Submission actions */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text font-semibold hover:bg-emerald-bg/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 font-heading text-[10px] uppercase tracking-widest shadow-md"
        >
          <Save size={12} strokeWidth={2.5} />
          <span>Guardar Cambios</span>
        </button>
      </div>
    </motion.div>
  );
}
