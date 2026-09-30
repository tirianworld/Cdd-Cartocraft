import { useState, useEffect, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Folder, Image as ImageIcon, Map as MapIcon, Plus, Upload, Palette, FolderPlus } from "lucide-react";
import { Folder as FolderType, Map as MapType } from "../types";
import ColorWheelPicker from "./ColorWheelPicker";

interface FolderModalProps {
  show: boolean;
  folder: FolderType | null;
  folders?: FolderType[];
  defaultParentId?: string;
  onClose: () => void;
  onSaved: (name: string, color: string, parentId?: string) => Promise<void>;
}

export function FolderModal({ show, folder, folders = [], defaultParentId, onClose, onSaved }: FolderModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#d0e8ee");
  const [parentId, setParentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color || "#d0e8ee");
      setParentId(folder.parent_id || "");
    } else {
      setName("");
      setColor("#d0e8ee");
      setParentId(defaultParentId || "");
    }
  }, [folder, show, defaultParentId]);

  // Helper to prevent circular folder nesting
  const isDescendant = (candidateId: string, currentFolderId: string): boolean => {
    let curr = folders.find((f) => f.id === candidateId);
    while (curr && curr.parent_id) {
      if (curr.parent_id === currentFolderId) return true;
      curr = folders.find((f) => f.id === curr?.parent_id);
    }
    return false;
  };

  const availableParents = folders.filter(
    (f) => !folder || (f.id !== folder.id && !isDescendant(f.id, folder.id))
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onSaved(name.trim(), color, parentId || undefined);
    setIsSubmitting(false);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md max-h-[90vh] rounded-2xl bg-void/95 border border-umber shadow-2xl overflow-y-auto p-5 space-y-4 my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-umber sticky top-0 bg-void/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center border shadow-sm"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
            >
              <Folder size={14} style={{ color }} />
            </div>
            <h3 className="font-heading text-xs uppercase tracking-wider text-vellum font-bold">
              {folder ? "Editar Carpeta" : "Nueva Carpeta"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-sepia border border-umber text-vellum/40 hover:text-vellum flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-body">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Nombre de Carpeta</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Campaña del Oeste, Mazmorras..."
              className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center gap-1">
              <Folder size={10} className="text-gold" />
              Ubicación / Carpeta Padre
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-sepia/50 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none appearance-none cursor-pointer text-xs"
            >
              <option value="">Ninguna (Carpeta de Raíz / Principal)</option>
              {availableParents.map((f) => {
                const isSub = !!f.parent_id;
                return (
                  <option key={f.id} value={f.id}>
                    {isSub ? "  ↳ 📁 Subcarpeta: " : "📂 Carpeta: "} {f.name}
                  </option>
                );
              })}
            </select>
            <p className="text-[9px] text-vellum/30 italic">
              Las subcarpetas se muestran como tarjetas interactivas dentro de su carpeta contenedora.
            </p>
          </div>

          {/* Interactive Color Wheel Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold flex items-center gap-1">
              <Palette size={10} className="text-gold" />
              Rueda de Color de la Carpeta
            </label>
            <ColorWheelPicker color={color} onChange={setColor} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-umber bg-sepia/20 text-vellum/60 hover:bg-sepia/40 hover:text-vellum transition-all cursor-pointer text-center font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text font-bold hover:bg-emerald-bg/80 transition-all disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
            >
              {folder ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface MapModalProps {
  show: boolean;
  map: MapType | null;
  folders: FolderType[];
  maps: MapType[];
  onClose: () => void;
  onSaved: (mapData: Partial<MapType>) => Promise<void>;
  defaultFolderId?: string;
}

export function MapModal({ show, map, folders, maps, onClose, onSaved, defaultFolderId }: MapModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [folderId, setFolderId] = useState("");
  const [initialZoomPercent, setInitialZoomPercent] = useState(100);
  const [parentMapId, setParentMapId] = useState("");
  const [musicUrl, setMusicUrl] = useState("");

  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (map) {
      setName(map.name);
      setDescription(map.description || "");
      setCoverImage(map.cover_image || "");
      setFolderId(map.folder_id || "");
      setInitialZoomPercent(Math.round((map.initial_zoom || 1) * 100));
      setParentMapId(map.parent_map_id || "");
      setMusicUrl(map.music_url || "");
    } else {
      setName("");
      setDescription("");
      setCoverImage("");
      setFolderId(defaultFolderId || "");
      setInitialZoomPercent(100);
      setParentMapId("");
      setMusicUrl("");
    }
    setImageMode("url");
  }, [map, show, defaultFolderId]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoverImage(e.target.result as string);
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
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const mapData: Partial<MapType> = {
      name: name.trim(),
      description: description.trim(),
      cover_image: coverImage.trim() || undefined,
      folder_id: folderId || undefined,
      initial_zoom: initialZoomPercent / 100,
      parent_map_id: parentMapId || undefined,
      music_url: musicUrl.trim() || undefined,
    };

    await onSaved(mapData);
    setIsSubmitting(false);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md rounded-2xl bg-void/95 border border-umber shadow-2xl overflow-hidden p-5 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-umber">
          <div className="flex items-center gap-2">
            <MapIcon size={16} className="text-gold" />
            <h3 className="font-heading text-xs uppercase tracking-wider text-vellum font-bold">
              {map ? "Ajustes del Mapa" : "Crear Nuevo Mapa"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-sepia border border-umber text-vellum/40 hover:text-vellum flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-body">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Título del Mapa</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cartografía de Eldoria, El Mar del Olvido..."
              className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Descripción del Lore</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Un plano detallado del reino legendario..."
              className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs"
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Carpeta contenedora</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-sepia/50 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none appearance-none cursor-pointer text-xs"
            >
              <option value="">Ninguna carpeta (Raíz)</option>
              {folders.map((f) => {
                const isSub = !!f.parent_id;
                return (
                  <option key={f.id} value={f.id}>
                    {isSub ? "  ↳ 📁 " : "📂 "} {f.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Initial Zoom (Percentage) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Zoom Inicial al Cargar</label>
              <span className="text-gold font-mono font-bold text-xs">{initialZoomPercent}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={initialZoomPercent}
              onChange={(e) => setInitialZoomPercent(Number(e.target.value))}
              className="w-full h-1 bg-sepia rounded-lg appearance-none cursor-pointer accent-gold border border-umber/40"
            />
          </div>

          {/* Parent Map Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Mapa Padre (Vínculo Superior)</label>
            <select
              value={parentMapId}
              onChange={(e) => setParentMapId(e.target.value)}
              className="w-full bg-sepia/50 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none appearance-none cursor-pointer text-xs"
            >
              <option value="">Ninguno (Mapa principal / raíz)</option>
              {maps
                .filter((m) => !map || m.id !== map.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Música en Bucle */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">URL de Música (Bucle de fondo)</label>
            <input
              type="url"
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              placeholder="Ej. URL de audio .mp3, .ogg, .wav..."
              className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs text-ellipsis"
            />
          </div>

          {/* Canvas cover image url or upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-vellum/40 font-semibold">Imagen del Canvas (Fondo)</label>
              <div className="flex gap-2 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-2 py-0.5 rounded ${imageMode === "url" ? "bg-gold/20 text-gold font-bold" : "text-vellum/30"}`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`px-2 py-0.5 rounded ${imageMode === "upload" ? "bg-gold/20 text-gold font-bold" : "text-vellum/30"}`}
                >
                  SUBIR
                </button>
              </div>
            </div>

            {imageMode === "url" ? (
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-... o deja vacío"
                className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-xl px-3 py-2.5 text-vellum outline-none transition-all placeholder:text-vellum/20 text-xs text-ellipsis"
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
                  id="map-image-file"
                />
                <label htmlFor="map-image-file" className="cursor-pointer w-full flex flex-col items-center justify-center">
                  {coverImage ? (
                    <div className="relative group w-full h-24 rounded overflow-hidden">
                      <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-void/75 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity">
                        Cambiar Imagen
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={18} className="text-gold/40" />
                      <span className="font-semibold text-[10px] uppercase mt-1">Arrastra o haz clic aquí</span>
                      <span className="text-[8px] text-vellum/20">Soporta PNG, JPG, WebP de alta resolución</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-umber bg-sepia/20 text-vellum/60 hover:bg-sepia/40 hover:text-vellum transition-all cursor-pointer text-center font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text font-bold hover:bg-emerald-bg/80 transition-all disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
            >
              {map ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
