'use client';

import { useState } from 'react';
import PDFUploader from './components/PDFUploader';
import PDFEditor from './components/PDFEditor';

export default function AntiPDFPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handlePdfSelected = (file: File) => {
    setPdfFile(file);
    setShowEditor(true);
  };

  const handleBack = () => {
    setShowEditor(false);
    setPdfFile(null);
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      {!showEditor ? (
        <PDFUploader onPdfSelected={handlePdfSelected} />
      ) : pdfFile ? (
        <PDFEditor pdfFile={pdfFile} onBack={handleBack} />
      ) : null}
    </div>
  );
}
