'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPuffEffect } from '../utils/puffEffect';

export interface SignatureBoxData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  style: 'default' | 'gray';
}

interface SignatureBoxProps extends SignatureBoxData {
  zoom?: number;
  active: boolean;
  onActivate: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SignatureBoxData>) => void;
  onRemove: (id: string) => void;
  isDisintegratingExternal?: boolean;
}

export default function SignatureBox({
  id,
  x,
  y,
  width,
  height,
  src,
  style,
  zoom = 1,
  active,
  onActivate,
  onUpdate,
  onRemove,
  isDisintegratingExternal,
}: SignatureBoxProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, corner: '' });
  const dragStart = useRef({ x: 0, y: 0, boxX: 0, boxY: 0 });

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;
      const corner = resizeStart.current.corner;

      let newWidth = resizeStart.current.w;
      let newHeight = resizeStart.current.h;

      if (corner.includes('r')) newWidth = Math.max(60, resizeStart.current.w + dx);
      if (corner.includes('l')) newWidth = Math.max(60, resizeStart.current.w - dx);
      if (corner.includes('b')) newHeight = Math.max(24, resizeStart.current.h + dy);
      if (corner.includes('t')) newHeight = Math.max(24, resizeStart.current.h - dy);

      onUpdate(id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [id, isResizing, onUpdate, zoom]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      onUpdate(id, { x: dragStart.current.boxX + dx, y: dragStart.current.boxY + dy });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [id, isDragging, onUpdate, zoom]);

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: width, h: height, corner };
  }, [width, height]);

  // Detect if this is a drawn signature (SVG with blue stroke color)
  const isDrawnSignature = src.includes('#334CCB') || src.includes('%23334CCB');

  const signaturePalette = isDrawnSignature
    ? ([
        { style: 'default', className: 'signature-toolbar__swatch--blue', label: 'Blue' },
        { style: 'gray', className: 'signature-toolbar__swatch--gray', label: 'Desaturated' },
      ] as const)
    : ([
        { style: 'default', className: 'signature-toolbar__swatch--gradient', label: 'Default' },
        { style: 'gray', className: 'signature-toolbar__swatch--gray', label: 'Desaturated' },
      ] as const);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setIsDragging(true);
    onActivate(id);
    dragStart.current = { x: e.clientX, y: e.clientY, boxX: x, boxY: y };
  }, [id, onActivate, x, y]);

  const handleDelete = useCallback(() => {
    if (!boxRef.current || isDisintegrating) return;
    setIsDisintegrating(true);
    const rect = boxRef.current.getBoundingClientRect();
    createPuffEffect(rect);
    setTimeout(() => {
      onRemove(id);
    }, 120);
  }, [id, isDisintegrating, onRemove]);

  const scale = 1 / zoom;
  const borderWidth = (active ? 4 : 3) * scale;
  const handleSize = 14 * scale;
  const handleOffset = -handleSize / 2;
  const handleBorderWidth = 4 * scale;
  const toolbarOffset = 12 * scale;

  return (
    <div
      ref={boxRef}
      className={`signature-box${active ? ' signature-box--active' : ''}${isDragging ? ' signature-box--dragging' : ''}${isDisintegrating || isDisintegratingExternal ? ' signature-box--disintegrating' : ''}`}
      data-signature-id={id}
      style={{ left: x, top: y, width, height, borderWidth }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onActivate(id);
      }}
    >
      <div className="signature-box__content">
        <img
          src={src}
          alt="Signature"
          className="signature-box__image"
          draggable={false}
          style={{
            filter: style === 'gray'
              ? isDrawnSignature
                ? 'saturate(0) brightness(0) contrast(1.2)' // Blue to black
                : 'grayscale(1) contrast(1.4)' // Photo to grayscale
              : 'none'
          }}
        />
      </div>

      {active && (
        <>
          <div
            className="signature-toolbar"
            style={{
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'bottom center',
              bottom: `calc(100% + ${toolbarOffset}px)`,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="signature-toolbar__palette">
              {signaturePalette.map((item) => (
                <button
                  key={item.style}
                  type="button"
                  className={`signature-toolbar__swatch ${item.className}${item.style == style ? ' active' : ''}`}
                  aria-label={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpdate(id, { style: item.style });
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="signature-toolbar__delete"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
            >
              <img src="/playground/delete.svg" alt="Delete" className="signature-toolbar__icon" />
            </button>
          </div>
          <div className="textbox__handle textbox__handle--tl" style={{ width: handleSize, height: handleSize, top: handleOffset, left: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'tl')} />
          <div className="textbox__handle textbox__handle--tr" style={{ width: handleSize, height: handleSize, top: handleOffset, right: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'tr')} />
          <div className="textbox__handle textbox__handle--bl" style={{ width: handleSize, height: handleSize, bottom: handleOffset, left: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'bl')} />
          <div className="textbox__handle textbox__handle--br" style={{ width: handleSize, height: handleSize, bottom: handleOffset, right: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'br')} />
        </>
      )}
    </div>
  );
}
