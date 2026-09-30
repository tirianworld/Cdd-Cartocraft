import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, Map as MapIcon, ChevronRight, ChevronLeft, HelpCircle, FolderOpen, Globe, Moon, Music, Volume2, VolumeX, Play, Pause, ExternalLink, GitBranch } from "lucide-react";
import { Folder, Map, Layer, Marker, Light, Wall, WindZone } from "./types";
import {
  DEFAULT_FOLDERS,
  DEFAULT_MAPS,
  DEFAULT_LAYERS,
  DEFAULT_MARKERS,
  DEFAULT_LIGHTS,
  DEFAULT_WALLS,
} from "./data";

// Components
import FolderGrid from "./components/FolderGrid";
import { FolderModal, MapModal } from "./components/FolderModals";
import MapHeader from "./components/MapHeader";
import MapSidebar from "./components/MapSidebar";
import MapContainer from "./components/MapContainer";
import WeatherEffect from "./components/WeatherEffect";
import MarkerForm from "./components/MarkerForm";
import MarkerDrawer from "./components/MarkerDrawer";
import LightForm from "./components/LightForm";
import EffectClipboardModal from "./components/EffectClipboardModal";
import PlanarCloudOverlay from "./components/PlanarCloudOverlay";
import { ResolvedPlanarTheme } from "./utils/planarThemes";
import { fetchMapsFromGitHub, pushMapsToGitHub } from "./utils/githubStorage";

export default function App() {
  // Hash Routing State
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  // Core Data State (Synced to localStorage)
  const [folders, setFolders] = useState<Folder[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [lights, setLights] = useState<Light[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [drawingWalls, setDrawingWalls] = useState(false);

  // Workspace Settings/Toggles
  const [showMarkers, setShowMarkers] = useState(false);
  const [showLights, setShowLights] = useState(true);
  const [hideHelpers, setHideHelpers] = useState(false);
  const [markerSearchQuery, setMarkerSearchQuery] = useState("");

  // Zoom & Pan Workspace state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Editor/Drawer States
  const [activeFolderModal, setActiveFolderModal] = useState<{ show: boolean; folder: Folder | null; defaultParentId?: string }>({
    show: false,
    folder: null,
  });
  const [activeMapModal, setActiveMapModal] = useState<{ show: boolean; map: Map | null; defaultFolderId?: string }>({
    show: false,
    map: null,
  });
  const [showEffectClipboardModal, setShowEffectClipboardModal] = useState(false);

  // Map workspace selected states
  const [pendingMarkerPos, setPendingMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null);
  const [viewingMarker, setViewingMarker] = useState<Marker | null>(null);
  const [editingLight, setEditingLight] = useState<Light | null>(null);

  // Active side panel tab in Map view
  const [activeSideTab, setActiveSideTab] = useState<string | null>(null);

  // Ambient Picker States (shared with MapContainer)
  const [pickingEmissive, setPickingEmissive] = useState(false);
  const [pickingWater, setPickingWater] = useState(false);
  const [pickingWind, setPickingWind] = useState(false);
  const [pickingMovingPartPos, setPickingMovingPartPos] = useState(false);
  const [pickingMovingPartColorId, setPickingMovingPartColorId] = useState<string | null>(null);
  const [pickingWallColor, setPickingWallColor] = useState(false);
  const [pickingAvoidColorId, setPickingAvoidColorId] = useState<string | null>(null);
  const [pickingSmartObstacle, setPickingSmartObstacle] = useState(false);
  const [smartObstacleTolerance, setSmartObstacleTolerance] = useState(15);
  const [smartSelectionCount, setSmartSelectionCount] = useState<number | null>(null);
  const [pickingMagicWindZone, setPickingMagicWindZone] = useState(false);
  const [magicWindTolerance, setMagicWindTolerance] = useState(25);

  // Wind Mask & Brush Painting States
  const [isPaintingWindMask, setIsPaintingWindMask] = useState(false);
  const [windBrushMode, setWindBrushMode] = useState<"paint" | "erase">("paint");
  const [windBrushSize, setWindBrushSize] = useState(35);
  const [showWindMaskPreview, setShowWindMaskPreview] = useState(false);

  // Painted Place Marker Zone States
  const [isPaintingZone, setIsPaintingZone] = useState(false);
  const [paintMode, setPaintMode] = useState<"freehand" | "polygon" | "magic_wand">("freehand");
  const [paintTolerance, setPaintTolerance] = useState(25);
  const [zonePaintPoints, setZonePaintPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [zonePaintColor, setZonePaintColor] = useState("#E67E22");
  const [zonePaintOpacity, setZonePaintOpacity] = useState(0.25);
  const [focusTargetMarker, setFocusTargetMarker] = useState<Marker | null>(null);

  // Lifted mechanical / AI animation states
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Hardcoded save state & GitHub Sync state
  const [isSavingHardcoded, setIsSavingHardcoded] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [hardcodeSaveStatus, setHardcodeSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Clash of Clans Style Planar Cloud Transition State
  const [cloudTransition, setCloudTransition] = useState<{
    isActive: boolean;
    phase: "entering" | "covered" | "parting";
    targetMapId: string | null;
    themeId: ResolvedPlanarTheme;
    targetMapName?: string;
  }>({
    isActive: false,
    phase: "entering",
    targetMapId: null,
    themeId: "classic",
    targetMapName: undefined,
  });

  const triggerCloudTransition = (targetId: string | null) => {
    let targetName: string | undefined = undefined;

    if (targetId) {
      const targetMap = maps.find((m) => m.id === targetId);
      targetName = targetMap?.name;
    } else if (activeMap) {
      targetName = activeMap.name;
    }

    setCloudTransition({
      isActive: true,
      phase: "entering",
      targetMapId: targetId,
      themeId: "classic",
      targetMapName: targetName,
    });

    // Clouds sweep inward over 1.4s, then reach full cover
    setTimeout(() => {
      setCloudTransition((prev) => ({
        ...prev,
        phase: "covered",
      }));

      // Switch view while screen is completely covered
      if (targetId) {
        navigateToMap(targetId);
      } else {
        navigateToDashboard();
        // Exiting to dashboard has no map image onLoad, so hold briefly then part smoothly
        setTimeout(() => {
          setCloudTransition((prev) => ({ ...prev, phase: "parting" }));
          setTimeout(() => {
            setCloudTransition({
              isActive: false,
              phase: "entering",
              targetMapId: null,
              themeId: "classic",
              targetMapName: undefined,
            });
          }, 1700);
        }, 500);
      }
    }, 1400);

    // Safety timeout in case map image onLoad does not fire
    setTimeout(() => {
      setCloudTransition((prev) => {
        if (prev.isActive && prev.phase === "covered") {
          setTimeout(() => {
            setCloudTransition({
              isActive: false,
              phase: "entering",
              targetMapId: null,
              themeId: "classic",
              targetMapName: undefined,
            });
          }, 1700);
          return { ...prev, phase: "parting" };
        }
        return prev;
      });
    }, 4500);
  };

  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);

  const handleLoadFromGitHub = async () => {
    setIsFetchingGitHub(true);
    setHardcodeSaveStatus(null);
    try {
      const data = await fetchMapsFromGitHub();
      if (data.success && data.data) {
        const { folders: ghFolders, maps: ghMaps, layers: ghLayers, markers: ghMarkers, lights: ghLights, walls: ghWalls } = data.data;

        if (ghFolders && Array.isArray(ghFolders)) saveFolders(ghFolders);
        if (ghMaps && Array.isArray(ghMaps)) saveMaps(ghMaps);
        if (ghLayers && Array.isArray(ghLayers)) saveLayers(ghLayers);
        if (ghMarkers && Array.isArray(ghMarkers)) saveMarkers(ghMarkers);
        if (ghLights && Array.isArray(ghLights)) saveLights(ghLights);
        if (ghWalls && Array.isArray(ghWalls)) saveWalls(ghWalls);

        setHardcodeSaveStatus({
          type: "success",
          message: "¡Efectos, animaciones y mapas sincronizados desde GitHub (theworldoftirian/dragopedia)!",
        });
      } else {
        setHardcodeSaveStatus({
          type: "error",
          message: data.error || "Error al cargar datos desde GitHub.",
        });
      }
    } catch (err: any) {
      setHardcodeSaveStatus({
        type: "error",
        message: err.message || "Error de conexión al cargar desde GitHub.",
      });
    } finally {
      setIsFetchingGitHub(false);
      setTimeout(() => setHardcodeSaveStatus(null), 5000);
    }
  };

  const handleSaveToGitHub = async () => {
    setIsSyncingGitHub(true);
    setHardcodeSaveStatus(null);
    try {
      const result = await pushMapsToGitHub({
        folders,
        maps,
        layers,
        markers,
        lights,
        walls,
      });

      if (result.success) {
        setHardcodeSaveStatus({
          type: "success",
          message: "¡Cambios y mapas guardados en GitHub (theworldoftirian/dragopedia) con éxito!",
        });
      } else {
        setHardcodeSaveStatus({
          type: "error",
          message: result.error || "Error al sincronizar con GitHub.",
        });
      }
    } catch (err: any) {
      setHardcodeSaveStatus({
        type: "error",
        message: err.message || "Error al conectar con la API de GitHub.",
      });
    } finally {
      setIsSyncingGitHub(false);
      setTimeout(() => setHardcodeSaveStatus(null), 5000);
    }
  };

  const handleSaveHardcoded = async () => {
    setIsSavingHardcoded(true);
    setHardcodeSaveStatus(null);
    try {
      const result = await pushMapsToGitHub({
        folders,
        maps,
        layers,
        markers,
        lights,
        walls,
      });

      if (result.success) {
        setHardcodeSaveStatus({
          type: "success",
          message: "¡Ajustes guardados y sincronizados en GitHub (theworldoftirian/dragopedia)!",
        });
      } else {
        setHardcodeSaveStatus({ type: "error", message: result.error || "Error al guardar en GitHub." });
      }
    } catch (err: any) {
      setHardcodeSaveStatus({ type: "error", message: err.message || "Error al conectar con GitHub." });
    } finally {
      setIsSavingHardcoded(false);
      setTimeout(() => setHardcodeSaveStatus(null), 5000);
    }
  };

  // Initial load and LocalStorage population
  useEffect(() => {
    const loadedFolders = localStorage.getItem("carto_folders");
    const loadedMaps = localStorage.getItem("carto_maps");
    const loadedLayers = localStorage.getItem("carto_layers");
    const loadedMarkers = localStorage.getItem("carto_markers");
    const loadedLights = localStorage.getItem("carto_lights");
    const loadedWalls = localStorage.getItem("carto_walls");
    const isClonedImported = localStorage.getItem("cartocraft_cloned_imported_v3") === "true";

    let parsedFolders = loadedFolders ? JSON.parse(loadedFolders) : [];
    let parsedMaps = loadedMaps ? JSON.parse(loadedMaps) : [];

    if (parsedMaps.length > 0 && isClonedImported) {
      setFolders(parsedFolders);
      setMaps(parsedMaps);
      setLayers(loadedLayers ? JSON.parse(loadedLayers) : DEFAULT_LAYERS);
      setMarkers(loadedMarkers ? JSON.parse(loadedMarkers) : DEFAULT_MARKERS);
      setLights(loadedLights ? JSON.parse(loadedLights) : DEFAULT_LIGHTS);
      setWalls(loadedWalls ? JSON.parse(loadedWalls) : DEFAULT_WALLS);
    } else {
      // Seed initial cloned data from GitHub defaults (47 maps, 11 folders, markers, lights)
      setFolders(DEFAULT_FOLDERS);
      setMaps(DEFAULT_MAPS);
      setLayers(DEFAULT_LAYERS);
      setMarkers(DEFAULT_MARKERS);
      setLights(DEFAULT_LIGHTS);
      setWalls(DEFAULT_WALLS);

      localStorage.setItem("carto_folders", JSON.stringify(DEFAULT_FOLDERS));
      localStorage.setItem("carto_maps", JSON.stringify(DEFAULT_MAPS));
      localStorage.setItem("carto_layers", JSON.stringify(DEFAULT_LAYERS));
      localStorage.setItem("carto_markers", JSON.stringify(DEFAULT_MARKERS));
      localStorage.setItem("carto_lights", JSON.stringify(DEFAULT_LIGHTS));
      localStorage.setItem("carto_walls", JSON.stringify(DEFAULT_WALLS));
      localStorage.setItem("cartocraft_cloned_imported_v3", "true");
    }

    // Auto-sync latest maps and effects from GitHub on startup
    fetchMapsFromGitHub()
      .then((data) => {
        if (data.success && data.data) {
          const { folders: ghFolders, maps: ghMaps, layers: ghLayers, markers: ghMarkers, lights: ghLights, walls: ghWalls } = data.data;
          if (ghFolders && Array.isArray(ghFolders)) saveFolders(ghFolders);
          if (ghMaps && Array.isArray(ghMaps)) saveMaps(ghMaps);
          if (ghLayers && Array.isArray(ghLayers)) saveLayers(ghLayers);
          if (ghMarkers && Array.isArray(ghMarkers)) saveMarkers(ghMarkers);
          if (ghLights && Array.isArray(ghLights)) saveLights(ghLights);
          if (ghWalls && Array.isArray(ghWalls)) saveWalls(ghWalls);
        }
      })
      .catch((err) => {
        console.warn("No se pudo sincronizar automáticamente con GitHub al iniciar:", err);
      });

    // Monitor URL hash routing
    const handleHashChange = () => {
      const newHash = window.location.hash;
      setCurrentHash(newHash);
      // Reset workspace panels on navigation
      setPendingMarkerPos(null);
      setEditingMarker(null);
      setViewingMarker(null);
      setEditingLight(null);
      setActiveSideTab(null);
      setPickingEmissive(false);
      setPickingWater(false);
      setDrawingWalls(false);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Helper helper savers
  const saveFolders = (newFolders: Folder[]) => {
    setFolders(newFolders);
    localStorage.setItem("carto_folders", JSON.stringify(newFolders));
  };

  const saveMaps = (newMaps: Map[]) => {
    setMaps(newMaps);
    localStorage.setItem("carto_maps", JSON.stringify(newMaps));
  };

  const saveLayers = (newLayers: Layer[]) => {
    setLayers(newLayers);
    localStorage.setItem("carto_layers", JSON.stringify(newLayers));
  };

  const saveMarkers = (newMarkers: Marker[]) => {
    setMarkers(newMarkers);
    localStorage.setItem("carto_markers", JSON.stringify(newMarkers));
  };

  const saveLights = (newLights: Light[]) => {
    setLights(newLights);
    localStorage.setItem("carto_lights", JSON.stringify(newLights));
  };

  const saveWalls = (newWalls: Wall[]) => {
    setWalls(newWalls);
    localStorage.setItem("carto_walls", JSON.stringify(newWalls));
  };

  // --- AUTOMATIC EMBEDDING & NO-UI DETECTION ---
  // Detect if running inside an iframe in an external site, webview, or with embed/no-ui parameters
  const isExternalEmbed = (() => {
    if (typeof window === "undefined") return false;

    const sParams = new URLSearchParams(window.location.search);
    const hashQuery = currentHash.includes("?") ? currentHash.split("?")[1] : "";
    const hParams = new URLSearchParams(hashQuery);

    // Explicit parameters
    if (
      sParams.get("embed") === "true" ||
      sParams.get("embed") === "1" ||
      sParams.get("embedded") === "true" ||
      sParams.get("noui") === "true" ||
      sParams.get("no-ui") === "true" ||
      sParams.get("no_ui") === "true" ||
      hParams.get("embed") === "true" ||
      hParams.get("embed") === "1" ||
      hParams.get("embedded") === "true" ||
      hParams.get("noui") === "true" ||
      hParams.get("no-ui") === "true" ||
      hParams.get("no_ui") === "true" ||
      currentHash.includes("/no-ui")
    ) {
      return true;
    }

    // Check if running inside an iframe (e.g. Notion, Obsidian, WordPress, Foundry VTT, external sites)
    try {
      if (window.self !== window.top) {
        const origins = (window.location as any).ancestorOrigins;
        const parentOrigin = origins && origins.length > 0 ? String(origins[0]) : "";
        const ref = document.referrer || "";

        // Keep normal editor visible in Google AI Studio builder environment
        const isAIStudioContainer =
          parentOrigin.includes("ai.studio") ||
          parentOrigin.includes("aistudio.google.com") ||
          ref.includes("ai.studio") ||
          ref.includes("aistudio.google.com");

        if (!isAIStudioContainer) {
          return true;
        }
      }
    } catch {
      // Cross-origin access restriction means it is embedded in an external origin
      return true;
    }

    return false;
  })();

  // --- HASH ROUTING PARSERS ---
  const isMapView = isExternalEmbed || currentHash.startsWith("#/map/");
  const isNoUi = isExternalEmbed || (currentHash.startsWith("#/map/") && currentHash.includes("/no-ui"));

  // Parse query parameters from hash or search
  const hashQueryString = currentHash.includes("?") ? currentHash.split("?")[1] : "";
  const hashParams = new URLSearchParams(hashQueryString);
  const searchParams = new URLSearchParams(window.location.search);
  const explicitRoot = hashParams.get("root") || hashParams.get("shared_root") || hashParams.get("sharedRoot") || searchParams.get("root");

  const parsedMapId = currentHash.startsWith("#/map/")
    ? currentHash.replace("#/map/", "").replace("/no-ui", "").split(/[?&]/)[0]
    : null;

  const activeMapId = parsedMapId || explicitRoot || (isNoUi ? (maps[0]?.id || null) : null);
  const activeMap = maps.find((m) => m.id === activeMapId) || (isNoUi ? maps[0] : undefined);

  // Keep track of the shared root map (only if explicit query param like ?root=xxx is passed)
  const [sharedRootMapId, setSharedRootMapId] = useState<string | null>(() => {
    if (explicitRoot) return explicitRoot;
    return null;
  });

  useEffect(() => {
    if (explicitRoot && explicitRoot !== sharedRootMapId) {
      setSharedRootMapId(explicitRoot);
    }
  }, [explicitRoot, sharedRootMapId]);

  // If we are currently at the shared root map of a shared/embedded session
  const isSharedRoot = Boolean(sharedRootMapId && activeMapId === sharedRootMapId);
  const isSharedSession = Boolean(sharedRootMapId);

  // If at the shared root of a shared/embedded session, do not navigate up to parent map
  const effectiveParentMapId = isSharedRoot ? null : (activeMap?.parent_map_id || null);
  const parentMap = effectiveParentMapId ? maps.find((m) => m.id === effectiveParentMapId) : null;

  // Apply query parameters in no-ui / embedded mode
  useEffect(() => {
    if (isNoUi) {
      if (hashParams.has("markers")) {
        setShowMarkers(hashParams.get("markers") === "true");
      } else if (searchParams.has("markers")) {
        setShowMarkers(searchParams.get("markers") === "true");
      } else {
        setShowMarkers(true);
      }

      if (hashParams.has("lights")) {
        setShowLights(hashParams.get("lights") === "true");
      } else if (searchParams.has("lights")) {
        setShowLights(searchParams.get("lights") === "true");
      } else {
        setShowLights(true);
      }

      if (hashParams.has("helpers")) {
        setHideHelpers(hashParams.get("helpers") === "true");
      } else if (searchParams.has("helpers")) {
        setHideHelpers(searchParams.get("helpers") === "true");
      } else {
        setHideHelpers(true);
      }
    }
  }, [currentHash, isNoUi]);

  // Ambient Music Loop Player State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem("carto_music_volume");
    return saved ? parseFloat(saved) : 0.5;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-play / update music when activeMap changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (activeMap?.music_url) {
      const url = activeMap.music_url.trim();
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
      
      if (isPlayingMusic) {
        audioRef.current.play().catch((err) => {
          console.log("Autoplay blocked or playback failed:", err);
          setIsPlayingMusic(false);
        });
      } else {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause();
    }
  }, [activeMapId, activeMap?.music_url, isPlayingMusic]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Keep volume synced in localStorage
  useEffect(() => {
    localStorage.setItem("carto_music_volume", musicVolume.toString());
  }, [musicVolume]);

  // Reset zoom & pan when activeMapId changes
  useEffect(() => {
    if (activeMap) {
      setZoom(activeMap.initial_zoom || 1);
      setPan({ x: 0, y: 0 });
    }
  }, [activeMapId]);

  // Clear animation frames on map change
  useEffect(() => {
    setGeneratedFrames([]);
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  }, [activeMapId]);

  // Navigate methods
  const navigateToDashboard = () => {
    if (isNoUi) {
      if (effectiveParentMapId) {
        navigateToMap(effectiveParentMapId);
      } else if (maps[0]?.id) {
        navigateToMap(maps[0].id);
      }
      return;
    }
    window.location.hash = "#/";
    setCurrentHash("#/");
    setPendingMarkerPos(null);
    setEditingMarker(null);
    setViewingMarker(null);
    setEditingLight(null);
    setActiveSideTab(null);
    setPickingEmissive(false);
    setPickingWater(false);
    setPickingWind(false);
    setDrawingWalls(false);
  };

  const navigateToParentMap = () => {
    if (effectiveParentMapId) {
      triggerCloudTransition(effectiveParentMapId);
    } else if (!isNoUi) {
      triggerCloudTransition(null);
    }
  };

  const navigateToMap = (mapId: string) => {
    const uiSegment = isNoUi ? "/no-ui" : "";
    const newHash = `#/map/${mapId}${uiSegment}`;
    window.location.hash = newHash;
    setCurrentHash(newHash);
  };

  // --- ACTIONS: FOLDERS ---
  const handleSavedFolder = async (name: string, color: string, parentId?: string) => {
    if (activeFolderModal.folder) {
      // Edit
      const updated = folders.map((f) =>
        f.id === activeFolderModal.folder?.id
          ? { ...f, name, color, parent_id: parentId || undefined }
          : f
      );
      saveFolders(updated);
    } else {
      // Create
      const newFolder: Folder = {
        id: "folder-" + Math.random().toString(36).substring(2, 9),
        name,
        color,
        parent_id: parentId || undefined,
        order: folders.length,
      };
      saveFolders([...folders, newFolder]);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    // Recursively collect all descendant subfolder IDs
    const getDescendantFolderIds = (id: string): string[] => {
      const directChildren = folders.filter((f) => f.parent_id === id).map((f) => f.id);
      return [id, ...directChildren.flatMap(getDescendantFolderIds)];
    };
    const idsToDelete = new Set(getDescendantFolderIds(folderId));

    const filtered = folders.filter((f) => !idsToDelete.has(f.id));
    // Unlink maps in this folder and its subfolders
    const updatedMaps = maps.map((m) =>
      m.folder_id && idsToDelete.has(m.folder_id) ? { ...m, folder_id: undefined } : m
    );
    saveFolders(filtered);
    saveMaps(updatedMaps);
  };

  // --- ACTIONS: MAPS ---
  const handleSavedMap = async (mapData: Partial<Map>) => {
    if (activeMapModal.map) {
      // Edit
      const updated = maps.map((m) =>
        m.id === activeMapModal.map?.id ? { ...m, ...mapData } : m
      );
      saveMaps(updated);
    } else {
      // Create
      const newId = "map-" + Math.random().toString(36).substring(2, 9);
      const newMap: Map = {
        id: newId,
        name: mapData.name || "Nuevo Mapa",
        description: mapData.description,
        cover_image: mapData.cover_image,
        folder_id: mapData.folder_id,
        initial_zoom: 1,
        weather_effect: "none",
        order: maps.length,
        created_date: new Date().toISOString(),
      };
      saveMaps([...maps, newMap]);
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    const filtered = maps.filter((m) => m.id !== mapId);
    // Cascade delete markers, lights & walls belonging to this map
    const filteredMarkers = markers.filter((m) => m.map_id !== mapId);
    const filteredLights = lights.filter((l) => l.map_id !== mapId);
    const filteredWalls = walls.filter((w) => w.map_id !== mapId);

    saveMaps(filtered);
    saveMarkers(filteredMarkers);
    saveLights(filteredLights);
    saveWalls(filteredWalls);

    if (activeMapId === mapId) {
      navigateToDashboard();
    }
  };

  // --- ACTIONS: LAYERS ---
  const handleLayerToggle = async (layerId: string, visible: boolean) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, visible } : l));
    saveLayers(updated);
  };

  const handleLayerCreated = async (name: string, color?: string) => {
    if (!activeMapId) return;
    const newLayer: Layer = {
      id: "layer-" + Math.random().toString(36).substring(2, 9),
      name,
      map_id: activeMapId,
      visible: true,
      color: color || "#d0e8ee",
    };
    saveLayers([...layers, newLayer]);
  };

  const handleMapUpdated = async (updatedFields: Partial<Map>) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, ...updatedFields } : m));
    saveMaps(updated);
  };

  const handleLayerDeleted = async (layerId: string) => {
    const filtered = layers.filter((l) => l.id !== layerId);
    // Unlink markers attached to this layer
    const updatedMarkers = markers.map((m) =>
      m.layer_id === layerId ? { ...m, layer_id: undefined } : m
    );
    saveLayers(filtered);
    saveMarkers(updatedMarkers);
  };

  // --- ACTIONS: MARKERS ---
  const handleSavedMarker = async (markerData: Partial<Marker>) => {
    if (editingMarker) {
      // Edit
      const updated = markers.map((m) =>
        m.id === editingMarker.id ? { ...m, ...markerData } : m
      );
      saveMarkers(updated);
      const updatedMarker = updated.find((m) => m.id === editingMarker.id) || null;
      setViewingMarker(updatedMarker);
      setEditingMarker(null);
      if (updatedMarker && ((updatedMarker.area_points && updatedMarker.area_points.length >= 3) || updatedMarker.area_radius)) {
        setFocusTargetMarker(updatedMarker);
      }
    } else {
      // Create
      const newMarker: Marker = {
        id: "marker-" + Math.random().toString(36).substring(2, 9),
        name: markerData.name || "Lugar",
        description: markerData.description,
        notes: markerData.notes,
        image: markerData.image,
        category: markerData.category || "general",
        layer_id: markerData.layer_id,
        linked_map_id: markerData.linked_map_id,
        area_radius: markerData.area_radius,
        area_points: markerData.area_points,
        area_color: markerData.area_color,
        area_opacity: markerData.area_opacity,
        area_type: markerData.area_type,
        map_id: markerData.map_id || "",
        x: markerData.x || 50,
        y: markerData.y || 50,
      };
      saveMarkers([...markers, newMarker]);
      setPendingMarkerPos(null);
      if ((newMarker.area_points && newMarker.area_points.length >= 3) || newMarker.area_radius) {
        setFocusTargetMarker(newMarker);
      }
    }
    setIsPaintingZone(false);
    setZonePaintPoints([]);
  };

  const handleMarkerMoved = async (markerId: string, x: number, y: number) => {
    const updated = markers.map((m) => (m.id === markerId ? { ...m, x, y } : m));
    saveMarkers(updated);
  };

  const handleDeleteMarker = async (markerId: string) => {
    if (confirm("¿Eliminar este lugar permanentemente?")) {
      const filtered = markers.filter((m) => m.id !== markerId);
      saveMarkers(filtered);
      setViewingMarker(null);
      setEditingMarker(null);
    }
  };

  // --- ACTIONS: LIGHTS ---
  const handleAddLight = async (x: number, y: number) => {
    if (!activeMapId) return;
    const newLight: Light = {
      id: "light-" + Math.random().toString(36).substring(2, 9),
      type: "torch",
      color: "#ffb030",
      intensity: 0.8,
      radius: 12,
      falloff: 40,
      map_id: activeMapId,
      x,
      y,
    };
    saveLights([...lights, newLight]);
    setEditingLight(newLight);
  };

  const handleSavedLight = async (lightData: Partial<Light>) => {
    if (!editingLight) return;
    const updated = lights.map((l) =>
      l.id === editingLight.id ? { ...l, ...lightData } : l
    );
    saveLights(updated);
    setEditingLight(null);
  };

  const handleLightMoved = async (lightId: string, x: number, y: number) => {
    const updated = lights.map((l) => (l.id === lightId ? { ...l, x, y } : l));
    saveLights(updated);
  };

  const handleDeleteLight = async (lightId: string) => {
    const filtered = lights.filter((l) => l.id !== lightId);
    saveLights(filtered);
    setEditingLight(null);
  };

  // --- ACTIONS: WEATHER & AMBIENTS ---
  const handleUpdateWeather = async (effect: "none" | "snow" | "sand" | "petals" | "leaves_green" | "leaves_gold") => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, weather_effect: effect } : m));
    saveMaps(updated);
  };

  const handleAddEmissiveColor = async (color: string) => {
    if (!activeMapId || !activeMap) return;
    const colors = [...(activeMap.emissive_colors || []), { color, similarity: 30 }];
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, emissive_colors: colors } : m));
    saveMaps(updated);
  };

  const handleUpdateEmissiveSimilarity = async (index: number, similarity: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.emissive_colors || []).map((item, idx) =>
      idx === index ? { ...item, similarity } : item
    );
    // Instant local state preview:
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, emissive_colors: colors } : m));
    saveMaps(updated);
  };

  const handleRemoveEmissiveColor = async (index: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.emissive_colors || []).filter((_, idx) => idx !== index);
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, emissive_colors: colors } : m));
    saveMaps(updated);
  };

  const handleUpdateEmissiveSpeed = async (speed: number) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, emissive_speed: speed } : m));
    saveMaps(updated);
  };

  const handleAddWaterColor = async (color: string) => {
    if (!activeMapId || !activeMap) return;
    const defaultWave = activeMap.water_wave_color || "#ffffff";
    const colors = [...(activeMap.water_colors || []), { color, similarity: 30, wave_color: defaultWave, blend_mode: "normal" }];
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, water_colors: colors } : m));
    saveMaps(updated);
  };

  const handleUpdateWaterSimilarity = async (index: number, similarity: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.water_colors || []).map((item, idx) =>
      idx === index ? { ...item, similarity } : item
    );
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, water_colors: colors } : m));
    saveMaps(updated);
  };

  const handleRemoveWaterColor = async (index: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.water_colors || []).filter((_, idx) => idx !== index);
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, water_colors: colors } : m));
    saveMaps(updated);
  };

  const handleUpdateWaterSpeed = async (speed: number) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, water_speed: speed } : m));
    saveMaps(updated);
  };

  const handleAddWindColor = async (color: string) => {
    if (!activeMapId || !activeMap) return;
    const colors = [...(activeMap.wind_colors || []), { color, similarity: 30 }];
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_colors: colors, wind_enabled: true } : m));
    saveMaps(updated);
  };

  const handleUpdateWindSimilarity = async (index: number, similarity: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.wind_colors || []).map((item, idx) =>
      idx === index ? { ...item, similarity } : item
    );
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_colors: colors } : m));
    saveMaps(updated);
  };

  const handleRemoveWindColor = async (index: number) => {
    if (!activeMapId || !activeMap) return;
    const colors = (activeMap.wind_colors || []).filter((_, idx) => idx !== index);
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_colors: colors } : m));
    saveMaps(updated);
  };

  const handleUpdateWindSpeed = async (speed: number) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_speed: speed } : m));
    saveMaps(updated);
  };

  const handleUpdateWindStrength = async (strength: number) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_strength: strength } : m));
    saveMaps(updated);
  };

  const handleUpdateWindEnabled = async (enabled: boolean) => {
    if (!activeMapId) return;
    const updated = maps.map((m) => (m.id === activeMapId ? { ...m, wind_enabled: enabled } : m));
    saveMaps(updated);
  };

  const handleAddWindZone = async (newZone: WindZone) => {
    if (!activeMapId || !activeMap) return;
    const currentZones = activeMap.wind_zones || [];
    const updatedZones = [...currentZones, newZone];
    const updated = maps.map((m) =>
      m.id === activeMapId ? { ...m, wind_zones: updatedZones, wind_enabled: true } : m
    );
    saveMaps(updated);
    setPickingMagicWindZone(false);
  };

  const handleDeleteWindZone = async (zoneId: string) => {
    if (!activeMapId || !activeMap) return;
    const updatedZones = (activeMap.wind_zones || []).filter((z) => z.id !== zoneId);
    const updated = maps.map((m) =>
      m.id === activeMapId ? { ...m, wind_zones: updatedZones } : m
    );
    saveMaps(updated);
  };

  const handleSaveWindMask = async (maskData: string | null) => {
    if (!activeMapId || !activeMap) return;
    const updated = maps.map((m) =>
      m.id === activeMapId ? { ...m, wind_mask_image: maskData || undefined, wind_enabled: true } : m
    );
    saveMaps(updated);
  };

  const handleClearWindMask = async () => {
    if (!activeMapId || !activeMap) return;
    const updated = maps.map((m) =>
      m.id === activeMapId ? { ...m, wind_mask_image: undefined } : m
    );
    saveMaps(updated);
  };

  // --- SELECTION CORRELATIONS ---
  const activeMapMarkers = markers.filter((mk) => {
    if (mk.map_id !== activeMapId) return false;
    // Check search query
    if (markerSearchQuery && !mk.name.toLowerCase().includes(markerSearchQuery.toLowerCase())) {
      return false;
    }
    // Check layer visibility
    if (mk.layer_id) {
      const layerObj = layers.find((l) => l.id === mk.layer_id);
      if (layerObj && !layerObj.visible) return false;
    }
    return true;
  });

  const activeMapLights = lights.filter((l) => l.map_id === activeMapId);
  const activeMapLayers = layers.filter((l) => l.map_id === activeMapId);

  return (
    <div className="min-h-screen bg-void text-vellum relative overflow-hidden selection:bg-gold/30 selection:text-gold flex flex-col font-sans">
      
      {/* Ambient Music Loop HTML5 Element */}
      <audio ref={audioRef} loop />

      {/* Dynamic Background Noise / Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: "radial-gradient(#d0e8ee 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(208,232,238,0.08),transparent_60%)] pointer-events-none z-0" />

      {/* --- DASHBOARD VIEW --- */}
      {!isMapView ? (
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 z-10 flex flex-col gap-8">
          
          {/* Bento Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Welcome Card: Bento Column (Main Info) */}
            <div className="md:col-span-8 bg-sepia/30 border border-umber/60 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[180px]">
              {/* Background accent glow */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-text/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2 text-emerald-text">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="font-heading text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-text">Plataforma de Cartografía RPG</span>
                </div>
                <h1 className="font-display text-4xl font-extrabold tracking-wider text-emerald-text select-none drop-shadow-[0_2px_10px_rgba(208,232,238,0.25)]">
                  CartoCraft
                </h1>
                <p className="font-lore text-xs text-vellum/50 italic max-w-xl leading-relaxed">
                  Forja mundos infinitos, conecta mapas anidados, simula atenuación lumínica y desata climas mágicos en tus crónicas de rol.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-mono tracking-wider uppercase relative z-10">
                <span className="px-2.5 py-1 rounded-lg bg-sepia/40 border border-umber/60 text-vellum/45">CREADOR: SUPERWEB.AYM.NANO@gmail.com</span>
                <span className="px-2.5 py-1 rounded-lg bg-sepia/40 border border-umber/60 text-vellum/45">SISTEMA: V2.4.0</span>
              </div>
            </div>

            {/* Stats Card: Bento Column (Emerald solid block) */}
            <div className="md:col-span-4 bg-emerald-bg border border-emerald-border rounded-3xl p-6 text-vellum flex flex-col justify-between shadow-xl min-h-[180px] relative overflow-hidden group">
              {/* Ambient grid in stats card */}
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: "radial-gradient(#d0e8ee 1.2px, transparent 1.2px)", backgroundSize: "16px 16px" }} />
              
              <div className="relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                  <p className="text-emerald-text/70 text-[9px] font-bold uppercase tracking-widest mb-1 font-mono">Estadísticas del Diario</p>
                  <h4 className="font-heading text-3xl font-bold leading-none tracking-tight text-emerald-text">
                    {maps.length} Planos
                  </h4>
                  <p className="text-[11px] text-vellum/70 mt-1 font-medium">
                    {folders.length} carpetas archivadas
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-emerald-text text-xs flex items-center gap-1.5 font-mono font-semibold" title="Conectado a GitHub: theworldoftirian/dragopedia">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d0e8ee] animate-pulse border border-[#d0e8ee]/20" />
                    <span>GitHub Conectado</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSaveToGitHub}
                      disabled={isSyncingGitHub}
                      className="text-[9px] bg-void/50 hover:bg-void/80 border border-emerald-border text-emerald-text font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      title="Sincronizar cambios ahora en el repositorio theworldoftirian/dragopedia"
                    >
                      <GitBranch size={10} className={isSyncingGitHub ? "animate-spin text-emerald-text" : "text-emerald-text"} />
                      <span>{isSyncingGitHub ? "Guardando..." : "Sincronizar"}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("¿Estás seguro de que quieres restablecer todos los mapas al estado clonado original? Esto borrará tus cambios locales.")) {
                          localStorage.removeItem("cartocraft_cloned_imported_v2");
                          localStorage.removeItem("cartocraft_cloned_imported_v3");
                          localStorage.removeItem("carto_maps");
                          localStorage.removeItem("carto_folders");
                          localStorage.removeItem("carto_markers");
                          localStorage.removeItem("carto_lights");
                          localStorage.removeItem("carto_walls");
                          window.location.reload();
                        }
                      }}
                      className="text-[9px] bg-void/40 hover:bg-void/70 border border-emerald-border/60 text-emerald-text/70 hover:text-emerald-text font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Restablecer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core folder grid dashboard listings */}
          <FolderGrid
            folders={folders}
            maps={maps}
            onSelectMap={triggerCloudTransition}
            onEditFolder={(folder) => setActiveFolderModal({ show: true, folder })}
            onDeleteFolder={handleDeleteFolder}
            onEditMap={(map) => setActiveMapModal({ show: true, map })}
            onDeleteMap={handleDeleteMap}
            onCreateFolder={(parentId) => setActiveFolderModal({ show: true, folder: null, defaultParentId: parentId })}
            onCreateMap={(folderId) => setActiveMapModal({ show: true, map: null, defaultFolderId: folderId })}
            onUpdateFolders={saveFolders}
            onUpdateMaps={saveMaps}
            onSyncGitHub={handleSaveToGitHub}
            isSyncingGitHub={isSyncingGitHub}
            onLoadGitHub={handleLoadFromGitHub}
            isFetchingGitHub={isFetchingGitHub}
          />

          {/* Decorative Footer */}
          <div className="text-center py-6 mt-auto text-[10px] text-vellum/20 tracking-wider uppercase font-mono border-t border-umber/10">
            © {new Date().getFullYear()} CartoCraft Studio • Todos los derechos de lore reservados.
          </div>
        </div>
      ) : (
        
        // --- MAP WORKSPACE VIEW ---
        <div className="flex-1 flex flex-col overflow-hidden relative w-full h-screen z-10">
          <AnimatePresence>
            {!isNoUi && smartSelectionCount !== null && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: -10, x: "-50%", scale: 0.95 }}
                className="absolute top-20 left-1/2 z-50 bg-gold/95 backdrop-blur-md text-void px-5 py-3 rounded-full border border-gold/40 shadow-2xl font-body text-xs font-semibold flex items-center gap-2.5"
              >
                <Sparkles size={14} className="text-void animate-bounce" />
                <span>¡Silueta trazada! Se agregaron {smartSelectionCount} segmentos de colisión alrededor del objeto.</span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!isNoUi && hardcodeSaveStatus !== null && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: -10, x: "-50%", scale: 0.95 }}
                className={`absolute top-20 left-1/2 z-50 backdrop-blur-md px-5 py-3 rounded-full shadow-2xl font-body text-xs font-semibold flex items-center gap-2.5 ${
                  hardcodeSaveStatus.type === "success"
                    ? "bg-[#d0e8ee]/95 text-void border border-[#d0e8ee]"
                    : "bg-rose-500/90 text-vellum border border-rose-400"
                }`}
              >
                <Sparkles size={14} className="animate-bounce" />
                <span>{hardcodeSaveStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {activeMap ? (
            <>
              {/* Header Navigation Controller */}
              {!isNoUi ? (
                <MapHeader
                  map={activeMap}
                  parentMap={parentMap}
                  folder={folders.find((f) => f.id === activeMap.folder_id) || null}
                  folders={folders}
                  onBack={() => triggerCloudTransition(null)}
                  onBackToMenu={() => triggerCloudTransition(null)}
                  onNavigateToParent={navigateToParentMap}
                  markers={markers.filter((m) => m.map_id === activeMapId)}
                  onSearchSelect={(m) => setViewingMarker(m)}
                  showMarkers={showMarkers}
                  onToggleMarkers={() => setShowMarkers(!showMarkers)}
                  showLights={showLights}
                  onToggleLights={() => setShowLights(!showLights)}
                  hideHelpers={hideHelpers}
                  onToggleHelpers={() => setHideHelpers(!hideHelpers)}
                  onOpenSettings={() => setActiveMapModal({ show: true, map: activeMap })}
                  onSaveHardcoded={handleSaveHardcoded}
                  isSavingHardcoded={isSavingHardcoded}
                  onSaveGitHub={handleSaveToGitHub}
                  isSyncingGitHub={isSyncingGitHub}
                  onLoadGitHub={handleLoadFromGitHub}
                  isFetchingGitHub={isFetchingGitHub}
                  activeTab={activeSideTab}
                  onTabChange={setActiveSideTab}
                  sharedRootMapId={sharedRootMapId}
                  onOpenEffectClipboard={() => setShowEffectClipboardModal(true)}
                />
              ) : (
                /* Back to Parent Map floating pill in pure embed / no-ui mode */
                effectiveParentMapId && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => triggerCloudTransition(effectiveParentMapId)}
                    className="absolute top-4 left-4 z-30 px-3.5 py-2 rounded-xl bg-void/80 hover:bg-void backdrop-blur-md border border-umber/60 hover:border-gold/50 text-vellum/75 hover:text-gold text-xs font-heading font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xl"
                    title="Volver al mapa superior"
                  >
                    <ChevronLeft size={14} className="text-gold" />
                    <span>{parentMap ? parentMap.name : "Mapa Superior"}</span>
                  </motion.button>
                )
              )}

              {/* Main Interactive Map Stage */}
              <div className="flex-1 relative overflow-hidden flex">
                <MapContainer
                  isNoUi={isNoUi}
                  map={activeMap}
                  markers={activeMapMarkers}
                  lights={showLights ? activeMapLights : []}
                  showMarkers={showMarkers}
                  showLights={showLights}
                  hideHelpers={hideHelpers}
                  pendingMarkerPos={pendingMarkerPos}
                  pickingColor={pickingEmissive || pickingWater || pickingWind || !!pickingMovingPartColorId}
                  pickingWallColor={pickingWallColor || !!pickingAvoidColorId}
                  pickingSmartObstacle={pickingSmartObstacle}
                  smartObstacleTolerance={smartObstacleTolerance}
                  onSmartObstacleCreated={(newWalls) => {
                    saveWalls([...walls, ...newWalls]);
                    setSmartSelectionCount(newWalls.length);
                    setPickingSmartObstacle(false);
                    setTimeout(() => {
                      setSmartSelectionCount(null);
                    }, 3000);
                  }}
                  parentMapId={effectiveParentMapId}
                  zoom={zoom}
                  pan={pan}
                  onZoomChange={setZoom}
                  onPanChange={setPan}
                  onImageLoaded={() => {
                    setCloudTransition((prev) => {
                      if (prev.isActive && prev.phase === "covered") {
                        setTimeout(() => {
                          setCloudTransition((p) => ({ ...p, phase: "parting" }));
                          setTimeout(() => {
                            setCloudTransition({
                              isActive: false,
                              phase: "entering",
                              targetMapId: null,
                              themeId: "classic",
                              targetMapName: undefined,
                            });
                          }, 1700);
                        }, 400);
                      }
                      return prev;
                    });
                  }}
                  
                  walls={walls.filter((w) => w.map_id === activeMapId)}
                  drawingWalls={drawingWalls}
                  onAddWall={(x1, y1, x2, y2) => {
                    if (!activeMapId) return;
                    const newWall: Wall = {
                      id: "wall-" + Math.random().toString(36).substring(2, 9),
                      map_id: activeMapId,
                      x1,
                      y1,
                      x2,
                      y2,
                    };
                    saveWalls([...walls, newWall]);
                  }}
                  onDeleteWall={(wallId) => {
                    saveWalls(walls.filter((w) => w.id !== wallId));
                  }}
                  pickingMagicWindZone={pickingMagicWindZone}
                  magicWindTolerance={magicWindTolerance}
                  onAddWindZone={handleAddWindZone}
                  onDeleteWindZone={handleDeleteWindZone}
                  
                  focusTargetMarker={focusTargetMarker}
                  onFocusMarkerDone={() => setFocusTargetMarker(null)}
                  
                  isPaintingZone={isPaintingZone}
                  paintMode={paintMode}
                  onPaintModeChange={setPaintMode}
                  paintTolerance={paintTolerance}
                  onPaintToleranceChange={setPaintTolerance}
                  zonePaintPoints={zonePaintPoints}
                  zonePaintColor={zonePaintColor}
                  zonePaintOpacity={zonePaintOpacity}
                  onZonePointsChange={setZonePaintPoints}
                  onFinishZonePainting={() => {
                    setIsPaintingZone(false);
                  }}
                  onCancelZonePainting={() => {
                    setIsPaintingZone(false);
                  }}
                  
                  onMapClick={(pctX, pctY, scrX, scrY) => {
                    if (drawingWalls || pickingSmartObstacle || pickingMagicWindZone || isPaintingZone) return;
                    if (isNoUi) {
                      setViewingMarker(null);
                      setEditingMarker(null);
                      setEditingLight(null);
                      setPendingMarkerPos(null);
                      return;
                    }
                    if (pickingMovingPartPos && activeMapId && activeMap) {
                      const newPart = {
                        id: "part-" + Math.random().toString(36).substring(2, 9),
                        name: "Pieza Móvil " + ((activeMap.moving_parts || []).length + 1),
                        x: pctX,
                        y: pctY,
                        radius: 12,
                        type: "rotation_cw" as const,
                        speed: 5,
                      };
                      const updatedParts = [...(activeMap.moving_parts || []), newPart];
                      handleMapUpdated({ moving_parts: updatedParts });
                      setPickingMovingPartPos(false);
                      return;
                    }
                    // Check if clicking map resets selections or triggers new place form
                    setViewingMarker(null);
                    setEditingMarker(null);
                    setEditingLight(null);
                    setPendingMarkerPos({ x: pctX, y: pctY });
                  }}
                  onMarkerClick={(marker) => {
                    if (isNoUi && marker.linked_map_id) {
                      triggerCloudTransition(marker.linked_map_id);
                      return;
                    }
                    setViewingMarker(marker);
                    setPendingMarkerPos(null);
                    setEditingLight(null);
                    setEditingMarker(null);
                  }}
                  onLightClick={(light) => {
                    if (isNoUi) return;
                    setEditingLight(light);
                    setPendingMarkerPos(null);
                    setViewingMarker(null);
                    setEditingMarker(null);
                  }}
                  onMarkerMoved={handleMarkerMoved}
                  onLightMoved={handleLightMoved}
                  onZoomInToMap={(submapId) => {
                    triggerCloudTransition(submapId);
                  }}
                  onZoomOutToParent={effectiveParentMapId ? () => {
                    triggerCloudTransition(effectiveParentMapId);
                  } : undefined}
                  onColorPicked={(hexColor) => {
                    if (pickingEmissive) {
                      handleAddEmissiveColor(hexColor);
                      setPickingEmissive(false);
                    } else if (pickingWater) {
                      handleAddWaterColor(hexColor);
                      setPickingWater(false);
                    } else if (pickingWind) {
                      handleAddWindColor(hexColor);
                      setPickingWind(false);
                    } else if (pickingMovingPartColorId && activeMap && activeMapId) {
                      const parts = (activeMap.moving_parts || []).map((p) =>
                        p.id === pickingMovingPartColorId ? { ...p, mask_color: hexColor, use_color_mask: true } : p
                      );
                      handleMapUpdated({ moving_parts: parts });
                      setPickingMovingPartColorId(null);
                    }
                  }}
                  generatedFrames={generatedFrames}
                  isPlaying={isPlaying}
                  currentFrameIndex={currentFrameIndex}
                  isPaintingWindMask={isPaintingWindMask}
                  onTogglePaintingWindMask={() => setIsPaintingWindMask(!isPaintingWindMask)}
                  windBrushMode={windBrushMode}
                  windBrushSize={windBrushSize}
                  onSaveWindMask={handleSaveWindMask}
                  showWindMaskPreview={showWindMaskPreview}
                  onWallColorPicked={(hexColor) => {
                    if (pickingAvoidColorId) {
                      const list = [...(activeMap.weather_effects_v2 || [])];
                      const index = list.findIndex((c) => c.id === pickingAvoidColorId);
                      if (index !== -1) {
                        const eff = { ...list[index] };
                        const colors = eff.avoid_colors ? [...eff.avoid_colors] : [];
                        if (eff.avoid_color && colors.length === 0) {
                          colors.push({ color: eff.avoid_color, tolerance: eff.avoid_color_tolerance ?? 25 });
                        }
                        if (!colors.some(c => c.color.toLowerCase() === hexColor.toLowerCase())) {
                          colors.push({ color: hexColor, tolerance: 25 });
                        }
                        eff.avoid_color = hexColor;
                        eff.avoid_color_tolerance = eff.avoid_color_tolerance ?? 25;
                        eff.avoid_colors = colors;
                        list[index] = eff;
                        handleMapUpdated({ weather_effects_v2: list });
                      }
                      setPickingAvoidColorId(null);
                    } else {
                      const list = activeMap.wall_colors_v2 ? [...activeMap.wall_colors_v2] : [];
                      if (activeMap.wall_color && list.length === 0) {
                        list.push({ color: activeMap.wall_color, tolerance: activeMap.wall_color_tolerance ?? 25 });
                      }
                      if (!list.some(item => item.color === hexColor)) {
                        list.push({ color: hexColor, tolerance: 25 });
                      }
                      handleMapUpdated({
                        wall_color: hexColor,
                        wall_color_tolerance: activeMap.wall_color_tolerance ?? 25,
                        wall_colors_v2: list,
                      });
                      setPickingWallColor(false);
                    }
                  }}
                />

                {/* Sidebar Tab Controller Panels */}
                {!isNoUi && (
                  <MapSidebar
                    activeTab={activeSideTab}
                    onTabChange={setActiveSideTab}
                    markers={markers.filter((m) => m.map_id === activeMapId)}
                    layers={activeMapLayers}
                    onLayerToggle={handleLayerToggle}
                    generatedFrames={generatedFrames}
                    onGeneratedFramesChange={setGeneratedFrames}
                    isPlaying={isPlaying}
                    onIsPlayingChange={setIsPlaying}
                    currentFrameIndex={currentFrameIndex}
                    onCurrentFrameIndexChange={setCurrentFrameIndex}
                    onAddMarker={() => {
                      setPendingMarkerPos({ x: 50, y: 50 });
                      setActiveSideTab(null);
                    }}
                    onMarkerClick={(m) => {
                      setViewingMarker(m);
                      setActiveSideTab(null);
                    }}
                    onLayerCreated={handleLayerCreated}
                    onLayerDeleted={handleLayerDeleted}
                    map={activeMap}
                    onMapUpdated={handleMapUpdated}
                    showLights={showLights}
                    activeMapLights={activeMapLights}
                    onToggleLights={() => setShowLights(!showLights)}
                    pickingColor={pickingEmissive}
                    onStartColorPick={() => {
                      setPickingEmissive(true);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                    }}
                    pickingWaterColor={pickingWater}
                    onStartWaterPick={() => {
                      setPickingWater(true);
                      setPickingEmissive(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                    }}
                    pickingWindColor={pickingWind}
                    onStartWindPick={() => {
                      setPickingWind(true);
                      setPickingWater(false);
                      setPickingEmissive(false);
                      setPickingMagicWindZone(false);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                    }}
                    pickingMovingPartPos={pickingMovingPartPos}
                    onStartMovingPartPosPick={() => {
                      setPickingMovingPartPos(!pickingMovingPartPos);
                      setPickingMovingPartColorId(null);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                    }}
                    pickingMovingPartColorId={pickingMovingPartColorId}
                    onStartMovingPartColorPick={(partId) => {
                      setPickingMovingPartColorId(partId === pickingMovingPartColorId ? null : partId);
                      setPickingMovingPartPos(false);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                    }}
                    hasLights={activeMapLights.length > 0}
                    onClearLights={() => {
                      const filtered = lights.filter((l) => l.map_id !== activeMapId);
                      saveLights(filtered);
                    }}
                    drawingWalls={drawingWalls}
                    onToggleDrawingWalls={() => {
                      setDrawingWalls(!drawingWalls);
                      setPendingMarkerPos(null);
                      setPickingWallColor(false);
                      setPickingSmartObstacle(false);
                      setPickingWind(false);
                    }}
                    hasWalls={walls.length > 0}
                    onClearWalls={() => {
                      saveWalls([]);
                    }}
                    pickingWallColor={pickingWallColor}
                    onStartWallColorPick={() => {
                      setPickingWallColor(true);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingSmartObstacle(false);
                    }}
                    selectedWallColor={activeMap.wall_color}
                    onSelectedWallColorChange={(color) => {
                      handleMapUpdated({ wall_color: color });
                    }}
                    wallColorTolerance={activeMap.wall_color_tolerance ?? 25}
                    onWallColorToleranceChange={(tolerance) => {
                      handleMapUpdated({ wall_color_tolerance: tolerance });
                    }}
                    pickingSmartObstacle={pickingSmartObstacle}
                    onToggleSmartObstaclePick={() => {
                      setPickingSmartObstacle(!pickingSmartObstacle);
                      setPickingWallColor(false);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingAvoidColorId(null);
                    }}
                    smartObstacleTolerance={smartObstacleTolerance}
                    onSmartObstacleToleranceChange={setSmartObstacleTolerance}
                    pickingMagicWindZone={pickingMagicWindZone}
                    onToggleMagicWindPick={() => {
                      setPickingMagicWindZone(!pickingMagicWindZone);
                      setPickingSmartObstacle(false);
                      setPickingWallColor(false);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingAvoidColorId(null);
                    }}
                    magicWindTolerance={magicWindTolerance}
                    onMagicWindToleranceChange={setMagicWindTolerance}
                    isPaintingWindMask={isPaintingWindMask}
                    onTogglePaintingWindMask={() => setIsPaintingWindMask(!isPaintingWindMask)}
                    windBrushMode={windBrushMode}
                    onWindBrushModeChange={setWindBrushMode}
                    windBrushSize={windBrushSize}
                    onWindBrushSizeChange={setWindBrushSize}
                    onClearWindMask={handleClearWindMask}
                    showWindMaskPreview={showWindMaskPreview}
                    onToggleShowWindMaskPreview={() => setShowWindMaskPreview(!showWindMaskPreview)}
                    pickingAvoidColorId={pickingAvoidColorId}
                    onStartAvoidColorPick={(id) => {
                      setPickingAvoidColorId(id);
                      setPickingWallColor(false);
                      setPickingEmissive(false);
                      setPickingWater(false);
                      setPickingWind(false);
                      setPickingMagicWindZone(false);
                      setPickingSmartObstacle(false);
                    }}
                    onOpenEffectClipboard={() => setShowEffectClipboardModal(true)}
                  />
                )}
              </div>

              {/* Floating Bottom Quick Toggles Footer */}
              {!isNoUi && (
                <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2">
                  <button
                    onClick={() => setShowMarkers(!showMarkers)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border text-xs font-body font-bold shadow-lg cursor-pointer transition-all ${
                      showMarkers
                        ? "bg-gold/10 border-gold/40 text-gold"
                        : "bg-void/80 border-umber text-vellum/40 hover:text-vellum hover:border-gold/20"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showMarkers ? "bg-gold animate-pulse" : "bg-vellum/20"}`} />
                    {showMarkers ? "Ocultar lugares" : "Mostrar lugares"}
                  </button>

                  {activeMap?.music_url && (
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-void/90 backdrop-blur-md border border-umber text-vellum text-xs shadow-lg font-body">
                      <div className="flex items-center gap-1.5 text-gold font-semibold">
                        <Music size={13} className={isPlayingMusic ? "animate-spin [animation-duration:8s]" : "opacity-60"} />
                        <span className="max-w-[110px] truncate text-[10px] font-mono tracking-wide" title={activeMap.music_url}>
                          {activeMap.music_url.substring(activeMap.music_url.lastIndexOf('/') + 1) || "Música"}
                        </span>
                      </div>

                      <div className="w-px h-3.5 bg-umber" />

                      <button
                        onClick={() => setIsPlayingMusic(!isPlayingMusic)}
                        className="w-5 h-5 rounded-full bg-sepia border border-umber hover:border-gold/35 flex items-center justify-center text-vellum/80 hover:text-vellum transition-all cursor-pointer"
                        title={isPlayingMusic ? "Pausar música de ambiente" : "Reproducir música de ambiente (Bucle)"}
                      >
                        {isPlayingMusic ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                      </button>

                      <div className="flex items-center gap-1.5 group">
                        <button 
                          type="button"
                          onClick={() => setMusicVolume(musicVolume === 0 ? 0.5 : 0)}
                          className="text-vellum/50 hover:text-vellum transition-colors"
                        >
                          {musicVolume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                          className="w-12 h-0.5 bg-umber rounded-lg appearance-none cursor-pointer accent-gold border-none outline-none group-hover:w-16 transition-all"
                          title="Volumen de ambientación"
                        />
                      </div>

                      <a
                        href={activeMap.music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-5 h-5 rounded-full bg-sepia border border-umber hover:border-gold/35 flex items-center justify-center text-gold/80 hover:text-gold transition-all"
                        title="Abrir enlace de música en bucle externo"
                      >
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Zoom indicators inside canvas bottom center */}
              {!isNoUi && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-full bg-void/80 backdrop-blur-md border border-umber text-vellum/50 font-mono text-[10px] tracking-widest uppercase">
                    Workspace Activo
                  </div>
                </div>
              )}

              {/* --- OVERLAY EDITOR FORMS & MODALS --- */}
              <AnimatePresence>
                {/* Marker Form Dialog */}
                {(pendingMarkerPos || editingMarker) && (
                  <MarkerForm
                    mapId={activeMapId || ""}
                    layers={activeMapLayers}
                    allMaps={maps}
                    marker={editingMarker}
                    position={pendingMarkerPos}
                    onCancel={() => {
                      setPendingMarkerPos(null);
                      setEditingMarker(null);
                      setIsPaintingZone(false);
                      setZonePaintPoints([]);
                    }}
                    onSaved={handleSavedMarker}
                    isPaintingZone={isPaintingZone}
                    onTogglePaintingZone={setIsPaintingZone}
                    paintMode={paintMode}
                    onPaintModeChange={setPaintMode}
                    paintTolerance={paintTolerance}
                    onPaintToleranceChange={setPaintTolerance}
                    zonePaintPoints={zonePaintPoints}
                    onZonePointsChange={setZonePaintPoints}
                    zonePaintColor={zonePaintColor}
                    onZoneColorChange={setZonePaintColor}
                    zonePaintOpacity={zonePaintOpacity}
                    onZoneOpacityChange={setZonePaintOpacity}
                    onStartPaintZone={(data) => {
                      setIsPaintingZone(true);
                      setZonePaintPoints(data.points || []);
                      setZonePaintColor(data.color || "#E67E22");
                      setZonePaintOpacity(data.opacity ?? 0.25);
                    }}
                    paintedZonePoints={zonePaintPoints}
                  />
                )}

                {/* Marker Detail Drawer */}
                {viewingMarker && !editingMarker && (
                  <MarkerDrawer
                    marker={viewingMarker}
                    linkedMap={maps.find((m) => m.id === viewingMarker.linked_map_id) || null}
                    onClose={() => setViewingMarker(null)}
                    onEdit={() => {
                      setEditingMarker(viewingMarker);
                    }}
                    onDelete={() => {
                      handleDeleteMarker(viewingMarker.id);
                    }}
                    onNavigateToSubmap={(subId) => {
                      triggerCloudTransition(subId);
                    }}
                    onFocusMarker={(m) => {
                      setFocusTargetMarker(m);
                    }}
                    readOnly={isNoUi}
                  />
                )}

                {/* Light Form Dialog */}
                {editingLight && !isNoUi && (
                  <LightForm
                    light={editingLight}
                    onCancel={() => setEditingLight(null)}
                    onChange={(updatedData) => {
                      setEditingLight((prev) => (prev ? { ...prev, ...updatedData } : null));
                      setLights((prev) =>
                        prev.map((l) => (l.id === editingLight.id ? { ...l, ...updatedData } : l))
                      );
                    }}
                    onSaved={handleSavedLight}
                    onDeleted={handleDeleteLight}
                  />
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 bg-void flex flex-col items-center justify-center gap-4">
              <MapIcon size={32} className="text-vellum/20 animate-bounce" />
              <p className="font-heading text-sm uppercase tracking-widest text-vellum/40">Mapa no encontrado</p>
              {!isNoUi && (
                <button
                  onClick={navigateToDashboard}
                  className="text-gold text-xs font-body hover:underline uppercase tracking-wider"
                >
                  Volver al inicio
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- POPUP GLOBAL DIALOGS (SHARED) --- */}
      <AnimatePresence>
        {activeFolderModal.show && (
          <FolderModal
            show={activeFolderModal.show}
            folder={activeFolderModal.folder}
            folders={folders}
            defaultParentId={activeFolderModal.defaultParentId}
            onClose={() => setActiveFolderModal({ show: false, folder: null, defaultParentId: undefined })}
            onSaved={handleSavedFolder}
          />
        )}

        {activeMapModal.show && (
          <MapModal
            show={activeMapModal.show}
            map={activeMapModal.map}
            folders={folders}
            maps={maps}
            defaultFolderId={activeMapModal.defaultFolderId}
            onClose={() => setActiveMapModal({ show: false, map: null })}
            onSaved={handleSavedMap}
          />
        )}

        {showEffectClipboardModal && activeMap && (
          <EffectClipboardModal
            isOpen={showEffectClipboardModal}
            onClose={() => setShowEffectClipboardModal(false)}
            currentMap={activeMap}
            allMaps={maps}
            onUpdateMap={async (updates) => {
              handleMapUpdated(updates);
            }}
            onLoadGitHub={handleLoadFromGitHub}
            isFetchingGitHub={isFetchingGitHub}
            onShowToast={(msg) => setHardcodeSaveStatus({ type: "success", message: msg })}
          />
        )}

        {/* Clash of Clans Style Dynamic Planar Cloud Transition Overlay */}
        <PlanarCloudOverlay
          isActive={cloudTransition.isActive}
          phase={cloudTransition.phase}
          themeId={cloudTransition.themeId}
          targetMapName={cloudTransition.targetMapName}
        />
      </AnimatePresence>
    </div>
  );
}
