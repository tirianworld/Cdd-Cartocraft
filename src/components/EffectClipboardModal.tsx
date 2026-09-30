import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  ClipboardCheck,
  ClipboardPaste,
  Sparkles,
  Droplets,
  Moon,
  Volume2,
  Zap,
  Wind,
  Film,
  Check,
  X,
  Trash2,
  Download,
  Upload,
  Layers,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  CloudDownload,
  Search,
} from "lucide-react";
import { Map } from "../types";
import {
  EffectPackage,
  EffectPasteOptions,
  copyEffectsFromMap,
  extractEffectsFromMap,
  getStoredEffectPackage,
  getPastedEffectsMapUpdate,
  getEffectPackageSummary,
  clearStoredEffects,
} from "../utils/effectClipboard";

interface EffectClipboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMap: Map;
  allMaps?: Map[];
  onUpdateMap: (updates: Partial<Map>) => Promise<void>;
  onLoadGitHub?: () => Promise<void>;
  isFetchingGitHub?: boolean;
  onShowToast?: (msg: string) => void;
}

export default function EffectClipboardModal({
  isOpen,
  onClose,
  currentMap,
  allMaps = [],
  onUpdateMap,
  onLoadGitHub,
  isFetchingGitHub = false,
  onShowToast,
}: EffectClipboardModalProps) {
  const [copiedPkg, setCopiedPkg] = useState<EffectPackage | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const [justPasted, setJustPasted] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [showImportBox, setShowImportBox] = useState(false);
  const [showPresetsPicker, setShowPresetsPicker] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");

  // Paste selection options
  const [options, setOptions] = useState<EffectPasteOptions>({
    pasteWeather: true,
    pasteWater: true,
    pasteDarkness: true,
    pasteAudio: true,
    pasteEmissive: true,
    pasteWind: true,
    pasteMechanical: true,
  });

  const refreshStored = () => {
    setCopiedPkg(getStoredEffectPackage());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStored();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleStorageChange = () => {
      refreshStored();
    };
    window.addEventListener("cartocraft_effects_clipboard_change", handleStorageChange);
    return () => {
      window.removeEventListener("cartocraft_effects_clipboard_change", handleStorageChange);
    };
  }, []);

  const currentMapSummaryTags = useMemo(() => {
    return getEffectPackageSummary(extractEffectsFromMap(currentMap));
  }, [currentMap]);

  // List of maps with configured effects that can be loaded as presets
  const mapsWithEffects = useMemo(() => {
    return allMaps.filter((m) => {
      const hasWeather = (m.weather_effects_v2 && m.weather_effects_v2.length > 0) || (m.weather_effect && m.weather_effect !== "none");
      const hasWater = m.water_colors && m.water_colors.length > 0;
      const hasDarkness = m.darkness && m.darkness > 0;
      const hasAudio = m.ambient_sound && m.ambient_sound !== "none";
      const hasEmissive = m.emissive_colors && m.emissive_colors.length > 0;
      const hasWind = m.wind_enabled || (m.wind_colors && m.wind_colors.length > 0);
      const hasAnim = (m.moving_parts && m.moving_parts.length > 0) || (m.ai_animation_layers && m.ai_animation_layers.length > 0);
      return hasWeather || hasWater || hasDarkness || hasAudio || hasEmissive || hasWind || hasAnim;
    }).filter((m) => {
      if (!presetSearch.trim()) return true;
      return m.name.toLowerCase().includes(presetSearch.toLowerCase());
    });
  }, [allMaps, presetSearch]);

  if (!isOpen) return null;

  const handleCopyCurrent = () => {
    const pkg = copyEffectsFromMap(currentMap);
    setCopiedPkg(pkg);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
    if (onShowToast) {
      onShowToast(`✓ Efectos y agua de "${currentMap.name}" copiados al portapapeles`);
    }
  };

  const handleSelectMapAsPreset = (sourceMap: Map) => {
    const pkg = copyEffectsFromMap(sourceMap);
    setCopiedPkg(pkg);
    setShowPresetsPicker(false);
    if (onShowToast) {
      onShowToast(`✓ Efectos y animaciones de "${sourceMap.name}" cargados al portapapeles`);
    }
  };

  const handlePasteAll = async () => {
    if (!copiedPkg) return;
    const updates = getPastedEffectsMapUpdate(copiedPkg, {
      pasteWeather: true,
      pasteWater: true,
      pasteDarkness: true,
      pasteAudio: true,
      pasteEmissive: true,
      pasteWind: true,
      pasteMechanical: true,
    });
    await onUpdateMap(updates);
    setJustPasted(true);
    setTimeout(() => {
      setJustPasted(false);
      onClose();
    }, 1200);
    if (onShowToast) {
      onShowToast(`✓ Efectos de "${copiedPkg.sourceMapName}" aplicados a "${currentMap.name}"`);
    }
  };

  const handlePasteSelected = async () => {
    if (!copiedPkg) return;
    const updates = getPastedEffectsMapUpdate(copiedPkg, options);
    await onUpdateMap(updates);
    setJustPasted(true);
    setTimeout(() => {
      setJustPasted(false);
      onClose();
    }, 1200);
    if (onShowToast) {
      onShowToast(`✓ Efectos seleccionados aplicados a "${currentMap.name}"`);
    }
  };

  const handleExportJSON = () => {
    if (!copiedPkg) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(copiedPkg, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cartocraft-efectos-${copiedPkg.sourceMapName || "preset"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = async () => {
    const raw = importJsonText.trim();
    if (!raw) return;

    try {
      let parsedObj: any = null;

      // Check if user entered a URL (e.g. GitHub raw URL)
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        let fetchUrl = raw;
        if (raw.includes("github.com") && raw.includes("/blob/")) {
          fetchUrl = raw.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
        }
        const resp = await fetch(fetchUrl);
        if (!resp.ok) {
          throw new Error(`Error ${resp.status} al descargar JSON desde la URL`);
        }
        parsedObj = await resp.json();
      } else {
        parsedObj = JSON.parse(raw);
      }

      if (!parsedObj || typeof parsedObj !== "object") {
        alert("El archivo JSON no tiene un formato válido de efectos.");
        return;
      }

      const pkg = parsedObj as EffectPackage;
      pkg.timestamp = Date.now();
      localStorage.setItem("cartocraft_effects_clipboard_v1", JSON.stringify(pkg));
      setCopiedPkg(pkg);
      setShowImportBox(false);
      setImportJsonText("");
      if (onShowToast) {
        onShowToast(`✓ Plantilla de efectos importada con éxito.`);
      }
    } catch (err: any) {
      alert("Error al importar el JSON o descargar la URL: " + (err.message || "Formato no válido"));
    }
  };

  const summaryTags = copiedPkg ? getEffectPackageSummary(copiedPkg) : [];
  const isSameMap = copiedPkg?.sourceMapId === currentMap.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-void/95 border border-umber rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-umber/60 flex items-center justify-between bg-sepia/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-vellum leading-tight flex items-center gap-2">
                <span>Copiar y Pegar Efectos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 uppercase tracking-widest">
                  GitHub & Multi-Mapa
                </span>
              </h3>
              <p className="text-xs font-lore text-vellum/50 italic">
                Transfiere clima, agua animada, iluminación, shaders y animaciones mecánicas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-sepia/40 hover:bg-sepia text-vellum/60 hover:text-vellum flex items-center justify-center border border-umber/60 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-vellum">
          {/* SECTION 1: COPY FROM CURRENT MAP & GITHUB LOAD */}
          <div className="p-4 rounded-2xl bg-sepia/30 border border-umber/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-heading font-bold text-vellum flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                  <span>Mapa actual en pantalla:</span>
                </span>
                <p className="text-sm font-heading font-bold text-gold truncate max-w-xs">{currentMap.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCurrent}
                  className={`px-3.5 py-2 rounded-xl text-xs font-heading font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    justCopied
                      ? "bg-emerald-bg text-emerald-text border border-emerald-border shadow-[0_0_15px_rgba(208,232,238,0.4)]"
                      : "bg-gold hover:bg-gold-bright text-void border border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-102 active:scale-98"
                  }`}
                >
                  {justCopied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                  <span>{justCopied ? "¡Copiado!" : "Copiar de este Mapa"}</span>
                </button>

                <button
                  onClick={() => setShowPresetsPicker(!showPresetsPicker)}
                  className="px-3 py-2 rounded-xl text-xs font-heading font-bold bg-sepia/80 hover:bg-sepia border border-umber hover:border-gold/50 text-vellum flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Cargar efectos de otros mapas guardados"
                >
                  <Layers size={14} className="text-gold" />
                  <span>Mapas ({mapsWithEffects.length})</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentMapSummaryTags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-void/60 border border-umber/60 text-[10px] font-mono text-vellum/70"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* PRESETS LIST DRAWER */}
            {showPresetsPicker && (
              <div className="pt-3 border-t border-umber/40 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-heading font-bold text-gold uppercase tracking-wider">
                    Seleccionar mapa guardado con efectos:
                  </span>
                  {onLoadGitHub && (
                    <button
                      onClick={async () => {
                        await onLoadGitHub();
                        if (onShowToast) onShowToast("¡Efectos y mapas recargados desde GitHub!");
                      }}
                      disabled={isFetchingGitHub}
                      className="text-[10px] font-mono text-emerald-text hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CloudDownload size={11} className={isFetchingGitHub ? "animate-spin" : ""} />
                      <span>{isFetchingGitHub ? "Cargando GitHub..." : "Recargar GitHub"}</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Filtrar por nombre de mapa..."
                    className="w-full bg-void/80 border border-umber/70 focus:border-gold/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-vellum outline-none"
                  />
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vellum/40" />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {mapsWithEffects.map((m) => {
                    const tags = getEffectPackageSummary(extractEffectsFromMap(m));
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMapAsPreset(m)}
                        className="p-2 rounded-xl bg-void/60 hover:bg-gold/10 border border-umber/50 hover:border-gold/60 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-heading font-bold text-vellum group-hover:text-gold truncate">
                            {m.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {tags.map((t, idx) => (
                              <span key={idx} className="text-[9px] font-mono text-vellum/60 bg-sepia/40 px-1.5 py-0.2 rounded border border-umber/30">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button className="px-2 py-1 rounded-lg bg-gold/20 text-gold text-[10px] font-heading font-bold uppercase tracking-wider group-hover:bg-gold group-hover:text-void transition-colors">
                          Cargar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: CLIPBOARD STATUS & PASTE TO THIS MAP */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-amber-text flex items-center gap-2">
                <ClipboardPaste size={14} className="text-gold" />
                <span>Efectos Guardados en el Portapapeles</span>
              </h4>

              {copiedPkg && (
                <button
                  onClick={() => {
                    clearStoredEffects();
                    setCopiedPkg(null);
                  }}
                  className="text-[11px] font-mono text-vellum/40 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            {copiedPkg ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sepia/70 via-sepia/40 to-void border border-gold/50 shadow-md space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 text-[9px] font-mono font-bold uppercase">
                        Origen
                      </span>
                      <span className="font-heading text-sm font-bold text-vellum">{copiedPkg.sourceMapName}</span>
                    </div>
                    <p className="text-[10px] text-vellum/40 font-mono pt-1">
                      Copiado el {new Date(copiedPkg.timestamp).toLocaleTimeString()} • {new Date(copiedPkg.timestamp).toLocaleDateString()}
                    </p>
                  </div>

                  {isSameMap && (
                    <span className="px-2 py-1 rounded-lg bg-sepia border border-umber text-[10px] text-vellum/60 font-lore italic">
                      (Este mismo mapa)
                    </span>
                  )}
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-1.5">
                  {summaryTags.length > 0 ? (
                    summaryTags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/30 text-[10px] font-mono text-gold flex items-center gap-1 font-medium"
                      >
                        <Check size={11} className="text-gold" />
                        <span>{tag}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-vellum/40 italic">Sin efectos configurados</span>
                  )}
                </div>

                {/* Granular Selective Checkboxes */}
                <div className="pt-2 border-t border-umber/40 space-y-2">
                  <span className="text-[11px] font-heading font-semibold text-vellum/70">
                    Elementos a transferir al mapa actual:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteWeather}
                        onChange={(e) => setOptions({ ...options, pasteWeather: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Sparkles size={13} className="text-sky-400" />
                      <span className="text-vellum/90 text-[11px]">Clima y Partículas</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteWater}
                        onChange={(e) => setOptions({ ...options, pasteWater: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Droplets size={13} className="text-cyan-400" />
                      <span className="text-vellum/90 text-[11px]">Agua Animada y Olas</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteDarkness}
                        onChange={(e) => setOptions({ ...options, pasteDarkness: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Moon size={13} className="text-indigo-400" />
                      <span className="text-vellum/90 text-[11px]">Oscuridad e Iluminación</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteAudio}
                        onChange={(e) => setOptions({ ...options, pasteAudio: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Volume2 size={13} className="text-emerald-text" />
                      <span className="text-vellum/90 text-[11px]">Audio Ambiental</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteEmissive}
                        onChange={(e) => setOptions({ ...options, pasteEmissive: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Zap size={13} className="text-amber-400" />
                      <span className="text-vellum/90 text-[11px]">Color Emisor / Glow</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteWind}
                        onChange={(e) => setOptions({ ...options, pasteWind: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Wind size={13} className="text-teal-400" />
                      <span className="text-vellum/90 text-[11px]">Viento y Física</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-void/60 border border-umber/40 hover:border-gold/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={options.pasteMechanical}
                        onChange={(e) => setOptions({ ...options, pasteMechanical: e.target.checked })}
                        className="accent-gold rounded"
                      />
                      <Film size={13} className="text-rose-400" />
                      <span className="text-vellum/90 text-[11px]">Animación Mecánica / IA</span>
                    </label>
                  </div>
                </div>

                {/* Paste Action Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={handlePasteAll}
                    className={`flex-1 py-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      justPasted
                        ? "bg-emerald-bg text-emerald-text border border-emerald-border"
                        : "bg-gradient-to-r from-gold via-gold-bright to-gold text-void border border-gold hover:brightness-110 active:scale-98"
                    }`}
                  >
                    {justPasted ? <CheckCircle2 size={16} /> : <ClipboardPaste size={16} />}
                    <span>{justPasted ? "¡Efectos Aplicados!" : "Pegar Todo en este Mapa"}</span>
                  </button>

                  <button
                    onClick={handlePasteSelected}
                    className="py-3 px-4 rounded-xl font-heading font-semibold text-xs bg-sepia hover:bg-gold/20 text-vellum hover:text-gold border border-umber hover:border-gold/60 transition-all cursor-pointer"
                  >
                    Pegar Selección
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-umber/70 text-center space-y-2 bg-sepia/20">
                <Copy className="mx-auto text-vellum/30" size={28} />
                <p className="font-heading text-xs font-bold text-vellum/80">El portapapeles de efectos está vacío</p>
                <p className="font-lore text-[11px] text-vellum/50 italic max-w-sm mx-auto">
                  Haz clic en <strong>"Copiar de este Mapa"</strong> arriba o usa <strong>"Mapas ({mapsWithEffects.length})"</strong> para cargar cualquier ajuste de clima, agua y animación guardado en GitHub.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: IMPORT / EXPORT JSON */}
          <div className="pt-2 border-t border-umber/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {copiedPkg && (
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 rounded-lg bg-sepia/50 hover:bg-sepia border border-umber hover:border-gold/40 text-vellum/70 hover:text-vellum flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                >
                  <Download size={12} />
                  <span>Exportar JSON</span>
                </button>
              )}

              <button
                onClick={() => setShowImportBox(!showImportBox)}
                className="px-3 py-1.5 rounded-lg bg-sepia/50 hover:bg-sepia border border-umber hover:border-gold/40 text-vellum/70 hover:text-vellum flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
              >
                <Upload size={12} />
                <span>Importar JSON / URL</span>
              </button>
            </div>

            {onLoadGitHub && (
              <button
                onClick={async () => {
                  await onLoadGitHub();
                  if (onShowToast) onShowToast("¡Mapas y efectos cargados desde GitHub!");
                }}
                disabled={isFetchingGitHub}
                className="px-3 py-1.5 rounded-lg bg-emerald-bg/30 hover:bg-emerald-bg/50 border border-emerald-border/60 text-emerald-text flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                title="Cargar y sincronizar efectos desde GitHub"
              >
                <CloudDownload size={12} className={isFetchingGitHub ? "animate-spin" : ""} />
                <span>{isFetchingGitHub ? "Cargando..." : "Cargar de GitHub"}</span>
              </button>
            )}
          </div>

          {showImportBox && (
            <div className="p-3 rounded-xl bg-void border border-umber space-y-2">
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="Pega aquí el contenido JSON de una plantilla de efectos, o una URL de GitHub..."
                className="w-full h-24 bg-sepia/30 border border-umber/60 rounded-lg p-2 text-xs font-mono text-vellum placeholder:text-vellum/30 outline-none focus:border-gold"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportBox(false)}
                  className="px-3 py-1 text-xs text-vellum/50 hover:text-vellum"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportJSON}
                  disabled={!importJsonText.trim()}
                  className="px-3 py-1 rounded bg-gold text-void font-bold text-xs disabled:opacity-40 cursor-pointer"
                >
                  Cargar al Portapapeles
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
