import { motion } from "motion/react";
import Markdown from "react-markdown";
import { X, Edit2, Trash2, ArrowRight, BookOpen, Clock, Calendar, Maximize2 } from "lucide-react";
import { Marker, Map } from "../types";

interface MarkerDrawerProps {
  marker: Marker;
  linkedMap: Map | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToSubmap: (mapId: string) => void;
  onFocusMarker?: (marker: Marker) => void;
  readOnly?: boolean;
}

export default function MarkerDrawer({
  marker,
  linkedMap,
  onClose,
  onEdit,
  onDelete,
  onNavigateToSubmap,
  onFocusMarker,
  readOnly = false,
}: MarkerDrawerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 185 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-96 bg-void/90 backdrop-blur-2xl border-l border-umber shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Floating Top Controls Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto w-8 h-8 rounded-full bg-void/80 border border-umber text-vellum/50 hover:text-vellum flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Cerrar panel"
        >
          <X size={14} />
        </button>

        {!readOnly && (
          <div className="flex gap-1.5 pointer-events-auto">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-full bg-void/80 border border-umber text-vellum/50 hover:text-gold flex items-center justify-center transition-all cursor-pointer shadow-lg"
              title="Editar lugar"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-full bg-void/80 border border-umber text-vellum/50 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-lg"
              title="Eliminar lugar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Content wrapper */}
      <div className="flex-1 overflow-y-auto">
        {/* Cover Place image header */}
        {marker.image ? (
          <div className="w-full h-48 sm:h-56 relative bg-sepia overflow-hidden">
            <img
              src={marker.image}
              alt={marker.name}
              className="w-full h-full object-cover select-none pointer-events-none"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
            {/* Dark visual gradient mask overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/45 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-24 bg-gradient-to-b from-sepia to-void border-b border-umber/35" />
        )}

        <div className="px-5 pb-8 space-y-6">
          {/* Header titles */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-body uppercase tracking-[0.2em] font-bold">
              <span className="text-gold/80">
                ✦ Categoría:{" "}
                {marker.category === "painted_zone"
                  ? "Zona Pintada"
                  : marker.category === "region"
                  ? "Región Circular"
                  : marker.category === "layer"
                  ? "Capa"
                  : marker.category === "ambient"
                  ? "Ambiente"
                  : "General"}
              </span>
              {marker.area_points && marker.area_points.length >= 3 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-normal bg-amber-bg/30 text-amber-text border border-amber-border/40 flex items-center gap-1">
                  <span>🖌️</span>
                  <span>{marker.area_points.length} puntos</span>
                </span>
              )}
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-wider text-vellum leading-tight">
              {marker.name}
            </h2>
            {marker.description && (
              <p className="font-lore text-vellum/50 italic text-sm leading-relaxed">
                {marker.description}
              </p>
            )}

            {/* Focus entire area button */}
            {onFocusMarker && (
              <button
                type="button"
                onClick={() => onFocusMarker(marker)}
                className="w-full py-2 px-3 rounded-xl bg-sepia/70 hover:bg-gold/20 border border-umber/60 hover:border-gold/40 text-vellum hover:text-gold text-xs font-heading uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Maximize2 size={13} className="text-gold" />
                <span>
                  {marker.area_points && marker.area_points.length >= 3
                    ? "Encuadrar toda el área de la zona"
                    : marker.area_radius
                    ? "Encuadrar región completa"
                    : "Centrar en mapa"}
                </span>
              </button>
            )}
          </div>

          {/* Linked sub-map navigation button */}
          {linkedMap && (
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="p-4 rounded-xl bg-emerald-bg/30 border border-emerald-border/60 flex flex-col gap-2.5 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#d0e8ee] animate-ping" />
                <span className="font-heading text-[10px] uppercase tracking-widest text-emerald-text font-bold">
                  Submapa Disponible
                </span>
              </div>
              <p className="text-vellum/60 text-xs leading-relaxed font-body">
                Este marcador está vinculado al submapa <strong className="text-vellum font-semibold">"{linkedMap.name}"</strong>.
              </p>
              <button
                onClick={() => onNavigateToSubmap(linkedMap.id)}
                className="w-full py-2.5 px-3 bg-emerald-bg border border-emerald-border text-emerald-text rounded-lg font-heading text-[11px] uppercase tracking-[0.15em] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-bg/80 transition-colors cursor-pointer mt-1 shadow-md"
              >
                <span>Navegar al submapa</span>
                <ArrowRight size={12} strokeWidth={2.5} className="text-emerald-text" />
              </button>
            </motion.div>
          )}

          {/* Lore / Long Notes Markdown Container */}
          {marker.notes ? (
            <div className="space-y-2.5 pt-2 border-t border-umber/40">
              <h4 className="font-heading text-[10px] uppercase tracking-widest text-vellum/40 flex items-center gap-1.5 font-bold">
                <BookOpen size={11} className="text-gold/60" />
                Crónicas e Historia del Lore
              </h4>
              <div className="markdown-body">
                <Markdown>{marker.notes}</Markdown>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-4 border-t border-umber/40 text-center py-6">
              <BookOpen size={24} className="text-vellum/10 mx-auto" />
              <p className="font-lore text-vellum/20 text-xs italic">
                No hay notas ni leyendas añadidas para este lugar.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
