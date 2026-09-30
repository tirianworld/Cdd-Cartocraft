import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Flag,
  Layers,
  Sparkles,
  Zap,
  Droplets,
  Eye,
  EyeOff,
  Trash2,
  X,
  Pipette,
  PenTool,
  Sliders,
  Wind,
  Film,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Download,
  Loader,
  RefreshCw,
  Activity,
  Paintbrush,
  Eraser,
  Copy,
  ClipboardPaste,
  Check,
} from "lucide-react";
import { Map, Layer, Marker, WeatherEffectConfig, Light, MovingPart, WindZone } from "../types";
import FoundryEnvironmentInspector from "./FoundryEnvironmentInspector";

// Sidebar tabs
interface TabConfig {
  id: string;
  icon: any;
  label: string;
}

const SIDE_TABS: TabConfig[] = [
  { id: "regions", icon: Flag, label: "Regiones" },
  { id: "layers", icon: Layers, label: "Capas" },
  { id: "ambient", icon: Sparkles, label: "Ambiente" },
  { id: "emissive", icon: Zap, label: "Color emisor" },
  { id: "water", icon: Droplets, label: "Agua animada" },
  { id: "wind", icon: Wind, label: "Viento" },
  { id: "mechanical", icon: Film, label: "Animación Mecánica" },
];

interface MapSidebarProps {
  activeTab: string | null;
  onTabChange: (tab: string | null) => void;
  markers: Marker[];
  layers: Layer[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onAddMarker: () => void;
  onMarkerClick: (marker: Marker) => void;
  onLayerCreated: (name: string) => Promise<void>;
  onLayerDeleted: (layerId: string) => Promise<void>;
  map: Map;
  onMapUpdated: (updatedMap: Partial<Map>) => Promise<void>;

  // Lights trigger toggles
  showLights: boolean;
  onToggleLights: () => void;

  // Emissive controllers
  pickingColor: boolean;
  onStartColorPick: () => void;

  // Water controllers
  pickingWaterColor: boolean;
  onStartWaterPick: () => void;

  // Wind controllers
  pickingWindColor: boolean;
  onStartWindPick: () => void;

  // Wind Brush & Mask Painting controllers
  isPaintingWindMask?: boolean;
  onTogglePaintingWindMask?: () => void;
  windBrushMode?: "paint" | "erase";
  onWindBrushModeChange?: (mode: "paint" | "erase") => void;
  windBrushSize?: number;
  onWindBrushSizeChange?: (size: number) => void;
  onClearWindMask?: () => void;
  showWindMaskPreview?: boolean;
  onToggleShowWindMaskPreview?: () => void;

  // Clear all lights trigger
  hasLights?: boolean;
  onClearLights?: () => void;

  // Wall drawing toggles
  drawingWalls?: boolean;
  onToggleDrawingWalls?: () => void;
  hasWalls?: boolean;
  onClearWalls?: () => void;

  // Wall color blocker props
  pickingWallColor?: boolean;
  onStartWallColorPick?: () => void;
  selectedWallColor?: string;
  onSelectedWallColorChange?: (color: string | undefined) => void;
  wallColorTolerance?: number;
  onWallColorToleranceChange?: (tolerance: number) => void;

  // Individual avoid color picker props
  pickingAvoidColorId?: string | null;
  onStartAvoidColorPick?: (id: string) => void;

  // Smart selection tool props
  pickingSmartObstacle?: boolean;
  onToggleSmartObstaclePick?: () => void;
  smartObstacleTolerance?: number;
  onSmartObstacleToleranceChange?: (val: number) => void;

  // Magic wind zone selection tool props
  pickingMagicWindZone?: boolean;
  onToggleMagicWindPick?: () => void;
  magicWindTolerance?: number;
  onMagicWindToleranceChange?: (val: number) => void;

  // Active Map Lights for mechanical loop frame generation
  activeMapLights?: Light[];

  // Moving parts controllers
  pickingMovingPartPos?: boolean;
  onStartMovingPartPosPick?: () => void;
  pickingMovingPartColorId?: string | null;
  onStartMovingPartColorPick?: (partId: string) => void;

  // Lifted animation states
  generatedFrames?: string[];
  onGeneratedFramesChange?: (frames: string[]) => void;
  isPlaying?: boolean;
  onIsPlayingChange?: (playing: boolean) => void;
  currentFrameIndex?: number;
  onCurrentFrameIndexChange?: (index: number | ((prev: number) => number)) => void;

  // Effects Clipboard
  onOpenEffectClipboard?: () => void;
}

export default function MapSidebar({
  activeTab,
  onTabChange,
  markers,
  layers,
  onLayerToggle,
  onAddMarker,
  onMarkerClick,
  onLayerCreated,
  onLayerDeleted,
  map,
  onMapUpdated,
  showLights,
  onToggleLights,
  pickingColor,
  onStartColorPick,
  pickingWaterColor,
  onStartWaterPick,
  pickingWindColor,
  onStartWindPick,
  isPaintingWindMask = false,
  onTogglePaintingWindMask,
  windBrushMode = "paint",
  onWindBrushModeChange,
  windBrushSize = 35,
  onWindBrushSizeChange,
  onClearWindMask,
  showWindMaskPreview = false,
  onToggleShowWindMaskPreview,
  hasLights = false,
  onClearLights,
  drawingWalls = false,
  onToggleDrawingWalls,
  hasWalls = false,
  onClearWalls,
  pickingWallColor = false,
  onStartWallColorPick,
  selectedWallColor,
  onSelectedWallColorChange,
  wallColorTolerance = 25,
  onWallColorToleranceChange,
  pickingAvoidColorId = null,
  onStartAvoidColorPick,
  pickingSmartObstacle = false,
  onToggleSmartObstaclePick,
  smartObstacleTolerance = 15,
  onSmartObstacleToleranceChange,
  pickingMagicWindZone = false,
  onToggleMagicWindPick,
  magicWindTolerance = 25,
  onMagicWindToleranceChange,
  activeMapLights = [],
  pickingMovingPartPos = false,
  onStartMovingPartPosPick,
  pickingMovingPartColorId = null,
  onStartMovingPartColorPick,
  generatedFrames: propGeneratedFrames,
  onGeneratedFramesChange,
  isPlaying: propIsPlaying,
  onIsPlayingChange,
  currentFrameIndex: propCurrentFrameIndex,
  onCurrentFrameIndexChange,
  onOpenEffectClipboard,
}: MapSidebarProps) {
  const [newLayerName, setNewLayerName] = useState("");
  const [isSubmittingLayer, setIsSubmittingLayer] = useState(false);
  const [, startTransition] = useTransition();

  // Mechanical Animation States
  const handleClearAIAnimation = () => {
    onMapUpdated({
      ai_animation_layers: [],
      ai_global_adjustments: undefined,
      ai_animation_prompt: "",
      moving_parts: []
    });
    setGeneratedFrames([]);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  };

  const [totalFrames, setTotalFrames] = useState(8);
  const [fps, setFps] = useState(8);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisStats, setAnalysisStats] = useState<{
    waterCount: number;
    windCount: number;
    emissiveCount: number;
    waterPercent: number;
    windPercent: number;
    emissivePercent: number;
    lightsCount: number;
  } | null>(null);
  const [localGeneratedFrames, localSetGeneratedFrames] = useState<string[]>([]);
  const [localIsPlaying, localSetIsPlaying] = useState(false);
  const [localCurrentFrameIndex, localSetCurrentFrameIndex] = useState(0);

  const generatedFrames = propGeneratedFrames !== undefined ? propGeneratedFrames : localGeneratedFrames;
  const setGeneratedFrames = (val: string[] | ((prev: string[]) => string[])) => {
    if (typeof val === "function") {
      const newVal = val(generatedFrames);
      if (onGeneratedFramesChange) onGeneratedFramesChange(newVal);
      localSetGeneratedFrames(newVal);
    } else {
      if (onGeneratedFramesChange) onGeneratedFramesChange(val);
      localSetGeneratedFrames(val);
    }
  };

  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : localIsPlaying;
  const setIsPlaying = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === "function") {
      const newVal = val(isPlaying);
      if (onIsPlayingChange) onIsPlayingChange(newVal);
      localSetIsPlaying(newVal);
    } else {
      if (onIsPlayingChange) onIsPlayingChange(val);
      localSetIsPlaying(val);
    }
  };

  const currentFrameIndex = propCurrentFrameIndex !== undefined ? propCurrentFrameIndex : localCurrentFrameIndex;
  const setCurrentFrameIndex = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      const newVal = val(currentFrameIndex);
      if (onCurrentFrameIndexChange) onCurrentFrameIndexChange(newVal);
      localSetCurrentFrameIndex(newVal);
    } else {
      if (onCurrentFrameIndexChange) onCurrentFrameIndexChange(val);
      localSetCurrentFrameIndex(val);
    }
  };

  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return { r, g, b };
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying && generatedFrames.length > 0) {
      timer = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % generatedFrames.length);
      }, 1000 / fps);
    }
    return () => clearInterval(timer);
  }, [isPlaying, generatedFrames, fps]);

  const handleDownloadAllFrames = async () => {
    if (generatedFrames.length === 0) return;
    for (let i = 0; i < generatedFrames.length; i++) {
      const link = document.createElement("a");
      link.href = generatedFrames[i];
      link.download = `${map.name.replace(/\s+/g, "_")}_fotograma_${i + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  };

  const handleGenerateMechanicalFrames = (overrideMap?: Partial<Map>) => {
    if (!map.cover_image) return;
    
    setIsAnalyzing(true);
    setAnalysisStep("Cargando imagen del mapa...");
    
    const activeMap = overrideMap ? { ...map, ...overrideMap } : map;
    const img = new Image();
    if (!map.cover_image.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = async () => {
      try {
        const maxDim = 500;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsAnalyzing(false);
          return;
        }
        
        ctx.drawImage(img, 0, 0, w, h);
        const baseImgData = ctx.getImageData(0, 0, w, h);
        const pixels = baseImgData.data;
        const totalPixels = w * h;
        
        const waterFilters = (activeMap.water_colors || []).map(wc => ({
          ...hexToRgb(wc.color),
          threshold: ((wc.similarity ?? 30) / 100) * 441.7,
        }));
        
        const windFilters = (activeMap.wind_colors || []).map(wc => ({
          ...hexToRgb(wc.color),
          threshold: ((wc.similarity ?? 30) / 100) * 441.7,
        }));
        
        const emissiveFilters = (activeMap.emissive_colors || []).map(ec => ({
          ...hexToRgb(ec.color),
          threshold: ((ec.similarity ?? 30) / 100) * 441.7,
        }));
        
        setAnalysisStep("Escaneando capas y colores del mapa...");
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        const waterMask = ctx.createImageData(w, h);
        const windMask = ctx.createImageData(w, h);
        const emissiveMask = ctx.createImageData(w, h);
        
        let waterCount = 0;
        let windCount = 0;
        let emissiveCount = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          if (a === 0) continue;
          
          let isWater = false;
          for (const wf of waterFilters) {
            const dr = r - wf.r;
            const dg = g - wf.g;
            const db = b - wf.b;
            if (Math.sqrt(dr*dr + dg*dg + db*db) <= wf.threshold) {
              isWater = true;
              break;
            }
          }
          
          let isWind = false;
          if (!isWater) {
            for (const wf of windFilters) {
              const dr = r - wf.r;
              const dg = g - wf.g;
              const db = b - wf.b;
              if (Math.sqrt(dr*dr + dg*dg + db*db) <= wf.threshold) {
                isWind = true;
                break;
              }
            }
          }
          
          let isEmissive = false;
          if (!isWater && !isWind) {
            for (const ef of emissiveFilters) {
              const dr = r - ef.r;
              const dg = g - ef.g;
              const db = b - ef.b;
              if (Math.sqrt(dr*dr + dg*dg + db*db) <= ef.threshold) {
                isEmissive = true;
                break;
              }
            }
          }
          
          if (isWater) {
            waterMask.data[i] = r;
            waterMask.data[i+1] = g;
            waterMask.data[i+2] = b;
            waterMask.data[i+3] = 255;
            waterCount++;
          }
          if (isWind) {
            windMask.data[i] = r;
            windMask.data[i+1] = g;
            windMask.data[i+2] = b;
            windMask.data[i+3] = 255;
            windCount++;
          }
          if (isEmissive) {
            emissiveMask.data[i] = r;
            emissiveMask.data[i+1] = g;
            emissiveMask.data[i+2] = b;
            emissiveMask.data[i+3] = 255;
            emissiveCount++;
          }
        }
        
        setAnalysisStep("Creando máscaras de animación...");
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        const waterCanvas = document.createElement("canvas");
        waterCanvas.width = w;
        waterCanvas.height = h;
        waterCanvas.getContext("2d")?.putImageData(waterMask, 0, 0);
        
        const windCanvas = document.createElement("canvas");
        windCanvas.width = w;
        windCanvas.height = h;
        windCanvas.getContext("2d")?.putImageData(windMask, 0, 0);
        
        const emissiveCanvas = document.createElement("canvas");
        emissiveCanvas.width = w;
        emissiveCanvas.height = h;
        emissiveCanvas.getContext("2d")?.putImageData(emissiveMask, 0, 0);

        // Pre-extract moving parts masks
        const movingPartCanvases = (activeMap.moving_parts || []).map((part) => {
          const partCanvas = document.createElement("canvas");
          partCanvas.width = w;
          partCanvas.height = h;
          const pctx = partCanvas.getContext("2d");
          if (!pctx) return null;

          const px = (part.x / 100) * w;
          const py = (part.y / 100) * h;
          const r_px = (part.radius / 100) * w;

          pctx.save();
          pctx.beginPath();
          pctx.arc(px, py, r_px, 0, Math.PI * 2);
          pctx.clip();
          pctx.drawImage(img, 0, 0, w, h);
          pctx.restore();

          if (part.use_color_mask && part.mask_color) {
            const pImgData = pctx.getImageData(0, 0, w, h);
            const pPixels = pImgData.data;
            const targetColor = hexToRgb(part.mask_color);
            const tol = ((part.mask_tolerance ?? 30) / 100) * 441.7;

            for (let i = 0; i < pPixels.length; i += 4) {
              const a = pPixels[i + 3];
              if (a === 0) continue;

              const r = pPixels[i];
              const g = pPixels[i + 1];
              const b = pPixels[i + 2];

              const dr = r - targetColor.r;
              const dg = g - targetColor.g;
              const db = b - targetColor.b;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist > tol) {
                pPixels[i + 3] = 0;
              }
            }
            pctx.putImageData(pImgData, 0, 0);
          }

          return {
            part,
            canvas: partCanvas,
            px,
            py,
            r_px,
          };
        }).filter(Boolean) as Array<{
          part: MovingPart;
          canvas: HTMLCanvasElement;
          px: number;
          py: number;
          r_px: number;
        }>;
        
        const stats = {
          waterCount,
          windCount,
          emissiveCount,
          waterPercent: parseFloat(((waterCount / totalPixels) * 100).toFixed(1)),
          windPercent: parseFloat(((windCount / totalPixels) * 100).toFixed(1)),
          emissivePercent: parseFloat(((emissiveCount / totalPixels) * 100).toFixed(1)),
          lightsCount: activeMapLights?.length ?? 0,
          movingPartsCount: activeMap.moving_parts?.length ?? 0,
        };
        setAnalysisStats(stats);
        
        const frames: string[] = [];
        const maxSway = 2 + ((activeMap.wind_strength ?? 25) / 100) * 14;
        
        const isAiAnimated = activeMap.ai_animation_layers && activeMap.ai_animation_layers.length > 0;
        const actualFrames = isAiAnimated ? 30 : totalFrames;
        
        for (let f = 0; f < actualFrames; f++) {
          setAnalysisStep(`Sintetizando fotograma ${f + 1} de ${actualFrames}...`);
          await new Promise((resolve) => setTimeout(resolve, 50));
          
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = w;
          frameCanvas.height = h;
          const fctx = frameCanvas.getContext("2d");
          if (!fctx) continue;
          
          // Apply screen shake translation globally before anything is drawn!
          let shakeX = 0;
          let shakeY = 0;
          if (activeMap.ai_global_adjustments) {
            const sXList = activeMap.ai_global_adjustments.shake_x_30_frames;
            const sYList = activeMap.ai_global_adjustments.shake_y_30_frames;
            if (sXList && sXList[f] !== undefined) shakeX = sXList[f];
            if (sYList && sYList[f] !== undefined) shakeY = sYList[f];
          }
          
          fctx.save();
          if (shakeX !== 0 || shakeY !== 0) {
            fctx.translate(shakeX, shakeY);
          }
          
          fctx.drawImage(img, 0, 0, w, h);
          
          if (waterCount > 0) {
            const angle = (f / actualFrames) * Math.PI * 2;
            const dx = Math.sin(angle) * 3;
            const dy = Math.cos(angle) * 1.5;
            fctx.save();
            fctx.globalAlpha = 0.85;
            fctx.drawImage(waterCanvas, dx, dy);
            
            fctx.globalAlpha = 0.2;
            fctx.fillStyle = activeMap.water_wave_color || "#ffffff";
            fctx.fillRect(0, 0, w, h);
            fctx.restore();
          }
          
          if (windCount > 0 && activeMap.wind_enabled) {
            const slices = 25;
            const sliceHeight = Math.ceil(h / slices);
            fctx.save();
            for (let s = 0; s < slices; s++) {
              const sy = s * sliceHeight;
              const sh = Math.min(sliceHeight, h - sy);
              if (sh <= 0) continue;
              
              const phase = (s / slices) * Math.PI * 1.5 + (f / actualFrames) * Math.PI * 2;
              const dx = Math.sin(phase) * maxSway;
              
              fctx.drawImage(windCanvas, 0, sy, w, sh, dx, sy, w, sh);
            }
            fctx.restore();
          }
          
          if (emissiveCount > 0) {
            const angle = (f / actualFrames) * Math.PI * 2;
            const glowAlpha = 0.35 + Math.sin(angle) * 0.25;
            fctx.save();
            fctx.globalCompositeOperation = "screen";
            fctx.globalAlpha = glowAlpha;
            fctx.drawImage(emissiveCanvas, 0, 0);
            fctx.restore();
          }
          
          if (activeMapLights && activeMapLights.length > 0) {
            fctx.save();
            fctx.globalCompositeOperation = "screen";
            activeMapLights.forEach(light => {
              const lx = (light.x / 100) * w;
              const ly = (light.y / 100) * h;
              const lradius = ((light.radius ?? 15) / 100) * Math.max(w, h);
              
              const angle = (f / actualFrames) * Math.PI * 2 + light.x;
              const intensityPulse = 0.85 + Math.sin(angle) * 0.15 * (light.intensity ?? 1);
              
              const grad = fctx.createRadialGradient(lx, ly, 0, lx, ly, lradius);
              const lcolor = light.color || "#ffbb44";
              grad.addColorStop(0, `${lcolor}`);
              grad.addColorStop(0.3, `${lcolor}99`);
              grad.addColorStop(1, `${lcolor}00`);
              
              fctx.fillStyle = grad;
              fctx.globalAlpha = (light.intensity ?? 1) * 0.4 * intensityPulse;
              fctx.beginPath();
              fctx.arc(lx, ly, lradius, 0, Math.PI * 2);
              fctx.fill();
            });
            fctx.restore();
          }

          // Render moving parts
          movingPartCanvases.forEach(({ part, canvas: partCanvas, px, py, r_px }) => {
            fctx.save();

            const speedMult = part.speed ?? 5;
            const phase = (f / actualFrames) * Math.PI * 2;
            const startingRad = ((part.angle ?? 0) * Math.PI) / 180;

            if (part.type === "rotation_cw" || part.type === "rotation_ccw") {
              const dir = part.type === "rotation_cw" ? 1 : -1;
              const angle = startingRad + dir * phase * (speedMult / 5);
              
              fctx.translate(px, py);
              fctx.rotate(angle);
              fctx.translate(-px, -py);
              fctx.drawImage(partCanvas, 0, 0);
            } 
            else if (part.type === "sway") {
              const angle = startingRad + Math.sin(phase) * 0.25 * (speedMult / 5);
              
              fctx.translate(px, py);
              fctx.rotate(angle);
              fctx.translate(-px, -py);
              fctx.drawImage(partCanvas, 0, 0);
            } 
            else if (part.type === "pulse") {
              const scale = 1.0 + Math.sin(phase) * 0.08 * (speedMult / 5);
              
              fctx.translate(px, py);
              fctx.scale(scale, scale);
              fctx.translate(-px, -py);
              fctx.drawImage(partCanvas, 0, 0);
            } 
            else if (part.type === "wind_flutter") {
              const slices = 16;
              const sliceWidth = Math.ceil((r_px * 2) / slices);
              const startX = Math.max(0, px - r_px);
              const maxOffset = 1.5 + (speedMult / 5) * 3;

              for (let s = 0; s < slices; s++) {
                const sx = startX + s * sliceWidth;
                const sw = Math.min(sliceWidth, w - sx);
                if (sw <= 0) continue;

                const wavePhase = (s / slices) * Math.PI * 2.0 + phase;
                const dy = Math.sin(wavePhase) * maxOffset;

                fctx.drawImage(partCanvas, sx, 0, sw, h, sx, dy, sw, h);
              }
            }
            else if (part.type === "linear_x") {
              const dx = Math.sin(phase) * r_px * 0.4 * (speedMult / 5);
              fctx.translate(dx, 0);
              fctx.drawImage(partCanvas, 0, 0);
            }
            else if (part.type === "linear_y") {
              const dy = Math.sin(phase) * r_px * 0.4 * (speedMult / 5);
              fctx.translate(0, dy);
              fctx.drawImage(partCanvas, 0, 0);
            }
            else if (part.type === "orbit") {
              const dx = Math.sin(phase) * r_px * 0.25 * (speedMult / 5);
              const dy = Math.cos(phase) * r_px * 0.25 * (speedMult / 5);
              fctx.translate(dx, dy);
              fctx.drawImage(partCanvas, 0, 0);
            }
            else if (part.type === "bounce") {
              const dy = Math.abs(Math.sin(phase)) * -r_px * 0.3 * (speedMult / 5);
              fctx.translate(0, dy);
              fctx.drawImage(partCanvas, 0, 0);
            }
            else if (part.type === "wiggle") {
              const dx = (Math.random() - 0.5) * 4 * (speedMult / 5);
              const dy = (Math.random() - 0.5) * 4 * (speedMult / 5);
              fctx.translate(dx, dy);
              fctx.drawImage(partCanvas, 0, 0);
            }

            fctx.restore();
          });

          // Draw AI procedural animation layers if available
          if (activeMap.ai_animation_layers && activeMap.ai_animation_layers.length > 0) {
            activeMap.ai_animation_layers.forEach((layer) => {
              const val = layer.frame_values[f] ?? (f / 30);
              
              if (layer.type === "portal_vortex") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "screen";
                fctx.globalAlpha = layer.opacity ?? 0.8;
                const coords = layer.coordinates && layer.coordinates.length > 0 ? layer.coordinates : [{ x: 50, y: 50 }];
                coords.forEach((coord) => {
                  const cx = (coord.x / 100) * w;
                  const cy = (coord.y / 100) * h;
                  const r = ((layer.radius ?? 15) / 100) * Math.max(w, h);
                  fctx.save();
                  fctx.translate(cx, cy);
                  fctx.rotate(val * Math.PI * 2);
                  const grad = fctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
                  grad.addColorStop(0, `${layer.color}10`);
                  grad.addColorStop(0.5, `${layer.secondary_color || layer.color}aa`);
                  grad.addColorStop(1, `${layer.color}00`);
                  fctx.fillStyle = grad;
                  fctx.beginPath();
                  fctx.arc(0, 0, r, 0, Math.PI * 2);
                  fctx.fill();
                  fctx.strokeStyle = layer.color;
                  fctx.lineWidth = 3;
                  fctx.beginPath();
                  for (let theta = 0; theta < Math.PI * 4; theta += 0.1) {
                    const rad = (theta / (Math.PI * 4)) * r;
                    const sx = Math.cos(theta) * rad;
                    const sy = Math.sin(theta) * rad;
                    if (theta === 0) fctx.moveTo(sx, sy);
                    else fctx.lineTo(sx, sy);
                  }
                  fctx.stroke();
                  fctx.restore();
                });
                fctx.restore();
              }
              else if (layer.type === "lava_flow") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "overlay";
                fctx.globalAlpha = layer.opacity ?? 0.8;
                const coords = layer.coordinates && layer.coordinates.length > 0 ? layer.coordinates : [{ x: 50, y: 50 }];
                coords.forEach((coord) => {
                  const cx = (coord.x / 100) * w;
                  const cy = (coord.y / 100) * h;
                  const r = ((layer.radius ?? 15) / 100) * Math.max(w, h);
                  const grad = fctx.createRadialGradient(cx, cy, r * (0.3 + Math.sin(val * Math.PI * 2) * 0.1), cx, cy, r);
                  grad.addColorStop(0, layer.color);
                  grad.addColorStop(0.5, layer.secondary_color || "#ffaa00");
                  grad.addColorStop(1, "transparent");
                  fctx.fillStyle = grad;
                  fctx.beginPath();
                  fctx.arc(cx, cy, r, 0, Math.PI * 2);
                  fctx.fill();
                });
                fctx.restore();
              }
              else if (layer.type === "fire_embers") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "screen";
                fctx.globalAlpha = layer.opacity ?? 0.7;
                fctx.fillStyle = layer.color;
                const count = layer.particle_count ?? 40;
                for (let i = 0; i < count; i++) {
                  const seedX = (i * 17) % 100;
                  const seedY = (i * 23) % 100;
                  const px = ((seedX + val * 15) % 100) / 100 * w;
                  const py = ((seedY - val * 40 + 100) % 100) / 100 * h;
                  const size = 1 + ((i * 7) % 4);
                  fctx.beginPath();
                  fctx.arc(px, py, size, 0, Math.PI * 2);
                  fctx.fill();
                }
                fctx.restore();
              }
              else if (layer.type === "storm_lightning") {
                if (val > 0.8) {
                  fctx.save();
                  fctx.globalCompositeOperation = "screen";
                  const flashAlpha = (val - 0.8) * 4 * (layer.opacity ?? 0.6);
                  fctx.fillStyle = layer.color || "#ffffff";
                  fctx.globalAlpha = Math.min(flashAlpha, 0.9);
                  fctx.fillRect(0, 0, w, h);
                  if (val > 0.9) {
                    fctx.strokeStyle = "#ffffff";
                    fctx.lineWidth = 4;
                    fctx.shadowColor = layer.color || "#00f0ff";
                    fctx.shadowBlur = 15;
                    const startX = (w * 0.3) + ((val * 97) % (w * 0.4));
                    fctx.beginPath();
                    fctx.moveTo(startX, 0);
                    let currX = startX;
                    let currY = 0;
                    while (currY < h) {
                      currY += h / 6;
                      currX += (Math.sin(currY + val * 100) * 35);
                      fctx.lineTo(currX, currY);
                    }
                    fctx.stroke();
                  }
                  fctx.restore();
                }
              }
              else if (layer.type === "mist_smoke") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "screen";
                fctx.globalAlpha = layer.opacity ?? 0.4;
                const coords = layer.coordinates && layer.coordinates.length > 0 ? layer.coordinates : [{ x: 30, y: 70 }, { x: 70, y: 30 }];
                coords.forEach((coord, idx) => {
                  const cx = ((coord.x + Math.sin(val * Math.PI * 2 + idx) * 5) / 100) * w;
                  const cy = ((coord.y + Math.cos(val * Math.PI * 2 + idx) * 3) / 100) * h;
                  const r = ((layer.radius ?? 20) / 100) * Math.max(w, h);
                  const grad = fctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                  grad.addColorStop(0, `${layer.color}66`);
                  grad.addColorStop(0.5, `${layer.secondary_color || layer.color}22`);
                  grad.addColorStop(1, "transparent");
                  fctx.fillStyle = grad;
                  fctx.beginPath();
                  fctx.arc(cx, cy, r, 0, Math.PI * 2);
                  fctx.fill();
                });
                fctx.restore();
              }
              else if (layer.type === "water_ripples") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "screen";
                fctx.globalAlpha = layer.opacity ?? 0.6;
                fctx.strokeStyle = layer.color;
                const coords = layer.coordinates && layer.coordinates.length > 0 ? layer.coordinates : [{ x: 50, y: 50 }];
                coords.forEach((coord) => {
                  const cx = (coord.x / 100) * w;
                  const cy = (coord.y / 100) * h;
                  const maxRadius = ((layer.radius ?? 15) / 100) * Math.max(w, h);
                  const ringRadius = (val * maxRadius);
                  fctx.lineWidth = Math.max(0.5, 2 * (1 - val));
                  fctx.beginPath();
                  fctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
                  fctx.stroke();
                });
                fctx.restore();
              }
              else if (layer.type === "glowing_runes" || layer.type === "custom_glow") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "screen";
                const glowAlpha = (0.3 + Math.sin(val * Math.PI * 2) * 0.4) * (layer.opacity ?? 0.8);
                fctx.globalAlpha = Math.max(0.1, glowAlpha);
                const coords = layer.coordinates && layer.coordinates.length > 0 ? layer.coordinates : [{ x: 50, y: 50 }];
                coords.forEach((coord) => {
                  const cx = (coord.x / 100) * w;
                  const cy = (coord.y / 100) * h;
                  const r = ((layer.radius ?? 10) / 100) * Math.max(w, h);
                  const grad = fctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
                  grad.addColorStop(0, layer.color);
                  grad.addColorStop(0.4, layer.secondary_color || layer.color);
                  grad.addColorStop(1, "transparent");
                  fctx.fillStyle = grad;
                  fctx.beginPath();
                  fctx.arc(cx, cy, r, 0, Math.PI * 2);
                  fctx.fill();
                });
                fctx.restore();
              }
              else if (layer.type === "color_shift") {
                fctx.save();
                fctx.globalCompositeOperation = layer.blend_mode || "color";
                fctx.fillStyle = layer.color;
                fctx.globalAlpha = val * (layer.opacity ?? 0.5);
                fctx.fillRect(0, 0, w, h);
                fctx.restore();
              }
              else if (layer.type === "rain_particles") {
                fctx.save();
                fctx.strokeStyle = layer.color || "#ffffff";
                fctx.lineWidth = 1;
                fctx.globalAlpha = layer.opacity ?? 0.6;
                const count = layer.particle_count ?? 80;
                for (let i = 0; i < count; i++) {
                  const seedX = (i * 29) % 100;
                  const seedY = (i * 31) % 100;
                  const px = ((seedX - val * 10) % 100) / 100 * w;
                  const py = ((seedY + val * 80) % 100) / 100 * h;
                  fctx.beginPath();
                  fctx.moveTo(px, py);
                  fctx.lineTo(px - 4, py + 12);
                  fctx.stroke();
                }
                fctx.restore();
              }
              else if (layer.type === "snow_particles") {
                fctx.save();
                fctx.fillStyle = layer.color || "#ffffff";
                fctx.globalAlpha = layer.opacity ?? 0.7;
                const count = layer.particle_count ?? 60;
                for (let i = 0; i < count; i++) {
                  const seedX = (i * 41) % 100;
                  const seedY = (i * 47) % 100;
                  const px = ((seedX + Math.sin(val * Math.PI * 2 + i) * 5) % 100) / 100 * w;
                  const py = ((seedY + val * 30) % 100) / 100 * h;
                  const rSize = 1 + ((i * 3) % 3);
                  fctx.beginPath();
                  fctx.arc(px, py, rSize, 0, Math.PI * 2);
                  fctx.fill();
                }
                fctx.restore();
              }
            });
          }

          fctx.restore(); // Restore global screen shake translation
          
          // Apply global filters (brightness, contrast, hue-rotate)
          let brightness = 1.0;
          let contrast = 1.0;
          let hueRotate = 0;
          if (activeMap.ai_global_adjustments) {
            const bList = activeMap.ai_global_adjustments.brightness_30_frames;
            const cList = activeMap.ai_global_adjustments.contrast_30_frames;
            const hList = activeMap.ai_global_adjustments.hue_rotate_30_frames;
            if (bList && bList[f] !== undefined) brightness = bList[f];
            if (cList && cList[f] !== undefined) contrast = cList[f];
            if (hList && hList[f] !== undefined) hueRotate = hList[f];
          }
          
          if (brightness !== 1.0 || contrast !== 1.0 || hueRotate !== 0) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.drawImage(frameCanvas, 0, 0);
              fctx.clearRect(0, 0, w, h);
              fctx.save();
              fctx.filter = `brightness(${brightness}) contrast(${contrast}) hue-rotate(${hueRotate}deg)`;
              fctx.drawImage(tempCanvas, 0, 0);
              fctx.restore();
            }
          }
          
          frames.push(frameCanvas.toDataURL("image/png"));
        }
        
        setGeneratedFrames(frames);
        setCurrentFrameIndex(0);
        setIsPlaying(true);
        setAnalysisStep("");
        setIsAnalyzing(false);
      } catch (err: any) {
        console.error(err);
        setAnalysisStep("Error en el análisis de imagen: " + err.message);
        setIsAnalyzing(false);
      }
    };
    img.onerror = () => {
      setAnalysisStep("Error al cargar la imagen. CORS o ruta inválida.");
      setIsAnalyzing(false);
    };
    img.src = map.cover_image;
  };


  const regionsList = markers.filter(
    (m) =>
      m.category === "region" ||
      m.category === "painted_zone" ||
      (m.area_points && m.area_points.length > 0)
  );
  const ambientList = markers.filter(m => m.category === "ambient");

  const wallColorsList = map.wall_colors_v2 || (map.wall_color ? [{ color: map.wall_color, tolerance: map.wall_color_tolerance ?? 25 }] : []);

  const handleUpdateWallColorTolerance = (index: number, tolerance: number) => {
    const list = [...wallColorsList];
    list[index] = { ...list[index], tolerance };
    onMapUpdated({
      wall_colors_v2: list,
      ...(index === 0 ? { wall_color_tolerance: tolerance } : {})
    });
  };

  const handleRemoveWallColor = (index: number) => {
    const list = wallColorsList.filter((_, idx) => idx !== index);
    onMapUpdated({
      wall_colors_v2: list,
      wall_color: list.length > 0 ? list[0].color : undefined,
      wall_color_tolerance: list.length > 0 ? (list[0].tolerance ?? 25) : undefined,
    });
  };

  // Handle Layer creations
  const handleCreateLayer = async () => {
    if (!newLayerName.trim() || isSubmittingLayer) return;
    setIsSubmittingLayer(true);
    await onLayerCreated(newLayerName.trim());
    setNewLayerName("");
    setIsSubmittingLayer(false);
  };

  // Helper colors updating
  const handleRemoveEmissiveColor = (index: number) => {
    const list = [...(map.emissive_colors || [])];
    list.splice(index, 1);
    onMapUpdated({ emissive_colors: list });
  };

  const handleEmissiveSimilarityChange = (index: number, val: number) => {
    const list = [...(map.emissive_colors || [])];
    if (list[index]) {
      list[index] = { ...list[index], similarity: val };
    }
    onMapUpdated({ emissive_colors: list });
  };

  const handleEmissiveSpeedChange = (val: number) => {
    onMapUpdated({ emissive_speed: val });
  };

  const handleRemoveWaterColor = (index: number) => {
    const list = [...(map.water_colors || [])];
    list.splice(index, 1);
    onMapUpdated({ water_colors: list });
  };

  const handleWaterSimilarityChange = (index: number, val: number) => {
    const list = [...(map.water_colors || [])];
    if (list[index]) {
      list[index] = { ...list[index], similarity: val };
    }
    onMapUpdated({ water_colors: list });
  };

  const handleWaterBlendModeChange = (index: number, val: string) => {
    const list = [...(map.water_colors || [])];
    if (list[index]) {
      list[index] = { ...list[index], blend_mode: val };
    }
    onMapUpdated({ water_colors: list });
  };

  const handleWaterSpeedChange = (val: number) => {
    onMapUpdated({ water_speed: val });
  };

  const handleWaterWaveColorChange = (val: string) => {
    onMapUpdated({ water_wave_color: val });
  };

  const handleWaterColorWaveColorChange = (index: number, val: string) => {
    const list = [...(map.water_colors || [])];
    if (list[index]) {
      list[index] = { ...list[index], wave_color: val };
    }
    onMapUpdated({ water_colors: list });
  };

  const handleApplyWaveColorToAll = (val: string) => {
    const list = (map.water_colors || []).map((wc) => ({ ...wc, wave_color: val }));
    onMapUpdated({ water_wave_color: val, water_colors: list });
  };

  const handleWaterOpacityChange = (val: number) => {
    onMapUpdated({ water_opacity: val });
  };

  const handleWaterAngleChange = (val: number) => {
    onMapUpdated({ water_angle: val });
  };

  const handleRemoveWindColor = (index: number) => {
    const list = [...(map.wind_colors || [])];
    list.splice(index, 1);
    onMapUpdated({ wind_colors: list });
  };

  const handleWindSimilarityChange = (index: number, val: number) => {
    const list = [...(map.wind_colors || [])];
    if (list[index]) {
      list[index] = { ...list[index], similarity: val };
    }
    onMapUpdated({ wind_colors: list });
  };

  const handleWindSpeedChange = (val: number) => {
    onMapUpdated({ wind_speed: val });
  };

  const handleWindStrengthChange = (val: number) => {
    onMapUpdated({ wind_strength: val });
  };

  const handleWindAngleChange = (val: number) => {
    onMapUpdated({ wind_angle: val });
  };

  const handleWindGustsChange = (val: number) => {
    onMapUpdated({ wind_gusts: val });
  };

  const handleWindEnabledToggle = () => {
    onMapUpdated({ wind_enabled: !map.wind_enabled });
  };

  const handleToggleWindZone = (index: number) => {
    const list = [...(map.wind_zones || [])];
    if (list[index]) {
      list[index] = { ...list[index], enabled: list[index].enabled === false ? true : false };
    }
    onMapUpdated({ wind_zones: list });
  };

  const handleRemoveWindZone = (index: number) => {
    const list = [...(map.wind_zones || [])];
    list.splice(index, 1);
    onMapUpdated({ wind_zones: list });
  };

  const handleWindZoneToleranceChange = (index: number, val: number, isFinal: boolean) => {
    const list = [...(map.wind_zones || [])];
    if (list[index]) {
      list[index] = { ...list[index], tolerance: val };
    }
    if (isFinal) {
      onMapUpdated({ wind_zones: list });
    } else {
      startTransition(() => {
        map.wind_zones = list;
      });
    }
  };

  const handleClearAllWindZones = () => {
    onMapUpdated({ wind_zones: [] });
  };

  return (
    <div className="fixed right-4 top-20 bottom-4 z-30 flex items-start justify-end gap-3 pointer-events-none">
      {/* Sliding Tab Contents Panel */}
      <AnimatePresence mode="wait">
        {((activeTab && activeTab !== "add" && activeTab !== "settings") || drawingWalls) && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-64 rounded-2xl bg-void/90 backdrop-blur-xl border border-umber shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 7rem)" }}
          >
            {/* Ambient light bar decoration */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

            {/* Sidebar Title */}
            <div className="flex items-center justify-between p-4 border-b border-umber">
              <span className="font-heading text-xs uppercase tracking-[0.15em] text-vellum font-semibold">
                {drawingWalls ? (
                  "Modo Muros"
                ) : (
                  <>
                    {activeTab === "regions" && "Regiones"}
                    {activeTab === "layers" && "Capas de Mapa"}
                    {activeTab === "ambient" && "Sitios de Ambiente"}
                    {activeTab === "emissive" && "Zonas Emisoras"}
                    {activeTab === "water" && "Agua Simulada"}
                    {activeTab === "wind" && "Simulación de Viento"}
                    {activeTab === "analysis" && "Análisis con IA"}
                    {activeTab === "mechanical" && "Animación Mecánica"}
                    {activeTab === "planar_transition" && "Animación de Entrada y Salida"}
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  if (drawingWalls) {
                    onToggleDrawingWalls?.();
                  } else {
                    onTabChange(null);
                  }
                }}
                className="w-6 h-6 rounded-full bg-sepia border border-umber text-vellum/40 hover:text-vellum flex items-center justify-center transition-all"
              >
                <X size={12} />
              </button>
            </div>

            {/* Panel Scroll Contents */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {/* --- WALLS / MUROS TAB PANEL --- */}
              {drawingWalls && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-gold font-bold leading-none mb-1 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-gold" />
                      Dibujo Manual de Muros
                    </div>
                    <ul className="text-[10px] text-vellum/60 leading-relaxed font-lore space-y-1 list-disc pl-3.5">
                      <li>Haz clic y arrastra sobre el mapa para trazar un muro.</li>
                      <li>Los muros proyectan sombras dinámicas en tiempo real con las luces.</li>
                      <li>Haz clic sobre un muro existente para borrarlo.</li>
                    </ul>
                  </div>

                  <div className="w-full h-px bg-umber/35" />

                  {/* Smart Selection / Varita de Obstáculos */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-gold/5 border border-gold/20">
                    <div className="text-[10px] uppercase tracking-widest text-gold font-bold leading-none flex items-center gap-1.5">
                      <Sparkles size={11} className="text-gold" />
                      Varita de Obstáculo Inteligente
                    </div>
                    <p className="text-[10px] text-vellum/65 leading-relaxed font-lore">
                      Haz clic en un objeto del mapa (como un árbol, roca o barrera) para detectar su silueta y crear automáticamente un muro colisionador alrededor que bloquee a los animales.
                    </p>

                    <button
                      onClick={onToggleSmartObstaclePick}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-body transition-all cursor-pointer ${
                        pickingSmartObstacle
                          ? "bg-gold/20 border-gold/50 text-gold animate-pulse animate-duration-1000"
                          : "bg-sepia/50 border-umber text-vellum/70 hover:text-vellum hover:border-gold/30"
                      }`}
                    >
                      <Sparkles size={13} className={pickingSmartObstacle ? "text-gold animate-spin" : ""} />
                      {pickingSmartObstacle ? "Varita Activa: Clic en el objeto..." : "Activar Varita Inteligente"}
                    </button>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-body uppercase tracking-wider text-vellum/45 leading-none">
                        <span>Sensibilidad de Silueta</span>
                        <span className="text-gold font-mono">{smartObstacleTolerance}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="45"
                        value={smartObstacleTolerance}
                        onChange={(e) => onSmartObstacleToleranceChange?.(Number(e.target.value))}
                        className="w-full accent-gold cursor-ew-resize h-0.5 bg-void rounded-lg appearance-none"
                      />
                    </div>
                  </div>

                  <div className="w-full h-px bg-umber/35" />

                  <div className="space-y-3 p-3.5 rounded-xl bg-sepia/30 border border-umber">
                    <div className="text-[10px] uppercase tracking-widest text-gold font-bold leading-none flex items-center gap-1.5">
                      <Pipette size={11} className="text-gold" />
                      Muros por Color (Automáticos)
                    </div>
                    <p className="text-[10px] text-vellum/50 leading-relaxed font-lore">
                      Selecciona múltiples colores del mapa (por ejemplo, el color de fondo y el de las piedras) para bloquear el paso de luces y efectos climáticos automáticamente.
                    </p>

                    <button
                      onClick={onStartWallColorPick}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-body transition-all cursor-pointer ${
                        pickingWallColor
                          ? "bg-gold/20 border-gold/50 text-gold animate-pulse"
                          : "bg-sepia/50 border-umber text-vellum/70 hover:text-vellum hover:border-gold/30"
                      }`}
                    >
                      {pickingWallColor ? <Pipette size={13} className="text-gold" /> : <Pipette size={13} />}
                      {pickingWallColor ? "Haz clic en el mapa..." : "Seleccionar color del mapa"}
                    </button>

                    {wallColorsList.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-umber/40">
                        <div className="text-[9px] uppercase tracking-wider text-vellum/40 font-bold">
                          Colores de Bloqueo Activos ({wallColorsList.length})
                        </div>
                        <div className="space-y-3">
                          {wallColorsList.map((wc, idx) => (
                            <div key={`wall-col-${idx}`} className="space-y-2 p-2.5 rounded-lg bg-sepia/20 border border-umber/60">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4.5 h-4.5 rounded-full border border-umber flex-shrink-0"
                                    style={{ backgroundColor: wc.color, boxShadow: `0 0 8px ${wc.color}40` }}
                                  />
                                  <span className="font-mono text-[10px] text-vellum/70 uppercase leading-none">{wc.color}</span>
                                </div>

                                <button
                                  onClick={() => handleRemoveWallColor(idx)}
                                  className="text-red-400 hover:text-red-300 text-[10px] transition-colors"
                                  title="Eliminar este color"
                                >
                                  Quitar
                                </button>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-body uppercase tracking-wider text-vellum/40 leading-none">
                                  <span>Tolerancia</span>
                                  <span className="text-gold font-mono">{wc.tolerance ?? 25}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="5"
                                  max="80"
                                  value={wc.tolerance ?? 25}
                                  onChange={(e) => handleUpdateWallColorTolerance(idx, Number(e.target.value))}
                                  className="w-full accent-gold cursor-ew-resize h-0.5 bg-void rounded-lg appearance-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {hasWalls && (
                    <div className="pt-1">
                      <button
                        onClick={onClearWalls}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                        Borrar todos los muros
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- REGIONS TAB --- */}
              {!drawingWalls && activeTab === "regions" && (
                <div className="space-y-1">
                  {regionsList.length === 0 ? (
                    <p className="text-vellum/30 font-lore text-xs italic text-center py-4">No hay regiones o zonas marcadas</p>
                  ) : (
                    regionsList.map(m => (
                      <button
                        key={m.id}
                        onClick={() => onMarkerClick(m)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-sepia text-left transition-colors group"
                      >
                        <span className="text-[11px]">
                          {m.category === "painted_zone" || (m.area_points && m.area_points.length > 0) ? "🖌️" : "⚑"}
                        </span>
                        <span className="font-body text-xs text-vellum/75 group-hover:text-vellum truncate flex-1">{m.name}</span>
                        {(m.category === "painted_zone" || (m.area_points && m.area_points.length > 0)) && (
                          <span className="text-[8px] uppercase tracking-wider text-amber-text bg-amber-bg/30 px-1.5 py-0.5 rounded border border-amber-border/40 font-mono">
                            Pintada
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* --- LAYERS TAB --- */}
              {!drawingWalls && activeTab === "layers" && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    {layers.map(l => (
                      <div
                        key={l.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sepia/30 border border-umber group"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color || "#D4A017" }} />
                        <span className="font-body text-xs text-vellum/75 flex-1 truncate">{l.name}</span>
                        <button
                          onClick={() => onLayerToggle(l.id, l.visible !== false ? false : true)}
                          className="text-vellum/30 hover:text-gold transition-colors"
                          title={l.visible !== false ? "Ocultar capa" : "Mostrar capa"}
                        >
                          {l.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                          onClick={() => onLayerDeleted(l.id)}
                          className="text-vellum/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar capa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Layer Section */}
                  <div className="flex gap-1.5 pt-1 border-t border-umber/40">
                    <input
                      type="text"
                      value={newLayerName}
                      onChange={(e) => setNewLayerName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateLayer()}
                      placeholder="Nueva capa..."
                      className="flex-1 bg-void/60 border border-umber focus:border-gold/40 rounded-lg px-2.5 py-1.5 text-vellum font-body text-xs outline-none placeholder:text-vellum/20"
                    />
                    <button
                      onClick={handleCreateLayer}
                      disabled={!newLayerName.trim() || isSubmittingLayer}
                      className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 flex items-center justify-center transition-all disabled:opacity-40"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* --- AMBIENT TAB (FOUNDRY VTT SCENE AMBIENCE & WEATHER) --- */}
              {!drawingWalls && activeTab === "ambient" && (
                <div className="space-y-4">
                  <FoundryEnvironmentInspector
                    map={map}
                    effects={map.weather_effects_v2 || []}
                    onUpdateMap={onMapUpdated}
                    onUpdateEffect={(id, updates) => {
                      const updated = (map.weather_effects_v2 || []).map((e) =>
                        e.id === id ? { ...e, ...updates } : e
                      );
                      onMapUpdated({ weather_effects_v2: updated });
                    }}
                    onDeleteEffect={(id) => {
                      const filtered = (map.weather_effects_v2 || []).filter((e) => e.id !== id);
                      onMapUpdated({
                        weather_effects_v2: filtered,
                        weather_effect: filtered.length > 0 ? filtered[0].effect : "none",
                      });
                    }}
                    onAddEffect={(newEff) => {
                      onMapUpdated({
                        weather_effects_v2: [...(map.weather_effects_v2 || []), newEff],
                        weather_effect: newEff.effect || "rain",
                      });
                    }}
                    onStartAvoidColorPick={onStartAvoidColorPick}
                    pickingAvoidColorId={pickingAvoidColorId}
                    onOpenClipboardModal={onOpenEffectClipboard}
                  />

                  <div className="w-full h-px bg-umber/20" />

                  {/* Ambient Sites Section */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-vellum/45 font-semibold pl-1 font-body">
                      Sitios de Ambiente
                    </div>
                    <div className="space-y-1">
                      {ambientList.length === 0 ? (
                        <p className="text-vellum/30 font-lore text-xs italic text-center py-4">No hay puntos de ambiente</p>
                      ) : (
                        ambientList.map(m => (
                          <button
                            key={m.id}
                            onClick={() => onMarkerClick(m)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-sepia text-left transition-colors group"
                          >
                            <span className="text-green-500 text-[10px]">✦</span>
                            <span className="font-body text-xs text-vellum/75 group-hover:text-vellum truncate flex-1">{m.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- EMISSIVE TAB (GLOW MANAGER) --- */}
              {!drawingWalls && activeTab === "emissive" && (
                <div className="space-y-4">
                  <button
                    onClick={onStartColorPick}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-body transition-all ${
                      pickingColor
                        ? "bg-gold/20 border-gold/50 text-gold"
                        : "bg-sepia/50 border-umber text-vellum/70 hover:text-vellum hover:border-gold/30"
                    }`}
                  >
                    {pickingColor ? <Pipette size={13} className="animate-bounce" /> : <Plus size={13} />}
                    {pickingColor ? "Haz clic en el mapa..." : "Añadir color emisor"}
                  </button>

                  {(map.emissive_colors || []).length > 0 ? (
                    <div className="space-y-4">
                      {(map.emissive_colors || []).map((ec, idx) => (
                        <div key={`emissive-${idx}`} className="space-y-2.5 p-3 rounded-xl bg-sepia/30 border border-umber">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-full border border-umber flex-shrink-0"
                              style={{ backgroundColor: ec.color, boxShadow: `0 0 10px ${ec.color}60` }}
                            />
                            <span className="font-mono text-xs text-vellum/50 uppercase leading-none">{ec.color}</span>
                            <button
                              onClick={() => handleRemoveEmissiveColor(idx)}
                              className="ml-auto text-vellum/30 hover:text-red-400 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                              <span>Similitud</span>
                              <span className="text-gold font-mono">{ec.similarity ?? 30}%</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={ec.similarity ?? 30}
                              onChange={(e) => handleEmissiveSimilarityChange(idx, Number(e.target.value))}
                              className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Animation speed slider */}
                      <div className="space-y-1.5 pt-1 border-t border-umber/40">
                        <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Frecuencia Pulso</span>
                          <span className="text-gold font-mono">{map.emissive_speed ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={map.emissive_speed ?? 50}
                          onChange={(e) => handleEmissiveSpeedChange(Number(e.target.value))}
                          className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-vellum/30 font-lore text-xs italic text-center py-2">
                      Selecciona un color del mapa para hacerlo resplandecer mágicamente.
                    </p>
                  )}
                </div>
              )}

              {/* --- WATER TAB (WATER SIMULATOR) --- */}
              {!drawingWalls && activeTab === "water" && (
                <div className="space-y-4">
                  {onOpenEffectClipboard && (
                    <button
                      onClick={onOpenEffectClipboard}
                      className="w-full py-1.5 px-3 rounded-lg bg-sepia/30 hover:bg-gold/15 border border-umber/60 hover:border-gold/50 text-[10px] font-heading font-bold text-vellum/80 hover:text-gold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Copiar configuración de agua y efectos o pegarla de otro mapa"
                    >
                      <Copy size={11} className="text-gold" />
                      <span>Copiar / Pegar Efectos de Agua</span>
                    </button>
                  )}

                  <button
                    onClick={onStartWaterPick}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-body transition-all ${
                      pickingWaterColor
                        ? "bg-gold/20 border-gold/50 text-gold"
                        : "bg-sepia/50 border-umber text-vellum/70 hover:text-vellum hover:border-gold/30"
                    }`}
                  >
                    {pickingWaterColor ? <Pipette size={13} className="animate-bounce" /> : <Plus size={13} />}
                    {pickingWaterColor ? "Haz clic en el mapa..." : "Añadir color de agua"}
                  </button>

                  {(map.water_colors || []).length > 0 ? (
                    <div className="space-y-4">
                      {(map.water_colors || []).map((wc, idx) => (
                        <div key={`water-${idx}`} className="space-y-2.5 p-3 rounded-xl bg-sepia/30 border border-umber">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-full border border-umber flex-shrink-0"
                              style={{ backgroundColor: wc.color, boxShadow: `0 0 10px ${wc.color}60` }}
                            />
                            <span className="font-mono text-xs text-vellum/50 uppercase leading-none">{wc.color}</span>
                            <button
                              onClick={() => handleRemoveWaterColor(idx)}
                              className="ml-auto text-vellum/30 hover:text-red-400 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                              <span>Rango Similitud</span>
                              <span className="text-gold font-mono">{wc.similarity ?? 30}%</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={wc.similarity ?? 30}
                              onChange={(e) => handleWaterSimilarityChange(idx, Number(e.target.value))}
                              className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                              Modo de fusión
                            </div>
                            <select
                              value={wc.blend_mode || "normal"}
                              onChange={(e) => handleWaterBlendModeChange(idx, e.target.value)}
                              className="w-full bg-void border border-umber rounded-lg px-2 py-1 text-xs text-vellum/80 focus:outline-none focus:border-gold/50 cursor-pointer"
                            >
                              <option value="normal">Normal</option>
                              <option value="multiply">Multiplicar (Multiply)</option>
                              <option value="screen">Trama (Screen)</option>
                              <option value="overlay">Superponer (Overlay)</option>
                              <option value="color-dodge">Sobreexponer (Color Dodge)</option>
                              <option value="color-burn">Subexponer (Color Burn)</option>
                              <option value="hard-light">Luz fuerte (Hard Light)</option>
                              <option value="soft-light">Luz suave (Soft Light)</option>
                              <option value="difference">Diferencia (Difference)</option>
                              <option value="hue">Tono (Hue)</option>
                              <option value="saturation">Saturación (Saturation)</option>
                              <option value="color">Color</option>
                              <option value="luminosity">Luminosidad (Luminosity)</option>
                            </select>
                          </div>

                          {/* Color de ola individual para este color de agua */}
                          <div className="space-y-1.5 pt-2 border-t border-umber/30">
                            <div className="flex justify-between items-center text-[10px] font-body uppercase tracking-widest text-vellum/50 leading-none">
                              <span>Color de Ola de este Agua</span>
                              <span className="text-gold font-mono uppercase text-[9px]">
                                {wc.wave_color || map.water_wave_color || "#ffffff"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-void/50 border border-umber/40 rounded-lg p-1.5">
                              <input
                                type="color"
                                value={wc.wave_color || map.water_wave_color || "#ffffff"}
                                onChange={(e) => handleWaterColorWaveColorChange(idx, e.target.value)}
                                className="w-5 h-5 rounded-md border border-umber/70 bg-transparent cursor-pointer p-0 overflow-hidden outline-none flex-shrink-0"
                                title="Color de ola personalizado para este tono de agua"
                              />
                              <div className="flex flex-wrap gap-1 flex-1">
                                {[
                                  { color: "#ffffff", label: "Espuma" },
                                  { color: "#00f0ff", label: "Cian" },
                                  { color: "#ffd060", label: "Dorado" },
                                  { color: "#10ff70", label: "Biolum" },
                                  { color: "#84cc16", label: "Veneno" },
                                  { color: "#ff4500", label: "Fuego" },
                                  { color: "#990000", label: "Sangre" },
                                  { color: "#b026ff", label: "Místico" },
                                ].map((preset) => {
                                  const currentWave = (wc.wave_color || map.water_wave_color || "#ffffff").toLowerCase();
                                  const isSelected = currentWave === preset.color.toLowerCase();
                                  return (
                                    <button
                                      key={preset.color}
                                      type="button"
                                      onClick={() => handleWaterColorWaveColorChange(idx, preset.color)}
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? "bg-gold/25 border-gold text-gold font-bold shadow-[0_0_6px_rgba(212,175,55,0.3)]"
                                          : "bg-sepia/30 border-umber/50 text-vellum/50 hover:text-vellum hover:border-gold/40"
                                      }`}
                                      title={`Ola color ${preset.label}`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: preset.color }} />
                                      <span>{preset.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Water Animation speed slider */}
                      <div className="space-y-1.5 pt-1 border-t border-umber/40">
                        <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Velocidad de Ola</span>
                          <span className="text-gold font-mono">{map.water_speed ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={map.water_speed ?? 50}
                          onChange={(e) => handleWaterSpeedChange(Number(e.target.value))}
                          className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                        />
                      </div>

                      {/* Water Wave Opacity / Intensity */}
                      <div className="space-y-1.5 pt-1 border-t border-umber/40">
                        <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Intensidad de Ola</span>
                          <span className="text-gold font-mono">{map.water_opacity ?? 80}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={map.water_opacity ?? 80}
                          onChange={(e) => handleWaterOpacityChange(Number(e.target.value))}
                          className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                        />
                      </div>

                      {/* Water Wave Direction / Angle */}
                      <div className="space-y-1.5 pt-1 border-t border-umber/40">
                        <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Dirección de Líneas de Ola</span>
                          <span className="text-gold font-mono">{map.water_angle ?? 0}°</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 pt-0.5">
                          {[
                            { angle: 0, label: "0° Horiz" },
                            { angle: 45, label: "45° Diag" },
                            { angle: 90, label: "90° Vert" },
                            { angle: 135, label: "135°" },
                          ].map((dir) => (
                            <button
                              key={dir.angle}
                              onClick={() => handleWaterAngleChange(dir.angle)}
                              className={`py-1 rounded text-[8.5px] font-mono border transition-all cursor-pointer ${
                                (map.water_angle ?? 0) === dir.angle
                                  ? "bg-gold/20 border-gold text-gold font-bold"
                                  : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/90"
                              }`}
                            >
                              {dir.label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={map.water_angle ?? 0}
                          onChange={(e) => handleWaterAngleChange(Number(e.target.value))}
                          className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                        />
                      </div>

                      {/* Water Wave Color Control */}
                      <div className="space-y-2 pt-2.5 border-t border-umber/40">
                        <div className="flex justify-between items-center text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Color Global de Olas</span>
                          <span className="text-gold font-mono uppercase text-[9px]">{map.water_wave_color || "#ffffff"}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-sepia/20 border border-umber/50 rounded-lg p-2">
                          <input
                            type="color"
                            value={map.water_wave_color || "#ffffff"}
                            onChange={(e) => handleWaterWaveColorChange(e.target.value)}
                            className="w-6 h-6 rounded-full border border-umber bg-transparent cursor-pointer p-0 overflow-hidden outline-none flex-shrink-0"
                            title="Cambiar color global de olas"
                          />
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {[
                              { color: "#ffffff", label: "Espuma" },
                              { color: "#00f0ff", label: "Cian" },
                              { color: "#ffd060", label: "Dorado" },
                              { color: "#10ff70", label: "Biolum" },
                              { color: "#84cc16", label: "Veneno" },
                              { color: "#ff4500", label: "Fuego" },
                              { color: "#990000", label: "Sangre" },
                              { color: "#b026ff", label: "Místico" }
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                onClick={() => handleWaterWaveColorChange(preset.color)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer ${
                                  (map.water_wave_color || "#ffffff").toLowerCase() === preset.color.toLowerCase()
                                    ? "bg-gold/20 border-gold text-gold font-bold"
                                    : "bg-void/40 border-umber/50 text-vellum/55 hover:text-vellum/90"
                                }`}
                                title={preset.label}
                              >
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: preset.color }} />
                                  {preset.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {(map.water_colors || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleApplyWaveColorToAll(map.water_wave_color || "#ffffff")}
                            className="w-full text-[9px] py-1 px-2 rounded-md bg-void/50 hover:bg-gold/15 border border-umber hover:border-gold/40 text-vellum/60 hover:text-gold transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                          >
                            <span>Aplicar {map.water_wave_color || "#ffffff"} a todos los colores de agua</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-vellum/30 font-lore text-xs italic text-center py-2">
                      Selecciona un color para animarlo con una sutil capa ondulatoria.
                    </p>
                  )}
                </div>
              )}

              {/* --- WIND TAB (WIND SIMULATOR & MAGIC ZONES) --- */}
              {!drawingWalls && activeTab === "wind" && (
                <div className="space-y-4">
                  {/* Status & Master Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-sepia/20 border border-umber">
                    <div className="flex items-center gap-2">
                      <Wind size={15} className={map.wind_enabled ? "text-emerald-text" : "text-vellum/40"} />
                      <span className="font-heading text-[11px] uppercase tracking-widest text-vellum/70 font-bold leading-none">
                        Efecto Viento
                      </span>
                    </div>
                    <button
                      onClick={handleWindEnabledToggle}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                        map.wind_enabled
                          ? "bg-emerald-bg/80 border-emerald-border text-emerald-text shadow-sm"
                          : "bg-void/60 border-umber text-vellum/45 hover:text-vellum/80"
                      }`}
                    >
                      {map.wind_enabled ? "ACTIVADO" : "DESACTIVADO"}
                    </button>
                  </div>

                  {/* Section 1: Brush & Zone Area Definition */}
                  <div className="p-3 rounded-xl bg-sepia/30 border border-umber/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-text flex items-center gap-1.5">
                        <Paintbrush size={12} className="text-emerald-text" />
                        Delimitar Área de Viento
                      </span>
                      {(isPaintingWindMask || pickingMagicWindZone) && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] font-lore text-vellum/60 leading-relaxed">
                      Pinta libremente sobre el mapa las copas de los árboles o bosques. Al usar el <strong className="text-emerald-300 font-semibold">Gotero de Color</strong>, el viento se aplicará <strong className="text-emerald-300 font-semibold">únicamente donde hayas pintado</strong>, sin afectar a otras áreas del mismo color.
                    </p>

                    {/* Mode Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={onTogglePaintingWindMask}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-body font-semibold transition-all cursor-pointer shadow-sm ${
                          isPaintingWindMask && windBrushMode === "paint"
                            ? "bg-emerald-bg/40 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            : "bg-sepia/50 border-umber/60 text-vellum/80 hover:bg-emerald-bg/20 hover:text-emerald-text hover:border-emerald-border/40"
                        }`}
                      >
                        <Paintbrush size={13} className="text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{isPaintingWindMask && windBrushMode === "paint" ? "Pincel Activo" : "Pintar Área"}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!isPaintingWindMask) {
                            onTogglePaintingWindMask?.();
                            onWindBrushModeChange?.("erase");
                          } else if (windBrushMode === "erase") {
                            onTogglePaintingWindMask?.();
                          } else {
                            onWindBrushModeChange?.("erase");
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-body font-semibold transition-all cursor-pointer shadow-sm ${
                          isPaintingWindMask && windBrushMode === "erase"
                            ? "bg-red-500/20 border-red-400 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                            : "bg-sepia/50 border-umber/60 text-vellum/80 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30"
                        }`}
                      >
                        <Eraser size={13} className="text-red-400 flex-shrink-0" />
                        <span className="truncate">{isPaintingWindMask && windBrushMode === "erase" ? "Borrador Activo" : "Borrador"}</span>
                      </button>
                    </div>

                    {/* Brush Controls when painting */}
                    {isPaintingWindMask && (
                      <div className="space-y-2 p-2.5 rounded-lg bg-void/60 border border-emerald-border/40 animate-fadeIn">
                        <div className="flex items-center justify-between text-[10px] font-body uppercase tracking-wider text-vellum/60">
                          <span>Modo: <strong className={windBrushMode === "paint" ? "text-emerald-300" : "text-red-300"}>{windBrushMode === "paint" ? "🖌️ Pintando Área" : "🧹 Borrando Área"}</strong></span>
                          <span className="text-emerald-text font-mono font-bold">{windBrushSize}px</span>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onWindBrushModeChange?.("paint")}
                            className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer border ${
                              windBrushMode === "paint"
                                ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/80"
                            }`}
                          >
                            🖌️ Pincel
                          </button>
                          <button
                            onClick={() => onWindBrushModeChange?.("erase")}
                            className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer border ${
                              windBrushMode === "erase"
                                ? "bg-red-500/30 border-red-400 text-red-200"
                                : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/80"
                            }`}
                          >
                            🧹 Borrador
                          </button>
                        </div>

                        {/* Brush Size Slider & Quick Presets */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[9px] font-body text-vellum/50">
                            <span>Tamaño de Pincel</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="120"
                            value={windBrushSize}
                            onChange={(e) => onWindBrushSizeChange?.(Number(e.target.value))}
                            className="w-full accent-emerald-400 cursor-ew-resize h-1.5 bg-void rounded-lg appearance-none animate-none"
                          />
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[
                              { size: 15, label: "15px Fino" },
                              { size: 35, label: "35px Normal" },
                              { size: 65, label: "65px Bosque" },
                              { size: 100, label: "100px Grande" },
                            ].map((preset) => (
                              <button
                                key={preset.size}
                                onClick={() => onWindBrushSizeChange?.(preset.size)}
                                className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono border transition-all cursor-pointer ${
                                  windBrushSize === preset.size
                                    ? "bg-emerald-bg/50 border-emerald-400 text-emerald-300 font-bold"
                                    : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/90"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Magic Wand Quick Trigger */}
                    <button
                      onClick={onToggleMagicWindPick}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-body font-semibold transition-all cursor-pointer shadow-sm ${
                        pickingMagicWindZone
                          ? "bg-emerald-bg/30 border-emerald-border text-emerald-text shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse"
                          : "bg-emerald-bg/10 border-emerald-border/40 text-emerald-text/90 hover:bg-emerald-bg/20 hover:text-emerald-text"
                      }`}
                    >
                      <Sparkles size={13} className={pickingMagicWindZone ? "text-emerald-text animate-spin" : "text-emerald-text"} />
                      {pickingMagicWindZone ? "✨ Varita Activa: Clic en árbol o zona..." : "✨ Varita Mágica (Auto-zona)"}
                    </button>

                    {/* Painted Mask Actions & Visualizer */}
                    {(map.wind_mask_image || (map.wind_zones || []).length > 0) && (
                      <div className="flex items-center justify-between pt-1 border-t border-umber/40">
                        <button
                          onClick={onToggleShowWindMaskPreview}
                          className={`flex items-center gap-1.5 text-[10px] font-body px-2 py-1 rounded border transition-colors cursor-pointer ${
                            showWindMaskPreview
                              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                              : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/80"
                          }`}
                        >
                          {showWindMaskPreview ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{showWindMaskPreview ? "Máscara Verde Visible" : "Mostrar Máscara Verde"}</span>
                        </button>

                        <button
                          onClick={onClearWindMask}
                          className="flex items-center gap-1 text-[10px] font-body text-red-400/80 hover:text-red-400 transition-colors cursor-pointer px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                        >
                          <Trash2 size={11} />
                          <span>Limpiar Área Pintada</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Global Color Dropper (With Zone Constraint Feedback) */}
                  <div className="p-3 rounded-xl bg-sepia/25 border border-umber/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-[10.5px] uppercase tracking-wider text-vellum/70 font-bold flex items-center gap-1.5">
                        <Pipette size={12} className="text-gold" />
                        Gotero de Color (Filtro de Vegetación)
                      </span>
                    </div>

                    {/* Dynamic Status Indicator */}
                    {map.wind_mask_image || (map.wind_zones && map.wind_zones.length > 0) ? (
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300/90 leading-tight flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>
                          <strong>Modo Restringido:</strong> El gotero solo afectará a los colores muestreados <strong>dentro de tu área pintada</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-sepia/30 border border-umber/40 text-[10px] text-vellum/50 leading-tight">
                        <span>Sin área pintada: El gotero afecta a toda la vegetación con este color. Usa el <strong>Pincel</strong> arriba para restringir.</span>
                      </div>
                    )}

                    <button
                      onClick={onStartWindPick}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-body font-semibold transition-all cursor-pointer ${
                        pickingWindColor
                          ? "bg-emerald-bg/30 border-emerald-border text-emerald-text shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse"
                          : "bg-sepia/40 border-umber text-vellum/80 hover:text-vellum hover:border-emerald-border/40"
                      }`}
                    >
                      <Pipette size={13} className={pickingWindColor ? "animate-bounce text-emerald-text" : "text-emerald-400"} />
                      {pickingWindColor ? "Haz clic en las hojas del árbol..." : "Muestrear color con Gotero"}
                    </button>

                    {(map.wind_colors || []).map((wc, idx) => (
                      <div key={`wind-${idx}`} className="space-y-2 p-2.5 rounded-lg bg-sepia/30 border border-umber/80">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full border border-umber flex-shrink-0"
                            style={{ backgroundColor: wc.color, boxShadow: `0 0 8px ${wc.color}60` }}
                          />
                          <span className="font-mono text-xs text-vellum/70 uppercase leading-none font-semibold">{wc.color}</span>
                          <button
                            onClick={() => handleRemoveWindColor(idx)}
                            className="ml-auto text-vellum/40 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                            title="Eliminar color"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                            <span>Sensibilidad de Color</span>
                            <span className="text-emerald-text font-mono font-bold">{wc.similarity ?? 30}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={wc.similarity ?? 30}
                            onChange={(e) => handleWindSimilarityChange(idx, Number(e.target.value))}
                            className="w-full accent-emerald-400 cursor-ew-resize h-1 bg-void rounded-lg appearance-none animate-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Wind Animation Physics (Speed, Strength, Angle, Gusts) */}
                  <div className="space-y-3 pt-2 border-t border-umber/40">
                    <span className="font-heading text-[10px] uppercase tracking-wider text-vellum/50 font-bold block">
                      Ajustes de Oscilación y Física
                    </span>

                    {/* Wind Direction Control */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/50 leading-none">
                        <span>Dirección del Viento</span>
                        <span className="text-emerald-text font-mono font-bold">{map.wind_angle ?? 0}°</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { angle: 0, label: "0° Este" },
                          { angle: 45, label: "45° NE" },
                          { angle: 90, label: "90° Sur" },
                          { angle: 180, label: "180° O" },
                        ].map((dir) => (
                          <button
                            key={dir.angle}
                            onClick={() => handleWindAngleChange(dir.angle)}
                            className={`py-1 rounded text-[8.5px] font-mono border transition-all cursor-pointer ${
                              (map.wind_angle ?? 0) === dir.angle
                                ? "bg-emerald-bg/40 border-emerald-400 text-emerald-300 font-bold"
                                : "bg-void/40 border-umber/40 text-vellum/50 hover:text-vellum/90"
                            }`}
                          >
                            {dir.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={map.wind_angle ?? 0}
                        onChange={(e) => handleWindAngleChange(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-ew-resize h-1 bg-void rounded-lg appearance-none animate-none"
                      />
                    </div>

                    {/* Wind Animation speed slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/50 leading-none">
                        <span>Frecuencia (Velocidad)</span>
                        <span className="text-emerald-text font-mono font-bold">{map.wind_speed ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={map.wind_speed ?? 50}
                        onChange={(e) => handleWindSpeedChange(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-ew-resize h-1 bg-void rounded-lg appearance-none animate-none"
                      />
                    </div>

                    {/* Wind Animation strength slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/50 leading-none">
                        <span>Fuerza del Viento (Sway)</span>
                        <span className="text-emerald-text font-mono font-bold">{map.wind_strength ?? 25}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={map.wind_strength ?? 25}
                        onChange={(e) => handleWindStrengthChange(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-ew-resize h-1 bg-void rounded-lg appearance-none animate-none"
                      />
                    </div>

                    {/* Wind Gusts / Foliage Rustle slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/50 leading-none">
                        <span>Rachas y Vibración de Hojas</span>
                        <span className="text-emerald-text font-mono font-bold">{map.wind_gusts ?? 60}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={map.wind_gusts ?? 60}
                        onChange={(e) => handleWindGustsChange(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-ew-resize h-1 bg-void rounded-lg appearance-none animate-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- MECHANICAL ANIMATION TAB --- */}
              {!drawingWalls && activeTab === "mechanical" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-void/40 border border-umber/40 space-y-2">
                    <h3 className="font-heading text-[11px] uppercase tracking-widest text-gold font-bold leading-none flex items-center gap-1.5">
                      <Film size={12} className="text-gold" />
                      Animación Mecánica
                    </h3>
                    <p className="text-[11px] font-lore text-vellum/50 italic leading-relaxed">
                      Desglosa el mapa en fotogramas en bucle continuo analizando las zonas animadas (agua, viento, luces). Ideal para previsualizar y exportar a Roll20, Foundry VTT u otras plataformas.
                    </p>
                  </div>

                  {/* Config controls */}
                  <div className="space-y-3.5 p-3.5 rounded-xl bg-sepia/20 border border-umber/50">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                        <span>Número de fotogramas</span>
                        <span className="text-emerald-text font-mono font-bold">{totalFrames} frames</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[4, 8, 12, 16].map((num) => (
                          <button
                            key={num}
                            onClick={() => setTotalFrames(num)}
                            className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              totalFrames === num
                                ? "bg-emerald-bg border-emerald-border text-emerald-text shadow-sm"
                                : "bg-void/40 border-umber/40 text-vellum/40 hover:text-vellum/70"
                            }`}
                          >
                            {num} F
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                        <span>Frecuencia (FPS)</span>
                        <span className="text-emerald-text font-mono font-bold">{fps} FPS</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        value={fps}
                        onChange={(e) => setFps(Number(e.target.value))}
                        className="w-full accent-gold cursor-ew-resize h-1 bg-void rounded-lg appearance-none"
                      />
                    </div>

                    {/* Primary Button */}
                    <button
                      onClick={() => handleGenerateMechanicalFrames()}
                      disabled={isAnalyzing}
                      className={`w-full py-2.5 rounded-xl border font-body text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isAnalyzing
                          ? "bg-emerald-bg/30 border-emerald-border/40 text-emerald-text animate-pulse cursor-not-allowed"
                          : "bg-emerald-bg border-emerald-border text-emerald-text hover:bg-emerald-bg/80 hover:shadow-[0_0_12px_rgba(208,232,238,0.25)]"
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader size={13} className="animate-spin" />
                          <span>{analysisStep || "Sintetizando..."}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} className="animate-spin-slow" />
                          <span>{generatedFrames.length > 0 ? "RE-ANALIZAR Y COMPILAR" : "ANALIZAR Y COMPILAR BUCLE"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* --- PIEZAS MÓVILES MANAGER --- */}
                  <div className="space-y-3.5 p-3.5 rounded-xl bg-void/30 border border-umber/40">
                    <div className="flex justify-between items-center">
                      <h4 className="font-heading text-[10px] uppercase tracking-widest text-gold font-bold leading-none flex items-center gap-1.5">
                        <Activity size={12} className="text-gold" />
                        Zonas de Piezas Móviles
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {map.moving_parts && map.moving_parts.length > 0 && (
                          <button
                            onClick={() => {
                              if (confirm("¿Estás seguro de que deseas borrar todas las animaciones mecánicas de este mapa?")) {
                                onMapUpdated({ moving_parts: [] });
                              }
                            }}
                            className="px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-body font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Borrar todas las piezas mecánicas"
                          >
                            <Trash2 size={10} />
                            BORRAR TODO
                          </button>
                        )}
                        <button
                          onClick={onStartMovingPartPosPick}
                          className={`px-2 py-1 rounded-lg border text-[9px] font-body font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
                            pickingMovingPartPos
                              ? "bg-amber-bg border-amber-border text-amber-text animate-pulse"
                              : "bg-sepia/40 border-umber/60 text-vellum/80 hover:text-vellum hover:border-gold/40"
                          }`}
                        >
                          <Plus size={10} />
                          {pickingMovingPartPos ? "CANCELAR" : "AÑADIR"}
                        </button>
                      </div>
                    </div>
                     {pickingMovingPartPos && (
                      <div className="p-2.5 rounded-lg bg-amber-bg/10 border border-amber-border/30 font-mono text-[9px] text-amber-text leading-relaxed">
                        <p className="animate-pulse">👉 Haz clic en cualquier lugar del mapa para colocar el centro de la nueva pieza móvil (molino, turbina, bandera, etc.).</p>
                      </div>
                    )}

                    {pickingMovingPartColorId && (
                      <div className="p-2.5 rounded-lg bg-amber-bg/10 border border-amber-border/30 font-mono text-[9px] text-amber-text leading-relaxed">
                        <p className="animate-pulse">👉 Haz clic en un color del mapa para aislarlo dentro de la zona de esta pieza móvil.</p>
                      </div>
                    )}

                    {(!map.moving_parts || map.moving_parts.length === 0) ? (
                      <p className="text-[10px] font-lore text-vellum/30 italic text-center py-2">
                        No hay piezas móviles configuradas. Añade una para animar engranajes, molinos de agua/viento, banderas o turbinas.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-umber scrollbar-track-void">
                        {map.moving_parts.map((part) => (
                          <div
                            key={part.id}
                            className="p-3 rounded-lg bg-sepia/10 border border-umber/30 space-y-2.5 hover:border-umber/60 transition-colors"
                          >
                            {/* Header: Name & delete */}
                            <div className="flex justify-between items-center gap-2">
                              <input
                                type="text"
                                value={part.name}
                                onChange={(e) => {
                                  const updated = map.moving_parts?.map((p) =>
                                    p.id === part.id ? { ...p, name: e.target.value } : p
                                  );
                                  onMapUpdated({ moving_parts: updated });
                                }}
                                className="bg-transparent border-b border-transparent hover:border-umber/50 focus:border-gold/50 text-[11px] font-body font-bold text-vellum/90 focus:outline-none py-0.5 px-1 rounded transition-colors flex-1"
                              />
                              <button
                                onClick={() => {
                                  const updated = map.moving_parts?.filter((p) => p.id !== part.id);
                                  onMapUpdated({ moving_parts: updated });
                                }}
                                className="p-1 rounded text-vellum/40 hover:text-red-400 hover:bg-void/40 transition-colors cursor-pointer"
                                title="Eliminar pieza móvil"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {/* Position & Size Adjusters */}
                            <div className="grid grid-cols-3 gap-2 text-[10px] font-body text-vellum/60">
                              <div className="space-y-1">
                                <span className="text-vellum/35 uppercase text-[8px] tracking-wider block">Centro X, Y</span>
                                <div className="flex items-center justify-center h-5 font-mono text-[9px] bg-void/30 border border-umber/20 rounded px-1 py-1">
                                  <span>{Math.round(part.x)}%, {Math.round(part.y)}%</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] uppercase tracking-wider text-vellum/35">
                                  <span>Radio</span>
                                  <span className="text-gold font-mono">{part.radius}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="2"
                                  max="40"
                                  value={part.radius}
                                  onChange={(e) => {
                                    const updated = map.moving_parts?.map((p) =>
                                      p.id === part.id ? { ...p, radius: Number(e.target.value) } : p
                                    );
                                    onMapUpdated({ moving_parts: updated });
                                  }}
                                  className="w-full accent-gold h-1 bg-void rounded appearance-none cursor-ew-resize mt-1.5"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] uppercase tracking-wider text-vellum/35">
                                  <span>Ángulo</span>
                                  <span className="text-gold font-mono">{part.angle ?? 0}°</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={part.angle ?? 0}
                                  onChange={(e) => {
                                    const updated = map.moving_parts?.map((p) =>
                                      p.id === part.id ? { ...p, angle: Number(e.target.value) } : p
                                    );
                                    onMapUpdated({ moving_parts: updated });
                                  }}
                                  className="w-full accent-gold h-1 bg-void rounded appearance-none cursor-ew-resize mt-1.5"
                                />
                              </div>
                            </div>

                            {/* Animation Type & Speed */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-body text-vellum/60">
                              <div className="space-y-1">
                                <span className="text-vellum/35 uppercase text-[8px] tracking-wider block">Estilo Animación</span>
                                <select
                                  value={part.type}
                                  onChange={(e) => {
                                    const updated = map.moving_parts?.map((p) =>
                                      p.id === part.id ? { ...p, type: e.target.value as any } : p
                                    );
                                    onMapUpdated({ moving_parts: updated });
                                  }}
                                  className="w-full bg-void border border-umber/40 text-[9px] rounded p-1 text-vellum focus:outline-none"
                                >
                                  <option value="rotation_cw">🔄 Giro Horario</option>
                                  <option value="rotation_ccw">🔄 Giro Antihorario</option>
                                  <option value="sway">⛵ Oscilación / Balanceo</option>
                                  <option value="pulse">💗 Pulsación (Latido)</option>
                                  <option value="wind_flutter">🎏 Flameo de Bandera</option>
                                  <option value="linear_x">↔️ Traslación Horizontal</option>
                                  <option value="linear_y">↕️ Traslación Vertical / Flote</option>
                                  <option value="orbit">💫 Traslación Orbital</option>
                                  <option value="bounce">🏀 Rebote Orgánico</option>
                                  <option value="wiggle">📳 Temblor / Vibración</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] uppercase tracking-wider text-vellum/35">
                                  <span>Velocidad</span>
                                  <span className="text-gold font-mono">{part.speed}x</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={part.speed}
                                  onChange={(e) => {
                                    const updated = map.moving_parts?.map((p) =>
                                      p.id === part.id ? { ...p, speed: Number(e.target.value) } : p
                                    );
                                    onMapUpdated({ moving_parts: updated });
                                  }}
                                  className="w-full accent-gold h-1 bg-void rounded appearance-none cursor-ew-resize"
                                />
                              </div>
                            </div>

                            {/* Color masking */}
                            <div className="space-y-1.5 p-2 rounded bg-void/25 border border-umber/20">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] uppercase tracking-wider text-vellum/50 font-body flex items-center gap-1 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!part.use_color_mask}
                                    onChange={(e) => {
                                      const updated = map.moving_parts?.map((p) =>
                                        p.id === part.id ? { ...p, use_color_mask: e.target.checked } : p
                                      );
                                      onMapUpdated({ moving_parts: updated });
                                    }}
                                    className="accent-gold rounded cursor-pointer"
                                  />
                                  Aislar pieza por color
                                </label>
                                {part.use_color_mask && (
                                  <button
                                    onClick={() => onStartMovingPartColorPick?.(part.id)}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-body border cursor-pointer ${
                                      pickingMovingPartColorId === part.id
                                        ? "bg-amber-bg border-amber-border text-amber-text animate-pulse"
                                        : "bg-sepia/30 border-umber/40 text-vellum/60 hover:text-gold"
                                    }`}
                                  >
                                    {pickingMovingPartColorId === part.id ? "SELECCIONANDO..." : "GOTERO"}
                                  </button>
                                )}
                              </div>

                              {part.use_color_mask && (
                                <div className="space-y-2 pt-1 border-t border-umber/10">
                                  {/* Color indicator and tolerance */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className="w-3.5 h-3.5 rounded border border-umber/40 shadow-sm"
                                        style={{ backgroundColor: part.mask_color || "#ffffff" }}
                                      />
                                      <span className="font-mono text-[9px] text-vellum/60">{part.mask_color || "Sin color"}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                                      <span className="text-[8px] uppercase tracking-wider text-vellum/30 font-body">Tol.</span>
                                      <input
                                        type="range"
                                        min="5"
                                        max="80"
                                        value={part.mask_tolerance ?? 30}
                                        onChange={(e) => {
                                          const updated = map.moving_parts?.map((p) =>
                                            p.id === part.id ? { ...p, mask_tolerance: Number(e.target.value) } : p
                                          );
                                          onMapUpdated({ moving_parts: updated });
                                        }}
                                        className="w-full accent-gold h-1 bg-void rounded appearance-none cursor-ew-resize"
                                      />
                                      <span className="text-[8px] font-mono text-gold">{part.mask_tolerance ?? 30}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Loading status messages */}
                  {isAnalyzing && analysisStep && (
                    <div className="p-3 rounded-xl bg-void/80 border border-emerald-border/30 font-mono text-[10px] text-emerald-text/80 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#d0e8ee] rounded-full animate-ping" />
                        SYSTEM: {analysisStep}
                      </p>
                    </div>
                  )}

                  {/* Results: Viewer and downloads */}
                  {generatedFrames.length > 0 && !isAnalyzing && (
                    <div className="space-y-4">
                      {/* Active Preview Box */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-vellum/40 leading-none">
                          <span>Visualizador de Bucle</span>
                          <span className="text-gold font-mono font-bold">Fotograma {currentFrameIndex + 1}/{totalFrames}</span>
                        </div>
                        
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-void border border-umber/60 group shadow-lg flex items-center justify-center">
                          <img
                            src={generatedFrames[currentFrameIndex]}
                            alt={`Frame ${currentFrameIndex + 1}`}
                            className="w-full h-full object-contain"
                          />
                          
                          {/* Inside controls overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/90 via-void/40 to-transparent p-2.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="w-8 h-8 rounded-lg bg-sepia border border-umber flex items-center justify-center text-vellum hover:text-gold transition-colors cursor-pointer"
                            >
                              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                            
                            <button
                              onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + totalFrames) % totalFrames)}
                              className="w-8 h-8 rounded-lg bg-sepia border border-umber flex items-center justify-center text-vellum hover:text-gold transition-colors cursor-pointer"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            
                            <button
                              onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % totalFrames)}
                              className="w-8 h-8 rounded-lg bg-sepia border border-umber flex items-center justify-center text-vellum hover:text-gold transition-colors cursor-pointer"
                            >
                              <ChevronRight size={12} />
                            </button>

                            <button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = generatedFrames[currentFrameIndex];
                                link.download = `${map.name.replace(/\s+/g, "_")}_frame_${currentFrameIndex + 1}.png`;
                                link.click();
                              }}
                              className="w-8 h-8 rounded-lg bg-emerald-bg border border-emerald-border flex items-center justify-center text-emerald-text hover:bg-emerald-bg/85 ml-auto transition-colors cursor-pointer"
                              title="Descargar fotograma actual"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Report */}
                      {analysisStats && (
                        <div className="p-3.5 rounded-xl bg-void/50 border border-umber/40 space-y-2.5">
                          <h4 className="font-heading text-[10px] uppercase tracking-widest text-gold/80 font-bold leading-none">
                            REPORTE DE DIAGNÓSTICO
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-body text-vellum/60">
                            <div className="p-2 rounded-lg bg-sepia/15 border border-umber/30 space-y-0.5">
                              <span className="text-vellum/30 block text-[9px] uppercase tracking-wider">Superficie Agua</span>
                              <span className="font-mono text-emerald-text font-bold text-xs">{analysisStats.waterPercent}%</span>
                              <span className="text-vellum/30 block text-[8px] font-mono">({analysisStats.waterCount.toLocaleString()} px)</span>
                            </div>

                            <div className="p-2 rounded-lg bg-sepia/15 border border-umber/30 space-y-0.5">
                              <span className="text-vellum/30 block text-[9px] uppercase tracking-wider">Superficie Viento</span>
                              <span className="font-mono text-emerald-text font-bold text-xs">{analysisStats.windPercent}%</span>
                              <span className="text-vellum/30 block text-[8px] font-mono">({analysisStats.windCount.toLocaleString()} px)</span>
                            </div>

                            <div className="p-2 rounded-lg bg-sepia/15 border border-umber/30 space-y-0.5">
                              <span className="text-vellum/30 block text-[9px] uppercase tracking-wider">Emisores de Color</span>
                              <span className="font-mono text-emerald-text font-bold text-xs">{analysisStats.emissivePercent}%</span>
                              <span className="text-vellum/30 block text-[8px] font-mono">({analysisStats.emissiveCount.toLocaleString()} px)</span>
                            </div>

                            <div className="p-2 rounded-lg bg-sepia/15 border border-umber/30 space-y-0.5">
                              <span className="text-vellum/30 block text-[9px] uppercase tracking-wider">Puntos de Luz</span>
                              <span className="font-mono text-emerald-text font-bold text-xs">{analysisStats.lightsCount} focos</span>
                              <span className="text-vellum/30 block text-[8px] font-mono">Dinámicos activos</span>
                            </div>

                            <div className="p-2 rounded-lg bg-sepia/15 border border-umber/30 col-span-2 flex justify-between items-center">
                              <div>
                                <span className="text-vellum/30 block text-[9px] uppercase tracking-wider">Piezas Móviles</span>
                                <span className="text-vellum/30 block text-[8px] font-mono">Giro, flameo u oscilación</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-emerald-text font-bold text-xs">{(analysisStats as any).movingPartsCount ?? 0} zonas</span>
                                <span className="text-vellum/30 block text-[8px] font-mono">Recorte y animación activa</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Batch Export Button */}
                      <button
                        onClick={handleDownloadAllFrames}
                        className="w-full py-2 rounded-lg bg-sepia/60 border border-umber text-vellum/90 hover:text-vellum hover:border-gold/40 text-xs font-body font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download size={13} className="text-gold" />
                        DESCARGAR TODOS ({totalFrames} PNGs)
                      </button>

                      {/* List of frames thumbnails scrollbar */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-body uppercase tracking-widest text-vellum/30 leading-none">Fotogramas compilados</span>
                        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-umber scrollbar-track-void">
                          {generatedFrames.map((frame, index) => (
                            <button
                              key={`thumb-${index}`}
                              onClick={() => {
                                setCurrentFrameIndex(index);
                                setIsPlaying(false);
                              }}
                              className={`relative w-16 h-12 rounded-lg border flex-shrink-0 overflow-hidden transition-all cursor-pointer ${
                                currentFrameIndex === index
                                  ? "border-gold shadow-[0_0_8px_rgba(208,232,238,0.4)]"
                                  : "border-umber/50 hover:border-gold/40"
                              }`}
                            >
                              <img src={frame} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 right-0 bg-void/80 text-vellum text-[8px] font-mono px-1 rounded-tl-md">
                                #{index + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Icon Toolbar Triggers */}
      <div className="pointer-events-auto flex flex-col gap-2 mt-16 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-umber/40 scrollbar-track-transparent">
        {/* ADD PLACE TRIGGER BUTTON */}
        <button
          onClick={() => {
            onAddMarker();
            onTabChange(null);
          }}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-emerald-bg border border-emerald-border text-emerald-text hover:bg-emerald-bg/80 transition-all shadow-xl group cursor-pointer"
          style={{ minHeight: "44px" }}
        >
          <Plus size={15} strokeWidth={2.5} className="text-emerald-text" />
          <span className="font-heading text-[10px] uppercase tracking-[0.15em] font-bold hidden md:inline pr-1">Añadir lugar</span>
        </button>

        {/* WALLS / MUROS DRAWING TRIGGER */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              onToggleDrawingWalls?.();
              onTabChange(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl backdrop-blur-md border transition-all shadow-xl cursor-pointer ${
              drawingWalls
                ? "bg-emerald-bg/80 border-emerald-border text-emerald-text font-semibold shadow-[0_0_12px_rgba(208,232,238,0.25)]"
                : "bg-void/85 border-umber text-vellum/60 hover:text-vellum hover:border-emerald-border/40"
            }`}
            style={{ minHeight: "44px" }}
            title={drawingWalls ? "Salir de Modo Muro" : "Dibujar Muros"}
          >
            <PenTool size={14} className={drawingWalls ? "animate-pulse text-emerald-text" : ""} />
            <span className="font-body text-xs hidden md:inline pr-1">Muro</span>
          </button>

          {hasWalls && (
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que deseas borrar todos los muros de este mapa?")) {
                  onClearWalls?.();
                }
              }}
              className="flex items-center justify-center w-11 h-11 rounded-2xl bg-red-950/25 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all shadow-xl cursor-pointer"
              title="Borrar todos los muros de este mapa"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* LIGHTS FLICKERING SHOW TRIGGER */}
        <div className="flex gap-1.5">
          <button
            onClick={onToggleLights}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl backdrop-blur-md border transition-all shadow-xl cursor-pointer ${
              showLights
                ? "bg-emerald-bg/80 border-emerald-border text-emerald-text font-semibold shadow-[0_0_12px_rgba(208,232,238,0.25)]"
                : "bg-void/85 border-umber text-vellum/60 hover:text-vellum hover:border-emerald-border/40"
            }`}
            style={{ minHeight: "44px" }}
            title={showLights ? "Ocultar Luces" : "Mostrar Luces"}
          >
            <Sparkles size={14} className={showLights ? "animate-pulse text-emerald-text" : ""} />
            <span className="font-body text-xs hidden md:inline pr-1">Luces</span>
          </button>

          {hasLights && (
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que deseas borrar todas las luces de este mapa?")) {
                  onClearLights?.();
                }
              }}
              className="flex items-center justify-center w-11 h-11 rounded-2xl bg-red-950/25 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all shadow-xl cursor-pointer"
              title="Borrar todas las luces de este mapa"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Dynamic tabs list */}
        {SIDE_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(isActive ? null : tab.id)}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl backdrop-blur-md border transition-all shadow-xl cursor-pointer ${
                isActive
                  ? "bg-emerald-bg/80 border-emerald-border text-emerald-text font-semibold shadow-[0_0_12px_rgba(208,232,238,0.25)]"
                  : "bg-void/85 border-umber text-vellum/60 hover:text-vellum hover:border-emerald-border/40"
              }`}
              style={{ minHeight: "44px" }}
              title={tab.label}
            >
              <Icon size={14} />
              <span className="font-body text-xs hidden md:inline pr-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
