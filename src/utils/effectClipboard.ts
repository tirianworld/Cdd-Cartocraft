import { Map, WeatherEffectConfig, WindZone, MovingPart, AIAnimationLayer, AIGlobalAdjustments } from "../types";

export interface EffectPackage {
  sourceMapId?: string;
  sourceMapName?: string;
  timestamp: number;

  // Weather & Foundry Particles
  weather_effects_v2?: WeatherEffectConfig[];
  weather_effect?: string;

  // Water Simulation & Waves
  water_colors?: Array<{ color: string; similarity?: number; blend_mode?: string; wave_color?: string }>;
  water_speed?: number;
  water_wave_color?: string;
  water_blend_mode?: string;
  water_opacity?: number;
  water_intensity?: number;
  water_angle?: number;

  // Foundry Darkness & Scene Illumination
  darkness?: number;
  darkness_color?: string;
  desaturation?: number;

  // Ambient Sound & Music
  ambient_sound?: string;
  ambient_volume?: number;
  music_url?: string;

  // Emissive Glow
  emissive_colors?: Array<{ color: string; similarity?: number }>;
  emissive_speed?: number;

  // Wind Simulation
  wind_colors?: Array<{ color: string; similarity?: number }>;
  wind_zones?: WindZone[];
  wind_mask_image?: string;
  wind_mask_mode?: "all" | "painted_only";
  wind_speed?: number;
  wind_strength?: number;
  wind_enabled?: boolean;
  wind_angle?: number;
  wind_gusts?: number;

  // AI & Mechanical Animation
  moving_parts?: MovingPart[];
  ai_animation_layers?: AIAnimationLayer[];
  ai_global_adjustments?: AIGlobalAdjustments;
  ai_animation_prompt?: string;
}

export interface EffectPasteOptions {
  pasteWeather?: boolean;
  pasteWater?: boolean;
  pasteDarkness?: boolean;
  pasteAudio?: boolean;
  pasteEmissive?: boolean;
  pasteWind?: boolean;
  pasteMechanical?: boolean;
}

const STORAGE_KEY = "cartocraft_effects_clipboard_v1";

/**
 * Pure extractor: copies all visual effects, water shaders, illumination, sound, and animations from a map without side-effects.
 */
export function extractEffectsFromMap(map: Map): EffectPackage {
  return {
    sourceMapId: map.id,
    sourceMapName: map.name || "Mapa",
    timestamp: Date.now(),

    // Weather & particles
    weather_effects_v2: map.weather_effects_v2 ? JSON.parse(JSON.stringify(map.weather_effects_v2)) : undefined,
    weather_effect: map.weather_effect,

    // Water
    water_colors: map.water_colors ? JSON.parse(JSON.stringify(map.water_colors)) : undefined,
    water_speed: map.water_speed,
    water_wave_color: map.water_wave_color,
    water_blend_mode: map.water_blend_mode,
    water_opacity: map.water_opacity,
    water_intensity: map.water_intensity,
    water_angle: map.water_angle,

    // Darkness & Lighting
    darkness: map.darkness,
    darkness_color: map.darkness_color,
    desaturation: map.desaturation,

    // Audio
    ambient_sound: map.ambient_sound,
    ambient_volume: map.ambient_volume,
    music_url: map.music_url,

    // Emissive
    emissive_colors: map.emissive_colors ? JSON.parse(JSON.stringify(map.emissive_colors)) : undefined,
    emissive_speed: map.emissive_speed,

    // Wind
    wind_colors: map.wind_colors ? JSON.parse(JSON.stringify(map.wind_colors)) : undefined,
    wind_zones: map.wind_zones ? JSON.parse(JSON.stringify(map.wind_zones)) : undefined,
    wind_mask_image: map.wind_mask_image,
    wind_mask_mode: map.wind_mask_mode,
    wind_speed: map.wind_speed,
    wind_strength: map.wind_strength,
    wind_enabled: map.wind_enabled,
    wind_angle: map.wind_angle,
    wind_gusts: map.wind_gusts,

    // Animation & AI
    moving_parts: map.moving_parts ? JSON.parse(JSON.stringify(map.moving_parts)) : undefined,
    ai_animation_layers: map.ai_animation_layers ? JSON.parse(JSON.stringify(map.ai_animation_layers)) : undefined,
    ai_global_adjustments: map.ai_global_adjustments ? JSON.parse(JSON.stringify(map.ai_global_adjustments)) : undefined,
    ai_animation_prompt: map.ai_animation_prompt,
  };
}

/**
 * Copies all visual effects from a map to localStorage and dispatches change event.
 */
export function copyEffectsFromMap(map: Map): EffectPackage {
  const pkg = extractEffectsFromMap(map);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pkg));
    window.dispatchEvent(new CustomEvent("cartocraft_effects_clipboard_change", { detail: pkg }));
  } catch (err) {
    console.error("Error saving effect package to localStorage:", err);
  }

  return pkg;
}

/**
 * Retrieves the currently copied effect package from localStorage.
 */
export function getStoredEffectPackage(): EffectPackage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EffectPackage;
  } catch {
    return null;
  }
}

/**
 * Clears the stored effects from clipboard.
 */
export function clearStoredEffects(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cartocraft_effects_clipboard_change", { detail: null }));
  } catch (err) {
    console.error("Error clearing effect clipboard:", err);
  }
}

/**
 * Prepares the partial Map update object when pasting copied effects onto a target map.
 */
export function getPastedEffectsMapUpdate(
  pkg: EffectPackage,
  options: EffectPasteOptions = {
    pasteWeather: true,
    pasteWater: true,
    pasteDarkness: true,
    pasteAudio: true,
    pasteEmissive: true,
    pasteWind: true,
    pasteMechanical: true,
  }
): Partial<Map> {
  const updates: Partial<Map> = {};

  if (options.pasteWeather) {
    if (pkg.weather_effects_v2 !== undefined) {
      updates.weather_effects_v2 = JSON.parse(JSON.stringify(pkg.weather_effects_v2));
    }
    if (pkg.weather_effect !== undefined) {
      updates.weather_effect = pkg.weather_effect;
    }
  }

  if (options.pasteWater) {
    if (pkg.water_colors !== undefined) {
      updates.water_colors = JSON.parse(JSON.stringify(pkg.water_colors));
    }
    if (pkg.water_speed !== undefined) updates.water_speed = pkg.water_speed;
    if (pkg.water_wave_color !== undefined) updates.water_wave_color = pkg.water_wave_color;
    if (pkg.water_blend_mode !== undefined) updates.water_blend_mode = pkg.water_blend_mode;
    if (pkg.water_opacity !== undefined) updates.water_opacity = pkg.water_opacity;
    if (pkg.water_intensity !== undefined) updates.water_intensity = pkg.water_intensity;
    if (pkg.water_angle !== undefined) updates.water_angle = pkg.water_angle;
  }

  if (options.pasteDarkness) {
    if (pkg.darkness !== undefined) updates.darkness = pkg.darkness;
    if (pkg.darkness_color !== undefined) updates.darkness_color = pkg.darkness_color;
    if (pkg.desaturation !== undefined) updates.desaturation = pkg.desaturation;
  }

  if (options.pasteAudio) {
    if (pkg.ambient_sound !== undefined) updates.ambient_sound = pkg.ambient_sound;
    if (pkg.ambient_volume !== undefined) updates.ambient_volume = pkg.ambient_volume;
    if (pkg.music_url !== undefined) updates.music_url = pkg.music_url;
  }

  if (options.pasteEmissive) {
    if (pkg.emissive_colors !== undefined) {
      updates.emissive_colors = JSON.parse(JSON.stringify(pkg.emissive_colors));
    }
    if (pkg.emissive_speed !== undefined) updates.emissive_speed = pkg.emissive_speed;
  }

  if (options.pasteWind) {
    if (pkg.wind_colors !== undefined) {
      updates.wind_colors = JSON.parse(JSON.stringify(pkg.wind_colors));
    }
    if (pkg.wind_zones !== undefined) {
      updates.wind_zones = JSON.parse(JSON.stringify(pkg.wind_zones));
    }
    if (pkg.wind_mask_image !== undefined) updates.wind_mask_image = pkg.wind_mask_image;
    if (pkg.wind_mask_mode !== undefined) updates.wind_mask_mode = pkg.wind_mask_mode;
    if (pkg.wind_speed !== undefined) updates.wind_speed = pkg.wind_speed;
    if (pkg.wind_strength !== undefined) updates.wind_strength = pkg.wind_strength;
    if (pkg.wind_enabled !== undefined) updates.wind_enabled = pkg.wind_enabled;
    if (pkg.wind_angle !== undefined) updates.wind_angle = pkg.wind_angle;
    if (pkg.wind_gusts !== undefined) updates.wind_gusts = pkg.wind_gusts;
  }

  if (options.pasteMechanical) {
    if (pkg.moving_parts !== undefined) {
      updates.moving_parts = JSON.parse(JSON.stringify(pkg.moving_parts));
    }
    if (pkg.ai_animation_layers !== undefined) {
      updates.ai_animation_layers = JSON.parse(JSON.stringify(pkg.ai_animation_layers));
    }
    if (pkg.ai_global_adjustments !== undefined) {
      updates.ai_global_adjustments = JSON.parse(JSON.stringify(pkg.ai_global_adjustments));
    }
    if (pkg.ai_animation_prompt !== undefined) {
      updates.ai_animation_prompt = pkg.ai_animation_prompt;
    }
  }

  return updates;
}

/**
 * Returns human-readable summary tags of the contents inside an effect package.
 */
export function getEffectPackageSummary(pkg: EffectPackage): string[] {
  const tags: string[] = [];

  const weatherCount = pkg.weather_effects_v2?.length || (pkg.weather_effect && pkg.weather_effect !== "none" ? 1 : 0);
  if (weatherCount > 0) {
    tags.push(`${weatherCount} capa${weatherCount > 1 ? "s" : ""} de clima`);
  }

  const waterColorsCount = pkg.water_colors?.length || 0;
  if (waterColorsCount > 0) {
    tags.push(`${waterColorsCount} color${waterColorsCount > 1 ? "es" : ""} de agua`);
  }

  if (pkg.darkness && pkg.darkness > 0) {
    tags.push(`Oscuridad (${Math.round(pkg.darkness * 100)}%)`);
  }

  if (pkg.ambient_sound && pkg.ambient_sound !== "none") {
    tags.push(`Audio: ${pkg.ambient_sound}`);
  }

  const emissiveCount = pkg.emissive_colors?.length || 0;
  if (emissiveCount > 0) {
    tags.push(`${emissiveCount} resplandor${emissiveCount > 1 ? "es" : ""}`);
  }

  if (pkg.wind_enabled || (pkg.wind_colors && pkg.wind_colors.length > 0)) {
    tags.push(`Viento dinámico`);
  }

  const partsCount = pkg.moving_parts?.length || 0;
  if (partsCount > 0) {
    tags.push(`${partsCount} animación mec.`);
  }

  return tags;
}
