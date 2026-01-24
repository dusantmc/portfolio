'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TextBoxProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  bold: boolean;
  zoom?: number;
  autoFocus?: boolean;
  onUpdate: (id: string, updates: Partial<TextBoxData>) => void;
  onRemove: (id: string) => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string, direction: 'right' | 'down') => void;
  allTextBoxes: TextBoxData[];
  onGuidesChange: (guides: { x: number | null; y: number | null }) => void;
}

export interface TextBoxData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  bold: boolean;
}

export default function TextBox({
  id,
  x,
  y,
  width,
  height,
  text,
  fontSize,
  bold,
  zoom = 1,
  autoFocus,
  onUpdate,
  onRemove,
  onActivate,
  onDuplicate,
  allTextBoxes,
  onGuidesChange,
}: TextBoxProps) {
  const [isActive, setIsActive] = useState(!!autoFocus);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateHover, setDuplicateHover] = useState<'left' | 'down' | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, corner: '' });
  const dragStart = useRef({ x: 0, y: 0, boxX: 0, boxY: 0 });

  const lineHeight = Math.ceil(fontSize * 1.0);
  const minHeight = lineHeight + 4;

  useEffect(() => {
    if (autoFocus && textRef.current) {
      textRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;
      const corner = resizeStart.current.corner;

      let newWidth = resizeStart.current.w;
      let newHeight = resizeStart.current.h;

      if (corner.includes('r')) newWidth = Math.max(0, resizeStart.current.w + dx);
      if (corner.includes('l')) newWidth = Math.max(0, resizeStart.current.w - dx);
      if (corner.includes('b')) newHeight = Math.max(minHeight, resizeStart.current.h + dy);
      if (corner.includes('t')) newHeight = Math.max(minHeight, resizeStart.current.h - dy);

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
  }, [isResizing, id, onUpdate, minHeight]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      let nextX = dragStart.current.boxX + dx;
      let nextY = dragStart.current.boxY + dy;

      let guideX: number | null = null;
      let guideY: number | null = null;
      const snapThreshold = 6;

      if (allTextBoxes.length > 1) {
        let bestX = { delta: snapThreshold + 1, value: nextX, guide: null as number | null };
        let bestY = { delta: snapThreshold + 1, value: nextY, guide: null as number | null };

        for (const box of allTextBoxes) {
          if (box.id === id) continue;

          const xCandidates = [
            { value: box.x, guide: box.x },
            { value: box.x + box.width / 2 - width / 2, guide: box.x + box.width / 2 },
            { value: box.x + box.width - width, guide: box.x + box.width },
          ];
          const yCandidates = [
            { value: box.y, guide: box.y },
            { value: box.y + box.height / 2 - height / 2, guide: box.y + box.height / 2 },
            { value: box.y + box.height - height, guide: box.y + box.height },
          ];

          for (const c of xCandidates) {
            const delta = Math.abs(nextX - c.value);
            if (delta < bestX.delta) {
              bestX = { delta, value: c.value, guide: c.guide };
            }
          }

          for (const c of yCandidates) {
            const delta = Math.abs(nextY - c.value);
            if (delta < bestY.delta) {
              bestY = { delta, value: c.value, guide: c.guide };
            }
          }
        }

        if (bestX.delta <= snapThreshold) {
          nextX = bestX.value;
          guideX = bestX.guide;
        }
        if (bestY.delta <= snapThreshold) {
          nextY = bestY.value;
          guideY = bestY.guide;
        }
      }

      onGuidesChange({ x: guideX, y: guideY });
      onUpdate(id, { x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onGuidesChange({ x: null, y: null });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [allTextBoxes, height, id, isDragging, onGuidesChange, onUpdate, width, zoom]);

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: width, h: height, corner };
  }, [width, height]);

  const handleBoxMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const box = boxRef.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const edgeThreshold = 8;
    const nearEdge = mx < edgeThreshold || mx > rect.width - edgeThreshold ||
                     my < edgeThreshold || my > rect.height - edgeThreshold;

    if (nearEdge || !isActive) {
      e.preventDefault();
      setIsActive(true);
      onActivate(id);
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, boxX: x, boxY: y };
    }
  }, [id, isActive, onActivate, x, y, zoom]);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    setIsActive(true);
    onActivate(id);
    textRef.current?.focus();
  }, [id, isDragging, onActivate]);

  const handleBlur = useCallback(() => {
    setIsActive(false);
    if (textRef.current) {
      const newText = textRef.current.textContent || '';
      onUpdate(id, { text: newText });
    }
  }, [id, onUpdate]);

  const handleFocus = useCallback(() => {
    setIsActive(true);
    onActivate(id);
  }, [id, onActivate]);

  const scale = 1 / zoom;
  const borderWidth = (isActive ? 4 : 3) * scale;
  const handleSize = 14 * scale;
  const handleOffset = -handleSize / 2;
  const handleBorderWidth = 4 * scale;

  return (
    <div
      ref={boxRef}
      className={`textbox${isActive ? ' textbox--active' : ''}${isDragging ? ' textbox--dragging' : ''}`}
      style={{ left: x, top: y, width, height, minHeight: minHeight, borderWidth }}
      onClick={handleBoxClick}
      onMouseDown={handleBoxMouseDown}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const edgeThreshold = 8;
        const nearRight = mx > rect.width - edgeThreshold;
        const nearBottom = my > rect.height - edgeThreshold;
        if (nearRight) {
          setDuplicateHover('right');
        } else if (nearBottom) {
          setDuplicateHover('down');
        } else {
          setDuplicateHover(null);
        }
      }}
      onMouseLeave={() => setDuplicateHover(null)}
    >
      <div
        ref={textRef}
        className="textbox__content"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ fontSize, lineHeight: `${lineHeight}px`, fontWeight: bold ? 'bold' : 'normal' }}
      >
        {text}
      </div>

      {isActive && (
        <>
          <div
            className="textbox__toolbar"
            style={{ transform: `translateX(-50%) scale(${scale})`, bottom: `calc(100% + ${8 * scale}px)` }}
            onMouseDown={(e) => e.preventDefault()}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="textbox__toolbar-size">
              <button
                className="textbox__toolbar-btn"
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => onUpdate(id, { fontSize: fontSize + 1 })}
              >
                <img src="/playground/aplus.svg" alt="Increase size" className="textbox__toolbar-icon" />
              </button>
              <button
                className="textbox__toolbar-btn"
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => onUpdate(id, { fontSize: Math.max(8, fontSize - 1) })}
              >
                <img src="/playground/aminus.svg" alt="Decrease size" className="textbox__toolbar-icon" />
              </button>
            </div>
            <button
              className="textbox__toolbar-delete"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => onRemove(id)}
            >
              <img src="/playground/delete.svg" alt="Delete" className="textbox__toolbar-icon" />
            </button>
          </div>

          <div className="textbox__handle textbox__handle--tl" style={{ width: handleSize, height: handleSize, top: handleOffset, left: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'tl')} />
          <div className="textbox__handle textbox__handle--tr" style={{ width: handleSize, height: handleSize, top: handleOffset, right: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'tr')} />
          <div className="textbox__handle textbox__handle--bl" style={{ width: handleSize, height: handleSize, bottom: handleOffset, left: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'bl')} />
          <div className="textbox__handle textbox__handle--br" style={{ width: handleSize, height: handleSize, bottom: handleOffset, right: handleOffset, borderWidth: handleBorderWidth }} onMouseDown={(e) => handleResizeStart(e, 'br')} />
        </>
      )}
      {duplicateHover === 'right' && (
        <button
          type="button"
          className="textbox__duplicate-hit textbox__duplicate-hit--right"
          onMouseEnter={() => setDuplicateHover('right')}
          onMouseLeave={() => setDuplicateHover(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate(id, 'right');
          }}
        >
          <span className="textbox__duplicate textbox__duplicate--right" aria-hidden="true">
            <span className="textbox__duplicate-icon" aria-hidden="true" />
          </span>
        </button>
      )}
      {duplicateHover === 'down' && (
        <button
          type="button"
          className="textbox__duplicate-hit textbox__duplicate-hit--down"
          onMouseEnter={() => setDuplicateHover('down')}
          onMouseLeave={() => setDuplicateHover(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate(id, 'down');
          }}
        >
          <span className="textbox__duplicate textbox__duplicate--down" aria-hidden="true">
            <span className="textbox__duplicate-icon" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
