"use client";

import React from "react";
import Slider from "./Slider";
import styles from "../styles/TasteEditorPanel.module.css";

type TasteEditorPanelProps = {
  typePresence: number;
  onTypePresenceChange: (value: number) => void;
  imagePresence: number;
  onImagePresenceChange: (value: number) => void;
  motion: number;
  onMotionChange: (value: number) => void;
  fluidity: number;
  onFluidityChange: (value: number) => void;
  currentImage: string;
  currentImageName: string;
  onImageChange: (url: string, name: string) => void;
  onImageClear: () => void;
};

export default function TasteEditorPanel({
  typePresence,
  onTypePresenceChange,
  imagePresence,
  onImagePresenceChange,
  motion,
  onMotionChange,
  fluidity,
  onFluidityChange,
  currentImage,
  currentImageName,
  onImageChange,
  onImageClear,
}: TasteEditorPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    onImageChange(objectUrl, file.name);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const displayName =
    currentImageName || currentImage.split("/").filter(Boolean).pop() || "Image";

  return (
    <aside className={styles.panel} aria-label="Taste editor controls">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titlePrimary}>Taste</span>{" "}
          <span className={styles.titleSecondary}>Editor</span>
        </h2>
      </div>

      <div className={styles.group}>
        <Slider
          label="Type Presence"
          value={typePresence}
          onChange={onTypePresenceChange}
        />
        <Slider
          label="Image Presence"
          value={imagePresence}
          onChange={onImagePresenceChange}
        />
        <Slider label="Motion" value={motion} onChange={onMotionChange} />
        <Slider
          label="Fluidity"
          value={fluidity}
          onChange={onFluidityChange}
        />
      </div>

      <div className={styles.group}>
        <p className={styles.sliderLabel}>Source Image</p>
        <div className={styles.sourceRow}>
          <button
            type="button"
            className={styles.thumbnailButton}
            onClick={triggerFilePicker}
            aria-label="Change source image"
          >
            <div className={styles.thumbnail}>
              <img src={currentImage} alt="" aria-hidden="true" />
            </div>
          </button>

          <button
            type="button"
            className={styles.sourceNameButton}
            onClick={triggerFilePicker}
          >
            <span className={styles.sourceName}>{displayName}</span>
          </button>

          <button
            type="button"
            className={styles.trashButton}
            aria-label="Reset to default image"
            onClick={onImageClear}
          >
            <span aria-hidden="true">🗑</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </div>
    </aside>
  );
}

