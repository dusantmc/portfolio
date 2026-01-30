'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Dithering } from '@paper-design/shaders-react';
import './PDFUploader.css';

interface PDFUploaderProps {
  onPdfSelected: (file: File) => void;
}

export default function PDFUploader({ onPdfSelected }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 32}px)`;
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onPdfSelected(file);
      } else {
        alert('Please drop a PDF file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      onPdfSelected(files[0]);
    }
  };

  return (
    <div
      className={`uploader${isDragging ? ' dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
    >
      <div ref={cursorRef} className="uploader__cursor-light" />
      <div className={`uploader__dropzone${isDragging ? ' dragging' : ''}`}>
        <div className="uploader__logo">
          <div className="uploader__brandmark" aria-hidden="true">
            <div className="uploader__brandmark-mask">
              <div className="uploader__brandmark-shader">
                <Dithering
                  speed={1}
                  shape="sphere"
                  type="4x4"
                  size={2}
                  scale={1.0}
                  colorBack="#00000000"
                  colorFront="#008CFF"
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>
          </div>
          <Image
            src="/playground/wordmark.svg"
            alt="Anti PDF wordmark"
            width={548}
            height={140}
            priority
            className="uploader__wordmark"
          />
        </div>

        <p className="uploader__description">
          Stupid-simple document filling and signing
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="uploader__button"
        >
          Upload file
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="uploader__file-input"
        />

        <p className="uploader__hint">
          or drag & drop a PDF here
        </p>
      </div>
    </div>
  );
}
