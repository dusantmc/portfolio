'use client';

import { useRef, useState } from 'react';
import { EditElement } from './types';

interface SignatureEditorProps {
  currentPage: number;
  canvasWidth: number;
  canvasHeight: number;
  onAddElement: (element: EditElement) => void;
}

export default function SignatureEditor({
  currentPage,
  canvasWidth,
  canvasHeight,
  onAddElement,
}: SignatureEditorProps) {
  const [signatureUrl, setSignatureUrl] = useState('');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(50);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Check if file is PNG, SVG, or JPG
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a PNG, SVG, or JPG image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSignature = () => {
    if (!signatureUrl) {
      alert('Please select a signature image');
      return;
    }

    onAddElement({
      id: Date.now().toString(),
      type: 'signature',
      page: currentPage,
      x,
      y,
      signatureUrl,
      width,
      height,
    });

    // Reset form
    setSignatureUrl('');
    setWidth(100);
    setHeight(50);
    setX(50);
    setY(50);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Signature Image (PNG, SVG, JPG)
        </label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-white"
        >
          {signatureUrl ? '✓ Image Selected' : '📁 Choose Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.svg,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {signatureUrl && (
        <div>
          <p className="text-sm text-slate-400 mb-2">Preview:</p>
          <div className="bg-slate-800 p-3 rounded">
            <img
              src={signatureUrl}
              alt="Signature preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Width: {width}px
        </label>
        <input
          type="range"
          min="20"
          max={Math.min(300, canvasWidth)}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Height: {height}px
        </label>
        <input
          type="range"
          min="20"
          max={Math.min(200, canvasHeight)}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Position X: {x}px
        </label>
        <input
          type="range"
          min="0"
          max={canvasWidth}
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Position Y: {y}px
        </label>
        <input
          type="range"
          min="0"
          max={canvasHeight}
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        onClick={handleAddSignature}
        disabled={!signatureUrl}
        className="w-full px-4 py-2 bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-black disabled:text-slate-500 rounded font-semibold hover:bg-blue-400 transition-colors mt-6"
      >
        Add Signature
      </button>
    </div>
  );
}
