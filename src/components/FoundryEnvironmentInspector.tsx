import React, { useState, useEffect } from "react";
import { WeatherEffectConfig, Map } from "../types";
import { FOUNDRY_WEATHER_PRESETS, FoundryWeatherPreset } from "../utils/foundryWeatherPresets";
import { foundryAudio } from "../utils/foundryAudio";
import {
  copyEffectsFromMap,
  getStoredEffectPackage,
  getPastedEffectsMapUpdate,
  EffectPackage,
} from "../utils/effectClipboard";
import {
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Flame,
  Sparkles,
  CloudFog,
  Sun,
  Waves,
  Moon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  Plus,
  Trash2,
  Pipette,
  Layers,
  Compass,
  Palette,
  Eye,
  Zap,
  Info,
  Check,
  Copy,
  ClipboardPaste,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";

interface FoundryEnvironmentInspectorProps {
  map: Map | null;
  effects: WeatherEffectConfig[];
  onUpdateMap: (updates: Partial<Map>) => void;
  onUpdateEffect: (id: string, updates: Partial<WeatherEffectConfig>) => void;
  onDeleteEffect: (id: string) => void;
  onAddEffect: (effect: WeatherEffectConfig) => void;
  onStartAvoidColorPick?: (id: string) => void;
  pickingAvoidColorId?: string | null;
  onOpenClipboardModal?: () => void;
}

export default function FoundryEnvironmentInspector({
  map,
  effects,
  onUpdateMap,
  onUpdateEffect,
  onDeleteEffect,
  onAddEffect,
  onStartAvoidColorPick,
  pickingAvoidColorId,
  onOpenClipboardModal,
}: FoundryEnvironmentInspectorProps) {
  const [activeTab, setActiveTab] = useState<"weather" | "lighting" | "audio">("weather");
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(
    effects.length > 0 ? effects[0].id : null
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>(
    map?.ambient_sound || "none"
  );
  const [audioVolume, setAudioVolume] = useState<number>(
    map?.ambient_volume !== undefined ? map.ambient_volume : 50
  );
  const [storedPkg, setStoredPkg] = useState<EffectPackage | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const [justPasted, setJustPasted] = useState(false);

  // Sync stored effect clipboard
  const refreshStoredPkg = () => {
    setStoredPkg(getStoredEffectPackage());
  };

  useEffect(() => {
    refreshStoredPkg();
    const handleStorageChange = () => refreshStoredPkg();
    window.addEventListener("cartocraft_effects_clipboard_change", handleStorageChange);
    return () => window.removeEventListener("cartocraft_effects_clipboard_change", handleStorageChange);
  }, []);

  const handleCopyCurrentMap = () => {
    if (!map) return;
    const pkg = copyEffectsFromMap(map);
    setStoredPkg(pkg);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const handleQuickPaste = () => {
    if (!storedPkg) return;
    const updates = getPastedEffectsMapUpdate(storedPkg);
    onUpdateMap(updates);
    setJustPasted(true);
    setTimeout(() => setJustPasted(false), 2000);
  };

  // Sync state if map changes
  useEffect(() => {
    if (map?.ambient_sound) {
      setSelectedAudioTrack(map.ambient_sound);
    }
  }, [map?.ambient_sound]);

  // Audio Playback handler
  const handleToggleAudio = (track?: string) => {
    const targetTrack = track || selectedAudioTrack;
    if (isPlayingAudio && targetTrack === selectedAudioTrack) {
      foundryAudio.stop();
      setIsPlayingAudio(false);
    } else {
      if (targetTrack !== "none") {
        foundryAudio.play(targetTrack, audioVolume / 100);
        setIsPlayingAudio(true);
        setSelectedAudioTrack(targetTrack);
        onUpdateMap({ ambient_sound: targetTrack, ambient_volume: audioVolume });
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    setAudioVolume(vol);
    foundryAudio.setVolume(vol / 100);
    onUpdateMap({ ambient_volume: vol });
  };

  const handleSelectPreset = (preset: FoundryWeatherPreset) => {
    const newEffect: WeatherEffectConfig = {
      id: "eff_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      effect: preset.defaultConfig.effect,
      quantity: preset.defaultConfig.density,
      scale: preset.defaultConfig.scale,
      speed: preset.defaultConfig.speed,
      custom_color: preset.defaultConfig.tint,
      custom_name: preset.defaultConfig.label,
      custom_emoji: preset.icon,
      ...preset.defaultConfig,
    } as any;

    onAddEffect(newEffect);
    setExpandedEffectId(newEffect.id);

    // If preset includes sound and no sound is playing, suggest or auto-play
    if (preset.defaultConfig.soundTrack && selectedAudioTrack === "none") {
      setSelectedAudioTrack(preset.defaultConfig.soundTrack);
      onUpdateMap({ ambient_sound: preset.defaultConfig.soundTrack });
    }
  };

  const DARKNESS_PRESETS = [
    { label: "Día", value: 0.0, icon: "☀️", color: "#ffffff" },
    { label: "Amanecer", value: 0.35, icon: "🌅", color: "#ffeedb" },
    { label: "Ocaso", value: 0.6, icon: "🌇", color: "#f8b195" },
    { label: "Noche", value: 0.85, icon: "🌙", color: "#191726" },
    { label: "Medianoche", value: 1.0, icon: "🌌", color: "#0b0a13" },
  ];

  const DARKNESS_COLOR_SWATCHES = [
    { name: "Foundry VTT Indigo", hex: "#191726" },
    { name: "Azul Medianoche", hex: "#0b0a13" },
    { name: "Negro Abisal", hex: "#000000" },
    { name: "Púrpura Sombrío", hex: "#1e1224" },
    { name: "Sepia Ocre", hex: "#211a12" },
    { name: "Luna de Sangre", hex: "#2b0b0b" },
  ];

  const AUDIO_TRACKS = [
    { id: "rain", name: "Lluvia Relajante", icon: "🌧️", desc: "Hiss suave de lluvia y gotas de impacto" },
    { id: "storm", name: "Tormenta y Truenos", icon: "⛈️", desc: "Viento huracanado y truenos distantes" },
    { id: "wind", name: "Viento Aullante", icon: "💨", desc: "Ráfagas continuas de brisa y ventisca" },
    { id: "campfire", name: "Campamento y Brasas", icon: "🔥", desc: "Crepitar de leña y chispas de fuego" },
    { id: "forest", name: "Bosque Nocturno", icon: "🌲", desc: "Grillos y brisa de follaje" },
    { id: "ocean", name: "Oleaje Marino", icon: "🌊", desc: "Mareas y olas en costa o barco" },
    { id: "cave", name: "Caverna Subterránea", icon: "🦇", desc: "Goteo resonante en la oscuridad" },
  ];

  return (
    <div className="space-y-4 text-vellum font-body">
      {/* FOUNDRY VTT HEADER BAR */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-void/80 border border-umber shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-inner">
            <Layers size={13} />
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-amber-text flex items-center gap-1.5">
              <span>Ambiente de Escena</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold/10 text-gold border border-gold/30 font-mono">
                Foundry VTT
              </span>
            </h3>
            <p className="text-[9px] text-vellum/50 font-lore">Configuración climática, iluminación y audio</p>
          </div>
        </div>
      </div>

      {/* MULTI-MAP EFFECTS CLIPBOARD BAR */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-sepia/80 to-void border border-gold/40 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-amber-text flex items-center gap-1.5">
            <Copy size={12} className="text-gold" />
            <span>Portapapeles de Efectos</span>
          </span>
          {storedPkg && (
            <span className="text-[9px] font-mono text-gold/80 truncate max-w-[140px] px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
              {storedPkg.sourceMapName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleCopyCurrentMap}
            className={`py-2 px-2.5 rounded-lg text-[10.5px] font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              justCopied
                ? "bg-emerald-bg text-emerald-text border border-emerald-border"
                : "bg-sepia hover:bg-gold/20 text-vellum hover:text-gold border border-umber hover:border-gold/60"
            }`}
            title="Copiar clima, agua, oscuridad, audio y shaders de este mapa"
          >
            {justCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            <span>{justCopied ? "¡Copiado!" : "Copiar Efectos"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenClipboardModal || handleQuickPaste}
            disabled={!storedPkg}
            className={`py-2 px-2.5 rounded-lg text-[10.5px] font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              justPasted
                ? "bg-emerald-bg text-emerald-text border border-emerald-border"
                : storedPkg
                ? "bg-gold hover:bg-gold-bright text-void border border-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                : "bg-sepia/40 text-vellum/30 border border-umber/40 cursor-not-allowed"
            }`}
            title={storedPkg ? `Pegar efectos de ${storedPkg.sourceMapName}` : "Copia primero los efectos de algún mapa"}
          >
            {justPasted ? <CheckCircle2 size={13} /> : <ClipboardPaste size={13} />}
            <span>{justPasted ? "¡Pegado!" : "Pegar Efectos"}</span>
          </button>
        </div>

        {storedPkg && (
          <div className="flex items-center justify-between text-[9px] font-mono text-vellum/50 pt-0.5 px-0.5">
            <span>
              {storedPkg.weather_effects_v2?.length || 0} climas • {storedPkg.water_colors?.length || 0} aguas
              {storedPkg.darkness ? ` • ${(storedPkg.darkness * 100).toFixed(0)}% noche` : ""}
            </span>
            {onOpenClipboardModal && (
              <button
                type="button"
                onClick={onOpenClipboardModal}
                className="text-gold hover:underline cursor-pointer font-sans text-[9.5px] font-semibold"
              >
                Avanzado...
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABS SELECTOR */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-sepia/70 rounded-xl border border-umber/60 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("weather")}
          className={`py-1.5 px-2 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "weather"
              ? "bg-amber-bg border border-amber-border text-amber-text shadow-sm"
              : "text-vellum/60 hover:text-vellum"
          }`}
        >
          <CloudRain size={12} />
          <span>Clima ({effects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lighting")}
          className={`py-1.5 px-2 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "lighting"
              ? "bg-amber-bg border border-amber-border text-amber-text shadow-sm"
              : "text-vellum/60 hover:text-vellum"
          }`}
        >
          <Moon size={12} />
          <span>Oscuridad</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={`py-1.5 px-2 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "audio"
              ? "bg-amber-bg border border-amber-border text-amber-text shadow-sm"
              : "text-vellum/60 hover:text-vellum"
          }`}
        >
          <Volume2 size={12} />
          <span>Audio {isPlayingAudio ? "• Activo" : ""}</span>
        </button>
      </div>

      {/* TAB 1: FOUNDRY WEATHER EFFECTS */}
      {activeTab === "weather" && (
        <div className="space-y-4">
          {/* PRESETS QUICK-SELECT GRID */}
          <div className="p-3 rounded-xl bg-sepia/30 border border-umber space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold flex items-center gap-1.5">
                <Sparkles size={11} />
                <span>Presets de Efectos Oficiales</span>
              </span>
              <span className="text-[9px] text-vellum/50">Toca para añadir</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-umber">
              {FOUNDRY_WEATHER_PRESETS.map((preset) => {
                const isActive = effects.some((e) => e.effect === preset.defaultConfig.effect);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer group hover:scale-[1.02] ${
                      isActive
                        ? "bg-amber-bg/50 border-amber-border text-vellum shadow-sm"
                        : "bg-sepia/50 border-umber/60 text-vellum/80 hover:border-gold/50 hover:bg-sepia/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">{preset.icon}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold font-heading truncate leading-tight group-hover:text-gold">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE WEATHER LAYERS LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-vellum/70">
                Capas Activas en Escena ({effects.length})
              </span>
              {effects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    effects.forEach((e) => onDeleteEffect(e.id));
                  }}
                  className="text-[9px] text-red-400/70 hover:text-red-300 transition-colors"
                >
                  Limpiar Todo
                </button>
              )}
            </div>

            {/* GLOBAL PARTICLE SCALE BAR */}
            {effects.length > 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-sepia/70 via-sepia/50 to-sepia/70 border border-amber-border/60 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-heading text-amber-text flex items-center gap-1.5">
                    <Sparkles size={14} className="text-gold" />
                    <span>Escala Global de Partículas</span>
                  </span>
                  <span className="font-mono text-xs text-gold font-bold bg-void/50 px-2 py-0.5 rounded border border-umber/40">
                    {Math.round((effects.reduce((acc, e) => acc + (e.scale ?? 1), 0) / effects.length) * 100)}% ({((effects.reduce((acc, e) => acc + (e.scale ?? 1), 0) / effects.length)).toFixed(2)}x)
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-vellum/50 font-mono">0.2x</span>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.05"
                      value={effects.length > 0 ? (effects.reduce((acc, e) => acc + (e.scale ?? 1), 0) / effects.length) : 1}
                      onChange={(e) => {
                        const newScale = Number(e.target.value);
                        effects.forEach((eff) => {
                          onUpdateEffect(eff.id, { scale: newScale });
                        });
                      }}
                      className="w-full h-2 accent-gold bg-void/70 rounded cursor-pointer transition-all"
                    />
                    <span className="text-[9px] text-vellum/50 font-mono">4.0x</span>
                  </div>

                  {/* Quick Scale Presets */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {[
                      { label: "0.5x Mini", val: 0.5 },
                      { label: "0.8x Compacto", val: 0.8 },
                      { label: "1.0x Normal", val: 1.0 },
                      { label: "1.5x Grande", val: 1.5 },
                      { label: "2.5x Épico", val: 2.5 },
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => {
                          effects.forEach((eff) => {
                            onUpdateEffect(eff.id, { scale: chip.val });
                          });
                        }}
                        className="flex-1 py-1 px-1 rounded text-[9px] font-heading font-medium bg-void/40 hover:bg-gold/20 border border-umber/40 hover:border-gold/60 text-vellum/80 hover:text-gold transition-colors text-center cursor-pointer truncate"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {effects.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-umber/60 text-center space-y-1 bg-sepia/20">
                <CloudRain className="mx-auto text-vellum/30" size={24} />
                <p className="text-xs text-vellum/60 font-lore">No hay efectos climáticos activos</p>
                <p className="text-[10px] text-vellum/40">Selecciona un preset arriba para agregarlo al mapa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {effects.map((eff) => {
                  const isExpanded = expandedEffectId === eff.id;
                  const presetInfo = FOUNDRY_WEATHER_PRESETS.find(
                    (p) => p.defaultConfig.effect === eff.effect
                  );

                  return (
                    <div
                      key={eff.id}
                      className="rounded-xl bg-sepia/40 border border-umber overflow-hidden transition-all shadow-sm"
                    >
                      {/* Layer Header */}
                      <div
                        onClick={() => setExpandedEffectId(isExpanded ? null : eff.id)}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-sepia/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{eff.custom_emoji || presetInfo?.icon || "✨"}</span>
                          <div>
                            <div className="text-xs font-bold font-heading text-amber-text flex items-center gap-1.5">
                              <span>{eff.custom_name || presetInfo?.name || eff.effect}</span>
                            </div>
                            <div className="text-[9px] text-vellum/50 font-mono flex items-center gap-2">
                              <span>Escala: {eff.scale ?? 1.0}x</span>
                              <span>•</span>
                              <span>Densidad: {eff.quantity}%</span>
                              <span>•</span>
                              <span>Velocidad: {eff.speed}x</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEffect(eff.id);
                            }}
                            className="p-1 rounded text-vellum/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar efecto"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Layer Controls Detail Panel */}
                      {isExpanded && (
                        <div className="p-3 border-t border-umber/60 bg-void/40 space-y-3">
                          {/* PARTICLE SCALE BAR (FULL DEDICATED) */}
                          <div className="p-2.5 rounded-lg bg-sepia/60 border border-umber/60 space-y-2">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-amber-text flex items-center gap-1">
                                <Sparkles size={12} className="text-gold" />
                                <span>Escala de Partículas</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-gold font-bold text-xs">
                                  {eff.scale ?? 1.0}x
                                </span>
                                <span className="text-[9px] text-vellum/40">
                                  ({Math.round((eff.scale ?? 1.0) * 100)}%)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-vellum/40 font-mono">0.1x</span>
                              <input
                                type="range"
                                min="0.1"
                                max="4.0"
                                step="0.05"
                                value={eff.scale ?? 1.0}
                                onChange={(e) => onUpdateEffect(eff.id, { scale: Number(e.target.value) })}
                                className="w-full h-2 accent-gold bg-void/70 rounded cursor-pointer"
                              />
                              <span className="text-[9px] text-vellum/40 font-mono">4.0x</span>
                            </div>

                            <div className="flex items-center gap-1 pt-0.5">
                              {[0.5, 0.8, 1.0, 1.5, 2.0, 3.0].map((sc) => (
                                <button
                                  key={sc}
                                  type="button"
                                  onClick={() => onUpdateEffect(eff.id, { scale: sc })}
                                  className={`flex-1 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer ${
                                    (eff.scale ?? 1.0) === sc
                                      ? "bg-gold/20 border-gold text-gold font-bold"
                                      : "bg-void/40 border-umber/40 text-vellum/60 hover:text-vellum hover:border-gold/40"
                                  }`}
                                >
                                  {sc}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* DENSITY */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-vellum/70">Densidad de Partículas</span>
                              <span className="font-mono text-gold font-bold">{eff.quantity}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="200"
                              step="5"
                              value={eff.quantity}
                              onChange={(e) => onUpdateEffect(eff.id, { quantity: Number(e.target.value) })}
                              className="w-full h-1.5 accent-gold bg-sepia rounded cursor-pointer"
                            />
                          </div>

                          {/* SPEED */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-vellum/70">Velocidad</span>
                              <span className="font-mono text-gold">{eff.speed}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              value={eff.speed}
                              onChange={(e) => onUpdateEffect(eff.id, { speed: Number(e.target.value) })}
                              className="w-full h-1.5 accent-gold bg-sepia rounded cursor-pointer"
                            />
                          </div>

                          {/* WIND DIRECTION / ANGLE */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-vellum/70 flex items-center gap-1">
                                <Compass size={11} />
                                <span>Dirección / Ángulo del Viento</span>
                              </span>
                              <span className="font-mono text-gold font-bold">
                                {(eff as any).direction ?? (eff.custom_vx !== undefined ? Math.round(Math.atan2(eff.custom_vy || 1, eff.custom_vx || 1) * (180 / Math.PI)) : 105)}°
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              step="5"
                              value={(eff as any).direction ?? 105}
                              onChange={(e) => {
                                const deg = Number(e.target.value);
                                const rad = (deg * Math.PI) / 180;
                                onUpdateEffect(eff.id, {
                                  direction: deg,
                                  custom_vx: Math.cos(rad) * 2,
                                  custom_vy: Math.sin(rad) * 2,
                                } as any);
                              }}
                              className="w-full h-1.5 accent-gold bg-sepia rounded cursor-pointer"
                            />
                          </div>

                          {/* COLOR TINT */}
                          <div className="flex items-center justify-between pt-1 border-t border-umber/40">
                            <span className="text-[10px] text-vellum/70 flex items-center gap-1">
                              <Palette size={11} />
                              <span>Tinte de Color</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={eff.custom_color || "#ffffff"}
                                onChange={(e) => onUpdateEffect(eff.id, { custom_color: e.target.value })}
                                className="w-6 h-6 rounded border border-umber cursor-pointer bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => onUpdateEffect(eff.id, { custom_color: undefined })}
                                className="text-[9px] text-vellum/40 hover:text-vellum"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* STORM LIGHTNING OPTION */}
                          {eff.effect === "storm" && (
                            <div className="p-2 rounded-lg bg-amber-bg/30 border border-amber-border/50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <CloudLightning size={13} className="text-gold" />
                                <span className="text-[10px] font-bold text-amber-text">Destellos de Relámpago</span>
                              </div>
                              <span className="text-[9px] text-emerald-400 font-mono font-bold">Activo</span>
                            </div>
                          )}

                          {/* WALL OCCLUSION / INTERIOR AVOIDANCE */}
                          <div className="p-2 rounded-lg bg-sepia/60 border border-umber/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-vellum/80">
                                Evitar Interiores / Techos
                              </span>
                              {onStartAvoidColorPick && (
                                <button
                                  type="button"
                                  onClick={() => onStartAvoidColorPick(eff.id)}
                                  className={`px-2 py-1 rounded text-[9px] flex items-center gap-1 transition-all cursor-pointer ${
                                    pickingAvoidColorId === eff.id
                                      ? "bg-amber-500 text-void font-bold animate-pulse"
                                      : "bg-sepia border border-umber text-vellum/80 hover:text-gold"
                                  }`}
                                >
                                  <Pipette size={10} />
                                  <span>{pickingAvoidColorId === eff.id ? "Clic en Techo..." : "Gotero"}</span>
                                </button>
                              )}
                            </div>
                            {eff.avoid_color && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3.5 h-3.5 rounded border border-white/60 shadow-sm"
                                  style={{ backgroundColor: eff.avoid_color }}
                                />
                                <span className="text-[9px] font-mono text-vellum/60">{eff.avoid_color}</span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateEffect(eff.id, { avoid_color: undefined })}
                                  className="text-[9px] text-red-400 hover:underline ml-auto"
                                >
                                  Quitar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FOUNDRY SCENE LIGHTING & DARKNESS */}
      {activeTab === "lighting" && (
        <div className="space-y-4">
          {/* DARKNESS SLIDER */}
          <div className="p-3.5 rounded-xl bg-sepia/30 border border-umber space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold flex items-center gap-1.5">
                <Moon size={12} />
                <span>Nivel de Oscuridad de Escena</span>
              </span>
              <span className="text-xs font-mono font-bold text-gold">
                {((map?.darkness ?? 0) * 100).toFixed(0)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1.0"
              step="0.01"
              value={map?.darkness ?? 0}
              onChange={(e) => onUpdateMap({ darkness: Number(e.target.value) })}
              className="w-full h-2 accent-gold bg-sepia rounded cursor-pointer"
            />

            {/* QUICK PRESETS (Day, Dawn, Dusk, Night, Midnight) */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {DARKNESS_PRESETS.map((dp) => (
                <button
                  key={dp.label}
                  type="button"
                  onClick={() => onUpdateMap({ darkness: dp.value })}
                  className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    Math.abs((map?.darkness ?? 0) - dp.value) < 0.1
                      ? "bg-amber-bg border-amber-border text-amber-text shadow-sm"
                      : "bg-sepia/40 border-umber/40 text-vellum/60 hover:text-vellum hover:bg-sepia/70"
                  }`}
                >
                  <span className="text-xs">{dp.icon}</span>
                  <span className="text-[8px] font-bold uppercase">{dp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DARKNESS COLOR TINT */}
          <div className="p-3.5 rounded-xl bg-sepia/30 border border-umber space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-vellum/80 flex items-center gap-1.5">
                <Palette size={12} />
                <span>Tinte de Oscuridad (Foundry VTT)</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={map?.darkness_color || "#191726"}
                  onChange={(e) => onUpdateMap({ darkness_color: e.target.value })}
                  className="w-6 h-6 rounded border border-umber cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {DARKNESS_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => onUpdateMap({ darkness_color: swatch.hex })}
                  className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                    (map?.darkness_color || "#191726").toLowerCase() === swatch.hex.toLowerCase()
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-umber/40 bg-sepia/40 text-vellum/70 hover:bg-sepia/70"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="text-[9px] font-mono truncate">{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DESATURATION IN DARKNESS */}
          <div className="p-3 rounded-xl bg-sepia/30 border border-umber space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-vellum/80 font-bold">Desaturación en la Oscuridad (Visión Nocturna)</span>
              <span className="font-mono text-gold font-bold">{map?.desaturation ?? 40}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={map?.desaturation ?? 40}
              onChange={(e) => onUpdateMap({ desaturation: Number(e.target.value) })}
              className="w-full h-1.5 accent-gold bg-sepia rounded cursor-pointer"
            />
            <p className="text-[9px] text-vellum/50 font-lore">
              Simula la pérdida de saturación cromática de los ojos en la penumbra al estilo Foundry VTT.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: FOUNDRY AMBIENT AUDIO */}
      {activeTab === "audio" && (
        <div className="space-y-4">
          {/* AUDIO CONTROLLER BANNER */}
          <div className="p-3.5 rounded-xl bg-sepia/30 border border-umber space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                    isPlayingAudio
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                      : "bg-sepia border-umber text-vellum/40"
                  }`}
                >
                  {isPlayingAudio ? <Volume2 size={15} className="animate-pulse" /> : <VolumeX size={15} />}
                </div>
                <div>
                  <div className="text-xs font-bold font-heading text-amber-text">
                    {isPlayingAudio ? "Reproduciendo Ambiente" : "Sonido Ambiente Pausado"}
                  </div>
                  <div className="text-[9px] text-vellum/50 font-mono">
                    {AUDIO_TRACKS.find((t) => t.id === selectedAudioTrack)?.name || "Ninguno"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleAudio()}
                disabled={selectedAudioTrack === "none"}
                className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isPlayingAudio
                    ? "bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30"
                    : "bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 hover:bg-emerald-500/30"
                }`}
              >
                {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlayingAudio ? "Pausar" : "Reproducir"}</span>
              </button>
            </div>

            {/* VOLUME SLIDER */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-vellum/70">Volumen del Ambiente</span>
                <span className="font-mono text-gold font-bold">{audioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={audioVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-1.5 accent-gold bg-sepia rounded cursor-pointer"
              />
            </div>
          </div>

          {/* AUDIO TRACKS PRESETS LIST */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-vellum/70">
              Pistas Ambientales Procedurales (Sin Dependencias Externas)
            </span>

            <div className="space-y-1.5">
              {AUDIO_TRACKS.map((track) => {
                const isSelected = selectedAudioTrack === track.id;
                const isCurrentlyActive = isSelected && isPlayingAudio;

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      setSelectedAudioTrack(track.id);
                      if (isPlayingAudio) {
                        foundryAudio.play(track.id, audioVolume / 100);
                      }
                      onUpdateMap({ ambient_sound: track.id });
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-amber-bg/40 border-amber-border shadow-sm text-vellum"
                        : "bg-sepia/40 border-umber/50 text-vellum/70 hover:bg-sepia/70 hover:text-vellum"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{track.icon}</span>
                      <div>
                        <div className="text-xs font-bold font-heading group-hover:text-gold leading-tight">
                          {track.name}
                        </div>
                        <div className="text-[9px] text-vellum/50 font-lore">{track.desc}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAudio(track.id);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isCurrentlyActive
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-sepia/60 border-umber/60 text-vellum/60 hover:text-gold"
                      }`}
                    >
                      {isCurrentlyActive ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
