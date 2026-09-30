import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  FolderOpen,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Trash2,
  Plus,
  Search,
  Calendar,
  Layers,
  Sparkles,
  FolderPlus,
  CornerDownRight,
  GripVertical,
  FolderInput,
  CheckCircle2,
  Home,
  Move,
  ArrowDownUp,
  GitBranch,
  CloudDownload,
} from "lucide-react";
import { Folder as FolderType, Map as MapType } from "../types";
import { detectPlanarTheme, PLANAR_THEMES } from "../utils/planarThemes";

interface FolderGridProps {
  folders: FolderType[];
  maps: MapType[];
  onSelectMap: (mapId: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onEditMap: (map: MapType) => void;
  onDeleteMap: (mapId: string) => Promise<void>;
  onCreateFolder: (parentId?: string) => void;
  onCreateMap: (folderId?: string) => void;
  onUpdateFolders?: (folders: FolderType[]) => void;
  onUpdateMaps?: (maps: MapType[]) => void;
  onSyncGitHub?: () => void;
  isSyncingGitHub?: boolean;
  onLoadGitHub?: () => void;
  isFetchingGitHub?: boolean;
}

// Dragged item payload definition
interface DragItem {
  type: "map" | "folder";
  id: string;
  name: string;
  currentFolderId?: string; // folder_id or parent_id
  coverImage?: string;
  color?: string;
}

// Active drop target specification
interface DropTarget {
  type: "folder_header" | "subfolder_card" | "breadcrumb" | "root_zone" | "reorder";
  targetFolderId?: string; // target destination folder (or undefined for root)
  targetItemId?: string; // for reordering: the item adjacent to drop
  targetItemType?: "map" | "folder";
  position?: "before" | "after"; // for reorder slot
  folderName?: string;
}

export default function FolderGrid({
  folders,
  maps,
  onSelectMap,
  onEditFolder,
  onDeleteFolder,
  onEditMap,
  onDeleteMap,
  onCreateFolder,
  onCreateMap,
  onUpdateFolders,
  onUpdateMaps,
  onSyncGitHub,
  isSyncingGitHub = false,
  onLoadGitHub,
  isFetchingGitHub = false,
}: FolderGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  // Navigation breadcrumb path stack per root folder: rootFolderId -> [rootFolderId, subFolderId, ...]
  const [folderNav, setFolderNav] = useState<Record<string, string[]>>({});

  // Pointer Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDropTarget, setActiveDropTarget] = useState<DropTarget | null>(null);

  // Floating preview element ref for zero-latency direct DOM positioning
  const floatingPreviewRef = useRef<HTMLDivElement | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref tracking for pointer gestures
  const dragCandidateRef = useRef<{
    item: DragItem;
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);

  const isDraggingStateRef = useRef(false);
  const draggedItemRef = useRef<DragItem | null>(null);
  const activeDropTargetRef = useRef<DropTarget | null>(null);

  // Keep refs in sync
  isDraggingStateRef.current = isDragging;
  draggedItemRef.current = draggedItem;
  activeDropTargetRef.current = activeDropTarget;

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Helper to prevent circular folder nesting
  const isDescendant = useCallback(
    (candidateAncestorId: string, folderIdToCheck: string): boolean => {
      if (candidateAncestorId === folderIdToCheck) return true;
      let curr = folders.find((f) => f.id === candidateAncestorId);
      while (curr && curr.parent_id) {
        if (curr.parent_id === folderIdToCheck) return true;
        curr = folders.find((f) => f.id === curr?.parent_id);
      }
      return false;
    },
    [folders]
  );

  // Helper to find cover image of the first map in a folder or nested subfolders
  const getFirstMapCover = (folderId: string): string | undefined => {
    const directWithCover = maps.find((m) => m.folder_id === folderId && m.cover_image);
    if (directWithCover?.cover_image) return directWithCover.cover_image;

    const directAny = maps.find((m) => m.folder_id === folderId);
    if (directAny?.cover_image) return directAny.cover_image;

    const childFolders = folders
      .filter((f) => f.parent_id === folderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const child of childFolders) {
      const nestedCover = getFirstMapCover(child.id);
      if (nestedCover) return nestedCover;
    }
    return undefined;
  };

  // Helper to count total maps in a folder (including nested subfolders)
  const getTotalMapsCount = (folderId: string): number => {
    const directCount = maps.filter((m) => m.folder_id === folderId).length;
    const childFolders = folders.filter((f) => f.parent_id === folderId);
    const childCount = childFolders.reduce((acc, f) => acc + getTotalMapsCount(f.id), 0);
    return directCount + childCount;
  };

  // Filters logic
  const filteredMaps = maps.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const doesFolderMatch = (f: FolderType): boolean => {
    if (f.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    if (
      maps.some(
        (m) =>
          m.folder_id === f.id &&
          (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    )
      return true;

    const subfolders = folders.filter((child) => child.parent_id === f.id);
    return subfolders.some(doesFolderMatch);
  };

  const rootFolders = folders
    .filter((f) => !f.parent_id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const filteredRootFolders = rootFolders.filter(doesFolderMatch);

  const rootMaps = filteredMaps
    .filter((m) => !m.folder_id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // --- DROP EXECUTION LOGIC ---
  const executeDrop = useCallback(
    (dragged: DragItem, target: DropTarget) => {
      const { type: itemType, id: itemId, name: itemName, currentFolderId } = dragged;

      // CASE 1: Move item into a folder / subfolder or breadcrumb or root
      if (
        target.type === "folder_header" ||
        target.type === "subfolder_card" ||
        target.type === "breadcrumb" ||
        target.type === "root_zone"
      ) {
        const destinationFolderId = target.targetFolderId;
        const destFolderName = target.folderName || (destinationFolderId ? "la carpeta" : "la Raíz");

        if (currentFolderId === destinationFolderId) {
          showToast(`"${itemName}" ya está en ${destFolderName}.`);
          return;
        }

        if (itemType === "map") {
          const targetMaps = maps.filter((m) => m.folder_id === destinationFolderId && m.id !== itemId);
          const nextOrder = targetMaps.length > 0 ? Math.max(...targetMaps.map((m) => m.order ?? 0)) + 1 : 0;

          const updatedMaps = maps.map((m) => {
            if (m.id === itemId) {
              return {
                ...m,
                folder_id: destinationFolderId || undefined,
                order: nextOrder,
              };
            }
            return m;
          });

          if (onUpdateMaps) onUpdateMaps(updatedMaps);
          showToast(`✓ Plano "${itemName}" movido a ${destFolderName}`);
        } else if (itemType === "folder") {
          if (destinationFolderId && isDescendant(destinationFolderId, itemId)) {
            showToast(`⚠️ No puedes mover una carpeta dentro de sí misma.`);
            return;
          }

          const targetFolders = folders.filter(
            (f) => f.parent_id === destinationFolderId && f.id !== itemId
          );
          const nextOrder =
            targetFolders.length > 0 ? Math.max(...targetFolders.map((f) => f.order ?? 0)) + 1 : 0;

          const updatedFolders = folders.map((f) => {
            if (f.id === itemId) {
              return {
                ...f,
                parent_id: destinationFolderId || undefined,
                order: nextOrder,
              };
            }
            return f;
          });

          if (onUpdateFolders) onUpdateFolders(updatedFolders);
          showToast(`✓ Carpeta "${itemName}" movida a ${destFolderName}`);
        }
      }

      // CASE 2: Reorder items inside current container
      else if (target.type === "reorder" && target.targetItemId) {
        const { targetItemId, targetItemType, position, targetFolderId } = target;

        if (itemId === targetItemId) return;

        if (itemType === "map" && targetItemType === "map") {
          const currentMapsInContainer = maps
            .filter((m) => (m.folder_id || undefined) === (targetFolderId || undefined))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          const itemToMove = currentMapsInContainer.find((m) => m.id === itemId);
          if (!itemToMove) {
            const remainingMaps = currentMapsInContainer.filter((m) => m.id !== itemId);
            const targetIndex = remainingMaps.findIndex((m) => m.id === targetItemId);
            const insertIndex = position === "before" ? Math.max(0, targetIndex) : targetIndex + 1;
            const mapObj = maps.find((m) => m.id === itemId);
            if (mapObj) {
              const movedMap = { ...mapObj, folder_id: targetFolderId || undefined };
              remainingMaps.splice(insertIndex, 0, movedMap);
              const reorderedMapIds = new Map(remainingMaps.map((m, idx) => [m.id, idx]));
              const updatedMaps = maps.map((m) => {
                if (reorderedMapIds.has(m.id)) {
                  return {
                    ...m,
                    folder_id: targetFolderId || undefined,
                    order: reorderedMapIds.get(m.id),
                  };
                }
                return m;
              });
              if (onUpdateMaps) onUpdateMaps(updatedMaps);
              showToast(`✓ Plano "${itemName}" movido y reordenado`);
            }
          } else {
            const remainingMaps = currentMapsInContainer.filter((m) => m.id !== itemId);
            const targetIndex = remainingMaps.findIndex((m) => m.id === targetItemId);
            const insertIndex = position === "before" ? Math.max(0, targetIndex) : targetIndex + 1;
            remainingMaps.splice(insertIndex, 0, itemToMove);

            const reorderedMapIds = new Map(remainingMaps.map((m, idx) => [m.id, idx]));
            const updatedMaps = maps.map((m) => {
              if (reorderedMapIds.has(m.id)) {
                return { ...m, order: reorderedMapIds.get(m.id) };
              }
              return m;
            });
            if (onUpdateMaps) onUpdateMaps(updatedMaps);
            showToast(`✓ Plano "${itemName}" reordenado`);
          }
        } else if (itemType === "folder" && targetItemType === "folder") {
          const currentFoldersInContainer = folders
            .filter((f) => (f.parent_id || undefined) === (targetFolderId || undefined))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          const itemToMove = currentFoldersInContainer.find((f) => f.id === itemId);
          if (!itemToMove) {
            if (targetFolderId && isDescendant(targetFolderId, itemId)) {
              showToast(`⚠️ No puedes mover una carpeta dentro de sí misma.`);
              return;
            }
            const remainingFolders = currentFoldersInContainer.filter((f) => f.id !== itemId);
            const targetIndex = remainingFolders.findIndex((f) => f.id === targetItemId);
            const insertIndex = position === "before" ? Math.max(0, targetIndex) : targetIndex + 1;
            const folderObj = folders.find((f) => f.id === itemId);
            if (folderObj) {
              const movedFolder = { ...folderObj, parent_id: targetFolderId || undefined };
              remainingFolders.splice(insertIndex, 0, movedFolder);
              const reorderedFolderIds = new Map(remainingFolders.map((f, idx) => [f.id, idx]));
              const updatedFolders = folders.map((f) => {
                if (reorderedFolderIds.has(f.id)) {
                  return {
                    ...f,
                    parent_id: targetFolderId || undefined,
                    order: reorderedFolderIds.get(f.id),
                  };
                }
                return f;
              });
              if (onUpdateFolders) onUpdateFolders(updatedFolders);
              showToast(`✓ Carpeta "${itemName}" movida y reordenada`);
            }
          } else {
            const remainingFolders = currentFoldersInContainer.filter((f) => f.id !== itemId);
            const targetIndex = remainingFolders.findIndex((f) => f.id === targetItemId);
            const insertIndex = position === "before" ? Math.max(0, targetIndex) : targetIndex + 1;
            remainingFolders.splice(insertIndex, 0, itemToMove);

            const reorderedFolderIds = new Map(remainingFolders.map((f, idx) => [f.id, idx]));
            const updatedFolders = folders.map((f) => {
              if (reorderedFolderIds.has(f.id)) {
                return { ...f, order: reorderedFolderIds.get(f.id) };
              }
              return f;
            });
            if (onUpdateFolders) onUpdateFolders(updatedFolders);
            showToast(`✓ Carpeta "${itemName}" reordenada`);
          }
        }
      }
    },
    [folders, maps, isDescendant, onUpdateFolders, onUpdateMaps]
  );

  // --- HIT TESTING HELPER FOR POINTER MOVE ---
  const detectDropTarget = useCallback(
    (clientX: number, clientY: number, dragged: DragItem): DropTarget | null => {
      const elements = document.elementsFromPoint(clientX, clientY);

      for (const el of elements) {
        const htmlEl = el as HTMLElement;

        // 1. Root drop zone
        if (htmlEl.dataset.dropZone === "root_zone") {
          return {
            type: "root_zone",
            targetFolderId: undefined,
            folderName: "la Raíz (sin carpeta)",
          };
        }

        // 2. Breadcrumbs
        if (htmlEl.dataset.dropZone === "breadcrumb") {
          const folderId = htmlEl.dataset.folderId;
          const folderName = htmlEl.dataset.folderName;
          if (folderId) {
            if (dragged.type === "folder" && isDescendant(folderId, dragged.id)) {
              continue;
            }
            return {
              type: "breadcrumb",
              targetFolderId: folderId,
              folderName: folderName || "la carpeta",
            };
          }
        }

        // 3. Folder Header
        if (htmlEl.dataset.dropZone === "folder_header") {
          const folderId = htmlEl.dataset.folderId;
          const folderName = htmlEl.dataset.folderName;
          if (folderId) {
            if (dragged.type === "folder" && isDescendant(folderId, dragged.id)) {
              continue;
            }
            return {
              type: "folder_header",
              targetFolderId: folderId,
              folderName: folderName || "la carpeta",
            };
          }
        }

        // 4. Subfolder Card
        if (htmlEl.dataset.dropZone === "subfolder_card") {
          const folderId = htmlEl.dataset.folderId;
          const folderName = htmlEl.dataset.folderName;
          const parentId = htmlEl.dataset.parentId;

          if (folderId && folderId !== dragged.id) {
            if (dragged.type === "folder" && isDescendant(folderId, dragged.id)) {
              continue;
            }

            // If dragging a map onto a subfolder card, always drop inside!
            if (dragged.type === "map") {
              return {
                type: "subfolder_card",
                targetFolderId: folderId,
                folderName: folderName || "la subcarpeta",
              };
            }

            // If dragging another folder: center drops inside, edges reorder
            const rect = htmlEl.getBoundingClientRect();
            const relX = (clientX - rect.left) / rect.width;

            if (relX > 0.2 && relX < 0.8) {
              return {
                type: "subfolder_card",
                targetFolderId: folderId,
                folderName: folderName || "la subcarpeta",
              };
            } else {
              return {
                type: "reorder",
                targetItemId: folderId,
                targetItemType: "folder",
                position: relX <= 0.2 ? "before" : "after",
                targetFolderId: parentId || undefined,
              };
            }
          }
        }

        // 5. Empty Folder Zone
        if (htmlEl.dataset.dropZone === "empty_folder_zone") {
          const folderId = htmlEl.dataset.folderId;
          const folderName = htmlEl.dataset.folderName;
          if (folderId) {
            if (dragged.type === "folder" && isDescendant(folderId, dragged.id)) {
              continue;
            }
            return {
              type: "subfolder_card",
              targetFolderId: folderId,
              folderName: folderName || "la carpeta",
            };
          }
        }

        // 6. Map Card (for reordering)
        if (htmlEl.dataset.dropZone === "map_card") {
          const mapId = htmlEl.dataset.mapId;
          const containerFolderId = htmlEl.dataset.folderId;

          if (mapId && mapId !== dragged.id) {
            const rect = htmlEl.getBoundingClientRect();
            const relX = (clientX - rect.left) / rect.width;
            return {
              type: "reorder",
              targetItemId: mapId,
              targetItemType: "map",
              position: relX <= 0.5 ? "before" : "after",
              targetFolderId: containerFolderId || undefined,
            };
          }
        }
      }

      return null;
    },
    [isDescendant]
  );

  // --- GLOBAL POINTER & DRAG LISTENERS ---
  useEffect(() => {
    // Prevent browser native image drag which interrupts pointermove
    const handleNativeDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragstart", handleNativeDragStart);

    const handleWindowPointerMove = (e: PointerEvent) => {
      const candidate = dragCandidateRef.current;
      if (!candidate) return;

      const deltaX = e.clientX - candidate.startX;
      const deltaY = e.clientY - candidate.startY;
      const dist = Math.hypot(deltaX, deltaY);

      // Trigger active drag if moved past 3 pixels
      if (!isDraggingStateRef.current && dist > 3) {
        setIsDragging(true);
        isDraggingStateRef.current = true;
        setDraggedItem(candidate.item);
        draggedItemRef.current = candidate.item;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      if (isDraggingStateRef.current && draggedItemRef.current) {
        setCursorPos({ x: e.clientX, y: e.clientY });

        // Update floating preview DOM element directly for 0ms lag
        if (floatingPreviewRef.current) {
          floatingPreviewRef.current.style.transform = `translate3d(${e.clientX - 100}px, ${e.clientY - 50}px, 0) rotate(3deg) scale(1.04)`;
        }

        const target = detectDropTarget(e.clientX, e.clientY, draggedItemRef.current);
        setActiveDropTarget(target);
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      const wasDragging = isDraggingStateRef.current;
      const dragged = draggedItemRef.current;
      const target = activeDropTargetRef.current;

      // Clean up body styles and state
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      dragCandidateRef.current = null;
      setIsDragging(false);
      isDraggingStateRef.current = false;
      setDraggedItem(null);
      draggedItemRef.current = null;
      setActiveDropTarget(null);
      activeDropTargetRef.current = null;

      // Execute drop if it was an active drag gesture
      if (wasDragging && dragged && target) {
        executeDrop(dragged, target);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("dragstart", handleNativeDragStart);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [detectDropTarget, executeDrop]);

  // Handler to initiate drag candidate on pointer down
  const startDragCandidate = (e: React.PointerEvent, item: DragItem) => {
    // Only primary mouse button (0) or touch
    if (e.button !== 0) return;

    dragCandidateRef.current = {
      item,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
    };
  };

  // --- RENDER MAP CARD ---
  const renderMapCard = (m: MapType, containerFolderId?: string) => {
    const totalGlows = m.emissive_colors?.length || 0;
    const totalWaters = m.water_colors?.length || 0;
    const isBeingDragged = isDragging && draggedItem?.id === m.id;

    // Detect planar theme for transition badge
    const mapFolder = folders.find((f) => f.id === m.folder_id);
    const parentFolder = folders.find((f) => f.id === mapFolder?.parent_id);
    const planarThemeKey = detectPlanarTheme(m, mapFolder, parentFolder);
    const planarTheme = PLANAR_THEMES[planarThemeKey];

    const isReorderTargetBefore =
      isDragging &&
      activeDropTarget?.type === "reorder" &&
      activeDropTarget.targetItemId === m.id &&
      activeDropTarget.position === "before";
    const isReorderTargetAfter =
      isDragging &&
      activeDropTarget?.type === "reorder" &&
      activeDropTarget.targetItemId === m.id &&
      activeDropTarget.position === "after";

    return (
      <div key={m.id} className="relative group/card select-none touch-none">
        {/* Reorder insertion indicator: Before */}
        {isReorderTargetBefore && (
          <div className="absolute -left-2.5 top-0 bottom-0 w-2.5 bg-gold rounded-full shadow-[0_0_25px_#d4af37] z-30 pointer-events-none animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-6 bg-white rounded-full" />
          </div>
        )}

        <div
          data-drop-zone="map_card"
          data-map-id={m.id}
          data-folder-id={containerFolderId || ""}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            startDragCandidate(e, {
              type: "map",
              id: m.id,
              name: m.name,
              currentFolderId: m.folder_id || undefined,
              coverImage: m.cover_image,
            });
          }}
          onClick={() => {
            if (isDragging) return;
            onSelectMap(m.id);
          }}
          className={`relative h-48 rounded-2xl bg-sepia/30 border transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col justify-end p-4 overflow-hidden select-none touch-none ${
            isBeingDragged
              ? "opacity-25 scale-95 border-gold/90 border-dashed bg-gold/10 shadow-inner"
              : "border-umber/60 hover:border-gold/60 hover:-translate-y-1 hover:shadow-2xl"
          }`}
        >
          {/* Background Canvas Cover image */}
          {m.cover_image ? (
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
              <img
                src={m.cover_image}
                alt={m.name}
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 pointer-events-none select-none"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-void/30 opacity-60 group-hover/card:opacity-0 transition-opacity pointer-events-none" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-sepia/80 via-void to-umber/60 flex items-center justify-center opacity-80 pointer-events-none select-none">
              <MapIcon size={36} className="text-vellum/5 opacity-10 group-hover/card:opacity-20 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent pointer-events-none" />
            </div>
          )}

          {/* Ambient details count stickers */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1 items-center pointer-events-none max-w-[80%]">
            <div
              className="px-1.5 py-1 rounded-md bg-void/90 border border-umber/70 text-vellum/40 group-hover/card:text-gold transition-colors flex items-center shadow-sm"
              title="Arrastra para mover a otra carpeta o reordenar"
            >
              <GripVertical size={12} />
            </div>

            {planarThemeKey !== "classic" && (
              <span
                className="px-2 py-0.5 rounded-md text-[9px] font-mono flex items-center gap-1 shadow-sm border backdrop-blur-md"
                style={{
                  backgroundColor: `${planarTheme.accentColor}25`,
                  borderColor: `${planarTheme.accentColor}60`,
                  color: planarTheme.accentColor,
                }}
                title={`Transición Planar: ${planarTheme.planeTitle}`}
              >
                <span>{planarTheme.icon}</span> {planarTheme.planeTitle}
              </span>
            )}

            {totalGlows > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-void/85 border border-emerald-border/60 text-[9px] font-mono text-emerald-text flex items-center gap-1 shadow-sm">
                <Sparkles size={8} /> Glow
              </span>
            )}
            {totalWaters > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-void/85 border border-sky-500/30 text-[9px] font-mono text-sky-400 flex items-center gap-1">
                <Layers size={8} /> Agua
              </span>
            )}
            {m.weather_effect && m.weather_effect !== "none" && (
              <span className="px-2 py-0.5 rounded-md bg-void/85 border border-teal-500/30 text-[9px] font-mono text-teal-400">
                Clima
              </span>
            )}
          </div>

          {/* Card Operations Header */}
          <div className="absolute top-3 right-3 z-20 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEditMap(m);
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-gold flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Ajustes de mapa"
            >
              <Edit2 size={11} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar el mapa "${m.name}"? Se perderán todos sus marcadores y luces.`)) {
                  onDeleteMap(m.id);
                }
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-red-400 flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Eliminar mapa"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Text Details overlay */}
          <div className="relative z-10 space-y-1 pointer-events-none select-none">
            <h4 className="font-heading text-sm text-vellum font-bold leading-tight group-hover/card:text-emerald-text transition-colors tracking-wide truncate">
              {m.name}
            </h4>
            <p className="font-lore text-vellum/50 text-[11px] leading-relaxed line-clamp-2 italic pr-2">
              {m.description || "Un lienzo listo para tus leyendas de rol."}
            </p>
            <div className="flex items-center gap-1 text-[9px] font-mono text-vellum/30 pt-1">
              <Calendar size={9} />
              <span>{m.created_date ? new Date(m.created_date).toLocaleDateString() : "Ancestral"}</span>
            </div>
          </div>
        </div>

        {/* Reorder insertion indicator: After */}
        {isReorderTargetAfter && (
          <div className="absolute -right-2.5 top-0 bottom-0 w-2.5 bg-gold rounded-full shadow-[0_0_25px_#d4af37] z-30 pointer-events-none animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-6 bg-white rounded-full" />
          </div>
        )}
      </div>
    );
  };

  // --- RENDER SUBFOLDER CARD ---
  const renderSubfolderCard = (subfolder: FolderType, rootFolderId: string, currentParentId?: string) => {
    const totalMaps = getTotalMapsCount(subfolder.id);
    const childSubfolders = folders.filter((f) => f.parent_id === subfolder.id);
    const coverImg = getFirstMapCover(subfolder.id);
    const folderColor = subfolder.color || "#d0e8ee";

    const isBeingDragged = isDragging && draggedItem?.id === subfolder.id;
    const isDropTargetInside =
      isDragging &&
      activeDropTarget?.type === "subfolder_card" &&
      activeDropTarget.targetFolderId === subfolder.id;

    const isReorderTargetBefore =
      isDragging &&
      activeDropTarget?.type === "reorder" &&
      activeDropTarget.targetItemId === subfolder.id &&
      activeDropTarget.position === "before";
    const isReorderTargetAfter =
      isDragging &&
      activeDropTarget?.type === "reorder" &&
      activeDropTarget.targetItemId === subfolder.id &&
      activeDropTarget.position === "after";

    return (
      <div key={subfolder.id} className="relative group/subcard select-none touch-none">
        {/* Reorder indicator Before */}
        {isReorderTargetBefore && (
          <div className="absolute -left-2.5 top-0 bottom-0 w-2.5 bg-gold rounded-full shadow-[0_0_25px_#d4af37] z-30 pointer-events-none animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-6 bg-white rounded-full" />
          </div>
        )}

        <div
          data-drop-zone="subfolder_card"
          data-folder-id={subfolder.id}
          data-folder-name={subfolder.name}
          data-parent-id={currentParentId || ""}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            startDragCandidate(e, {
              type: "folder",
              id: subfolder.id,
              name: subfolder.name,
              currentFolderId: subfolder.parent_id || undefined,
              coverImage: coverImg,
              color: folderColor,
            });
          }}
          onClick={() => {
            if (isDragging) return;
            // Drill into this subfolder
            setFolderNav((prev) => {
              const currentPath = prev[rootFolderId] || [rootFolderId];
              return {
                ...prev,
                [rootFolderId]: [...currentPath, subfolder.id],
              };
            });
          }}
          className={`relative h-48 rounded-2xl bg-sepia/30 border transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col justify-end p-4 overflow-hidden select-none touch-none ${
            isBeingDragged
              ? "opacity-25 scale-95 border-dashed border-gold bg-gold/10 shadow-inner"
              : isDropTargetInside
              ? "ring-4 ring-gold border-gold bg-gold/30 scale-[1.03] shadow-[0_0_40px_rgba(212,175,55,0.7)] z-20"
              : "border-umber/70 hover:border-gold/60 hover:-translate-y-1 hover:shadow-2xl"
          }`}
          style={{
            borderColor: isDropTargetInside ? undefined : folderColor ? `${folderColor}50` : undefined,
          }}
        >
          {/* Background */}
          {coverImg ? (
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
              <img
                src={coverImg}
                alt={subfolder.name}
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/subcard:scale-105 pointer-events-none select-none"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-void/40 opacity-70 group-hover/subcard:opacity-10 transition-opacity pointer-events-none" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-sepia/90 via-void to-umber/70 flex items-center justify-center opacity-85 pointer-events-none select-none">
              <Folder size={44} style={{ color: folderColor }} className="opacity-15 group-hover/subcard:opacity-30 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent pointer-events-none" />
            </div>
          )}

          {/* Glowing Drop-Inside Overlay Banner when dragging over */}
          {isDropTargetInside && (
            <div className="absolute inset-0 z-30 bg-void/90 backdrop-blur-sm border-2 border-gold flex flex-col items-center justify-center p-3 text-center pointer-events-none animate-in fade-in zoom-in duration-100">
              <FolderInput size={36} className="text-gold mb-1.5 animate-bounce" />
              <p className="font-heading text-xs uppercase font-extrabold text-gold tracking-wider">
                Soltar para meter aquí
              </p>
              <p className="font-body text-[11px] text-vellum font-semibold truncate max-w-full px-2">
                Subcarpeta "{subfolder.name}"
              </p>
            </div>
          )}

          {/* Top-Left Tag */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 items-center pointer-events-none">
            <div
              className="px-1.5 py-1 rounded-md bg-void/90 border border-umber/70 text-vellum/40 group-hover/subcard:text-gold transition-colors flex items-center shadow-sm"
              title="Arrastra para mover o reordenar"
            >
              <GripVertical size={12} />
            </div>

            <span
              className="px-2.5 py-1 rounded-lg bg-void/90 backdrop-blur-md border text-[10px] font-heading uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-lg"
              style={{
                borderColor: folderColor,
                color: folderColor,
              }}
            >
              <Folder size={11} style={{ color: folderColor }} />
              <span>Subcarpeta</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-void/80 backdrop-blur-md border border-umber/60 text-[9px] font-mono text-vellum/70 flex items-center gap-1 shadow-sm">
              <span>{totalMaps} {totalMaps === 1 ? "mapa" : "mapas"}</span>
              {childSubfolders.length > 0 && <span>• {childSubfolders.length} sub</span>}
            </span>
          </div>

          {/* Top-Right Action buttons */}
          <div className="absolute top-3 right-3 z-20 flex gap-1 opacity-0 group-hover/subcard:opacity-100 transition-opacity">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCreateMap(subfolder.id);
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-emerald-text flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Crear mapa en esta subcarpeta"
            >
              <Plus size={11} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(subfolder.id);
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-gold flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Crear subcarpeta anidada"
            >
              <FolderPlus size={11} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEditFolder(subfolder);
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-gold flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Editar subcarpeta"
            >
              <Edit2 size={11} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar la subcarpeta "${subfolder.name}"? Los mapas que contenga se desvincularán.`)) {
                  onDeleteFolder(subfolder.id);
                }
              }}
              className="w-7 h-7 rounded-lg bg-void/90 border border-umber text-vellum/50 hover:text-red-400 flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="Eliminar subcarpeta"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Bottom Text and details */}
          <div className="relative z-10 space-y-1 pointer-events-none select-none">
            <h4
              className="font-heading text-sm font-bold leading-tight transition-colors tracking-wide truncate"
              style={{ color: folderColor }}
            >
              {subfolder.name}
            </h4>
            <p className="font-lore text-vellum/60 text-[11px] leading-relaxed line-clamp-1 italic">
              {totalMaps > 0
                ? `${totalMaps} plano${totalMaps !== 1 ? "s" : ""} • Clic para abrir`
                : "Subcarpeta vacía • Arrastra mapas aquí"}
            </p>
            <div className="flex items-center gap-1 text-[9px] font-mono text-vellum/40 pt-0.5">
              <span className="text-gold/80 font-bold flex items-center gap-1">
                <span>Abrir subcarpeta</span>
                <CornerDownRight size={10} />
              </span>
            </div>
          </div>
        </div>

        {/* Reorder indicator After */}
        {isReorderTargetAfter && (
          <div className="absolute -right-2.5 top-0 bottom-0 w-2.5 bg-gold rounded-full shadow-[0_0_25px_#d4af37] z-30 pointer-events-none animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-6 bg-white rounded-full" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 relative select-none">
      {/* --- FLOATING DRAG PREVIEW ELEMENT FOLLOWING THE MOUSE CURSOR --- */}
      {isDragging && draggedItem && (
        <div
          ref={floatingPreviewRef}
          style={{
            transform: `translate3d(${cursorPos.x - 100}px, ${cursorPos.y - 50}px, 0) rotate(3deg) scale(1.04)`,
          }}
          className="fixed top-0 left-0 z-[9999] pointer-events-none w-52 h-26 rounded-2xl bg-void/95 border-2 border-gold shadow-[0_15px_50px_rgba(212,175,55,0.85)] backdrop-blur-md overflow-hidden flex flex-col justify-end p-3.5 transition-none select-none"
        >
          {draggedItem.coverImage ? (
            <div className="absolute inset-0 z-0">
              <img
                src={draggedItem.coverImage}
                alt={draggedItem.name}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-sepia/80 flex items-center justify-center">
              {draggedItem.type === "map" ? (
                <MapIcon size={32} className="text-gold/40" />
              ) : (
                <Folder size={32} style={{ color: draggedItem.color || "#d0e8ee" }} className="opacity-50" />
              )}
            </div>
          )}

          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-gold text-void font-heading text-[8.5px] font-extrabold uppercase tracking-wider shadow-sm">
                {draggedItem.type === "map" ? "Plano" : "Carpeta"}
              </span>
              {activeDropTarget ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-text text-void font-heading text-[8.5px] font-bold uppercase tracking-wider truncate shadow-sm">
                  {activeDropTarget.type === "subfolder_card"
                    ? `Meter en ${activeDropTarget.folderName}`
                    : activeDropTarget.type === "folder_header"
                    ? `Mover a ${activeDropTarget.folderName}`
                    : activeDropTarget.type === "breadcrumb"
                    ? `Subir a ${activeDropTarget.folderName}`
                    : activeDropTarget.type === "root_zone"
                    ? `Mover a Raíz`
                    : `Reordenar`}
                </span>
              ) : (
                <span className="text-[9px] font-mono text-gold/90 font-bold italic flex items-center gap-1">
                  <Move size={10} /> Moviendo con ratón
                </span>
              )}
            </div>
            <p className="font-heading text-xs font-bold text-vellum truncate drop-shadow">{draggedItem.name}</p>
          </div>
        </div>
      )}

      {/* Visual Floating Toast for drag/drop status */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-void/95 border border-gold/60 text-gold shadow-2xl backdrop-blur-md flex items-center gap-2.5 font-heading text-xs tracking-wider pointer-events-none"
          >
            <CheckCircle2 size={16} className="text-gold" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent helper banner when dragging */}
      {isDragging && draggedItem && (
        <div className="p-3.5 rounded-2xl bg-gold/15 border border-gold/50 text-gold text-xs flex items-center justify-between gap-3 shadow-lg backdrop-blur-sm animate-pulse">
          <div className="flex items-center gap-2">
            <FolderInput size={18} className="animate-bounce" />
            <span>
              Arrastrando <strong>"{draggedItem.name}"</strong> con el ratón. Suelta sobre una carpeta para meterlo, o en un lateral para reordenar.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-void/90 rounded-lg border border-gold/40 shadow">
            Suelta el botón del ratón para soltar
          </span>
        </div>
      )}

      {/* Drop Zone for Moving to Root when dragging an item from inside a folder */}
      {isDragging && draggedItem && draggedItem.currentFolderId && (
        <div
          data-drop-zone="root_zone"
          className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
            activeDropTarget?.type === "root_zone"
              ? "border-gold bg-gold/30 text-gold scale-[1.02] shadow-[0_0_30px_rgba(212,175,55,0.6)] ring-4 ring-gold"
              : "border-umber/60 bg-sepia/20 text-vellum/70 hover:border-gold/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2 font-heading text-xs uppercase font-bold tracking-wider pointer-events-none">
            <Home size={16} className="text-gold" />
            <span>📥 Soltar aquí para sacar a los Planos de Raíz (sin carpeta)</span>
          </div>
        </div>
      )}

      {/* Search and Creators top layout bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-umber/30 pb-6">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar planos o carpetas..."
            className="w-full bg-sepia/40 border border-umber focus:border-gold/50 rounded-2xl pl-9 pr-4 py-2 text-xs font-body text-vellum outline-none transition-all placeholder:text-vellum/20 shadow-inner"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vellum/30" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {onLoadGitHub && (
            <button
              onClick={onLoadGitHub}
              disabled={isFetchingGitHub}
              className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl border text-xs font-heading uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                isFetchingGitHub
                  ? "bg-gold/20 border-gold/50 text-gold animate-pulse cursor-not-allowed"
                  : "border-umber/80 bg-sepia/30 hover:bg-sepia text-vellum/80 hover:text-gold hover:border-gold/50"
              }`}
              title="Cargar y sincronizar efectos, animaciones y mapas desde GitHub (theworldoftirian/dragopedia)"
            >
              <CloudDownload size={13} className={isFetchingGitHub ? "animate-spin text-gold" : "text-gold"} />
              <span>{isFetchingGitHub ? "Cargando..." : "Cargar GitHub"}</span>
            </button>
          )}

          {onSyncGitHub && (
            <button
              onClick={onSyncGitHub}
              disabled={isSyncingGitHub}
              className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl border text-xs font-heading uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                isSyncingGitHub
                  ? "bg-emerald-bg/40 border-emerald-border/60 text-emerald-text animate-pulse cursor-not-allowed"
                  : "border-emerald-border/60 bg-sepia/30 hover:bg-emerald-bg/20 text-emerald-text hover:border-emerald-border"
              }`}
              title="Guardar y sincronizar cambios en GitHub"
            >
              <GitBranch size={13} className={isSyncingGitHub ? "animate-spin text-emerald-text" : "text-emerald-text"} />
              <span>{isSyncingGitHub ? "Sincronizando..." : "GitHub"}</span>
            </button>
          )}

          <button
            onClick={() => onCreateFolder()}
            className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl border border-umber bg-sepia/30 hover:bg-sepia/60 text-vellum font-heading text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <FolderPlus size={13} className="text-gold" />
            <span>Nueva Carpeta</span>
          </button>

          <button
            onClick={() => onCreateMap()}
            className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-emerald-bg border border-emerald-border text-emerald-text font-heading text-xs font-bold uppercase tracking-wider hover:bg-emerald-bg/80 flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus size={14} />
            <span>Crear Plano</span>
          </button>
        </div>
      </div>

      {/* Folders and Maps Stack */}
      <div className="space-y-6">
        {/* --- EXPANDABLE FOLDERS GROUP --- */}
        {filteredRootFolders.length > 0 && (
          <div className="space-y-4">
            {filteredRootFolders.map((rootFolder) => {
              const isExpanded = expandedFolders[rootFolder.id] ?? true;
              const totalRootMaps = getTotalMapsCount(rootFolder.id);

              const pathIds = folderNav[rootFolder.id] || [rootFolder.id];
              const currentFolderId = pathIds[pathIds.length - 1];
              const currentFolder = folders.find((f) => f.id === currentFolderId) || rootFolder;

              const currentSubfolders = folders
                .filter((f) => f.parent_id === currentFolder.id && doesFolderMatch(f))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

              const currentFolderMaps = filteredMaps
                .filter((m) => m.folder_id === currentFolder.id)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

              const isDrilledDown = pathIds.length > 1;

              const isFolderHeaderDropTarget =
                isDragging &&
                activeDropTarget?.type === "folder_header" &&
                activeDropTarget.targetFolderId === rootFolder.id;

              return (
                <div
                  key={rootFolder.id}
                  className={`space-y-4 border rounded-3xl p-5 bg-sepia/15 shadow-xl transition-all ${
                    isFolderHeaderDropTarget
                      ? "ring-4 ring-gold border-gold bg-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.5)]"
                      : "border-umber/60"
                  }`}
                >
                  {/* Folder Bar Title Controller (Draggable & Drop Target) */}
                  <div
                    data-drop-zone="folder_header"
                    data-folder-id={rootFolder.id}
                    data-folder-name={rootFolder.name}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      startDragCandidate(e, {
                        type: "folder",
                        id: rootFolder.id,
                        name: rootFolder.name,
                        currentFolderId: undefined,
                        color: rootFolder.color,
                      });
                    }}
                    className={`flex items-center justify-between p-2 rounded-2xl transition-all cursor-grab active:cursor-grabbing select-none touch-none ${
                      isFolderHeaderDropTarget ? "bg-gold/35 ring-2 ring-gold" : "hover:bg-sepia/30"
                    }`}
                  >
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => toggleFolder(rootFolder.id)}
                      className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
                    >
                      <div className="text-vellum/40 group-hover:text-emerald-text transition-colors">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>

                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sepia border border-umber/80 shadow-md">
                        {isExpanded ? (
                          <FolderOpen size={16} style={{ color: rootFolder.color || "#d0e8ee" }} />
                        ) : (
                          <Folder size={16} style={{ color: rootFolder.color || "#d0e8ee" }} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-vellum group-hover:text-emerald-text transition-colors leading-none mb-0.5">
                            {rootFolder.name}
                          </h4>
                          {isFolderHeaderDropTarget && (
                            <span className="px-2 py-0.5 rounded-md bg-gold text-void text-[9px] font-heading font-extrabold uppercase tracking-wider animate-bounce">
                              Soltar para mover a {rootFolder.name}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] text-emerald-text/60 uppercase tracking-widest leading-none">
                          {totalRootMaps} lugar{totalRootMaps !== 1 ? "es" : ""} archivado{totalRootMaps !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>

                    {/* Folder operations */}
                    <div
                      className="flex items-center gap-1"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onCreateFolder(currentFolder.id)}
                        className="px-2 py-1.5 rounded-lg bg-sepia/50 border border-umber text-vellum/50 hover:text-gold flex items-center gap-1 transition-all cursor-pointer text-[10px] font-heading font-semibold uppercase tracking-wider"
                        title="Crear subcarpeta dentro de esta carpeta"
                      >
                        <FolderPlus size={11} />
                        <span className="hidden sm:inline">+ Subcarpeta</span>
                      </button>
                      <button
                        onClick={() => onCreateMap(currentFolder.id)}
                        className="w-7 h-7 rounded-lg bg-sepia/50 border border-umber text-vellum/50 hover:text-emerald-text flex items-center justify-center transition-all cursor-pointer"
                        title="Crear plano en esta carpeta"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => onEditFolder(rootFolder)}
                        className="w-7 h-7 rounded-lg bg-sepia/50 border border-umber text-vellum/50 hover:text-emerald-text flex items-center justify-center transition-all cursor-pointer"
                        title="Editar carpeta"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar la carpeta "${rootFolder.name}"? Todos los mapas y subcarpetas que contenga se desvincularán.`)) {
                            onDeleteFolder(rootFolder.id);
                          }
                        }}
                        className="w-7 h-7 rounded-lg bg-sepia/50 border border-umber text-vellum/50 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Eliminar carpeta"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded maps and subfolders drawer */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-3 pt-1"
                      >
                        {/* Breadcrumbs navigation when drilled into a subfolder */}
                        {isDrilledDown && (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-void/60 border border-umber/60 shadow-inner text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => {
                                  setFolderNav((prev) => ({
                                    ...prev,
                                    [rootFolder.id]: pathIds.slice(0, -1),
                                  }));
                                }}
                                className="px-2.5 py-1 rounded-xl bg-sepia/80 hover:bg-sepia border border-umber text-gold flex items-center gap-1 font-heading text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                              >
                                <ChevronLeft size={12} />
                                <span>Subir de nivel</span>
                              </button>

                              {pathIds.map((id, index) => {
                                const fObj = folders.find((f) => f.id === id);
                                const isLast = index === pathIds.length - 1;
                                const isBreadcrumbDropTarget =
                                  isDragging &&
                                  activeDropTarget?.type === "breadcrumb" &&
                                  activeDropTarget.targetFolderId === id;

                                return (
                                  <div key={id} className="flex items-center gap-1">
                                    {index > 0 && <span className="text-vellum/30 text-[10px]">/</span>}
                                    <button
                                      data-drop-zone="breadcrumb"
                                      data-folder-id={id}
                                      data-folder-name={fObj?.name}
                                      onClick={() => {
                                        setFolderNav((prev) => ({
                                          ...prev,
                                          [rootFolder.id]: pathIds.slice(0, index + 1),
                                        }));
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[11px] font-heading font-semibold transition-all ${
                                        isBreadcrumbDropTarget
                                          ? "bg-gold text-void font-bold scale-105 shadow-md ring-2 ring-gold"
                                          : isLast
                                          ? "bg-sepia border border-gold/40 text-gold shadow-sm font-bold"
                                          : "text-vellum/60 hover:text-vellum cursor-pointer"
                                      }`}
                                    >
                                      {index === 0 ? `📂 ${fObj?.name}` : `📁 ${fObj?.name}`}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onCreateFolder(currentFolder.id)}
                                className="px-2.5 py-1 rounded-xl bg-sepia/50 hover:bg-sepia border border-umber text-vellum/70 hover:text-gold flex items-center gap-1 font-heading text-[9.5px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                                title="Crear subcarpeta dentro de esta ubicación"
                              >
                                <FolderPlus size={10} />
                                <span>+ Subcarpeta</span>
                              </button>
                              <button
                                onClick={() => onCreateMap(currentFolder.id)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-bg/60 hover:bg-emerald-bg border border-emerald-border text-emerald-text flex items-center gap-1 font-heading text-[9.5px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                                title="Crear plano dentro de esta ubicación"
                              >
                                <Plus size={10} />
                                <span>+ Plano</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Combined Grid of Subfolders & Maps with Drag and Drop */}
                        {currentSubfolders.length === 0 && currentFolderMaps.length === 0 ? (
                          <div
                            data-drop-zone="empty_folder_zone"
                            data-folder-id={currentFolder.id}
                            data-folder-name={currentFolder.name}
                            className={`text-center py-8 space-y-2 border-2 border-dashed rounded-2xl transition-all ${
                              isDragging && activeDropTarget?.targetFolderId === currentFolder.id
                                ? "border-gold bg-gold/25 text-gold scale-[1.01] ring-4 ring-gold shadow-[0_0_30px_rgba(212,175,55,0.5)]"
                                : "border-umber/40 bg-sepia/10"
                            }`}
                          >
                            <Folder size={28} className="text-vellum/20 mx-auto" />
                            <p className="text-vellum/40 font-lore text-xs italic">
                              Esta carpeta está vacía. Arrastra mapas o subcarpetas aquí, o añade nuevos elementos.
                            </p>
                            <div className="flex justify-center gap-2 pt-1">
                              <button
                                onClick={() => onCreateFolder(currentFolder.id)}
                                className="px-3 py-1 rounded-xl bg-sepia/40 hover:bg-sepia border border-umber text-gold text-[10px] font-heading uppercase font-bold tracking-wider cursor-pointer"
                              >
                                + Nueva Subcarpeta
                              </button>
                              <button
                                onClick={() => onCreateMap(currentFolder.id)}
                                className="px-3 py-1 rounded-xl bg-emerald-bg/50 hover:bg-emerald-bg border border-emerald-border text-emerald-text text-[10px] font-heading uppercase font-bold tracking-wider cursor-pointer"
                              >
                                + Crear Plano
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                            {/* Render Subfolders as draggable & drop-target cards */}
                            {currentSubfolders.map((sub) =>
                              renderSubfolderCard(sub, rootFolder.id, currentFolder.id)
                            )}

                            {/* Render Maps */}
                            {currentFolderMaps.map((m) => renderMapCard(m, currentFolder.id))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* --- ROOT LEVEL MAPS GROUP --- */}
        {rootMaps.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-umber/15">
            <div className="flex items-center justify-between pl-1">
              <h3 className="font-heading text-xs uppercase tracking-[0.15em] text-vellum/45 font-bold flex items-center gap-1.5">
                <span>Planos de Raíz ({rootMaps.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-gold/60 italic flex items-center gap-1">
                <ArrowDownUp size={11} />
                <span>Arrastra con el ratón para reordenar o meter en carpetas</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {rootMaps.map((m) => renderMapCard(m, undefined))}
            </div>
          </div>
        )}

        {/* Empty list screen */}
        {filteredRootFolders.length === 0 && rootMaps.length === 0 && (
          <div className="text-center py-16 space-y-3.5 border border-dashed border-umber/40 rounded-2xl bg-sepia/10">
            <MapIcon size={32} className="text-vellum/10 mx-auto" />
            <div className="space-y-1">
              <p className="font-heading text-xs uppercase tracking-widest text-vellum/40 font-bold">
                No se encontraron planos ni carpetas
              </p>
              <p className="font-lore text-vellum/20 text-xs italic">
                Crea una nueva carpeta o añade un mapa lienzo para empezar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
