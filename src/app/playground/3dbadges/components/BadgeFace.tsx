import { useMemo } from 'react';
import * as THREE from 'three';
import { BADGE_BASE_DEPTH, BADGE_FACE_RECESS } from '../types/badge';
import { createFaceMaterial } from '../lib/materials';

interface BadgeFaceProps {
  color: string;
}

/**
 * The recessed colored face — sits INSIDE the rim's cup, embedded below
 * the metallic rim edge to create the enamel inset look.
 *
 * Z layout (camera faces +Z):
 *   rim front edge:  z =  0.00
 *   face front:      z = -BADGE_FACE_RECESS  (-0.07)  ← recessed
 *   face back:       z = -BADGE_BASE_DEPTH   (-0.22)  ← flush with rim back
 *
 * radius = 0.90 < inner rim hole = 0.93, so the face sits inside the walls
 * with a thin metallic ledge visible at the rim–face junction.
 *
 * The face fills the full depth of the cup (no hollow gap behind it).
 */
export default function BadgeFace({ color }: BadgeFaceProps) {
  const { geometry, material } = useMemo(() => {
    const r = 0.90;
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      if (i === 0) shape.moveTo(r * Math.cos(a), r * Math.sin(a));
      else shape.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    shape.closePath();

    // Depth fills from face front to badge back
    const depth = BADGE_BASE_DEPTH - BADGE_FACE_RECESS; // 0.22 - 0.07 = 0.15

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
    });
    // After ExtrudeGeometry, z=0 is the back, z=depth is the front.
    // Translate so front = -BADGE_FACE_RECESS and back = -BADGE_BASE_DEPTH
    geo.translate(0, 0, -BADGE_BASE_DEPTH);

    return { geometry: geo, material: createFaceMaterial(color) };
  }, [color]);

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
