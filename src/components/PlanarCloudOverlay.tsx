import React, { useMemo } from "react";
import { motion } from "motion/react";
import { PlanarThemeConfig, PLANAR_THEMES, ResolvedPlanarTheme } from "../utils/planarThemes";

interface PlanarCloudOverlayProps {
  isActive: boolean;
  isFullyCovered?: boolean;
  phase?: "entering" | "covered" | "parting";
  themeId: ResolvedPlanarTheme;
  targetMapName?: string;
}

// Organic staggered cloud positioning data (covering the full viewport with generous offscreen margins)
const CLOUD_DATA = [
  // Top-Left corner
  { style: { top: "-15%", left: "-15%", width: "50vw", height: "50vh" }, initX: -650, initY: -550, exitX: -850, exitY: -700, delay: 0.0, rotate: -6 },
  { style: { top: "5%", left: "-20%", width: "54vw", height: "54vh" }, initX: -750, initY: -220, exitX: -950, exitY: -300, delay: 0.07, rotate: 4 },
  { style: { top: "-20%", left: "15%", width: "46vw", height: "44vh" }, initX: -400, initY: -650, exitX: -550, exitY: -850, delay: 0.03, rotate: -3 },

  // Top-Right corner
  { style: { top: "-15%", right: "-15%", width: "50vw", height: "50vh" }, initX: 650, initY: -550, exitX: 850, exitY: -700, delay: 0.02, rotate: 7 },
  { style: { top: "5%", right: "-20%", width: "54vw", height: "54vh" }, initX: 750, initY: -220, exitX: 950, exitY: -300, delay: 0.08, rotate: -5 },
  { style: { top: "-20%", right: "15%", width: "46vw", height: "44vh" }, initX: 400, initY: -650, exitX: 550, exitY: -850, delay: 0.05, rotate: 4 },

  // Middle Left / Right
  { style: { top: "25%", left: "-15%", width: "56vw", height: "54vh" }, initX: -750, initY: 0, exitX: -1050, exitY: 0, delay: 0.04, rotate: -3 },
  { style: { top: "25%", right: "-15%", width: "56vw", height: "54vh" }, initX: 750, initY: 0, exitX: 1050, exitY: 0, delay: 0.09, rotate: 6 },

  // Center / Intermediate overlap
  { style: { top: "20%", left: "12%", width: "52vw", height: "48vh" }, initX: -500, initY: -380, exitX: -720, exitY: -500, delay: 0.11, rotate: 5 },
  { style: { top: "20%", right: "12%", width: "52vw", height: "48vh" }, initX: 500, initY: -380, exitX: 720, exitY: -500, delay: 0.07, rotate: -4 },

  // Bottom-Left corner
  { style: { bottom: "-15%", left: "-15%", width: "50vw", height: "50vh" }, initX: -650, initY: 550, exitX: -850, exitY: 700, delay: 0.03, rotate: 5 },
  { style: { bottom: "5%", left: "-20%", width: "54vw", height: "54vh" }, initX: -750, initY: 220, exitX: -950, exitY: 300, delay: 0.09, rotate: -4 },
  { style: { bottom: "-20%", left: "15%", width: "46vw", height: "44vh" }, initX: -400, initY: 650, exitX: -550, exitY: 850, delay: 0.04, rotate: 3 },

  // Bottom-Right corner
  { style: { bottom: "-15%", right: "-15%", width: "50vw", height: "50vh" }, initX: 650, initY: 550, exitX: 850, exitY: 700, delay: 0.03, rotate: -6 },
  { style: { bottom: "5%", right: "-20%", width: "54vw", height: "54vh" }, initX: 750, initY: 220, exitX: 950, exitY: 300, delay: 0.06, rotate: 5 },
  { style: { bottom: "-20%", right: "15%", width: "46vw", height: "44vh" }, initX: 400, initY: 650, exitX: 550, exitY: 850, delay: 0.08, rotate: -3 },

  // Absolute Center Fillers (total opaque screen block)
  { style: { top: "28%", left: "24%", width: "56vw", height: "50vh" }, initX: 0, initY: 550, exitX: 0, exitY: 950, delay: 0.12, rotate: 2 },
  { style: { top: "28%", right: "24%", width: "56vw", height: "50vh" }, initX: 0, initY: -550, exitX: 0, exitY: -950, delay: 0.13, rotate: -2 },
];

export default function PlanarCloudOverlay({
  isActive,
  isFullyCovered,
  phase: propPhase,
  themeId,
  targetMapName,
}: PlanarCloudOverlayProps) {
  // Always use the default classic parchment cloud transition
  const theme: PlanarThemeConfig = PLANAR_THEMES.classic;

  // Resolve active phase
  const phase: "entering" | "covered" | "parting" =
    propPhase || (isFullyCovered ? "covered" : "entering");

  if (!isActive) return null;

  const isParting = phase === "parting";

  return (
    <motion.div
      key="planar-cloud-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[9999] overflow-hidden select-none ${
        isParting ? "pointer-events-none" : "pointer-events-auto"
      }`}
    >
      {/* Dynamic Theme Backdrop Vignette */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isParting ? 0 : 1 }}
        transition={{ duration: isParting ? 1.6 : 1.3, ease: [0.22, 1, 0.36, 1] }}
        className={`absolute inset-0 ${theme.backdropBg} backdrop-blur-[6px] z-0 pointer-events-none`}
      />

      {/* Central Elemental Core Burst */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={
          isParting
            ? { opacity: 0, scale: 2.1 }
            : { opacity: 0.85, scale: 1.6 }
        }
        transition={{
          duration: isParting ? 1.5 : 1.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full pointer-events-none filter blur-[60px] z-10"
        style={{ background: theme.centralBurst }}
      />

      {/* Cloud Puffs Layer */}
      {CLOUD_DATA.map((cloud, index) => (
        <ThemedCloudPuff
          key={index}
          index={index}
          theme={theme}
          style={cloud.style}
          initX={cloud.initX}
          initY={cloud.initY}
          exitX={cloud.exitX}
          exitY={cloud.exitY}
          delay={cloud.delay}
          rotate={cloud.rotate}
          phase={phase}
        />
      ))}

      {/* Special Particle Systems for Each Plane (Embers, Bubbles, Petals, Wisps, etc.) */}
      <motion.div
        className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
        animate={{ opacity: isParting ? 0 : 1 }}
        transition={{ duration: isParting ? 1.2 : 0.8, ease: "easeOut" }}
      >
        <PlanarParticles theme={theme} />
      </motion.div>
    </motion.div>
  );
}

// ----------------------------------------------------
// THEME COLOR PALETTE FOR REALISTIC CARTOON CLOUDS
// ----------------------------------------------------
function getThemeCloudPalette(themeId: string) {
  switch (themeId) {
    case "feywild":
      return {
        top: "#ffffff",
        mid: "#fce7f3",
        bottom: "#f472b6",
        shadow: "#831843",
        highlight: "rgba(255, 255, 255, 0.95)",
        mist: "rgba(244, 114, 182, 0.45)",
      };
    case "fire":
      return {
        top: "#78716c",
        mid: "#44403c",
        bottom: "#1c1917",
        shadow: "#000000",
        highlight: "rgba(249, 115, 22, 0.45)",
        mist: "rgba(220, 38, 38, 0.35)",
      };
    case "water":
      return {
        top: "#ffffff",
        mid: "#bae6fd",
        bottom: "#38bdf8",
        shadow: "#0369a1",
        highlight: "rgba(255, 255, 255, 0.95)",
        mist: "rgba(56, 189, 248, 0.4)",
      };
    case "air":
      return {
        top: "#ffffff",
        mid: "#e0f2fe",
        bottom: "#93c5fd",
        shadow: "#1d4ed8",
        highlight: "rgba(255, 255, 255, 0.95)",
        mist: "rgba(147, 197, 253, 0.45)",
      };
    case "earth":
      return {
        top: "#fef9c3",
        mid: "#f59e0b",
        bottom: "#92400e",
        shadow: "#451a03",
        highlight: "rgba(254, 240, 138, 0.85)",
        mist: "rgba(217, 119, 6, 0.4)",
      };
    case "shadowfell":
      return {
        top: "#52525b",
        mid: "#27272a",
        bottom: "#09090b",
        shadow: "#000000",
        highlight: "rgba(192, 132, 252, 0.4)",
        mist: "rgba(126, 34, 206, 0.35)",
      };
    case "astral":
      return {
        top: "#f5f3ff",
        mid: "#c084fc",
        bottom: "#6366f1",
        shadow: "#312e81",
        highlight: "rgba(255, 255, 255, 0.95)",
        mist: "rgba(168, 85, 247, 0.45)",
      };
    case "frost":
      return {
        top: "#ffffff",
        mid: "#e0f7fa",
        bottom: "#38bdf8",
        shadow: "#0e7490",
        highlight: "rgba(255, 255, 255, 0.95)",
        mist: "rgba(56, 189, 248, 0.45)",
      };
    case "classic":
    default:
      return {
        top: "#ffffff",
        mid: "#f9f1df",
        bottom: "#dfc394",
        shadow: "#543b27",
        highlight: "rgba(255, 255, 255, 0.92)",
        mist: "rgba(247, 235, 207, 0.7)",
      };
  }
}

// ----------------------------------------------------
// ORGANIC CARTOON CUMULUS CLOUD SILHOUETTES
// ----------------------------------------------------
const CARTOON_CLOUD_VARIANTS = [
  // Variant 0: Wide Classic Cumulus
  {
    viewBox: "0 0 400 240",
    path: "M 60 170 C 30 170 15 145 20 120 C 22 98 42 85 62 82 C 60 55 88 28 122 25 C 145 23 166 34 178 50 C 192 20 235 15 268 35 C 290 48 300 70 300 92 C 328 95 350 115 350 140 C 350 168 328 185 298 185 C 275 192 248 188 230 180 C 210 195 175 196 150 184 C 125 196 90 194 60 170 Z",
    highlights: [
      { top: "14%", left: "28%", width: "42%", height: "24%", rotate: -4 },
      { top: "24%", left: "12%", width: "26%", height: "20%", rotate: 8 },
      { top: "28%", right: "12%", width: "28%", height: "22%", rotate: -6 },
    ],
  },
  // Variant 1: Tall Billowy Puffs
  {
    viewBox: "0 0 360 260",
    path: "M 55 190 C 25 190 10 162 16 132 C 18 108 40 92 65 90 C 68 58 98 32 135 35 C 156 36 175 48 186 64 C 202 28 248 22 282 48 C 305 64 312 90 310 115 C 335 124 350 148 346 172 C 342 196 320 210 292 210 C 268 218 238 210 220 200 C 198 216 158 216 132 202 C 106 215 78 212 55 190 Z",
    highlights: [
      { top: "16%", left: "32%", width: "40%", height: "24%", rotate: -2 },
      { top: "22%", left: "14%", width: "28%", height: "20%", rotate: 6 },
      { top: "34%", right: "10%", width: "25%", height: "22%", rotate: -5 },
    ],
  },
  // Variant 2: Drifting Horizon Cumulus
  {
    viewBox: "0 0 420 220",
    path: "M 50 155 C 20 155 10 130 15 105 C 18 85 38 72 60 70 C 65 42 95 24 130 26 C 152 27 172 40 182 54 C 200 28 240 24 272 40 C 295 52 308 72 312 92 C 336 94 362 110 362 134 C 362 158 340 174 314 174 C 290 182 260 176 240 168 C 214 182 172 182 146 170 C 118 182 85 180 50 155 Z",
    highlights: [
      { top: "15%", left: "26%", width: "44%", height: "22%", rotate: -3 },
      { top: "22%", left: "10%", width: "26%", height: "20%", rotate: 5 },
      { top: "28%", right: "12%", width: "26%", height: "22%", rotate: -4 },
    ],
  },
];

// Organic Cartoony Cloud Puff with Diffusion (Difuminado)
const ThemedCloudPuff: React.FC<{
  theme: PlanarThemeConfig;
  style: React.CSSProperties;
  initX: number;
  initY: number;
  exitX: number;
  exitY: number;
  delay: number;
  rotate: number;
  phase: "entering" | "covered" | "parting";
  index: number;
}> = ({ theme, style, initX, initY, exitX, exitY, delay, rotate, phase, index }) => {
  const isParting = phase === "parting";
  const palette = getThemeCloudPalette(theme.id);
  const variant = CARTOON_CLOUD_VARIANTS[index % CARTOON_CLOUD_VARIANTS.length];
  const uniqueId = `${theme.id}-${index}`;

  return (
    <motion.div
      initial={{ x: initX, y: initY, scale: 0.72, opacity: 0, rotate: rotate - 6 }}
      animate={
        isParting
          ? {
              x: exitX * 1.35,
              y: exitY * 1.35,
              scale: 1.35,
              opacity: 0,
              rotate: rotate + (rotate >= 0 ? 8 : -8),
            }
          : {
              x: 0,
              y: 0,
              scale: 1.25,
              opacity: 1,
              rotate: rotate,
            }
      }
      transition={
        isParting
          ? {
              duration: 1.65,
              delay: delay * 0.4,
              ease: [0.25, 1, 0.45, 1], // Velvety smooth cubic bezier deceleration
            }
          : {
              duration: 1.5,
              delay: delay * 0.65,
              ease: [0.22, 1, 0.36, 1], // Continuous, buttery soft entrance
            }
      }
      className="absolute pointer-events-none select-none z-30 will-change-transform"
      style={style}
    >
      <div className="relative w-full h-full min-w-[240px] min-h-[160px]">
        {/* Layer 1: Atmospheric Outer Mist Diffusion (Difuminado exterior de vapor) */}
        <svg
          viewBox={variant.viewBox}
          className="absolute -inset-[10%] w-[120%] h-[120%] pointer-events-none transform scale-110"
          style={{ filter: "blur(24px)", opacity: 0.85 }}
        >
          <path d={variant.path} fill={palette.mist} />
        </svg>

        {/* Layer 2: Deep Belly Shadow with Soft Diffusion (Sombra difuminada inferior) */}
        <svg
          viewBox={variant.viewBox}
          className="absolute inset-0 w-full h-full pointer-events-none transform translate-y-4 scale-105"
          style={{ filter: "blur(16px)", opacity: 0.4 }}
        >
          <path d={variant.path} fill={palette.shadow} />
        </svg>

        {/* Layer 3: Fluffy Cotton Border Diffusion (Borde algodonoso difuminado) */}
        <svg
          viewBox={variant.viewBox}
          className="absolute inset-0 w-full h-full pointer-events-none transform scale-[1.03]"
          style={{ filter: "blur(7px)", opacity: 0.95 }}
        >
          <path d={variant.path} fill={`url(#cloud-grad-${uniqueId})`} />
        </svg>

        {/* Layer 4: Main Volumetric Cartoony Body (Cuerpo cartoony suave) */}
        <svg
          viewBox={variant.viewBox}
          className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.14)]"
          style={{ filter: "blur(2.5px)" }}
        >
          <defs>
            <linearGradient id={`cloud-grad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.top} />
              <stop offset="42%" stopColor={palette.mid} />
              <stop offset="100%" stopColor={palette.bottom} />
            </linearGradient>
          </defs>
          <path d={variant.path} fill={`url(#cloud-grad-${uniqueId})`} />
        </svg>

        {/* Layer 5: Soft Cumulus Crest Highlights (Luz y volumen esponjoso en las crestas) */}
        {variant.highlights.map((hl, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: hl.top,
              left: hl.left,
              right: (hl as any).right,
              width: hl.width,
              height: hl.height,
              transform: `rotate(${hl.rotate}deg)`,
              background: `radial-gradient(ellipse at center, ${palette.highlight} 0%, rgba(255,255,255,0.3) 40%, transparent 80%)`,
              filter: "blur(9px)",
              opacity: 0.88,
            }}
          />
        ))}

        {/* Layer 6: Soft Underside Belly Tint (Reflejo cálido en la base) */}
        <div
          className="absolute bottom-[6%] left-[15%] w-[70%] h-[26%] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${palette.shadow}22 0%, transparent 75%)`,
            filter: "blur(12px)",
          }}
        />
      </div>
    </motion.div>
  );
};

// ==========================================
// SPECIFIC PARTICLES FOR EACH PLANAR REALM
// ==========================================
function PlanarParticles({ theme }: { theme: PlanarThemeConfig }) {
  switch (theme.particleType) {
    case "feywild_petals_sparkles":
      return <FeywildParticles />;
    case "fire_ash_embers":
      return <FireAshEmbersParticles />;
    case "water_bubbles":
      return <WaterBubblesParticles />;
    case "air_wind_lightning":
      return <AirWindParticles />;
    case "earth_dust_stones":
      return <EarthStonesParticles />;
    case "shadowfell_spectral_wisps":
      return <ShadowfellWispsParticles />;
    case "astral_cosmic_stars":
      return <AstralStarsParticles />;
    case "frost_crystalline_snow":
      return <FrostSnowParticles />;
    case "classic_gold_compass":
    default:
      return null;
  }
}

// 1. FEYWILD: Pink Rose Petals & Sparkling Fairy Dust
function FeywildParticles() {
  const petals = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: `petal-${i}`,
      left: `${(i * 5.5 + Math.sin(i * 3) * 10 + 5) % 95}%`,
      delay: (i * 0.08) % 0.8,
      duration: 1.6 + (i % 5) * 0.25,
      size: 14 + (i % 4) * 5,
      rotate: (i * 45) % 360,
      driftX: ((i % 2 === 0 ? 1 : -1) * (30 + (i % 4) * 20)),
    }));
  }, []);

  const sparkles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: `fey-sparkle-${i}`,
      left: `${(i * 4.2 + 8) % 92}%`,
      top: `${(i * 4.8 + 12) % 86}%`,
      delay: (i * 0.05) % 0.6,
      size: 8 + (i % 3) * 5,
      color: i % 3 === 0 ? "#fbcfe8" : i % 3 === 1 ? "#f472b6" : "#fef08a",
    }));
  }, []);

  return (
    <>
      {/* Pink Fluttering Petals */}
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -60, x: 0, opacity: 0, rotate: p.rotate, scale: 0.6 }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, p.driftX, -p.driftX / 2, p.driftX],
            opacity: [0, 0.95, 0.95, 0],
            rotate: [p.rotate, p.rotate + 180, p.rotate + 360],
            scale: [0.6, 1.1, 0.9],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeInOut",
          }}
          className="absolute pointer-events-none"
          style={{ left: p.left, width: p.size, height: p.size }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_2px_6px_rgba(219,39,119,0.4)]">
            <path
              d="M12 2C8.5 2 4 6.5 4 11.5C4 16.5 8 21 12 22C16 21 20 16.5 20 11.5C20 6.5 15.5 2 12 2Z"
              fill="url(#feyPetalGrad)"
            />
            <defs>
              <linearGradient id="feyPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fdf2f8" />
                <stop offset="50%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      ))}

      {/* Fairy Dust Sparkles */}
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.4, 0],
            opacity: [0, 1, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 1.2,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
          className="absolute pointer-events-none flex items-center justify-center"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
        >
          <svg viewBox="0 0 24 24" fill={s.color} className="w-full h-full filter drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// 2. FIRE: Volcanic Ash Flakes & Shooting Fiery Embers
function FireAshEmbersParticles() {
  const embers = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: `ember-${i}`,
      left: `${(i * 3.4 + Math.cos(i * 2) * 8 + 6) % 94}%`,
      delay: (i * 0.04) % 0.6,
      duration: 1.2 + (i % 4) * 0.25,
      size: 4 + (i % 5) * 3,
      driftX: ((i % 2 === 0 ? 1 : -1) * (25 + (i % 4) * 15)),
      glowColor: i % 3 === 0 ? "#f97316" : i % 3 === 1 ? "#ef4444" : "#facc15",
    }));
  }, []);

  const ashFlakes = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: `ash-${i}`,
      left: `${(i * 6.2 + 4) % 94}%`,
      delay: (i * 0.07) % 0.7,
      duration: 1.8 + (i % 3) * 0.3,
      size: 6 + (i % 4) * 3,
      rotate: (i * 60) % 360,
    }));
  }, []);

  return (
    <>
      {/* Rising Fiery Embers */}
      {embers.map((e) => (
        <motion.div
          key={e.id}
          initial={{ y: "105vh", opacity: 0, scale: 0.3 }}
          animate={{
            y: ["105vh", "-10vh"],
            x: [0, e.driftX, -e.driftX, e.driftX / 2],
            opacity: [0, 1, 0.9, 0],
            scale: [0.3, 1.4, 1, 0.4],
          }}
          transition={{
            duration: e.duration,
            delay: e.delay,
            ease: "easeOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            backgroundColor: e.glowColor,
            boxShadow: `0 0 ${e.size * 2.5}px ${e.glowColor}, 0 0 ${e.size * 5}px rgba(239,68,68,0.6)`,
          }}
        />
      ))}

      {/* Tumbling Volcanic Ash Flakes */}
      {ashFlakes.map((a) => (
        <motion.div
          key={a.id}
          initial={{ y: -40, opacity: 0, rotate: a.rotate }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, (a.rotate % 2 === 0 ? 30 : -30)],
            opacity: [0, 0.85, 0.8, 0],
            rotate: [a.rotate, a.rotate + 240],
          }}
          transition={{
            duration: a.duration,
            delay: a.delay,
            ease: "linear",
          }}
          className="absolute rounded-sm bg-[#1c1917] border border-stone-600/40 pointer-events-none filter blur-[0.5px]"
          style={{
            left: a.left,
            width: a.size,
            height: a.size * 0.8,
          }}
        />
      ))}
    </>
  );
}

// 3. WATER: Deep Aquatic Bubbles & Translucent Water Swells
function WaterBubblesParticles() {
  const bubbles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: `bubble-${i}`,
      left: `${(i * 3.6 + Math.sin(i * 4) * 8 + 5) % 94}%`,
      delay: (i * 0.05) % 0.7,
      duration: 1.4 + (i % 5) * 0.25,
      size: 14 + (i % 6) * 6, // 14px to 44px
      driftX: ((i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 15)),
    }));
  }, []);

  return (
    <>
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: "110vh", opacity: 0, scale: 0.4 }}
          animate={{
            y: ["110vh", "-15vh"],
            x: [0, b.driftX, -b.driftX * 0.7, b.driftX * 0.4],
            opacity: [0, 0.85, 0.85, 0],
            scale: [0.4, 1.05, 0.95, 1.2],
          }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            ease: "easeOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            background:
              "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 20%, rgba(56,189,248,0.2) 55%, rgba(2,132,199,0.65) 90%, rgba(255,255,255,0.7) 100%)",
            boxShadow:
              "inset 0 -2px 6px rgba(2,132,199,0.5), 0 0 10px rgba(56,189,248,0.4)",
            border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          {/* Specular curved reflection crescent inside bubble */}
          <div className="absolute top-[18%] left-[22%] w-[32%] h-[22%] bg-white/80 rounded-full filter blur-[0.5px] transform -rotate-30" />
        </motion.div>
      ))}
    </>
  );
}

// 4. AIR: Dynamic Wind Streaks & Electric Flashes
function AirWindParticles() {
  const gusts = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: `gust-${i}`,
      top: `${(i * 7 + 5) % 90}%`,
      delay: (i * 0.08) % 0.6,
      duration: 0.9 + (i % 3) * 0.2,
      width: 140 + (i % 4) * 60,
    }));
  }, []);

  return (
    <>
      {gusts.map((g) => (
        <motion.div
          key={g.id}
          initial={{ x: "-30vw", opacity: 0 }}
          animate={{
            x: ["-20vw", "120vw"],
            opacity: [0, 0.75, 0.75, 0],
          }}
          transition={{
            duration: g.duration,
            delay: g.delay,
            ease: "easeIn",
          }}
          className="absolute h-[2px] bg-gradient-to-r from-transparent via-sky-200 to-transparent pointer-events-none filter blur-[1px]"
          style={{ top: g.top, width: g.width }}
        />
      ))}
    </>
  );
}

// 5. EARTH: Tumbling Stone Flakes & Sand Dust
function EarthStonesParticles() {
  const motes = useMemo(() => {
    return Array.from({ length: 22 }).map((_, i) => ({
      id: `stone-${i}`,
      left: `${(i * 4.6 + 4) % 94}%`,
      delay: (i * 0.05) % 0.6,
      duration: 1.5 + (i % 4) * 0.25,
      size: 5 + (i % 4) * 4,
      rotate: (i * 70) % 360,
      color: i % 3 === 0 ? "#b45309" : i % 3 === 1 ? "#d97706" : "#f59e0b",
    }));
  }, []);

  return (
    <>
      {motes.map((m) => (
        <motion.div
          key={m.id}
          initial={{ y: -30, opacity: 0, rotate: m.rotate }}
          animate={{
            y: ["0vh", "110vh"],
            opacity: [0, 0.9, 0.9, 0],
            rotate: [m.rotate, m.rotate + 360],
          }}
          transition={{
            duration: m.duration,
            delay: m.delay,
            ease: "easeIn",
          }}
          className="absolute rounded-sm pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            backgroundColor: m.color,
          }}
        />
      ))}
    </>
  );
}

// 6. SHADOWFELL: Spectral Soul Wisps & Dark Mist
function ShadowfellWispsParticles() {
  const wisps = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: `wisp-${i}`,
      left: `${(i * 5.4 + 5) % 92}%`,
      delay: (i * 0.07) % 0.6,
      duration: 1.6 + (i % 3) * 0.3,
      size: 16 + (i % 3) * 10,
    }));
  }, []);

  return (
    <>
      {wisps.map((w) => (
        <motion.div
          key={w.id}
          initial={{ y: "105vh", opacity: 0, scale: 0.4 }}
          animate={{
            y: ["105vh", "-10vh"],
            x: [0, Math.sin(w.size) * 35, -Math.sin(w.size) * 25, 0],
            opacity: [0, 0.75, 0.7, 0],
            scale: [0.4, 1.2, 0.8],
          }}
          transition={{
            duration: w.duration,
            delay: w.delay,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none filter blur-[4px]"
          style={{
            left: w.left,
            width: w.size,
            height: w.size * 1.5,
            background:
              "radial-gradient(circle, rgba(192,132,252,0.7) 0%, rgba(147,51,234,0.3) 50%, transparent 100%)",
            boxShadow: "0 0 16px rgba(168,85,247,0.6)",
          }}
        />
      ))}
    </>
  );
}

// 7. ASTRAL: Cosmic Stars & Radiant Nebula Dust
function AstralStarsParticles() {
  const stars = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: `star-${i}`,
      left: `${(i * 4.1 + 6) % 92}%`,
      top: `${(i * 4.7 + 8) % 86}%`,
      delay: (i * 0.05) % 0.6,
      size: 10 + (i % 3) * 6,
    }));
  }, []);

  return (
    <>
      {stars.map((s) => (
        <motion.div
          key={s.id}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0, 1.3, 0],
            opacity: [0, 1, 0],
            rotate: [0, 120, 240],
          }}
          transition={{
            duration: 1.3,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
          className="absolute pointer-events-none flex items-center justify-center"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
        >
          <svg viewBox="0 0 24 24" fill="#ede9fe" className="w-full h-full filter drop-shadow-[0_0_10px_rgba(192,132,252,0.9)]">
            <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// 8. FROST: Crystalline Snowflakes & Blizzard Shimmer
function FrostSnowParticles() {
  const flakes = useMemo(() => {
    return Array.from({ length: 22 }).map((_, i) => ({
      id: `flake-${i}`,
      left: `${(i * 4.5 + 4) % 94}%`,
      delay: (i * 0.06) % 0.6,
      duration: 1.5 + (i % 4) * 0.25,
      size: 12 + (i % 3) * 6,
      rotate: (i * 40) % 360,
    }));
  }, []);

  return (
    <>
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          initial={{ y: -40, opacity: 0, rotate: f.rotate }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, (f.rotate % 2 === 0 ? 30 : -30)],
            opacity: [0, 0.95, 0.95, 0],
            rotate: [f.rotate, f.rotate + 180],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            ease: "linear",
          }}
          className="absolute text-cyan-100 filter drop-shadow-[0_0_6px_rgba(56,189,248,0.8)] pointer-events-none flex items-center justify-center"
          style={{ left: f.left, width: f.size, height: f.size }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

