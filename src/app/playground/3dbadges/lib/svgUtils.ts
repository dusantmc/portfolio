import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

// ─── SVG parsing utilities ───────────────────────────────────────────────────

/**
 * Reads an SVG File and parses it with THREE's SVGLoader.
 * Returns the raw ShapePath array for downstream normalization.
 */
export async function parseSvgFile(file: File): Promise<THREE.ShapePath[]> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const loader = new SVGLoader();
  const data = loader.parse(text);
  return data.paths;
}

/**
 * Converts raw SVGLoader ShapePaths into normalized THREE.Shape[].
 *
 * Steps:
 *  1. Convert each ShapePath to Shape[] using SVGLoader.createShapes
 *     (handles winding-order based holes automatically).
 *  2. Compute a unified bounding box across all shapes.
 *  3. Scale uniformly so the larger dimension = targetRadius * 2.
 *  4. Translate centroid to origin.
 *  5. Flip Y axis — SVG coords have y-down; Three.js has y-up.
 *
 * @param paths       Raw paths from SVGLoader.parse()
 * @param targetRadius  Desired half-size of the icon in world units
 */
export function normalizeSvgShapes(
  paths: THREE.ShapePath[],
  targetRadius: number
): THREE.Shape[] {
  // Step 1: convert paths → shapes
  const allShapes: THREE.Shape[] = [];
  for (const path of paths) {
    const shapes = SVGLoader.createShapes(path);
    allShapes.push(...shapes);
  }

  if (allShapes.length === 0) return [];

  // Step 2: unified bounding box
  // We use a BufferGeometry temporarily to get a proper Box3
  const box = new THREE.Box3();
  for (const shape of allShapes) {
    const pts = shape.getPoints(12);
    for (const p of pts) {
      box.expandByPoint(new THREE.Vector3(p.x, p.y, 0));
    }
    // Also sample hole points
    for (const hole of shape.holes) {
      const holePts = hole.getPoints(12);
      for (const p of holePts) {
        box.expandByPoint(new THREE.Vector3(p.x, p.y, 0));
      }
    }
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Step 3: uniform scale so the larger dimension fits within targetRadius * 2
  const maxDim = Math.max(size.x, size.y);
  if (maxDim === 0) return allShapes;
  const scale = (targetRadius * 2) / maxDim;

  // Step 4 & 5: apply transform to each shape point
  // Flip Y: newY = -(y - centerY) * scale  (negate after centering)
  const transformShape = (shape: THREE.Shape) => {
    const transformPoints = (points: THREE.Vector2[]) =>
      points.map(
        (p) =>
          new THREE.Vector2(
            (p.x - center.x) * scale,
            -(p.y - center.y) * scale  // Y flip for SVG → Three.js
          )
      );

    // Re-build the shape with transformed points
    const newShape = new THREE.Shape(transformPoints(shape.getPoints(64)));
    newShape.holes = shape.holes.map((hole) => {
      const newHole = new THREE.Path(transformPoints(hole.getPoints(64)));
      return newHole;
    });
    return newShape;
  };

  return allShapes.map(transformShape);
}
