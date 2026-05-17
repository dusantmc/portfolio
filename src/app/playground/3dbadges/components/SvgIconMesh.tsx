import { useMemo } from 'react';
import * as THREE from 'three';
import { BADGE_FACE_RECESS } from '../types/badge';
import type { SvgIconProps } from '../types/badge';
import { createMetalMaterial } from '../lib/materials';

/**
 * Renders the uploaded SVG icon as an extruded metallic mesh.
 *
 * The geometry is built each time `shapes`, `extrusionDepth`, or `bevelSize`
 * changes. Shapes are pre-normalized (centered, scaled, Y-flipped) by
 * svgUtils.normalizeSvgShapes before arriving here.
 *
 * Z position is computed so the icon sits proud of the face surface.
 */
export default function SvgIconMesh({
  shapes,
  extrusionDepth,
  bevelSize,
  materialConfig,
}: SvgIconProps) {
  const { geometry, material, zOffset } = useMemo(() => {
    // Z position: just in front of the recessed face surface
    // face front is at z = -BADGE_FACE_RECESS; icon sits just above it
    const z = -BADGE_FACE_RECESS + 0.003;

    const mat = createMetalMaterial(materialConfig);

    if (!shapes || shapes.length === 0) {
      return { geometry: null, material: mat, zOffset: z };
    }

    // Build ExtrudeGeometry from the pre-normalized shapes.
    // Tight bevel settings produce a machined/stamped look:
    //   - bevelSegments: 2 (fewer = sharper, harder edge — not inflated)
    //   - bevelThickness slightly larger than bevelSize (edge is crisp, not round)
    const effectiveBevel = Math.max(bevelSize, 0.005);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: extrusionDepth,
      bevelEnabled: true,
      bevelSize: effectiveBevel,
      bevelThickness: effectiveBevel * 1.4,
      bevelOffset: 0,
      bevelSegments: 2,  // 2 = sharpest clean bevel; 1 would be a raw chamfer
    };

    const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);

    // Center the geometry on the XY plane
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const cx = (box.min.x + box.max.x) / 2;
    const cy = (box.min.y + box.max.y) / 2;
    geo.translate(-cx, -cy, 0);

    return { geometry: geo, material: mat, zOffset: z };
  }, [shapes, extrusionDepth, bevelSize, materialConfig.color, materialConfig.roughness, materialConfig.preset]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, 0, zOffset]}
      // Match the hexagon rotation used by base/face
      rotation={[0, 0, Math.PI / 6]}
      castShadow
      receiveShadow
    />
  );
}
