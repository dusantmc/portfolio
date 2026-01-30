'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import './Sign.css';

type Point = { x: number; y: number; pressure: number };
type Stroke = { points: Point[] };

function SignPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (points.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#334CCB';

    // Draw smooth curve with variable width
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      // Interpolate pressure for smooth width transition
      const baseWidth = 4;
      const minWidth = 1.5;
      const width = minWidth + (baseWidth - minWidth) * p1.pressure;

      ctx.lineWidth = width;
      ctx.beginPath();

      if (i === 1) {
        // First segment: simple line
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      } else {
        // Use quadratic curve for smoothness
        const prev = points[i - 2];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.moveTo((prev.x + p0.x) / 2, (prev.y + p0.y) / 2);
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      ctx.stroke();
    }

    // Draw tapered end (thinnest at the tip)
    if (points.length >= 2) {
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((prev.x + last.x) / 2, (prev.y + last.y) / 2);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getCanvasPoint = (e: PointerEvent, prevPoint?: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate velocity-based pressure (faster = thinner line)
    let pressure = 1;
    if (prevPoint) {
      const dx = x - prevPoint.x;
      const dy = y - prevPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Map distance to pressure: higher distance = lower pressure (thinner line)
      // Clamp between 0.3 and 1.0
      pressure = Math.max(0.3, Math.min(1, 1 - dist / 50));
    }

    return { x, y, pressure };
  };

  const drawLatest = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke || stroke.points.length < 2) return;

    const points = stroke.points;
    const i = points.length - 1;
    const p0 = points[i - 1];
    const p1 = points[i];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#334CCB';

    const baseWidth = 4;
    const minWidth = 1.5;
    const width = minWidth + (baseWidth - minWidth) * p1.pressure;
    ctx.lineWidth = width;

    ctx.beginPath();
    if (i === 1) {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    } else {
      const prev = points[i - 2];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.moveTo((prev.x + p0.x) / 2, (prev.y + p0.y) / 2);
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.stroke();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sessionId) return;
    drawingRef.current = true;
    const point = getCanvasPoint(e.nativeEvent);
    point.pressure = 1; // Start with full pressure
    redoRef.current = [];
    strokesRef.current.push({ points: [point] });
    setHasInk(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const prevPoint = stroke.points[stroke.points.length - 1];
    const point = getCanvasPoint(e.nativeEvent, prevPoint);
    stroke.points.push(point);
    drawLatest();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleClear = () => {
    strokesRef.current = [];
    redoRef.current = [];
    setHasInk(false);
    redraw();
  };

  const handleUndo = () => {
    const last = strokesRef.current.pop();
    if (last) {
      redoRef.current.push(last);
      setHasInk(strokesRef.current.length > 0);
      redraw();
    }
  };

  const handleRedo = () => {
    const redoStroke = redoRef.current.pop();
    if (redoStroke) {
      strokesRef.current.push(redoStroke);
      setHasInk(true);
      redraw();
    }
  };

  const buildSvg = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Build smooth bezier curve paths
    const paths = strokesRef.current
      .filter((stroke) => stroke.points.length > 1)
      .map((stroke) => {
        const points = stroke.points;
        if (points.length < 2) return '';

        // Start path
        let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

        if (points.length === 2) {
          // Simple line for 2 points
          d += ` L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
        } else {
          // Use quadratic bezier curves for smoothness
          for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            d += ` Q ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
          }
          // End with last point
          const last = points[points.length - 1];
          d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
        }

        return `<path d="${d}" />`;
      })
      .join('');

    // Rotate -90deg: swap width/height, transform content
    // After -90deg rotation around center, the new viewBox is height x width
    const rotatedWidth = height;
    const rotatedHeight = width;
    const cx = width / 2;
    const cy = height / 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${rotatedWidth}" height="${rotatedHeight}" viewBox="0 0 ${rotatedWidth} ${rotatedHeight}" fill="none" stroke="#334CCB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(${rotatedWidth / 2}, ${rotatedHeight / 2}) rotate(-90) translate(${-cx}, ${-cy})">${paths}</g></svg>`;
  };

  const handleSave = () => {
    if (!sessionId || isSubmitting) return;
    const svg = buildSvg();
    if (!svg) return;
    setIsSubmitting(true);
    fetch('/api/antipdf?action=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, svg }),
    })
      .catch(() => {})
      .finally(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      });
  };

  const handleStartOver = () => {
    setIsSubmitted(false);
    handleClear();
  };

  return (
    <div className="sign-page">
      <div className="sign-canvas-wrap" ref={containerRef}>
        {!isSubmitted && (
          <div className="sign-helper-text">
            Draw your signature and tap Save when you’re done
          </div>
        )}
        {!hasInk && !isSubmitted && (
          <div className="sign-drawhint">
            <img src="/playground/drawhere.svg" alt="Draw here" />
          </div>
        )}
        {isSubmitted ? (
          <div className="sign-finish">
            <p>
              Your signature is added. You can close this tab and return to your desktop.
            </p>
            <button type="button" className="sign-btn sign-btn--success" onClick={handleStartOver}>
              Start Over
            </button>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="sign-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <div className={`sign-tools${hasInk ? '' : ' sign-controls--dim'}`}>
              <button type="button" className="sign-tool-btn" onClick={handleClear}>
                <img src="/playground/clearall.svg" alt="Clear" />
              </button>
              <button type="button" className="sign-tool-btn" onClick={handleUndo}>
                <img src="/playground/undo.svg" alt="Undo" />
              </button>
              <button type="button" className="sign-tool-btn" onClick={handleRedo}>
                <img src="/playground/redo.svg" alt="Redo" />
              </button>
            </div>
            <div className={`sign-actions${hasInk ? '' : ' sign-controls--dim'}`}>
              <button
                type="button"
                className="sign-btn sign-btn--primary"
                onClick={handleSave}
                disabled={!hasInk || !sessionId || isSubmitting}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={null}>
      <SignPageContent />
    </Suspense>
  );
}
