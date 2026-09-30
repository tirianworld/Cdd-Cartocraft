import { Map, Folder, TransitionTheme } from "../types";

export type ResolvedPlanarTheme =
  | "classic"
  | "feywild"
  | "fire"
  | "water"
  | "air"
  | "earth"
  | "shadowfell"
  | "astral"
  | "frost";

export interface PlanarThemeConfig {
  id: ResolvedPlanarTheme;
  name: string;
  planeTitle: string;
  portalSubtitle: string;
  icon: string; // Emoji/Symbol for portal banner
  accentColor: string;
  // Backdrop
  backdropBg: string;
  centralBurst: string;
  // Cloud styling
  cloudBellyShadow: string;
  cloudBaseGradient: string;
  cloudBaseShadow: string;
  cloudBaseBorder?: string;
  cloudTopGradient: string;
  cloudShoulderGradient: string;
  cloudHighlightColor: string;
  cloudTintGradient: string;
  // Particle configuration
  particleType:
    | "feywild_petals_sparkles"
    | "fire_ash_embers"
    | "water_bubbles"
    | "air_wind_lightning"
    | "earth_dust_stones"
    | "shadowfell_spectral_wisps"
    | "astral_cosmic_stars"
    | "frost_crystalline_snow"
    | "classic_gold_compass";
}

export const PLANAR_THEMES: Record<ResolvedPlanarTheme, PlanarThemeConfig> = {
  feywild: {
    id: "feywild",
    name: "Feywild (Plano Feérico)",
    planeTitle: "Plano Feérico • Feywild",
    portalSubtitle: "Traspasando el Velo de las Hadas y los Bosques Encantados",
    icon: "🌸",
    accentColor: "#f472b6",
    backdropBg: "bg-[#2d0822]/70",
    centralBurst: "radial-gradient(circle, rgba(244,114,182,0.45) 0%, rgba(217,70,239,0.25) 35%, rgba(112,26,117,0.12) 65%, transparent 100%)",
    cloudBellyShadow: "bg-[#701a75]/35",
    cloudBaseGradient: "bg-gradient-to-b from-[#fff5f8] via-[#fce7f3] to-[#f472b6]",
    cloudBaseShadow: "shadow-[inset_0_-10px_25px_rgba(219,39,119,0.3)]",
    cloudBaseBorder: "border border-pink-300/30",
    cloudTopGradient: "from-[#ffffff] to-[#fbcfe8]",
    cloudShoulderGradient: "from-[#fff1f2] via-[#fce7f3] to-[#f472b6]",
    cloudHighlightColor: "bg-[#ffffff]/70",
    cloudTintGradient: "bg-gradient-to-t from-[#db2777]/30 to-transparent",
    particleType: "feywild_petals_sparkles",
  },
  fire: {
    id: "fire",
    name: "Plano del Fuego (Ceniza & Brasas)",
    planeTitle: "Plano Elemental del Fuego",
    portalSubtitle: "Descendiendo entre Ceniza Volcánica, Humo y Brasas Ardientes",
    icon: "🔥",
    accentColor: "#ef4444",
    backdropBg: "bg-[#180504]/85",
    centralBurst: "radial-gradient(circle, rgba(239,68,68,0.55) 0%, rgba(249,115,22,0.35) 40%, rgba(69,10,10,0.4) 75%, transparent 100%)",
    cloudBellyShadow: "bg-[#000000]/75",
    cloudBaseGradient: "bg-gradient-to-b from-[#44403c] via-[#292524] to-[#141110]",
    cloudBaseShadow: "shadow-[inset_0_-10px_28px_rgba(239,68,68,0.45)]",
    cloudBaseBorder: "border border-orange-600/30",
    cloudTopGradient: "from-[#57534e] to-[#292524]",
    cloudShoulderGradient: "from-[#44403c] via-[#292524] to-[#0c0a09]",
    cloudHighlightColor: "bg-[#f97316]/30 filter blur-[2px]",
    cloudTintGradient: "bg-gradient-to-t from-[#dc2626]/40 via-[#b91c1c]/15 to-transparent",
    particleType: "fire_ash_embers",
  },
  water: {
    id: "water",
    name: "Plano del Agua (Burbujas & Oleaje)",
    planeTitle: "Plano Elemental del Agua",
    portalSubtitle: "Sumergiéndose en las Mareas Abisales y Corrientes Oceánicas",
    icon: "🌊",
    accentColor: "#38bdf8",
    backdropBg: "bg-[#021827]/80",
    centralBurst: "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(14,165,233,0.3) 45%, rgba(3,105,161,0.15) 75%, transparent 100%)",
    cloudBellyShadow: "bg-[#082f49]/50",
    cloudBaseGradient: "bg-gradient-to-b from-[#f0f9ff] via-[#7dd3fc] to-[#0284c7]",
    cloudBaseShadow: "shadow-[inset_0_-10px_25px_rgba(2,132,199,0.4)]",
    cloudBaseBorder: "border border-sky-300/30",
    cloudTopGradient: "from-[#ffffff] to-[#bae6fd]",
    cloudShoulderGradient: "from-[#e0f2fe] via-[#7dd3fc] to-[#0369a1]",
    cloudHighlightColor: "bg-[#ffffff]/75",
    cloudTintGradient: "bg-gradient-to-t from-[#0284c7]/35 to-transparent",
    particleType: "water_bubbles",
  },
  air: {
    id: "air",
    name: "Plano del Aire (Vórtice & Tormenta)",
    planeTitle: "Plano Elemental del Aire",
    portalSubtitle: "Ascendiendo a través de Cielos Infinitos y Vendavales Céleres",
    icon: "🌪️",
    accentColor: "#60a5fa",
    backdropBg: "bg-[#08182b]/75",
    centralBurst: "radial-gradient(circle, rgba(186,230,253,0.55) 0%, rgba(96,165,250,0.25) 50%, transparent 100%)",
    cloudBellyShadow: "bg-[#1e3a8a]/35",
    cloudBaseGradient: "bg-gradient-to-b from-[#ffffff] via-[#e0f2fe] to-[#93c5fd]",
    cloudBaseShadow: "shadow-[inset_0_-10px_20px_rgba(37,99,235,0.25)]",
    cloudBaseBorder: "border border-cyan-200/35",
    cloudTopGradient: "from-[#ffffff] to-[#dbeafe]",
    cloudShoulderGradient: "from-[#ffffff] via-[#e0f2fe] to-[#60a5fa]",
    cloudHighlightColor: "bg-[#ffffff]/80",
    cloudTintGradient: "bg-gradient-to-t from-[#38bdf8]/30 to-transparent",
    particleType: "air_wind_lightning",
  },
  earth: {
    id: "earth",
    name: "Plano de la Tierra (Roca & Polvo Mineral)",
    planeTitle: "Plano Elemental de la Tierra",
    portalSubtitle: "Penetrando en Cavernas Colosales y Filones de Piedra Viva",
    icon: "⛰️",
    accentColor: "#f59e0b",
    backdropBg: "bg-[#1f1207]/80",
    centralBurst: "radial-gradient(circle, rgba(217,119,6,0.5) 0%, rgba(180,83,9,0.3) 50%, transparent 100%)",
    cloudBellyShadow: "bg-[#451a03]/55",
    cloudBaseGradient: "bg-gradient-to-b from-[#fef3c7] via-[#d97706] to-[#78350f]",
    cloudBaseShadow: "shadow-[inset_0_-10px_25px_rgba(69,26,3,0.45)]",
    cloudBaseBorder: "border border-amber-600/30",
    cloudTopGradient: "from-[#fef9c3] to-[#d97706]",
    cloudShoulderGradient: "from-[#fef3c7] via-[#b45309] to-[#78350f]",
    cloudHighlightColor: "bg-[#fde68a]/45",
    cloudTintGradient: "bg-gradient-to-t from-[#92400e]/35 to-transparent",
    particleType: "earth_dust_stones",
  },
  shadowfell: {
    id: "shadowfell",
    name: "Shadowfell (Páramo Sombrío)",
    planeTitle: "Páramo Sombrío • Shadowfell",
    portalSubtitle: "Cruzando el Umbral de Sombras Eternas y Almas Errantes",
    icon: "👁️",
    accentColor: "#a855f7",
    backdropBg: "bg-[#09070f]/90",
    centralBurst: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(88,28,135,0.25) 55%, transparent 100%)",
    cloudBellyShadow: "bg-[#09090b]/85",
    cloudBaseGradient: "bg-gradient-to-b from-[#3f3f46] via-[#27272a] to-[#09090b]",
    cloudBaseShadow: "shadow-[inset_0_-10px_25px_rgba(147,51,234,0.4)]",
    cloudBaseBorder: "border border-purple-500/25",
    cloudTopGradient: "from-[#52525b] to-[#27272a]",
    cloudShoulderGradient: "from-[#3f3f46] via-[#18181b] to-[#09090b]",
    cloudHighlightColor: "bg-[#c084fc]/25 filter blur-[2px]",
    cloudTintGradient: "bg-gradient-to-t from-[#7e22ce]/35 to-transparent",
    particleType: "shadowfell_spectral_wisps",
  },
  astral: {
    id: "astral",
    name: "Plano Astral (Cosmos & Nebulosas)",
    planeTitle: "Mar Astral • Plano Cósmico",
    portalSubtitle: "Navegando entre Polvo Estelar y Constelaciones Arcanas",
    icon: "🌌",
    accentColor: "#c084fc",
    backdropBg: "bg-[#0a081c]/85",
    centralBurst: "radial-gradient(circle, rgba(167,139,250,0.5) 0%, rgba(99,102,241,0.3) 50%, transparent 100%)",
    cloudBellyShadow: "bg-[#1e1b4b]/60",
    cloudBaseGradient: "bg-gradient-to-b from-[#ede9fe] via-[#a855f7] to-[#3730a3]",
    cloudBaseShadow: "shadow-[inset_0_-10px_25px_rgba(99,102,241,0.4)]",
    cloudBaseBorder: "border border-indigo-300/25",
    cloudTopGradient: "from-[#f5f3ff] to-[#c084fc]",
    cloudShoulderGradient: "from-[#ede9fe] via-[#9333ea] to-[#312e81]",
    cloudHighlightColor: "bg-[#ffffff]/70",
    cloudTintGradient: "bg-gradient-to-t from-[#8b5cf6]/40 to-transparent",
    particleType: "astral_cosmic_stars",
  },
  frost: {
    id: "frost",
    name: "Plano Helado (Glaciar & Ventisca)",
    planeTitle: "Planos Helados • Reino de la Escarcha",
    portalSubtitle: "Atravesando la Ventisca Boreal y Glaciares de Hielo Puro",
    icon: "❄️",
    accentColor: "#38bdf8",
    backdropBg: "bg-[#051724]/80",
    centralBurst: "radial-gradient(circle, rgba(224,242,254,0.6) 0%, rgba(56,189,248,0.25) 50%, transparent 100%)",
    cloudBellyShadow: "bg-[#083344]/45",
    cloudBaseGradient: "bg-gradient-to-b from-[#ffffff] via-[#e0f7fa] to-[#67e8f9]",
    cloudBaseShadow: "shadow-[inset_0_-10px_22px_rgba(6,182,212,0.35)]",
    cloudBaseBorder: "border border-cyan-100/40",
    cloudTopGradient: "from-[#ffffff] to-[#cffafe]",
    cloudShoulderGradient: "from-[#ffffff] via-[#e0f2fe] to-[#22d3ee]",
    cloudHighlightColor: "bg-[#ffffff]/85",
    cloudTintGradient: "bg-gradient-to-t from-[#06b6d4]/30 to-transparent",
    particleType: "frost_crystalline_snow",
  },
  classic: {
    id: "classic",
    name: "Pergamino Cartográfico Clásico",
    planeTitle: "Viaje Cartográfico",
    portalSubtitle: "Desplegando Cartografía y Nuevos Horizontes Tácticos",
    icon: "🗺️",
    accentColor: "#d4a017",
    backdropBg: "bg-[#160f0a]/60",
    centralBurst: "radial-gradient(circle, rgba(217,119,6,0.3) 0%, rgba(139,92,26,0.06) 50%, transparent 100%)",
    cloudBellyShadow: "bg-[#24170d]/25",
    cloudBaseGradient: "bg-gradient-to-b from-[#fdfbf7] via-[#f7ebcf] to-[#e9cfa4]",
    cloudBaseShadow: "shadow-[inset_0_-10px_20px_rgba(84,59,39,0.18)]",
    cloudTopGradient: "from-[#fdfbf7] to-[#f7ebcf]",
    cloudShoulderGradient: "from-[#fdfbf7] via-[#f7ebcf] to-[#e9cfa4]",
    cloudHighlightColor: "bg-[#fffefa]/50",
    cloudTintGradient: "bg-gradient-to-t from-[#825c3a]/20 to-transparent",
    particleType: "classic_gold_compass",
  },
};

export const PLANAR_THEME_SELECT_OPTIONS: Array<{ value: TransitionTheme; label: string; icon: string }> = [
  { value: "auto", label: "Auto (Detectar por plano / nombre)", icon: "✨" },
  { value: "feywild", label: "Feywild (Nubes Rosadas & Polvo de Hadas)", icon: "🌸" },
  { value: "fire", label: "Plano de Fuego (Ceniza Volcánica & Brasas)", icon: "🔥" },
  { value: "water", label: "Plano de Agua (Marea Oceánica & Burbujas)", icon: "🌊" },
  { value: "air", label: "Plano del Aire (Vórtice Celeste & Viento)", icon: "🌪️" },
  { value: "earth", label: "Plano de la Tierra (Polvo de Arena & Rocas)", icon: "⛰️" },
  { value: "shadowfell", label: "Shadowfell (Niebla Espectral & Sombras)", icon: "👁️" },
  { value: "astral", label: "Plano Astral (Nebulosa Cósmica & Estrellas)", icon: "🌌" },
  { value: "frost", label: "Plano Helado (Glaciar & Ventisca Nevada)", icon: "❄️" },
  { value: "classic", label: "Clásico (Pergamino Cartográfico Dorado)", icon: "🗺️" },
];

/**
 * Returns the default classic parchment cloud transition theme.
 * Planar and map-specific variations have been disabled per user request.
 */
export function detectPlanarTheme(
  _map?: Map | null,
  _folder?: Folder | null,
  _parentFolder?: Folder | null
): ResolvedPlanarTheme {
  return "classic";
}

