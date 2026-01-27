'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import './PDFUploader.css';

interface PDFUploaderProps {
  onPdfSelected: (file: File) => void;
}

export default function PDFUploader({ onPdfSelected }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    >
      <div className={`uploader__dropzone${isDragging ? ' dragging' : ''}`}>
        <div className="uploader__logo">
          <Image
            src="/playground/antipdflogo.png"
            alt="ANTI PDF Logo"
            width={496}
            height={186}
            priority
          />
        </div>

        <p className="uploader__description">
          Stupid simple document filling and signing
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
