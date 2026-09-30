export type TransitionTheme =
  | "auto"
  | "classic"
  | "feywild"
  | "fire"
  | "water"
  | "air"
  | "earth"
  | "shadowfell"
  | "astral"
  | "frost";

export interface Folder {
  id: string;
  name: string;
  color?: string;
  order?: number;
  parent_id?: string;
  transition_theme?: TransitionTheme;
}

export interface Map {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  parent_map_id?: string;
  transition_theme?: TransitionTheme;
  initial_zoom?: number;
  weather_effect?: string; // "none" | "snow" | "sand" | "petals_pink" | "leaves_green" | "leaves_orange"
  emissive_colors?: Array<{ color: string; similarity?: number }>;
  emissive_speed?: number;
  water_colors?: Array<{ color: string; similarity?: number; blend_mode?: string; wave_color?: string }>;
  water_speed?: number;
  water_wave_color?: string;
  water_blend_mode?: string;
  water_opacity?: number;
  water_intensity?: number;
  water_angle?: number;
  wind_colors?: Array<{ color: string; similarity?: number }>;
  wind_fixed_colors?: any[];
  wind_zones?: WindZone[];
  wind_mask_image?: string; // Base64 PNG mask of painted brush areas
  wind_mask_mode?: "all" | "painted_only";
  wind_speed?: number;
  wind_strength?: number;
  wind_enabled?: boolean;
  wind_angle?: number;
  wind_gusts?: number;
  folder_id?: string;
  order?: number;
  created_date?: string;
  wall_color?: string;
  wall_color_tolerance?: number;
  wall_colors_v2?: Array<{ color: string; tolerance?: number }>;
  wall_colors?: Array<{ color: string; tolerance?: number; similarity?: number }>;
  manual_walls?: any[];
  weather_effects_v2?: WeatherEffectConfig[];
  music_url?: string;
  darkness?: number; // 0 (day) to 1.0 (pitch black night)
  darkness_color?: string; // Hex color for darkness tint (default #191726)
  desaturation?: number; // 0 to 100% desaturation in darkness
  ambient_sound?: string; // Foundry procedural ambient preset or URL
  ambient_volume?: number; // 0 to 100%
  moving_parts?: MovingPart[];
  ai_animation_layers?: AIAnimationLayer[];
  ai_global_adjustments?: AIGlobalAdjustments;
  ai_animation_prompt?: string;
}

export interface AIAnimationLayer {
  name: string;
  type: "portal_vortex" | "lava_flow" | "fire_embers" | "storm_lightning" | "mist_smoke" | "water_ripples" | "glowing_runes" | "custom_glow" | "color_shift" | "rain_particles" | "snow_particles";
  color: string;
  secondary_color?: string;
  opacity?: number;
  blend_mode?: "screen" | "overlay" | "color-dodge" | "multiply" | "source-over";
  coordinates?: Array<{ x: number; y: number }>;
  radius?: number;
  particle_count?: number;
  glow_intensity?: number;
  frame_values: number[]; // exactly 30 values
}

export interface AIGlobalAdjustments {
  brightness_30_frames?: number[];
  contrast_30_frames?: number[];
  hue_rotate_30_frames?: number[];
  shake_x_30_frames?: number[];
  shake_y_30_frames?: number[];
}

export interface MovingPart {
  id: string;
  name: string;
  x: number; // percentage coordinate (0-100)
  y: number; // percentage coordinate (0-100)
  radius: number; // radius in percentage of map width (1-50)
  type: "rotation_cw" | "rotation_ccw" | "sway" | "pulse" | "wind_flutter" | "linear_x" | "linear_y" | "orbit" | "bounce" | "wiggle";
  speed: number; // speed multiplier (1-10)
  angle?: number; // starting angle in degrees (0-360)
  use_color_mask?: boolean;
  mask_color?: string; // Hex color to isolate
  mask_tolerance?: number; // 5-100
}

export interface WeatherEffectConfig {
  id: string;
  effect: string; // "snow" | "sand" | "petals_pink" | "leaves_green" | "leaves_orange" | "birds" | "flies" | "rats" | custom
  quantity: number; // 10 to 200 %
  scale: number; // 0.5 to 3.0
  speed: number; // 0.1 to 3.0
  avoid_color?: string; // hex color code
  avoid_color_tolerance?: number; // 5 to 80
  avoid_colors?: Array<{ color: string; tolerance?: number }>;
  custom_name?: string;
  custom_emoji?: string;
  custom_color?: string;
  custom_shape?: string;
  custom_vx?: number;
  custom_vy?: number;
  custom_rot_speed?: number;
  custom_wind?: boolean;
  creature_body?: "quadruped" | "winged" | "insect" | "serpentine" | "ghostly" | "spherical";
  creature_legs?: number;
  creature_wings?: number;
  creature_tail?: boolean;
  creature_glow?: boolean;
  creature_head_shape?: "pointed" | "round" | "horned";
  custom_secondary_color?: string;
  glow_intensity?: number;
  has_trail?: boolean;
  trail_length?: number;
  trail_color?: string;
  animation_style?: "float" | "vortex" | "pulse" | "bounce" | "zigzag" | "linear";
  ripple_effect?: boolean;
  particle_type?: "sparkle" | "circle" | "dust" | "star" | "triangle" | "rune" | "cross";
  shading_detail?: boolean;
  pulse_speed?: number;

  // Foundry VTT Standard Weather Parameters
  label?: string;
  density?: number;
  direction?: number;
  opacity?: number;
  tint?: string;
  occlusion?: boolean;
  soundTrack?: string;

  // Unity 6 Particle System Engine Modules
  unity_enabled?: boolean;
  duration?: number; // duration in seconds
  looping?: boolean;
  start_lifetime_min?: number; // min lifetime in seconds
  start_lifetime_max?: number; // max lifetime in seconds
  start_speed_min?: number; // min initial speed
  start_speed_max?: number; // max initial speed
  start_size_min?: number; // min initial size in px
  start_size_max?: number; // max initial size in px
  start_rotation_min?: number; // 0 - 360 deg
  start_rotation_max?: number; // 0 - 360 deg
  start_rotation_speed?: number; // -180 to 180 deg/s
  start_color?: string; // Hex / rgb
  start_color_2?: string; // Hex for random between two colors
  gravity_modifier?: number; // -2.0 (buoyancy) to 2.0 (downward gravity)
  simulation_speed?: number; // 0.1 to 3.0
  max_particles?: number; // 10 to 400

  // Emission Module
  rate_over_time?: number; // particles emitted per second (1 to 150)
  burst_count?: number; // burst quantity (0 to 50)
  burst_interval?: number; // burst interval in seconds (0.5 to 10.0)

  // Shape / Emitter Module
  emitter_shape?: "box" | "cone" | "circle" | "point" | "edge";
  emitter_x?: number; // 0 - 100% of map
  emitter_y?: number; // 0 - 100% of map
  emitter_radius?: number; // in % (1 - 50)
  emitter_angle?: number; // 0 - 360 degrees (for cone direction)
  emitter_spread?: number; // 0 - 180 degrees (cone arc angle)

  // Velocity over Lifetime & Forces
  velocity_x?: number; // linear vx (-5 to 5)
  velocity_y?: number; // linear vy (-5 to 5)
  orbital_velocity?: number; // vortex/orbital speed around emitter (-5 to 5)
  radial_velocity?: number; // radial expansion/contraction (-5 to 5)
  drag?: number; // air resistance dampening (0 to 0.8)

  // Noise / Turbulence (Unity 6 VFX noise module)
  noise_enabled?: boolean;
  noise_strength?: number; // 0 to 8
  noise_frequency?: number; // 0.2 to 5.0
  noise_octaves?: number; // 1 to 3
  noise_speed?: number; // 0.1 to 3.0

  // Color & Alpha over Lifetime
  color_over_lifetime_enabled?: boolean;
  end_color?: string; // Hex / rgba
  mid_color?: string; // Optional middle gradient
  alpha_curve?: "fade_in_out" | "fade_out" | "fade_in" | "constant" | "pulse" | "bell";
  blend_mode?: "additive" | "screen" | "normal" | "multiply";

  // Size over Lifetime
  size_curve?: "constant" | "grow" | "shrink" | "bell" | "pulse";

  // Renderer & Sprites
  render_mode?: "glow_orb" | "spark" | "ember" | "smoke_blob" | "rain_streak" | "snowflake" | "star" | "crystal" | "leaf" | "petal" | "rune" | "bubble" | "feather" | "emoji" | "creature";
  trail_width_decay?: number;

  // Collision & Sub-emitters
  collision_mode?: "none" | "floor_splash" | "floor_bounce" | "color_mask_avoid";
  splash_count?: number;
}

export interface Layer {
  id: string;
  name: string;
  map_id: string;
  visible?: boolean;
  color?: string;
}

export interface Marker {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  image?: string;
  category: "general" | "region" | "layer" | "ambient" | "painted_zone";
  layer_id?: string;
  linked_map_id?: string;
  area_radius?: number; // percentage coordinate (for circular areas)
  area_points?: Array<{ x: number; y: number }>; // Percentage coordinates (0-100) for freehand / polygon painted area
  area_color?: string; // Hex color for the painted zone fill and glow outline
  area_opacity?: number; // Opacity of the painted zone fill (0.1 - 1.0)
  area_type?: "none" | "circle" | "painted";
  map_id: string;
  x: number; // percentage coordinate
  y: number; // percentage coordinate
}

export interface Light {
  id: string;
  type: "torch" | "magic" | "cold" | "moon" | "point" | "directional";
  color?: string;
  intensity?: number;
  radius?: number; // size in vw
  falloff?: number; // 0-100
  core_opacity?: number; // 0-100 (% opacidad del punto blanco central, 0 = invisible)
  map_id: string;
  x: number; // percentage coordinate
  y: number; // percentage coordinate
  area?: number;
  angle?: number;
  spread?: number;
}

export interface Wall {
  id: string;
  map_id: string;
  x1: number; // percentage coordinate
  y1: number; // percentage coordinate
  x2: number; // percentage coordinate
  y2: number; // percentage coordinate
}

export interface WindZone {
  id: string;
  name: string;
  points: Array<{ x: number; y: number }>; // Percentage coordinates (0-100)
  color?: string; // Hex color sampled during selection
  tolerance?: number; // 5-100% tolerance for color inside zone
  enabled?: boolean; // toggle whether this zone is active
}

