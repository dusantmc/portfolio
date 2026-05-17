import { useMemo } from 'react';
import * as THREE from 'three';
import { BADGE_BASE_DEPTH } from '../types/badge';
import type { MetalMaterialConfig } from '../types/badge';
import { createMetalMaterial } from '../lib/materials';

interface BadgeBaseProps {
  materialConfig: MetalMaterialConfig;
}

/**
 * Thin metallic backing plate that closes the back of the badge.
 *
 * The badge body is now a "cup" — BadgeRim forms the walls and outer frame,
 * BadgeFace fills the interior, and BadgeBase seals the back.
 *
 * Radius is slightly smaller than the rim (1.18 < 1.22) so it sits cleanly
 * inside the rim's inner shoulder.
 */
export default function BadgeBase({ materialConfig }: BadgeBaseProps) {
  const { geometry, material } = useMemo(() => {
    const r = 1.18;
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      if (i === 0) shape.moveTo(r * Math.cos(a), r * Math.sin(a));
      else shape.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,          // thin plate
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
    });
    // Position at the back: back face at z=-BADGE_BASE_DEPTH
    geo.translate(0, 0, -BADGE_BASE_DEPTH);

    return { geometry: geo, material: createMetalMaterial(materialConfig) };
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
