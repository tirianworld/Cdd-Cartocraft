import { useState, useEffect, DragEvent, ChangeEvent } from "react";
import { motion } from "motion/react";
import { X, Save, Image as ImageIcon, Link2, HelpCircle, Layers, Check, Upload, Globe, Paintbrush, Circle, MapPin, Sparkles, Trash2, RotateCcw } from "lucide-react";
import { Marker, Layer, Map } from "../types";

export const MARKER_CATEGORIES = [
  { id: "general", label: "General", icon: "◉", color: "#d0e8ee", desc: "Punto de interés" },
  { id: "region", label: "Región Circular", icon: "⚑", color: "#C0392B", desc: "Área de radio" },
  { id: "painted_zone", label: "Zona Pintada", icon: "🖌️", color: "#E67E22", desc: "Área trazada a mano" },
  { id: "layer", label: "Capa", icon: "◈", color: "#2980B9", desc: "Asignado a capa" },
  { id: "ambient", label: "Ambiente", icon: "✦", color: "#27AE60", desc: "Marcador ambiental" },
];

const ZONE_COLOR_PRESETS = [
  { name: "Ámbar", hex: "#E67E22" },
  { name: "Rubí", hex: "#E74C3C" },
  { name: "Esmeralda", hex: "#2ECC71" },
  { name: "Océano", hex: "#3498DB" },
  { name: "Arcano", hex: "#9B59B6" },
  { name: "Dorado", hex: "#F1C40F" },
  { name: "Turquesa", hex: "#1ABC9C" },
  { name: "Ceniza", hex: "#95A5A6" },
];

interface MarkerFormProps {
  mapId: string;
  layers: Layer[];
  allMaps: Map[];
  marker: Marker | null; // null if creating
  position: { x: number; y: number } | null; // coordinate if creating
  onSaved: (markerData: Partial<Marker>) => Promise<void>;
  onCancel: () => void;
  isPaintingZone?: boolean;
  onTogglePaintingZone?: (active: boolean) => void;
  paintMode?: "freehand" | "polygon" | "magic_wand";
  onPaintModeChange?: (mode: "freehand" | "polygon" | "magic_wand") => void;
  paintTolerance?: number;
  onPaintToleranceChange?: (tolerance: number) => void;
  zonePaintPoints?: Array<{ x: number; y: number }>;
  onZonePointsChange?: (points: Array<{ x: number; y: number }>) => void;
  zonePaintColor?: string;
  onZoneColorChange?: (color: string) => void;
  zonePaintOpacity?: number;
  onZoneOpacityChange?: (opacity: number) => void;
  onStartPaintZone?: (initialData: { points: Array<{ x: number; y: number }>; color: string; opacity: number }) => void;
  paintedZonePoints?: Array<{ x: number; y: number }> | null;
}

export default function MarkerForm({
  mapId,
  layers,
  allMaps,
  marker,
  position,
  onSaved,
  onCancel,
  isPaintingZone = false,
  onTogglePaintingZone,
  paintMode = "freehand",
  onPaintModeChange,
  paintTolerance = 25,
  onPaintToleranceChange,
  zonePaintPoints = [],
  onZonePointsChange,
  zonePaintColor = "#E67E22",
  onZoneColorChange,
  zonePaintOpacity = 0.25,
  onZoneOpacityChange,
  onStartPaintZone,
  paintedZonePoints,
}: MarkerFormProps) {
  const [name, setName] = useState(marker?.name || "");
  const [description, setDescription] = useState(marker?.description || "");
  const [notes, setNotes] = useState(marker?.notes || "");
  const [image, setImage] = useState(marker?.image || "");
  const [category, setCategory] = useState<"general" | "region" | "layer" | "ambient" | "painted_zone">(
    marker?.category || "general"
  );
  const [layerId, setLayerId] = useState(marker?.layer_id || "");
  const [linkedMapId, setLinkedMapId] = useState(marker?.linked_map_id || "");
  const [areaRadius, setAreaRadius] = useState<number>(marker?.area_radius || 0);

  // Painted zone state
  const [areaType, setAreaType] = useState<"none" | "circle" | "painted">(
    marker?.area_points && marker.area_points.length >= 3
      ? "painted"
      : marker?.category === "painted_zone"
      ? "painted"
      : marker?.area_radius && marker.area_radius > 0
      ? "circle"
      : "none"
  );
  const [areaPoints, setAreaPoints] = useState<Array<{ x: number; y: number }>>(
    marker?.area_points || zonePaintPoints || []
  );
  const [areaColor, setAreaColor] = useState<string>(
    marker?.area_color || zonePaintColor || (category === "painted_zone" ? "#E67E22" : "#C0392B")
  );
  const [areaOpacity, setAreaOpacity] = useState<number>(
    marker?.area_opacity ?? zonePaintOpacity ?? 0.25
  );

  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with live painted points
  useEffect(() => {
    if (paintedZonePoints !== undefined && paintedZonePoints !== null) {
      setAreaPoints(paintedZonePoints);
    }
  }, [paintedZonePoints]);

  useEffect(() => {
    if (zonePaintPoints !== undefined && zonePaintPoints !== null) {
      setAreaPoints(zonePaintPoints);
    }
  }, [zonePaintPoints]);

  // When category changes, adjust defaults
  const handleCategoryChange = (newCat: "general" | "region" | "layer" | "ambient" | "painted_zone") => {
    setCategory(newCat);
    if (newCat === "painted_zone") {
      setAreaType("painted");
      if (!areaColor) {
        setAreaColor("#E67E22");
        onZoneColorChange?.("#E67E22");
      }
      onTogglePaintingZone?.(true);
    } else if (newCat === "region") {
      if (areaType === "none") {
        setAreaType("circle");
        if (areaRadius === 0) setAreaRadius(10);
      }
      onTogglePaintingZone?.(false);
    } else {
      onTogglePaintingZone?.(false);
    }
  };

  const handleColorSelect = (hex: string) => {
    setAreaColor(hex);
    onZoneColorChange?.(hex);
  };

  const handleOpacityChange = (val: number) => {
    setAreaOpacity(val);
    onZoneOpacityChange?.(val);
  };

  // Exclude current map from linked map list to avoid circular reference loops
  const selectableMaps = allMaps.filter(m => m.id !== mapId);

  // Convert uploaded files to base64 for offline localstorage persistence
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const hasPainted = (areaType === "painted" || category === "painted_zone") && areaPoints.length >= 3;
    const hasCircle = areaType === "circle" && areaRadius > 0;

    let posX = position?.x ?? 50;
    let posY = position?.y ?? 50;

    if (hasPainted && (!position || (position.x === 50 && position.y === 50))) {
      const sum = areaPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      posX = Number((sum.x / areaPoints.length).toFixed(2));
      posY = Number((sum.y / areaPoints.length).toFixed(2));
    }

    const data: Partial<Marker> = {
      name: name.trim(),
      description: description.trim(),
      notes: notes.trim(),
      image,
      category,
      layer_id: layerId || undefined,
      linked_map_id: linkedMapId || undefined,
      area_radius: hasCircle ? areaRadius : undefined,
      area_points: hasPainted ? areaPoints : undefined,
      area_color: hasPainted ? areaColor : undefined,
      area_opacity: hasPainted ? areaOpacity : undefined,
      area_type: hasPainted ? "painted" : areaType,
      map_id: mapId,
      ...(marker ? {} : { x: posX, y: posY }),
    };

    await onSaved(data);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-void/95 backdrop-blur-2xl border-l border-umber shadow-2xl overflow-y-auto p-5 flex flex-col pointer-events-auto"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-umber mb-4">
        <div>
          <h2 className="font-heading text-sm text-vellum font-bold tracking-wider uppercase">
            {marker ? "Editar Lugar" : "Añadir Nuevo Lugar"}
          </h2>
          <p className="text-[10px] text-vellum/30 font-body uppercase tracking-wider mt-0.5">
            {marker ? "Modifica los detalles del sitio" : `Coordenadas: ${position?.x.toFixed(1)}%, ${position?.y.toFixed(1)}%`}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-full bg-sepia border border-umber text-vellum/45 hover:text-vellum flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-4 text-xs font-body">
        {/* Name input */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Nombre del lugar</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bosque de los Susurros..."
            className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
          />
        </div>

        {/* Short Description */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Descripción corta</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Un místico bosque envuelto en niebla eterna..."
            className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
          />
        </div>

        {/* Category selections */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Tipo de Marcador de Lugar</label>
          <div className="grid grid-cols-2 gap-1.5">
            {MARKER_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                    active
                      ? "border-gold/60 bg-gold/15 text-vellum shadow-sm"
                      : "border-umber bg-sepia/30 text-vellum/50 hover:text-vellum/80"
                  }`}
                >
                  <span style={{ color: cat.color }} className="font-bold text-xs">{cat.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold leading-tight">{cat.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Delimitation / Geometry Mode */}
        <div className="space-y-2 bg-sepia/25 p-3 rounded-xl border border-umber/60">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center justify-between">
            <span>Delimitación Territorial / Forma</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                setAreaType("none");
                setAreaRadius(0);
              }}
              className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                areaType === "none"
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-umber/50 text-vellum/50 hover:text-vellum/80"
              }`}
            >
              <MapPin size={12} />
              <span className="text-[10px] font-medium">Punto Pin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAreaType("circle");
                if (areaRadius === 0) setAreaRadius(10);
              }}
              className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                areaType === "circle"
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-umber/50 text-vellum/50 hover:text-vellum/80"
              }`}
            >
              <Circle size={12} />
              <span className="text-[10px] font-medium">Área Circular</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAreaType("painted");
                if (category !== "painted_zone") setCategory("painted_zone");
              }}
              className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                areaType === "painted"
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-umber/50 text-vellum/50 hover:text-vellum/80"
              }`}
            >
              <Paintbrush size={12} />
              <span className="text-[10px] font-medium">Pintar Área</span>
            </button>
          </div>

          {/* Circular Radius Slider */}
          {areaType === "circle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5 pt-2 border-t border-umber/40"
            >
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-vellum/50 font-bold">
                <span>Radio del Círculo</span>
                <span className="text-gold font-mono">{areaRadius}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={areaRadius}
                onChange={(e) => setAreaRadius(Number(e.target.value))}
                className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
              />
            </motion.div>
          )}

          {/* Painted Zone Controls */}
          {areaType === "painted" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 pt-2.5 border-t border-umber/40"
            >
              {/* Drawing Tool Mode Selector */}
              <div className="space-y-1.5">
                <label className="font-body text-[9px] uppercase tracking-widest text-amber-text font-bold flex items-center justify-between">
                  <span>Herramienta de Trazado</span>
                  <span className="text-[8px] text-vellum/50 font-normal">
                    {paintMode === "freehand"
                      ? "Arrastra libremente"
                      : paintMode === "polygon"
                      ? "Clic vértice a vértice"
                      : "Clic para autodetectar"}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-void/60 rounded-xl border border-umber/60">
                  <button
                    type="button"
                    onClick={() => {
                      onPaintModeChange?.("freehand");
                      onTogglePaintingZone?.(true);
                    }}
                    className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paintMode === "freehand"
                        ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                        : "text-vellum/60 hover:text-vellum border border-transparent"
                    }`}
                    title="Arrastra con el ratón sobre el mapa para pintar a mano alzada"
                  >
                    <span className="text-sm">🖌️</span>
                    <span className="text-[9px] leading-tight">Mano Alzada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onPaintModeChange?.("polygon");
                      onTogglePaintingZone?.(true);
                    }}
                    className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paintMode === "polygon"
                        ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                        : "text-vellum/60 hover:text-vellum border border-transparent"
                    }`}
                    title="Haz clic sobre el mapa para colocar los vértices de un polígono"
                  >
                    <span className="text-sm">📐</span>
                    <span className="text-[9px] leading-tight">Vértices</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onPaintModeChange?.("magic_wand");
                      onTogglePaintingZone?.(true);
                    }}
                    className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      paintMode === "magic_wand"
                        ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                        : "text-vellum/60 hover:text-vellum border border-transparent"
                    }`}
                    title="Varita mágica: detecta contornos automáticos por color"
                  >
                    <span className="text-sm">🪄</span>
                    <span className="text-[9px] leading-tight">Varita Mágica</span>
                  </button>
                </div>
              </div>

              {/* Magic Wand Tolerance Slider */}
              {paintMode === "magic_wand" && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1 bg-void/50 p-2 rounded-lg border border-umber/40"
                >
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-vellum/60 font-semibold">
                    <span>Tolerancia de Varita Mágica</span>
                    <span className="font-mono text-gold">{paintTolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={paintTolerance}
                    onChange={(e) => onPaintToleranceChange?.(Number(e.target.value))}
                    className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                  />
                </motion.div>
              )}

              {/* Active Painting Trigger Button */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isPaintingZone) {
                      onTogglePaintingZone?.(false);
                    } else {
                      onTogglePaintingZone?.(true);
                      onStartPaintZone?.({
                        points: areaPoints,
                        color: areaColor,
                        opacity: areaOpacity,
                      });
                    }
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl border font-heading text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isPaintingZone
                      ? "bg-amber-500/25 border-amber-500 text-amber-300 animate-pulse shadow-[0_0_15px_rgba(230,126,34,0.4)]"
                      : "bg-gold/15 hover:bg-gold/25 border-gold/40 hover:border-gold text-gold"
                  }`}
                >
                  <span className="text-sm">{isPaintingZone ? "🖌️" : "🎨"}</span>
                  <span>
                    {isPaintingZone
                      ? "Pintando en Mapa (Activo) - Clic para pausar"
                      : areaPoints.length >= 3
                      ? "Editar / Continuar Pintando en Mapa"
                      : "Pintar Área en el Mapa"}
                  </span>
                </button>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between bg-void/70 px-2.5 py-2 rounded-lg border border-umber/50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: areaColor }}
                  />
                  <span className="text-[10px] text-vellum font-mono">
                    {areaPoints.length >= 3
                      ? `${areaPoints.length} vértices trazados`
                      : "Sin área trazada"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {areaPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newPts = areaPoints.slice(0, -1);
                        setAreaPoints(newPts);
                        onZonePointsChange?.(newPts);
                      }}
                      className="px-2 py-0.5 rounded bg-sepia/60 border border-umber text-vellum/70 hover:text-vellum text-[9px] transition-colors cursor-pointer"
                      title="Deshacer último vértice"
                    >
                      ↩️ Deshacer
                    </button>
                  )}
                  {areaPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAreaPoints([]);
                        onZonePointsChange?.([]);
                      }}
                      className="px-2 py-0.5 rounded bg-sepia/60 border border-umber text-vellum/70 hover:text-red-400 text-[9px] transition-colors cursor-pointer"
                      title="Limpiar trazo"
                    >
                      🗑️ Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Color Presets */}
              <div className="space-y-1.5">
                <label className="font-body text-[9px] uppercase tracking-widest text-vellum/50 font-semibold flex items-center justify-between">
                  <span>Color del Área</span>
                  <span className="font-mono text-[9px]" style={{ color: areaColor }}>{areaColor}</span>
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {ZONE_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => handleColorSelect(p.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        areaColor.toLowerCase() === p.hex.toLowerCase()
                          ? "border-white scale-115 shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                          : "border-void/80 hover:scale-110 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      value={areaColor}
                      onChange={(e) => handleColorSelect(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
                      title="Color personalizado"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-vellum/50 font-semibold">
                  <span>Opacidad del Relleno</span>
                  <span className="font-mono text-gold">{Math.round(areaOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.05"
                  value={areaOpacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full accent-gold cursor-ew-resize h-1.5 bg-void rounded-lg appearance-none"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Linked layers */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center gap-1">
            <Layers size={10} className="text-gold/60" />
            Vincular a Capa (Opcional)
          </label>
          <select
            value={layerId}
            onChange={(e) => setLayerId(e.target.value)}
            className="w-full bg-sepia/50 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none appearance-none cursor-pointer"
          >
            <option value="">Sin vincular a capa (siempre visible)</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Linked Map (for sub-levels zooming) */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center gap-1">
            <Link2 size={10} className="text-gold/60" />
            Vincular a Submapa (Navegación)
          </label>
          <select
            value={linkedMapId}
            onChange={(e) => {
              setLinkedMapId(e.target.value);
              if (!e.target.value && areaType === "circle") setAreaRadius(0);
            }}
            className="w-full bg-sepia/50 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none appearance-none cursor-pointer"
          >
            <option value="">Sin vinculación a submapa</option>
            {selectableMaps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {linkedMapId && (
            <p className="text-[9px] text-gold/60 leading-normal font-medium mt-1">
              Al hacer clic o zoom sobre el marcador o su área delimitada, se cargará el submapa vinculado.
            </p>
          )}
        </div>

        {/* Media references image uploading */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Imagen del sitio</label>
            <div className="flex gap-2 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`px-2 py-0.5 rounded ${imageMode === "url" ? "bg-gold/20 text-gold" : "text-vellum/30"}`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`px-2 py-0.5 rounded ${imageMode === "upload" ? "bg-gold/20 text-gold" : "text-vellum/30"}`}
              >
                SUBIR
              </button>
            </div>
          </div>

          {imageMode === "url" ? (
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg..."
              className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
            />
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                isDragOver
                  ? "border-gold bg-gold/5 text-gold"
                  : "border-umber hover:border-gold/40 text-vellum/40 hover:text-vellum/60 bg-sepia/20"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="marker-image-file"
              />
              <label htmlFor="marker-image-file" className="cursor-pointer w-full flex flex-col items-center justify-center">
                {image ? (
                  <div className="relative group w-full h-20 rounded overflow-hidden">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-void/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity">
                      Cambiar Imagen
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={18} className="text-gold/40" />
                    <span className="font-semibold text-[10px] uppercase mt-1">Arrastra o haz clic aquí</span>
                    <span className="text-[8px] text-vellum/20">Soporta PNG, JPG y WebP</span>
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Long Notes (Markdown) */}
        <div className="space-y-1.5">
          <label className="font-body text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center gap-1">
            <Globe size={10} className="text-gold/60" />
            Notas del Lore (Markdown)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="# El Templo Ancestral&#10;Aquí habitaban los sabios sacerdotes del Sol.&#10;&#10;* **Secreto**: Llave bajo la piedra norte."
            className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs font-mono resize-y"
          />
        </div>

        {/* Submission actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-umber bg-sepia/30 text-vellum/70 hover:bg-sepia/60 hover:text-vellum transition-all cursor-pointer text-center font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text font-semibold hover:bg-emerald-bg/80 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Save size={13} className="text-emerald-text" />
            {marker ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
