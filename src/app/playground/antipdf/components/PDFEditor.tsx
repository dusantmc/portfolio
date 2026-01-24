'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import TextBox, { TextBoxData } from './TextBox';
import SignatureBox, { SignatureBoxData } from './SignatureBox';
import './PDFEditor.css';

interface PDFEditorProps {
  pdfFile: File;
  onBack: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

export default function PDFEditor({ pdfFile, onBack }: PDFEditorProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [textBoxes, setTextBoxes] = useState<TextBoxData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [defaultFontSize, setDefaultFontSize] = useState(12);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeTextBoxId, setActiveTextBoxId] = useState<string | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [latestTextBoxId, setLatestTextBoxId] = useState<string | null>(null);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const [signatures, setSignatures] = useState<Array<{ id: string; src: string }>>([]);
  const [signatureBoxes, setSignatureBoxes] = useState<SignatureBoxData[]>([]);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pdfDocRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);
  const signatureMenuRef = useRef<HTMLDivElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPdf(pdfFile);
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

      const viewport = page.getViewport({ scale: 2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

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

  // Pinch-to-zoom handler
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
      }
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
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

    const canvas = canvasRef.current;
    const cw = canvas?.width || 600;
    const ch = canvas?.height || 800;
    const gap = 16;
    const dx = direction === 'right' ? source.width + gap : 0;
    const dy = direction === 'down' ? source.height + gap : 0;

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
    };

    setTextBoxes((prev) => [...prev, newBox]);
    setLatestTextBoxId(id);
    setActiveTextBoxId(id);
    setActiveSignatureId(null);
  }, [textBoxes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTextBoxId) return;
      const isCmdD = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd';
      if (!isCmdD) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.isContentEditable) return;
      e.preventDefault();
      duplicateTextBox(activeTextBoxId, 'right');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTextBoxId, duplicateTextBox]);

  const handleAddTextBox = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const id = Date.now().toString();

    const newBox: TextBoxData = {
      id,
      x: cw / 2 - 100,
      y: ch / 2 - 20,
      width: 200,
      height: Math.ceil(defaultFontSize * 1.0) + 4,
      text: '',
      fontSize: defaultFontSize,
      bold: false,
    };
    setTextBoxes((prev) => [...prev, newBox]);
    setLatestTextBoxId(id);
    setActiveTextBoxId(id);
    setActiveSignatureId(null);
  }, []);

  const handleUpdateTextBox = useCallback((id: string, updates: Partial<TextBoxData>) => {
    setTextBoxes((prev) =>
      prev.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb))
    );
  }, []);

  const handleRemoveTextBox = useCallback((id: string) => {
    setTextBoxes((prev) => prev.filter((tb) => tb.id !== id));
    setActiveTextBoxId((prev) => (prev === id ? null : prev));
  }, []);

  const handleGuidesChange = useCallback((guides: { x: number | null; y: number | null }) => {
    setAlignmentGuides(guides);
  }, []);

  const handleSignatureActivate = useCallback((id: string) => {
    setActiveSignatureId(id);
    setActiveTextBoxId(null);
  }, []);

  const handleTextBoxActivate = useCallback((id: string) => {
    setActiveTextBoxId(id);
    setActiveSignatureId(null);
    setActiveSignatureId(null);
  }, []);

  const addSignatureBox = useCallback((src: string) => {
    const canvas = canvasRef.current;
    const cw = canvas?.clientWidth || 600;
    const ch = canvas?.clientHeight || 800;
    const width = 200;
    const height = 80;
    const id = Date.now().toString();
    const newBox: SignatureBoxData = {
      id,
      x: cw / 2 - width / 2,
      y: ch / 2 - height / 2,
      width,
      height,
      src,
      style: 'default',
    };
    setSignatureBoxes((prev) => [...prev, newBox]);
    setActiveSignatureId(id);
  }, []);

  const handleSignatureUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return;
      const sigId = Date.now().toString();
      setSignatures((prev) => [...prev, { id: sigId, src }].slice(-2));
      addSignatureBox(src);
      setSignatureMenuOpen(false);
    };
    reader.readAsDataURL(file);
  }, [addSignatureBox]);

  const handleSignatureInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSignatureUpload(file);
    e.target.value = '';
  }, [handleSignatureUpload]);

  const handleSignatureSelect = useCallback((src: string) => {
    addSignatureBox(src);
    setSignatureMenuOpen(false);
  }, [addSignatureBox]);

  const handleSignatureRemove = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
  }, []);

  const handleUpdateSignatureBox = useCallback((id: string, updates: Partial<SignatureBoxData>) => {
    setSignatureBoxes((prev) =>
      prev.map((sb) => (sb.id === id ? { ...sb, ...updates } : sb))
    );
  }, []);

  const handleRemoveSignatureBox = useCallback((id: string) => {
    setSignatureBoxes((prev) => prev.filter((sb) => sb.id !== id));
    setActiveSignatureId((prev) => (prev === id ? null : prev));
  }, []);

  const handleDownload = async () => {
    console.log('Download PDF with textBoxes:', textBoxes);
    alert('Download functionality coming soon!');
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

        <span className="editor__topbar-center">{pdfFile.name}</span>

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
              onClick={() => setSignatureMenuOpen((prev) => !prev)}
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
              <div className="signature-menu">
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
                    disabled={signatures.length >= 2}
                  >
                    <img src="/playground/upload.svg" alt="Upload" className="signature-menu__action-icon" />
                    <span>Upload</span>
                  </button>
                  <button type="button" className="signature-menu__action" disabled>
                    <img src="/playground/draw.svg" alt="Draw" className="signature-menu__action-icon" />
                    <span>Draw</span>
                  </button>
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
        className={`editor__content${isDragging ? ' dragging' : ''}`}
        ref={contentRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="editor__canvas-wrapper"
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
              />
            ))}
            {textBoxes.map((tb) => (
              <TextBox
                key={tb.id}
                {...tb}
                zoom={zoom}
                autoFocus={tb.id === latestTextBoxId}
                onUpdate={handleUpdateTextBox}
                onRemove={handleRemoveTextBox}
                onActivate={handleTextBoxActivate}
                onDuplicate={duplicateTextBox}
                allTextBoxes={textBoxes}
                onGuidesChange={handleGuidesChange}
              />
            ))}
          </div>
        </div>

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
