import React, { useEffect, useRef } from "react";
import { WeatherEffectConfig, Wall } from "../types";

export interface FoundryParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  rotation: number;
  rotSpeed: number;
  pitch: number;
  pitchSpeed: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  effect: string;
  phase: number;
  lifetime: number;
  age: number;
  layer: number; // 0 = background, 1 = mid, 2 = foreground
  swayAmp: number;
  swayFreq: number;
  leafType?: number; // 0 = maple, 1 = oak, 2 = birch
  subType?: number;
  wingPhase?: number;
  trail?: Array<{ x: number; y: number; alpha: number; size: number }>;
}

export interface SubEmitterSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
  droplets?: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }>;
}

export interface LightningBolt {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>;
  branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>>;
  intensity: number;
  decay: number;
  color: string;
}

export interface LightningFlash {
  intensity: number; // 0 to 1
  decay: number;
  color: string;
  bolt?: LightningBolt | null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const clean = hex.trim();
  if (clean.startsWith("rgb")) {
    const match = clean.match(/\d+/g);
    if (match && match.length >= 3) {
      return { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) };
    }
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(clean);
  if (shortResult) {
    return {
      r: parseInt(shortResult[1] + shortResult[1], 16),
      g: parseInt(shortResult[2] + shortResult[2], 16),
      b: parseInt(shortResult[3] + shortResult[3], 16),
    };
  }
  return null;
}

export function colorsAreSimilar(
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

// ----------------- FOUNDRY VTT ADVANCED SPRITE & PARTICLE RENDERING -----------------

/**
 * 1. Fractal Dendritic Snowflake & Frost Star Sprite
 * Far away (layer 0): Soft glowing bokeh frost orb with atmospheric falloff.
 * Mid-distance (layer 1): 6-branch crystalline star with fine side-needles.
 * Close-up (layer 2): Intricate dendritic fractal ice crystal with 3D tilt and facet shimmer.
 */
export function drawFoundrySnowflake(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  layer: number,
  phase: number = 0,
  pitch: number = 0
) {
  ctx.save();
  const rgb = hexToRgb(color) || { r: 240, g: 248, b: 255 };

  if (layer === 0) {
    // Soft distant bokeh frost orb with gentle radial falloff
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.9);
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`);
    grad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 3D perspective pitch tilt
  const scaleX = 0.65 + 0.35 * Math.abs(Math.cos(pitch));
  ctx.scale(scaleX, 1);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.7, size * 0.1);
  ctx.lineCap = "round";

  // Hexagonal crystalline stellar core
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const r = size * 0.22;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Draw 6 symmetrical fractal dendritic crystal branches
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);

    // Primary V-side needles
    const s1 = size * 0.68;
    ctx.moveTo(0, s1);
    ctx.lineTo(size * 0.34, s1 + size * 0.18);
    ctx.moveTo(0, s1);
    ctx.lineTo(-size * 0.34, s1 + size * 0.18);

    // Secondary V-side needles
    const s2 = size * 0.38;
    ctx.moveTo(0, s2);
    ctx.lineTo(size * 0.24, s2 + size * 0.14);
    ctx.moveTo(0, s2);
    ctx.lineTo(-size * 0.24, s2 + size * 0.14);

    if (layer === 2) {
      // Tertiary fine ice spikes for close foreground flakes
      const s3 = size * 0.88;
      ctx.moveTo(0, s3);
      ctx.lineTo(size * 0.14, s3 + size * 0.08);
      ctx.moveTo(0, s3);
      ctx.lineTo(-size * 0.14, s3 + size * 0.08);
    }
    ctx.stroke();
  }

  // Sparkling crystalline facet center glint
  const glint = 0.5 + 0.5 * Math.sin(phase * 4);
  if (glint > 0.65) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.14 * glint, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 2. High-Velocity Aerodynamic Rain Needle with Droplet Refraction Head
 */
export function drawFoundryRainStreak(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  vx: number,
  vy: number
) {
  ctx.save();
  const angle = Math.atan2(vy, vx);
  ctx.rotate(angle);
  const speed = Math.sqrt(vx * vx + vy * vy);
  const length = Math.max(size * 2.5, speed * 3.4);

  const rgb = hexToRgb(color) || { r: 208, g: 232, b: 238 };

  // Fluid tapered needle gradient with bright leading droplet head
  const grad = ctx.createLinearGradient(-length, 0, 0, 0);
  grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  grad.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`);
  grad.addColorStop(0.92, `rgba(255, 255, 255, 0.95)`);
  grad.addColorStop(1, `#ffffff`);

  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(0.9, size * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-length, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Tiny leading droplet refraction bead
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.18, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 3. Botanical Autumn Maple, Oak & Birch Leaf Sprites with Aerodynamic 3D Tumbling
 */
export function drawFoundryLeaf(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  leafType: number = 0,
  pitch: number = 0
) {
  ctx.save();
  // 3D Pitch perspective compression simulating air roll
  const scaleX = Math.cos(pitch);
  ctx.scale(scaleX, 1);

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(45, 20, 10, 0.5)";
  ctx.lineWidth = Math.max(0.6, size * 0.05);

  if (leafType === 0) {
    // 5-Lobed Autumn Canadian Maple Leaf
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.25);
    ctx.lineTo(size * 0.32, -size * 0.65);
    ctx.lineTo(size * 0.88, -size * 0.7);
    ctx.lineTo(size * 0.48, -size * 0.22);
    ctx.lineTo(size * 0.95, size * 0.22);
    ctx.lineTo(size * 0.42, size * 0.46);
    ctx.lineTo(size * 0.62, size * 0.88);
    ctx.lineTo(0, size * 0.68); // Stem base
    ctx.lineTo(-size * 0.62, size * 0.88);
    ctx.lineTo(-size * 0.42, size * 0.46);
    ctx.lineTo(-size * 0.95, size * 0.22);
    ctx.lineTo(-size * 0.48, -size * 0.22);
    ctx.lineTo(-size * 0.88, -size * 0.7);
    ctx.lineTo(-size * 0.32, -size * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Stem & Branching Veins
    ctx.beginPath();
    ctx.moveTo(0, size * 0.95);
    ctx.lineTo(0, -size * 0.95);
    // Side veins
    ctx.moveTo(0, -size * 0.1);
    ctx.lineTo(size * 0.5, -size * 0.4);
    ctx.moveTo(0, -size * 0.1);
    ctx.lineTo(-size * 0.5, -size * 0.4);
    ctx.moveTo(0, size * 0.25);
    ctx.lineTo(size * 0.45, size * 0.45);
    ctx.moveTo(0, size * 0.25);
    ctx.lineTo(-size * 0.45, size * 0.45);
    ctx.stroke();
  } else if (leafType === 1) {
    // Lobed Autumn Oak Leaf
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.15);
    ctx.quadraticCurveTo(size * 0.55, -size * 0.85, size * 0.32, -size * 0.5);
    ctx.quadraticCurveTo(size * 0.8, -size * 0.22, size * 0.42, 0.12);
    ctx.quadraticCurveTo(size * 0.72, size * 0.52, size * 0.22, 0.82);
    ctx.lineTo(0, size * 1.15);
    ctx.lineTo(-size * 0.22, size * 0.82);
    ctx.quadraticCurveTo(-size * 0.72, size * 0.52, -size * 0.42, 0.12);
    ctx.quadraticCurveTo(-size * 0.8, -size * 0.22, -size * 0.32, -size * 0.5);
    ctx.quadraticCurveTo(-size * 0.55, -size * 0.85, 0, -size * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Oak Stem Vein
    ctx.beginPath();
    ctx.moveTo(0, size * 1.25);
    ctx.lineTo(0, -size * 0.9);
    ctx.stroke();
  } else {
    // Teardrop Birch / Aspen Leaf
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.quadraticCurveTo(size * 0.85, -size * 0.25, 0, size * 0.92);
    ctx.quadraticCurveTo(-size * 0.85, -size * 0.25, 0, -size * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, size * 1.1);
    ctx.lineTo(0, -size * 0.95);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 4. Delicate Notched Cherry Blossom (Sakura) Petal with Blushing Gradient
 */
export function drawFoundrySakuraPetal(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  pitch: number = 0
) {
  ctx.save();
  const scaleX = Math.cos(pitch);
  ctx.scale(scaleX, 1);

  // Soft petal radial blush gradient
  const grad = ctx.createRadialGradient(0, size * 0.3, 0, 0, 0, size * 1.1);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, "rgba(224, 86, 253, 0.75)");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.bezierCurveTo(-size * 0.85, size * 0.2, -size * 0.7, -size * 0.8, -size * 0.16, -size * 1.1);
  // Elegant notched tip characteristic of authentic sakura petals
  ctx.lineTo(0, -size * 0.9);
  ctx.lineTo(size * 0.16, -size * 1.1);
  ctx.bezierCurveTo(size * 0.7, -size * 0.8, size * 0.85, size * 0.2, 0, size);
  ctx.closePath();
  ctx.fill();

  // Subtle translucent stem base tone
  ctx.fillStyle = "rgba(255, 180, 200, 0.5)";
  ctx.beginPath();
  ctx.arc(0, size * 0.75, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 5. Organic Molten Ember & Cinder Particle (Fluid, Non-Geometric)
 * Replaces the old rigid 5-sided polygon with a dynamic molten core, radiant heat halo,
 * crackling incandescence, and micro-spark trails.
 */
export function drawFoundryEmber(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0,
  trail?: Array<{ x: number; y: number; alpha: number; size: number }>
) {
  ctx.save();

  // Radiant atmospheric thermal heat glow (screen blending)
  const glowRad = size * 2.8;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.2, "#fff176");
  grad.addColorStop(0.45, color);
  grad.addColorStop(0.75, "rgba(255, 69, 0, 0.35)");
  grad.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
  ctx.fill();

  // Organic molten cinder body - computed with smooth harmonic wave distortion (never a rigid polygon)
  ctx.beginPath();
  const numSteps = 16;
  for (let i = 0; i <= numSteps; i++) {
    const angle = (i / numSteps) * Math.PI * 2;
    // Harmonic turbulence deformations
    const rVar =
      0.78 +
      0.16 * Math.sin(angle * 3 + phase * 2.5) +
      0.09 * Math.cos(angle * 5 - phase * 1.8);
    const r = size * rVar;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Intense incandescent white-yellow thermal core
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
  coreGrad.addColorStop(0, "#ffffff");
  coreGrad.addColorStop(0.6, "#fff9c4");
  coreGrad.addColorStop(1, "rgba(255, 167, 38, 0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Tiny crackling carbon crust fleck
  const crustAngle = phase * 1.5;
  const crustR = size * 0.45;
  ctx.fillStyle = "rgba(40, 15, 5, 0.75)";
  ctx.beginPath();
  ctx.arc(Math.cos(crustAngle) * crustR, Math.sin(crustAngle) * crustR, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 6. Living Animated Bioluminescent Firefly (Photinus Pyralis)
 * Replaces the old two-circle shape with an anatomical insect body, beating translucent wings
 * (fluttering at 25Hz), breathing bio-lantern abdomen, and soft ambient phosphorescence.
 */
export function drawFoundryFirefly(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0,
  wingPhase: number = 0
) {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  const glowRad = size * 3.6 * (0.8 + 0.4 * pulse);

  // Soft spherical bioluminescent atmospheric lantern halo
  const rgb = hexToRgb(color) || { r: 190, g: 242, b: 100 };
  const grad = ctx.createRadialGradient(0, size * 0.35, 0, 0, size * 0.35, glowRad);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`);
  grad.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, size * 0.35, glowRad, 0, Math.PI * 2);
  ctx.fill();

  // Rapidly fluttering membranous wings (beating at rapid frequency)
  const wingAngle = Math.sin(wingPhase) * 0.85;
  ctx.save();
  ctx.translate(0, -size * 0.1);

  // Left wing
  ctx.save();
  ctx.rotate(-0.35 - wingAngle);
  ctx.fillStyle = "rgba(235, 245, 255, 0.45)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.ellipse(-size * 0.85, 0, size * 0.9, size * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.rotate(0.35 + wingAngle);
  ctx.fillStyle = "rgba(235, 245, 255, 0.45)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.ellipse(size * 0.85, 0, size * 0.9, size * 0.32, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // Anatomical Chitin Insect Body: Head, Thorax, Abdomen
  // Head
  ctx.fillStyle = "#1c1917";
  ctx.beginPath();
  ctx.arc(0, -size * 0.6, size * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Thorax
  ctx.fillStyle = "#292524";
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.15, size * 0.32, size * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Luminous glowing bio-lantern abdomen (photophore)
  const abdoGrad = ctx.createRadialGradient(0, size * 0.4, 0, 0, size * 0.4, size * 0.65);
  abdoGrad.addColorStop(0, "#ffffff");
  abdoGrad.addColorStop(0.4, color);
  abdoGrad.addColorStop(1, "rgba(68, 64, 60, 0.85)");
  ctx.fillStyle = abdoGrad;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.4, size * 0.42, size * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 7. Procedural Volumetric Fog, Mist Sheets & Atmospheric Cloud Vapor
 * Replaces hard geometric circles with smooth undulating Bézier mist tendrils,
 * multi-octave billowing fractal cloud banks, and soft ground fog.
 */
export function drawFoundryFogBlob(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  layer: number = 1,
  phase: number = 0
) {
  ctx.save();
  const rgb = hexToRgb(color) || { r: 203, g: 213, b: 225 };
  const baseColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},`;

  if (layer === 0) {
    // Layer 0: Ground Mist Blanket - wide, low-contrast, ultra-soft expansive floor mist with 5-stop gaussian decay
    ctx.scale(1.8, 0.65);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
    grad.addColorStop(0, `${baseColor} 0.36)`);
    grad.addColorStop(0.3, `${baseColor} 0.22)`);
    grad.addColorStop(0.65, `${baseColor} 0.08)`);
    grad.addColorStop(0.88, `${baseColor} 0.02)`);
    grad.addColorStop(1, `${baseColor} 0)`);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (layer === 2) {
    // Layer 2: Wispy Sinuous Mist Tendril - organic flowing ribbon with curved Bézier contours
    ctx.rotate(Math.sin(phase * 0.7) * 0.3);
    ctx.scale(2.2, 0.6);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    grad.addColorStop(0, `${baseColor} 0.38)`);
    grad.addColorStop(0.35, `${baseColor} 0.22)`);
    grad.addColorStop(0.75, `${baseColor} 0.05)`);
    grad.addColorStop(1, `${baseColor} 0)`);
    ctx.fillStyle = grad;

    // Smooth sinuous flowing vapor wisp
    ctx.beginPath();
    ctx.moveTo(-size * 1.4, 0);
    ctx.bezierCurveTo(-size * 0.7, -size * 0.9, size * 0.7, size * 0.9, size * 1.4, 0);
    ctx.bezierCurveTo(size * 0.7, -size * 0.8, -size * 0.7, size * 0.8, -size * 1.4, 0);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Layer 1: Volumetric Multi-Lobed Rolling Cloud Bank with feathered gaussian blend
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
  grad.addColorStop(0, `${baseColor} 0.42)`);
  grad.addColorStop(0.3, `${baseColor} 0.28)`);
  grad.addColorStop(0.65, `${baseColor} 0.12)`);
  grad.addColorStop(0.88, `${baseColor} 0.03)`);
  grad.addColorStop(1, `${baseColor} 0)`);
  ctx.fillStyle = grad;

  ctx.beginPath();
  // Central rolling core
  ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);

  // Billowing organic cloud lobes
  const numLobes = 7;
  for (let i = 0; i < numLobes; i++) {
    const angle = (i / numLobes) * Math.PI * 2 + Math.sin(phase + i) * 0.25;
    const dist = size * (0.45 + 0.18 * Math.sin(i * 2.1 + phase));
    const lobeRadius = size * (0.5 + 0.15 * Math.cos(i * 1.9 + phase));
    const lx = Math.cos(angle) * dist;
    const ly = Math.sin(angle) * dist;
    ctx.arc(lx, ly, lobeRadius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * 8. Volumetric Tyndall Sunbeams (God Rays) with Soft Radial Falloff & Floating Dust Motes
 * Replaces the flat geometric trapezoid with volumetric radiant light shafts, feathered gaussian edges,
 * and illuminated dancing atmospheric spores.
 */
export function drawFoundrySunbeam(
  ctx: CanvasRenderingContext2D,
  width: number,
  length: number,
  color: string,
  phase: number = 0
) {
  ctx.save();
  const rgb = hexToRgb(color) || { r: 254, g: 240, b: 138 };
  const baseColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},`;

  // Soft atmospheric feathered light shaft (zero hard angular borders)
  const grad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  grad.addColorStop(0, `${baseColor} 0)`);
  grad.addColorStop(0.18, `${baseColor} 0.18)`);
  grad.addColorStop(0.5, `${baseColor} 0.52)`);
  grad.addColorStop(0.82, `${baseColor} 0.18)`);
  grad.addColorStop(1, `${baseColor} 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-width * 0.25, 0);
  ctx.lineTo(width * 0.25, 0);
  ctx.lineTo(width * 1.25, length);
  ctx.lineTo(-width * 1.25, length);
  ctx.closePath();
  ctx.fill();

  // Floating illuminated dust motes and micro-spores inside the light beam
  const numMotes = 7;
  for (let i = 0; i < numMotes; i++) {
    const moteProgress = ((0.1 + i * 0.14 + Math.sin(phase * 0.6 + i * 1.4) * 0.08) % 1.0);
    const moteY = length * moteProgress;
    const spread = width * (0.2 + (moteY / length) * 0.8);
    const moteX = Math.sin(phase * 1.1 + i * 2.3) * spread * 0.55;
    const moteAlpha = 0.35 + 0.45 * Math.sin(phase * 1.8 + i * 1.7);
    const moteSize = 1.2 + 0.9 * Math.sin(i * 3);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, moteAlpha));
    // Soft illuminated glow around dust mote
    const moteGrad = ctx.createRadialGradient(moteX, moteY, 0, moteX, moteY, moteSize * 2.5);
    moteGrad.addColorStop(0, "#ffffff");
    moteGrad.addColorStop(0.4, `${baseColor} 0.8)`);
    moteGrad.addColorStop(1, `${baseColor} 0)`);
    ctx.fillStyle = moteGrad;
    ctx.beginPath();
    ctx.arc(moteX, moteY, moteSize * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 9. Fluid Aquatic Caustics & Pearlescent Floating Bubbles
 * Replaces flat stroke circles with undulating fluid caustics and wobbling water bubbles.
 */
export function drawFoundryBubble(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0
) {
  ctx.save();
  // Surface tension elasticity wobble (deforming slightly as it rises)
  const wobbleX = 1 + 0.12 * Math.sin(phase * 3);
  const wobbleY = 1 - 0.12 * Math.sin(phase * 3);
  ctx.scale(wobbleX, wobbleY);

  const rgb = hexToRgb(color) || { r: 56, g: 189, b: 248 };

  // Translucent pearlescent spherical meniscus
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
  ctx.lineWidth = Math.max(0.8, size * 0.1);
  const grad = ctx.createRadialGradient(-size * 0.25, -size * 0.25, size * 0.1, 0, 0, size);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  grad.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
  grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`);
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Curved specular reflection highlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-size * 0.38, -size * 0.38, size * 0.3, size * 0.14, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary faint lower rim refraction
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.ellipse(size * 0.28, size * 0.28, size * 0.18, size * 0.08, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 10. Turbulent Desert Sandstorm Grains & Dust Devil Whirlwind Streaks
 * Replaces the flat geometric ellipse with angular tumbling sand minerals,
 * micro-vortices, and sweeping wind ribbons.
 */
export function drawFoundrySandstorm(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0,
  vx: number = -15
) {
  ctx.save();
  ctx.fillStyle = color;

  // Angular crystalline sand mineral grain (irregular realistic grain)
  ctx.beginPath();
  const numCorners = 5;
  for (let i = 0; i < numCorners; i++) {
    const angle = (i / numCorners) * Math.PI * 2;
    const r = size * (0.7 + 0.35 * Math.sin(angle * 3 + phase));
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r * 0.65;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Trailing high-velocity wind dust streamer
  const streamLen = Math.abs(vx) * 1.8;
  const rgb = hexToRgb(color) || { r: 212, g: 163, b: 115 };
  const grad = ctx.createLinearGradient(0, 0, streamLen, 0);
  grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`);
  grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(0.6, size * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(streamLen, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * 11. Arcane Stardust, Magic Wisps & Rune Crystals
 * Mystical floating energy crystals with sparkling aura and trailing stardust.
 */
export function drawFoundryArcaneWisp(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0
) {
  ctx.save();
  const rgb = hexToRgb(color) || { r: 192, g: 132, b: 252 };

  // Pulsing mana aura corona
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2.5);
  const glowRad = size * (2.2 + 0.6 * pulse);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
  grad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
  ctx.fill();

  // 4-Pointed Arcane Stardust Diamond Core
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.2);
  ctx.lineTo(size * 0.35, 0);
  ctx.lineTo(0, size * 1.2);
  ctx.lineTo(-size * 0.35, 0);
  ctx.closePath();
  ctx.fill();

  // Orbital mana spark
  const orbAngle = phase * 3;
  const orbDist = size * 1.1;
  ctx.fillStyle = "#f3e8ff";
  ctx.beginPath();
  ctx.arc(Math.cos(orbAngle) * orbDist, Math.sin(orbAngle) * orbDist, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 12. Bioluminescent Fungal Spores & Enchanted Forest Pollen
 */
export function drawFoundrySpore(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  phase: number = 0
) {
  ctx.save();
  const rgb = hexToRgb(color) || { r: 52, g: 211, b: 153 };
  const pulse = 0.7 + 0.3 * Math.sin(phase * 2);

  // Soft fluorescent spore aura
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.4 * pulse);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Spore seed core
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Delicate microscopic spore hairs
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + phase;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

// ----------------- WEATHER COMPONENT -----------------

export interface WeatherEffectProps {
  effect?: string | undefined;
  effects?: WeatherEffectConfig[];
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  walls?: Wall[];
  mapImageUrl?: string;
  mapWallColor?: string;
  mapWallColors?: Array<{ color: string; tolerance?: number }>;
  mapWallTolerance?: number;
}

export default function WeatherEffect({
  effect,
  effects,
  width,
  height,
  style,
  walls = [],
  mapImageUrl,
  mapWallColor,
  mapWallColors = [],
  mapWallTolerance = 25,
}: WeatherEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenBufferRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const particlesRef = useRef<FoundryParticle[]>([]);
  const splashesRef = useRef<SubEmitterSplash[]>([]);
  const lightningRef = useRef<LightningFlash>({ intensity: 0, decay: 0.9, color: "#ffffff", bolt: null });
  const lastLightningTimeRef = useRef<number>(0);
  const lastConfigRef = useRef<string>("");
  const lastTimeRef = useRef<number>(performance.now());

  // Load map image buffer for collision & interior occlusion
  useEffect(() => {
    if (!mapImageUrl) {
      offscreenBufferRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          offscreenBufferRef.current = {
            data: imgData.data,
            w,
            h,
          };
        }
      } catch (_) {
        offscreenBufferRef.current = null;
      }
    };
    img.src = mapImageUrl;
  }, [mapImageUrl]);

  const isColorBlocked = (x: number, y: number, avoidColorHex?: string, avoidTolerance: number = 25) => {
    const buffer = offscreenBufferRef.current;
    if (!buffer) return false;

    const w = width || window.innerWidth;
    const h = height || window.innerHeight;

    const offX = Math.floor((x / w) * buffer.w);
    const offY = Math.floor((y / h) * buffer.h);

    if (offX < 0 || offX >= buffer.w || offY < 0 || offY >= buffer.h) return false;

    const idx = (offY * buffer.w + offX) * 4;
    const r = buffer.data[idx];
    const g = buffer.data[idx + 1];
    const b = buffer.data[idx + 2];
    const a = buffer.data[idx + 3];
    if (a === 0) return false;

    if (mapWallColor) {
      const targetRgb = hexToRgb(mapWallColor);
      if (targetRgb && colorsAreSimilar(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b, mapWallTolerance)) {
        return true;
      }
    }

    if (mapWallColors && mapWallColors.length > 0) {
      for (const wc of mapWallColors) {
        if (wc.color) {
          const targetRgb = hexToRgb(wc.color);
          if (targetRgb && colorsAreSimilar(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b, wc.tolerance ?? 25)) {
            return true;
          }
        }
      }
    }

    if (avoidColorHex) {
      const targetRgb = hexToRgb(avoidColorHex);
      if (targetRgb && colorsAreSimilar(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b, avoidTolerance)) {
        return true;
      }
    }

    return false;
  };

  // Helper to spawn a Foundry particle
  const spawnParticle = (
    effType: string,
    densityScale: number,
    speedScale: number,
    sizeScale: number,
    directionDeg: number,
    opacityVal: number,
    tintColor?: string,
    currentW: number = 1000,
    currentH: number = 700,
    randomY: boolean = true
  ): FoundryParticle => {
    let px = Math.random() * currentW;
    let py = randomY ? Math.random() * currentH : -10;
    const rad = ((directionDeg ?? 105) * Math.PI) / 180;
    const baseSpeed = 1.0 * (speedScale || 1.0);

    let vx = Math.cos(rad) * baseSpeed * 3;
    let vy = Math.sin(rad) * baseSpeed * 3;
    let size = 10 * (sizeScale || 1.0);
    let color = tintColor || "#ffffff";
    let rotSpeed = (Math.random() - 0.5) * 0.05;
    let pitchSpeed = 0.02 + Math.random() * 0.04;
    let swayAmp = 20 + Math.random() * 30;
    let swayFreq = 1.0 + Math.random() * 1.5;
    let maxAlpha = opacityVal ?? 0.9;
    let layer = Math.floor(Math.random() * 3); // 0, 1, 2
    let leafType = Math.floor(Math.random() * 3);
    let wingPhase = Math.random() * Math.PI * 2;

    switch (effType) {
      case "rain":
        size = 8 * (sizeScale || 1.0);
        vx = Math.cos(rad) * (18 + Math.random() * 6) * speedScale;
        vy = Math.sin(rad) * (18 + Math.random() * 6) * speedScale;
        color = tintColor || "#d0e8ee";
        maxAlpha = (0.7 + Math.random() * 0.3) * (opacityVal || 0.85);
        break;

      case "storm":
        size = 10 * (sizeScale || 1.0);
        vx = Math.cos(rad) * (24 + Math.random() * 8) * speedScale;
        vy = Math.sin(rad) * (24 + Math.random() * 8) * speedScale;
        color = tintColor || "#b8d5e5";
        maxAlpha = (0.8 + Math.random() * 0.2) * (opacityVal || 0.9);
        break;

      case "snow":
        size = (4 + Math.random() * 8) * (sizeScale || 1.0);
        vx = Math.cos(rad) * (1.2 + Math.random() * 1.5) * speedScale;
        vy = Math.sin(rad) * (1.5 + Math.random() * 2.0) * speedScale;
        color = tintColor || "#ffffff";
        swayAmp = 15 + Math.random() * 25;
        swayFreq = 0.8 + Math.random() * 1.2;
        rotSpeed = (Math.random() - 0.5) * 0.03;
        maxAlpha = (0.6 + Math.random() * 0.4) * (opacityVal || 0.9);
        break;

      case "blizzard":
        size = (5 + Math.random() * 9) * (sizeScale || 1.0);
        vx = -Math.abs(Math.cos(rad) * (15 + Math.random() * 9) * speedScale);
        vy = (1.5 + Math.random() * 3.0) * speedScale;
        color = tintColor || "#e0f2fe";
        swayAmp = 8 + Math.random() * 14;
        swayFreq = 3.0;
        maxAlpha = (0.7 + Math.random() * 0.3) * (opacityVal || 0.85);
        break;

      case "autumn_leaves":
      case "leaves_orange":
      case "leaves_green":
        size = (12 + Math.random() * 8) * (sizeScale || 1.0);
        vx = Math.cos(rad) * (2.2 + Math.random() * 1.8) * speedScale;
        vy = Math.sin(rad) * (2.0 + Math.random() * 1.5) * speedScale;
        const leafHues = ["#d94823", "#e58e26", "#f1c40f", "#b71540", "#78281f"];
        color = tintColor || leafHues[Math.floor(Math.random() * leafHues.length)];
        swayAmp = 25 + Math.random() * 35;
        swayFreq = 1.2 + Math.random() * 0.8;
        rotSpeed = (Math.random() - 0.5) * 0.06;
        pitchSpeed = 0.03 + Math.random() * 0.05;
        maxAlpha = (0.8 + Math.random() * 0.2) * (opacityVal || 0.95);
        break;

      case "cherry_blossoms":
      case "petals_pink":
        size = (10 + Math.random() * 6) * (sizeScale || 1.0);
        vx = Math.cos(rad) * (2.0 + Math.random() * 1.5) * speedScale;
        vy = Math.sin(rad) * (1.8 + Math.random() * 1.2) * speedScale;
        const sakuraHues = ["#f689a7", "#ffb7c5", "#ffc0cb", "#e056fd"];
        color = tintColor || sakuraHues[Math.floor(Math.random() * sakuraHues.length)];
        swayAmp = 20 + Math.random() * 30;
        swayFreq = 1.5;
        rotSpeed = (Math.random() - 0.5) * 0.05;
        pitchSpeed = 0.04 + Math.random() * 0.04;
        maxAlpha = (0.75 + Math.random() * 0.25) * (opacityVal || 0.9);
        break;

      case "embers":
        size = (3.5 + Math.random() * 6.5) * (sizeScale || 1.0);
        if (!randomY) py = currentH + 10;
        vx = (Math.random() - 0.5) * 1.6 * speedScale;
        vy = -(2.8 + Math.random() * 3.8) * speedScale; // Rising thermodynamic updraft
        color = tintColor || "#ff5722";
        swayAmp = 10 + Math.random() * 16;
        swayFreq = 2.4 + Math.random() * 2.0;
        maxAlpha = (0.85 + Math.random() * 0.15) * (opacityVal || 0.95);
        break;

      case "fireflies":
        size = (4.5 + Math.random() * 5.5) * (sizeScale || 1.0);
        vx = (Math.random() - 0.5) * 0.9 * speedScale;
        vy = (Math.random() - 0.5) * 0.9 * speedScale;
        color = tintColor || "#bef264";
        swayAmp = 18;
        swayFreq = 0.7;
        maxAlpha = (0.8 + Math.random() * 0.2) * (opacityVal || 0.95);
        break;

      case "fog":
        // 3-layer volumetric mist distribution
        layer = Math.floor(Math.random() * 3);
        if (layer === 0) {
          // Ground Mist Blanket
          size = (190 + Math.random() * 170) * (sizeScale || 1.0);
          vx = Math.cos(rad) * (0.35 + Math.random() * 0.3) * speedScale;
          vy = Math.sin(rad) * (0.12 + Math.random() * 0.15) * speedScale;
          maxAlpha = (0.28 + Math.random() * 0.22) * (opacityVal || 0.65);
        } else if (layer === 2) {
          // Wispy Sinuous Tendril
          size = (110 + Math.random() * 120) * (sizeScale || 1.0);
          vx = Math.cos(rad) * (0.75 + Math.random() * 0.45) * speedScale;
          vy = Math.sin(rad) * (0.25 + Math.random() * 0.3) * speedScale;
          maxAlpha = (0.35 + Math.random() * 0.25) * (opacityVal || 0.65);
        } else {
          // Mid-Altitude Rolling Cloud Bank
          size = (150 + Math.random() * 140) * (sizeScale || 1.0);
          vx = Math.cos(rad) * (0.55 + Math.random() * 0.4) * speedScale;
          vy = Math.sin(rad) * (0.18 + Math.random() * 0.22) * speedScale;
          maxAlpha = (0.32 + Math.random() * 0.25) * (opacityVal || 0.65);
        }
        color = tintColor || "#cbd5e1";
        rotSpeed = (Math.random() - 0.5) * 0.008;
        swayAmp = 14 + Math.random() * 18;
        swayFreq = 0.5 + Math.random() * 0.5;
        break;

      case "sandstorm":
      case "sand":
        size = (4 + Math.random() * 8) * (sizeScale || 1.0);
        vx = -Math.abs(Math.cos(rad) * (18 + Math.random() * 12) * speedScale);
        vy = (Math.random() - 0.45) * 4.5 * speedScale;
        const sandHues = ["#d4a373", "#e9c46a", "#f4a261", "#e76f51", "#ccd5ae"];
        color = tintColor || sandHues[Math.floor(Math.random() * sandHues.length)];
        maxAlpha = (0.65 + Math.random() * 0.35) * (opacityVal || 0.85);
        break;

      case "sunbeams":
        size = (150 + Math.random() * 110) * (sizeScale || 1.0);
        vx = 0.1 * speedScale;
        vy = 0.1 * speedScale;
        color = tintColor || "#fef08a";
        maxAlpha = 0.55 * (opacityVal || 0.6);
        break;

      case "caustics":
        size = (7 + Math.random() * 14) * (sizeScale || 1.0);
        if (!randomY) py = currentH + 10;
        vx = (Math.random() - 0.5) * 0.8 * speedScale;
        vy = -(1.4 + Math.random() * 2.0) * speedScale; // Rising bubbles
        color = tintColor || "#38bdf8";
        swayAmp = 12;
        swayFreq = 1.9;
        maxAlpha = 0.8 * (opacityVal || 0.8);
        break;

      case "clouds":
        size = (260 + Math.random() * 220) * (sizeScale || 1.0);
        vx = Math.cos(rad) * 0.75 * speedScale;
        vy = Math.sin(rad) * 0.35 * speedScale;
        color = tintColor || "rgba(15, 23, 42, 0.45)";
        maxAlpha = 0.45 * (opacityVal || 0.5);
        rotSpeed = (Math.random() - 0.5) * 0.005;
        swayAmp = 15;
        swayFreq = 0.4;
        break;

      case "arcane_wisps":
        size = (6 + Math.random() * 8) * (sizeScale || 1.0);
        vx = Math.cos(rad) * (1.2 + Math.random() * 1.5) * speedScale;
        vy = Math.sin(rad) * (1.0 + Math.random() * 1.5) * speedScale;
        color = tintColor || "#c084fc";
        swayAmp = 22 + Math.random() * 18;
        swayFreq = 1.8;
        maxAlpha = (0.75 + Math.random() * 0.25) * (opacityVal || 0.9);
        break;

      case "spores":
        size = (4 + Math.random() * 5) * (sizeScale || 1.0);
        vx = Math.cos(rad) * (0.8 + Math.random() * 0.8) * speedScale;
        vy = (Math.random() - 0.4) * 0.9 * speedScale;
        color = tintColor || "#34d399";
        swayAmp = 16;
        swayFreq = 1.2;
        maxAlpha = (0.7 + Math.random() * 0.3) * (opacityVal || 0.85);
        break;

      default:
        break;
    }

    return {
      x: px,
      y: py,
      vx,
      vy,
      size,
      baseSize: size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed,
      pitch: Math.random() * Math.PI * 2,
      pitchSpeed,
      alpha: maxAlpha,
      maxAlpha,
      color,
      effect: effType,
      phase: Math.random() * Math.PI * 2,
      lifetime: 4 + Math.random() * 6,
      age: Math.random() * 4,
      layer,
      swayAmp,
      swayFreq,
      leafType,
      wingPhase,
      trail: [],
    };
  };

  // Helper to generate a procedural fractal branched lightning bolt
  const generateLightningBolt = (w: number, h: number): LightningBolt => {
    const startX = w * (0.2 + Math.random() * 0.6);
    const startY = 0;
    const endX = startX + (Math.random() - 0.5) * w * 0.4;
    const endY = h * (0.6 + Math.random() * 0.4);

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> = [];
    const branches: Array<Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>> = [];

    const numSteps = 14;
    let curX = startX;
    let curY = startY;

    for (let i = 1; i <= numSteps; i++) {
      const targetProgress = i / numSteps;
      const targetX = startX + (endX - startX) * targetProgress;
      const targetY = startY + (endY - startY) * targetProgress;

      const jitterX = (Math.random() - 0.5) * 38;
      const jitterY = (Math.random() - 0.5) * 15;
      const nextX = i === numSteps ? endX : targetX + jitterX;
      const nextY = targetY + jitterY;

      segments.push({
        x1: curX,
        y1: curY,
        x2: nextX,
        y2: nextY,
        width: Math.max(1.2, 4.5 * (1 - targetProgress * 0.6)),
      });

      // Fork a sub-branch
      if (Math.random() < 0.35 && i < numSteps - 2) {
        const branch: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> = [];
        let bCurX = nextX;
        let bCurY = nextY;
        const bSteps = 4 + Math.floor(Math.random() * 4);
        const bDir = Math.random() > 0.5 ? 1 : -1;

        for (let b = 0; b < bSteps; b++) {
          const bNextX = bCurX + bDir * (18 + Math.random() * 25);
          const bNextY = bCurY + (14 + Math.random() * 20);
          branch.push({
            x1: bCurX,
            y1: bCurY,
            x2: bNextX,
            y2: bNextY,
            width: Math.max(0.8, 2.2 * (1 - b / bSteps)),
          });
          bCurX = bNextX;
          bCurY = bNextY;
        }
        branches.push(branch);
      }

      curX = nextX;
      curY = nextY;
    }

    return {
      segments,
      branches,
      intensity: 1.0,
      decay: 0.88,
      color: "#ffffff",
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Normalizing active configs
    const activeConfigs: WeatherEffectConfig[] = [];
    if (effects && effects.length > 0) {
      activeConfigs.push(...effects);
    } else if (effect && effect !== "none") {
      activeConfigs.push({
        id: "legacy",
        effect: effect,
        quantity: 100,
        scale: 1,
        speed: 1,
      });
    }

    const currentConfigStr = JSON.stringify({ effect, effects, mapImageUrl });

    if (activeConfigs.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = [];
      splashesRef.current = [];
      lastConfigRef.current = currentConfigStr;
      return;
    }

    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = width || window.innerWidth;
      canvas.height = height || window.innerHeight;
    };
    handleResize();

    const currentW = width || canvas.width;
    const currentH = height || canvas.height;

    // Initialize particles
    if (currentConfigStr !== lastConfigRef.current || particlesRef.current.length === 0) {
      const particles: FoundryParticle[] = [];
      splashesRef.current = [];

      for (const conf of activeConfigs) {
        const eff = conf.effect || "rain";
        const count = Math.min(
          350,
          Math.max(
            10,
            Math.round(
              ((conf.quantity ?? 100) / 100) *
                (eff === "fog" || eff === "clouds" || eff === "sunbeams" ? 18 : 90)
            )
          )
        );

        for (let i = 0; i < count; i++) {
          particles.push(
            spawnParticle(
              eff,
              (conf.quantity ?? 100) / 100,
              conf.speed ?? 1.0,
              conf.scale ?? 1.0,
              (conf as any).direction ??
                (conf.custom_vx !== undefined
                  ? Math.atan2(conf.custom_vy || 1, conf.custom_vx || 1) * (180 / Math.PI)
                  : 105),
              (conf as any).opacity ?? 0.9,
              conf.custom_color || (conf as any).tint,
              currentW,
              currentH,
              true
            )
          );
        }
      }

      particlesRef.current = particles;
      lastConfigRef.current = currentConfigStr;
      lastTimeRef.current = performance.now();
    }

    let t = 0;

    const animate = (timestamp: number) => {
      const now = timestamp || performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;
      t += dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const latestW = width || canvas.width;
      const latestH = height || canvas.height;
      const particles = particlesRef.current;
      const splashes = splashesRef.current;

      // 1. Process Branched Lightning for Storms
      const hasStorm = activeConfigs.some((c) => c.effect === "storm" || (c as any).lightning);
      if (hasStorm) {
        if (now - lastLightningTimeRef.current > 4000 + Math.random() * 7000) {
          lastLightningTimeRef.current = now;
          lightningRef.current.intensity = 0.9 + Math.random() * 0.1;
          lightningRef.current.decay = 0.86;
          lightningRef.current.bolt = generateLightningBolt(latestW, latestH);
        }
      }

      if (lightningRef.current.intensity > 0.01) {
        ctx.save();
        // Screen flash with exponential falloff
        ctx.fillStyle = `rgba(235, 245, 255, ${lightningRef.current.intensity * 0.55})`;
        ctx.fillRect(0, 0, latestW, latestH);

        // Draw fractal lightning bolt with electric blue glow
        const bolt = lightningRef.current.bolt;
        if (bolt && lightningRef.current.intensity > 0.25) {
          ctx.strokeStyle = "#ffffff";
          ctx.shadowColor = "#93c5fd";
          ctx.shadowBlur = 18;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Main trunk
          for (const seg of bolt.segments) {
            ctx.lineWidth = seg.width * lightningRef.current.intensity;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
          }

          // Side branches
          ctx.strokeStyle = "rgba(191, 219, 254, 0.85)";
          for (const br of bolt.branches) {
            for (const seg of br) {
              ctx.lineWidth = seg.width * lightningRef.current.intensity;
              ctx.beginPath();
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
        lightningRef.current.intensity *= Math.pow(lightningRef.current.decay, dt * 60);
      }

      // 2. Render Sub-Emitter Splashes (Water bouncing droplets & concentric ripples)
      if (splashes.length > 0) {
        ctx.save();
        for (let sIdx = splashes.length - 1; sIdx >= 0; sIdx--) {
          const sp = splashes[sIdx];
          sp.radius += sp.speed * dt * 60;
          sp.alpha -= 0.024 * dt * 60;

          // Update bouncing droplets
          if (sp.droplets && sp.droplets.length > 0) {
            for (const drop of sp.droplets) {
              drop.x += drop.vx * dt * 60;
              drop.y += drop.vy * dt * 60;
              drop.vy += 0.22 * dt * 60; // Gravity
              drop.alpha -= 0.03 * dt * 60;

              if (drop.alpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, drop.alpha)})`;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }

          if (sp.alpha <= 0 || sp.radius >= sp.maxRadius) {
            splashes.splice(sIdx, 1);
            continue;
          }

          // Concentric ripple rings with fading refractions
          const rgb = hexToRgb(sp.color) || { r: 208, g: 232, b: 238 };
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${sp.alpha * 0.75})`;
          ctx.lineWidth = Math.max(0.8, (1.0 - sp.radius / sp.maxRadius) * 2.2);
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, sp.radius, sp.radius * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Second fainter inner ripple
          if (sp.radius > 4) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${sp.alpha * 0.4})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(sp.x, sp.y, sp.radius * 0.55, sp.radius * 0.23, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 3. Render and Update Weather & Ambient Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += dt;
        p.rotation += p.rotSpeed * dt * 60;
        p.pitch += p.pitchSpeed * dt * 60;
        if (p.wingPhase !== undefined) {
          p.wingPhase += 0.45 * dt * 60; // 25-30 Hz wing flapping
        }

        // Dynamic motion & organic sway
        let moveX = p.vx * dt * 60;
        let moveY = p.vy * dt * 60;

        if (p.effect === "snow" || p.effect === "autumn_leaves" || p.effect === "cherry_blossoms") {
          moveX += Math.sin(t * p.swayFreq + p.phase) * (p.swayAmp * 0.04);
        } else if (p.effect === "embers") {
          // Thermodynamic convective updraft & micro-turbulence
          moveX += (Math.sin(t * p.swayFreq + p.phase) + (Math.random() - 0.5) * 0.7) * 1.3;
          moveY += (Math.cos(t * 1.5 + p.phase) * 0.4) * dt * 60;
        } else if (p.effect === "fireflies") {
          // Autonomous organic flight wandering with gentle momentum
          moveX += Math.cos(t * p.swayFreq + p.phase) * 0.9 + Math.sin(t * 0.4) * 0.4;
          moveY += Math.sin(t * p.swayFreq * 0.85 + p.phase) * 0.9 + Math.cos(t * 0.5) * 0.3;
        } else if (p.effect === "fog" || p.effect === "clouds") {
          // Aerodynamic atmospheric curl-drift and rolling convection
          moveX += Math.sin(t * (p.swayFreq || 0.4) + p.phase + p.y * 0.002) * (p.swayAmp || 12) * 0.05;
          moveY += Math.cos(t * (p.swayFreq || 0.4) * 0.8 + p.phase + p.x * 0.002) * (p.swayAmp || 12) * 0.03;
        } else if (p.effect === "arcane_wisps" || p.effect === "spores") {
          moveX += Math.sin(t * p.swayFreq + p.phase) * 0.8;
          moveY += Math.cos(t * p.swayFreq * 0.9 + p.phase) * 0.6;
        }

        p.x += moveX;
        p.y += moveY;

        // Check occlusion / wall collision for rain/snow/leaves
        if (p.effect === "rain" || p.effect === "storm") {
          if (isColorBlocked(p.x, p.y, undefined, 25)) {
            // Spawn impact splash with bouncing droplets
            if (splashes.length < 75) {
              const droplets: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];
              const numDrops = 3 + Math.floor(Math.random() * 3);
              for (let d = 0; d < numDrops; d++) {
                droplets.push({
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 2.8,
                  vy: -(1.5 + Math.random() * 2.2),
                  alpha: 0.9,
                  size: 0.9 + Math.random() * 0.8,
                });
              }

              splashes.push({
                x: p.x,
                y: p.y,
                radius: 2,
                maxRadius: 8 + Math.random() * 8,
                alpha: 0.85,
                color: p.color || "#d0e8ee",
                speed: 0.8 + Math.random() * 0.4,
                droplets,
              });
            }
            // Recycle particle
            p.x = Math.random() * latestW;
            p.y = -10;
            continue;
          }
        }

        // Boundary checks and respawning
        const isOutOfBounds =
          p.x < -220 ||
          p.x > latestW + 220 ||
          p.y < -220 ||
          p.y > latestH + 220 ||
          p.age >= p.lifetime;

        if (isOutOfBounds) {
          if (p.effect === "rain" || p.effect === "storm") {
            // Splash on ground bottom
            if (p.y >= latestH && splashes.length < 75) {
              const droplets: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];
              const numDrops = 2 + Math.floor(Math.random() * 3);
              for (let d = 0; d < numDrops; d++) {
                droplets.push({
                  x: p.x,
                  y: latestH - 2,
                  vx: (Math.random() - 0.5) * 2.5,
                  vy: -(1.4 + Math.random() * 2.0),
                  alpha: 0.85,
                  size: 0.8 + Math.random() * 0.8,
                });
              }

              splashes.push({
                x: p.x,
                y: latestH - 2,
                radius: 2,
                maxRadius: 10 + Math.random() * 6,
                alpha: 0.8,
                color: p.color || "#d0e8ee",
                speed: 0.85,
                droplets,
              });
            }
          }

          // Respawn at appropriate edge based on particle direction
          p.age = 0;
          if (p.effect === "embers" || p.effect === "caustics") {
            p.x = Math.random() * latestW;
            p.y = latestH + 10;
          } else if (p.vx < -5) {
            // Blizzard / Sandstorm from right to left
            p.x = latestW + 10;
            p.y = Math.random() * latestH;
          } else {
            p.x = Math.random() * latestW;
            p.y = -10;
          }
          continue;
        }

        // Render Particle Sprite
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        let renderAlpha = p.alpha;
        if (p.effect === "fireflies") {
          renderAlpha = p.maxAlpha * (0.3 + 0.7 * Math.pow(Math.sin(t * 1.8 + p.phase), 2));
        } else if (p.effect === "embers") {
          // Fade as it rises and cools
          renderAlpha = p.maxAlpha * Math.max(0.12, 1.0 - (latestH - p.y) / (latestH * 1.15));
        } else if (p.effect === "sunbeams") {
          renderAlpha = p.maxAlpha * (0.65 + 0.35 * Math.sin(t * 0.8 + p.phase));
        } else if (p.effect === "fog") {
          const lifeRatio = p.lifetime > 0 ? p.age / p.lifetime : 0.5;
          const edgeFade = Math.sin(Math.min(1, Math.max(0, lifeRatio)) * Math.PI);
          renderAlpha = p.maxAlpha * (0.8 + 0.2 * Math.sin(t * 0.5 + p.phase)) * Math.max(0.3, edgeFade);
        } else if (p.effect === "arcane_wisps" || p.effect === "spores") {
          renderAlpha = p.maxAlpha * (0.7 + 0.3 * Math.sin(t * 2.2 + p.phase));
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, renderAlpha));

        // Use additive blend mode for glowing magical/thermal elements
        if (
          p.effect === "embers" ||
          p.effect === "fireflies" ||
          p.effect === "sunbeams" ||
          p.effect === "arcane_wisps" ||
          p.effect === "spores"
        ) {
          ctx.globalCompositeOperation = "screen";
        }

        const dynamicFogSize = (p.baseSize || p.size) * (0.92 + 0.16 * Math.sin(t * 0.5 + p.phase));

        switch (p.effect) {
          case "rain":
          case "storm":
            drawFoundryRainStreak(ctx, p.size, p.color, p.vx, p.vy);
            break;

          case "snow":
          case "blizzard":
            drawFoundrySnowflake(ctx, p.size, p.color, p.layer, p.phase + t, p.pitch);
            break;

          case "autumn_leaves":
          case "leaves_orange":
          case "leaves_green":
            drawFoundryLeaf(ctx, p.size, p.color, p.leafType || 0, p.pitch);
            break;

          case "cherry_blossoms":
          case "petals_pink":
            drawFoundrySakuraPetal(ctx, p.size, p.color, p.pitch);
            break;

          case "embers":
            drawFoundryEmber(ctx, p.size, p.color, p.phase + t * 2, p.trail);
            break;

          case "fireflies":
            drawFoundryFirefly(ctx, p.size, p.color, p.phase + t * 1.5, p.wingPhase || 0);
            break;

          case "fog":
            drawFoundryFogBlob(ctx, dynamicFogSize, p.color, p.layer, p.phase + t * 0.3);
            break;

          case "sunbeams":
            drawFoundrySunbeam(ctx, p.size, latestH * 1.4, p.color, p.phase + t * 0.8);
            break;

          case "caustics":
            drawFoundryBubble(ctx, p.size, p.color, p.phase + t * 1.5);
            break;

          case "clouds":
            drawFoundryFogBlob(ctx, dynamicFogSize, p.color, p.layer ?? 1, p.phase + t * 0.2);
            break;

          case "sandstorm":
          case "sand":
            drawFoundrySandstorm(ctx, p.size, p.color, p.phase + t * 3, p.vx);
            break;

          case "arcane_wisps":
            drawFoundryArcaneWisp(ctx, p.size, p.color, p.phase + t * 1.8);
            break;

          case "spores":
            drawFoundrySpore(ctx, p.size, p.color, p.phase + t * 1.6);
            break;

          default:
            // High-speed particulate streak
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [effects, effect, width, height, mapImageUrl, mapWallColor, mapWallColors, mapWallTolerance]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: "100%",
        height: "100%",
        ...style,
      }}
    />
  );
}
