import { useMemo } from 'react';
import * as THREE from 'three';
import { BADGE_BASE_DEPTH } from '../types/badge';
import type { MetalMaterialConfig } from '../types/badge';
import { createMetalMaterial } from '../lib/materials';

interface BadgeRimProps {
  materialConfig: MetalMaterialConfig;
}

/**
 * Full-depth metallic outer frame — forms both the visible rim and the
 * side walls of the "cup" that the colored face sits inside.
 *
 * Geometry: outer hexagon (r=1.22) with an inner hexagonal hole (r=0.93).
 * The hole is wide enough to frame the colored face (r=0.90) with a small
 * metallic ledge between them for a jewellery-quality inset look.
 *
 * Depth = BADGE_BASE_DEPTH so the walls span the full badge thickness.
 * Front face is at z=0 (closest to camera), back at z=-BADGE_BASE_DEPTH.
 */
export default function BadgeRim({ materialConfig }: BadgeRimProps) {
  const { geometry, material } = useMemo(() => {
    const outerR = 1.22;
    const innerR = 0.93; // wide hole — face (r=0.90) sits inside with a thin metallic ledge

    const makeHexPoints = (r: number) =>
      Array.from({ length: 6 }, (_, i) => [
        r * Math.cos((i * Math.PI) / 3),
        r * Math.sin((i * Math.PI) / 3),
      ] as [number, number]);

    // Outer shape
    const outerPts = makeHexPoints(outerR);
    const shape = new THREE.Shape();
    shape.moveTo(...outerPts[0]);
    for (let i = 1; i < 6; i++) shape.lineTo(...outerPts[i]);
    shape.closePath();

    // Inner hole (same winding — three.js handles fill-rule internally)
    const innerPts = makeHexPoints(innerR);
    const hole = new THREE.Path();
    hole.moveTo(...innerPts[0]);
    for (let i = 1; i < 6; i++) hole.lineTo(...innerPts[i]);
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: BADGE_BASE_DEPTH,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 3,
    });
    // Front face at z=0, back at z=-BADGE_BASE_DEPTH
    geo.translate(0, 0, -BADGE_BASE_DEPTH);

    // Rim material: slightly higher roughness than the icon for tonal separation
    const rimConfig = { ...materialConfig, roughness: Math.min(materialConfig.roughness + 0.06, 1) };
    return { geometry: geo, material: createMetalMaterial(rimConfig) };
  }, [materialConfig.color, materialConfig.roughness, materialConfig.preset]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      rotation={[0, 0, Math.PI / 6]}
    />
  );
}
