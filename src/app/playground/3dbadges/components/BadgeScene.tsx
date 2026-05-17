'use client';

import { useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import BadgeBase from './BadgeBase';
import BadgeRim from './BadgeRim';
import BadgeFace from './BadgeFace';
import SvgIconMesh from './SvgIconMesh';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import type { MetalMaterialConfig } from '../types/badge';

interface BadgeSceneProps {
  metalConfig: MetalMaterialConfig;
  faceColor: string;
  shapes: THREE.Shape[] | null;
  extrusionDepth: number;
  bevelSize: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  shadowIntensity: number;
  darkBackground: boolean;
  rotateX: number;
  rotateY: number;
  onGlReady: (gl: THREE.WebGLRenderer) => void;
}

/**
 * R3F Canvas scene.
 *
 * Post-processing (@react-three/postprocessing) has been intentionally removed.
 * Its EffectComposer calls renderer.getContext().getContextAttributes().alpha
 * without optional chaining (postprocessing v6.x bug). In React 19 StrictMode,
 * the Canvas is mounted → disposed → remounted; the second mount hits a null
 * WebGL context and crashes. The badge renders at production quality without
 * it: HDRI + MeshPhysicalMaterial (metalness=1, clearcoat=0.8, iridescence)
 * already produces premium output.
 *
 * Tone mapping and exposure are set in onCreated (not in the gl prop) because
 * they are renderer properties, not WebGL context creation parameters.
 */
export default function BadgeScene({
  metalConfig,
  faceColor,
  shapes,
  extrusionDepth,
  bevelSize,
  lightX,
  lightY,
  lightZ,
  shadowIntensity,
  darkBackground,
  rotateX,
  rotateY,
  onGlReady,
}: BadgeSceneProps) {
  const handleCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
      onGlReady(gl);
    },
    [onGlReady]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <CanvasErrorBoundary>
        <Canvas
          camera={{ fov: 24, position: [0, 0, 6], near: 0.1, far: 100 }}
          gl={{
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: true,
          }}
          dpr={[1, 2]}
          shadows
          onCreated={handleCreated}
          style={{
            width: '100%',
            height: '100%',
            background: darkBackground
              ? 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d0d 100%)'
              : 'transparent',
          }}
        >
          {/*
           * Suspense inside Canvas: the Environment component loads the HDRI
           * asynchronously. Without an explicit Suspense boundary the loader's
           * suspended promise can surface as an error on StrictMode remount.
           * fallback={null} keeps the canvas blank while loading.
           */}
          <Suspense fallback={null}>
            {/* Local HDRI — primary source of metallic reflections, no CDN */}
            <Environment files="/playground/3dbadges/studio.hdr" background={false} />

            {/* ── Lighting ──────────────────────────────────────────────── */}

            {/* Key: soft spot top-left, casts shadows */}
            <spotLight
              position={[lightX, lightY, lightZ]}
              intensity={shadowIntensity * 3.5}
              angle={0.45}
              penumbra={0.85}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
              shadow-radius={4}
            />
            {/* Fill: warm point right-front, lifts the recessed face out of shadow */}
            <pointLight position={[3.5, 1.5, 4]} intensity={1.1} color="#ffe8d0" />
            {/* Front-top soft fill — brightens the face cup directly */}
            <pointLight position={[0, 2, 5]} intensity={0.6} color="#d8e8ff" />
            {/* Rim: cool directional from back-top for edge highlights */}
            <directionalLight position={[0, 5, -5]} intensity={0.45} color="#c8d8ff" />
            {/* Ambient — prevents recessed face going fully black */}
            <ambientLight intensity={0.22} />

            {/* ── Badge — slider-driven rotation ──────────────────────────── */}
            <group
              rotation={[
                rotateX * (Math.PI / 180),
                rotateY * (Math.PI / 180),
                0,
              ]}
            >
              <BadgeBase materialConfig={metalConfig} />
              <BadgeRim materialConfig={metalConfig} />
              <BadgeFace color={faceColor} />
              <SvgIconMesh
                shapes={shapes}
                extrusionDepth={extrusionDepth}
                bevelSize={bevelSize}
                materialConfig={metalConfig}
              />
            </group>

            {/* ── Camera ──────────────────────────────────────────────────── */}
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.06}
              minPolarAngle={Math.PI / 2 - 0.44}
              maxPolarAngle={Math.PI / 2 + 0.44}
              minDistance={3.5}
              maxDistance={9}
            />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
