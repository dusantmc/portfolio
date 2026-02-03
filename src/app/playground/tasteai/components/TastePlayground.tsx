"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShaderMount } from "@paper-design/shaders-react";
import { ShaderFitOptions } from "@paper-design/shaders";
import styles from "../styles/TastePlayground.module.css";
import TasteEditorPanel from "./TasteEditorPanel";

const DEFAULT_IMAGE_SRC = "/playground/tasteai/demoimage.webp";
const FALLBACK_IMAGE_SRC = "/portfolio/mc2-final.webp";

type ArtworkMouseEvent = React.MouseEvent<HTMLDivElement, MouseEvent>;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const flagWaveShader = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_amplitude;

in vec2 v_imageUV;

out vec4 fragColor;

float getUvFrame(vec2 uv) {
  float aax = 2.0 * fwidth(uv.x);
  float aay = 2.0 * fwidth(uv.y);

  float left   = smoothstep(0.0, aax, uv.x);
  float right  = 1.0 - smoothstep(1.0 - aax, 1.0, uv.x);
  float bottom = smoothstep(0.0, aay, uv.y);
  float top    = 1.0 - smoothstep(1.0 - aay, 1.0, uv.y);

  return left * right * bottom * top;
}

void main() {
  vec2 uv = v_imageUV;

  // Progressive factor: more displacement toward right (flag pinned at left)
  float progressive = uv.x;
  progressive *= progressive;

  // Multiple sine waves at different frequencies for organic flag motion
  float wave1 = sin(uv.y * 8.0 + u_time * 2.5) * 0.015;
  float wave2 = sin(uv.y * 5.5 - u_time * 1.8 + 0.7) * 0.01;
  float wave3 = sin(uv.x * 4.0 + uv.y * 3.0 + u_time * 2.0) * 0.007;

  float displacement = (wave1 + wave2 + wave3) * progressive * u_amplitude;

  uv.x += displacement;
  uv.y += displacement * 0.4;

  float frame = getUvFrame(uv);

  vec4 color = texture(u_image, uv);
  fragColor = vec4(color.rgb, color.a * frame);
}
`;

export default function TastePlayground() {
  const [typePresence, setTypePresence] = useState<number>(68);
  const [imagePresence, setImagePresence] = useState<number>(72);
  const [motion, setMotion] = useState<number>(64);
  const [fluidity, setFluidity] = useState<number>(58);

  const [currentImage, setCurrentImage] = useState<string>(DEFAULT_IMAGE_SRC);
  const [currentImageName, setCurrentImageName] =
    useState<string>("demoimage.webp");

  const [tiltX, setTiltX] = useState<number>(0);
  const [tiltY, setTiltY] = useState<number>(0);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [animatedAmplitude, setAnimatedAmplitude] = useState<number>(0);

  const amplitudeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const objectUrlRef = useRef<string | null>(null);

  const handleMouseMove = useCallback(
    (event: ArtworkMouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const relativeX = (event.clientX - centerX) / (rect.width / 2);
      const relativeY = (event.clientY - centerY) / (rect.height / 2);

      const clampedX = clamp(relativeX, -1, 1);
      const clampedY = clamp(relativeY, -1, 1);

      const minTilt = 2;
      const maxAdditionalTilt = 22;
      const motionFactor = motion / 100;
      const maxTilt = minTilt + maxAdditionalTilt * motionFactor;

      setTiltX(-clampedY * maxTilt);
      setTiltY(clampedX * maxTilt);

      if (!isHovering) setIsHovering(true);
    },
    [motion, isHovering]
  );

  const handleMouseLeave = useCallback(() => {
    setTiltX(0);
    setTiltY(0);
    setIsHovering(false);
  }, []);

  const handleImageChange = useCallback((url: string, name: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setCurrentImage(url);
    setCurrentImageName(name);

    if (url.startsWith("blob:")) {
      objectUrlRef.current = url;
    }
  }, []);

  const handleImageClear = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCurrentImage(DEFAULT_IMAGE_SRC || FALLBACK_IMAGE_SRC);
    setCurrentImageName("demoimage.webp");
  }, []);

  const imageMinScale = 0.5;
  const imageMaxScale = 1.15;
  const imageScale =
    imageMinScale + (imagePresence / 100) * (imageMaxScale - imageMinScale);

  const logoMinScale = 0.8;
  const logoMaxScale = 2.4;
  const logoScale =
    logoMinScale + (typePresence / 100) * (logoMaxScale - logoMinScale);

  const fluidityNormalized = fluidity / 100;
  const targetAmplitude = isHovering ? fluidityNormalized : 0;

  useEffect(() => {
    const animate = () => {
      const current = amplitudeRef.current;
      const diff = targetAmplitude - current;

      if (Math.abs(diff) < 0.001) {
        amplitudeRef.current = targetAmplitude;
        setAnimatedAmplitude(targetAmplitude);
        return;
      }

      amplitudeRef.current = current + diff * 0.1;
      setAnimatedAmplitude(amplitudeRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetAmplitude]);

  const artworkStyle: React.CSSProperties = {
    transform: `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(
      2
    )}deg) scale(${imageScale.toFixed(3)})`,
  };

  const logoStyle: React.CSSProperties = {
    transform: `scale(${logoScale.toFixed(3)})`,
  };

  const imageSrc = currentImage || FALLBACK_IMAGE_SRC;

  const flagUniforms = useMemo(
    () => ({
      u_image: imageSrc,
      u_amplitude: animatedAmplitude,
      u_fit: ShaderFitOptions["cover"],
      u_scale: 1,
      u_rotation: 0,
      u_offsetX: 0,
      u_offsetY: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_worldWidth: 0,
      u_worldHeight: 0,
    }),
    [imageSrc, animatedAmplitude]
  );

  return (
    <main className={styles.page}>
      <div className={styles.centerColumn}>
        <div className={styles.artworkShell}>
          <div
            className={styles.artworkInteractive}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label="Interactive Taste artwork"
          >
            <div className={styles.artworkInner} style={artworkStyle}>
              <div className={styles.imageLayer}>
                <ShaderMount
                  fragmentShader={flagWaveShader}
                  uniforms={flagUniforms}
                  speed={animatedAmplitude > 0.001 ? 1 : 0}
                  mipmaps={["u_image"]}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
          <div className={styles.logoOverlay}>
            <img
              src="/playground/tasteai/taste-logo.svg"
              alt="Taste logo"
              className={styles.logoImage}
              style={logoStyle}
            />
          </div>
        </div>
      </div>

      <TasteEditorPanel
        typePresence={typePresence}
        onTypePresenceChange={setTypePresence}
        imagePresence={imagePresence}
        onImagePresenceChange={setImagePresence}
        motion={motion}
        onMotionChange={setMotion}
        fluidity={fluidity}
        onFluidityChange={setFluidity}
        currentImage={imageSrc}
        currentImageName={currentImageName}
        onImageChange={handleImageChange}
        onImageClear={handleImageClear}
      />
    </main>
  );
}
