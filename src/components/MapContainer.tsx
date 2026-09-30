import { useEffect, useRef, useState, useCallback, Fragment, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { X, Plus, Minus, RotateCcw } from "lucide-react";
import { Light, Marker, Map, Wall, MovingPart, WindZone } from "../types";
import WeatherEffect from "./WeatherEffect";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorsAreSimilar(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  tolerance: number
) {
  const distance = Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  );
  const percentDiff = (distance / 441.67) * 100;
  return percentDiff <= tolerance;
}

interface Point {
  x: number;
  y: number;
}

function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function getConvexHull(points: Point[]): Point[] {
  if (points.length <= 3) return points;

  let pivot = points[0];
  let pivotIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < pivot.y || (points[i].y === pivot.y && points[i].x < pivot.x)) {
      pivot = points[i];
      pivotIdx = i;
    }
  }

  const otherPoints = points.filter((_, idx) => idx !== pivotIdx);
  otherPoints.sort((a, b) => {
    const cp = crossProduct(pivot, a, b);
    if (cp === 0) {
      const distA = Math.pow(a.x - pivot.x, 2) + Math.pow(a.y - pivot.y, 2);
      const distB = Math.pow(b.x - pivot.x, 2) + Math.pow(b.y - pivot.y, 2);
      return distA - distB;
    }
    return cp > 0 ? -1 : 1;
  });

  const hull: Point[] = [pivot];
  for (let i = 0; i < otherPoints.length; i++) {
    const p = otherPoints[i];
    while (hull.length >= 2 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }

  return hull;
}

function traceSmartObstacle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pxX: number,
  pxY: number,
  tolerance: number
): Point[] {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const clickedIdx = (pxY * width + pxX) * 4;
  const clickedR = data[clickedIdx];
  const clickedG = data[clickedIdx + 1];
  const clickedB = data[clickedIdx + 2];

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  visited[pxY * width + pxX] = 1;
  queue.push(pxY * width + pxX);

  const filledPoints: Point[] = [];
  const maxPixels = 40000;
  let count = 0;

  while (queue.length > 0 && count < maxPixels) {
    const curr = queue.shift()!;
    const cy = Math.floor(curr / width);
    const cx = curr % width;

    const idx = curr * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (colorsAreSimilar(r, g, b, clickedR, clickedG, clickedB, tolerance)) {
      filledPoints.push({ x: cx, y: cy });
      count++;

      if (cx > 0 && visited[curr - 1] === 0) {
        visited[curr - 1] = 1;
        queue.push(curr - 1);
      }
      if (cx < width - 1 && visited[curr + 1] === 0) {
        visited[curr + 1] = 1;
        queue.push(curr + 1);
      }
      if (cy > 0 && visited[curr - width] === 0) {
        visited[curr - width] = 1;
        queue.push(curr - width);
      }
      if (cy < height - 1 && visited[curr + width] === 0) {
        visited[curr + width] = 1;
        queue.push(curr + width);
      }
    }
  }

  const boundaryPoints: Point[] = [];
  for (let i = 0; i < filledPoints.length; i++) {
    const pt = filledPoints[i];
    const cx = pt.x;
    const cy = pt.y;

    let isBoundary = false;
    if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
      isBoundary = true;
    } else {
      const up = visited[(cy - 1) * width + cx];
      const down = visited[(cy + 1) * width + cx];
      const left = visited[cy * width + (cx - 1)];
      const right = visited[cy * width + (cx + 1)];
      if (up === 0 || down === 0 || left === 0 || right === 0) {
        isBoundary = true;
      }
    }

    if (isBoundary) {
      boundaryPoints.push(pt);
    }
  }

  const targetCount = 120;
  const step = Math.max(1, Math.ceil(boundaryPoints.length / targetCount));
  const sampled: Point[] = [];
  for (let i = 0; i < boundaryPoints.length; i += step) {
    sampled.push(boundaryPoints[i]);
  }

  return getConvexHull(sampled);
}

function traceMagicWindZone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pxX: number,
  pxY: number,
  tolerance: number
): { points: Point[]; color: string; pixelCount: number } | null {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const clickedIdx = (pxY * width + pxX) * 4;
  const clickedR = data[clickedIdx];
  const clickedG = data[clickedIdx + 1];
  const clickedB = data[clickedIdx + 2];
  const clickedHex =
    "#" +
    [clickedR, clickedG, clickedB]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  visited[pxY * width + pxX] = 1;
  queue.push(pxY * width + pxX);

  const filledPoints: Point[] = [];
  const maxPixels = 80000;
  let count = 0;

  while (queue.length > 0 && count < maxPixels) {
    const curr = queue.shift()!;
    const cy = Math.floor(curr / width);
    const cx = curr % width;

    const idx = curr * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (colorsAreSimilar(r, g, b, clickedR, clickedG, clickedB, tolerance)) {
      filledPoints.push({ x: cx, y: cy });
      count++;

      if (cx > 0 && visited[curr - 1] === 0) {
        visited[curr - 1] = 1;
        queue.push(curr - 1);
      }
      if (cx < width - 1 && visited[curr + 1] === 0) {
        visited[curr + 1] = 1;
        queue.push(curr + 1);
      }
      if (cy > 0 && visited[curr - width] === 0) {
        visited[curr - width] = 1;
        queue.push(curr - width);
      }
      if (cy < height - 1 && visited[curr + width] === 0) {
        visited[curr + width] = 1;
        queue.push(curr + width);
      }
    }
  }

  if (filledPoints.length < 5) {
    const radiusPx = Math.max(15, Math.min(width, height) * 0.04);
    const circlePoints: Point[] = [];
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circlePoints.push({
        x: Math.max(0, Math.min(width - 1, pxX + Math.cos(angle) * radiusPx)),
        y: Math.max(0, Math.min(height - 1, pxY + Math.sin(angle) * radiusPx)),
      });
    }
    return { points: circlePoints, color: clickedHex, pixelCount: Math.round(Math.PI * radiusPx * radiusPx) };
  }

  const boundaryPoints: Point[] = [];
  for (let i = 0; i < filledPoints.length; i++) {
    const pt = filledPoints[i];
    const cx = pt.x;
    const cy = pt.y;

    let isBoundary = false;
    if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
      isBoundary = true;
    } else {
      const up = visited[(cy - 1) * width + cx];
      const down = visited[(cy + 1) * width + cx];
      const left = visited[cy * width + (cx - 1)];
      const right = visited[cy * width + (cx + 1)];
      if (up === 0 || down === 0 || left === 0 || right === 0) {
        isBoundary = true;
      }
    }

    if (isBoundary) {
      boundaryPoints.push(pt);
    }
  }

  const targetCount = 120;
  const step = Math.max(1, Math.ceil(boundaryPoints.length / targetCount));
  const sampled: Point[] = [];
  for (let i = 0; i < boundaryPoints.length; i += step) {
    sampled.push(boundaryPoints[i]);
  }

  return { points: getConvexHull(sampled), color: clickedHex, pixelCount: filledPoints.length };
}

// Constant categories configurations
const MARKER_CATEGORIES: Record<string, { color: string; icon: string }> = {
  region: { color: "#C0392B", icon: "⚑" },
  painted_zone: { color: "#E67E22", icon: "🖌️" },
  layer: { color: "#2980B9", icon: "◈" },
  ambient: { color: "#27AE60", icon: "✦" },
  general: { color: "#d0e8ee", icon: "◉" },
};

function getPolygonCentroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (!points || points.length === 0) return { x: 50, y: 50 };
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: Number((sumX / points.length).toFixed(2)),
    y: Number((sumY / points.length).toFixed(2)),
  };
}

export function isPointInPolygon(
  pt: { x: number; y: number },
  poly: Array<{ x: number; y: number }>
): boolean {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getPolygonBoundingBox(points: Array<{ x: number; y: number }>) {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100, centerX: 50, centerY: 50 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const width = Math.max(0.5, maxX - minX);
  const height = Math.max(0.5, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { minX, maxX, minY, maxY, width, height, centerX, centerY };
}

// Light config presets with hot incandescent core and natural optical dynamics
interface LightPreset {
  defaultColor: string;
  coreColor: string;
  glowClass: string;
}

const LIGHT_PRESETS: Record<string, LightPreset> = {
  torch: { defaultColor: "#ff9d2e", coreColor: "#fff8e7", glowClass: "torch-glow" },
  magic: { defaultColor: "#a855f7", coreColor: "#f5d0fe", glowClass: "magic-glow" },
  cold: { defaultColor: "#38bdf8", coreColor: "#e0f2fe", glowClass: "cold-glow" },
  moon: { defaultColor: "#c7d2fe", coreColor: "#eef2ff", glowClass: "moon-glow" },
  point: { defaultColor: "#fbbf24", coreColor: "#fef3c7", glowClass: "torch-glow" },
  directional: { defaultColor: "#fef08a", coreColor: "#ffffff", glowClass: "moon-glow" },
};

// Math helpers
function sz(hexColor: string) {
  const cleanHex = (hexColor || "#ffb030").replace("#", "");
  const rgbHex = cleanHex.length === 3 ? cleanHex.split("").map(c => c + c).join("") : cleanHex;
  const rgbVal = parseInt(rgbHex, 16);
  return {
    r: (rgbVal >> 16) & 255,
    g: (rgbVal >> 8) & 255,
    b: rgbVal & 255,
  };
}

function fz(colorsList: Array<{ color: string }>) {
  const list = colorsList.length ? colorsList.map(i => i.color) : ["#3ba7d1"];
  const count = list.length * 3;
  const gradientStops: string[] = [];
  list.forEach((color, idx) => {
    const startPos = (idx / list.length) * 100;
    gradientStops.push(
      `${color}00 ${startPos}%`,
      `${color}ff ${startPos + 100 / count}%`,
      `${color}00 ${startPos + 200 / count}%`
    );
  });
  return `repeating-linear-gradient(115deg, ${gradientStops.join(", ")})`;
}

function dz(speed: number) {
  const s = Math.min(100, Math.max(1, speed ?? 50));
  return 2 + 178 * Math.pow((100 - s) / 99, 2.5);
}

function lz(speed: number) {
  const s = Math.min(100, Math.max(1, speed ?? 50));
  return 0.5 + 59.5 * Math.pow((100 - s) / 99, 2.5);
}

function hz(imgW: number, imgH: number, winW: number, winH: number) {
  return !imgW || !imgH ? 0.5 : Math.max(winW / imgW, winH / imgH);
}

function Xb(panX: number, panY: number, scale: number, imgW: number, imgH: number, winW: number, winH: number) {
  if (!imgW || !imgH) return { x: panX, y: panY };
  const zoomedW = imgW * scale;
  const zoomedH = imgH * scale;
  const boundX = Math.max(0, (zoomedW - winW) / 2);
  const boundY = Math.max(0, (zoomedH - winH) / 2);
  return {
    x: Math.max(-boundX, Math.min(boundX, panX)),
    y: Math.max(-boundY, Math.min(boundY, panY)),
  };
}

// Live Moving Parts Canvas Animation Layer
interface MovingPartsLayerProps {
  imageSrc: string;
  movingParts: MovingPart[];
  width: number;
  height: number;
}

function MovingPartsLayer({ imageSrc, movingParts, width, height }: MovingPartsLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cachedParts, setCachedParts] = useState<Array<{
    part: MovingPart;
    canvas: HTMLCanvasElement;
    px: number;
    py: number;
    r_px: number;
  }>>([]);

  useEffect(() => {
    if (!imageSrc || !movingParts || movingParts.length === 0 || width === 0 || height === 0) {
      setCachedParts([]);
      return;
    }

    let active = true;
    const img = new Image();
    if (imageSrc && !imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (!active) return;
      try {
        const partsData = movingParts.map(part => {
          const partCanvas = document.createElement("canvas");
          partCanvas.width = width;
          partCanvas.height = height;
          const pctx = partCanvas.getContext("2d");
          if (!pctx) return null;

          const px = (part.x / 100) * width;
          const py = (part.y / 100) * height;
          const r_px = (part.radius / 100) * width;

          // Clip a circle around the moving part center
          pctx.save();
          pctx.beginPath();
          pctx.arc(px, py, r_px, 0, Math.PI * 2);
          pctx.clip();
          pctx.drawImage(img, 0, 0, width, height);
          pctx.restore();

          // Apply color mask isolation if requested
          if (part.use_color_mask && part.mask_color) {
            const pImgData = pctx.getImageData(0, 0, width, height);
            const pPixels = pImgData.data;
            const targetColor = sz(part.mask_color);
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
            r_px
          };
        }).filter(Boolean) as any[];

        if (active) {
          setCachedParts(partsData);
        }
      } catch (e) {
        console.error("Error compiling moving parts layer:", e);
      }
    };
    img.src = imageSrc;

    return () => {
      active = false;
    };
  }, [imageSrc, movingParts, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cachedParts.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const startTime = performance.now();

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now();
      const elapsedSec = (now - startTime) / 1000;

      cachedParts.forEach(({ part, canvas: partCanvas, px, py, r_px }) => {
        ctx.save();
        const speedMult = part.speed ?? 5;
        // speedMult / 5 cycles per second as base
        const phase = (elapsedSec * (speedMult / 5)) * Math.PI * 2;
        const startingRad = ((part.angle ?? 0) * Math.PI) / 180;

        if (part.type === "rotation_cw" || part.type === "rotation_ccw") {
          const dir = part.type === "rotation_cw" ? 1 : -1;
          const angle = startingRad + dir * phase;
          ctx.translate(px, py);
          ctx.rotate(angle);
          ctx.translate(-px, -py);
          ctx.drawImage(partCanvas, 0, 0);
        } 
        else if (part.type === "sway") {
          const angle = startingRad + Math.sin(phase) * 0.25;
          ctx.translate(px, py);
          ctx.rotate(angle);
          ctx.translate(-px, -py);
          ctx.drawImage(partCanvas, 0, 0);
        } 
        else if (part.type === "pulse") {
          const scale = 1.0 + Math.sin(phase) * 0.08;
          ctx.translate(px, py);
          ctx.scale(scale, scale);
          ctx.translate(-px, -py);
          ctx.drawImage(partCanvas, 0, 0);
        } 
        else if (part.type === "wind_flutter") {
          const slices = 16;
          const sliceWidth = Math.ceil((r_px * 2) / slices);
          const startX = Math.max(0, px - r_px);
          const maxOffset = 1.5 + (speedMult / 5) * 3;

          for (let s = 0; s < slices; s++) {
            const sx = startX + s * sliceWidth;
            const sw = Math.min(sliceWidth, width - sx);
            if (sw <= 0) continue;

            const wavePhase = (s / slices) * Math.PI * 2.0 + phase;
            const dy = Math.sin(wavePhase) * maxOffset;

            ctx.drawImage(partCanvas, sx, 0, sw, height, sx, dy, sw, height);
          }
        }
        else if (part.type === "linear_x") {
          const dx = Math.sin(phase) * r_px * 0.4;
          ctx.translate(dx, 0);
          ctx.drawImage(partCanvas, 0, 0);
        }
        else if (part.type === "linear_y") {
          const dy = Math.sin(phase) * r_px * 0.4;
          ctx.translate(0, dy);
          ctx.drawImage(partCanvas, 0, 0);
        }
        else if (part.type === "orbit") {
          const dx = Math.sin(phase) * r_px * 0.25;
          const dy = Math.cos(phase) * r_px * 0.25;
          ctx.translate(dx, dy);
          ctx.drawImage(partCanvas, 0, 0);
        }
        else if (part.type === "bounce") {
          const dy = Math.abs(Math.sin(phase)) * -r_px * 0.3;
          ctx.translate(0, dy);
          ctx.drawImage(partCanvas, 0, 0);
        }
        else if (part.type === "wiggle") {
          const dx = (Math.random() - 0.5) * 4 * (speedMult / 5);
          const dy = (Math.random() - 0.5) * 4 * (speedMult / 5);
          ctx.translate(dx, dy);
          ctx.drawImage(partCanvas, 0, 0);
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [cachedParts, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ zIndex: 6 }}
    />
  );
}

// Emissive glow helper
interface EmissiveGlowProps {
  imageSrc: string | undefined;
  color: string;
  similarity: number;
  speed: number;
  enabled: boolean;
}

function EmissiveGlow({ imageSrc, color, similarity, speed, enabled }: EmissiveGlowProps) {
  const [glowUrl, setGlowUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !imageSrc || !color) {
      setGlowUrl(null);
      return;
    }
    let active = true;
    const img = new Image();
    if (imageSrc && !imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { r: cr, g: cg, b: cb } = sz(color);
        const threshold = (similarity / 100) * 441.7;
        const pixels = imgData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          const diffR = pixels[i] - cr;
          const diffG = pixels[i + 1] - cg;
          const diffB = pixels[i + 2] - cb;
          const distance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

          if (distance <= threshold) {
            pixels[i] = cr;
            pixels[i + 1] = cg;
            pixels[i + 2] = cb;
            pixels[i + 3] = 255;
          } else {
            pixels[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        if (active) setGlowUrl(canvas.toDataURL());
      } catch (e) {
        console.error("CORS limit hit during glow compilation:", e);
      }
    };
    img.src = imageSrc;
    return () => {
      active = false;
    };
  }, [imageSrc, color, similarity, enabled]);

  if (!glowUrl) return null;

  return (
    <img
      src={glowUrl}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-full pointer-events-none select-none emissive-glow-pulse"
      style={{
        mixBlendMode: "screen",
        zIndex: 5,
        animationDuration: `${lz(speed)}s`,
      }}
    />
  );
}

// Water shimmer helper - Foundry VTT organic undulating wave shader
interface WaterShimmerProps {
  imageSrc: string | undefined;
  colors: Array<{ color: string; similarity?: number; blend_mode?: string; wave_color?: string }>;
  speed: number;
  enabled: boolean;
  waveColor?: string;
  waveOpacity?: number;
  waveAngle?: number;
}

function WaterShimmer({
  imageSrc,
  colors,
  speed,
  enabled,
  waveColor = "#ffffff",
  waveOpacity = 80,
  waveAngle = 0,
}: WaterShimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedImgRef = useRef<HTMLImageElement | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const activeColors = colors.filter(c => c && c.color);

  // Generate water mask with smooth falloff and anti-aliased transitions
  useEffect(() => {
    if (!enabled || !imageSrc || activeColors.length === 0) {
      setMaskCanvas(null);
      return;
    }
    let active = true;

    const processImage = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const mappedFilters = activeColors.map(c => {
          const targetWaveHex = c.wave_color || waveColor || "#ffffff";
          const waveRgb = sz(targetWaveHex);
          return {
            ...sz(c.color),
            threshold: ((c.similarity ?? 30) / 100) * 441.7,
            waveR: waveRgb.r,
            waveG: waveRgb.g,
            waveB: waveRgb.b,
          };
        });
        const pixels = imgData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          let matchedAlpha = 0;
          let totalWeight = 0;
          let accumWaveR = 0;
          let accumWaveG = 0;
          let accumWaveB = 0;

          for (const filter of mappedFilters) {
            const dr = pixels[i] - filter.r;
            const dg = pixels[i + 1] - filter.g;
            const db = pixels[i + 2] - filter.b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);

            if (dist <= filter.threshold) {
              const innerThresh = filter.threshold * 0.72;
              let alpha = 255;
              if (dist > innerThresh) {
                const ratio = 1 - (dist - innerThresh) / (filter.threshold - innerThresh);
                // Hermite smoothstep for natural blending
                const smoothRatio = ratio * ratio * (3 - 2 * ratio);
                alpha = Math.round(smoothRatio * 255);
              }
              if (alpha > 0) {
                const weight = alpha / 255;
                accumWaveR += filter.waveR * weight;
                accumWaveG += filter.waveG * weight;
                accumWaveB += filter.waveB * weight;
                totalWeight += weight;
                if (alpha > matchedAlpha) {
                  matchedAlpha = alpha;
                }
              }
            }
          }

          if (totalWeight > 0) {
            pixels[i] = Math.round(accumWaveR / totalWeight);
            pixels[i + 1] = Math.round(accumWaveG / totalWeight);
            pixels[i + 2] = Math.round(accumWaveB / totalWeight);
            pixels[i + 3] = matchedAlpha;
          } else {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        if (active) {
          setMaskCanvas(canvas);
        }
      } catch (e) {
        console.error("CORS limits hit during water masking:", e);
      }
    };

    if (cachedImgRef.current && cachedImgRef.current.src === imageSrc && cachedImgRef.current.complete) {
      processImage(cachedImgRef.current);
    } else {
      const img = new Image();
      if (imageSrc && !imageSrc.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (!active) return;
        cachedImgRef.current = img;
        processImage(img);
      };
      img.src = imageSrc;
    }

    return () => {
      active = false;
    };
  }, [imageSrc, JSON.stringify(activeColors), waveColor, enabled]);

  // WebGL Foundry VTT Wave Simulation Renderer
  useEffect(() => {
    if (!maskCanvas || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = maskCanvas.width;
    canvas.height = maskCanvas.height;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 vUv;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uOpacity;
      uniform float uAngle;
      uniform float uSpeed;
      uniform sampler2D uMask;

      // Foundry VTT wave undulation algorithm
      float calcWave(vec2 p, float angleDeg, float time, float freq, float speed, float turbulence) {
        float rad = radians(angleDeg);
        vec2 dir = vec2(cos(rad), sin(rad));
        vec2 perp = vec2(-sin(rad), cos(rad));
        
        float u = dot(p, dir);
        float v = dot(p, perp);
        
        // Harmonic sinuous undulations across the wave front create organic, living swells
        float undulation = sin(v * (freq * 0.4) + time * 0.85) * turbulence +
                           cos(v * (freq * 0.2) + time * 0.45) * (turbulence * 0.6);
                           
        float phase = (u + undulation) * freq - time * speed;
        return sin(phase);
      }

      void main() {
        vec4 maskSample = texture2D(uMask, vUv);
        if (maskSample.a <= 0.002) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        vec2 p = vUv * uResolution;
        
        // Layer 1: Primary broad undulating wave swells (Foundry VTT style)
        float w1 = calcWave(p, uAngle, uTime, 0.022, uSpeed * 35.0, 22.0);
        float crest1 = pow(clamp(w1 * 0.5 + 0.5, 0.0, 1.0), 5.5);
        
        // Layer 2: Secondary harmonic ripples with slight phase offset
        float w2 = calcWave(p, uAngle + 7.0, uTime * 1.25 + 12.0, 0.045, uSpeed * 48.0, 14.0);
        float crest2 = pow(clamp(w2 * 0.5 + 0.5, 0.0, 1.0), 6.5);
        
        // Layer 3: Caustic shimmer & specular highlights
        float w3 = calcWave(p, uAngle - 10.0, uTime * 1.6 + 24.0, 0.075, uSpeed * 65.0, 9.0);
        float crest3 = pow(clamp(w3 * 0.5 + 0.5, 0.0, 1.0), 8.0);
        
        // Combined wave reflection highlight
        float highlight = crest1 * 0.72 + crest2 * 0.48 + crest3 * 0.32;
        
        // Modulate by mask alpha and opacity without affecting background
        float finalAlpha = clamp(highlight * maskSample.a * uOpacity, 0.0, 1.0);
        
        // Wave color per water color region stored in mask RGB
        vec3 waveColor = maskSample.rgb;
        
        gl_FragColor = vec4(waveColor * finalAlpha, finalAlpha);
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full screen quad
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture for mask
    const maskTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(prog, "uTime");
    const uResLoc = gl.getUniformLocation(prog, "uResolution");
    const uOpacityLoc = gl.getUniformLocation(prog, "uOpacity");
    const uAngleLoc = gl.getUniformLocation(prog, "uAngle");
    const uSpeedLoc = gl.getUniformLocation(prog, "uSpeed");
    const uMaskLoc = gl.getUniformLocation(prog, "uMask");

    gl.uniform2f(uResLoc, canvas.width, canvas.height);
    gl.uniform1i(uMaskLoc, 0);

    gl.uniform1f(uOpacityLoc, Math.max(0.1, (waveOpacity ?? 80) / 100));
    gl.uniform1f(uAngleLoc, waveAngle ?? 0);
    gl.uniform1f(uSpeedLoc, (speed || 50) / 50);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let animId = 0;
    const startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTimeLoc, elapsed);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
      if (maskTex) gl.deleteTexture(maskTex);
      if (prog) gl.deleteProgram(prog);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, [maskCanvas, waveOpacity, waveAngle, speed]);

  if (!maskCanvas) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{
        zIndex: 5,
        mixBlendMode: "screen",
      }}
    />
  );
}

// Wind sway effect for trees and plants - Foundry VTT GPU WebGL shader
interface WindSwayProps {
  imageSrc: string | undefined;
  colors?: Array<{ color: string; similarity?: number }>;
  windZones?: WindZone[];
  windMaskImage?: string;
  speed: number;
  strength: number;
  angle?: number;
  gusts?: number;
  enabled: boolean;
  showMaskPreview?: boolean;
  darknessFilter?: string;
}

// Ultra-fast Jump Flood Algorithm (JFA) for background terrain restoration beneath swaying trees
function createInpaintedBackground(
  img: HTMLImageElement,
  alphaBuffer: Uint8ClampedArray,
  w: number,
  h: number
): HTMLCanvasElement {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = w;
  bgCanvas.height = h;
  const ctx = bgCanvas.getContext("2d");
  if (!ctx) return bgCanvas;

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const pixels = imgData.data;

  // Check if any foliage pixels are present
  let hasMasked = false;
  for (let i = 0; i < alphaBuffer.length; i++) {
    if (alphaBuffer[i] > 10) {
      hasMasked = true;
      break;
    }
  }
  if (!hasMasked) return bgCanvas;

  // Scaled Voronoi jump-flood grid for instant distance & ground sampling (<10ms)
  const scale = w > 1024 ? 4 : w > 512 ? 2 : 1;
  const gw = Math.ceil(w / scale);
  const gh = Math.ceil(h / scale);
  const gridMask = new Uint8Array(gw * gh);
  const nearestX = new Int16Array(gw * gh);
  const nearestY = new Int16Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    const srcY = Math.min(h - 1, gy * scale);
    const rowOffset = gy * gw;
    const srcRowOffset = srcY * w;
    for (let gx = 0; gx < gw; gx++) {
      const srcX = Math.min(w - 1, gx * scale);
      const isTree = alphaBuffer[srcRowOffset + srcX] > 20;
      const gIdx = rowOffset + gx;
      if (isTree) {
        gridMask[gIdx] = 1;
        nearestX[gIdx] = -1;
        nearestY[gIdx] = -1;
      } else {
        gridMask[gIdx] = 0;
        nearestX[gIdx] = gx;
        nearestY[gIdx] = gy;
      }
    }
  }

  // Jump Flood steps
  for (let step = Math.max(gw, gh) >> 1; step >= 1; step >>= 1) {
    for (let gy = 0; gy < gh; gy++) {
      const rowOffset = gy * gw;
      for (let gx = 0; gx < gw; gx++) {
        const curIdx = rowOffset + gx;
        let bestDist = 1e9;
        let bestNx = nearestX[curIdx];
        let bestNy = nearestY[curIdx];
        if (bestNx >= 0) {
          bestDist = (gx - bestNx) * (gx - bestNx) + (gy - bestNy) * (gy - bestNy);
        }

        for (let dy = -step; dy <= step; dy += step) {
          const ny = gy + dy;
          if (ny < 0 || ny >= gh) continue;
          const nRow = ny * gw;
          for (let dx = -step; dx <= step; dx += step) {
            if (dx === 0 && dy === 0) continue;
            const nx = gx + dx;
            if (nx < 0 || nx >= gw) continue;
            const nIdx = nRow + nx;
            const testNx = nearestX[nIdx];
            const testNy = nearestY[nIdx];
            if (testNx >= 0) {
              const d = (gx - testNx) * (gx - testNx) + (gy - testNy) * (gy - testNy);
              if (d < bestDist) {
                bestDist = d;
                bestNx = testNx;
                bestNy = testNy;
              }
            }
          }
        }
        nearestX[curIdx] = bestNx;
        nearestY[curIdx] = bestNy;
      }
    }
  }

  // Fill in the ground plate by sampling surrounding terrain with organic spatial variation
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, Math.floor(y / scale));
    const gRow = gy * gw;
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const p = rowOffset + x;
      const alpha = alphaBuffer[p];
      if (alpha <= 10) continue; // Unmasked original ground

      const gx = Math.min(gw - 1, Math.floor(x / scale));
      const gIdx = gRow + gx;
      let nx = nearestX[gIdx];
      let ny = nearestY[gIdx];
      if (nx < 0) {
        nx = gx;
        ny = gy;
      }

      // Add high-frequency organic jitter to reconstruct natural ground texture (grass/dirt/stone)
      const jitterX = Math.floor(Math.sin(x * 0.18 + y * 0.14) * 7);
      const jitterY = Math.floor(Math.cos(x * 0.15 - y * 0.17) * 7);
      let targetX = Math.max(0, Math.min(w - 1, nx * scale + (x % scale) + jitterX));
      let targetY = Math.max(0, Math.min(h - 1, ny * scale + (y % scale) + jitterY));

      let targetP = targetY * w + targetX;
      if (alphaBuffer[targetP] > 20) {
        targetX = Math.max(0, Math.min(w - 1, nx * scale));
        targetY = Math.max(0, Math.min(h - 1, ny * scale));
        targetP = targetY * w + targetX;
      }

      const pIdx = p * 4;
      const tIdx = targetP * 4;

      const weight = alpha / 255;
      pixels[pIdx] = Math.round(pixels[pIdx] * (1 - weight) + pixels[tIdx] * weight);
      pixels[pIdx + 1] = Math.round(pixels[pIdx + 1] * (1 - weight) + pixels[tIdx + 1] * weight);
      pixels[pIdx + 2] = Math.round(pixels[pIdx + 2] * (1 - weight) + pixels[tIdx + 2] * weight);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return bgCanvas;
}

function WindSway({
  imageSrc,
  colors = [],
  windZones = [],
  windMaskImage,
  speed,
  strength,
  angle = 0,
  gusts = 60,
  enabled,
  showMaskPreview = false,
  darknessFilter,
}: WindSwayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null);
  const [mapImg, setMapImg] = useState<HTMLImageElement | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);

  const activeColors = (colors || []).filter((c) => c && c.color);
  const activeZones = (windZones || []).filter(
    (z) => z.enabled !== false && z.points && z.points.length >= 3
  );
  const hasPaintedMask = !!windMaskImage;

  // Generate high-precision vegetation mask and synthesized background ground plate
  useEffect(() => {
    if (!enabled || !imageSrc || (activeColors.length === 0 && activeZones.length === 0 && !hasPaintedMask)) {
      setMaskCanvas(null);
      setBgCanvas(null);
      setMapImg(null);
      setMaskUrl(null);
      return;
    }
    let active = true;

    const generateMaskAndBg = async () => {
      try {
        const img = new Image();
        if (imageSrc && !imageSrc.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageSrc;
        });

        let paintedMaskImg: HTMLImageElement | null = null;
        if (windMaskImage) {
          paintedMaskImg = new Image();
          if (!windMaskImage.startsWith("data:")) {
            paintedMaskImg.crossOrigin = "anonymous";
          }
          await new Promise((resolve) => {
            paintedMaskImg!.onload = resolve;
            paintedMaskImg!.onerror = () => resolve(null);
            paintedMaskImg!.src = windMaskImage;
          });
        }

        if (!active) return;

        setMapImg(img);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const w = canvas.width;
        const h = canvas.height;
        const totalPixels = w * h;
        const alphaBuffer = new Uint8ClampedArray(totalPixels);

        const mappedFilters = activeColors.map((c) => ({
          ...sz(c.color),
          threshold: ((c.similarity ?? 30) / 100) * 441.7,
        }));

        let zonePixels: Uint8ClampedArray | null = null;
        let zoneFilters: Array<{ r: number; g: number; b: number; threshold: number }> = [];

        if (activeZones.length > 0 || paintedMaskImg) {
          const zoneCanvas = document.createElement("canvas");
          zoneCanvas.width = w;
          zoneCanvas.height = h;
          const zCtx = zoneCanvas.getContext("2d");
          if (zCtx) {
            // Draw freehand painted mask
            if (paintedMaskImg) {
              zCtx.drawImage(paintedMaskImg, 0, 0, w, h);
            }
            // Draw polygon zones
            if (activeZones.length > 0) {
              zCtx.fillStyle = "#ffffff";
              for (const zone of activeZones) {
                zCtx.beginPath();
                zone.points.forEach((pt, pIdx) => {
                  const x = (pt.x / 100) * w;
                  const y = (pt.y / 100) * h;
                  if (pIdx === 0) zCtx.moveTo(x, y);
                  else zCtx.lineTo(x, y);
                });
                zCtx.closePath();
                zCtx.fill();
              }
            }
            zonePixels = zCtx.getImageData(0, 0, w, h).data;
          }

          zoneFilters = activeZones
            .filter((z) => !!z.color)
            .map((z) => ({
              ...sz(z.color!),
              threshold: ((z.tolerance ?? 25) / 100) * 441.7,
            }));
        }

        const allFilters = [...mappedFilters, ...zoneFilters];

        for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
          if (zonePixels) {
            const inZone = zonePixels[i + 3] > 10;
            if (!inZone) {
              alphaBuffer[p] = 0;
              continue;
            }
          }

          if (allFilters.length > 0) {
            let maxAlpha = 0;
            for (const filter of allFilters) {
              const dr = pixels[i] - filter.r;
              const dg = pixels[i + 1] - filter.g;
              const db = pixels[i + 2] - filter.b;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);
              if (dist <= filter.threshold) {
                const innerThresh = filter.threshold * 0.72;
                if (dist <= innerThresh) {
                  maxAlpha = 255;
                  break;
                } else {
                  const ratio = 1 - (dist - innerThresh) / (filter.threshold - innerThresh);
                  const smoothRatio = ratio * ratio * (3 - 2 * ratio);
                  const a = Math.round(smoothRatio * 255);
                  if (a > maxAlpha) maxAlpha = a;
                }
              }
            }
            alphaBuffer[p] = maxAlpha;
          } else {
            alphaBuffer[p] = zonePixels ? zonePixels[i + 3] : 255;
          }
        }

        // Anti-aliasing soft blur pass on mask boundary
        for (let y = 1; y < h - 1; y++) {
          const rowOffset = y * w;
          for (let x = 1; x < w - 1; x++) {
            const p = rowOffset + x;
            const val = alphaBuffer[p];
            if (val > 0 && val < 255) {
              const smoothed = (
                val * 4 +
                alphaBuffer[p - 1] +
                alphaBuffer[p + 1] +
                alphaBuffer[p - w] +
                alphaBuffer[p + w]
              ) / 8;
              alphaBuffer[p] = smoothed;
            }
          }
        }

        // Generate synthesized background ground plate where trees are in-painted with surrounding terrain
        const generatedBg = createInpaintedBackground(img, alphaBuffer, w, h);

        // Apply clean mask into canvas
        for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
          pixels[i] = 255;
          pixels[i + 1] = 255;
          pixels[i + 2] = 255;
          pixels[i + 3] = alphaBuffer[p];
        }

        ctx.putImageData(imgData, 0, 0);
        if (active) {
          setMaskCanvas(canvas);
          setBgCanvas(generatedBg);
          if (showMaskPreview) {
            setMaskUrl(canvas.toDataURL());
          }
        }
      } catch (e) {
        console.error("Error during wind masking and background generation:", e);
      }
    };

    generateMaskAndBg();
    return () => {
      active = false;
    };
  }, [
    imageSrc,
    JSON.stringify(activeColors),
    JSON.stringify(activeZones),
    windMaskImage,
    enabled,
    showMaskPreview,
  ]);

  // WebGL Foundry VTT Multi-Harmonic Wind Physics Shader with Ground Restoration & Contact Shadows
  useEffect(() => {
    if (!maskCanvas || !mapImg || !bgCanvas || !canvasRef.current) return;

    const canvas = canvasRef.current;

    canvas.width = maskCanvas.width;
    canvas.height = maskCanvas.height;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSpeed;
      uniform float uStrength;
      uniform float uAngle;
      uniform float uGusts;
      uniform sampler2D uMapTexture;
      uniform sampler2D uMask;
      uniform sampler2D uBgTexture;

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * uResolution;

        float rad = radians(uAngle);
        vec2 windDir = vec2(cos(rad), sin(rad));
        vec2 windPerp = vec2(-sin(rad), cos(rad));

        float u = dot(p, windDir);
        float v = dot(p, windPerp);

        // --- Multi-Harmonic Organic Fluid Wind Physics ---
        // 1. Organic Traveling Wind Gust Wavefronts with smooth attack & decay
        float gustCoord = u * 0.0016 - uTime * (uSpeed * 0.9);
        float gustWave = sin(gustCoord) * 0.5 + 0.5;
        float gustWave2 = sin(gustCoord * 2.2 + 1.4) * 0.3;
        float combinedGust = clamp(pow(gustWave, 1.6) + gustWave2 * 0.4, 0.0, 1.5);
        float gustIntensity = mix(0.72, 1.4 + uGusts * 0.55, combinedGust);

        // 2. Trunk & Tree Crown Deep Harmonic Sway (Oscilación orgánica con inercia y elasticidad)
        float swayTime = uTime * uSpeed * 2.0;
        float sway1 = sin(u * 0.0045 + v * 0.0022 - swayTime);
        float sway2 = sin(u * 0.011 - v * 0.008 - swayTime * 1.52 + 0.95) * 0.44;
        float sway3 = cos(u * 0.021 + v * 0.016 - swayTime * 2.15 + 2.1) * 0.22;
        float totalMainSway = (sway1 + sway2 + sway3) * gustIntensity;

        // 3. Cross-Vortex Vortex Resonance & Elliptical Rolling (Oscilación lateral tridimensional)
        float cross1 = sin(u * 0.0065 + v * 0.0055 - swayTime * 1.28 + 1.57) * 0.4;
        float cross2 = cos(u * 0.014 - swayTime * 1.85) * 0.18;
        float crossSway = (cross1 + cross2) * gustIntensity;

        // 4. Micro Foliage Rustle & Branch Flutter (Vibración fluida de hojas y ramajes)
        float flutter1 = sin(p.x * 0.048 + p.y * 0.038 + uTime * uSpeed * 5.6) *
                         cos(p.x * 0.032 - p.y * 0.052 - uTime * uSpeed * 4.7);
        float flutter2 = sin(p.x * 0.088 - p.y * 0.068 + uTime * uSpeed * 7.2) * 0.45;
        float totalFlutter = (flutter1 + flutter2) * (0.32 + uGusts * 0.68);

        // 5. Total displacement calculation in pixels
        float amp = uStrength * 22.0;
        vec2 disp = windDir * (totalMainSway * amp) +
                    windPerp * (crossSway * amp * 0.55) +
                    windDir * (totalFlutter * amp * 0.26);

        // --- Ground & Background Terrain Layer ---
        // Sample in-painted background (clean ground without static ghost tree)
        vec4 bgSample = texture2D(uBgTexture, uv);

        // Dynamic ground contact shadow offset by wind direction & foliage movement
        vec2 shadowDisp = disp * 0.35 + windDir * (amp * 0.16);
        vec2 shadowUv = clamp(uv - shadowDisp / uResolution, vec2(0.001), vec2(0.999));
        float shadowMask = texture2D(uMask, shadowUv).a;

        // Darken terrain naturally under the moving foliage shadow
        vec3 groundWithShadow = mix(bgSample.rgb, bgSample.rgb * 0.58, shadowMask * 0.65);

        // --- Moving Tree & Foliage Layer ---
        // Sample foliage texture at smoothly displaced UV position
        vec2 displacedUv = clamp(uv - disp / uResolution, vec2(0.001), vec2(0.999));
        vec4 treeColor = texture2D(uMapTexture, displacedUv);
        float treeAlpha = texture2D(uMask, displacedUv).a;

        // Dynamic light reflection & foliage sheen when leaves catch the wind
        float foliageSheen = clamp((totalMainSway * 0.075 + totalFlutter * 0.045) * (0.8 + uGusts * 0.55), -0.05, 0.09);
        vec3 illuminatedTree = treeColor.rgb + vec3(foliageSheen);

        // --- Final Pristine Composite ---
        // Seamlessly blend: Background Ground -> Swaying Tree Foliage
        vec3 finalRgb = mix(groundWithShadow, illuminatedTree, treeAlpha);

        gl_FragColor = vec4(finalRgb, 1.0);
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full screen quad
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture 0: Map Image (Original with trees)
    const mapTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mapTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapImg);

    // Texture 1: Mask Canvas (Foliage mask)
    const maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);

    // Texture 2: Background Canvas (In-painted ground without static trees)
    const bgTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(prog, "uTime");
    const uResLoc = gl.getUniformLocation(prog, "uResolution");
    const uSpeedLoc = gl.getUniformLocation(prog, "uSpeed");
    const uStrengthLoc = gl.getUniformLocation(prog, "uStrength");
    const uAngleLoc = gl.getUniformLocation(prog, "uAngle");
    const uGustsLoc = gl.getUniformLocation(prog, "uGusts");
    const uMapTexLoc = gl.getUniformLocation(prog, "uMapTexture");
    const uMaskLoc = gl.getUniformLocation(prog, "uMask");
    const uBgTexLoc = gl.getUniformLocation(prog, "uBgTexture");

    gl.uniform2f(uResLoc, canvas.width, canvas.height);
    gl.uniform1i(uMapTexLoc, 0);
    gl.uniform1i(uMaskLoc, 1);
    gl.uniform1i(uBgTexLoc, 2);

    gl.uniform1f(uSpeedLoc, (speed || 50) / 50);
    gl.uniform1f(uStrengthLoc, (strength || 25) / 50);
    gl.uniform1f(uAngleLoc, angle ?? 0);
    gl.uniform1f(uGustsLoc, (gusts ?? 60) / 100);

    gl.viewport(0, 0, canvas.width, canvas.height);

    let animId = 0;
    const startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTimeLoc, elapsed);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
      if (mapTex) gl.deleteTexture(mapTex);
      if (maskTex) gl.deleteTexture(maskTex);
      if (bgTex) gl.deleteTexture(bgTex);
      if (prog) gl.deleteProgram(prog);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, [maskCanvas, bgCanvas, mapImg, speed, strength, angle, gusts]);

  if (!maskCanvas || !mapImg || !bgCanvas) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{
          zIndex: 4,
          filter: darknessFilter,
          transition: "filter 0.3s ease-out",
        }}
      />

      {/* Live Glowing Wind Mask Visualizer Overlay */}
      {showMaskPreview && maskUrl && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          style={{
            WebkitMaskImage: `url(${maskUrl})`,
            maskImage: `url(${maskUrl})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            zIndex: 11,
            mixBlendMode: "screen",
          }}
        >
          <div className="w-full h-full bg-gradient-to-tr from-emerald-500/40 via-teal-400/30 to-emerald-300/40 animate-pulse border border-emerald-300/60" />
        </div>
      )}
    </>
  );
}

function calculateVisibilityPolygon(
  lightX: number,
  lightY: number,
  lightRadius: number,
  walls: Wall[]
) {
  // Map boundaries
  const bounds = [
    { x1: 0, y1: 0, x2: 100, y2: 0 },
    { x1: 100, y1: 0, x2: 100, y2: 100 },
    { x1: 100, y1: 100, x2: 0, y2: 100 },
    { x1: 0, y1: 100, x2: 0, y2: 0 },
  ];

  // Map and clean wall segments
  let wallSegments = walls
    .map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))
    .filter(seg => {
      // Filter out zero-length segments to prevent divide-by-zero picos
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      return len > 0.15;
    });

  // Snap nearby vertices together to auto-complete holes and gaps
  const SNAP_THRESHOLD = 0.8; // 0.8% threshold
  const allCoords: { x: number; y: number }[] = [];
  wallSegments.forEach(s => {
    allCoords.push({ x: s.x1, y: s.y1 });
    allCoords.push({ x: s.x2, y: s.y2 });
  });

  // Group vertices that are very close
  const vertexGroups: { x: number; y: number }[][] = [];
  allCoords.forEach(c => {
    let found = false;
    for (const group of vertexGroups) {
      const lead = group[0];
      const d = Math.hypot(c.x - lead.x, c.y - lead.y);
      if (d < SNAP_THRESHOLD) {
        group.push(c);
        found = true;
        break;
      }
    }
    if (!found) {
      vertexGroups.push([c]);
    }
  });

  // Calculate averaged anchor points for each group
  const groupAverages = vertexGroups.map(group => {
    const sumX = group.reduce((sum, pt) => sum + pt.x, 0);
    const sumY = group.reduce((sum, pt) => sum + pt.y, 0);
    return {
      x: sumX / group.length,
      y: sumY / group.length
    };
  });

  // Apply the snap coordinates back to the wall segments
  wallSegments = wallSegments.map(seg => {
    let s1x = seg.x1, s1y = seg.y1, s2x = seg.x2, s2y = seg.y2;
    for (let i = 0; i < vertexGroups.length; i++) {
      const g = vertexGroups[i];
      const avg = groupAverages[i];
      if (g.some(pt => Math.abs(pt.x - seg.x1) < 1e-4 && Math.abs(pt.y - seg.y1) < 1e-4)) {
        s1x = avg.x;
        s1y = avg.y;
      }
      if (g.some(pt => Math.abs(pt.x - seg.x2) < 1e-4 && Math.abs(pt.y - seg.y2) < 1e-4)) {
        s2x = avg.x;
        s2y = avg.y;
      }
    }
    return { x1: s1x, y1: s1y, x2: s2x, y2: s2y };
  });

  const segments = [
    ...wallSegments,
    ...bounds
  ];

  const angles = new Set<number>();
  
  const addAngle = (a: number) => {
    let normalized = a % (Math.PI * 2);
    if (normalized < 0) {
      normalized += Math.PI * 2;
    }
    angles.add(normalized);
  };

  segments.forEach(seg => {
    const a1 = Math.atan2(seg.y1 - lightY, seg.x1 - lightX);
    const a2 = Math.atan2(seg.y2 - lightY, seg.x2 - lightX);
    [a1, a2].forEach(a => {
      addAngle(a);
      addAngle(a - 0.0001);
      addAngle(a + 0.0001);
    });
  });

  // 120 regular intervals for an exceptionally smooth round light glow
  for (let i = 0; i < 120; i++) {
    addAngle((i / 120) * Math.PI * 2);
  }

  const getIntersection = (
    rayX: number, rayY: number,
    dx: number, dy: number,
    seg: { x1: number, y1: number, x2: number, y2: number }
  ) => {
    const r_px = rayX;
    const r_py = rayY;
    const r_dx = dx;
    const r_dy = dy;

    const s_px = seg.x1;
    const s_py = seg.y1;
    const s_dx = seg.x2 - seg.x1;
    const s_dy = seg.y2 - seg.y1;

    const denom = (r_dx * s_dy - r_dy * s_dx);
    if (Math.abs(denom) < 1e-9) return null;

    const t2 = (r_dy * (s_px - r_px) - r_dx * (s_py - r_py)) / denom;
    
    let t1;
    if (Math.abs(r_dx) > 1e-9) {
      t1 = (s_px + s_dx * t2 - r_px) / r_dx;
    } else {
      t1 = (s_py + s_dy * t2 - r_py) / r_dy;
    }

    if (t1 < -1e-7) return null;
    if (t2 < -1e-7 || t2 > 1 + 1e-7) return null;

    return {
      x: r_px + r_dx * t1,
      y: r_py + r_dy * t1,
      param: t1
    };
  };

  const points: { x: number; y: number; angle: number }[] = [];

  angles.forEach(angle => {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let closestIntersection: { x: number; y: number; param: number } | null = null;

    segments.forEach(seg => {
      const intersect = getIntersection(lightX, lightY, dx, dy, seg);
      if (intersect) {
        if (!closestIntersection || intersect.param < closestIntersection.param) {
          closestIntersection = intersect;
        }
      }
    });

    if (closestIntersection) {
      points.push({
        x: (closestIntersection as any).x,
        y: (closestIntersection as any).y,
        angle: angle
      });
    }
  });

  points.sort((a, b) => a.angle - b.angle);
  return points;
}

// Light Spot overlay renderer
interface LightSpotProps {
  light: Light;
  onClick: (light: Light) => void;
  onDragStart?: (e: any, light: Light) => void;
  walls?: Wall[];
  hideHelpers?: boolean;
}

function LightSpot({ light, onClick, onDragStart, walls = [], hideHelpers = false }: LightSpotProps) {
  const preset = LIGHT_PRESETS[light.type] || LIGHT_PRESETS.torch;
  const radius = light.radius || 12;
  const intensity = light.intensity ?? 0.8;
  const falloff = light.falloff ?? 40;
  const coreOpacity = (light.core_opacity !== undefined ? light.core_opacity : 100) / 100;
  const { r, g, b } = sz(light.color || preset.defaultColor);
  const { r: cr, g: cg, b: cb } = sz(preset.coreColor || "#ffffff");

  const ratio = falloff / 100;
  // Natural multi-stop inverse-square optical curve
  const coreEdge = Math.max(3, 15 - ratio * 9);
  const innerEdge = coreEdge + (40 - coreEdge) * ratio + 8;
  const midEdge = innerEdge + 20 + ratio * 14;
  const outerEdge = Math.min(94, midEdge + 16 + ratio * 12);

  // Dynamic incandescent center point: interpolates towards base light color when coreOpacity approaches 0
  const centerR = Math.round(r + (cr - r) * coreOpacity);
  const centerG = Math.round(g + (cg - g) * coreOpacity);
  const centerB = Math.round(b + (cb - b) * coreOpacity);
  const centerAlpha = 0.85 + 0.15 * coreOpacity;

  // High-fidelity physical multi-stop radial gradient with configurable incandescent core
  const primaryGlow = `radial-gradient(circle,
    rgba(${centerR}, ${centerG}, ${centerB}, ${centerAlpha}) 0%,
    rgba(${r}, ${g}, ${b}, ${0.85 + 0.1 * coreOpacity}) ${coreEdge * 0.7 * Math.max(0.1, coreOpacity)}%,
    rgba(${r}, ${g}, ${b}, 0.78) ${coreEdge}%,
    rgba(${r}, ${g}, ${b}, 0.44) ${innerEdge}%,
    rgba(${r}, ${g}, ${b}, 0.16) ${midEdge}%,
    rgba(${r}, ${g}, ${b}, 0.04) ${outerEdge}%,
    rgba(${r}, ${g}, ${b}, 0) 100%)`;

  // Soft atmospheric ambient bloom corona
  const ambientBloom = `radial-gradient(circle,
    rgba(${r}, ${g}, ${b}, 0.32) 0%,
    rgba(${r}, ${g}, ${b}, 0.18) 40%,
    rgba(${r}, ${g}, ${b}, 0.04) 75%,
    rgba(${r}, ${g}, ${b}, 0) 100%)`;

  const blurAmt = 1.2 + ratio * 5;

  const polyPoints = calculateVisibilityPolygon(light.x, light.y, radius, walls);
  const clipPathStyle = polyPoints.length > 0 
    ? `polygon(${polyPoints.map(p => `${p.x}% ${p.y}%`).join(", ")})`
    : undefined;

  const handlePointerDown = (e: any) => {
    if (onDragStart) {
      onDragStart(e, light);
    }
  };

  return (
    <Fragment>
      {/* Clipped Light Overlay - full screen mapping with physical radiance */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: clipPathStyle,
          WebkitClipPath: clipPathStyle,
          zIndex: 5,
        }}
      >
        {/* Secondary Soft Atmospheric Bloom Corona */}
        <div
          className={`absolute ${preset.glowClass}`}
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${radius * 2.6}vw`,
            height: `${radius * 2.6}vw`,
            maxWidth: `${radius * 2.6}vh`,
            maxHeight: `${radius * 2.6}vh`,
            transform: "translate(-50%, -50%)",
            background: ambientBloom,
            opacity: intensity * 0.45,
            mixBlendMode: "screen",
            filter: `blur(${blurAmt * 2.2}px)`,
            willChange: "transform, opacity",
          }}
        />

        {/* Primary Incandescent Core Light Radiant Disc */}
        <div
          className={`absolute ${preset.glowClass}`}
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${radius * 2}vw`,
            height: `${radius * 2}vw`,
            maxWidth: `${radius * 2}vh`,
            maxHeight: `${radius * 2}vh`,
            transform: "translate(-50%, -50%)",
            background: primaryGlow,
            opacity: intensity,
            mixBlendMode: "screen",
            filter: `blur(${blurAmt}px)`,
            willChange: "transform, opacity",
          }}
        />
      </div>

      {/* Interactive Hit Target (Sin círculos visibles que marquen las luces) */}
      <div
        className="absolute cursor-pointer pointer-events-auto"
        style={{
          left: `${light.x}%`,
          top: `${light.y}%`,
          transform: "translate(-50%, -50%)",
          width: "28px",
          height: "28px",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(light);
        }}
        onPointerDown={handlePointerDown}
      />
    </Fragment>
  );
}

// Marker component renderer
interface MarkerNodeProps {
  marker: Marker;
  onClick: (marker: Marker) => void;
  hasLinkedMap: boolean;
  isDragging: boolean;
  onDragStart?: (e: any, marker: Marker) => void;
  isNoUi?: boolean;
}

function MarkerNode({ marker, onClick, hasLinkedMap, isDragging, onDragStart, isNoUi }: MarkerNodeProps) {
  const cfg = MARKER_CATEGORIES[marker.category] || MARKER_CATEGORIES.general;
  const linkColor = "#7ECFFF";
  const activeColor = hasLinkedMap ? linkColor : (marker.area_color || cfg.color);
  const radiusPercent = marker.area_radius || 0;
  const areaColor = marker.area_color || activeColor;
  const areaOpacity = marker.area_opacity ?? 0.2;

  const handlePointerDown = (e: any) => {
    if (onDragStart && !isNoUi) {
      e.stopPropagation();
      onDragStart(e, marker);
    }
  };

  return (
    <Fragment>
      {radiusPercent > 0 && marker.area_type !== "painted" && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${radiusPercent * 2}%`,
            aspectRatio: "1/1",
            left: `${marker.x}%`,
            top: `${marker.y}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: `${areaColor}${Math.round(areaOpacity * 255).toString(16).padStart(2, "0")}`,
            border: `1.5px solid ${areaColor}80`,
            boxShadow: `inset 0 0 40px ${areaColor}20, 0 0 30px ${areaColor}30`,
            zIndex: 5,
          }}
        />
      )}

      <div
        className="absolute"
        style={{
          left: `${marker.x}%`,
          top: `${marker.y}%`,
          transform: "translate(-50%, -100%)",
          zIndex: 10,
          pointerEvents: "auto",
        }}
      >
        <button
          className={`relative group ${isNoUi ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick(marker);
          }}
          onPointerDown={isNoUi ? undefined : handlePointerDown}
          aria-label={`${marker.name} - ${marker.category}`}
        >
          <motion.div
            whileHover={isDragging ? {} : { scale: 1.2, y: -2 }}
            className="relative flex flex-col items-center"
          >
            {hasLinkedMap && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "44px",
                  height: "44px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -60%)",
                  border: `1.5px solid ${linkColor}80`,
                  boxShadow: `0 0 18px ${linkColor}50`,
                }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.3, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <div
              className="w-7 h-7 rounded-full border-2 border-void flex items-center justify-center text-xs shadow-lg"
              style={{
                backgroundColor: activeColor,
                boxShadow: hasLinkedMap
                  ? `0 0 16px ${linkColor}80, 0 2px 8px rgba(0,0,0,0.6)`
                  : `0 0 12px ${cfg.color}60, 0 2px 8px rgba(0,0,0,0.6)`,
              }}
            >
              <span className="text-void text-[10px] leading-none font-bold">
                {hasLinkedMap ? "↗" : cfg.icon}
              </span>
            </div>

            <div
              className="w-0.5 h-2"
              style={{
                background: `linear-gradient(to bottom, ${activeColor}, transparent)`,
              }}
            />

            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
              <div
                className="px-2.5 py-1 rounded-lg bg-void/95 backdrop-blur-sm border text-vellum text-[11px] font-body shadow-xl flex items-center gap-1.5"
                style={{ borderColor: hasLinkedMap ? `${linkColor}50` : `${cfg.color}40` }}
              >
                {hasLinkedMap && <span className="text-[9px] text-sky-300">↗ mapa</span>}
                {marker.name}
              </div>
            </div>
          </motion.div>
        </button>
      </div>
    </Fragment>
  );
}

// Main map container workspace
interface MapContainerProps {
  map: Map | null;
  markers: Marker[];
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (val: number | ((prev: number) => number)) => void;
  onPanChange: (val: { x: number; y: number }) => void;
  onMapClick: (x: number, y: number, screenX: number, screenY: number) => void;
  onMarkerClick: (marker: Marker) => void;
  pendingMarkerPos: { x: number; y: number } | null;
  showMarkers: boolean;
  parentMapId: string | null;
  onZoomInToMap: ((linkedMapId: string) => void) | null;
  onZoomOutToParent: (() => void) | null;
  onMarkerMoved: (markerId: string, x: number, y: number, isFinal: boolean) => void;
  onImageLoaded: () => void;
  lights: Light[];
  showLights: boolean;
  onLightClick: (light: Light) => void;
  onLightMoved: (lightId: string, x: number, y: number, isFinal: boolean) => void;
  pickingColor: boolean;
  onColorPicked: (colorHex: string) => void;
  pickingWallColor?: boolean;
  onWallColorPicked?: (colorHex: string) => void;
  pickingSmartObstacle?: boolean;
  smartObstacleTolerance?: number;
  onSmartObstacleCreated?: (newWalls: Wall[]) => void;
  pickingMagicWindZone?: boolean;
  magicWindTolerance?: number;
  onAddWindZone?: (newZone: WindZone) => void;
  onDeleteWindZone?: (zoneId: string) => void;
  showWindMaskPreview?: boolean;
  isPaintingWindMask?: boolean;
  onTogglePaintingWindMask?: () => void;
  windBrushMode?: "paint" | "erase";
  windBrushSize?: number;
  onSaveWindMask?: (maskData: string | null) => void;
  walls?: Wall[];
  drawingWalls?: boolean;
  onAddWall?: (x1: number, y1: number, x2: number, y2: number) => void;
  onDeleteWall?: (wallId: string) => void;
  hideHelpers?: boolean;
  generatedFrames?: string[];
  isPlaying?: boolean;
  currentFrameIndex?: number;
  isPaintingZone?: boolean;
  paintMode?: "freehand" | "polygon" | "magic_wand";
  onPaintModeChange?: (mode: "freehand" | "polygon" | "magic_wand") => void;
  paintTolerance?: number;
  onPaintToleranceChange?: (tolerance: number) => void;
  zonePaintPoints?: Array<{ x: number; y: number }>;
  zonePaintColor?: string;
  zonePaintOpacity?: number;
  onZonePointsChange?: (points: Array<{ x: number; y: number }>) => void;
  onFinishZonePainting?: () => void;
  onCancelZonePainting?: () => void;
  focusTargetMarker?: Marker | null;
  onFocusMarkerDone?: () => void;
  isNoUi?: boolean;
}

export default function MapContainer({
  map,
  markers,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onMapClick,
  onMarkerClick,
  pendingMarkerPos,
  showMarkers,
  parentMapId,
  onZoomInToMap,
  onZoomOutToParent,
  onMarkerMoved,
  onImageLoaded,
  lights,
  showLights,
  onLightClick,
  onLightMoved,
  pickingColor,
  onColorPicked,
  pickingWallColor = false,
  onWallColorPicked,
  pickingSmartObstacle = false,
  smartObstacleTolerance = 15,
  onSmartObstacleCreated,
  pickingMagicWindZone = false,
  magicWindTolerance = 25,
  onAddWindZone,
  onDeleteWindZone,
  showWindMaskPreview = false,
  isPaintingWindMask = false,
  onTogglePaintingWindMask,
  windBrushMode = "paint",
  windBrushSize = 35,
  onSaveWindMask,
  walls = [],
  drawingWalls = false,
  onAddWall,
  onDeleteWall,
  hideHelpers = false,
  generatedFrames = [],
  isPlaying = false,
  currentFrameIndex = 0,
  isPaintingZone = false,
  paintMode: propPaintMode,
  onPaintModeChange,
  paintTolerance: propPaintTolerance,
  onPaintToleranceChange,
  zonePaintPoints = [],
  zonePaintColor = "#E67E22",
  zonePaintOpacity = 0.25,
  onZonePointsChange,
  onFinishZonePainting,
  onCancelZonePainting,
  focusTargetMarker,
  onFocusMarkerDone,
  isNoUi = false,
}: MapContainerProps) {
  const isAnimationPlaying = isPlaying && generatedFrames && generatedFrames.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cachedImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingMap = useRef(false);
  const isDraggingMarkerOrLight = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomAccumulator = useRef(0);
  const zoomResetTimeout = useRef<NodeJS.Timeout | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [showZoomOutHint, setShowZoomOutHint] = useState(false);
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);

  const [activeWallStart, setActiveWallStart] = useState<{ x: number; y: number } | null>(null);
  const [mousePosPercent, setMousePosPercent] = useState<{ x: number; y: number } | null>(null);

  const [hoverWindPreview, setHoverWindPreview] = useState<{
    points: Point[];
    color: string;
    pixelCount: number;
    pctX: number;
    pctY: number;
  } | null>(null);
  const lastHoverTime = useRef(0);

  // Painted Zone Drawing State
  const [internalPaintMode, setInternalPaintMode] = useState<"freehand" | "polygon" | "magic_wand">("freehand");
  const [internalPaintTolerance, setInternalPaintTolerance] = useState(25);
  
  const effectivePaintMode = propPaintMode ?? internalPaintMode;
  const effectivePaintTolerance = propPaintTolerance ?? internalPaintTolerance;

  const setPaintMode = (mode: "freehand" | "polygon" | "magic_wand") => {
    setInternalPaintMode(mode);
    onPaintModeChange?.(mode);
  };

  const setPaintTolerance = (tol: number) => {
    setInternalPaintTolerance(tol);
    onPaintToleranceChange?.(tol);
  };

  const [hoverZonePreview, setHoverZonePreview] = useState<{
    points: Point[];
    color: string;
    pixelCount: number;
    pctX: number;
    pctY: number;
  } | null>(null);

  const isPaintingStroke = useRef(false);
  const lastPaintPoint = useRef<{ x: number; y: number } | null>(null);
  const zonePaintPointsRef = useRef<Array<{ x: number; y: number }>>(zonePaintPoints);
  zonePaintPointsRef.current = zonePaintPoints;

  useEffect(() => {
    if (!pickingMagicWindZone) {
      setHoverWindPreview(null);
    }
    if (!isPaintingZone || effectivePaintMode !== "magic_wand") {
      setHoverZonePreview(null);
    }
  }, [pickingMagicWindZone, isPaintingZone, effectivePaintMode]);

  // Wind Mask Freehand Painting State & Handlers
  const windMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingWindStroke = useRef(false);
  const lastWindPaintPos = useRef<{ x: number; y: number } | null>(null);
  const [windMaskDataUrl, setWindMaskDataUrl] = useState<string | null>(map?.wind_mask_image || null);
  const [windCursorPct, setWindCursorPct] = useState<{ x: number; y: number } | null>(null);

  // Sync mask canvas with map.wind_mask_image
  useEffect(() => {
    setWindMaskDataUrl(map?.wind_mask_image || null);
    if (!imageRef.current) return;
    const w = imageRef.current.naturalWidth || imageSize.w || 1200;
    const h = imageRef.current.naturalHeight || imageSize.h || 800;

    let canvas = windMaskCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      windMaskCanvasRef.current = canvas;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!map?.wind_mask_image) {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = map.wind_mask_image;
  }, [map?.wind_mask_image, imageLoaded, imageSize.w, imageSize.h]);

  const handleWindCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    isPaintingWindStroke.current = true;
    const canvas = windMaskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    lastWindPaintPos.current = { x, y };

    const scaleFactor = canvas.width / rect.width;
    const brushRadius = (windBrushSize / 2) * scaleFactor;

    ctx.save();
    if (windBrushMode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(16, 185, 129, 1.0)";
    }
    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    setWindMaskDataUrl(canvas.toDataURL("image/png"));
  };

  const handleWindCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setWindCursorPct({ x: xPct, y: yPct });

    if (!isPaintingWindStroke.current || !lastWindPaintPos.current) return;
    e.stopPropagation();

    const canvas = windMaskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const scaleFactor = canvas.width / rect.width;
    const brushRadius = (windBrushSize / 2) * scaleFactor;

    ctx.save();
    if (windBrushMode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
      ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(16, 185, 129, 1.0)";
      ctx.fillStyle = "rgba(16, 185, 129, 1.0)";
    }
    ctx.lineWidth = brushRadius * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastWindPaintPos.current.x, lastWindPaintPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    lastWindPaintPos.current = { x, y };
  };

  const handleWindCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPaintingWindStroke.current) return;
    e.stopPropagation();
    isPaintingWindStroke.current = false;
    lastWindPaintPos.current = null;
    if (windMaskCanvasRef.current) {
      const dataUrl = windMaskCanvasRef.current.toDataURL("image/png");
      setWindMaskDataUrl(dataUrl);
      onSaveWindMask?.(dataUrl);
    }
  };

  useEffect(() => {
    // Invalidate cached image canvas when map image changes
    cachedImageCanvasRef.current = null;
  }, [map?.cover_image]);

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const isWandMode = pickingMagicWindZone || (isPaintingZone && effectivePaintMode === "magic_wand");
    if (!isWandMode) {
      if (hoverWindPreview) setHoverWindPreview(null);
      if (hoverZonePreview) setHoverZonePreview(null);
      return;
    }
    const targetImg = imageRef.current;
    if (!targetImg) return;

    const now = Date.now();
    if (now - lastHoverTime.current < 40) return;
    lastHoverTime.current = now;

    const bounds = targetImg.getBoundingClientRect();
    const xPercent = ((e.clientX - bounds.left) / bounds.width) * 100;
    const yPercent = ((e.clientY - bounds.top) / bounds.height) * 100;

    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) {
      setHoverWindPreview(null);
      setHoverZonePreview(null);
      return;
    }

    try {
      if (!cachedImageCanvasRef.current && targetImg.naturalWidth > 0) {
        const c = document.createElement("canvas");
        c.width = targetImg.naturalWidth;
        c.height = targetImg.naturalHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(targetImg, 0, 0);
          cachedImageCanvasRef.current = c;
        }
      }

      const canvas = cachedImageCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pxX = Math.floor((xPercent / 100) * canvas.width);
      const pxY = Math.floor((yPercent / 100) * canvas.height);

      const tolerance = isPaintingZone ? effectivePaintTolerance : magicWindTolerance;

      const result = traceMagicWindZone(
        ctx,
        canvas.width,
        canvas.height,
        pxX,
        pxY,
        tolerance
      );

      if (result && result.points.length >= 3) {
        const pointsPct = result.points.map((p) => ({
          x: Number(((p.x / canvas.width) * 100).toFixed(2)),
          y: Number(((p.y / canvas.height) * 100).toFixed(2)),
        }));

        if (pickingMagicWindZone) {
          setHoverWindPreview({
            points: pointsPct,
            color: result.color,
            pixelCount: result.pixelCount,
            pctX: Number(xPercent.toFixed(2)),
            pctY: Number(yPercent.toFixed(2)),
          });
        } else if (isPaintingZone && effectivePaintMode === "magic_wand") {
          setHoverZonePreview({
            points: pointsPct,
            color: result.color,
            pixelCount: result.pixelCount,
            pctX: Number(xPercent.toFixed(2)),
            pctY: Number(yPercent.toFixed(2)),
          });
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!drawingWalls) {
      setActiveWallStart(null);
    }
  }, [drawingWalls]);

  const [maskUrl, setMaskUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !map) {
      setMaskUrl(null);
      return;
    }

    const wallColor = map.wall_color;
    const extraWallColors = map.wall_colors_v2 || [];
    if (!wallColor && extraWallColors.length === 0) {
      setMaskUrl(null);
      return;
    }

    const img = imageRef.current;
    try {
      const canvas = document.createElement("canvas");
      const maxDim = 400;
      let w = img.naturalWidth || img.width || 400;
      let h = img.naturalHeight || img.height || 300;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const targetRgb = wallColor ? hexToRgb(wallColor) : null;
      const tolerance = map.wall_color_tolerance ?? 25;

      const extraRgbs = extraWallColors.map(wc => ({
        rgb: hexToRgb(wc.color),
        tolerance: wc.tolerance ?? 25,
      })).filter(x => x.rgb !== null);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let matched = false;
        if (targetRgb && colorsAreSimilar(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b, tolerance)) {
          matched = true;
        } else {
          for (const ext of extraRgbs) {
            if (ext.rgb && colorsAreSimilar(r, g, b, ext.rgb.r, ext.rgb.g, ext.rgb.b, ext.tolerance)) {
              matched = true;
              break;
            }
          }
        }

        if (matched) {
          data[i + 3] = 0;
        } else {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setMaskUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Failed to generate wall mask:", err);
      setMaskUrl(null);
    }
  }, [imageLoaded, map?.id, map?.wall_color, map?.wall_color_tolerance, map?.wall_colors_v2]);

  const maskStyle = maskUrl
    ? {
        maskImage: `url(${maskUrl})`,
        WebkitMaskImage: `url(${maskUrl})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }
    : {};

  // Smooth springs for translation and scale
  const springScale = useSpring(zoom, { stiffness: 280, damping: 22, mass: 0.6 });
  const springPanX = useSpring(pan.x, { stiffness: 260, damping: 24, mass: 0.5 });
  const springPanY = useSpring(pan.y, { stiffness: 260, damping: 24, mass: 0.5 });

  useEffect(() => {
    springScale.set(zoom);
  }, [zoom]);

  useEffect(() => {
    springPanX.set(pan.x);
    springPanY.set(pan.y);
  }, [pan.x, pan.y]);

  useEffect(() => {
    const handleResize = () => setContainerSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onImageLoadedRef = useRef(onImageLoaded);
  useEffect(() => {
    onImageLoadedRef.current = onImageLoaded;
  }, [onImageLoaded]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    if (imageRef.current) {
      setImageSize({ w: imageRef.current.offsetWidth, h: imageRef.current.offsetHeight });
    }
    onImageLoadedRef.current?.();
  }, []);

  useEffect(() => {
    if (!map?.cover_image) {
      setImageLoaded(true);
      onImageLoadedRef.current?.();
    } else {
      setImageLoaded(false);
    }
  }, [map?.id, map?.cover_image]);

  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      setImageSize({ w: imageRef.current.offsetWidth, h: imageRef.current.offsetHeight });
    }
  }, [containerSize.w, containerSize.h, imageLoaded]);

  // Keep references updated for scroll wheel callback
  const scaleRef = useRef(zoom);
  const panRef = useRef(pan);
  const imgSizeRef = useRef(imageSize);
  const containerSizeRef = useRef(containerSize);

  useEffect(() => { scaleRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan.x, pan.y]);
  useEffect(() => { imgSizeRef.current = imageSize; }, [imageSize.w, imageSize.h]);
  useEffect(() => { containerSizeRef.current = containerSize; }, [containerSize.w, containerSize.h]);

  // Fit any polygon, painted points, or region bounding box seamlessly into the viewport
  const fitPointsToBounds = useCallback(
    (points: Array<{ x: number; y: number }>) => {
      if (!points || points.length === 0) return;
      const { w: imgW, h: imgH } = imgSizeRef.current;
      const { w: winW, h: winH } = containerSizeRef.current;
      if (!imgW || !imgH || !winW || !winH) return;

      const bbox = getPolygonBoundingBox(points);

      // Real pixel size of polygon on base (1x) map
      const polyPxW = (bbox.width / 100) * imgW;
      const polyPxH = (bbox.height / 100) * imgH;

      // We want the framed polygon/zone to occupy ~65% to 75% of the visible container viewport
      const targetScaleX = (winW * 0.68) / Math.max(15, polyPxW);
      const targetScaleY = (winH * 0.68) / Math.max(15, polyPxH);
      const idealScale = Math.min(targetScaleX, targetScaleY);

      const minZoom = hz(imgW, imgH, winW, winH);
      const finalScale = Math.max(minZoom, Math.min(4.8, idealScale));

      // Compute pan so that (centerX, centerY) is centered in the window
      const targetPanX = -(bbox.centerX / 100 - 0.5) * imgW * finalScale;
      const targetPanY = -(bbox.centerY / 100 - 0.5) * imgH * finalScale;

      const boundedPan = Xb(targetPanX, targetPanY, finalScale, imgW, imgH, winW, winH);

      onZoomChange(finalScale);
      onPanChange(boundedPan);
    },
    [onZoomChange, onPanChange]
  );

  const fitMarkerToBounds = useCallback(
    (m: Marker) => {
      if (m.area_points && m.area_points.length >= 3) {
        fitPointsToBounds(m.area_points);
        return;
      }
      if (m.area_radius && m.area_radius > 0) {
        const rad = m.area_radius;
        fitPointsToBounds([
          { x: Math.max(0, m.x - rad), y: Math.max(0, m.y - rad) },
          { x: Math.min(100, m.x + rad), y: Math.max(0, m.y - rad) },
          { x: Math.min(100, m.x + rad), y: Math.min(100, m.y + rad) },
          { x: Math.max(0, m.x - rad), y: Math.min(100, m.y + rad) },
        ]);
        return;
      }
      // Point marker: center and zoom comfortably
      const { w: imgW, h: imgH } = imgSizeRef.current;
      const { w: winW, h: winH } = containerSizeRef.current;
      if (!imgW || !imgH || !winW || !winH) return;
      const targetScale = Math.max(2.2, scaleRef.current);
      const targetPanX = -(m.x / 100 - 0.5) * imgW * targetScale;
      const targetPanY = -(m.y / 100 - 0.5) * imgH * targetScale;
      const boundedPan = Xb(targetPanX, targetPanY, targetScale, imgW, imgH, winW, winH);
      onZoomChange(targetScale);
      onPanChange(boundedPan);
    },
    [fitPointsToBounds, onZoomChange, onPanChange]
  );

  useEffect(() => {
    if (focusTargetMarker) {
      fitMarkerToBounds(focusTargetMarker);
      onFocusMarkerDone?.();
    }
  }, [focusTargetMarker, fitMarkerToBounds, onFocusMarkerDone]);

  // Handle nested maps automatic focus
  const checkZoomInTransition = useCallback(
    (xPercent: number, yPercent: number, bounds: DOMRect) => {
      if (!onZoomInToMap) return false;
      const heightRatio = bounds.height / bounds.width;

      for (const m of markers) {
        if (!m.linked_map_id) continue;

        // Check if inside polygon / painted zone area
        if (m.area_points && m.area_points.length >= 3) {
          if (isPointInPolygon({ x: xPercent, y: yPercent }, m.area_points)) {
            onZoomInToMap(m.linked_map_id);
            return true;
          }
        }

        const radius = m.area_radius || 6;
        const diffX = xPercent - m.x;
        const diffY = yPercent - m.y;
        // Adjust for height ratio if necessary
        if (Math.sqrt(diffX * diffX + (diffY / heightRatio) * (diffY / heightRatio)) <= radius) {
          onZoomInToMap(m.linked_map_id);
          return true;
        }
      }
      return false;
    },
    [markers, onZoomInToMap]
  );

  // Wheel zoom with dynamic focus anchoring and zoom out map escaping
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const currentScale = scaleRef.current;
      const currentPan = panRef.current;
      const { w: imgW, h: imgH } = imgSizeRef.current;
      const { w: winW, h: winH } = containerSizeRef.current;

      const minZoom = hz(imgW, imgH, winW, winH);
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const nextZoom = currentScale * zoomFactor;

      if (nextZoom < minZoom) {
        if (parentMapId && onZoomOutToParent) {
          zoomAccumulator.current += Math.abs(e.deltaY);
          if (!zoomResetTimeout.current) {
            setShowZoomOutHint(true);
            zoomResetTimeout.current = setTimeout(() => {
              setShowZoomOutHint(false);
              zoomResetTimeout.current = null;
              zoomAccumulator.current = 0;
            }, 2000);
          }
          if (zoomAccumulator.current > 180) {
            zoomAccumulator.current = 0;
            if (zoomResetTimeout.current) {
              clearTimeout(zoomResetTimeout.current);
              zoomResetTimeout.current = null;
            }
            setShowZoomOutHint(false);
            onZoomOutToParent();
          }
        }
        // Clamping zoom and updating pan ensures zooming out smoothly to minZoom without getting stuck
        onZoomChange(minZoom);
        const boundedPan = Xb(currentPan.x, currentPan.y, minZoom, imgW, imgH, winW, winH);
        onPanChange(boundedPan);
        return;
      }

      if (nextZoom > currentScale) {
        zoomAccumulator.current = 0;
      }

      const finalScale = Math.min(5, nextZoom);
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const scaleRatioX = (mouseX - winW / 2 - currentPan.x) / currentScale;
      const scaleRatioY = (mouseY - winH / 2 - currentPan.y) / currentScale;

      const targetPanX = mouseX - winW / 2 - scaleRatioX * finalScale;
      const targetPanY = mouseY - winH / 2 - scaleRatioY * finalScale;

      const boundedPan = Xb(targetPanX, targetPanY, finalScale, imgW, imgH, winW, winH);

      // Check if auto zoom-in to linked map trigger (only when scaling high >= 3.2 to avoid blocking normal zoom-in)
      if (finalScale > currentScale && finalScale >= 3.2 && imageRef.current) {
        const bounds = imageRef.current.getBoundingClientRect();
        const relativeX = ((mouseX - bounds.left) / bounds.width) * 100;
        const relativeY = ((mouseY - bounds.top) / bounds.height) * 100;
        if (checkZoomInTransition(relativeX, relativeY, bounds)) return;
      }

      onZoomChange(finalScale);
      onPanChange(boundedPan);
    },
    [parentMapId, onZoomOutToParent, onZoomChange, onPanChange, checkZoomInTransition]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  // Marker dragging
  const handleMarkerDragStart = useCallback(
    (e: any, m: Marker) => {
      if (isNoUi) return;
      e.stopPropagation();
      isDraggingMarkerOrLight.current = true;
      setActiveDraggingId(m.id);

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const onDrag = (moveEvt: any) => {
        const targetImg = imageRef.current;
        if (!targetImg) return;
        const currentClientX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const currentClientY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

        const bounds = targetImg.getBoundingClientRect();
        const percentX = Math.max(0, Math.min(100, ((currentClientX - bounds.left) / bounds.width) * 100));
        const percentY = Math.max(0, Math.min(100, ((currentClientY - bounds.top) / bounds.height) * 100));
        onMarkerMoved?.(m.id, percentX, percentY, false);
      };

      const onDragEnd = (endEvt: any) => {
        const targetImg = imageRef.current;
        if (targetImg) {
          const endClientX =
            "changedTouches" in endEvt
              ? endEvt.changedTouches[0].clientX
              : "touches" in endEvt && endEvt.touches.length > 0
              ? endEvt.touches[0].clientX
              : (endEvt as any).clientX;
          const endClientY =
            "changedTouches" in endEvt
              ? endEvt.changedTouches[0].clientY
              : "touches" in endEvt && endEvt.touches.length > 0
              ? endEvt.touches[0].clientY
              : (endEvt as any).clientY;

          if (endClientX !== undefined && endClientY !== undefined) {
            const bounds = targetImg.getBoundingClientRect();
            const percentX = Math.max(0, Math.min(100, ((endClientX - bounds.left) / bounds.width) * 100));
            const percentY = Math.max(0, Math.min(100, ((endClientY - bounds.top) / bounds.height) * 100));
            onMarkerMoved?.(m.id, percentX, percentY, true);
          }
        }
        isDraggingMarkerOrLight.current = false;
        setActiveDraggingId(null);
        document.removeEventListener("mousemove", onDrag as any);
        document.removeEventListener("mouseup", onDragEnd as any);
        document.removeEventListener("touchmove", onDrag as any);
        document.removeEventListener("touchend", onDragEnd as any);
      };

      document.addEventListener("mousemove", onDrag as any);
      document.addEventListener("mouseup", onDragEnd as any);
      document.addEventListener("touchmove", onDrag as any, { passive: false });
      document.addEventListener("touchend", onDragEnd as any, { passive: false });
    },
    [onMarkerMoved]
  );

  // Light dragging
  const handleLightDragStart = useCallback(
    (e: any, l: Light) => {
      if (isNoUi) return;
      e.stopPropagation();
      isDraggingMarkerOrLight.current = true;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const onDrag = (moveEvt: any) => {
        const targetImg = imageRef.current;
        if (!targetImg) return;
        const currentClientX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const currentClientY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

        const bounds = targetImg.getBoundingClientRect();
        const percentX = Math.max(0, Math.min(100, ((currentClientX - bounds.left) / bounds.width) * 100));
        const percentY = Math.max(0, Math.min(100, ((currentClientY - bounds.top) / bounds.height) * 100));
        onLightMoved?.(l.id, percentX, percentY, false);
      };

      const onDragEnd = (endEvt: any) => {
        const targetImg = imageRef.current;
        if (targetImg) {
          const endClientX =
            "changedTouches" in endEvt
              ? endEvt.changedTouches[0].clientX
              : "touches" in endEvt && endEvt.touches.length > 0
              ? endEvt.touches[0].clientX
              : (endEvt as any).clientX;
          const endClientY =
            "changedTouches" in endEvt
              ? endEvt.changedTouches[0].clientY
              : "touches" in endEvt && endEvt.touches.length > 0
              ? endEvt.touches[0].clientY
              : (endEvt as any).clientY;

          if (endClientX !== undefined && endClientY !== undefined) {
            const bounds = targetImg.getBoundingClientRect();
            const percentX = Math.max(0, Math.min(100, ((endClientX - bounds.left) / bounds.width) * 100));
            const percentY = Math.max(0, Math.min(100, ((endClientY - bounds.top) / bounds.height) * 100));
            onLightMoved?.(l.id, percentX, percentY, true);
          }
        }
        isDraggingMarkerOrLight.current = false;
        document.removeEventListener("mousemove", onDrag as any);
        document.removeEventListener("mouseup", onDragEnd as any);
        document.removeEventListener("touchmove", onDrag as any);
        document.removeEventListener("touchend", onDragEnd as any);
      };

      document.addEventListener("mousemove", onDrag as any);
      document.addEventListener("mouseup", onDragEnd as any);
      document.addEventListener("touchmove", onDrag as any, { passive: false });
      document.addEventListener("touchend", onDragEnd as any, { passive: false });
    },
    [onLightMoved]
  );

  // Multi-touch gestures & touch tap handling for mobile devices
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchData = useRef<{
    initialDist: number;
    initialMidX: number;
    initialMidY: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
  } | null>(null);
  const isPinching = useRef(false);

  // Map panning & painting
  const handleMapPointerDown = (e: any) => {
    if (drawingWalls) {
      if ("button" in e && e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        setActiveWallStart(null);
      }
      return;
    }

    // Touch Handling (Mobile Multi-Touch)
    if ("touches" in e) {
      if (e.touches.length === 2) {
        // Multi-touch pinch-to-zoom & two-finger pan
        isPinching.current = true;
        isPaintingStroke.current = false;
        isDraggingMap.current = false;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        pinchData.current = {
          initialDist: dist,
          initialMidX: midX,
          initialMidY: midY,
          initialZoom: scaleRef.current,
          initialPan: { ...panRef.current },
        };

        const handleTouchMove = (moveEvt: TouchEvent) => {
          if (moveEvt.cancelable) moveEvt.preventDefault();
          if (moveEvt.touches.length !== 2 || !pinchData.current) return;

          const mt1 = moveEvt.touches[0];
          const mt2 = moveEvt.touches[1];
          const curDist = Math.hypot(mt1.clientX - mt2.clientX, mt1.clientY - mt2.clientY);
          const curMidX = (mt1.clientX + mt2.clientX) / 2;
          const curMidY = (mt1.clientY + mt2.clientY) / 2;

          const ratio = curDist / (pinchData.current.initialDist || 1);
          const { w: imgW, h: imgH } = imgSizeRef.current;
          const { w: winW, h: winH } = containerSizeRef.current;
          const minZoom = hz(imgW, imgH, winW, winH);

          const newZoom = Math.max(minZoom, Math.min(5, pinchData.current.initialZoom * ratio));

          // Midpoint based pan
          const diffMidX = curMidX - pinchData.current.initialMidX;
          const diffMidY = curMidY - pinchData.current.initialMidY;

          const scaleRatioX = (pinchData.current.initialMidX - winW / 2 - pinchData.current.initialPan.x) / pinchData.current.initialZoom;
          const scaleRatioY = (pinchData.current.initialMidY - winH / 2 - pinchData.current.initialPan.y) / pinchData.current.initialZoom;

          const targetPanX = curMidX - winW / 2 - scaleRatioX * newZoom + diffMidX * 0.5;
          const targetPanY = curMidY - winH / 2 - scaleRatioY * newZoom + diffMidY * 0.5;

          const boundedPan = Xb(targetPanX, targetPanY, newZoom, imgW, imgH, winW, winH);

          onZoomChange(newZoom);
          onPanChange(boundedPan);
        };

        const handleTouchEnd = (endEvt: TouchEvent) => {
          if (endEvt.touches.length < 2) {
            isPinching.current = false;
            pinchData.current = null;
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
          }
        };

        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("touchend", handleTouchEnd, { passive: false });
        document.addEventListener("touchcancel", handleTouchEnd, { passive: false });
        return;
      }
    }

    if (isPaintingZone) {
      if (("button" in e && e.button !== 0) || isDraggingMarkerOrLight.current) return;
      isDraggingMap.current = false;
      const targetImg = imageRef.current;
      if (!targetImg) return;
      const bounds = targetImg.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const xPct = Number((((clientX - bounds.left) / bounds.width) * 100).toFixed(2));
      const yPct = Number((((clientY - bounds.top) / bounds.height) * 100).toFixed(2));

      // Record touch start for single-touch tap detection
      touchStartPos.current = { x: clientX, y: clientY, time: Date.now() };

      if (xPct >= 0 && xPct <= 100 && yPct >= 0 && yPct <= 100 && effectivePaintMode === "freehand") {
        isPaintingStroke.current = true;
        const currentPoints = [...(zonePaintPointsRef.current || []), { x: xPct, y: yPct }];
        lastPaintPoint.current = { x: xPct, y: yPct };
        zonePaintPointsRef.current = currentPoints;
        onZonePointsChange?.(currentPoints);

        const handlePaintMove = (moveEvt: MouseEvent | TouchEvent) => {
          if (moveEvt.cancelable && "touches" in moveEvt) moveEvt.preventDefault();
          if (!isPaintingStroke.current || isPinching.current) return;
          const curX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
          const curY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
          const curXPct = Number((((curX - bounds.left) / bounds.width) * 100).toFixed(2));
          const curYPct = Number((((curY - bounds.top) / bounds.height) * 100).toFixed(2));
          if (curXPct < 0 || curXPct > 100 || curYPct < 0 || curYPct > 100) return;

          if (lastPaintPoint.current) {
            const dx = curXPct - lastPaintPoint.current.x;
            const dy = curYPct - lastPaintPoint.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.35) return;
          }

          lastPaintPoint.current = { x: curXPct, y: curYPct };
          currentPoints.push({ x: curXPct, y: curYPct });
          zonePaintPointsRef.current = [...currentPoints];
          onZonePointsChange?.([...currentPoints]);
        };

        const handlePaintUp = () => {
          isPaintingStroke.current = false;
          document.removeEventListener("mousemove", handlePaintMove as any);
          document.removeEventListener("mouseup", handlePaintUp as any);
          document.removeEventListener("touchmove", handlePaintMove as any);
          document.removeEventListener("touchend", handlePaintUp as any);
        };

        document.addEventListener("mousemove", handlePaintMove as any);
        document.addEventListener("mouseup", handlePaintUp as any);
        document.addEventListener("touchmove", handlePaintMove as any, { passive: false });
        document.addEventListener("touchend", handlePaintUp as any, { passive: false });
        return;
      }
      return;
    }

    if (("button" in e && e.button !== 0) || isDraggingMarkerOrLight.current) return;

    isDraggingMap.current = false;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    touchStartPos.current = { x: clientX, y: clientY, time: Date.now() };

    dragStartOffset.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    };

    const handlePointerMove = (moveEvt: MouseEvent | TouchEvent) => {
      if (isDraggingMarkerOrLight.current || isPinching.current) return;
      if (moveEvt.cancelable && "touches" in moveEvt) moveEvt.preventDefault();

      const currentX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const currentY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const diffX = currentX - dragStartOffset.current.x;
      const diffY = currentY - dragStartOffset.current.y;

      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        isDraggingMap.current = true;
      }

      if (isDraggingMap.current) {
        const nextPanX = dragStartOffset.current.panX + diffX;
        const nextPanY = dragStartOffset.current.panY + diffY;
        const bounded = Xb(
          nextPanX,
          nextPanY,
          scaleRef.current,
          imgSizeRef.current.w,
          imgSizeRef.current.h,
          containerSizeRef.current.w,
          containerSizeRef.current.h
        );
        onPanChange(bounded);
      }
    };

    const handlePointerUp = (upEvt: MouseEvent | TouchEvent) => {
      document.removeEventListener("mousemove", handlePointerMove as any);
      document.removeEventListener("mouseup", handlePointerUp as any);
      document.removeEventListener("touchmove", handlePointerMove as any);
      document.removeEventListener("touchend", handlePointerUp as any);

      // Check if it was a touch tap on mobile
      if ("changedTouches" in upEvt && upEvt.changedTouches.length > 0 && touchStartPos.current) {
        const touch = upEvt.changedTouches[0];
        const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y);
        const duration = Date.now() - touchStartPos.current.time;

        if (dist < 10 && duration < 500 && !isDraggingMap.current) {
          handleExecuteMapPoint(touch.clientX, touch.clientY);
        }
      }
    };

    document.addEventListener("mousemove", handlePointerMove as any);
    document.addEventListener("mouseup", handlePointerUp as any);
    document.addEventListener("touchmove", handlePointerMove as any, { passive: false });
    document.addEventListener("touchend", handlePointerUp as any, { passive: false });
  };

  // Central point executor used for both mouse clicks and mobile taps
  const handleExecuteMapPoint = (clientX: number, clientY: number, button = 0) => {
    if (isDraggingMap.current || isDraggingMarkerOrLight.current || isPinching.current) return;
    const targetImg = imageRef.current;
    if (!targetImg) return;

    const bounds = targetImg.getBoundingClientRect();
    const xPercent = ((clientX - bounds.left) / bounds.width) * 100;
    const yPercent = ((clientY - bounds.top) / bounds.height) * 100;

    // Bounds safety
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    if (isPaintingZone) {
      if (effectivePaintMode === "polygon") {
        const newPts = [...(zonePaintPointsRef.current || []), { x: Number(xPercent.toFixed(2)), y: Number(yPercent.toFixed(2)) }];
        zonePaintPointsRef.current = newPts;
        onZonePointsChange?.(newPts);
        return;
      }
      if (effectivePaintMode === "magic_wand") {
        if (hoverZonePreview && hoverZonePreview.points.length >= 3) {
          zonePaintPointsRef.current = hoverZonePreview.points;
          onZonePointsChange?.(hoverZonePreview.points);
          return;
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetImg.naturalWidth;
          canvas.height = targetImg.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(targetImg, 0, 0);
            const pxX = Math.floor((xPercent / 100) * canvas.width);
            const pxY = Math.floor((yPercent / 100) * canvas.height);
            const result = traceMagicWindZone(ctx, canvas.width, canvas.height, pxX, pxY, effectivePaintTolerance);
            if (result && result.points.length >= 3) {
              const pointsPct = result.points.map((p) => ({
                x: Number(((p.x / canvas.width) * 100).toFixed(2)),
                y: Number(((p.y / canvas.height) * 100).toFixed(2)),
              }));
              zonePaintPointsRef.current = pointsPct;
              onZonePointsChange?.(pointsPct);
            }
          }
        } catch (err) {
          console.error("Magic wand zone error:", err);
        }
        return;
      }
      return;
    }

    if (pickingMagicWindZone) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetImg.naturalWidth;
        canvas.height = targetImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(targetImg, 0, 0);
          const pxX = Math.floor((xPercent / 100) * canvas.width);
          const pxY = Math.floor((yPercent / 100) * canvas.height);

          const result = traceMagicWindZone(
            ctx,
            canvas.width,
            canvas.height,
            pxX,
            pxY,
            magicWindTolerance
          );

          if (result && result.points.length >= 3 && map) {
            const pointsPct = result.points.map((p) => ({
              x: Number(((p.x / canvas.width) * 100).toFixed(2)),
              y: Number(((p.y / canvas.height) * 100).toFixed(2)),
            }));
            const zoneIndex = (map.wind_zones?.length || 0) + 1;
            const newZone: WindZone = {
              id: "wz-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
              name: `Zona Viento #${zoneIndex}`,
              points: pointsPct,
              color: result.color,
              tolerance: magicWindTolerance,
              enabled: true,
            };
            onAddWindZone?.(newZone);
          }
        }
      } catch (err) {
        console.error("Failed to perform magic wind selection:", err);
      }
      return;
    }

    if (pickingSmartObstacle) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetImg.naturalWidth;
        canvas.height = targetImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(targetImg, 0, 0);
          const pxX = Math.floor((xPercent / 100) * canvas.width);
          const pxY = Math.floor((yPercent / 100) * canvas.height);
          
          const hullPoints = traceSmartObstacle(
            ctx,
            canvas.width,
            canvas.height,
            pxX,
            pxY,
            smartObstacleTolerance
          );

          if (hullPoints.length >= 3 && map) {
            const newWalls: Wall[] = [];
            for (let i = 0; i < hullPoints.length; i++) {
              const p1 = hullPoints[i];
              const p2 = hullPoints[(i + 1) % hullPoints.length];
              
              const pctX1 = (p1.x / canvas.width) * 100;
              const pctY1 = (p1.y / canvas.height) * 100;
              const pctX2 = (p2.x / canvas.width) * 100;
              const pctY2 = (p2.y / canvas.height) * 100;
              
              newWalls.push({
                id: "wall-" + Math.random().toString(36).substring(2, 9),
                map_id: map.id,
                x1: pctX1,
                y1: pctY1,
                x2: pctX2,
                y2: pctY2,
              });
            }
            onSmartObstacleCreated?.(newWalls);
          }
        }
      } catch (err) {
        console.error("Failed to perform smart selection:", err);
      }
      return;
    }

    if (pickingWallColor) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetImg.naturalWidth;
        canvas.height = targetImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(targetImg, 0, 0);
          const pxX = Math.floor((xPercent / 100) * canvas.width);
          const pxY = Math.floor((yPercent / 100) * canvas.height);
          const pixel = ctx.getImageData(pxX, pxY, 1, 1).data;
          const hex =
            "#" +
            [pixel[0], pixel[1], pixel[2]]
              .map(v => v.toString(16).padStart(2, "0"))
              .join("");
          onWallColorPicked?.(hex);
        }
      } catch (err) {
        console.error("Failed to read image pixel (CORS bounds limitation):", err);
      }
      return;
    }

    if (drawingWalls) {
      if (button === 0) { // Left click / tap
        if (activeWallStart) {
          onAddWall?.(activeWallStart.x, activeWallStart.y, xPercent, yPercent);
          setActiveWallStart({ x: xPercent, y: yPercent });
        } else {
          setActiveWallStart({ x: xPercent, y: yPercent });
          setMousePosPercent({ x: xPercent, y: yPercent });
        }
      }
      return;
    }

    if (pickingColor) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetImg.naturalWidth;
        canvas.height = targetImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(targetImg, 0, 0);
          const pxX = Math.floor((xPercent / 100) * canvas.width);
          const pxY = Math.floor((yPercent / 100) * canvas.height);
          const pixel = ctx.getImageData(pxX, pxY, 1, 1).data;
          const hex =
            "#" +
            [pixel[0], pixel[1], pixel[2]]
              .map(v => v.toString(16).padStart(2, "0"))
              .join("");
          onColorPicked?.(hex);
        }
      } catch (err) {
        console.error("Failed to read image pixel (CORS bounds limitation):", err);
      }
      return;
    }

    onMapClick(xPercent, yPercent, clientX, clientY);
  };

  // Click on map container
  const handleMapClick = (e: React.MouseEvent) => {
    handleExecuteMapPoint(e.clientX, e.clientY, e.button);
  };

  const handleContainerPointerMove = (e: any) => {
    if (!drawingWalls || !activeWallStart) return;
    const targetImg = imageRef.current;
    if (!targetImg) return;
    const bounds = targetImg.getBoundingClientRect();
    const xPercent = ((e.clientX - bounds.left) / bounds.width) * 100;
    const yPercent = ((e.clientY - bounds.top) / bounds.height) * 100;
    setMousePosPercent({
      x: Math.max(0, Math.min(100, xPercent)),
      y: Math.max(0, Math.min(100, yPercent))
    });
  };

  const handleContainerContextMenu = (e: any) => {
    if (drawingWalls) {
      e.preventDefault();
      setActiveWallStart(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden cursor-crosshair select-none bg-void"
      onPointerDown={handleMapPointerDown}
      onClick={handleMapClick}
      onPointerMove={handleContainerPointerMove}
      onContextMenu={handleContainerContextMenu}
      style={{ touchAction: "none" }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          x: springPanX,
          y: springPanY,
          scale: springScale,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <div
          className="relative inline-block"
          onMouseMove={handleImageMouseMove}
          onMouseLeave={() => setHoverWindPreview(null)}
        >
          {map?.cover_image ? (
            <img
              ref={imageRef}
              src={isAnimationPlaying ? generatedFrames[currentFrameIndex] : map.cover_image}
              alt={map.name}
              crossOrigin={map.cover_image.startsWith("data:") ? undefined : "anonymous"}
              referrerPolicy="no-referrer"
              className="map-bg block select-none pointer-events-none"
              style={{
                maxHeight: "90vh",
                maxWidth: "90vw",
                objectFit: "contain",
                filter:
                  map?.darkness && map.darkness > 0
                    ? `brightness(${1.0 - map.darkness * 0.68}) grayscale(${map.darkness * ((map.desaturation ?? 40) / 100)}) contrast(${1.0 + map.darkness * 0.12})`
                    : undefined,
                transition: "filter 0.3s ease-out",
              }}
              draggable={false}
              onLoad={handleImageLoad}
            />
          ) : (
            <div
              ref={imageRef as any}
              className="map-bg bg-gradient-to-br from-sepia via-void to-umber flex items-center justify-center border border-umber"
              style={{ width: "1200px", height: "800px" }}
            >
              <p className="font-heading text-sm text-vellum/30 uppercase tracking-[0.2em]">Cargando Lienzo de Mapa...</p>
            </div>
          )}

          {/* Emissive Glows layer */}
          {map?.cover_image &&
            imageLoaded &&
            !isAnimationPlaying &&
            (map.emissive_colors || []).map((ec, idx) => (
              <EmissiveGlow
                key={`emissive-${idx}`}
                imageSrc={map.cover_image}
                color={ec.color}
                similarity={ec.similarity ?? 30}
                speed={map.emissive_speed ?? 50}
                enabled={!!ec.color && imageLoaded}
              />
            ))}

          {/* Water Shimmer layer */}
          {map?.cover_image && imageLoaded && !isAnimationPlaying && (map.water_colors || []).length > 0 && (
            <WaterShimmer
              imageSrc={map.cover_image}
              colors={map.water_colors || []}
              speed={map.water_speed ?? 50}
              enabled={imageLoaded}
              waveColor={map.water_wave_color}
              waveOpacity={map.water_opacity ?? 80}
              waveAngle={map.water_angle ?? 0}
            />
          )}

          {/* Wind Sway layer with Live Mask Visualizer */}
          {map?.cover_image && imageLoaded && !isAnimationPlaying && ((map.wind_colors || []).length > 0 || (map.wind_zones || []).length > 0) && (
            <WindSway
              imageSrc={map.cover_image}
              colors={map.wind_colors || []}
              windZones={map.wind_zones || []}
              speed={map.wind_speed ?? 50}
              strength={map.wind_strength ?? 25}
              angle={map.wind_angle ?? 0}
              gusts={map.wind_gusts ?? 60}
              enabled={imageLoaded && !!map.wind_enabled}
              showMaskPreview={showWindMaskPreview || pickingMagicWindZone}
              darknessFilter={
                map?.darkness && map.darkness > 0
                  ? `brightness(${1.0 - map.darkness * 0.68}) grayscale(${map.darkness * ((map.desaturation ?? 40) / 100)}) contrast(${1.0 + map.darkness * 0.12})`
                  : undefined
              }
            />
          )}

          {/* Live Moving Parts Layer */}
          {map?.cover_image && imageLoaded && !isAnimationPlaying && map.moving_parts && map.moving_parts.length > 0 && (
            <MovingPartsLayer
              imageSrc={map.cover_image}
              movingParts={map.moving_parts}
              width={imageSize.w}
              height={imageSize.h}
            />
          )}

          {/* Foundry VTT Ambient Darkness & Illumination Layer */}
          {map?.cover_image && imageLoaded && (map.darkness ?? 0) > 0 && !isAnimationPlaying && (
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-300"
              style={{
                zIndex: 5,
                backgroundColor: map.darkness_color || "#191726",
                opacity: (map.darkness ?? 0) * 0.78,
                mixBlendMode: "multiply",
                ...maskStyle,
              }}
            />
          )}

          {/* Dynamic Weather particle Canvas engine */}
          {((map?.weather_effect && map.weather_effect !== "none") || (map?.weather_effects_v2 && map.weather_effects_v2.length > 0)) && imageLoaded && (
            <WeatherEffect
              effect={map.weather_effect}
              effects={map.weather_effects_v2}
              width={imageSize.w}
              height={imageSize.h}
              walls={walls}
              mapImageUrl={map.cover_image}
              mapWallColor={map.wall_color}
              mapWallColors={map.wall_colors_v2}
              mapWallTolerance={map.wall_color_tolerance}
              style={{
                zIndex: 7,
                ...maskStyle,
              }}
            />
          )}

          {/* Dynamic Light Overlay */}
          {showLights && lights && lights.length > 0 && !isAnimationPlaying && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 6,
                ...maskStyle,
              }}
            >
              {lights.map(l => (
                <LightSpot
                  key={l.id}
                  light={l}
                  onClick={onLightClick}
                  onDragStart={handleLightDragStart}
                  walls={walls}
                  hideHelpers={hideHelpers}
                />
              ))}
            </div>
          )}

          {/* Moving Parts Interactive / Dynamic Helpers */}
          {!hideHelpers && map && map.moving_parts && map.moving_parts.length > 0 && !isAnimationPlaying && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9 }}>
              {map.moving_parts.map((part) => (
                <div
                  key={part.id}
                  className="absolute rounded-full border-2 border-dashed border-gold/75 bg-gold/5 flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${part.x}%`,
                    top: `${part.y}%`,
                    width: `${part.radius * 2}%`,
                    height: `${part.radius * 2}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 0 10px rgba(208, 232, 238, 0.15)",
                  }}
                >
                  {/* Inner glowing dot and label */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(208,232,238,0.8)] animate-pulse" />
                    <span className="px-1.5 py-0.5 rounded bg-void/90 border border-umber/40 text-[8px] font-mono font-bold text-vellum/90 whitespace-nowrap">
                      {part.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved Painted Zones SVG Overlay */}
          {showMarkers && (
            <>
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 8 }}
              >
                {markers.map((m) => {
                  if (!m.area_points || m.area_points.length < 3) return null;
                  const pointsStr = m.area_points.map((p) => `${p.x}%,${p.y}%`).join(" ");
                  const color = m.area_color || "#E67E22";
                  const opacity = m.area_opacity ?? 0.25;

                  return (
                    <polygon
                      key={`painted-zone-${m.id}`}
                      points={pointsStr}
                      fill={color}
                      fillOpacity={opacity}
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      style={{
                        filter: `drop-shadow(0 0 6px ${color}80)`,
                      }}
                      className="pointer-events-auto cursor-pointer transition-all hover:stroke-[3.5px] hover:fill-opacity-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (m.area_points && m.area_points.length >= 3) {
                          fitPointsToBounds(m.area_points);
                        }
                        onMarkerClick(m);
                      }}
                    />
                  );
                })}
              </svg>

              {/* Centroid Tags HTML Overlay for Crisp Text & Clickability */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9 }}>
                {markers.map((m) => {
                  if (!m.area_points || m.area_points.length < 3) return null;
                  const centroid = getPolygonCentroid(m.area_points);
                  const color = m.area_color || "#E67E22";

                  return (
                    <div
                      key={`painted-zone-tag-${m.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                      style={{ left: `${centroid.x}%`, top: `${centroid.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (m.area_points && m.area_points.length >= 3) {
                          fitPointsToBounds(m.area_points);
                        }
                        onMarkerClick(m);
                      }}
                    >
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-heading tracking-wider border shadow-xl flex items-center gap-1.5 backdrop-blur-md transition-all group-hover:scale-110"
                        style={{
                          backgroundColor: "rgba(22, 15, 10, 0.92)",
                          borderColor: `${color}99`,
                          color: "#FAF0E6",
                          boxShadow: `0 0 14px ${color}60`,
                        }}
                      >
                        <span className="text-xs">🖌️</span>
                        <span className="font-bold truncate max-w-[140px]">{m.name}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Active Painting Zone Live Preview & Tooltip */}
          {isPaintingZone && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 25 }}
            >
              {zonePaintPoints && zonePaintPoints.length > 0 && (
                <g className="pointer-events-none">
                  {zonePaintPoints.length >= 3 ? (
                    <polygon
                      points={zonePaintPoints.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                      fill={zonePaintColor || "#E67E22"}
                      fillOpacity={zonePaintOpacity ?? 0.35}
                      stroke={zonePaintColor || "#E67E22"}
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      style={{
                        filter: `drop-shadow(0 0 10px ${zonePaintColor || "#E67E22"})`,
                      }}
                    />
                  ) : (
                    <polyline
                      points={zonePaintPoints.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                      fill="none"
                      stroke={zonePaintColor || "#E67E22"}
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Draw vertex points */}
                  {zonePaintPoints.map((pt, idx) => (
                    <circle
                      key={`zone-vert-${idx}`}
                      cx={`${pt.x}%`}
                      cy={`${pt.y}%`}
                      r={idx === 0 ? "5.5" : "4"}
                      fill={idx === 0 ? "#10B981" : (zonePaintColor || "#E67E22")}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </g>
              )}

              {/* Magic Wand Live Hover Detection Preview */}
              {effectivePaintMode === "magic_wand" && hoverZonePreview && hoverZonePreview.points.length >= 3 && (
                <g className="pointer-events-none">
                  <polygon
                    points={hoverZonePreview.points.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                    fill={zonePaintColor || "#E67E22"}
                    fillOpacity={0.25}
                    stroke={zonePaintColor || "#E67E22"}
                    strokeWidth="2.5"
                    strokeDasharray="3 2"
                    style={{
                      filter: `drop-shadow(0 0 8px ${zonePaintColor || "#E67E22"})`,
                    }}
                  />
                  <foreignObject
                    x={`${hoverZonePreview.pctX}%`}
                    y={`${Math.max(2, hoverZonePreview.pctY - 4)}%`}
                    width="260"
                    height="45"
                    className="overflow-visible pointer-events-none"
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-void/95 border border-amber-500 text-white shadow-[0_0_15px_rgba(230,126,34,0.6)] -translate-x-1/2 -translate-y-full text-[10px] font-sans">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: hoverZonePreview.color }}
                      />
                      <span className="font-bold text-amber-300">
                        Tolerancia: {effectivePaintTolerance}%
                      </span>
                      <span className="text-vellum/60">• {hoverZonePreview.pixelCount} px</span>
                      <span className="text-amber-400 font-bold ml-0.5">🪄 Clic para aplicar</span>
                    </div>
                  </foreignObject>
                </g>
              )}
            </svg>
          )}

          {/* Wind Zones SVG Visual Overlay */}
          {!hideHelpers && !isAnimationPlaying && map && ((map.wind_zones || []).length > 0 || (pickingMagicWindZone && hoverWindPreview)) && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            >
              {(map.wind_zones || []).map((zone) => {
                if (!zone.points || zone.points.length < 3) return null;
                const pointsStr = zone.points.map((p) => `${p.x}%,${p.y}%`).join(" ");
                const firstPt = zone.points[0];
                return (
                  <g key={zone.id} className="pointer-events-none">
                    <polygon
                      points={pointsStr}
                      fill={
                        zone.enabled !== false
                          ? "rgba(208, 232, 238, 0.12)"
                          : "rgba(100, 100, 100, 0.05)"
                      }
                      stroke={zone.enabled !== false ? "#d0e8ee" : "#666666"}
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      style={{
                        filter:
                          zone.enabled !== false
                            ? "drop-shadow(0 0 4px rgba(208, 232, 238, 0.4))"
                            : undefined,
                      }}
                    />
                    {firstPt && (
                      <foreignObject
                        x={`${firstPt.x}%`}
                        y={`${Math.max(1, firstPt.y - 3)}%`}
                        width="150"
                        height="32"
                        className="overflow-visible pointer-events-none"
                      >
                        <div className="flex items-center gap-1 -translate-x-1/2 -translate-y-1/2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border shadow-md flex items-center gap-1 ${
                              zone.enabled !== false
                                ? "bg-void/90 border-emerald-border/60 text-emerald-text"
                                : "bg-void/90 border-umber/40 text-vellum/40 line-through"
                            }`}
                          >
                            <span className="text-[9px]">🍃</span>
                            <span>{zone.name}</span>
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* Live Interactive Hover Preview for Magic Wand */}
              {pickingMagicWindZone && hoverWindPreview && (
                <g className="pointer-events-none">
                  <polygon
                    points={hoverWindPreview.points.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                    fill="rgba(16, 185, 129, 0.32)"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(16, 185, 129, 0.75))",
                    }}
                  />
                  <foreignObject
                    x={`${hoverWindPreview.pctX}%`}
                    y={`${Math.max(2, hoverWindPreview.pctY - 4)}%`}
                    width="280"
                    height="45"
                    className="overflow-visible pointer-events-none"
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-void/95 border border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.55)] -translate-x-1/2 -translate-y-full text-[10px] font-sans">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: hoverWindPreview.color }}
                      />
                      <span className="font-bold text-emerald-300">
                        Similitud: {magicWindTolerance}%
                      </span>
                      <span className="text-vellum/60">• {hoverWindPreview.pixelCount} px</span>
                      <span className="text-emerald-400 font-bold ml-0.5">🍃 Clic para aplicar</span>
                    </div>
                  </foreignObject>
                </g>
              )}
            </svg>
          )}

          {/* Painted Wind Mask Area Visual Overlay */}
          {(showWindMaskPreview || isPaintingWindMask) && windMaskDataUrl && (
            <img
              src={windMaskDataUrl}
              alt="Wind mask visualizer"
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{
                zIndex: 24,
                opacity: 0.55,
                filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))",
              }}
            />
          )}

          {/* Active Freehand Wind Painting Canvas Layer */}
          {isPaintingWindMask && (
            <div className="absolute inset-0 w-full h-full" style={{ zIndex: 26 }}>
              <canvas
                className="w-full h-full cursor-crosshair touch-none select-none"
                onPointerDown={handleWindCanvasPointerDown}
                onPointerMove={handleWindCanvasPointerMove}
                onPointerUp={handleWindCanvasPointerUp}
                onPointerLeave={handleWindCanvasPointerUp}
              />

              {/* Cursor Brush Size Preview Circle */}
              {windCursorPct && (
                <div
                  className="absolute pointer-events-none rounded-full border border-dashed transition-transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${windCursorPct.x}%`,
                    top: `${windCursorPct.y}%`,
                    width: `${windBrushSize}px`,
                    height: `${windBrushSize}px`,
                    borderColor: windBrushMode === "paint" ? "#10B981" : "#EF4444",
                    backgroundColor:
                      windBrushMode === "paint"
                        ? "rgba(16, 185, 129, 0.25)"
                        : "rgba(239, 68, 68, 0.25)",
                    boxShadow:
                      windBrushMode === "paint"
                        ? "0 0 10px rgba(16, 185, 129, 0.5)"
                        : "0 0 10px rgba(239, 68, 68, 0.5)",
                  }}
                />
              )}
            </div>
          )}

          {/* Walls Drawing Overlay */}
          {(walls.length > 0 || (drawingWalls && activeWallStart)) && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 11 }}
            >
              {/* Existing Walls */}
              {!hideHelpers && walls.map((w) => (
                <g key={w.id} className="group pointer-events-auto cursor-pointer">
                  {/* Outer subtle shadow/glow */}
                  <line
                    x1={`${w.x1}%`}
                    y1={`${w.y1}%`}
                    x2={`${w.x2}%`}
                    y2={`${w.y2}%`}
                    stroke="#EF4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                    style={{ filter: "drop-shadow(0 0 3px rgba(239, 68, 68, 0.6))" }}
                  />
                  {/* Thick invisible interactive region for clicking and deletion */}
                  <line
                    x1={`${w.x1}%`}
                    y1={`${w.y1}%`}
                    x2={`${w.x2}%`}
                    y2={`${w.y2}%`}
                    stroke="transparent"
                    strokeWidth="12"
                    strokeLinecap="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (drawingWalls) {
                        onDeleteWall?.(w.id);
                      }
                    }}
                    className="hover:stroke-gold/20 transition-colors"
                  />
                </g>
              ))}

              {/* Dynamic Drawing preview line */}
              {drawingWalls && activeWallStart && mousePosPercent && (
                <line
                  x1={`${activeWallStart.x}%`}
                  y1={`${activeWallStart.y}%`}
                  x2={`${mousePosPercent.x}%`}
                  y2={`${mousePosPercent.y}%`}
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              )}
            </svg>
          )}

          {/* Interactive Places/Markers */}
          {showMarkers && (imageLoaded || !map?.cover_image) && (
            <div className="absolute inset-0 pointer-events-none">
              {markers.map(m => (
                <MarkerNode
                  key={m.id}
                  marker={m}
                  hasLinkedMap={!!m.linked_map_id}
                  isDragging={activeDraggingId === m.id}
                  onDragStart={handleMarkerDragStart}
                  onClick={onMarkerClick}
                  isNoUi={isNoUi}
                />
              ))}
            </div>
          )}

          {/* Floating pending marker placement visualizer */}
          {pendingMarkerPos && !isNoUi && (
            <div
              className="absolute pointer-events-none animate-pulse"
              style={{
                left: `${pendingMarkerPos.x}%`,
                top: `${pendingMarkerPos.y}%`,
                transform: "translate(-50%, -100%)",
                zIndex: 20,
              }}
            >
              <motion.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: [0, -4, 0] }}
                transition={{ y: { duration: 1, repeat: Infinity, ease: "easeInOut" } }}
                className="w-5 h-5 rounded-full border-2 border-void"
                style={{
                  backgroundColor: "#D4A017",
                  boxShadow: "0 0 16px rgba(212,160,23,0.9)",
                }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Toolbar when Painting Zone */}
      <AnimatePresence>
        {isPaintingZone && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-3 sm:top-6 left-1/2 -translate-x-1/2 z-50 max-w-[96vw] overflow-x-auto scrollbar-none flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 rounded-2xl bg-void/95 backdrop-blur-2xl border border-amber-500/60 shadow-2xl text-vellum shrink-0"
            style={{ boxShadow: "0 0 30px rgba(230, 126, 34, 0.45)" }}
          >
            <div className="flex items-center gap-2 pr-2 sm:pr-2.5 border-r border-umber/60 shrink-0">
              <div
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/60 shadow-sm shrink-0"
                style={{ backgroundColor: zonePaintColor || "#E67E22" }}
                title="Color del área activa"
              />
              <div className="flex flex-col">
                <span className="font-heading text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-text font-bold leading-none whitespace-nowrap">
                  Modo Pintar
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-vellum/60 whitespace-nowrap">
                  {zonePaintPoints && zonePaintPoints.length > 0
                    ? `${zonePaintPoints.length} pts`
                    : effectivePaintMode === "freehand"
                    ? "Toca o arrastra"
                    : effectivePaintMode === "polygon"
                    ? "Toca vértices"
                    : "Toca color"}
                </span>
              </div>
            </div>

            {/* Drawing mode toggles */}
            <div className="flex items-center bg-sepia/70 p-0.5 rounded-xl border border-umber/40 shrink-0">
              <button
                type="button"
                onClick={() => setPaintMode("freehand")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-body transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  effectivePaintMode === "freehand"
                    ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                    : "text-vellum/60 hover:text-vellum"
                }`}
                title="Arrastra para pintar libremente a mano alzada"
              >
                <span>✏️</span>
                <span className="hidden sm:inline">Mano Alzada</span>
                <span className="sm:hidden">Trazo</span>
              </button>
              <button
                type="button"
                onClick={() => setPaintMode("polygon")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-body transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  effectivePaintMode === "polygon"
                    ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                    : "text-vellum/60 hover:text-vellum"
                }`}
                title="Toca para marcar los vértices de un polígono"
              >
                <span>📐</span>
                <span className="hidden sm:inline">Vértices</span>
                <span className="sm:hidden">Polígono</span>
              </button>
              <button
                type="button"
                onClick={() => setPaintMode("magic_wand")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-body transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  effectivePaintMode === "magic_wand"
                    ? "bg-amber-bg border border-amber-border text-amber-text font-bold shadow-sm"
                    : "text-vellum/60 hover:text-vellum"
                }`}
                title="Varita mágica: detecta contornos automáticos por color"
              >
                <span>🪄</span>
                <span className="hidden sm:inline">Varita Mágica</span>
                <span className="sm:hidden">Varita</span>
              </button>
            </div>

            {effectivePaintMode === "magic_wand" && (
              <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-sepia/40 rounded-lg border border-umber/40 shrink-0">
                <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-vellum/50">Tol.</span>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={effectivePaintTolerance}
                  onChange={(e) => setPaintTolerance(Number(e.target.value))}
                  className="w-12 sm:w-16 h-1 accent-gold cursor-ew-resize"
                />
                <span className="text-[8px] sm:text-[9px] font-mono text-gold">{effectivePaintTolerance}%</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (zonePaintPoints && zonePaintPoints.length > 0) {
                    onZonePointsChange?.(zonePaintPoints.slice(0, -1));
                  }
                }}
                disabled={!zonePaintPoints || zonePaintPoints.length === 0}
                className="px-1.5 sm:px-2 py-1 rounded-lg bg-sepia/60 border border-umber text-vellum/70 hover:text-vellum text-[9px] sm:text-[10px] font-body disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Deshacer último punto"
              >
                Deshacer
              </button>

              <button
                type="button"
                onClick={() => onZonePointsChange?.([])}
                disabled={!zonePaintPoints || zonePaintPoints.length === 0}
                className="px-1.5 sm:px-2 py-1 rounded-lg bg-sepia/60 border border-umber text-vellum/70 hover:text-red-400 text-[9px] sm:text-[10px] font-body disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Limpiar trazo actual"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (zonePaintPoints && zonePaintPoints.length >= 3) {
                    fitPointsToBounds(zonePaintPoints);
                  }
                  onFinishZonePainting?.();
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-emerald-bg border border-emerald-border text-emerald-text hover:bg-emerald-bg/85 font-heading text-[9px] sm:text-[10px] uppercase tracking-wider font-bold transition-all shadow-md cursor-pointer ml-0.5"
              >
                <span>✓ Listo</span>
              </button>

              <button
                type="button"
                onClick={onCancelZonePainting}
                className="p-1 rounded-lg text-vellum/40 hover:text-vellum transition-colors cursor-pointer"
                title="Cerrar modo pintar"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Wind Mask Brush Painting Active Floating Banner */}
        {isPaintingWindMask && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-void/95 border border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] backdrop-blur-xl pointer-events-auto"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <div className="flex flex-col">
              <span className="text-xs font-heading font-bold tracking-wide text-vellum">
                {windBrushMode === "paint"
                  ? "🖌️ Pincel de Viento: Pinta sobre la vegetación"
                  : "🧹 Borrador de Viento: Elimina área"}
              </span>
              <span className="text-[10px] text-vellum/60">
                El viento solo afectará a los colores que caigan dentro de las áreas pintadas
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-700/60 font-bold">
              {windBrushSize}px
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePaintingWindMask?.();
              }}
              className="ml-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Zoom & Centering Controls (Convenient for mobile touch and desktop - Hidden in no-ui embed mode) */}
      {!isNoUi && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-30 flex flex-col gap-1.5 p-1 rounded-2xl bg-void/90 backdrop-blur-xl border border-umber/60 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              const nextZoom = Math.min(5, scaleRef.current * 1.3);
              const { w: imgW, h: imgH } = imgSizeRef.current;
              const { w: winW, h: winH } = containerSizeRef.current;
              const bounded = Xb(pan.x, pan.y, nextZoom, imgW, imgH, winW, winH);
              onZoomChange(nextZoom);
              onPanChange(bounded);
            }}
            className="w-8 h-8 rounded-xl bg-sepia/60 hover:bg-gold/20 text-vellum hover:text-gold flex items-center justify-center transition-all cursor-pointer border border-umber/40"
            title="Acercar (Zoom in)"
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              const { w: imgW, h: imgH } = imgSizeRef.current;
              const { w: winW, h: winH } = containerSizeRef.current;
              const minZoom = hz(imgW, imgH, winW, winH);
              const nextZoom = Math.max(minZoom, scaleRef.current / 1.3);
              const bounded = Xb(pan.x, pan.y, nextZoom, imgW, imgH, winW, winH);
              onZoomChange(nextZoom);
              onPanChange(bounded);
            }}
            className="w-8 h-8 rounded-xl bg-sepia/60 hover:bg-gold/20 text-vellum hover:text-gold flex items-center justify-center transition-all cursor-pointer border border-umber/40"
            title="Alejar (Zoom out)"
          >
            <Minus size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              const { w: imgW, h: imgH } = imgSizeRef.current;
              const { w: winW, h: winH } = containerSizeRef.current;
              const minZoom = hz(imgW, imgH, winW, winH);
              onZoomChange(minZoom);
              onPanChange({ x: 0, y: 0 });
            }}
            className="w-8 h-8 rounded-xl bg-sepia/60 hover:bg-gold/20 text-vellum/70 hover:text-gold flex items-center justify-center transition-all cursor-pointer border border-umber/40"
            title="Restablecer vista centrada"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {/* Outermost floating navigation constraints notifications */}
      <AnimatePresence>
        {showZoomOutHint && parentMapId && onZoomOutToParent && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-void/90 backdrop-blur-md border border-umber text-vellum/60 text-xs font-body flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-gold/60 inline-block animate-ping" />
            Sigue alejando para ir al mapa anterior
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
