import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Code, Link2, Eye, HelpCircle, Layers, Sparkles, MapPin } from "lucide-react";

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: string;
  mapName: string;
  initialShowMarkers: boolean;
  initialShowLights: boolean;
  initialHideHelpers: boolean;
}

export default function EmbedModal({
  isOpen,
  onClose,
  mapId,
  mapName,
  initialShowMarkers,
  initialShowLights,
  initialHideHelpers,
}: EmbedModalProps) {
  // Configurable embed parameters - UI is strictly disabled for clean embeddings
  const includeUi = false;
  const [showMarkers, setShowMarkers] = useState(initialShowMarkers);
  const [showLights, setShowLights] = useState(initialShowLights);
  const [hideHelpers, setHideHelpers] = useState(initialHideHelpers);
  
  // Custom dimensions
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("600");
  const [customDimensionUnit, setCustomDimensionUnit] = useState<"px" | "%">("%");

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  // Active guide tab
  const [activeGuide, setActiveGuide] = useState<"html" | "notion" | "obsidian">("html");

  // Reset to initial map state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowMarkers(initialShowMarkers);
      setShowLights(initialShowLights);
      setHideHelpers(initialHideHelpers);
    }
  }, [isOpen, initialShowMarkers, initialShowLights, initialHideHelpers]);

  if (!isOpen) return null;

  // Build the target integration URL: Always pure clean map with no-ui and embed flag
  const origin = window.location.origin;
  const path = window.location.pathname;
  
  const queryParams = `?embed=true&root=${mapId}&markers=${showMarkers}&lights=${showLights}&helpers=${hideHelpers}`;
  const embedUrl = `${origin}${path}#/map/${mapId}/no-ui${queryParams}`;
  
  // Build the iframe integration snippet
  const formattedWidth = customDimensionUnit === "%" ? "100%" : `${width}px`;
  const formattedHeight = `${height}px`;
  const iframeSnippet = `<iframe src="${embedUrl}" width="${formattedWidth}" height="${formattedHeight}" style="border: 1px solid #2e241f; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="fullscreen; autoplay; clipboard-write" title="${mapName} - CartoCraft RPG Map"></iframe>`;

  const copyToClipboard = (text: string, type: "link" | "iframe") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-void/80 backdrop-blur-md"
        />

        {/* Modal content box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-void/95 border border-umber rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh] font-body"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-umber bg-sepia/20">
            <div className="flex items-center gap-2.5">
              <Code className="text-gold" size={20} />
              <div>
                <h3 className="font-heading text-base text-vellum font-bold tracking-wider">
                  Integrar o Compartir Mapa
                </h3>
                <p className="text-[11px] font-lore italic text-vellum/50">
                  Configura cómo se verá el mapa de {mapName} en otros sitios web
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-sepia border border-umber hover:border-gold/50 text-vellum/60 hover:text-gold flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Scroll Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-umber">
            
            {/* Grid Layout: Left Settings, Right Outputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Embed Configurations (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <div className="border-b border-umber/40 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Eye size={12} />
                    Personalización
                  </h4>
                </div>

                {/* Option 1: Clean Embed Mode Active (No UI) */}
                <div className="flex items-center justify-between bg-emerald-bg/25 p-3 rounded-xl border border-emerald-border/40">
                  <div className="pr-3">
                    <span className="text-[11px] font-bold text-emerald-text block flex items-center gap-1.5">
                      <Sparkles size={11} className="text-emerald-text" /> Modo Embebido Puro (Sin UI)
                    </span>
                    <span className="text-[9px] text-vellum/60 block leading-tight mt-0.5">
                      Al incrustarse, toda la interfaz (barras y menús) queda oculta. Se muestra únicamente el mapa, sus efectos, luces y transiciones.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-bg text-emerald-text text-[9px] font-mono border border-emerald-border shrink-0">
                    ACTIVO
                  </span>
                </div>

                {/* Option 2: Markers (Lugares) */}
                <div className="flex items-center justify-between bg-sepia/10 p-3 rounded-xl border border-umber/20">
                  <div className="pr-3">
                    <span className="text-[11px] font-bold text-vellum block flex items-center gap-1">
                      <MapPin size={10} className="text-gold" /> Lugares de Interés
                    </span>
                    <span className="text-[9px] text-vellum/40 block leading-tight">Mostrar los pines y marcadores informativos sobre el lienzo.</span>
                  </div>
                  <button
                    onClick={() => setShowMarkers(!showMarkers)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showMarkers ? "bg-[#d0e8ee]" : "bg-sepia/50"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showMarkers ? "translate-x-4 bg-void" : "translate-x-0 bg-vellum"
                      }`}
                    />
                  </button>
                </div>

                {/* Option 3: Lights (Luces) */}
                <div className="flex items-center justify-between bg-sepia/10 p-3 rounded-xl border border-umber/20">
                  <div className="pr-3">
                    <span className="text-[11px] font-bold text-vellum block flex items-center gap-1">
                      <Sparkles size={10} className="text-gold" /> Iluminación Dinámica
                    </span>
                    <span className="text-[9px] text-vellum/40 block leading-tight">Carga las fuentes de luces, fuegos y filtros ambientales.</span>
                  </div>
                  <button
                    onClick={() => setShowLights(!showLights)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showLights ? "bg-[#d0e8ee]" : "bg-sepia/50"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showLights ? "translate-x-4 bg-void" : "translate-x-0 bg-vellum"
                      }`}
                    />
                  </button>
                </div>

                {/* Option 4: Helpers/Walls */}
                <div className="flex items-center justify-between bg-sepia/10 p-3 rounded-xl border border-umber/20">
                  <div className="pr-3">
                    <span className="text-[11px] font-bold text-vellum block flex items-center gap-1">
                      <Layers size={10} className="text-gold" /> Ocultar Muros y Guías
                    </span>
                    <span className="text-[9px] text-vellum/40 block leading-tight">Activa el modo inmersivo que oculta líneas de muros y trazos de colisión.</span>
                  </div>
                  <button
                    onClick={() => setHideHelpers(!hideHelpers)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hideHelpers ? "bg-[#d0e8ee]" : "bg-sepia/50"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hideHelpers ? "translate-x-4 bg-void" : "translate-x-0 bg-vellum"
                      }`}
                    />
                  </button>
                </div>

                {/* Dimensions Block */}
                <div className="bg-sepia/5 p-3 rounded-xl border border-umber/20 space-y-2.5">
                  <span className="text-[11px] font-bold text-vellum block">Dimensiones sugeridas del Iframe</span>
                  
                  {/* Width selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vellum/45">Ancho</span>
                      <span className="text-gold">{customDimensionUnit === "%" ? "Completo (100%)" : `${width}px`}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => setCustomDimensionUnit("%")}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${
                          customDimensionUnit === "%" 
                            ? "bg-gold/10 border-gold/40 text-gold" 
                            : "bg-sepia/20 border-umber text-vellum/40"
                        }`}
                      >
                        Fluido (100%)
                      </button>
                      <button 
                        onClick={() => {
                          setCustomDimensionUnit("px");
                          if (width === "100%") setWidth("800");
                        }}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${
                          customDimensionUnit === "px" 
                            ? "bg-gold/10 border-gold/40 text-gold" 
                            : "bg-sepia/20 border-umber text-vellum/40"
                        }`}
                      >
                        Fijo (px)
                      </button>
                    </div>
                    {customDimensionUnit === "px" && (
                      <input 
                        type="range" 
                        min="320" 
                        max="1400" 
                        value={width === "100%" ? "800" : width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-full accent-gold h-1 rounded" 
                      />
                    )}
                  </div>

                  {/* Height slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vellum/45">Alto</span>
                      <span className="text-gold">{height}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="300" 
                      max="1000" 
                      step="50"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full accent-gold h-1 rounded" 
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Copyable Fields & Integration Guides (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Field 1: Share Link */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vellum/65 flex items-center gap-1.5">
                    <Link2 size={12} className="text-gold" />
                    Enlace Directo Optimizado para Compartir
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={embedUrl}
                      className="w-full bg-void border border-umber/60 text-vellum/75 text-xs rounded-xl pl-3 pr-24 py-2.5 outline-none font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(embedUrl, "link")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-sepia border border-umber/85 hover:border-gold/50 text-vellum hover:text-gold flex items-center gap-1 transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check size={11} className="text-emerald-text" />
                          <span className="text-emerald-text">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[9px] text-vellum/30 italic leading-none pl-1">
                    Este link cargará el mapa directamente respetando tus filtros seleccionados.
                  </p>
                </div>

                {/* Field 2: Iframe Code */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vellum/65 flex items-center gap-1.5">
                    <Code size={12} className="text-gold" />
                    Código Iframe de Integración (Embeber en Webs)
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={4}
                      value={iframeSnippet}
                      className="w-full bg-void border border-umber/60 text-vellum/75 text-xs rounded-xl p-3 outline-none font-mono resize-none leading-relaxed"
                    />
                    <button
                      onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                      className="absolute right-2 bottom-3 px-3 py-1.5 rounded-lg bg-sepia border border-umber/85 hover:border-gold/50 text-vellum hover:text-gold flex items-center gap-1 transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                    >
                      {copiedIframe ? (
                        <>
                          <Check size={11} className="text-emerald-text" />
                          <span className="text-emerald-text">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Integration Help Center */}
                <div className="bg-sepia/5 border border-umber/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-umber/20 pb-2">
                    <HelpCircle size={13} className="text-gold" />
                    <span className="text-[11px] font-bold text-vellum">Guías Rápidas de Integración</span>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex border-b border-umber/20">
                    <button
                      onClick={() => setActiveGuide("html")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeGuide === "html" 
                          ? "border-gold text-gold bg-gold/5" 
                          : "border-transparent text-vellum/40 hover:text-vellum/70"
                      }`}
                    >
                      HTML / Wikis
                    </button>
                    <button
                      onClick={() => setActiveGuide("notion")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeGuide === "notion" 
                          ? "border-gold text-gold bg-gold/5" 
                          : "border-transparent text-vellum/40 hover:text-vellum/70"
                      }`}
                    >
                      Notion / Obsidian
                    </button>
                    <button
                      onClick={() => setActiveGuide("obsidian")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeGuide === "obsidian" 
                          ? "border-gold text-gold bg-gold/5" 
                          : "border-transparent text-vellum/40 hover:text-vellum/70"
                      }`}
                    >
                      Consejos SEO
                    </button>
                  </div>

                  {/* Guides Content */}
                  <div className="text-[11px] leading-relaxed text-vellum/60 space-y-2 pt-1 min-h-[85px]">
                    {activeGuide === "html" && (
                      <ul className="list-disc list-inside space-y-1 text-vellum/50">
                        <li>Copia el <span className="text-vellum/85">Código Iframe</span> de arriba.</li>
                        <li>Pégalo en el editor HTML de tu blog, <span className="text-vellum/85">WordPress</span> o CMS.</li>
                        <li>Compatible con plataformas de rol y lore como <span className="text-gold">World Anvil</span>, Kanka o Fandom.</li>
                        <li>Asegúrate de permitir el modo <span className="text-vellum/85">Fullscreen</span> para un uso táctico óptimo en batallas.</li>
                      </ul>
                    )}

                    {activeGuide === "notion" && (
                      <ul className="list-disc list-inside space-y-1 text-vellum/50">
                        <li>Copia el <span className="text-vellum/85">Enlace Directo</span> de arriba.</li>
                        <li>En <span className="text-vellum/85">Notion</span>, escribe <code className="bg-void/50 px-1 py-0.5 rounded text-gold">/embed</code> y pega el enlace para insertar el mapa táctico interactivo.</li>
                        <li>En <span className="text-vellum/85">Obsidian</span>, puedes pegar el código IFrame para integrarlo directamente en tus notas de campaña (.md).</li>
                      </ul>
                    )}

                    {activeGuide === "obsidian" && (
                      <ul className="list-disc list-inside space-y-1 text-vellum/50">
                        <li><span className="text-vellum/85">CartoCraft</span> ya incluye metatags extendidos para una indexación de primer nivel en buscadores como <span className="text-gold">Google</span>.</li>
                        <li>Los enlaces compartidos renderizarán hermosas vistas previas (OpenGraph) en Discord, Twitter, Reddit y WhatsApp.</li>
                        <li>Si enlazas esta webapp desde tu blog o foro, favoreces el rastreo mutuo y la autoridad de posicionamiento web.</li>
                      </ul>
                    )}
                  </div>
                </div>

              </div>
              
            </div>

          </div>

          {/* Footer banner */}
          <div className="px-6 py-4 bg-void border-t border-umber flex items-center justify-between text-[10px] text-vellum/30">
            <span>Powered by CartoCraft Open Integration Engine</span>
            <span className="text-gold/40">© 2026</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
