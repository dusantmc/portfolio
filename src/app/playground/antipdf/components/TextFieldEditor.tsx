'use client';

import { useState, useRef } from 'react';
import { EditElement } from './types';

interface TextFieldEditorProps {
  currentPage: number;
  canvasWidth: number;
  canvasHeight: number;
  onAddElement: (element: EditElement) => void;
}

export default function TextFieldEditor({
  currentPage,
  canvasWidth,
  canvasHeight,
  onAddElement,
}: TextFieldEditorProps) {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [bold, setBold] = useState(false);
  const [color, setColor] = useState('#000000');
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  const handleAddTextField = () => {
    if (!text.trim()) {
      alert('Please enter text');
      return;
    }

    onAddElement({
      id: Date.now().toString(),
      type: 'text',
      page: currentPage,
      x,
      y,
      text,
      fontSize,
      bold,
      color,
    });

    // Reset form
    setText('');
    setFontSize(16);
    setBold(false);
    setColor('#000000');
    setX(50);
    setY(50);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 block mb-2">Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Font Size: {fontSize}px
        </label>
        <input
          type="range"
          min="8"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-16 h-10 rounded cursor-pointer"
          />
          <span className="text-sm text-white self-center">{color}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="bold"
          checked={bold}
          onChange={(e) => setBold(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
        <label htmlFor="bold" className="text-sm text-slate-400 cursor-pointer">
          Bold
        </label>
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
        onClick={handleAddTextField}
        className="w-full px-4 py-2 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-400 transition-colors mt-6"
      >
        Add Text Field
      </button>

      {text && (
        <div className="mt-6 p-4 bg-slate-800 rounded">
          <p className="text-xs text-slate-400 mb-2">Preview:</p>
          <div
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: bold ? 'bold' : 'normal',
              color: color,
            }}
            className="text-white"
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
