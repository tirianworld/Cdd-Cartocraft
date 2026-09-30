import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Search, Eye, EyeOff, Settings, Sparkles, Map as MapIcon, Share2, Compass, Layers, Save, Film, ExternalLink, GitBranch, Copy, ClipboardPaste, CloudDownload } from "lucide-react";
import { Map, Folder, Marker } from "../types";
import EmbedModal from "./EmbedModal";
import { getStoredEffectPackage } from "../utils/effectClipboard";

interface MapHeaderProps {
  map: Map;
  parentMap?: Map | null;
  folder?: Folder | null;
  folders?: Folder[];
  onBack: () => void;
  onBackToMenu?: () => void;
  onNavigateToParent?: () => void;
  markers: Marker[];
  onSearchSelect: (marker: Marker) => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showLights: boolean;
  onToggleLights: () => void;
  hideHelpers?: boolean;
  onToggleHelpers?: () => void;
  onOpenSettings: () => void;
  onSaveHardcoded: () => void;
  isSavingHardcoded: boolean;
  onSaveGitHub?: () => void;
  isSyncingGitHub?: boolean;
  onLoadGitHub?: () => void;
  isFetchingGitHub?: boolean;
  activeTab?: string | null;
  onTabChange?: (tab: string | null) => void;
  sharedRootMapId?: string | null;
  onOpenEffectClipboard?: () => void;
}

export default function MapHeader({
  map,
  parentMap,
  folder,
  folders = [],
  onBack,
  onBackToMenu,
  onNavigateToParent,
  markers,
  onSearchSelect,
  showMarkers,
  onToggleMarkers,
  showLights,
  onToggleLights,
  hideHelpers = false,
  onToggleHelpers,
  onOpenSettings,
  onSaveHardcoded,
  isSavingHardcoded,
  onSaveGitHub,
  isSyncingGitHub = false,
  onLoadGitHub,
  isFetchingGitHub = false,
  activeTab,
  onTabChange,
  sharedRootMapId,
  onOpenEffectClipboard,
}: MapHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [hasClipboardEffects, setHasClipboardEffects] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkPkg = () => {
      setHasClipboardEffects(Boolean(getStoredEffectPackage()));
    };
    checkPkg();
    window.addEventListener("cartocraft_effects_clipboard_change", checkPkg);
    return () => window.removeEventListener("cartocraft_effects_clipboard_change", checkPkg);
  }, []);

  const isSharedRoot = Boolean(sharedRootMapId && map.id === sharedRootMapId);
  const isSharedSession = Boolean(sharedRootMapId);

  // Compute folder chain breadcrumbs
  const folderChain: Folder[] = [];
  if (folder && !isSharedSession) {
    folderChain.unshift(folder);
    let curr = folder;
    while (curr.parent_id) {
      const parent = folders.find((f) => f.id === curr.parent_id);
      if (parent) {
        folderChain.unshift(parent);
        curr = parent;
      } else {
        break;
      }
    }
  }

  // Filter markers based on query
  const filteredMarkers = searchQuery.trim() === ""
    ? []
    : markers.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-4 left-4 z-30 flex flex-wrap items-center gap-3 pointer-events-none w-[calc(100%-2rem)]">
      {/* Brand & Breadcrumbs container */}
      <div className="pointer-events-auto flex items-center gap-2 bg-void/85 backdrop-blur-xl border border-umber px-3 py-2 rounded-2xl shadow-xl">
        <button
          onClick={() => {
            if (parentMap && onNavigateToParent) {
              onNavigateToParent();
            } else if (onBackToMenu) {
              onBackToMenu();
            } else {
              onBack();
            }
          }}
          className="w-8 h-8 rounded-xl bg-sepia border border-umber hover:border-gold/60 text-vellum/70 hover:text-gold flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          title={parentMap ? `Volver al mapa superior (${parentMap.name})` : "Volver al Menú Principal"}
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex flex-col pr-2">
          {/* Path hierarchy */}
          <div className="flex items-center gap-1.5 text-[10px] font-body text-vellum/40 uppercase tracking-widest leading-none mb-1">
            {isSharedSession ? (
              isSharedRoot ? (
                <span className="text-[#d0e8ee]/80 font-mono tracking-wider text-[9px] bg-[#d0e8ee]/10 px-1.5 py-0.5 rounded border border-[#d0e8ee]/30">
                  MAPA COMPARTIDO
                </span>
              ) : (
                <button
                  className="hover:text-gold cursor-pointer transition-colors flex items-center gap-1 text-vellum/60"
                  onClick={() => {
                    if (onNavigateToParent) onNavigateToParent();
                    else onBack();
                  }}
                  title="Volver al mapa superior"
                >
                  <span>{parentMap?.name || "Mapa Superior"}</span>
                  <span>/</span>
                </button>
              )
            ) : (
              <>
                <button
                  onClick={() => {
                    if (onBackToMenu) onBackToMenu();
                    else onBack();
                  }}
                  className="hover:text-gold font-semibold cursor-pointer transition-colors flex items-center gap-1 text-gold/80 hover:underline"
                  title="Volver al Menú Principal"
                >
                  CartoCraft
                </button>
                {folderChain.map((fItem) => (
                  <span key={fItem.id} className="flex items-center gap-1.5">
                    <span>/</span>
                    <span className="truncate max-w-[80px]" style={{ color: fItem.color || "#e5d9c2" }}>
                      {fItem.name}
                    </span>
                  </span>
                ))}
                {parentMap && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() => {
                        if (onNavigateToParent) onNavigateToParent();
                        else onBack();
                      }}
                      className="hover:text-gold cursor-pointer transition-colors truncate max-w-[80px] text-vellum/60 hover:underline"
                      title={`Volver a ${parentMap.name}`}
                    >
                      {parentMap.name}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {/* Active Map Title */}
          <h1 className="font-heading text-sm text-vellum leading-none font-bold tracking-wider flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-[240px]">
            <MapIcon size={12} className="text-gold" />
            {map.name}
          </h1>
        </div>
      </div>

      {/* Interactive Search Panel */}
      <div ref={searchRef} className="pointer-events-auto relative flex-1 max-w-xs min-w-[140px] hidden sm:block">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar lugares..."
            className="w-full bg-void/85 backdrop-blur-xl border border-umber hover:border-gold/30 focus:border-gold/50 text-vellum text-xs font-body rounded-2xl pl-9 pr-3.5 py-2.5 outline-none transition-all placeholder:text-vellum/20 shadow-xl"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vellum/30" />
        </div>

        {isOpen && searchQuery.trim() !== "" && (
          <div className="absolute top-[110%] left-0 right-0 max-h-60 overflow-y-auto bg-void/95 backdrop-blur-2xl border border-umber rounded-xl shadow-2xl p-1.5 space-y-1.5 z-40">
            {filteredMarkers.length === 0 ? (
              <p className="text-vellum/30 text-[11px] font-lore italic text-center py-3">No se encontraron lugares</p>
            ) : (
              filteredMarkers.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSearchSelect(m);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-sepia flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-body text-vellum/80 group-hover:text-vellum truncate font-semibold">{m.name}</span>
                    <span className="font-lore text-vellum/30 group-hover:text-vellum/40 truncate text-[10px] italic">{m.description || "Sin descripción"}</span>
                  </div>
                  <Compass size={11} className="text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Visual Filters & Control Center */}
      <div className="pointer-events-auto flex items-center gap-1.5 ml-auto bg-void/85 backdrop-blur-xl border border-umber px-2 py-1.5 rounded-2xl shadow-xl">
        {/* Toggle markers */}
        <button
          onClick={onToggleMarkers}
          className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            showMarkers
              ? "bg-emerald-bg/80 border-emerald-border text-emerald-text shadow-[0_0_12px_rgba(208,232,238,0.25)]"
              : "bg-sepia/40 border-umber text-vellum/45 hover:text-vellum hover:border-emerald-border/40"
          }`}
          title={showMarkers ? "Ocultar Marcadores" : "Mostrar Marcadores"}
        >
          {showMarkers ? <Eye size={14} className="text-emerald-text" /> : <EyeOff size={14} />}
        </button>

        {/* Toggle lights */}
        <button
          onClick={onToggleLights}
          className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            showLights
              ? "bg-emerald-bg/80 border-emerald-border text-emerald-text shadow-[0_0_12px_rgba(208,232,238,0.25)]"
              : "bg-sepia/40 border-umber text-vellum/45 hover:text-vellum hover:border-emerald-border/40"
          }`}
          title={showLights ? "Ocultar Luces" : "Mostrar Luces"}
        >
          <Sparkles size={14} className={showLights ? "animate-pulse text-emerald-text" : ""} />
        </button>

        {/* Toggle walls & helpers (Immersive Mode) */}
        <button
          onClick={onToggleHelpers}
          className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            hideHelpers
              ? "bg-rose-950/20 border-rose-500/45 text-rose-400"
              : "bg-sepia/40 border-umber text-vellum/45 hover:text-vellum hover:border-emerald-border/40"
          }`}
          title={hideHelpers ? "Mostrar Muros y Guías" : "Ocultar Muros y Guías (Modo Inmersivo)"}
        >
          <Layers size={14} />
        </button>

        {/* Dedicated AI Analysis Button */}
        <button
          onClick={() => onTabChange?.(activeTab === "analysis" ? null : "analysis")}
          className={`px-3.5 h-8.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[10px] font-body font-bold uppercase tracking-wider ${
            activeTab === "analysis"
              ? "bg-gold text-void border-gold shadow-[0_0_12px_rgba(208,232,238,0.4)]"
              : "bg-sepia/40 border-umber text-gold hover:text-gold hover:border-gold/50 hover:bg-gold/10"
          }`}
          title="Análisis con IA (Detección de Objetos y Animación)"
        >
          <Sparkles size={11} className={activeTab === "analysis" ? "text-void animate-spin-slow" : "text-gold animate-pulse"} />
          <span>Análisis con IA</span>
        </button>

        {/* Dedicated Mechanical Animation Button */}
        <button
          onClick={() => onTabChange?.(activeTab === "mechanical" ? null : "mechanical")}
          className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            activeTab === "mechanical"
              ? "bg-emerald-bg text-emerald-text border-emerald-border shadow-[0_0_12px_rgba(208,232,238,0.25)]"
              : "bg-sepia/40 border-umber text-vellum/45 hover:text-vellum hover:border-emerald-border/40"
          }`}
          title="Animación Mecánica (Compilar Bucle)"
        >
          <Film size={14} />
        </button>

        {/* Share map */}
        <button
          onClick={() => setShowEmbedModal(true)}
          className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all bg-sepia/40 border-umber text-vellum/45 hover:text-vellum hover:border-emerald-border/40 cursor-pointer`}
          title="Compartir o Integrar mapa (Iframe, Notion, blogs)"
        >
          <Share2 size={13} />
        </button>

        {/* Copy / Paste Effects Modal Trigger */}
        {onOpenEffectClipboard && (
          <button
            onClick={onOpenEffectClipboard}
            className={`px-2.5 h-8.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-body font-bold uppercase tracking-wider cursor-pointer ${
              hasClipboardEffects
                ? "bg-gold/15 border-gold/60 text-gold hover:bg-gold/25 shadow-[0_0_10px_rgba(212,175,55,0.25)]"
                : "bg-sepia/40 border-umber text-vellum/60 hover:text-gold hover:border-gold/40"
            }`}
            title="Copiar y Pegar Efectos de Clima, Agua, Iluminación y Shaders entre Mapas"
          >
            <Copy size={12} className={hasClipboardEffects ? "text-gold" : "text-vellum/60"} />
            <span className="hidden sm:inline">Efectos</span>
            {hasClipboardEffects && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            )}
          </button>
        )}

        {/* Open map without UI */}
        <a
          href={`${window.location.origin}${window.location.pathname}#/map/${map.id}/no-ui?root=${sharedRootMapId || map.id}&markers=${showMarkers}&lights=${showLights}&helpers=${hideHelpers}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 h-8.5 rounded-xl border border-umber bg-sepia/40 text-vellum/45 hover:text-gold hover:border-gold/50 flex items-center justify-center gap-1.5 transition-all text-[10px] font-body font-bold uppercase tracking-wider cursor-pointer"
          style={{ textDecoration: "none" }}
          title="Abrir mapa en pantalla completa sin interfaz de usuario (UI)"
        >
          <ExternalLink size={12} className="text-gold" />
          <span>Abrir</span>
        </a>

        {!isSharedSession && (
          <>
            {/* Load from GitHub button */}
            {onLoadGitHub && (
              <button
                onClick={onLoadGitHub}
                disabled={isFetchingGitHub}
                className={`px-3 h-8.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[10px] font-body font-bold uppercase tracking-wider ${
                  isFetchingGitHub
                    ? "bg-gold/30 border-gold/60 text-gold animate-pulse cursor-not-allowed"
                    : "bg-sepia/40 border-umber hover:border-gold/60 text-vellum/70 hover:text-gold hover:bg-sepia"
                }`}
                title="Cargar y sincronizar efectos, animaciones y mapas desde GitHub"
              >
                <CloudDownload size={13} className={isFetchingGitHub ? "animate-spin text-gold" : "text-gold"} />
                <span>{isFetchingGitHub ? "Cargando..." : "Cargar GitHub"}</span>
              </button>
            )}

            {/* Save & Sync to GitHub button */}
            {onSaveGitHub && (
              <button
                onClick={onSaveGitHub}
                disabled={isSyncingGitHub}
                className={`px-3 h-8.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[10px] font-body font-bold uppercase tracking-wider ${
                  isSyncingGitHub
                    ? "bg-emerald-bg/40 border-emerald-border/60 text-emerald-text animate-pulse cursor-not-allowed"
                    : "bg-sepia/40 border-emerald-border/70 text-emerald-text hover:bg-emerald-bg/30 hover:border-emerald-border hover:shadow-[0_0_10px_rgba(208,232,238,0.2)]"
                }`}
                title="Sincronizar y guardar en GitHub (theworldoftirian/dragopedia)"
              >
                <GitBranch size={13} className={isSyncingGitHub ? "animate-spin text-emerald-text" : "text-emerald-text"} />
                <span>{isSyncingGitHub ? "Sincronizando..." : "GitHub"}</span>
              </button>
            )}

            {/* Save hardcoded button */}
            <button
              onClick={onSaveHardcoded}
              disabled={isSavingHardcoded}
              className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isSavingHardcoded
                  ? "bg-emerald-bg/40 border-emerald-border/60 text-emerald-text animate-pulse cursor-not-allowed"
                  : "bg-sepia/40 border-umber text-emerald-text hover:bg-emerald-bg/30 hover:border-emerald-border"
              }`}
              title="Guardar Permanente (Hardcodear ajustes, efectos, muros y luces en data.ts y sincronizar)"
            >
              <Save size={14} className={isSavingHardcoded ? "animate-pulse text-emerald-text" : "text-emerald-text"} />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-umber mx-1" />

            {/* Map settings button */}
            <button
              onClick={onOpenSettings}
              className="w-8.5 h-8.5 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text flex items-center justify-center font-bold hover:bg-emerald-bg/80 transition-all cursor-pointer shadow-md"
              title="Ajustes del mapa"
            >
              <Settings size={14} />
            </button>
          </>
        )}
      </div>

      <EmbedModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        mapId={map.id}
        mapName={map.name}
        initialShowMarkers={showMarkers}
        initialShowLights={showLights}
        initialHideHelpers={hideHelpers}
      />
    </header>
  );
}
