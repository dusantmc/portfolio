'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import TextBox, { TextBoxData } from './TextBox';
import SignatureBox, { SignatureBoxData } from './SignatureBox';
import { createPuffEffect } from '../utils/puffEffect';
import './PDFEditor.css';

interface PDFEditorProps {
  pdfFile: File;
  onBack: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.4;
const RENDER_SCALE = 2;
const SIGNATURES_STORAGE_KEY = 'antipdf.signatures';
const SIGN_SESSION_ENDPOINT = '/api/antipdf?action=session';
const SIGN_STREAM_ENDPOINT = '/api/antipdf?action=stream';

export default function PDFEditor({ pdfFile, onBack }: PDFEditorProps) {
  const [currentPdfFile, setCurrentPdfFile] = useState<File>(pdfFile);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [textBoxes, setTextBoxes] = useState<TextBoxData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [defaultFontSize, setDefaultFontSize] = useState(12);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedTextBoxIds, setSelectedTextBoxIds] = useState<string[]>([]);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [latestTextBoxId, setLatestTextBoxId] = useState<string | null>(null);
  const [lastUsedFontSize, setLastUsedFontSize] = useState<number | null>(null);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [disintegratingTextBoxIds, setDisintegratingTextBoxIds] = useState<string[]>([]);
  const [disintegratingSignatureIds, setDisintegratingSignatureIds] = useState<string[]>([]);
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const [signatureMenuView, setSignatureMenuView] = useState<'insert' | 'draw'>('insert');
  const [signatureMenuHeight, setSignatureMenuHeight] = useState<number | null>(null);
  const [signatureSessionId, setSignatureSessionId] = useState<string | null>(null);
  const [signatureQrDataUrl, setSignatureQrDataUrl] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Array<{ id: string; src: string }>>([]);
  const [signatureBoxes, setSignatureBoxes] = useState<SignatureBoxData[]>([]);
  const [hasAutoFit, setHasAutoFit] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isDraggingSelected, setIsDraggingSelected] = useState(false);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const marqueeStart = useRef({ x: 0, y: 0 });
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);
  const signatureMenuRef = useRef<HTMLDivElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const signatureMenuContainerRef = useRef<HTMLDivElement>(null);
  const signatureInsertRef = useRef<HTMLDivElement>(null);
  const signatureDrawRef = useRef<HTMLDivElement>(null);
  const signatureEventSourceRef = useRef<EventSource | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Undo/Redo history
  type HistorySnapshot = { textBoxes: TextBoxData[]; signatureBoxes: SignatureBoxData[] };
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoingRef = useRef(false);
  const MAX_HISTORY = 10;

  const saveHistory = useCallback(() => {
    if (isUndoingRef.current) return;
    const snapshot: HistorySnapshot = {
      textBoxes: JSON.parse(JSON.stringify(textBoxes)),
      signatureBoxes: JSON.parse(JSON.stringify(signatureBoxes)),
    };
    // Remove any future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, [textBoxes, signatureBoxes]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoingRef.current = true;
    historyIndexRef.current--;
    const snapshot = historyRef.current[historyIndexRef.current];
    setTextBoxes(JSON.parse(JSON.stringify(snapshot.textBoxes)));
    setSignatureBoxes(JSON.parse(JSON.stringify(snapshot.signatureBoxes)));
    setSelectedTextBoxIds([]);
    setActiveSignatureId(null);
    setTimeout(() => { isUndoingRef.current = false; }, 0);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoingRef.current = true;
    historyIndexRef.current++;
    const snapshot = historyRef.current[historyIndexRef.current];
    setTextBoxes(JSON.parse(JSON.stringify(snapshot.textBoxes)));
    setSignatureBoxes(JSON.parse(JSON.stringify(snapshot.signatureBoxes)));
    setSelectedTextBoxIds([]);
    setActiveSignatureId(null);
    setTimeout(() => { isUndoingRef.current = false; }, 0);
  }, []);

  // Initialize history with empty state
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current.push({ textBoxes: [], signatureBoxes: [] });
      historyIndexRef.current = 0;
    }
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.isContentEditable) return;
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SIGNATURES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed.filter(
        (item) => item && typeof item.id === 'string' && typeof item.src === 'string'
      );
      if (cleaned.length > 0) {
        setSignatures(cleaned.slice(-2));
      }
    } catch (error) {
      console.warn('Failed to load signatures from localStorage', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (signatures.length === 0) {
        localStorage.removeItem(SIGNATURES_STORAGE_KEY);
      } else {
        localStorage.setItem(
          SIGNATURES_STORAGE_KEY,
          JSON.stringify(signatures.slice(-2))
        );
      }
    } catch (error) {
      console.warn('Failed to persist signatures to localStorage', error);
    }
  }, [signatures]);

  useEffect(() => {
    loadPdf(pdfFile);
    setHasAutoFit(false);
  }, [pdfFile]);

  useEffect(() => {
    if (!signatureMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!signatureMenuRef.current) return;
      if (!signatureMenuRef.current.contains(e.target as Node)) {
        setSignatureMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [signatureMenuOpen]);

  useEffect(() => {
    if (!signatureMenuOpen) {
      setSignatureMenuHeight(null);
      return;
    }

    const menuEl = signatureMenuContainerRef.current;
    const pageEl =
      signatureMenuView === 'draw' ? signatureDrawRef.current : signatureInsertRef.current;
    if (!menuEl || !pageEl) return;

    const updateHeight = () => {
      const styles = window.getComputedStyle(menuEl);
      const paddingTop = parseFloat(styles.paddingTop || '0');
      const paddingBottom = parseFloat(styles.paddingBottom || '0');
      const nextHeight = pageEl.scrollHeight + paddingTop + paddingBottom;
      setSignatureMenuHeight(nextHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [signatureMenuOpen, signatureMenuView, signatures.length]);

  const triggerTextBoxPuff = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      const el = document.querySelector(`[data-textbox-id="${id}"]`) as HTMLElement | null;
      if (!el) return;
      createPuffEffect(el.getBoundingClientRect());
    });
  }, []);

  const triggerSignaturePuff = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      const el = document.querySelector(`[data-signature-id="${id}"]`) as HTMLElement | null;
      if (!el) return;
      createPuffEffect(el.getBoundingClientRect());
    });
  }, []);

  const getPdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  const loadPdf = async (file: File) => {
    try {
      const pdfjs = await getPdfjs();
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      renderPage(pdf, 1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const updateDefaultFontSize = async (page: any) => {
    try {
      const textContent = await page.getTextContent();
      const sizes: number[] = [];

      for (const item of textContent.items) {
        const str = (item as any).str ?? '';
        const size = Math.abs((item as any).transform?.[3] ?? 0);
        if (str.trim().length > 0 && size > 0) {
          sizes.push(size);
        }
      }

      if (sizes.length === 0) return;

      sizes.sort((a, b) => a - b);
      const mid = Math.floor(sizes.length / 2);
      const median =
        sizes.length % 2 === 0 ? (sizes[mid - 1] + sizes[mid]) / 2 : sizes[mid];
      const clamped = Math.max(8, Math.min(64, Math.round(median)));
      setDefaultFontSize(clamped);
    } catch (error) {
      console.error('Error extracting PDF font size:', error);
    }
  };

  const renderPage = async (pdf: any, pageNum: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      // Always render without page rotation — rotation: 0 overrides
      // the page's /Rotate entry, which some PDF generators set incorrectly.
      const viewport = page.getViewport({ scale: RENDER_SCALE, rotation: 0 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Set CSS dimensions to 1x so the canvas displays at natural PDF size
      const cssWidth = viewport.width / RENDER_SCALE;
      const cssHeight = viewport.height / RENDER_SCALE;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      if (!hasAutoFit) {
        const content = contentRef.current;

        if (content) {
          const contentW = content.clientWidth;
          const contentH = content.clientHeight;
          const fitZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (0.8 * contentW) / cssWidth));

          setZoom(fitZoom);

          // Position 40px from the top of the content area
          const panY = 40 - contentH / 2 + (cssHeight * fitZoom) / 2;
          setPan({ x: 0, y: panY });
        }

        setHasAutoFit(true);

        // Enable transitions after initial positioning
        requestAnimationFrame(() => setIsInitialLoad(false));
      }

      await updateDefaultFontSize(page);
      setCurrentPage(pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  useEffect(() => {
    if (pdfDocRef.current && currentPage > 0) {
      renderPage(pdfDocRef.current, currentPage);
    }
  }, [currentPage]);

  // Wheel: zoom or scroll-pan
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
        return;
      }
      e.preventDefault();
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    };

    content.addEventListener('wheel', handleWheel, { passive: false });
    return () => content.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    const clickedOnField = target?.closest('.textbox') || target?.closest('.signature-box');
    if (!clickedOnField && !e.shiftKey) {
      setSelectedTextBoxIds([]);
      setActiveSignatureId(null);
    }

    const content = contentRef.current;
    const canvasWrapper = canvasWrapperRef.current;
    if (!content) return;

    const contentRect = content.getBoundingClientRect();
    const clickX = e.clientX - contentRect.left;
    const clickY = e.clientY - contentRect.top;

    // Check if click is on the canvas wrapper
    if (canvasWrapper) {
      const wrapperRect = canvasWrapper.getBoundingClientRect();
      const isOnCanvas =
        e.clientX >= wrapperRect.left && e.clientX <= wrapperRect.right &&
        e.clientY >= wrapperRect.top && e.clientY <= wrapperRect.bottom;

      if (isOnCanvas) {
        // Pan the canvas
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }
    }

    // Start marquee selection
    setIsMarqueeSelecting(true);
    marqueeStart.current = { x: clickX, y: clickY };
    setMarqueeRect({ x: clickX, y: clickY, width: 0, height: 0 });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
      return;
    }

    if (isMarqueeSelecting) {
      const content = contentRef.current;
      if (!content) return;

      const contentRect = content.getBoundingClientRect();
      const currentX = e.clientX - contentRect.left;
      const currentY = e.clientY - contentRect.top;

      const x = Math.min(marqueeStart.current.x, currentX);
      const y = Math.min(marqueeStart.current.y, currentY);
      const width = Math.abs(currentX - marqueeStart.current.x);
      const height = Math.abs(currentY - marqueeStart.current.y);

      setMarqueeRect({ x, y, width, height });
    }
  }, [isDragging, isMarqueeSelecting]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (isMarqueeSelecting && marqueeRect) {
      // Calculate which text boxes intersect with the marquee
      const content = contentRef.current;
      const canvasWrapper = canvasWrapperRef.current;

      if (content && canvasWrapper && marqueeRect.width > 5 && marqueeRect.height > 5) {
        const contentRect = content.getBoundingClientRect();
        const wrapperRect = canvasWrapper.getBoundingClientRect();

        // Marquee rect in content coordinates
        const marqueeLeft = marqueeRect.x;
        const marqueeTop = marqueeRect.y;
        const marqueeRight = marqueeRect.x + marqueeRect.width;
        const marqueeBottom = marqueeRect.y + marqueeRect.height;

        // Canvas wrapper position in content coordinates
        const wrapperLeft = wrapperRect.left - contentRect.left;
        const wrapperTop = wrapperRect.top - contentRect.top;

        const selectedIds: string[] = [];

        for (const tb of textBoxes) {
          // Text box position in content coordinates (accounting for pan and zoom)
          const tbLeft = wrapperLeft + (tb.x * zoom) + (wrapperRect.width / 2) - (canvasRef.current?.clientWidth || 0) * zoom / 2;
          const tbTop = wrapperTop + (tb.y * zoom) + (wrapperRect.height / 2) - (canvasRef.current?.clientHeight || 0) * zoom / 2;
          const tbRight = tbLeft + tb.width * zoom;
          const tbBottom = tbTop + tb.height * zoom;

          // Check intersection
          const intersects = !(tbRight < marqueeLeft || tbLeft > marqueeRight ||
                              tbBottom < marqueeTop || tbTop > marqueeBottom);

          if (intersects) {
            selectedIds.push(tb.id);
          }
        }

        if (selectedIds.length > 0) {
          setSelectedTextBoxIds(selectedIds);
          setActiveSignatureId(null);
        }
      }

      setIsMarqueeSelecting(false);
      setMarqueeRect(null);
    }
  }, [isDragging, isMarqueeSelecting, marqueeRect, textBoxes, zoom]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const content = contentRef.current;
    if (!content) return;

    const rect = content.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    setZoom((prevZoom) => {
      const newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
      const ratio = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: cx - (cx - prevPan.x) * ratio,
        y: cy - (cy - prevPan.y) * ratio,
      }));
      return newZoom;
    });
  }, []);

  const duplicateTextBox = useCallback((sourceId: string, direction: 'right' | 'down' = 'right') => {
    const source = textBoxes.find((tb) => tb.id === sourceId);
    if (!source) return;
    saveHistory();

    const canvas = canvasRef.current;
    const cw = canvas?.clientWidth || 600;
    const ch = canvas?.clientHeight || 800;

    // Calculate gap: if source was duplicated from another, use the same distance
    let dx: number;
    let dy: number;
    const defaultGap = 16;

    if (source.duplicatedFrom) {
      const parent = textBoxes.find((tb) => tb.id === source.duplicatedFrom);
      if (parent) {
        // Use the distance from parent to source
        dx = direction === 'right' ? source.x - parent.x : 0;
        dy = direction === 'down' ? source.y - parent.y : 0;
      } else {
        dx = direction === 'right' ? source.width + defaultGap : 0;
        dy = direction === 'down' ? source.height + defaultGap : 0;
      }
    } else {
      dx = direction === 'right' ? source.width + defaultGap : 0;
      dy = direction === 'down' ? source.height + defaultGap : 0;
    }

    let x = source.x + dx;
    let y = source.y + dy;
    const maxX = Math.max(0, cw - source.width);
    const maxY = Math.max(0, ch - source.height);
    x = Math.min(Math.max(0, x), maxX);
    y = Math.min(Math.max(0, y), maxY);

    const id = Date.now().toString();
    const newBox: TextBoxData = {
      ...source,
      id,
      x,
      y,
      duplicatedFrom: sourceId,
    };

    setTextBoxes((prev) => [...prev, newBox]);
    setLatestTextBoxId(id);
    setSelectedTextBoxIds([id]);
    setActiveSignatureId(null);
  }, [textBoxes, saveHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedTextBoxIds.length === 0) return;
      const isCmdD = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd';
      if (!isCmdD) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.isContentEditable) return;
      e.preventDefault();
      const lastSelectedId = selectedTextBoxIds[selectedTextBoxIds.length - 1];
      duplicateTextBox(lastSelectedId, 'right');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextBoxIds, duplicateTextBox]);

  useEffect(() => {
    const handleDeleteKey = (e: KeyboardEvent) => {
      if (selectedTextBoxIds.length === 0 && !activeSignatureId) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.isContentEditable) return;
      e.preventDefault();
      saveHistory();
      if (selectedTextBoxIds.length > 0) {
        const ids = [...selectedTextBoxIds];
        setDisintegratingTextBoxIds((prev) => Array.from(new Set([...prev, ...ids])));
        triggerTextBoxPuff(ids);
        setTimeout(() => {
          setTextBoxes((prev) => prev.filter((tb) => !ids.includes(tb.id)));
          setSelectedTextBoxIds([]);
          setDisintegratingTextBoxIds((prev) => prev.filter((id) => !ids.includes(id)));
        }, 120);
      }
      if (activeSignatureId) {
        const id = activeSignatureId;
        setDisintegratingSignatureIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        triggerSignaturePuff([id]);
        setTimeout(() => {
          setSignatureBoxes((prev) => prev.filter((sb) => sb.id !== id));
          setActiveSignatureId(null);
          setDisintegratingSignatureIds((prev) => prev.filter((sid) => sid !== id));
        }, 120);
      }
    };

    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [activeSignatureId, selectedTextBoxIds, triggerSignaturePuff, triggerTextBoxPuff, saveHistory]);

  const handleAddTextBox = useCallback(() => {
    saveHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const id = Date.now().toString();
    const fontSize = lastUsedFontSize ?? Math.max(8, defaultFontSize - 2);
    const boxWidth = 100;
    const boxHeight = Math.ceil(fontSize * 1.0) + 8;

    // Calculate viewport center in canvas coordinates
    const viewportCenterX = cw / 2 - pan.x / zoom;
    const viewportCenterY = ch / 2 - pan.y / zoom;

    // Clamp to canvas bounds
    const x = Math.max(0, Math.min(cw - boxWidth, viewportCenterX - boxWidth / 2));
    const y = Math.max(0, Math.min(ch - boxHeight, viewportCenterY - boxHeight / 2));

    const newBox: TextBoxData = {
      id,
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      text: '',
      fontSize,
      bold: false,
      align: 'left',
    };
    setTextBoxes((prev) => [...prev, newBox]);
    setLatestTextBoxId(id);
    setSelectedTextBoxIds([id]);
    setActiveSignatureId(null);
  }, [defaultFontSize, lastUsedFontSize, pan, zoom, saveHistory]);

  const handleUpdateTextBox = useCallback((id: string, updates: Partial<TextBoxData>) => {
    // Save history for style changes (toolbar), not position/size changes (drag/resize)
    const isStyleChange = 'fontSize' in updates || 'bold' in updates || 'align' in updates;
    if (isStyleChange) saveHistory();
    setTextBoxes((prev) =>
      prev.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb))
    );
    if (updates.fontSize !== undefined) {
      setLastUsedFontSize(updates.fontSize);
    }
  }, [saveHistory]);

  const handleRemoveTextBox = useCallback((id: string) => {
    saveHistory();
    setTextBoxes((prev) => prev.filter((tb) => tb.id !== id));
    setSelectedTextBoxIds((prev) => prev.filter((sid) => sid !== id));
  }, [saveHistory]);

  const handleUpdateSelectedTextBoxes = useCallback((updates: Partial<TextBoxData>) => {
    // Save history for style changes (toolbar), not position/size changes (drag/resize)
    const isStyleChange = 'fontSize' in updates || 'bold' in updates || 'align' in updates;
    if (isStyleChange) saveHistory();
    setTextBoxes((prev) =>
      prev.map((tb) => (selectedTextBoxIds.includes(tb.id) ? { ...tb, ...updates } : tb))
    );
    if (updates.fontSize !== undefined) {
      setLastUsedFontSize(updates.fontSize);
    }
  }, [selectedTextBoxIds, saveHistory]);

  const handleRemoveSelectedTextBoxes = useCallback(() => {
    if (selectedTextBoxIds.length === 0) return;
    saveHistory();
    const ids = [...selectedTextBoxIds];
    setDisintegratingTextBoxIds((prev) => Array.from(new Set([...prev, ...ids])));
    triggerTextBoxPuff(ids);
    setTimeout(() => {
      setTextBoxes((prev) => prev.filter((tb) => !ids.includes(tb.id)));
      setSelectedTextBoxIds([]);
      setDisintegratingTextBoxIds((prev) => prev.filter((id) => !ids.includes(id)));
    }, 120);
  }, [selectedTextBoxIds, triggerTextBoxPuff, saveHistory]);

  const handleGuidesChange = useCallback((guides: { x: number | null; y: number | null }) => {
    setAlignmentGuides(guides);
  }, []);

  const handleDragSelectedStart = useCallback(() => {
    saveHistory();
    setIsDraggingSelected(true);
    const positions = new Map<string, { x: number; y: number }>();
    for (const tb of textBoxes) {
      if (selectedTextBoxIds.includes(tb.id)) {
        positions.set(tb.id, { x: tb.x, y: tb.y });
      }
    }
    dragStartPositionsRef.current = positions;
  }, [textBoxes, selectedTextBoxIds, saveHistory]);

  const handleDragSelected = useCallback((dx: number, dy: number) => {
    const positions = dragStartPositionsRef.current;
    if (positions.size === 0) return;
    setTextBoxes((prev) =>
      prev.map((tb) => {
        const startPos = positions.get(tb.id);
        if (!startPos) return tb;
        return { ...tb, x: startPos.x + dx, y: startPos.y + dy };
      })
    );
  }, []);

  const handleDragSelectedEnd = useCallback(() => {
    dragStartPositionsRef.current = new Map();
    setIsDraggingSelected(false);
  }, []);

  const handleSignatureActivate = useCallback((id: string) => {
    setActiveSignatureId(id);
    setSelectedTextBoxIds([]);
  }, []);

  const handleTextBoxActivate = useCallback((id: string, shiftKey: boolean = false) => {
    if (shiftKey) {
      setSelectedTextBoxIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      );
    } else {
      setSelectedTextBoxIds([id]);
    }
    setActiveSignatureId(null);
  }, []);

  const addSignatureBox = useCallback((src: string) => {
    saveHistory();
    const canvas = canvasRef.current;
    const cw = canvas?.clientWidth || 600;
    const ch = canvas?.clientHeight || 800;
    const width = 200;
    const height = 80;
    const id = Date.now().toString();

    // Calculate viewport center in canvas coordinates
    const viewportCenterX = cw / 2 - pan.x / zoom;
    const viewportCenterY = ch / 2 - pan.y / zoom;

    // Clamp to canvas bounds
    const x = Math.max(0, Math.min(cw - width, viewportCenterX - width / 2));
    const y = Math.max(0, Math.min(ch - height, viewportCenterY - height / 2));

    const newBox: SignatureBoxData = {
      id,
      x,
      y,
      width,
      height,
      src,
      style: 'default',
    };
    setSignatureBoxes((prev) => [...prev, newBox]);
    setActiveSignatureId(id);
  }, [pan, zoom, saveHistory]);

  const addSignatureFromSrc = useCallback((src: string) => {
    const sigId = Date.now().toString();
    setSignatures((prev) => [...prev, { id: sigId, src }].slice(-2));
    addSignatureBox(src);
  }, [addSignatureBox]);

  const handleSignatureUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return;
      addSignatureFromSrc(src);
      setSignatureMenuOpen(false);
    };
    reader.readAsDataURL(file);
  }, [addSignatureFromSrc]);

  const handleSignatureInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSignatureUpload(file);
    e.target.value = '';
  }, [handleSignatureUpload]);

  const handleReplacePdf = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCurrentPdfFile(file);
    setHasAutoFit(false);
    loadPdf(file);
    e.target.value = '';
  }, [loadPdf]);

  const handleSignatureSelect = useCallback((src: string) => {
    addSignatureBox(src);
    setSignatureMenuOpen(false);
  }, [addSignatureBox]);

  const handleSignatureRemove = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
  }, []);

  const getSignatureBaseUrl = useCallback(() => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_ANTIPDF_BASE_URL || '';
    return process.env.NEXT_PUBLIC_ANTIPDF_BASE_URL || `${window.location.origin}/playground/antipdf`;
  }, []);

  const ensureSignatureSession = useCallback(async () => {
    if (signatureSessionId) return signatureSessionId;
    const response = await fetch(SIGN_SESSION_ENDPOINT, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to create signature session');
    const data = await response.json();
    const sessionId = data.sessionId as string;
    setSignatureSessionId(sessionId);
    return sessionId;
  }, [signatureSessionId]);

  const connectSignatureStream = useCallback((sessionId: string) => {
    if (signatureEventSourceRef.current) return;
    const source = new EventSource(
      `${SIGN_STREAM_ENDPOINT}&session=${encodeURIComponent(sessionId)}`
    );
    signatureEventSourceRef.current = source;
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'signature' && typeof payload.svg === 'string') {
          const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(payload.svg)}`;
          addSignatureFromSrc(svgDataUrl);
          setSignatureMenuView('insert');
          setSignatureMenuOpen(false);
        }
      } catch (error) {
        console.warn('Failed to parse signature stream payload', error);
      }
    };
    source.onerror = () => {
      source.close();
      signatureEventSourceRef.current = null;
    };
  }, [addSignatureFromSrc]);

  useEffect(() => {
    if (!signatureMenuOpen || signatureMenuView !== 'draw') return;
    let cancelled = false;
    (async () => {
      try {
        const sessionId = await ensureSignatureSession();
        if (cancelled) return;
        const baseUrl = getSignatureBaseUrl();
        const baseUrlNormalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const qrUrl = `${baseUrlNormalized}/sign?session=${encodeURIComponent(sessionId)}`;
        const qrLib = await import('qrcode');
        const dataUrl = await qrLib.toDataURL(qrUrl, { margin: 1, width: 220 });
        if (!cancelled) {
          setSignatureQrDataUrl(dataUrl);
        }
        connectSignatureStream(sessionId);
      } catch (error) {
        console.warn('Signature draw setup failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectSignatureStream, ensureSignatureSession, getSignatureBaseUrl, signatureMenuOpen, signatureMenuView]);

  useEffect(() => {
    if (signatureMenuOpen) return;
    if (signatureEventSourceRef.current) {
      signatureEventSourceRef.current.close();
      signatureEventSourceRef.current = null;
    }
  }, [signatureMenuOpen]);

  const handleUpdateSignatureBox = useCallback((id: string, updates: Partial<SignatureBoxData>) => {
    // Save history for style changes, not position/size changes (drag/resize)
    const isStyleChange = 'style' in updates;
    if (isStyleChange) saveHistory();
    setSignatureBoxes((prev) =>
      prev.map((sb) => (sb.id === id ? { ...sb, ...updates } : sb))
    );
  }, [saveHistory]);

  const handleRemoveSignatureBox = useCallback((id: string) => {
    saveHistory();
    setSignatureBoxes((prev) => prev.filter((sb) => sb.id !== id));
    setActiveSignatureId((prev) => (prev === id ? null : prev));
  }, [saveHistory]);

  const handleDownload = async () => {
    try {
      const [{ PDFDocument, StandardFonts, rgb, BlendMode }] = await Promise.all([
        import('pdf-lib'),
      ]);
      const arrayBuffer = await currentPdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const page = pdfDoc.getPage(currentPage - 1);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const canvas = canvasRef.current;
      const displayWidth = canvas?.clientWidth || canvas?.width || pageWidth;
      const displayHeight = canvas?.clientHeight || canvas?.height || pageHeight;
      const scaleX = pageWidth / displayWidth;
      const scaleY = pageHeight / displayHeight;

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawTextBox = (tb: TextBoxData) => {
        const padX = 2;
        const padY = 2;
        const fontSize = tb.fontSize * scaleY;
        const lineHeight = fontSize;
        const lines = (tb.text || '').split('\n');
        const boxX = (tb.x + padX) * scaleX;
        const boxWidth = (tb.width - padX * 2) * scaleX;
        let y = pageHeight - (tb.y + padY) * scaleY - fontSize;
        const font = tb.bold ? fontBold : fontRegular;
        const align = tb.align ?? 'left';

        for (const line of lines) {
          const textWidth = font.widthOfTextAtSize(line, fontSize);
          const x =
            align === 'center'
              ? boxX + (boxWidth - textWidth) / 2
              : align === 'right'
              ? boxX + (boxWidth - textWidth)
              : boxX;
          page.drawText(line, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          y -= lineHeight;
        }
      };

      const dataUrlToBytes = (dataUrl: string) => {
        const base64 = dataUrl.split(',')[1] || '';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      };

      const rasterizeImage = async (src: string, filter: string) => {
        const img = new Image();
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = reject;
        });
        const canvasEl = document.createElement('canvas');
        canvasEl.width = img.naturalWidth;
        canvasEl.height = img.naturalHeight;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return null;
        ctx.filter = filter;
        ctx.drawImage(img, 0, 0);
        return dataUrlToBytes(canvasEl.toDataURL('image/png'));
      };

      const drawSignatureBox = async (sb: SignatureBoxData) => {
        const boxX = sb.x * scaleX;
        const boxY = pageHeight - (sb.y + sb.height) * scaleY;
        const boxW = sb.width * scaleX;
        const boxH = sb.height * scaleY;

        let imageBytes: Uint8Array | null = null;
        const isSvg = sb.src.startsWith('data:image/svg+xml');
        const needsFilter = sb.style === 'gray';
        if (needsFilter || isSvg) {
          imageBytes = await rasterizeImage(
            sb.src,
            needsFilter ? 'grayscale(1) contrast(1.4)' : 'none'
          );
        } else {
          imageBytes = dataUrlToBytes(sb.src);
        }
        if (!imageBytes) return;

        const isPng = sb.src.startsWith('data:image/png');
        const embed = isPng || isSvg || needsFilter
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        const imgW = embed.width;
        const imgH = embed.height;
        const fitScale = Math.min(boxW / imgW, boxH / imgH);
        const drawW = imgW * fitScale;
        const drawH = imgH * fitScale;
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY + (boxH - drawH) / 2;

        page.drawImage(embed, { x: drawX, y: drawY, width: drawW, height: drawH, blendMode: BlendMode.Darken });
      };

      textBoxes.forEach(drawTextBox);
      for (const sb of signatureBoxes) {
        await drawSignatureBox(sb);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentPdfFile.name.replace(/\.pdf$/i, '') + '-edited.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF.');
    }
  };

  return (
    <div className="editor">
      <div className="editor__topbar">
        <div className="editor__topbar-left">
          <button onClick={onBack} className="editor__back-btn" title="Back">
            <img
              src="/playground/back.svg"
              alt="Back"
              className="editor__back-icon"
            />
          </button>
        </div>

        <button
          className="editor__topbar-center"
          onClick={() => replaceInputRef.current?.click()}
          title="Click to replace PDF"
        >
          {currentPdfFile.name}
        </button>
        <input
          ref={replaceInputRef}
          type="file"
          accept="application/pdf"
          className="editor__replace-input"
          onChange={handleReplacePdf}
        />

        <div className="editor__topbar-right">
          <button
            onClick={handleAddTextBox}
            className="editor__tool-btn"
            title="Insert text field"
          >
            <img
              src="/playground/text.svg"
              alt="Text"
              className="editor__tool-icon"
            />
          </button>

          <div className="editor__signature" ref={signatureMenuRef}>
            <button
              className={`editor__signature-btn${signatureMenuOpen ? ' active' : ''}`}
              title="Insert signature"
              onClick={() =>
                setSignatureMenuOpen((prev) => {
                  const next = !prev;
                  if (next) setSignatureMenuView('insert');
                  return next;
                })
              }
            >
              <img
                src="/playground/signature.svg"
                alt="Signature"
                className="editor__signature-icon"
              />
              <img
                src="/playground/chevron.svg"
                alt=""
                className="editor__chevron-icon"
              />
            </button>
            {signatureMenuOpen && (
              <div
                className="signature-menu"
                ref={signatureMenuContainerRef}
                style={signatureMenuHeight ? { height: `${signatureMenuHeight}px` } : undefined}
              >
                <div
                  className={`signature-menu__slider${signatureMenuView === 'draw' ? ' signature-menu__slider--draw' : ''}`}
                >
                  <div
                    className="signature-menu__page signature-menu__page--insert"
                    ref={signatureInsertRef}
                  >
                    <div className="signature-menu__title">Insert Signature</div>
                    {signatures.length > 0 && (
                      <div className="signature-menu__list">
                        {signatures.map((sig) => (
                          <div key={sig.id} className="signature-menu__item">
                            <button
                              type="button"
                              className="signature-menu__preview-btn"
                              onClick={() => handleSignatureSelect(sig.src)}
                            >
                              <img src={sig.src} alt="Signature" className="signature-menu__preview" />
                            </button>
                            <button
                              type="button"
                              className="signature-menu__remove"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSignatureRemove(sig.id);
                              }}
                              aria-label="Remove signature"
                            >
                              <img src="/playground/xclear.svg" alt="" className="signature-menu__remove-icon" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="signature-menu__actions">
                      <button
                        type="button"
                        className="signature-menu__action"
                        onClick={() => signatureInputRef.current?.click()}
                      >
                        <img src="/playground/upload.svg" alt="Upload" className="signature-menu__action-icon" />
                        <span>Upload</span>
                      </button>
                      <button
                        type="button"
                        className="signature-menu__action"
                        onClick={() => setSignatureMenuView('draw')}
                      >
                        <img src="/playground/draw.svg" alt="Draw" className="signature-menu__action-icon" />
                        <span>Draw</span>
                      </button>
                    </div>
                  </div>
                  <div
                    className="signature-menu__page signature-menu__page--draw"
                    ref={signatureDrawRef}
                  >
                    <div className="signature-menu__header">
                      <button
                        type="button"
                        className="signature-menu__back"
                        onClick={() => setSignatureMenuView('insert')}
                        aria-label="Back"
                      >
                        <img src="/playground/back.svg" alt="" className="signature-menu__back-icon" />
                      </button>
                      <div className="signature-menu__title">Draw Signature</div>
                    </div>
                    <div className="signature-menu__draw-area">
                      <div className="signature-menu__qr">
                        {signatureQrDataUrl ? (
                          <img src={signatureQrDataUrl} alt="QR code" className="signature-menu__qr-img" />
                        ) : (
                          <div className="signature-menu__qr-placeholder" />
                        )}
                      </div>
                    </div>
                    <span className="signature-menu__body">Scan this QR code to use your phone as a signature pad. Or <a href="#" className="signature-menu__link">draw here</a> instead</span>
                  </div>
                </div>
              </div>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="signature-menu__input"
              onChange={handleSignatureInputChange}
            />
          </div>

          <button onClick={handleDownload} className="editor__download-btn">
            Download
          </button>
        </div>
      </div>

      <div
        className={`editor__content${isDragging ? ' dragging' : ''}${isMarqueeSelecting ? ' marquee-selecting' : ''}`}
        ref={contentRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          ref={canvasWrapperRef}
          className={`editor__canvas-wrapper${isInitialLoad ? ' no-transition' : ''}${isDragging ? ' dragging' : ''}`}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <canvas ref={canvasRef} className="editor__canvas" />

          <div className="editor__overlay">
            {alignmentGuides.x !== null && (
              <div className="editor__guide editor__guide--v" style={{ left: alignmentGuides.x }} />
            )}
            {alignmentGuides.y !== null && (
              <div className="editor__guide editor__guide--h" style={{ top: alignmentGuides.y }} />
            )}
            {signatureBoxes.map((sb) => (
              <SignatureBox
                key={sb.id}
                {...sb}
                zoom={zoom}
                active={sb.id === activeSignatureId}
                onActivate={handleSignatureActivate}
                onUpdate={handleUpdateSignatureBox}
                onRemove={handleRemoveSignatureBox}
                isDisintegratingExternal={disintegratingSignatureIds.includes(sb.id)}
              />
            ))}
            {textBoxes.map((tb) => {
              const isSelected = selectedTextBoxIds.includes(tb.id);
              const isLastSelected = selectedTextBoxIds[selectedTextBoxIds.length - 1] === tb.id;
              return (
                <TextBox
                  key={tb.id}
                  {...tb}
                  zoom={zoom}
                  autoFocus={tb.id === latestTextBoxId}
                  isSelected={isSelected}
                  isLastSelected={isLastSelected}
                  onUpdate={handleUpdateTextBox}
                  onRemove={handleRemoveTextBox}
                  onUpdateSelected={handleUpdateSelectedTextBoxes}
                  onRemoveSelected={handleRemoveSelectedTextBoxes}
                  onActivate={handleTextBoxActivate}
                  onDuplicate={duplicateTextBox}
                  allTextBoxes={textBoxes}
                  onGuidesChange={handleGuidesChange}
                  selectedTextBoxIds={selectedTextBoxIds}
                  isDisintegratingExternal={disintegratingTextBoxIds.includes(tb.id)}
                  isDraggingSelected={isDraggingSelected}
                  onDragSelectedStart={handleDragSelectedStart}
                  onDragSelected={handleDragSelected}
                  onDragSelectedEnd={handleDragSelectedEnd}
                />
              );
            })}
          </div>
        </div>

        {marqueeRect && (
          <div
            className="editor__marquee"
            style={{
              left: marqueeRect.x,
              top: marqueeRect.y,
              width: marqueeRect.width,
              height: marqueeRect.height,
            }}
          />
        )}

        <div className="editor__zoom-controls">
          <button
            onClick={handleZoomIn}
            className="editor__zoom-btn"
            title="Zoom in"
          >
            <img
              src="/playground/zoomin.svg"
              alt="Zoom in"
              className="editor__zoom-icon"
            />
          </button>
          <button
            onClick={handleZoomOut}
            className="editor__zoom-btn"
            title="Zoom out"
          >
            <img
              src="/playground/zoomout.svg"
              alt="Zoom out"
              className="editor__zoom-icon"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
