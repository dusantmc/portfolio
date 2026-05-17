// ─── Badge type definitions ─────────────────────────────────────────────────

export type MetalPreset = 'gold' | 'silver' | 'bronze';

export interface MetalMaterialConfig {
  color: string;
  metalness: number;
  roughness: number;
  /** The named preset — used for per-preset effects like iridescence */
  preset?: MetalPreset;
}

// Shared depth constants used by all badge layers to compute Z offsets
export const BADGE_BASE_DEPTH = 0.22;   // total badge thickness
export const BADGE_FACE_DEPTH = 0.15;   // face fills most of the cup interior
export const BADGE_FACE_RECESS = 0.07;  // how far face front sits behind rim front (z=0)
// face front z = -BADGE_FACE_RECESS = -0.07
// face back  z = -BADGE_BASE_DEPTH  = -0.22  (flush with rim/plate back)

// Controls surfaced through the Leva panel
export interface BadgeControls {
  metalPreset: MetalPreset;
  faceColor: string;
  extrusionDepth: number;
  bevelSize: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  shadowIntensity: number;
  darkBackground: boolean;
}

// Props passed to SvgIconMesh
export interface SvgIconProps {
  shapes: import('three').Shape[] | null;
  extrusionDepth: number;
  bevelSize: number;
  materialConfig: MetalMaterialConfig;
}
