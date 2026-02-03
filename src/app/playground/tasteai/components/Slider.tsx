"use client";

import React from "react";
import styles from "../styles/TasteEditorPanel.module.css";

type SliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: SliderProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(event.target.value);
    onChange(numericValue);
  };

  const progress =
    max > min ? ((value - min) / (max - min)) * 100 : 0;
  const sliderStyle = {
    ["--slider-progress" as string]: `${progress}%`,
  } as React.CSSProperties;

  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>{label}</span>
      <div className={styles.sliderTrackWrapper}>
        <input
          type="range"
          className={styles.sliderInput}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          aria-label={label}
          style={sliderStyle}
        />
      </div>
    </label>
  );
}

