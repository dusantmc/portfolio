'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useControls, Leva } from 'leva';
import Link from 'next/link';
import * as THREE from 'three';
import BadgeScene from './BadgeScene';
import ExportButton from './ExportButton';
import { parseSvgFile, normalizeSvgShapes } from '../lib/svgUtils';
import { METAL_PRESETS } from '../lib/materials';
import type { MetalPreset } from '../types/badge';

/**
 * Top-level client component for the 3D Badge Studio.
 *
 * Owns:
 *  - SVG file upload + parsing state
 *  - Leva control panel (all badge/lighting/scene params)
 *  - Layout (back link, file input, canvas area, export button)
 */
export default function BadgeApp() {
  const [parsedShapes, setParsedShapes] = useState<THREE.Shape[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  // ── Leva controls ─────────────────────────────────────────────────────────

  const { metalPreset, faceColor, extrusionDepth, bevelSize } = useControls(
    'Badge',
    {
      metalPreset: {
        label: 'Metal',
        value: 'gold' as MetalPreset,
        options: ['gold', 'silver', 'bronze'] as MetalPreset[],
      },
      faceColor: { label: 'Face color', value: '#1a3a5c' },
      extrusionDepth: {
        label: 'Extrusion depth',
        value: 0.12,
        min: 0.02,
        max: 0.35,
        step: 0.01,
      },
      bevelSize: {
        label: 'Bevel size',
        value: 0.018,
        min: 0.005,
        max: 0.06,
        step: 0.005,
      },
    }
  );

  const { lightX, lightY, lightZ, shadowIntensity } = useControls('Lighting', {
    lightX: { label: 'Key X', value: -2.0, min: -6, max: 6, step: 0.1 },
    lightY: { label: 'Key Y', value: 3.5, min: -6, max: 6, step: 0.1 },
    lightZ: { label: 'Key Z', value: 4.5, min: -6, max: 6, step: 0.1 },
    shadowIntensity: {
      label: 'Shadow intensity',
      value: 0.70,
      min: 0,
      max: 1,
      step: 0.05,
    },
  });

  const { darkBackground, rotateY, rotateX } = useControls('Scene', {
    darkBackground: { label: 'Dark background', value: true },
    rotateY: {
      label: 'Rotate left / right',
      value: 5,
      min: -180,
      max: 180,
      step: 1,
    },
    rotateX: {
      label: 'Rotate up / down',
      value: -8,
      min: -45,
      max: 45,
      step: 1,
    },
  });

  // ── Derived metal config — embed preset name for per-preset effects ────────
  const metalConfig = { ...METAL_PRESETS[metalPreset as MetalPreset], preset: metalPreset as MetalPreset };

  // ── SVG upload ─────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParseError(null);
      setIsLoading(true);

      try {
        const paths = await parseSvgFile(file);
        // Target radius matches the inner face (0.92) minus padding → ~0.65
        const shapes = normalizeSvgShapes(paths, 0.65);
        if (shapes.length === 0) {
          setParseError('No valid paths found in SVG. Try a simpler icon.');
          setParsedShapes(null);
        } else {
          setParsedShapes(shapes);
        }
      } catch {
        setParseError('Failed to parse SVG. Make sure the file is a valid SVG.');
        setParsedShapes(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load the bundled example SVG on first mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/playground/3dbadges/example-icon.svg');
        const text = await res.text();
        const blob = new Blob([text], { type: 'image/svg+xml' });
        const file = new File([blob], 'example-icon.svg', { type: 'image/svg+xml' });
        const paths = await parseSvgFile(file);
        const shapes = normalizeSvgShapes(paths, 0.65);
        if (shapes.length > 0) setParsedShapes(shapes);
      } catch {
        // Silently fail — user can upload their own
      }
    })();
  }, []);

  const handleGlReady = useCallback((gl: THREE.WebGLRenderer) => {
    glRef.current = gl;
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: darkBackground
          ? 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d0d 100%)'
          : '#f0f0f0',
        fontFamily: 'var(--font-sans, sans-serif)',
      }}
    >
      {/* Leva panel — renders into its own fixed portal, top-right by default */}
      <Leva
        theme={{
          colors: {
            elevation1: '#1c1c1c',
            elevation2: '#161616',
            elevation3: '#242424',
            accent1: '#5e9bff',
            accent2: '#4a80e8',
            accent3: '#6eb2ff',
            highlight1: '#fff',
            highlight2: '#d4d4d4',
            highlight3: '#aaa',
          },
        }}
        collapsed={false}
        titleBar={{ title: '3D Badge Studio', drag: true, filter: false }}
      />

      {/* Back navigation */}
      <Link
        href="/playground"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          color: darkBackground ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          zIndex: 10,
          transition: 'color 0.2s',
        }}
      >
        ← Playground
      </Link>

      {/* SVG upload control — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '32px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <label
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLLabelElement).style.background =
              'rgba(255, 255, 255, 0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLLabelElement).style.background =
              'rgba(255, 255, 255, 0.12)';
          }}
        >
          {isLoading ? 'Parsing…' : 'Upload SVG icon'}
          <input
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        {parseError && (
          <span
            style={{
              fontSize: '12px',
              color: '#ff6b6b',
              maxWidth: '220px',
              lineHeight: '1.4',
            }}
          >
            {parseError}
          </span>
        )}
      </div>

      {/* Export button — bottom-right */}
      <ExportButton glRef={glRef} />

      {/* Three.js canvas fills the full viewport */}
      <div style={{ width: '100%', height: '100%' }}>
        <BadgeScene
          metalConfig={metalConfig}
          faceColor={faceColor}
          shapes={parsedShapes}
          extrusionDepth={extrusionDepth}
          bevelSize={bevelSize}
          lightX={lightX}
          lightY={lightY}
          lightZ={lightZ}
          shadowIntensity={shadowIntensity}
          darkBackground={darkBackground}
          rotateX={rotateX}
          rotateY={rotateY}
          onGlReady={handleGlReady}
        />
      </div>
    </div>
  );
}
