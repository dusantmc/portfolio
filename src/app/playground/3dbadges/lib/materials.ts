import * as THREE from 'three';
import type { MetalMaterialConfig, MetalPreset } from '../types/badge';

// ─── Metal preset definitions ────────────────────────────────────────────────
// Colors are deliberately neutral/muted — the HDRI environment map provides
// most of the visual variation via reflections, so we avoid warm/saturated tones.

export const METAL_PRESETS: Record<MetalPreset, MetalMaterialConfig> = {
  gold: {
    color: '#C9A84C',    // neutral warm gold (not yellow)
    metalness: 1,
    roughness: 0.18,     // tighter roughness → sharper highlights
  },
  silver: {
    color: '#9AA5AF',    // cool-grey silver
    metalness: 1,
    roughness: 0.25,
  },
  bronze: {
    color: '#8B6340',    // muted earthy bronze
    metalness: 1,
    roughness: 0.32,
  },
};

/**
 * Creates a MeshPhysicalMaterial configured for premium metallic rendering.
 *
 * Key choices:
 * - envMapIntensity 2.2: HDRI is the primary light source for metals
 * - clearcoat 0.8: lacquer layer on top of the metal for an enamel-pin look
 * - clearcoatRoughness 0.05: mirror-like top coat
 * - iridescence on gold only: subtle oil-slick rainbow sheen at grazing angles
 *   (resembles Apple Watch polished steel / gold editions)
 */
export function createMetalMaterial(
  config: MetalMaterialConfig
): THREE.MeshPhysicalMaterial {
  const isGold = config.preset === 'gold';
  const isSilver = config.preset === 'silver';

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.color),
    metalness: config.metalness,
    roughness: config.roughness,
    envMapIntensity: 2.2,

    // Lacquer clearcoat — makes the surface look like it has depth
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,

    // Iridescence: rainbow interference effect at grazing angles
    // Subtle on gold/silver; off for bronze (more matte, aged feel)
    iridescence: isGold ? 0.18 : isSilver ? 0.08 : 0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [100, 400],
  });
}

/**
 * Creates a MeshPhysicalMaterial for the inner badge face.
 * Non-metallic enamel-style — matte contrast against the shiny metallic frame.
 * A small clearcoat adds slight gloss so it reads as painted/anodized rather than flat.
 */
export function createFaceMaterial(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.0,
    roughness: 0.55,
    envMapIntensity: 0.35,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
  });
}
